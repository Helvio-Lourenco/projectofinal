CREATE DATABASE IF NOT EXISTS oms_db;
USE oms_db;

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    image_url VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT,
    price DECIMAL(10, 2),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);


INSERT INTO products (name, price, description, image_url) VALUES 
('Auscultadores Wireless', 99.99, 'Auscultadores com cancelamento de ruído.', ''),
('Smart Watch', 199.99, 'Monitorize a sua atividade física.', ''),
('Suporte Portátil', 29.99, 'Suporte ergonómico de alumínio.', '');

-- teste
INSERT INTO orders (customer_name, customer_email, total_amount, status) VALUES 
('Mauro Gaspar', 'mauro@example.com', 129.98, 'Shipped'),
('Helvio Lourenco', 'helvio.lourenco@example.com', 199.99, 'Processing');

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES 
(1, 1, 1, 99.99), -- Headphones
(1, 3, 1, 29.99), -- Laptop Stand
(2, 2, 1, 199.99); -- Smart Watch
