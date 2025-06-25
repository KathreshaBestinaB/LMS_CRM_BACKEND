const express = require('express');
const router = express.Router();
const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// Register User (Manager or Salesman)
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await sql.query`
      INSERT INTO Users (name, email, password, role)
      VALUES (${name}, ${email}, ${hashedPassword}, ${role})
    `;

    res.status(200).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  

  try {
    const result = await sql.query`SELECT * FROM Users WHERE email = ${email}`;
    const user = result.recordset[0];

    if (!user) return res.status(401).json({ error: 'Invalid email' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      'your_jwt_secret',
      { expiresIn: '1h' }
    );

    res.status(200).json({ token, role: user.role, user_id: user.user_id });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});
module.exports = router;
