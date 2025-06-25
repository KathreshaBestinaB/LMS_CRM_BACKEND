const express = require('express');
const router = express.Router();
const sql = require('mssql');
const auth = require('../middleware/auth');

// ✅ Add follow-up
router.post('/add', async (req, res) => {
  const { client_id, type, notes, outcome, scheduled_date, next_followup_date, created_by } = req.body;

  try {
    await sql.query`
      INSERT INTO FollowUps 
      (client_id, type, notes, outcome, scheduled_date, next_followup_date, created_by) 
      VALUES 
      (${client_id}, ${type}, ${notes}, ${outcome}, ${scheduled_date}, ${next_followup_date}, ${created_by})
    `;
    res.status(200).json({ message: 'Follow-up added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error while adding follow-up' });
  }
});


// ✅ View all follow-ups by this logged-in salesman
router.get('/all', auth, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await sql.query`
      SELECT 
        f.followup_id,
        f.type,
        f.notes,
        f.outcome,
        f.scheduled_date,
        f.next_followup_date,
        c.name AS client_name
      FROM FollowUps f
      JOIN Clients c ON f.client_id = c.client_id
      WHERE f.created_by = ${userId}
      ORDER BY f.scheduled_date DESC
    `;

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Fetch follow-ups error:', err);
    res.status(500).json({ error: 'Failed to load follow-ups' });
  }
});



// ✅ View completed follow-ups only
router.get('/completed', auth, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await sql.query`
      SELECT 
        f.followup_id,
        f.type,
        f.notes,
        f.outcome,
        f.scheduled_date,
        f.next_followup_date,
        f.status,
        c.name AS client_name
      FROM FollowUps f
      JOIN Clients c ON f.client_id = c.client_id
      WHERE f.created_by = ${userId} AND f.status = 'Completed'
      ORDER BY f.scheduled_date DESC
    `;
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Fetch completed follow-ups error:', err);
    res.status(500).json({ error: 'Failed to load completed follow-ups' });
  }
});

// ✅ Mark follow-up as completed
router.patch('/done/:id', auth, async (req, res) => {
  const followupId = req.params.id;
  const userId = req.user.user_id;

  try {
    const result = await sql.query`
      UPDATE FollowUps
      SET status = 'Completed'
      WHERE followup_id = ${followupId} AND created_by = ${userId}
    `;

    if (result.rowsAffected[0] === 0) {
      return res.status(403).json({ error: 'Unauthorized or not found' });
    }

    res.status(200).json({ message: 'Follow-up marked as completed' });
  } catch (err) {
    console.error('Mark as done error:', err);
    res.status(500).json({ error: 'Failed to mark follow-up as done' });
  }
});


// ✅ Delete follow-up
router.delete('/delete/:id', auth, async (req, res) => {
  const followupId = parseInt(req.params.id);
  const userId = req.user.user_id;

  try {
    const result = await sql.query`
      DELETE FROM FollowUps
      WHERE followup_id = ${followupId} AND created_by = ${userId}
    `;

    if (result.rowsAffected[0] === 0) {
      return res.status(403).json({ error: 'Unauthorized delete or not found' });
    }

    res.status(200).json({ message: 'Follow-up deleted successfully' });
  } catch (err) {
    console.error('Delete follow-up error:', err);
    res.status(500).json({ error: 'Failed to delete follow-up' });
  }
});

// ✅ Get follow-ups for a specific client
router.get('/:client_id', async (req, res) => {
  const clientId = parseInt(req.params.client_id);
  if (isNaN(clientId)) return res.status(400).json({ error: 'Invalid client ID' });

  try {
    const result = await sql.query`
      SELECT * FROM FollowUps WHERE client_id = ${clientId} ORDER BY scheduled_date DESC
    `;
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching follow-ups' });
  }
});


// Clear completed
router.delete('/completed/clear', auth, async (req, res) => {
  try {
    await sql.query`
      DELETE FROM FollowUps
      WHERE created_by = ${req.user.user_id} AND status = 'Completed'
    `;
    res.status(200).json({ message: 'Cleared completed follow-ups' });
  } catch (err) {
    res.status(500).json({ error: 'Clear failed' });
  }
});

// List salesmen (Manager only)
router.get('/salesmen', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Unauthorized' });

  try {
    const result = await sql.query`
      SELECT user_id, name, email FROM Users WHERE role = 'salesman'
    `;
    res.status(200).json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load salesmen' });
  }
});

// Add salesman
router.post('/add-salesman', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Unauthorized' });

  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await sql.query`
      INSERT INTO Users (name, email, password, role)
      VALUES (${name}, ${email}, ${hashedPassword}, 'salesman')
    `;
    res.status(201).json({ message: 'Salesman added' });
  } catch (err) {
    res.status(500).json({ error: 'Add failed' });
  }
});

// Delete salesman
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Unauthorized' });

  try {
    await sql.query`
      DELETE FROM Users WHERE user_id = ${req.params.id} AND role = 'salesman'
    `;
    res.status(200).json({ message: 'Salesman deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
