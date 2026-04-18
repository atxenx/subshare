const express = require('express');
const router = express.Router();
const { newsOps } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads (reuse existing config logic or minimal version)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'assets/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'news-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// GET /api/news (Public) - Get active news
router.get('/', async (req, res) => {
    try {
        const news = await newsOps.getAll(true);
        res.json(news);
    } catch (error) {
        console.error('Get news error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/news/all (Admin) - Get all news
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const news = await newsOps.getAll(false);
        res.json(news);
    } catch (error) {
        console.error('Get all news error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/news (Admin) - Create news
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const { title, content, image_url, category } = req.body;
    try {
        const result = await newsOps.create({
            title,
            content,
            image_url,
            category: category || 'general'
        });

        res.json({ id: result.id, message: 'News created successfully' });
    } catch (error) {
        console.error('Create news error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /api/news/:id (Admin) - Update news
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, content, image_url, category, is_active } = req.body;

    try {
        const updates = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (image_url !== undefined) updates.image_url = image_url;
        if (category !== undefined) updates.category = category;
        if (is_active !== undefined) updates.is_active = is_active;

        if (Object.keys(updates).length === 0) return res.json({ message: 'No changes' });

        await newsOps.update(id, updates);
        res.json({ message: 'News updated successfully' });
    } catch (error) {
        console.error('Update news error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE /api/news/:id (Admin) - Delete news
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await newsOps.delete(id);
        res.json({ message: 'News deleted successfully' });
    } catch (error) {
        console.error('Delete news error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/news/upload (Admin) - Upload image specifically for news
router.post('/upload', authenticateToken, requireAdmin, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({
        message: 'File uploaded successfully',
        path: `assets/${req.file.filename}`
    });
});

module.exports = router;

module.exports = router;
