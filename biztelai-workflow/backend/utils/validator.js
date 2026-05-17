const db = require('./db');

const validateRecord = (data, confidenceScores, currentRecordId = null) => {
  const errors = [];
  const warnings = [];

  // ERRORS
  if (!data.date) {
    errors.push("Date is required");
  } else {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || isNaN(new Date(data.date).getTime())) {
      errors.push("Invalid date format. Expected YYYY-MM-DD");
    }
  }
  
  if (!['A', 'B', 'C', 'Night'].includes(data.shift)) {
    errors.push("Invalid shift value. Must be A, B, C, or Night");
  }
  
  if (!data.employee_number) {
    errors.push("Employee number is required");
  } else if (!/^BT\d{4}$/i.test(data.employee_number)) {
    errors.push("Invalid employee number format. Expected BTXXXX");
  }
  
  if (!data.work_order_number) {
    errors.push("Work order number is required");
  } else {
    if (!/^\d{6}$/.test(data.work_order_number)) {
      errors.push("Invalid work order format. Expected 6 digits");
    }
    // Check for duplicate work_order_number
    let query = 'SELECT id FROM records WHERE work_order_number = ?';
    let params = [data.work_order_number];
    if (currentRecordId) {
      query += ' AND id != ?';
      params.push(currentRecordId);
    }
    const duplicate = db.prepare(query).get(...params);
    if (duplicate) {
      errors.push("Duplicate work order number");
    }
  }



  if (data.machine_number && !/^MC-\d{3}$/i.test(data.machine_number)) {
    errors.push("Invalid machine number format. Expected MC-XXX");
  }

  if (data.quantity_produced === null || data.quantity_produced === undefined || data.quantity_produced === '') {
    errors.push("Quantity produced is required");
  } else {
    const qty = Number(data.quantity_produced);
    if (isNaN(qty) || qty <= 0) {
      errors.push("Quantity produced must be greater than 0");
    }
  }

  // WARNINGS
  if (data.quantity_produced !== null && data.quantity_produced !== undefined) {
    const qty = Number(data.quantity_produced);
    if (qty > 10000) {
      warnings.push("Unusually high quantity — please verify");
    }
  }

  if (data.time_taken !== null && data.time_taken !== undefined) {
    const time = Number(data.time_taken);
    if (time > 24) {
      warnings.push("Time taken exceeds 24 hours — please verify");
    }
    if (time <= 0) {
      warnings.push("Time taken must be positive");
    }
  }



  if (confidenceScores) {
    const requiredFields = ['date', 'shift', 'employee_number', 'work_order_number', 'quantity_produced'];
    for (const [field, score] of Object.entries(confidenceScores)) {
      if (score < 0.5 && requiredFields.includes(field)) {
        warnings.push(`Low confidence on field: ${field}`);
      }
    }
  }

  let status = "valid";
  if (errors.length > 0) {
    status = "has_errors";
  } else if (warnings.length > 0) {
    status = "has_warnings";
  }

  return { errors, warnings, status };
};

module.exports = { validateRecord };
