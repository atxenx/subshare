const fetch = require('node-fetch');

async function test() {
    try {
        console.log('--- Debugging API/DB Sync ---');
        
        // Check Products
        const prodRes = await fetch('http://localhost:3000/api/products');
        const prodData = await prodRes.json();
        console.log('API Products Count:', prodData.success ? prodData.data.products.length : 'FAILED');
        
        if (prodData.success && prodData.data.products.length > 0) {
            console.log('Sample Product Title:', prodData.data.products[0].title);
        }

        // Check recent orders (requires admin login, but we can check if it responds)
        const statsRes = await fetch('http://localhost:3000/api/admin/stats');
        console.log('Admin Stats Status (Should be 401 without token):', statsRes.status);

    } catch (e) {
        console.error('API Error:', e.message);
    }
}

test();
