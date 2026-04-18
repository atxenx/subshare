// ============================================
// SubShare - Issue Reports Routes
// ============================================

const express = require('express');
const router = express.Router();
const { issueOps, orderOps } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// POST /api/issues — Submit an issue report (authenticated user)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { order_id, subject, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a subject and message.'
            });
        }

        // If order_id provided, verify it belongs to the user
        if (order_id) {
            const order = await orderOps.getById(order_id);
            if (!order || order.user_id !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Order not found or access denied.'
                });
            }
        }

        const issue = await issueOps.create(req.user.id, order_id || null, subject.trim(), message.trim());

        res.status(201).json({
            success: true,
            message: 'Your issue has been submitted. Our team will respond shortly.',
            data: { id: issue.id }
        });
    } catch (error) {
        console.error('Submit issue error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while submitting your issue.'
        });
    }
});

// GET /api/issues/my — Get current user's issue reports
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const issues = await issueOps.getByUser(req.user.id);

        res.json({
            success: true,
            data: { issues }
        });
    } catch (error) {
        console.error('Get issues error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving your issues.'
        });
    }
});

// GET /api/issues — Admin: Get all issue reports
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const issues = await issueOps.getAll();

        res.json({
            success: true,
            data: { issues }
        });
    } catch (error) {
        console.error('Admin get issues error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving issue reports.'
        });
    }
});

// PUT /api/issues/:id — Admin: Update issue status and/or reply
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const issueId = parseInt(req.params.id);
        const { status, admin_reply } = req.body;

        const issue = await issueOps.getById(issueId);

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue report not found.'
            });
        }

        const validStatuses = ['open', 'in_progress', 'resolved'];
        const newStatus = validStatuses.includes(status) ? status : issue.status;

        await issueOps.update(issueId, {
            status: newStatus,
            admin_reply: admin_reply !== undefined ? admin_reply : issue.admin_reply
        });

        res.json({
            success: true,
            message: 'Issue report updated successfully.',
            data: { id: issueId, status: newStatus }
        });
    } catch (error) {
        console.error('Update issue error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating the issue.'
        });
    }
});

module.exports = router;

module.exports = router;
