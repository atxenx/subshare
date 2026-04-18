const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/webshop.db');

db.serialize(() => {
    // 1. Get all products
    db.all("SELECT id FROM products", [], (err, rows) => {
        if (err) throw err;
        
        let stmt = db.prepare("INSERT INTO product_keys (product_id, key_data, is_sold) VALUES (?, ?, 0)");
        let updateStmt = db.prepare("UPDATE products SET stock = stock + 5, available_keys = available_keys + 5, total_keys = total_keys + 5 WHERE id = ?");

        rows.forEach((row) => {
            const productId = row.id;
            for(let i=1; i<=5; i++) {
                stmt.run(productId, `user${i}@premium.com:password123`);
            }
            updateStmt.run(productId);
            console.log(`Added 5 keys for product ${productId}`);
        });
        
        stmt.finalize();
        updateStmt.finalize();
        
        console.log("Done adding keys.");
    });
});
