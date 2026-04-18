// ============================================
// SubShare - Wallet & Purchase Routes
// ============================================

const express = require('express');
const router = express.Router();

const { userOps, transactionOps, productOps, productKeyOps, orderOps, topupOps } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Get wallet balance
router.get('/balance', authenticateToken, (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                balance: req.user.balance
            }
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving your balance.'
        });
    }
});

// Add credits to wallet
router.post('/topup', authenticateToken, async (req, res) => {
    try {
        const { amount } = req.body;

        const topupAmount = parseFloat(amount);
        if (!topupAmount || topupAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid amount.'
            });
        }

        if (topupAmount > 100000) {
            return res.status(400).json({
                success: false,
                message: 'Maximum top-up amount is $100,000.'
            });
        }

        const newBalance = req.user.balance + topupAmount;
        await userOps.updateBalance(req.user.id, newBalance);

        await transactionOps.create(
            req.user.id,
            'topup',
            topupAmount,
            `Credits added: $${topupAmount.toFixed(2)}`
        );

        await topupOps.create(req.user.id, topupAmount, 'simulated_payment', 'completed');

        res.json({
            success: true,
            message: `$${topupAmount.toFixed(2)} credits added successfully.`,
            data: {
                balance: newBalance,
                amount: topupAmount
            }
        });
    } catch (error) {
        console.error('Topup error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while processing your payment.'
        });
    }
});

// Get transaction history
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const transactions = await transactionOps.getByUser(req.user.id, limit);

        res.json({
            success: true,
            data: {
                transactions
            }
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving your transaction history.'
        });
    }
});

// Get user orders (active subscriptions)
router.get('/orders', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const orders = await orderOps.getByUser(req.user.id, limit);

        res.json({
            success: true,
            data: { orders }
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving your subscriptions.'
        });
    }
});

// Purchase subscription package
router.post('/purchase', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity = 1, inviteEmail } = req.body;

        const product = await productOps.getById(parseInt(productId));
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Subscription package not found.'
            });
        }

        if (!product.is_active) {
            return res.status(400).json({
                success: false,
                message: 'This subscription package is currently unavailable.'
            });
        }

        const availableKeys = await productKeyOps.getAvailableByProduct(product.id);

        if (availableKeys.length < quantity) {
            return res.status(400).json({
                success: false,
                message: `Not enough slots available. Only ${availableKeys.length} slot(s) remaining.`
            });
        }

        const totalPrice = product.price * quantity;

        const keysToSell = availableKeys.slice(0, quantity);
        const keyDataArray = keysToSell.map(k => k.key_data);
        let finalKeyData = keyDataArray.join('\n');

        if (product.key_type === 'email_invite' || inviteEmail) {
            if (!inviteEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide an email for the family plan invite.'
                });
            }
            finalKeyData = JSON.stringify({
                type: 'invite',
                email: inviteEmail,
                status: 'pending'
            });
        }

        const deductionSuccess = await userOps.deductBalance(req.user.id, totalPrice);
        if (!deductionSuccess) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient credits. Please add more credits to your account.'
            });
        }

        const userData = await userOps.findById(req.user.id);
        const newBalance = userData.balance;

        const order = await orderOps.create(
            req.user.id,
            product.id,
            quantity,
            totalPrice,
            finalKeyData
        );

        for (const key of keysToSell) {
            await productKeyOps.markAsSold(key.id, req.user.id, order.id);
        }

        const newStock = await productKeyOps.countAvailable(product.id);
        await productOps.updateStock(product.id, newStock);

        await transactionOps.create(
            req.user.id,
            'purchase',
            -totalPrice,
            `Subscribed to ${product.title} x${quantity}`,
            order.id.toString()
        );

        res.json({
            success: true,
            message: 'Subscription activated successfully!',
            data: {
                balance: newBalance,
                key: finalKeyData
            }
        });
    } catch (error) {
        console.error('Purchase processing error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while processing your subscription: ' + error.message
        });
    }
});

module.exports = router;
