const db = require('./database/db');
const database = db.getDatabase();

try {
    const lastOrder = database.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 1').get();
    console.log('Last Order:', lastOrder);
} catch (error) {
    console.error('Error:', error);
}
