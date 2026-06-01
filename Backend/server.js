require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendAttendanceEmail } = require('./utils/email');
const studentRoutes = require('./routes/students');
const enrollRoutes = require('./routes/enroll');
const studentPortalRoutes = require('./routes/student_portal');
const teacherVerifyRoutes = require('./routes/teacher_verify');
const path = require('path');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  app.use(express.static(path.join(__dirname, '../Frontend')));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

app.get('/api/health', async (req, res) => res.json({ status: 'OK' }));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/login.html'));
  });
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.use('/api/students', studentRoutes);
app.use('/api/enroll', enrollRoutes);
app.use('/api/student-portal', studentPortalRoutes);
app.use('/api/teacher-verify', teacherVerifyRoutes);

app.post('/api/attendance/mark', async (req, res) => {
  try {
    const { student_id, status, date } = req.body;
    const markDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      'SELECT id FROM attendance WHERE student_id = $1 AND DATE(date) = $2',
      [student_id, markDate]
    );

    if (result.rows.length > 0) {
      await pool.query(
        'UPDATE attendance SET status = $1 WHERE student_id = $2 AND DATE(date) = $3',
        [status, student_id, markDate]
      );
    } else {
      await pool.query(
        'INSERT INTO attendance (student_id, date, status) VALUES ($1, $2, $3)',
        [student_id, markDate, status]
      );
    }

    const studentResult = await pool.query(
      'SELECT id, student_id, first_name, last_name, class_ AS class, parent_email, email FROM students WHERE id = $1',
      [student_id]
    );
    const student = studentResult.rows[0];

    if (student) {
      sendAttendanceEmail(student, status, markDate).catch(() => {});
    }

    res.json({ message: `Marked ${status.toUpperCase()} ` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM students) AS total_students,
        (SELECT COUNT(*) FROM attendance WHERE DATE(date) = CURRENT_DATE AND status = 'present') AS present_today,
        (SELECT COUNT(*) FROM attendance WHERE DATE(date) = CURRENT_DATE AND status = 'absent') AS absent_today,
        (SELECT COUNT(*) FROM attendance WHERE DATE(date) = CURRENT_DATE AND status = 'late') AS late_today
    `);

    const { total_students, present_today, absent_today, late_today } = statsResult.rows[0];

    res.json({
      totalStudents: parseInt(total_students, 10),
      presentToday: parseInt(present_today, 10),
      absentToday: parseInt(absent_today, 10),
      lateToday: parseInt(late_today, 10)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/reports', async (req, res) => {
  try {
    const dateFilter = req.query.date ? req.query.date : new Date().toISOString().split('T')[0];
    
    const result = await pool.query(`
      SELECT 
        TO_CHAR(a.date, 'YYYY-MM-DD') as date,
        TO_CHAR(a.created_at, 'HH24:MI:SS') as time,
        a.status,
        s.student_id,
        s.first_name,
        s.last_name,
        s.class_
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE DATE(a.date) = $1
      ORDER BY a.created_at DESC, s.student_id
    `, [dateFilter]);
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));