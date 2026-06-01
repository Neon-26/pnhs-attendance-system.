const express = require('express');
const router = express.Router();
const pool = require('../config/database');

function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

router.get('/pending', async (req, res) => {
    try {
        const { date } = req.query;

        const targetDate = date || getLocalDate();
        
        console.log('Loading pending for:', targetDate);

        const result = await pool.query(`
            SELECT a.id as attendance_id, a.date, a.status, COALESCE(a.notes, '') as excuse, a.created_at,
                   s.id as student_id, s.student_id as student_number, s.first_name, s.last_name, s.class_, s.email, s.parent_email
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE a.date::text = $1 AND a.status = 'pending'
            ORDER BY a.created_at DESC
        `, [targetDate]);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { attendance_id, action, new_status, notes } = req.body;

        const attResult = await pool.query('SELECT * FROM attendance WHERE id = $1', [attendance_id]);
        if (attResult.rows.length === 0) {
            return res.status(404).json({ message: 'Not found' });
        }
        
        const att = attResult.rows[0];
        const studentResult = await pool.query('SELECT * FROM students WHERE id = $1', [att.student_id]);
        const student = studentResult.rows[0];

        if (action === 'approve') {
            let originalStatus = 'present';
            if (att.notes && att.notes.includes('Reported as ')) {
                const match = att.notes.match(/Reported as (\w+)/);
                if (match) originalStatus = match[1];
            }
            
            await pool.query(
                'UPDATE attendance SET status = $1, notes = $2 WHERE id = $3',
                [originalStatus, 'Approved. ' + (att.notes || ''), attendance_id]
            );

            try {
                const { sendApprovalEmail } = require('../utils/email');
                await sendApprovalEmail(student, originalStatus, att.date);
            } catch (e) {
                console.log('Email not sent:', e.message);
            }

            res.json({ message: 'Approved', status: originalStatus });
            
        } else if (action === 'reject') {
            if (!new_status) {
                return res.status(400).json({ message: 'Status required' });
            }
            
            const rejectNotes = notes || 'Rejected. Changed to ' + new_status.toUpperCase() + '.';
            
            await pool.query(
                'UPDATE attendance SET status = $1, notes = $2 WHERE id = $3',
                [new_status, rejectNotes, attendance_id]
            );

            try {
                const { sendRejectionEmail } = require('../utils/email');
                await sendRejectionEmail(student, new_status, att.date, rejectNotes);
            } catch (e) {
                console.log('Email not sent:', e.message);
            }

            res.json({ message: 'Updated', status: new_status });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error' });
    }
});

module.exports = router;