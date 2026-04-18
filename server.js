// ============================================
// SubShare - Express Server
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const walletRoutes = require('./routes/wallet');
const adminRoutes = require('./routes/admin');
const issueRoutes = require('./routes/issues');

// Import database initialization
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SECURITY: Block access to sensitive files
app.use((req, res, next) => {
    const forbiddenPaths = [
        '/server.js',
        '/package.json',
        '/package-lock.json',
        '/database',
        '/routes',
        '/middleware',
        '/node_modules',
        '/.env',
        '/.git'
    ];

    if (forbiddenPaths.some(p => req.url.startsWith(p))) {
        return res.status(403).send('Forbidden');
    }

    if (req.url.endsWith('.db') || req.url.endsWith('.sql')) {
        return res.status(403).send('Forbidden');
    }

    next();
});

// Static files
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', require('./routes/settings'));
app.use('/api/news', require('./routes/news'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/inbox', require('./routes/inbox'));
app.use('/api/issues', issueRoutes);

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve admin.html
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve inbox.html
app.get('/inbox', (req, res) => {
    res.sendFile(path.join(__dirname, 'inbox.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'An internal server error occurred.'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SubShare Server running at http://localhost:${PORT}`);
    console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
});
