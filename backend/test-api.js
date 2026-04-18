const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: 'admin-id', role: 'ADMIN' }, process.env.JWT_SECRET || 'supersecretposkey');

async function run() {
    console.log("Fetching all active products...");
    const prodRes = await fetch('http://localhost:5000/api/products', {
       headers: { 'Authorization': `Bearer ${token}` }
    });
    const products = await prodRes.json();
    console.log("Products count:", products.length);
    console.log("Checking if the Americano product we deleted earlier is in the list...");
    
    const deletedAmericano = products.find(p => p.id === '14fad055-02cb-48e6-ae54-5cb8cd3b41b5');
    if (deletedAmericano) {
        console.error("ERROR: Soft deleted product STILL APPEARS in GET response!");
    } else {
        console.log("SUCCESS: Soft deleted product is hidden!");
    }
}

run();
