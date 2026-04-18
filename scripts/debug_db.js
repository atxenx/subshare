
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'webshop.db');
console.log('Opening DB at:', dbPath);

try {
    const db = new Database(dbPath);

    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name));

    // Check site_settings specifically
    const settingsTable = tables.find(t => t.name === 'site_settings');
    if (settingsTable) {
        console.log('site_settings table found.');
        const rows = db.prepare('SELECT * FROM site_settings').all();
        console.log('Row count:', rows.length);
        console.log('Rows:', rows);
    } else {
        console.error('CRITICAL: site_settings table NOT found!');
    }

} catch (err) {
    console.error('DB Error:', err);
}
