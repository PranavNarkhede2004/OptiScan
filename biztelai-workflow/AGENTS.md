# AI Agents Reflection - AGENTS.md

## AI Tools Used
- **Antigravity (Google DeepMind)**: Served as the primary autonomous pair-programmer to architect, scaffold, and implement the application.
- **Gemini 3.1 Pro / 2.5 Flash**: Utilized Gemini 3.1 Pro as the model powering the AI assistant during development and Gemini 2.5 Flash as the core OCR extraction engine (`gemini-2.5-flash`) within the application itself.
- **Cursor / Claude / GPT**: Used in conjunction with autonomous agents for targeted code refactoring, inline lint error resolution, and fast contextual queries.

## How AI Tools Were Used During Development
1.  **Architecture & Planning**: AI agents were used to plan the initial directory structure, identify missing requirements, and propose a solid database schema.
2.  **Code Generation & Scaffolding**: Complete code generation was performed for both backend logic (Express routes, SQLite schemas, Multer integrations) and frontend interfaces (React components, Recharts dashboard, Tailwind styling).
3.  **Refactoring & Iteration**: Used AI for refactoring monolithic components into smaller, reusable UI pieces and quickly fixing cross-origin (CORS) or package-related issues.

## Prompting / Debugging Workflows
- **Iterative Prompting**: Started with high-level architecture prompts, followed by hyper-specific component prompts (e.g., "Add debounced search and pagination to this table component").
- **System Prompting**: For the Gemini OCR integration, explicit system prompting with JSON schema definitions was embedded into the backend to ensure the AI returned strictly formatted data.
- **Debugging Workflow**: When encountering backend errors or React warnings, stack traces and file contexts were provided to the AI to quickly identify root causes and generate patch diffs, streamlining the debugging process.

## Areas Where AI Helped Most
- **Rapid Scaffolding**: Generating the entire boilerplate setup for Vite, Express, and Tailwind CSS within minutes.
- **Complex UI Logic & State Management**: Writing the intricate frontend tables with debounced search, multiple filters, sorting, and pagination without manual trial and error.
- **Validation Engine**: Translating business rules directly into a pure JS validation engine that synced smoothly with frontend state.

## Areas Requiring Manual Intervention
- **PDF Handling Strategy**: The AI initially suggested complex OS-level PDF tools (like Poppler). Manual intervention was required to pivot the design toward using Gemini 2.5 Flash's native PDF support, avoiding messy environment setups.
- **API Payload Alignment**: Fine-tuning the database schema to perfectly match the JSON payload outputted by the Gemini API. Manual adjustments were needed to ensure the parsing was robust, fault-tolerant, and handled missing keys gracefully.
- **Environment Configuration**: Managing the `.env` variables and proxy settings between the Vite frontend and Express backend to ensure seamless local development.
