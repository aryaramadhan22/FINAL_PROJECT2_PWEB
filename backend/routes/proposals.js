const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

// ENDPOINT 10: Create Proposal (Freelancer only)
router.post('/', verifyToken, requireRole(['freelancer']), async (req, res) => {
    try {
        const { gig_id, cover_letter, bid_amount, delivery_days } = req.body;

        if (!gig_id || !cover_letter || !bid_amount || !delivery_days || bid_amount <= 0 || delivery_days <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Semua field harus diisi dengan benar'
            });
        }

        // Check if gig exists and is open
        const [gigs] = await db.query(
            'SELECT id, status FROM gigs WHERE id = ?',
            [gig_id]
        );

        if (gigs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Gig tidak ditemukan'
            });
        }

        if (gigs[0].status !== 'open') {
            return res.status(400).json({
                success: false,
                message: 'Gig sudah tidak menerima proposal'
            });
        }

        // Check if already applied
        const [existingProposals] = await db.query(
            'SELECT id FROM proposals WHERE gig_id = ? AND freelancer_id = ?',
            [gig_id, req.user.user_id]
        );

        if (existingProposals.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Anda sudah mengirim proposal untuk gig ini'
            });
        }

        const [result] = await db.query(
            'INSERT INTO proposals (gig_id, freelancer_id, cover_letter, bid_amount, delivery_days) VALUES (?, ?, ?, ?, ?)',
            [gig_id, req.user.user_id, cover_letter, bid_amount, delivery_days]
        );

        res.status(201).json({
            success: true,
            message: 'Proposal berhasil dikirim',
            data: { proposal_id: result.insertId }
        });

    } catch (error) {
        console.error('Create proposal error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});

// ENDPOINT 11: Get Proposals
router.get('/', verifyToken, async (req, res) => {
    try {
        let query, params;

        if (req.user.role === 'client') {
            // Client melihat proposals di gig mereka
            const { gig_id } = req.query;

            if (!gig_id) {
                return res.status(400).json({
                    success: false,
                    message: 'gig_id harus diisi'
                });
            }

            // Check ownership
            const [gigs] = await db.query(
                'SELECT client_id FROM gigs WHERE id = ?',
                [gig_id]
            );

            if (gigs.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Gig tidak ditemukan'
                });
            }

            if (gigs[0].client_id !== req.user.user_id) {
                return res.status(403).json({
                    success: false,
                    message: 'Anda tidak memiliki akses'
                });
            }

            query = `
                SELECT p.*, u.name as freelancer_name, u.email as freelancer_email, u.bio as freelancer_bio 
                FROM proposals p 
                JOIN users u ON p.freelancer_id = u.id 
                WHERE p.gig_id = ? 
                ORDER BY p.created_at DESC
            `;
            params = [gig_id];

        } else {
            // Freelancer melihat proposal mereka sendiri
            query = `
                SELECT p.*, g.title as gig_title, g.budget as gig_budget, u.name as client_name 
                FROM proposals p 
                JOIN gigs g ON p.gig_id = g.id 
                JOIN users u ON g.client_id = u.id 
                WHERE p.freelancer_id = ? 
                ORDER BY p.created_at DESC
            `;
            params = [req.user.user_id];
        }

        const [proposals] = await db.query(query, params);

        res.json({
            success: true,
            message: 'Data proposals berhasil diambil',
            data: proposals
        });

    } catch (error) {
        console.error('Get proposals error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});

// ENDPOINT 12: Update Proposal Status (Client only)
router.put('/:id', verifyToken, requireRole(['client']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status harus accepted atau rejected'
            });
        }

        // Check proposal and gig ownership
        const [proposals] = await db.query(
            `SELECT p.*, g.client_id 
             FROM proposals p 
             JOIN gigs g ON p.gig_id = g.id 
             WHERE p.id = ?`,
            [id]
        );

        if (proposals.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Proposal tidak ditemukan'
            });
        }

        const proposal = proposals[0];

        if (proposal.client_id !== req.user.user_id) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses'
            });
        }

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Update proposal status
            await connection.query(
                'UPDATE proposals SET status = ? WHERE id = ?',
                [status, id]
            );

            // If accepted, update gig status and create transaction
            if (status === 'accepted') {
                await connection.query(
                    'UPDATE gigs SET status = ? WHERE id = ?',
                    ['in_progress', proposal.gig_id]
                );

                await connection.query(
                    'INSERT INTO transactions (gig_id, client_id, freelancer_id, proposal_id, amount) VALUES (?, ?, ?, ?, ?)',
                    [proposal.gig_id, req.user.user_id, proposal.freelancer_id, id, proposal.bid_amount]
                );
            }

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: `Proposal berhasil ${status === 'accepted' ? 'diterima' : 'ditolak'}`
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Update proposal error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});

// ENDPOINT 13: Delete Proposal (Owner only)
router.delete('/:id', verifyToken, requireRole(['freelancer']), async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const [proposals] = await db.query(
            'SELECT freelancer_id, status FROM proposals WHERE id = ?',
            [id]
        );

        if (proposals.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Proposal tidak ditemukan'
            });
        }

        const proposal = proposals[0];

        if (proposal.freelancer_id !== req.user.user_id) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses'
            });
        }

        if (proposal.status === 'accepted') {
            return res.status(400).json({
                success: false,
                message: 'Proposal yang sudah diterima tidak bisa dihapus'
            });
        }

        await db.query('DELETE FROM proposals WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Proposal berhasil dihapus'
        });

    } catch (error) {
        console.error('Delete proposal error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});

module.exports = router;