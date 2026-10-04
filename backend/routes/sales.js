const express = require('express');
const router = express.Router();
const db = require('./config/db');

// ============================================
// GET /api/sales - All sales
// ============================================
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                s.id,
                s.product_id,
                p.name AS product_name,
                s.quantity_sold,
                s.total_price,
                s.sold_at
            FROM sales s
            JOIN products p ON s.product_id = p.id
            ORDER BY s.sold_at DESC
        `);
        
        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching sales',
            error: error.message
        });
    }
});

// ============================================
// GET /api/sales/today - Today's sales
// ⚠️ This should be above /:id route!
// ============================================
router.get('/today', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                s.id,
                p.name AS product_name,
                s.quantity_sold,
                s.total_price,
                s.sold_at
            FROM sales s
            JOIN products p ON s.product_id = p.id
            WHERE DATE(s.sold_at) = CURDATE()
            ORDER BY s.sold_at DESC
        `);
        
        // Total revenue calculate කරමු
        const totalRevenue = rows.reduce((sum, sale) => {
            return sum + parseFloat(sale.total_price);
        }, 0);
        
        res.json({
            success: true,
            date: new Date().toISOString().split('T')[0],
            totalSales: rows.length,
            totalRevenue: totalRevenue.toFixed(2),
            data: rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching today sales',
            error: error.message
        });
    }
});

// ============================================
// POST /api/sales - Create a new sale  (TRANSACTION!)
// ============================================
router.post('/', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        const { product_id, quantity_sold } = req.body;
        
        // Validation
        if (!product_id || !quantity_sold) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'product_id and quantity_sold are required'
            });
        }
        
        if (quantity_sold <= 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'quantity_sold must be greater than 0'
            });
        }
        
        // 🔥 TRANSACTION START
        await connection.beginTransaction();
        
        // Step 1: Product එක ගන්න (FOR UPDATE එකෙන් lock කරනවා)
        const [products] = await connection.query(
            'SELECT * FROM products WHERE id = ? FOR UPDATE',
            [product_id]
        );
        
        if (products.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        
        const product = products[0];
        
        // Step 2: Stock එක ඇතිද බලන්න
        if (product.quantity < quantity_sold) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Available: ${product.quantity}, Requested: ${quantity_sold}`
            });
        }
        
        // Step 3: Total price calculate කරන්න
        const totalPrice = (parseFloat(product.price) * quantity_sold).toFixed(2);
        
        // Step 4: Sales table එකට add කරන්න
        const [saleResult] = await connection.query(
            'INSERT INTO sales (product_id, quantity_sold, total_price) VALUES (?, ?, ?)',
            [product_id, quantity_sold, totalPrice]
        );
        
        // Step 5: Products table එකේ stock අඩු කරන්න
        await connection.query(
            'UPDATE products SET quantity = quantity - ? WHERE id = ?',
            [quantity_sold, product_id]
        );
        
        // Step 6: Commit කරන්න — දැන් දෙකම save වෙනවා
        await connection.commit();
        
        // Success response
        res.status(201).json({
            success: true,
            message: 'Sale recorded successfully',
            data: {
                sale_id: saleResult.insertId,
                product_name: product.name,
                quantity_sold: quantity_sold,
                unit_price: product.price,
                total_price: totalPrice,
                remaining_stock: product.quantity - quantity_sold
            }
        });
        
    } catch (error) {
        // ❌ Error එකක් ආවොත් — rollback!
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error recording sale',
            error: error.message
        });
    } finally {
        // Connection  pool 
        connection.release();
    }
});

module.exports = router;