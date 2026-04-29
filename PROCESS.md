# Project Working Process (Python Edition)

This document outlines the workflow and architectural process for the **Python-powered** NLP Log Processor and Bug Identifier.

## 1. Data Ingestion
- Users upload log files (`.log`, `.txt`, `.csv`, `.pcap`, `.pcapng`) via the **Processor** tab.
- Text-based files are read directly, while PCAP files are converted using a byte-mapping vectorization layer.

## 2. NLP Analysis (Nexus Pipeline)
- Uploaded content is sent to the **Gemini AI engine** (`nlp_engine.py`).
- The AI performs semantic analysis to identify, categorize, and prioritize issues.
- **Local Fallback**: A local **Random Forest** classifier (Scikit-Learn) provides supplementary classification based on verified historical data.

## 3. Database Persistence
- Analyzed bug reports are stored in a local SQLite database (`logs.db`).
- The schema includes a `verified` flag, which allows reports to be used as training data for the local model.

## 4. Intelligence Dashboard
- Built with **Streamlit** for high-performance visualization.
- **Priority Map**: Real-time distribution analysis via Plotly.
- **Category Mix**: Donut chart showing architectural issue balance.
- **Training Center**: Dedicated interface for fine-tuning the local classification model.

## 5. Registry Management
- Interactive registry for auditing and verifying bug reports.
- Users can search, delete, and **verify** reports to feed the "Training Center".

## 6. System Architecture
- **Backend/Logic**: Python 3.x with `nlp_engine.py` and `database.py`.
- **Frontend**: Streamlit with custom CSS glassmorphism and Plotly.
- **AI Core**: Google Gemini 1.5 Flash (via `google-genai`).
- **ML Layer**: Scikit-Learn (TF-IDF Vectorizer + Random Forest).
