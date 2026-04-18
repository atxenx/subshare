// ============================================
// SubShare - Inbox Routes
// ============================================

const express = require('express');
const router = express.Router();
const { orderOps } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/inbox/unread - Get unread count
router.get('/unread', authenticateToken, async (req, res) => {
    try {
        const count = await orderOps.getUnreadCount(req.user.id);
        res.json({ count });
    } catch (error) {
        console.error('Inbox unread error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/inbox - Get all purchased items
router.get('/', authenticateToken, async (req, res) => {
    try {
        const orders = await orderOps.getByUser(req.user.id);
        
        // Map to match the previous frontend expectations if necessary
        const inboxItems = orders.map(o => ({
            id: o.id,
            key_data: o.key_data,
            created_at: o.created_at,
            is_read: o.is_read,
            product_name: o.products ? o.products.title : 'Unknown Product',
            product_image: o.products ? o.products.image_path : ''
        }));

        res.json(inboxItems);
    } catch (error) {
        console.error('Inbox list error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /api/inbox/:id/read - Mark as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        const success = await orderOps.markAsRead(req.params.id, req.user.id);

        if (success) {
            res.json({ success: true, message: 'Marked as read' });
        } else {
            res.status(404).json({ message: 'Order not found or access denied' });
        }
    } catch (error) {
        console.error('Inbox read error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;

module.exports = router;
