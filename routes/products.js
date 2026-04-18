// ============================================
// SubShare - Subscription Package Routes
// ============================================

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const { productOps } = require('../database/db');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'product-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed.'));
    }
});

// Get all subscription packages
router.get('/', optionalAuth, async (req, res) => {
    try {
        const products = await productOps.getAll();
        res.json({
            success: true,
            data: { products }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while loading subscription packages.'
        });
    }
});

// Get single subscription package
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const product = await productOps.getById(parseInt(req.params.id));

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Subscription package not found.'
            });
        }

        res.json({
            success: true,
            data: { product }
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while loading this subscription package.'
        });
    }
});

// Create subscription package (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, subtitle, name, description, price, stock, badge, image_path, category, key_type } = req.body;

        if (!title || !name || !price) {
            return res.status(400).json({
                success: false,
                message: 'Title, name, and price are required fields.'
            });
        }

        const product = await productOps.create({
            title,
            subtitle: subtitle || '',
            name,
            description: description || '',
            price: parseFloat(price),
            stock: parseInt(stock) || 0,
            badge: badge || '',
            image_path: image_path || '',
            category: category || 'streaming',
            key_type: key_type || 'credentials'
        });

        res.status(201).json({
            success: true,
            message: 'Subscription package created successfully.',
            data: { product }
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while creating the subscription package.'
        });
    }
});

// Update subscription package (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const existingProduct = await productOps.getById(productId);

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Subscription package not found.'
            });
        }

        const { title, subtitle, name, description, price, stock, badge, image_path, category, key_type } = req.body;

        const updatedProduct = {
            title: title || existingProduct.title,
            subtitle: subtitle !== undefined ? subtitle : existingProduct.subtitle,
            name: name || existingProduct.name,
            description: description !== undefined ? description : existingProduct.description,
            price: price !== undefined ? parseFloat(price) : existingProduct.price,
            stock: stock !== undefined ? parseInt(stock) : existingProduct.stock,
            badge: badge !== undefined ? badge : existingProduct.badge,
            image_path: image_path !== undefined ? image_path : existingProduct.image_path,
            category: category || existingProduct.category,
            key_type: key_type || existingProduct.key_type || 'credentials'
        };

        await productOps.update(productId, updatedProduct);

        res.json({
            success: true,
            message: 'Subscription package updated successfully.',
            data: { product: { id: productId, ...updatedProduct } }
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating the subscription package.'
        });
    }
});

// Delete subscription package (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const existingProduct = await productOps.getById(productId);

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Subscription package not found.'
            });
        }

        await productOps.delete(productId);

        res.json({
            success: true,
            message: 'Subscription package removed successfully.'
        });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while removing the subscription package.'
        });
    }
});

// Upload subscription image (admin only)
router.post('/:id/upload', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const existingProduct = await productOps.getById(productId);

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: 'Subscription package not found.'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please select an image file.'
            });
        }

        const imagePath = 'uploads/' + req.file.filename;
        await productOps.updateImage(productId, imagePath);

        res.json({
            success: true,
            message: 'Image uploaded successfully.',
            data: { image_path: imagePath }
        });
    } catch (error) {
        console.error('Upload image error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while uploading the image.'
        });
    }
});

module.exports = router;
