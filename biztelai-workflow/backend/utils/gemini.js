const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { validateRecord } = require('./validator');
const db = require('./db');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key_if_not_set');

const SYSTEM_PROMPT = `You are an OCR and data extraction system for manufacturing operational documents.
Extract ALL visible information from this handwritten or semi-structured operational document.

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "date": "YYYY-MM-DD or null",
  "shift": "A or B or C or Night or null",
  "employee_number": "string or null",
  "operation_code": "string or null",
  "machine_number": "string or null",
  "work_order_number": "string or null",
  "quantity_produced": number or null,
  "time_taken": number or null,
  "supervisor": "string or null",
  "product_code": "string or null",
  "remarks": "string or null",
  "confidence_scores": {
    "date": 0.0-1.0,
    "shift": 0.0-1.0,
    "employee_number": 0.0-1.0,
    "operation_code": 0.0-1.0,
    "machine_number": 0.0-1.0,
    "work_order_number": 0.0-1.0,
    "quantity_produced": 0.0-1.0,
    "time_taken": 0.0-1.0,
    "supervisor": 0.0-1.0,
    "product_code": 0.0-1.0,
    "remarks": 0.0-1.0
  }
}

Confidence scoring rules:
- 0.9–1.0: clearly printed, high certainty
- 0.7–0.89: legible handwriting, reasonable certainty
- 0.5–0.69: partially legible, some guessing
- 0.0–0.49: illegible or absent, low certainty`;

function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType
    },
  };
}

async function extractDataFromDocument(uploadId, filePath, mimeType) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imagePart = fileToGenerativePart(filePath, mimeType);

    const result = await model.generateContent([SYSTEM_PROMPT, imagePart]);
    const response = await result.response;
    let text = response.text();
    
    // Clean up potential markdown formatting from Gemini
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let extractedData;
    try {
      extractedData = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      throw new Error("Failed to parse Gemini output as JSON");
    }

    // Run validation
    const { errors, warnings, status } = validateRecord(extractedData, extractedData.confidence_scores);

    const recordId = require('crypto').randomUUID();
    
    // Default initial review status
    let recordStatus = 'pending_review';

    // Insert record
    const insertRecord = db.prepare(`
      INSERT INTO records (
        id, upload_id, date, shift, employee_number, operation_code, machine_number, 
        work_order_number, quantity_produced, time_taken, supervisor, product_code, 
        remarks, raw_extracted, confidence_scores, validation_errors, validation_warnings, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRecord.run(
      recordId,
      uploadId,
      extractedData.date || null,
      extractedData.shift || null,
      extractedData.employee_number || null,
      extractedData.operation_code || null,
      extractedData.machine_number || null,
      extractedData.work_order_number || null,
      extractedData.quantity_produced || null,
      extractedData.time_taken || null,
      extractedData.supervisor || null,
      extractedData.product_code || null,
      extractedData.remarks || null,
      JSON.stringify(extractedData),
      JSON.stringify(extractedData.confidence_scores || {}),
      JSON.stringify(errors),
      JSON.stringify(warnings),
      recordStatus
    );

    // Update upload status
    db.prepare("UPDATE uploads SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(uploadId);

    return { recordId, extractedData };
  } catch (error) {
    console.error("Extraction error:", error);
    db.prepare("UPDATE uploads SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(uploadId);
    throw error;
  }
}

module.exports = { extractDataFromDocument };
