// ============================================
// SubShare - Settings Routes
// ============================================

const express = require('express');
const router = express.Router();
const { settingsOps } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'assets/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// GET /api/settings - Get all settings (Public)
router.get('/', async (req, res) => {
    try {
        const settings = await settingsOps.getAll();
        const settingsMap = {};
        settings.forEach(setting => {
            settingsMap[setting.key] = setting.value;
        });
        res.json(settingsMap);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /api/settings - Update settings (Admin only)
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
    const updates = req.body; // Expects object like { "site_title": "New Title", ... }

    try {
        if (!updates || Object.keys(updates).length === 0) {
            return res.json({ message: 'No changes' });
        }

        const payload = Object.entries(updates).map(([key, value]) => ({ key, value }));
        
        await settingsOps.updateBulk(payload);
        
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/settings/upload - Upload image (Admin only)
router.post('/upload', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    // Return the path relative to server root, e.g., 'assets/upload-123.png'
    res.json({
        message: 'File uploaded successfully',
        path: `assets/${req.file.filename}`
    });
});

module.exports = router;

module.exports = router;
