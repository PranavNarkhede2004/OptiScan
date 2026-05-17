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

    // === WEIGHTED AVERAGE CONFIDENCE ===
    // Field weights based on operational criticality
    const FIELD_WEIGHTS = {
      work_order_number: 3,   // mission critical — uniquely identifies the job
      quantity_produced: 3,   // mission critical — core production metric
      employee_number: 2,     // required for accountability
      date: 2,                // required for traceability
      shift: 1.5,             // required for shift analytics
      machine_number: 1,      // important for machine tracking
      operation_code: 1,      // important for operation analytics
      time_taken: 0.5,        // optional but useful
    };

    const allRecords = db.prepare(`
      SELECT * FROM records 
      WHERE status != 'deleted' AND confidence_scores IS NOT NULL
    `).all();

    let totalWeightedScore = 0;
    let totalWeight = 0;
    let fieldAccumulator = {};  // track per-field avg for bonus insight

    // initialize field accumulator
    Object.keys(FIELD_WEIGHTS).forEach(f => {
      fieldAccumulator[f] = { sum: 0, count: 0 };
    });

    allRecords.forEach(r => {
      try {
        const scores = JSON.parse(r.confidence_scores);
        Object.entries(FIELD_WEIGHTS).forEach(([field, weight]) => {
          let score = scores[field];
          
          // Penalize missing actual values
          if (r[field] === null || r[field] === undefined || r[field] === '') {
            score = 0;
          }

          if (typeof score === 'number' && score >= 0 && score <= 1) {
            totalWeightedScore += score * weight;
            totalWeight += weight;
            fieldAccumulator[field].sum += score;
            fieldAccumulator[field].count += 1;
          }
        });
      } catch (e) {}
    });

    const avgConfidence = totalWeight > 0
      ? parseFloat((totalWeightedScore / totalWeight).toFixed(3))
      : 0;

    // Per-field average confidence (useful for future dashboard enhancements)
    const fieldConfidenceBreakdown = Object.entries(fieldAccumulator)
      .filter(([, v]) => v.count > 0)
      .map(([field, v]) => ({
        field,
        avg: parseFloat((v.sum / v.count).toFixed(3)),
        weight: FIELD_WEIGHTS[field],
        sample_count: v.count
      }))
      .sort((a, b) => a.avg - b.avg); // lowest confidence fields first

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
        avg_confidence: avgConfidence,
        field_confidence_breakdown: fieldConfidenceBreakdown,
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
