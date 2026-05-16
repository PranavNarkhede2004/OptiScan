const db = require('./db');

const validateRecord = (data, confidenceScores, currentRecordId = null) => {
  const errors = [];
  const warnings = [];

  // ERRORS
  if (!data.date) {
    errors.push("Date is required");
  }
  
  if (!['A', 'B', 'C', 'Night'].includes(data.shift)) {
    errors.push("Invalid shift value. Must be A, B, C, or Night");
  }
  
  if (!data.employee_number) {
    errors.push("Employee number is required");
  }
  
  if (!data.work_order_number) {
    errors.push("Work order number is required");
  } else {
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

  if (data.machine_number && !/^MCH-\d{3,6}$/i.test(data.machine_number)) {
    errors.push("Invalid machine number format. Expected MCH-XXXX");
  }

  if (data.operation_code && !/^OPC-\d{3,6}$/i.test(data.operation_code)) {
    errors.push("Invalid operation code format. Expected OPC-XXXX");
  }

  if (data.quantity_produced !== null && data.quantity_produced !== undefined) {
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

  if (!data.supervisor) {
    warnings.push("Supervisor not recorded");
  }

  if (!data.product_code) {
    warnings.push("Product code not recorded");
  }

  if (confidenceScores) {
    for (const [field, score] of Object.entries(confidenceScores)) {
      if (score < 0.5) {
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
