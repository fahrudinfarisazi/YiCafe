const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'supersecretposkey';
const token = jwt.sign({ id: 'admin-id', role: 'ADMIN' }, SECRET_KEY);

async function run() {
  const catRes = await fetch('http://localhost:5000/api/categories', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const categories = await catRes.json();
  const categoryId = categories.length > 0 ? categories[0].id : '';
  console.log("Using Category ID:", categoryId);

  console.log("Creating product...");
  const createRes = await fetch('http://localhost:5000/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Test Product',
      price: 10000,
      stock: 10,
      image: null,
      categoryId: categoryId
    })
  });
  const created = await createRes.json();
  console.log("Create Response:", createRes.status, created);

  if (created.id) {
    console.log("Deleting product...");
    const delRes = await fetch(`http://localhost:5000/api/products/${created.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log("Delete Response:", delRes.status);
    if (!delRes.ok) {
       console.log(await delRes.json());
    }
  } else {
    // Try to find a product to delete if we couldn't create one
    const prodRes = await fetch('http://localhost:5000/api/products', {
       headers: { 'Authorization': `Bearer ${token}` }
    });
    const products = await prodRes.json();
    if (products.length > 0) {
        console.log("Trying to delete an existing product:", products[0].id);
        const delExistingRes = await fetch(`http://localhost:5000/api/products/${products[0].id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log("Delete Existing Response:", delExistingRes.status);
        if (!delExistingRes.ok) {
           console.log(await delExistingRes.json());
        }
    }
  }
}

run();
