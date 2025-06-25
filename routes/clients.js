const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth'); // ✅ Use auth middleware

// POST: Add client (only for logged-in users)
router.post('/add', auth, async (req, res) => {
  const { name, contact_number, email } = req.body;
  const created_by = req.user.user_id; // From JWT token

  try {
    await sql.query`
      INSERT INTO Clients (name, contact_number, email, verification_status, lead_status, created_by, created_at)
      VALUES (${name}, ${contact_number}, ${email}, 'Pending', 'New', ${created_by}, GETDATE())
    `;
    res.status(200).json({ message: 'Client added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

// GET: Clients for this user only
router.get('/', auth, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await sql.query`
      SELECT * FROM Clients WHERE created_by = ${userId}
    `;
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('GET /clients error:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// DELETE client (only if created by logged-in user)
router.delete('/delete/:id', auth, async (req, res) => {
  const clientId = req.params.id;
  const userId = req.user.user_id;

  console.log('Delete Request → clientId:', clientId, '| userId:', userId);

  try {
    const result = await sql.query`
      DELETE FROM Clients
      WHERE client_id = ${clientId} AND created_by = ${userId}
    `;

    console.log('Rows affected:', result.rowsAffected[0]);

    if (result.rowsAffected[0] === 0) {
      return res.status(403).json({ error: 'You can only delete your own clients' });
    }

    res.status(200).json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});


module.exports = router;
