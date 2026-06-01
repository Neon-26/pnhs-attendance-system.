const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../../api/config/database');

router.get('/students', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.id, s.student_id, s.first_name, s.last_name, s.class_, s.email, 
                   s.parent_email, s.is_active,
                   u.username as account_username
            FROM students s 
            LEFT JOIN users u ON s.id = u.student_id 
            ORDER BY s.id DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error: ' + error.message });
    }
});

router.post('/students', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { student_id, first_name, last_name, email, parent_email, class_ } = req.body;
        
        if (!first_name || !last_name) {
            return res.status(400).json({ message: 'First name and last name required' });
        }

        let finalStudentId = student_id;
        if (!finalStudentId) {
            const countResult = await client.query('SELECT COUNT(*) FROM students');
            const count = parseInt(countResult.rows[0].count) + 1;
            finalStudentId = 'STU' + String(count).padStart(3, '0');
        }

        const studentResult = await client.query(
            `INSERT INTO students (student_id, first_name, last_name, email, parent_email, class_, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
            [finalStudentId, first_name, last_name, email || null, parent_email || null, class_]
        );
        
        const studentDbId = studentResult.rows[0].id; 

        const username = (first_name.toLowerCase() + '.' + last_name.toLowerCase()).replace(/[^a-z0-9]/g, '');
        const tempPassword = 'user123';
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        
        await client.query(
            `INSERT INTO users (username, password, role, email, student_id) 
             VALUES ($1, $2, 'student', $3, $4)`,
            [username, passwordHash, email || null, studentDbId]
        );
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Student enrolled!',
            credentials: {
                student_id: finalStudentId,
                username: username,
                password: tempPassword
            }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Error: ' + error.message });
    } finally {
        client.release();
    }
});

router.delete('/students/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;

        await client.query('DELETE FROM attendance WHERE student_id = $1', [id]);

        await client.query('DELETE FROM users WHERE student_id = $1', [id]);

        await client.query('DELETE FROM students WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        res.json({ message: 'Deleted!' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Error: ' + error.message });
    } finally {
        client.release();
    }
});

router.post('/user', async (req, res) => {
    try {
        const { username, password, role, email } = req.body;
        const passwordHash = await bcrypt.hash(password, 12);
        await pool.query(
            `INSERT INTO users (username, password, role, email) VALUES ($1, $2, $3, $4)`,
            [username, passwordHash, role || 'teacher', email || null]
        );
        res.json({ message: 'User created!' });
    } catch (error) {
        res.status(500).json({ message: 'Error' });
    }
});

router.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, email FROM users WHERE student_id IS NULL ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error' });
    }
});

router.delete('/user/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1 AND student_id IS NULL', [req.params.id]);
        res.json({ message: 'Deleted!' });
    } catch (error) {
        res.status(500).json({ message: 'Error' });
    }
});

module.exports = router;