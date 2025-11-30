const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// ENDPOINT 14: Get Transactions
router.get('/', verifyToken, async (req, res) => {
    try {
        let query, params;

        if (req.user.role === 'client') {
            query = `
                SELECT t.*, g.title as gig_title, u.name as freelancer_name 
                FROM transactions t 
                JOIN gigs g ON t.gig_id = g.id 
                JOIN users u ON t.freelancer_id = u.id 
                WHERE t.client_id = ? 
                ORDER BY t.created_at DESC
            `;
            params = [req.user.user_id];
        } else {
            query = `
                SELECT t.*, g.title as gig_title, u.name as client_name 
                FROM transactions t 
                JOIN gigs g ON t.gig_id = g.id 
                JOIN users u ON t.client_id = u.id 
                WHERE t.freelancer_id = ? 
                ORDER BY t.created_at DESC
            `;
            params = [req.user.user_id];
        }

        const [transactions] = await db.query(query, params);

        res.json({
            success: true,
            message: 'Data transactions berhasil diambil',
            data: transactions
        });

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});

// ENDPOINT 15: Get Transaction Detail
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const [transactions] = await db.query(
            `SELECT t.*, g.title as gig_title, g.description as gig_description,
             c.name as client_name, c.email as client_email,
             f.name as freelancer_name, f.email as freelancer_email,
             p.cover_letter, p.delivery_days
             FROM transactions t 
             JOIN gigs g ON t.gig_id = g.id 
             JOIN users c ON t.client_id = c.id 
             JOIN users f ON t.freelancer_id = f.id
             JOIN proposals p ON t.proposal_id = p.id
             WHERE t.id = ?`,
            [id]
        );

        if (transactions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction tidak ditemukan'
            });
        }

        const transaction = transactions[0];

        // Check access
        if (transaction.client_id !== req.user.user_id && transaction.freelancer_id !== req.user.user_id) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses'
            });
        }

        res.json({
            success: true,
            message: 'Detail transaction berhasil diambil',
            data: transaction
        });

    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});

// ENDPOINT 16: Update Transaction Status
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['paid', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status tidak valid'
            });
        }

        // Get transaction
        const [transactions] = await db.query(
            'SELECT * FROM transactions WHERE id = ?',
            [id]
        );

        if (transactions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Transaction tidak ditemukan'
            });
        }

        const transaction = transactions[0];

        // Validate access based on status
        if (status === 'paid' && transaction.client_id !== req.user.user_id) {
            return res.status(403).json({
                success: false,
                message: 'Hanya client yang bisa mengupdate status paid'
            });
        }

        if (status === 'completed' && transaction.freelancer_id !== req.user.user_id) {
            return res.status(403).json({
                success: false,
                message: 'Hanya freelancer yang bisa mengupdate status completed'
            });
        }

        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Update transaction
            let updateQuery = 'UPDATE transactions SET status = ?';
            const updateParams = [status];

            if (status === 'paid') {
                updateQuery += ', payment_date = NOW()';
            } else if (status === 'completed') {
                updateQuery += ', completion_date = NOW()';
                
                // Update gig status
                await connection.query(
                    'UPDATE gigs SET status = ? WHERE id = ?',
                    ['completed', transaction.gig_id]
                );
            }

            updateQuery += ' WHERE id = ?';
            updateParams.push(id);

            await connection.query(updateQuery, updateParams);

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: 'Transaction status berhasil diupdate'
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});

module.exports = router;