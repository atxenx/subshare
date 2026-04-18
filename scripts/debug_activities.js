const db = require('./database/db');
const database = db.getDatabase();

try {
    const activities = database.prepare('SELECT * FROM activities').all();
    console.log('Activities count:', activities.length);
    console.log(JSON.stringify(activities, null, 2));
} catch (error) {
    console.error('Error fetching activities:', error);
}
