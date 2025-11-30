const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const gigsRoutes = require('./routes/gigs');
const proposalsRoutes = require('./routes/proposals');
const transactionsRoutes = require('./routes/transactions');

app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigsRoutes);
app.use('/api/proposals', proposalsRoutes);
app.use('/api/transactions', transactionsRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'FreelanceHub API is running!',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            gigs: '/api/gigs',
            proposals: '/api/proposals',
            transactions: '/api/transactions'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🚀 FreelanceHub API Server          ║
║   ✅ Server running on port ${PORT}       ║
║   📍 http://localhost:${PORT}             ║
║   🔗 API: http://localhost:${PORT}/api   ║
╚════════════════════════════════════════╝
    `);
});