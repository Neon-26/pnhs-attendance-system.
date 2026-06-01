const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const dateParam = req.query.date || new Date().toISOString().split('T')[0];
        
        console.log('Fetching students for date:', dateParam);
        
        const result = await pool.query(`
            SELECT 
                id, student_id, first_name, last_name, class_ AS class, 
                parent_email, email,
                COALESCE((
                    SELECT status::text FROM attendance 
                    WHERE student_id = s.id AND date::text = $1
                ), 'not-marked') as today_status,
                created_at
            FROM students s 
            ORDER BY student_id
        `, [dateParam]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;