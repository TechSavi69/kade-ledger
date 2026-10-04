const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes import 
const productsRouter = require('./routes/products');
const salesRouter = require('./routes/sales');

// Routes use 
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Kade Ledger API is running 🏪' });
});

// Server start 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
