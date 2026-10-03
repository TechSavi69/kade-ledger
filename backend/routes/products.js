const express = require('express');
const router = express.Router();
const db = require('./config/db.js');

// ============================================
// GET /api/products 
// ============================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
});

// ============================================
// GET /api/products/:id -  product 
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching product',
            error: error.message
        });
    }
});

// ============================================
// POST /api/products - Product create කරන්න
// ============================================
router.post('/', async (req, res) => {
    try {
        const { name, price, quantity } = req.body;
        
        // Validation
        if (!name || price === undefined || quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Name, price, and quantity are required'
            });
        }
        
        if (price < 0 || quantity < 0) {
            return res.status(400).json({
                success: false,
                message: 'Price and quantity must be positive numbers'
            });
        }
        
        const [result] = await db.query(
            'INSERT INTO products (name, price, quantity) VALUES (?, ?, ?)',
            [name, price, quantity]
        );
        
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: {
                id: result.insertId,
                name,
                price,
                quantity
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating product',
            error: error.message
        });
    }
});

// ============================================
// PUT /api/products/:id - Product update 
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, quantity } = req.body;
        
        // Product 
        const [existing] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        // Update
        await db.query(
            'UPDATE products SET name = ?, price = ?, quantity = ? WHERE id = ?',
            [name, price, quantity, id]
        );
        
        res.json({
            success: true,
            message: 'Product updated successfully',
            data: { id, name, price, quantity }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating product',
            error: error.message
        });
    }
});

// ============================================
// DELETE /api/products/:id - Product delete
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting product',
            error: error.message
        });
    }
});

module.exports = router;