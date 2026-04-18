const db = require('./database/db');
const database = db.getDatabase();

try {
    console.log('Migrating orders table...');
    // check if column exists first
    const tableInfo = database.pragma('table_info(orders)');
    const hasReadColumn = tableInfo.some(col => col.name === 'is_read');

    if (!hasReadColumn) {
        database.prepare('ALTER TABLE orders ADD COLUMN is_read INTEGER DEFAULT 0').run();
        console.log('Added is_read column to orders table.');
    } else {
        console.log('is_read column already exists.');
    }
} catch (error) {
    console.error('Migration failed:', error);
}
