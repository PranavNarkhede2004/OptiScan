require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { validateRecord } = require('./validator');
const db = require('./db');

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.error("ERROR: GEMINI_API_KEY is not set in .env file");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

async function callGeminiWithRetry(model, contentParts, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(contentParts);
      return result;
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        const waitMs = (i + 1) * 60000; // wait 60s, then 120s
        console.log(`Rate limited. Waiting ${waitMs/1000}s before retry ${i+1}...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      } else {
        throw error;
      }
    }
  }
}

async function extractDataFromDocument(uploadId, filePath, mimeType) {
  try {
    console.log("Processing file:", filePath, "| Type:", mimeType);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }
    console.log("File size:", fs.statSync(filePath).size, "bytes");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let contentParts;

    if (mimeType === 'application/pdf') {
      contentParts = [
        { text: SYSTEM_PROMPT },
        {
          inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType: "application/pdf"
          }
        }
      ];
    } else {
      contentParts = [
        { text: SYSTEM_PROMPT },
        {
          inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType: mimeType
          }
        }
      ];
    }

    const result = await callGeminiWithRetry(model, contentParts);
    const response = await result.response;
    let text = response.text();
    console.log("Gemini raw response:", text.substring(0, 200));
    
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Find JSON object in response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`No valid JSON found in Gemini response. Raw: ${text.substring(0, 300)}`);
    }

    let extractedData;
    try {
      extractedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse failed. Raw text:", text);
      throw new Error(`Failed to parse Gemini output as JSON: ${parseError.message}`);
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
    console.error("=== EXTRACTION FAILED ===");
    console.error("Error message:", error.message);
    console.error("Error status:", error.status);
    console.error("Error details:", JSON.stringify(error, null, 2));
    db.prepare("UPDATE uploads SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(uploadId);
    throw error;
  }
}

module.exports = { extractDataFromDocument };
