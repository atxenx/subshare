
const jwt = require('jsonwebtoken');
const { userOps } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'webshop_secret_key_2024';

// Verify JWT token
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Please log in to continue.'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await userOps.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found.'
            });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }
}

// Check if user is admin
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required.'
        });
    }
    next();
}

// Optional authentication (doesn't require login but attaches user if logged in)
async function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await userOps.findById(decoded.userId);
            req.user = user;
        } catch (err) {
            // Token invalid, continue without user
        }
    }
    next();
}

module.exports = {
    JWT_SECRET,
    authenticateToken,
    requireAdmin,
    optionalAuth
};
