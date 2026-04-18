const http = require('http');

async function testCheckout() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const { token } = await loginRes.json();
    console.log('Got token:', token ? 'yes' : 'no');

    // 2. Get Products (to find a valid ID)
    const prodsRes = await fetch('http://localhost:5000/api/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const products = await prodsRes.json();
    if (!products.length) {
      console.log('No products found to order');
      return;
    }
    const product = products[0];
    console.log('Ordering product:', product.name);

    // 3. Checkout
    const checkoutRes = await fetch('http://localhost:5000/api/transactions/cashier', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            items: [{
                productId: product.id,
                quantity: 1,
                price: product.price
            }],
            orderType: 'DINE_IN',
            paymentMethod: 'CASH',
            customerName: 'Test Customer'
        })
    });
    
    const checkoutData = await checkoutRes.json();
    console.log('Checkout response status:', checkoutRes.status);
    console.log('Checkout data:', checkoutData);
  } catch (err) {
    console.error('Test script error:', err);
  }
}

testCheckout();
