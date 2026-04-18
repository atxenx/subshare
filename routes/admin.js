// ============================================
// SubShare - Admin Routes
// ============================================

const express = require('express');
const router = express.Router();

const { userOps, productOps, productKeyOps, transactionOps, orderOps, topupOps, issueOps } = require('../database/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply admin middleware to all routes
router.use(authenticateToken, requireAdmin);

// ============================================
// DASHBOARD STATS
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const [totalUsers, totalProducts, totalOrders, todayOrders, totalTopup, totalSales] = await Promise.all([
            userOps.count(),
            productOps.count(),
            orderOps.count(),
            orderOps.getTodayCount(),
            transactionOps.getTotalTopup(),
            transactionOps.getTotalPurchase()
        ]);

        const stats = {
            totalUsers,
            totalProducts,
            totalOrders,
            todayOrders,
            totalTopup,
            totalSales
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while loading dashboard statistics.'
        });
    }
});

// ============================================
// USER MANAGEMENT
// ============================================

router.get('/users', async (req, res) => {
    try {
        const users = await userOps.getAll();
        res.json({
            success: true,
            data: { users }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while loading users.'
        });
    }
});

router.put('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { name, email, role, balance } = req.body;

        const existingUser = await userOps.findById(userId);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        const updatedData = {
            name: name || existingUser.name,
            email: email || existingUser.email,
            role: role || existingUser.role,
            balance: balance !== undefined ? parseFloat(balance) : existingUser.balance
        };

        await userOps.update(userId, updatedData);

        res.json({
            success: true,
            message: 'User updated successfully.',
            data: { user: { id: userId, ...updatedData } }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating the user.'
        });
    }
});

router.post('/users/:id/add-balance', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { amount } = req.body;

        const user = await userOps.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        const addAmount = parseFloat(amount);
        if (!addAmount || addAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid amount.'
            });
        }

        const newBalance = (user.balance || 0) + addAmount;
        await userOps.updateBalance(userId, newBalance);

        await transactionOps.create(
            userId,
            'admin_topup',
            addAmount,
            `Admin added $${addAmount.toFixed(2)} credits`
        );

        await topupOps.create(userId, addAmount, 'admin_manual', 'completed');

        res.json({
            success: true,
            message: `$${addAmount.toFixed(2)} credits added to user account.`,
            data: { balance: newBalance }
        });
    } catch (error) {
        console.error('Add balance error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while adding credits.'
        });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (req.user.id === userId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account.'
            });
        }

        const user = await userOps.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        await userOps.delete(userId);

        res.json({
            success: true,
            message: 'User deleted successfully.'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the user.'
        });
    }
});

// ============================================
// CREDENTIAL / SLOT MANAGEMENT
// ============================================

router.get('/products/:id/keys', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const [keys, available] = await Promise.all([
            productKeyOps.getByProduct(productId),
            productKeyOps.countAvailable(productId)
        ]);

        res.json({
            success: true,
            data: {
                keys,
                available,
                total: keys.length
            }
        });
    } catch (error) {
        console.error('Get keys error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while loading credentials.'
        });
    }
});

router.post('/products/:id/keys', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { key_data } = req.body;

        if (!key_data || !key_data.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please provide credential data.'
            });
        }

        const product = await productOps.getById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Subscription package not found.'
            });
        }

        await productKeyOps.add(productId, key_data.trim());

        const newStock = await productKeyOps.countAvailable(productId);
        await productOps.updateStock(productId, newStock);

        res.json({
            success: true,
            message: 'Credential slot added successfully.',
            data: { stock: newStock }
        });
    } catch (error) {
        console.error('Add key error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while adding the credential.'
        });
    }
});

router.post('/products/:id/keys/bulk', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { keys } = req.body;

        if (!keys || !Array.isArray(keys) || keys.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of credential entries.'
            });
        }

        const product = await productOps.getById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Subscription package not found.'
            });
        }

        const validKeys = keys.filter(k => k && k.trim()).map(k => k.trim());

        if (validKeys.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid credential entries provided.'
            });
        }

        await productKeyOps.addBulk(productId, validKeys);

        const newStock = await productKeyOps.countAvailable(productId);
        await productOps.updateStock(productId, newStock);

        res.json({
            success: true,
            message: `${validKeys.length} credential slot(s) added successfully.`,
            data: {
                added: validKeys.length,
                stock: newStock
            }
        });
    } catch (error) {
        console.error('Add bulk keys error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while adding credentials.'
        });
    }
});

router.delete('/keys/:id', async (req, res) => {
    try {
        const keyId = parseInt(req.params.id);
        const key = await productKeyOps.getOne(keyId);

        if (!key) {
            return res.status(404).json({
                success: false,
                message: 'Credential slot not found.'
            });
        }

        if (key.is_sold) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete a credential that has already been assigned to a subscriber.'
            });
        }

        await productKeyOps.delete(keyId);

        const newStock = await productKeyOps.countAvailable(key.product_id);
        await productOps.updateStock(key.product_id, newStock);

        res.json({
            success: true,
            message: 'Credential slot deleted successfully.',
            data: { stock: newStock }
        });
    } catch (error) {
        console.error('Delete key error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while deleting the credential.'
        });
    }
});

// ============================================
// ORDER / SUBSCRIPTION MANAGEMENT
// ============================================

router.get('/orders', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const orders = await orderOps.getAll(limit);

        res.json({
            success: true,
            data: { orders }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while loading subscription orders.'
        });
    }
});

router.put('/orders/:id', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status, key_data } = req.body;

        const order = await orderOps.getById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.'
            });
        }

        await orderOps.update(orderId, {
            status: status !== undefined ? status : order.status,
            key_data: key_data !== undefined ? key_data : order.key_data
        });

        res.json({
            success: true,
            message: 'Order updated successfully.'
        });
    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating the order.'
        });
    }
});

router.get('/topups', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const topups = await topupOps.getAll(limit);

        res.json({
            success: true,
            data: { topups }
        });
    } catch (error) {
        console.error('Get topups error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while loading payment history.'
        });
    }
});

// ============================================
// TRANSACTION HISTORY
// ============================================

router.get('/transactions', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const transactions = await transactionOps.getAll(limit);

        res.json({
            success: true,
            data: { transactions }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while loading transactions.'
        });
    }
});

// ============================================
// SUBSCRIPTION PACKAGE MANAGEMENT (Extended)
// ============================================

router.get('/products/all', async (req, res) => {
    try {
        const products = await productOps.getAllIncludingInactive();

        const productsWithKeyInfo = await Promise.all(products.map(async (p) => ({
            ...p,
            available_keys: await productKeyOps.countAvailable(p.id),
            total_keys: await productKeyOps.countTotal(p.id)
        })));

        res.json({
            success: true,
            data: { products: productsWithKeyInfo }
        });
    } catch (error) {
        console.error('Get all products error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while loading subscription packages.'
        });
    }
});

// ============================================
// ISSUE REPORTS MANAGEMENT
// ============================================

router.get('/issues', async (req, res) => {
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
            message: 'An error occurred while loading issue reports.'
        });
    }
});

router.put('/issues/:id', async (req, res) => {
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
