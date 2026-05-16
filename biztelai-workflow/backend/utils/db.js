const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

// Initialize schema
db.pragma('journal_mode = WAL');

// Uploads table
db.exec(`
  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    filename TEXT,
    original_name TEXT,
    file_path TEXT,
    file_type TEXT,
    file_size INTEGER,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Records table
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    upload_id TEXT,
    date TEXT,
    shift TEXT,
    employee_number TEXT,
    operation_code TEXT,
    machine_number TEXT,
    work_order_number TEXT,
    quantity_produced INTEGER,
    time_taken REAL,
    supervisor TEXT,
    product_code TEXT,
    remarks TEXT,
    raw_extracted TEXT,
    confidence_scores TEXT,
    validation_errors TEXT,
    validation_warnings TEXT,
    status TEXT,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(upload_id) REFERENCES uploads(id)
  )
`);

module.exports = db;
