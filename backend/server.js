const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== SERVE FRONTEND STATIC FILES =====
// Ini yang membuat http://localhost:3000 langsung ke frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// ===== API ROUTES =====
const authRoutes = require('./routes/auth');
const gigsRoutes = require('./routes/gigs');
const proposalsRoutes = require('./routes/proposals');
const transactionsRoutes = require('./routes/transactions');

app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigsRoutes);
app.use('/api/proposals', proposalsRoutes);
app.use('/api/transactions', transactionsRoutes);

// ===== ROOT ENDPOINT (/) =====
// Saat user buka http://localhost:3000
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===== 404 HANDLER FOR API =====
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan'
    });
});

// ===== CATCH ALL (untuk SPA routing) =====
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
    });
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🚀 FreelanceHub Server              ║
║   ✅ Running on port ${PORT}              ║
║                                        ║
║   🌐 Open: http://localhost:${PORT}      ║
║   🔗 API:  http://localhost:${PORT}/api  ║
╚════════════════════════════════════════╝
    `);
});