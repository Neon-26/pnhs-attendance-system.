const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const dateParam = req.query.date || new Date().toISOString().split('T')[0];
        
        const result = await pool.query(`
            SELECT 
                id, student_id, first_name, last_name, class_ AS class, 
                parent_email, email,
                COALESCE(is_active, true) as is_active,
                COALESCE((
                    SELECT status::text FROM attendance 
                    WHERE student_id = s.id AND DATE(date) = $1
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

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, class_, email, parent_email, is_active } = req.body;

        const checkResult = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        let updates = [];
        let values = [];
        let paramCount = 1;
        
        if (first_name !== undefined) { 
            updates.push(`first_name = $${paramCount++}`);
            values.push(first_name);
        }
        if (last_name !== undefined) {
            updates.push(`last_name = $${paramCount++}`);
            values.push(last_name);
        }
        if (class_ !== undefined) {
            updates.push(`class_ = $${paramCount++}`);
            values.push(class_);
        }
        if (email !== undefined) {
            updates.push(`email = $${paramCount++}`);
            values.push(email);
        }
        if (parent_email !== undefined) {
            updates.push(`parent_email = $${paramCount++}`);
            values.push(parent_email);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(is_active);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }
        
        values.push(id);
        
        const result = await pool.query(`
            UPDATE students 
            SET ${updates.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `, values);
        
        res.json({ message: 'Student updated', student: result.rows[0] });
    } catch (error) {
        console.error('Update error:', error.message);
        res.status(500).json({ message: 'Error: ' + error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM students WHERE id = $1', [id]);
        res.json({ message: 'Student deleted!' });
    } catch (error) {
        res.status(500).json({ message: 'Error: ' + error.message });
    }
});

module.exports = router;