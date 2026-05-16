const express = require('express');
const router = express.Router();
const db = require('../utils/db');

// GET /api/analytics/summary
router.get('/summary', (req, res) => {
  try {
    const totalUploads = db.prepare('SELECT COUNT(*) as count FROM uploads').get().count;
    const totalRecords = db.prepare("SELECT COUNT(*) as count FROM records WHERE status != 'deleted'").get().count;
    
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM records 
      WHERE status != 'deleted' 
      GROUP BY status
    `).all();

    let reviewedCount = 0;
    let flaggedCount = 0;
    const statusBreakdown = statusCounts.map(row => {
      if (row.status === 'reviewed') reviewedCount = row.count;
      if (row.status === 'flagged') flaggedCount = row.count;
      return { status: row.status, count: row.count };
    });

    const validationFailures = db.prepare(`
      SELECT COUNT(*) as count FROM records 
      WHERE status != 'deleted' AND json_array_length(validation_errors) > 0
    `).get().count;

    // Average confidence calculation
    const records = db.prepare("SELECT confidence_scores FROM records WHERE status != 'deleted' AND confidence_scores IS NOT NULL").all();
    let totalScore = 0;
    let scoreCount = 0;
    
    records.forEach(r => {
      try {
        const scores = JSON.parse(r.confidence_scores);
        Object.values(scores).forEach(score => {
          if (typeof score === 'number') {
            totalScore += score;
            scoreCount++;
          }
        });
      } catch (e) {}
    });
    
    const avgConfidence = scoreCount > 0 ? (totalScore / scoreCount).toFixed(2) : 0;

    // Shift quantity chart
    const shiftQtyRaw = db.prepare(`
      SELECT shift, SUM(quantity_produced) as total_qty, COUNT(*) as count
      FROM records
      WHERE status != 'deleted' AND shift IS NOT NULL
      GROUP BY shift
    `).all();
    
    // Ensure we have A, B, C, Night even if 0
    const shifts = ['A', 'B', 'C', 'Night'];
    const shiftQty = shifts.map(s => {
      const found = shiftQtyRaw.find(row => row.shift === s);
      return {
        shift: s,
        total_qty: found ? found.total_qty || 0 : 0,
        count: found ? found.count : 0
      };
    });

    // Machine counts
    const machineCounts = db.prepare(`
      SELECT machine_number, COUNT(*) as count
      FROM records
      WHERE status != 'deleted' AND machine_number IS NOT NULL AND machine_number != ''
      GROUP BY machine_number
      ORDER BY count DESC
      LIMIT 10
    `).all();

    // Uploads per day (last 30 days)
    const uploadsPerDay = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM uploads
      WHERE created_at >= date('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all();

    res.json({
      success: true,
      data: {
        total_uploads: totalUploads,
        total_records: totalRecords,
        reviewed_count: reviewedCount,
        flagged_count: flaggedCount,
        validation_failure_count: validationFailures,
        avg_confidence: parseFloat(avgConfidence),
        shift_qty: shiftQty,
        machine_counts: machineCounts,
        uploads_per_day: uploadsPerDay,
        status_breakdown: statusBreakdown
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
