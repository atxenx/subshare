const db = require('./database/db');
const database = db.getDatabase();

try {
    const updateLogo = database.prepare("UPDATE site_settings SET value = 'assets/logo.png' WHERE key = 'logo_url' AND value = 'assets/webshop-logo.png'");
    const updateFavicon = database.prepare("UPDATE site_settings SET value = 'assets/logo.png' WHERE key = 'favicon_url'");

    updateLogo.run();
    updateFavicon.run();
    console.log('Fixed default paths in DB');
} catch (error) {
    console.error('Error fixing DB:', error);
}
