
/**
 * Minimal Express + SQLite backend for SmileCare Dental
 * Features:
 * - Client register/login (JWT)
 * - Staff login (seeded user)
 * - Book/view client appointments
 * - Staff view all appointments and patients
 */
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const PORT = process.env.PORT || 4000;

// --- SQLite setup ---
const db = new sqlite3.Database('./smilecare.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    dob TEXT,
    role TEXT NOT NULL CHECK(role IN ('client','staff')),
    password_hash TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,       -- YYYY-MM-DD
    time TEXT NOT NULL,       -- HH:mm
    reason TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Seed staff user if missing
  const staffEmail = 'staff@smilecare.com';
  const staffPass = 'password123';
  db.get('SELECT * FROM users WHERE email = ?', [staffEmail], (err, row) => {
    if (err) return console.error('Staff seed lookup failed:', err);
    if (!row) {
      const hash = bcrypt.hashSync(staffPass, 10);
      db.run(
        `INSERT INTO users (name,email,phone,dob,role,password_hash) VALUES (?,?,?,?,?,?)`,
        ['Clinic Staff', staffEmail, '', '', 'staff', hash],
        (err2) => {
          if (err2) console.error('Staff seed failed:', err2);
          else console.log('Seeded staff account:', staffEmail, '(password: password123)');
        }
      );
    }
  });
});

// --- helpers ---
function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(requiredRole = null) {
  return (req, res, next) => {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      if (requiredRole && payload.role !== requiredRole) return res.status(403).json({ error: 'Forbidden' });
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

// --- Auth routes ---
app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, dob, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
  const hash = bcrypt.hashSync(password, 10);
  db.run(
    `INSERT INTO users (name,email,phone,dob,role,password_hash) VALUES (?,?,?,?,?,?)`,
    [name, email.toLowerCase(), phone || '', dob || '', 'client', hash],
    function (err) {
      if (err) {
        if (String(err).includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
        return res.status(500).json({ error: 'Failed to register' });
      }
      const user = { id: this.lastID, name, role: 'client' };
      const token = signToken(user);
      res.json({ token, user });
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  db.get(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase()], (err, row) => {
    if (err) return res.status(500).json({ error: 'Query failed' });
    if (!row || !bcrypt.compareSync(password, row.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(row);
    res.json({ token, user: { id: row.id, name: row.name, role: row.role } });
  });
});

app.get('/api/me', auth(), (req, res) => {
  db.get(`SELECT id,name,email,phone,dob,role FROM users WHERE id = ?`, [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Lookup failed' });
    res.json(row);
  });
});

// --- Appointment routes (client) ---
app.post('/api/appointments', auth('client'), (req, res) => {
  const { date, time, reason } = req.body || {};
  if (!date || !time || !reason) return res.status(400).json({ error: 'date, time, reason are required' });
  db.run(
    `INSERT INTO appointments (user_id,date,time,reason) VALUES (?,?,?,?)`,
    [req.user.id, date, time, reason],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to book' });
      res.json({ id: this.lastID, user_id: req.user.id, date, time, reason });
    }
  );
});

app.get('/api/appointments', auth('client'), (req, res) => {
  db.all(`SELECT * FROM appointments WHERE user_id = ? ORDER BY date ASC, time ASC`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch' });
    res.json(rows);
  });
});

// --- Staff routes ---
app.get('/api/staff/appointments', auth('staff'), (req, res) => {
  const sql = `SELECT a.id, a.date, a.time, a.reason, u.name as patient_name, u.email as patient_email
               FROM appointments a JOIN users u ON u.id = a.user_id
               ORDER BY a.date ASC, a.time ASC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch' });
    res.json(rows);
  });
});

app.get('/api/staff/patients', auth('staff'), (req, res) => {
  db.all(`SELECT id,name,email,phone,dob FROM users WHERE role = 'client' ORDER BY name ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch' });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`SmileCare backend running on http://localhost:${PORT}`);
});
