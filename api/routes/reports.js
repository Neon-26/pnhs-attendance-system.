const express = require('express');
const pool = require('../config/database');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { date } = req.query;
        
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        const result = await pool.query(`
            SELECT 
                TO_CHAR(a.date, 'YYYY-MM-DD') as date,
                TO_CHAR(a.created_at, 'HH24:MI:SS') as time,
                a.status,
                s.student_id,
                s.first_name,
                s.last_name,
                s.class_ AS class
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            WHERE a.date::text = $1
            ORDER BY a.created_at DESC, s.student_id
        `, [targetDate]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Reports error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;