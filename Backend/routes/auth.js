const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log("Login attempt:", username);

        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1', 
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const user = result.rows[0];
        console.log("User found:", user.username, "student_id:", user.student_id);

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ 
            id: user.id, 
            role: user.role
        }, process.env.JWT_SECRET, { expiresIn: '24h' });

        let responseData = {
            id: user.id,
            username: user.username,
            role: user.role,
            student_internal_id: null,
            student_id: null
        };

        if (user.role === 'student') {
            if (user.student_id && user.student_id > 0) {
                responseData.student_internal_id = user.student_id;
                
                const studentResult = await pool.query(
                    'SELECT student_id, first_name, last_name FROM students WHERE id = $1', 
                    [user.student_id]
                );
                
                if (studentResult.rows.length > 0) {
                    responseData.student_id = studentResult.rows[0].student_id;
                    console.log("Linked:", studentResult.rows[0].first_name, studentResult.rows[0].last_name);
                }
            } else {
                console.log("WARNING: Student account has no student_id link!");
            }
        }
        
        console.log("Final response:", responseData);
        res.json({ token, user: responseData });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

module.exports = router;