const express = require('express');
const router = express.Router();
const Advertisement = require('../models/Advertisement');

// GET /api/ads?position=sidebar
router.get('/', async (req, res) => {
  try {
    const { position } = req.query;
    const query = { isActive: true };
    if (position) query.position = position;
    const ads = await Advertisement.find(query).limit(5);
    res.json(ads);
  } catch (err) {
    res.status(500).json({ message: 'Error' });
  }
});

// POST /api/ads/:id/click
router.post('/:id/click', async (req, res) => {
  try {
    await Advertisement.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

module.exports = router;
