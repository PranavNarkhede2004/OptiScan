const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const { validateRecord } = require('../utils/validator');

// GET /api/records
router.get('/', (req, res) => {
  try {
    let { search, shift, status, from, to, limit = 20, offset = 0 } = req.query;
    limit = parseInt(limit);
    offset = parseInt(offset);

    let query = "SELECT * FROM records WHERE status != 'deleted'";
    let countQuery = "SELECT COUNT(*) as total FROM records WHERE status != 'deleted'";
    const params = [];

    if (search) {
      query += ' AND (work_order_number LIKE ? OR employee_number LIKE ? OR machine_number LIKE ?)';
      countQuery += ' AND (work_order_number LIKE ? OR employee_number LIKE ? OR machine_number LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (shift && shift !== 'All') {
      query += ' AND shift = ?';
      countQuery += ' AND shift = ?';
      params.push(shift);
    }

    if (status && status !== 'All') {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
    }

    if (from) {
      query += ' AND date >= ?';
      countQuery += ' AND date >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND date <= ?';
      countQuery += ' AND date <= ?';
      params.push(to);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    const records = db.prepare(query).all(...params, limit, offset);
    const total = db.prepare(countQuery).get(...params).total;

    res.json({ success: true, data: { records, total } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/records/:id
router.get('/:id', (req, res) => {
  try {
    const record = db.prepare(`
      SELECT r.*, u.filename, u.file_type 
      FROM records r
      LEFT JOIN uploads u ON r.upload_id = u.id
      WHERE r.id = ? AND r.status != 'deleted'
    `).get(req.params.id);

    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    // Parse JSON fields
    try { record.confidence_scores = JSON.parse(record.confidence_scores); } catch (e) {}
    try { record.validation_errors = JSON.parse(record.validation_errors); } catch (e) {}
    try { record.validation_warnings = JSON.parse(record.validation_warnings); } catch (e) {}
    try { record.raw_extracted = JSON.parse(record.raw_extracted); } catch (e) {}

    res.json({ success: true, data: record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/records/:id
router.patch('/:id', (req, res) => {
  try {
    const recordId = req.params.id;
    const existing = db.prepare('SELECT * FROM records WHERE id = ?').get(recordId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }

    const updates = req.body;
    
    // Merge existing data with updates
    const mergedData = {
      date: updates.date !== undefined ? updates.date : existing.date,
      shift: updates.shift !== undefined ? updates.shift : existing.shift,
      employee_number: updates.employee_number !== undefined ? updates.employee_number : existing.employee_number,
      operation_code: updates.operation_code !== undefined ? updates.operation_code : existing.operation_code,
      machine_number: updates.machine_number !== undefined ? updates.machine_number : existing.machine_number,
      work_order_number: updates.work_order_number !== undefined ? updates.work_order_number : existing.work_order_number,
      quantity_produced: updates.quantity_produced !== undefined ? updates.quantity_produced : existing.quantity_produced,
      time_taken: updates.time_taken !== undefined ? updates.time_taken : existing.time_taken,
      supervisor: updates.supervisor !== undefined ? updates.supervisor : existing.supervisor,
      product_code: updates.product_code !== undefined ? updates.product_code : existing.product_code,
      remarks: updates.remarks !== undefined ? updates.remarks : existing.remarks,
    };

    let confidenceScores = {};
    try { confidenceScores = JSON.parse(existing.confidence_scores); } catch (e) {}

    // Re-run validation
    const validationResult = validateRecord(mergedData, confidenceScores, recordId);
    
    // Status can be explicitly set by frontend (e.g. "reviewed" or "flagged")
    // If saving and approving, and there are errors, it shouldn't be approved? 
    // We'll allow the frontend to pass status but validate it.
    let newStatus = updates.status || existing.status;
    
    if (newStatus === 'reviewed' && validationResult.errors.length > 0) {
       // If there are errors, it cannot be approved/reviewed
       newStatus = 'flagged'; // or throw error depending on strictness
    }

    const updateQuery = `
      UPDATE records 
      SET 
        date = ?, shift = ?, employee_number = ?, operation_code = ?, machine_number = ?,
        work_order_number = ?, quantity_produced = ?, time_taken = ?, supervisor = ?,
        product_code = ?, remarks = ?, validation_errors = ?, validation_warnings = ?,
        status = ?, updated_at = CURRENT_TIMESTAMP, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.prepare(updateQuery).run(
      mergedData.date, mergedData.shift, mergedData.employee_number, mergedData.operation_code, mergedData.machine_number,
      mergedData.work_order_number, mergedData.quantity_produced, mergedData.time_taken, mergedData.supervisor,
      mergedData.product_code, mergedData.remarks, JSON.stringify(validationResult.errors), JSON.stringify(validationResult.warnings),
      newStatus, recordId
    );

    res.json({ success: true, data: { ...mergedData, ...validationResult, status: newStatus } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/records/:id
router.delete('/:id', (req, res) => {
  try {
    db.prepare("UPDATE records SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
