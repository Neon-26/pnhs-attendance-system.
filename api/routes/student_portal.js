const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../../api/config/database');
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const verificationCodes = new Map();

router.get('/profile', async (req, res) => {
    try {
        const { username, today } = req.query;
        
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = userResult.rows[0];
        
        if (user.role !== 'student') {
            return res.status(401).json({ message: 'Not a student' });
        }
        
        const studentResult = await pool.query('SELECT * FROM students WHERE id = $1', [user.student_id]);
        
        if (studentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        const student = studentResult.rows[0];

        const clientDate = today || new Date().toISOString().split('T')[0];
        
        console.log('Using client date:', clientDate);

        const attendanceResult = await pool.query(
            "SELECT * FROM attendance WHERE student_id = $1 AND date = $2",
            [student.id, clientDate]
        );
        
        const todayAttendance = attendanceResult.rows.length > 0 ? attendanceResult.rows[0] : null;
        
        res.json({ student, todayAttendance });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/history', async (req, res) => {
    try {
        const { student_id } = req.query;
        
        if (!student_id) {
            return res.status(400).json({ message: 'Student ID required' });
        }
        
        const result = await pool.query(
            'SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC',
            [student_id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/report', async (req, res) => {
    try {
        const { student_id, status, excuse, date } = req.body;
        
        if (!student_id) {
            return res.status(400).json({ message: 'Student ID required' });
        }

        const reportDate = date || new Date().toISOString().split('T')[0];
        
        console.log('Submitting for date:', reportDate);

        const existing = await pool.query(
            "SELECT * FROM attendance WHERE student_id = $1 AND date = $2",
            [student_id, reportDate]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Already reported today' });
        }

        await pool.query(
            'INSERT INTO attendance (student_id, date, status, notes) VALUES ($1, $2, $3, $4)',
            [student_id, reportDate, 'pending', `Reported as ${status}. ${excuse || ''}`]
        );

        res.json({ message: 'Report submitted!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/send-code', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email required' });
        }
        
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        verificationCodes.set(email, {
            code: code,
            expires: Date.now() + 10 * 60 * 1000
        });
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'PNHS - Verification Code',
            html: `<h2>Code: ${code}</h2><p>Expires in 10 minutes.</p>`
        };
        
        await transporter.sendMail(mailOptions);
        
        res.json({ message: 'Code sent!' });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error sending code' });
    }
});

router.post('/change-password', async (req, res) => {
    try {
        const { code, newPassword } = req.body;
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!code || !newPassword) {
            return res.status(400).json({ message: 'Code and password required' });
        }
        
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const user = userResult.rows[0];
        const storedCode = verificationCodes.get(user.email);
        
        if (!storedCode || storedCode.code !== code) {
            return res.status(400).json({ message: 'Invalid code' });
        }
        
        if (Date.now() > storedCode.expires) {
            verificationCodes.delete(user.email);
            return res.status(400).json({ message: 'Code expired' });
        }
        
        const newHash = await bcrypt.hash(newPassword, 12);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.id]);
        
        verificationCodes.delete(user.email);

        res.json({ message: 'Password changed!' });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error' });
    }
});

module.exports = router;