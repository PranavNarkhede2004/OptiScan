# OptiFlow - BiztelAI Workflow Automation System

OptiFlow is an AI-powered full-stack web application designed to digitize handwritten and semi-structured manufacturing operational documents. It extracts structured data using Google's Gemini Vision API, applies business rule validation, allows human-in-the-loop review and correction, and provides a comprehensive analytics dashboard.

## Tech Stack

| Layer        | Technology                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| **Frontend** | React (Vite), TailwindCSS, React Router v6, Recharts, Lucide React         |
| **Backend**  | Node.js, Express, Multer (file uploads)                                    |
| **Database** | SQLite (via `better-sqlite3`)                                              |
| **AI / OCR** | Google Gemini Vision API (`gemini-1.5-flash`) via `@google/generative-ai`  |

## Architecture Diagram

```text
+-------------------+       HTTP/REST       +----------------------+
|                   |   POST /api/uploads   |                      |
|   Frontend (UI)   | --------------------> |    Backend (Node)    |
|   React + Vite    |                       |    Express Server    |
|   TailwindCSS     | <-------------------- |                      |
|                   |   GET /api/records    +----------------------+
+-------------------+                               |   |
         |                                          |   | SQLite
         |                                          v   v
         |                        +-----------------------+
         |                        | better-sqlite3 DB     |
         |                        | (uploads, records)    |
         |                        +-----------------------+
         |                                          |
         |                                          | API Call
         |                                          v
         |                        +-----------------------+
         +----------------------> | Google Gemini API     |
            View Document         | (gemini-1.5-flash)    |
                                  +-----------------------+
```

## Setup Instructions

### Prerequisites
- Node.js v18+ installed on your machine.

### 1. Clone & Install Dependencies
Open a terminal in the root of this project and run:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Variables
In the `backend/` directory, copy `.env.example` to `.env`:

```bash
cd backend
cp .env.example .env
```

Open `.env` and add your Gemini API Key:
```env
PORT=5000
GEMINI_API_KEY=your_actual_gemini_api_key_here
```
*(You can get a free Gemini API key from [Google AI Studio](https://aistudio.google.com))*

### 3. Run the Application
Open two terminal windows/tabs.

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```
*The backend will run on `http://localhost:5000` and automatically create the SQLite database in `backend/data/database.sqlite`.*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
*The frontend will run on `http://localhost:5173`. Open this URL in your browser.*

## Assumptions and Tradeoffs
- **PDF Handling**: `gemini-1.5-flash` natively supports direct PDF ingestion (via `application/pdf` inline data) up to certain page limits. Rather than implementing complex system-level dependencies like `poppler` to slice PDFs into images, the backend sends the PDF document directly to Gemini, leveraging its native multimodal capabilities.
- **SQLite**: Chose `better-sqlite3` for fast, synchronous, zero-configuration database access, matching the requirement constraints. 
- **Soft Deletes**: Deleting a record sets its status to `deleted` rather than removing the row from the database to preserve historical analytics if needed.
- **Frontend Proxy**: Vite is configured to proxy `/api` and `/data/uploads` requests to the backend `localhost:5000` to avoid CORS issues during local development.

## Known Limitations
- Gemini's OCR extraction speed and formatting accuracy may vary depending on the legibility of handwriting.
- The free tier of Gemini API is rate-limited; rapid, concurrent uploads may result in 429 errors.
- Files are stored on the local disk (`backend/data/uploads`). For production scaling, a cloud bucket (like S3) would be necessary.
