<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5f8fe868-8740-4762-9a82-1c7358c862e0

## NLP Log Processor and Bug Identifier (FastAPI + React)

An intelligent log analysis system powered by a Python backend and a React frontend.

## Architecture
- **Backend**: FastAPI (`main.py`)
- **Frontend**: React + Vite + Tailwind CSS (`client/`)
- **AI Core**: Gemini 1.5 Flash + Scikit-Learn

## Getting Started

### 1. Setup Backend
```bash
pip install -r requirements.txt
python main.py
```
Ensure your `.env.local` contains `GEMINI_API_KEY`.

### 2. Setup Frontend
```bash
cd client
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.
