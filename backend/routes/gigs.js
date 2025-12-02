const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');


// ENDPOINT 5: Create Gig (Client only)
router.post('/', verifyToken, requireRole(['client']), async (req, res) => {
    try {
        const { title, description, category, budget, deadline } = req.body;

        if (!title || !description || !budget || budget <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, dan budget harus diisi dengan benar'
            });
        }

        const [result] = await db.query(
            'INSERT INTO gigs (client_id, title, description, category, budget, deadline) VALUES (?, ?, ?, ?, ?, ?)',
            [req.user.user_id, title, description, category, budget, deadline || null]
        );

        res.status(201).json({
            success: true,
            message: 'Gig berhasil dibuat',
            data: { gig_id: result.insertId }
        });

    } catch (error) {
        console.error('Create gig error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});


// ENDPOINT 6: Get All Gigs (FIXED - Return ALL gigs dengan client_id)
router.get('/', async (req, res) => {
    try {
        const { status, category } = req.query;

        let query = `
            SELECT g.id, g.client_id, g.title, g.description, g.category, g.budget, 
                   g.deadline, g.status, g.created_at, u.name as client_name, 
                   u.email as client_email 
            FROM gigs g 
            JOIN users u ON g.client_id = u.id
        `;
        const params = [];

        // Only filter by status if provided
        if (status) {
            query += ' WHERE g.status = ?';
            params.push(status);
        }

        // Filter by category if provided
        if (category) {
            query += params.length > 0 ? ' AND g.category = ?' : ' WHERE g.category = ?';
            params.push(category);
        }

        query += ' ORDER BY g.created_at DESC';

        const [gigs] = await db.query(query, params);

        res.json({
            success: true,
            message: 'Data gigs berhasil diambil',
            data: gigs
        });

    } catch (error) {
        console.error('Get gigs error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});


// ENDPOINT 7: Get Gig by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [gigs] = await db.query(
            `SELECT g.id, g.client_id, g.title, g.description, g.category, g.budget, 
                    g.deadline, g.status, g.created_at, u.name as client_name, 
                    u.email as client_email, u.phone as client_phone 
             FROM gigs g 
             JOIN users u ON g.client_id = u.id 
             WHERE g.id = ?`,
            [id]
        );

        if (gigs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Gig tidak ditemukan'
            });
        }

        const gig = gigs;

        // Get proposal count
        const [countResult] = await db.query(
            'SELECT COUNT(*) as proposal_count FROM proposals WHERE gig_id = ?',
            [id]
        );
        gig.proposal_count = countResult.proposal_count;

        res.json({
            success: true,
            message: 'Detail gig berhasil diambil',
            data: gig
        });

    } catch (error) {
        console.error('Get gig error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});


// ENDPOINT 8: Update Gig (Owner only)
router.put('/:id', verifyToken, requireRole(['client']), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, budget, deadline, status } = req.body;

        // Check ownership
        const [gigs] = await db.query(
            'SELECT client_id FROM gigs WHERE id = ?',
            [id]
        );

        if (gigs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Gig tidak ditemukan'
            });
        }

        if (gigs.client_id !== req.user.user_id) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk mengupdate gig ini'
            });
        }

        if (!title || !description || !budget || budget <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Title, description, dan budget harus diisi dengan benar'
            });
        }

        await db.query(
            'UPDATE gigs SET title = ?, description = ?, category = ?, budget = ?, deadline = ?, status = ? WHERE id = ?',
            [title, description, category, budget, deadline || null, status || 'open', id]
        );

        res.json({
            success: true,
            message: 'Gig berhasil diupdate'
        });

    } catch (error) {
        console.error('Update gig error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});


// ENDPOINT 9: Delete Gig (Owner only)
router.delete('/:id', verifyToken, requireRole(['client']), async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const [gigs] = await db.query(
            'SELECT client_id FROM gigs WHERE id = ?',
            [id]
        );

        if (gigs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Gig tidak ditemukan'
            });
        }

        if (gigs.client_id !== req.user.user_id) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk menghapus gig ini'
            });
        }

        await db.query('DELETE FROM gigs WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Gig berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete gig error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});


module.exports = router;
