const API_URL = '/api';

let products = [];
let cart = [];

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
});

async function fetchProducts(retries = 5, delay = 1000) {
    try {
        const res = await fetch(`${API_URL}/products`);
        if (!res.ok) throw new Error('Erro ao buscar produtos');
        products = await res.json();
        // Se a lista vier vazia, pode ser que a BD ainda não tenha feito o seed
        if (products.length === 0 && retries > 0) {
            throw new Error('Lista vazia - Aguardando DB');
        }
        renderProducts();
    } catch (err) {
        console.warn(`Tentativa falhou. Retentando em ${delay}ms... (${retries} restantes)`);
        if (retries > 0) {
            setTimeout(() => fetchProducts(retries - 1, delay * 2), delay);
        } else {
            console.error(err);
            // Fallback apenas se falhar todas as tentativas
            document.getElementById('product-list').innerHTML = '<p style="color:red; text-align:center">Erro ao carregar produtos. Verifique se o Backend está rodando.</p>';
        }
    }
}

function renderProducts() {
    const list = document.getElementById('product-list');
    list.innerHTML = products.map(p => `
        <div class="product-card">
            <h3>${p.name}</h3>
            <div class="price">€${Number(p.price).toFixed(2)}</div>
            <button onclick="addToCart(${p.id})">Adicionar</button>
        </div>
    `).join('');
}

function addToCart(id) {
    const product = products.find(p => p.id === id);
    cart.push(product);
    updateTotal();
}

function updateTotal() {
    const total = cart.reduce((acc, item) => acc + Number(item.price), 0);
    document.getElementById('total-amount').innerText = total.toFixed(2);
    document.getElementById('cart-count').innerText = cart.length;
}

// Enviar Encomenda
document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
        alert("Adicione produtos ao carrinho primeiro!");
        return;
    }

    const name = document.getElementById('cust-name').value;
    const email = document.getElementById('cust-email').value;
    const total = cart.reduce((acc, item) => acc + Number(item.price), 0);
    const messageEl = document.getElementById('message');

    // Preparar dados (agrupando por ID para o backend)
    // O backend espera { items: [{ product_id, quantity, price }] }
    const itemsMap = {};
    cart.forEach(p => {
        if (!itemsMap[p.id]) itemsMap[p.id] = { product_id: p.id, price: p.price, quantity: 0 };
        itemsMap[p.id].quantity++;
    });
    const items = Object.values(itemsMap);

    const orderData = {
        customer_name: name,
        customer_email: email,
        total_amount: total,
        items: items
    };

    try {
        messageEl.innerText = "Enviando...";
        messageEl.style.color = "blue";

        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (!res.ok) throw new Error('Falha');

        messageEl.innerText = "Encomenda realizada com sucesso!";
        messageEl.style.color = "green";

        // Limpar
        cart = [];
        updateTotal();
        document.getElementById('order-form').reset();

    } catch (err) {
        console.error(err);
        messageEl.innerText = "Erro ao enviar encomenda.";
        messageEl.style.color = "red";
    }
});
