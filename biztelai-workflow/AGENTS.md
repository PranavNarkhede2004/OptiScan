# AI Agents Reflection - AGENTS.md

## AI Tools Used
- **Antigravity (Google DeepMind)**: Assisted as an autonomous pair-programmer agent to architect, scaffold, and implement the full-stack web application.

## How AI Was Used
1.  **Architecture & Planning**: The agent was used to plan the directory structure, identify missing requirements (e.g., how to display PDFs smoothly on the frontend), and propose a solid schema.
2.  **Code Generation**: Complete code generation was performed for both backend logic (Express routes, SQLite schemas, Multer, Gemini SDK integration) and frontend logic (React components, Recharts dashboard, Tailwind styling).
3.  **Prompting Strategy**: The system prompt for Gemini OCR extraction was perfectly tailored and hardcoded into the backend `gemini.js` script to ensure stable JSON returns. 

## Areas Where AI Helped Most
- **Rapid Scaffolding**: Generating the boilerplate for Vite, Express, and Tailwind in seconds.
- **Complex UI Logic**: Writing the intricate `History.jsx` table with debounced search, multiple filters, and pagination without manual trial and error.
- **Validation Engine**: Translating the business rules (errors/warnings) directly into a pure JS `validator.js` engine that easily synced with the frontend UI components.

## Areas Requiring Manual Intervention
- Deciding on the PDF handling strategy. Since Gemini 1.5 Flash natively supports PDF document types, the explicit extraction of a PDF page to a JPG via `poppler` (which requires complex OS-level setups on Windows) was bypassed in favor of native multimodal PDF support for improved reliability and simpler installation.
- Ensuring the database schema perfectly matched the payload expected from the Gemini API and ensuring JSON parsing was robust and fault-tolerant.
