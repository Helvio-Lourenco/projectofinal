require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { EventHubProducerClient, EventHubConsumerClient } = require("@azure/event-hubs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// MySQL Connection Pool
const dbConfig = {
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'oms_db',
};

const pool = mysql.createPool(dbConfig);

// Azure Event Hub Config
const connectionString = process.env.EVENTHUB_CONNECTION_STRING;
const eventHubName = process.env.EVENTHUB_NAME;
const consumerGroup = process.env.EVENTHUB_CONSUMER_GROUP || "$Default";

// Global Clients
let producerClient;
let consumerClient;

// Initialize Event Hub Clients
async function initEventHub() {
    if (!connectionString || !eventHubName) {
        console.log("Event Hub configuration missing. Using local database only.");
        return;
    }

    try {
        producerClient = new EventHubProducerClient(connectionString, eventHubName);
        console.log("Event Hub Producer initialized.");

        consumerClient = new EventHubConsumerClient(consumerGroup, connectionString, eventHubName);

        // Subscribe to events
        consumerClient.subscribe({
            processEvents: async (events, context) => {
                for (const event of events) {
                    console.log(`Received event: ${JSON.stringify(event.body)}`);
                    await processOrder(event.body);
                }
            },
            processError: async (err, context) => {
                console.error(`Error: ${err.message}`);
            }
        });
        console.log("Event Hub Consumer initialized.");

    } catch (err) {
        console.error("Failed to initialize Event Hub clients:", err);
    }
}

// Order Processing Logic 
async function processOrder(orderData) {
    try {
        const { customer_name, customer_email, items, total_amount } = orderData;

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            const [orderResult] = await connection.execute(
                'INSERT INTO orders (customer_name, customer_email, total_amount, status) VALUES (?, ?, ?, ?)',
                [customer_name, customer_email, total_amount, 'Processed']
            );

            const orderId = orderResult.insertId;

            for (const item of items) {
                await connection.execute(
                    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [orderId, item.product_id, item.quantity, item.price]
                );
            }

            await connection.commit();
            console.log(`Order ${orderId} successfully processed and saved to database.`);
        } catch (dbErr) {
            await connection.rollback();
            console.error("Database error while processing order:", dbErr);
            throw dbErr;
        } finally {
            connection.release();
        }

    } catch (err) {
        console.error("Error processing order:", err);
    }
}

// API Routes

// Get Productos
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Place Order
app.post('/api/orders', async (req, res) => {
    const orderData = req.body;

    // Validacao
    if (!orderData.items || orderData.items.length === 0) {
        return res.status(400).json({ error: "No items in order" });
    }

    try {
        if (producerClient) {
            // Send to Event Hub with 5s Timeout Race (Connection + Send)
            await Promise.race([
                (async () => {
                    const batch = await producerClient.createBatch();
                    batch.tryAdd({ body: orderData });
                    await producerClient.sendBatch(batch);
                })(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Event Hub Timeout')), 5000))
            ]);

            console.log("Order sent to Event Hub");
            res.status(202).json({ message: "Order placed successfully! Processing in background." });
        } else {
            // Processing order directly
            console.log("Processing order directly (Local Database).");
            await processOrder(orderData);
            res.status(201).json({ message: "Order placed and processed." });
        }
    } catch (err) {
        console.error("Event Hub Error (Recovering locally):", err.message);

        try {
            console.log("Saving to local database...");
            await processOrder(orderData);
            res.status(201).json({ message: "Order placed successfully (Local Mode due to Network)." });
        } catch (fallbackErr) {
            console.error("CRITICAL: Local fallback also failed:", fallbackErr);
            res.status(500).json({ error: "Failed to process order." });
        }
    }

});

// Start Server
app.listen(PORT, async () => {
    console.log(`Backend server running on port ${PORT}`);
    // Wait for DB to be ready potentially, mas aqui apenas comecamos
    await initEventHub();
});
