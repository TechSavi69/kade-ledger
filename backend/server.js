const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes import 
const productsRouter = require('./routes/products');

// Routes use 
app.use('/api/products', productsRouter);

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Kade Ledger API is running 🏪' });
});

// Server start 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});