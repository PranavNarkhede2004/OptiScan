require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const uploadsRouter = require('./routes/uploads');
const recordsRouter = require('./routes/records');
const analyticsRouter = require('./routes/analytics');
const db = require('./utils/db'); // ensure DB init runs

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/data/uploads', express.static(path.join(__dirname, 'data/uploads')));

// Routes
app.get('/', (req, res) => {
  res.json({ success: true, message: 'BiztelAI Workflow Backend API is running smoothly!' });
});

app.use('/api/uploads', uploadsRouter);
app.use('/api/records', recordsRouter);
app.use('/api/analytics', analyticsRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
