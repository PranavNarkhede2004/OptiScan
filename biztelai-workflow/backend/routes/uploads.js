const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const db = require('../utils/db');
const crypto = require('crypto');
const { extractDataFromDocument } = require('../utils/gemini');

// POST /api/uploads
router.post('/', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const uploadId = crypto.randomUUID();
    
    // Insert into uploads table
    db.prepare(`
      INSERT INTO uploads (id, filename, original_name, file_path, file_type, file_size, status)
      VALUES (?, ?, ?, ?, ?, ?, 'processing')
    `).run(
      uploadId,
      req.file.filename,
      req.file.originalname,
      req.file.path,
      req.file.mimetype,
      req.file.size
    );

    // Trigger async extraction
    extractDataFromDocument(uploadId, req.file.path, req.file.mimetype)
      .catch(err => console.error("Async extraction failed:", err));

    res.status(202).json({
      success: true,
      data: {
        uploadId,
        status: 'processing'
      },
      message: 'Upload successful, extraction started'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/uploads
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const uploads = db.prepare(`
      SELECT u.*, r.id as record_id 
      FROM uploads u
      LEFT JOIN records r ON u.id = r.upload_id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.json({ success: true, data: uploads });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
