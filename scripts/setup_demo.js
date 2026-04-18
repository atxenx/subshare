const bcrypt = require('bcryptjs');
const { userOps, productOps, productKeyOps, getDatabase } = require('../database/db');

async function setup() {
    console.log('--- Starting Demo Setup ---');

    // 1. Reset Admin Account
    const email = 'admin@subshare.app';
    const password = 'adminpassword';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = userOps.findByEmail(email);
    if (user) {
        console.log(`Resetting admin user: ${email}`);
        const db = getDatabase();
        db.prepare('UPDATE users SET password_hash = ?, balance = ?, role = ? WHERE email = ?')
          .run(hash, 1000.0, 'admin', email);
    } else {
        console.log(`Creating admin user: ${email}`);
        userOps.create('Admin User', email, hash);
        const newUser = userOps.findByEmail(email);
        const db = getDatabase();
        db.prepare('UPDATE users SET balance = ?, role = ? WHERE id = ?')
          .run(1000.0, 'admin', newUser.id);
    }

    // 2. Clear existing unsold keys (optional, but good for clean demo)
    const db = getDatabase();
    // db.prepare('DELETE FROM product_keys WHERE is_sold = 0').run();

    // 3. Add Sample Credentials for Popular Products
    const productsToPopulate = [
        { id: 1,  name: 'YouTube Premium' },
        { id: 3,  name: 'Spotify Premium' },
        { id: 6,  name: 'Netflix Premium' },
        { id: 7,  name: 'Disney+ Premium' },
        { id: 10, name: 'HBO Max' },
        { id: 9,  name: 'Canva Pro' }
    ];

    for (const prod of productsToPopulate) {
        const keysToAdd = [];
        for (let i = 1; i <= 10; i++) {
            keysToAdd.push(`Email: demo${i.toString().padStart(2, '0')}@subshare.app | Password: subshare${i}`);
        }
        
        console.log(`Adding 10 credentials for ${prod.name} (ID: ${prod.id})`);
        productKeyOps.addBulk(prod.id, keysToAdd);
        
        // Sync Stock
        const count = productKeyOps.countAvailable(prod.id);
        productOps.updateStock(prod.id, count);
    }

    console.log('✅ Demo setup complete!');
    process.exit(0);
}

setup().catch(err => {
    console.error('❌ Setup failed:', err);
    process.exit(1);
});
