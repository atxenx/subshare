const express = require('express');
const router = express.Router();
const { activityOps } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/activities (Public) - Get all activities
router.get('/', async (req, res) => {
    try {
        const activities = await activityOps.getAll();
        res.json(activities);
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/activities (Admin) - Create new activity
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { key, name, description, type, status_label, icon } = req.body;

    if (!key || !name || !type) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        await activityOps.create({
            key,
            name,
            description,
            type,
            is_active: 1,
            status_label,
            icon: icon || '🎉'
        });

        res.json({ message: 'Activity created successfully' });
    } catch (error) {
        if (error.code === '23505') { // Postgres unique violation code
            return res.status(400).json({ message: 'Key already exists' });
        }
        console.error('Create activity error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /api/activities/:key (Admin) - Update activity status
router.put('/:key', authenticateToken, requireAdmin, async (req, res) => {
    const { key } = req.params;
    const { is_active, status_label, name, description, type, icon } = req.body;

    try {
        const updates = {};
        if (is_active !== undefined) updates.is_active = is_active;
        if (status_label !== undefined) updates.status_label = status_label;
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (type !== undefined) updates.type = type;
        if (icon !== undefined) updates.icon = icon;

        if (Object.keys(updates).length === 0) return res.json({ message: 'No changes' });

        await activityOps.update(key, updates);
        res.json({ message: 'Activity updated successfully' });
    } catch (error) {
        console.error('Update activity error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE /api/activities/:key (Admin) - Delete activity
router.delete('/:key', authenticateToken, requireAdmin, async (req, res) => {
    const { key } = req.params;

    try {
        await activityOps.delete(key);
        res.json({ success: true, message: 'Activity deleted successfully' });
    } catch (error) {
        console.error('Delete activity error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;

module.exports = router;
