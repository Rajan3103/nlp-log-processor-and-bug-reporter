import os
import json
import re
import google.generativeai as genai
from groq import Groq
import requests
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
import joblib
from dotenv import load_dotenv

load_dotenv(".env.local")

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_PATH = "local_bug_classifier.joblib"

class NLPEngine:
    def __init__(self):
        self.has_gemini = False
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel("gemini-1.5-flash-latest")
            self.has_gemini = True
        
        self.groq_client = None
        if GROQ_API_KEY:
            self.groq_client = Groq(api_key=GROQ_API_KEY)
        
        self.local_model = self.load_local_model()

    def load_local_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                return joblib.load(MODEL_PATH)
            except:
                return None
        return None

    def preprocess_logs(self, content):
        # Remove timestamps like 2024-05-05 12:00:00 or [2024-05-05...]
        content = re.sub(r'\[?\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?Z?\]?', '', content)
        # Remove memory addresses like 0x7ffd5a
        content = re.sub(r'0x[0-9a-fA-F]+', '[ADDR]', content)
        # Remove IP addresses
        content = re.sub(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', '[IP]', content)
        # Remove multiple spaces/newlines
        content = re.sub(r'\n\s*\n', '\n', content)
        return content.strip()

    def train_local_model(self, training_data):
        if not training_data or len(training_data) < 5:
            return False, "Insufficient data (minimum 5 verified reports needed)"

        df = pd.DataFrame(training_data)
        
        cat_pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(stop_words='english')),
            ('clf', RandomForestClassifier(n_estimators=100))
        ])
        
        pri_pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(stop_words='english')),
            ('clf', RandomForestClassifier(n_estimators=100))
        ])

        cat_pipeline.fit(df['description'], df['category'])
        pri_pipeline.fit(df['description'], df['priority'])

        self.local_model = {
            'category_model': cat_pipeline,
            'priority_model': pri_pipeline
        }
        
        joblib.dump(self.local_model, MODEL_PATH)
        return True, "Model trained successfully"

    def predict_local(self, description):
        if not self.local_model:
            return None
        
        cat = self.local_model['category_model'].predict([description])[0]
        pri = self.local_model['priority_model'].predict([description])[0]
        return {"category": cat, "priority": pri}

    def analyze(self, content, file_name, engine="auto"):
        # Preprocess first
        content = self.preprocess_logs(content)
        
        prompt = f"""Analyze the following log content from file "{file_name}". 
        Identify all significant issues and convert them into structured bug reports.
        Return ONLY a JSON object with a "reports" key containing an array of objects.
        
        JSON Schema:
        {{
          "reports": [
            {{
              "description": "Human-readable bug description",
              "category": "Network Error" | "Performance Issue" | "Security Alert" | "System Failure" | "Application Bug",
              "priority": "Low" | "Medium" | "High" | "Critical",
              "source_file": "{file_name}",
              "solution": "A detailed step-by-step recommendation to solve or fix this error"
            }}
          ]
        }}
        
        Content:
        {content[:8000]}"""

        reports = []
        
        if engine == "groq" or (engine == "auto" and self.groq_client):
            reports = self.analyze_with_groq(prompt)
        elif engine == "gemini" or (engine == "auto" and self.has_gemini):
            reports = self.analyze_with_gemini(prompt)
        elif engine == "ollama":
            reports = self.analyze_with_ollama(prompt)
        
        # Post-process with local predictions
        if self.local_model and reports:
            for r in reports:
                local_pred = self.predict_local(r['description'])
                r['local_prediction'] = local_pred
        
        return reports

    def analyze_with_groq(self, prompt):
        if not self.groq_client: 
            raise ValueError("Groq API Key is not configured. Please add GROQ_API_KEY to your .env.local file.")
        try:
            chat_completion = self.groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant",
                response_format={"type": "json_object"}
            )
            return json.loads(chat_completion.choices[0].message.content).get("reports", [])
        except Exception as e:
            print(f"Groq Error: {e}")
            raise ValueError(f"Groq Analysis failed: {str(e)}")

    def analyze_with_gemini(self, prompt):
        if not self.has_gemini: 
            raise ValueError("Gemini API Key is not configured. Please add GEMINI_API_KEY to your .env.local file.")
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text)
            return data.get("reports", []) if isinstance(data, dict) else data
        except Exception as e:
            print(f"Gemini Error: {e}")
            raise ValueError(f"Gemini Analysis failed: {str(e)}")

    def analyze_with_ollama(self, prompt):
        try:
            payload = {
                "model": "phi3", # or llama3
                "prompt": prompt + "\nRespond with JSON only.",
                "stream": False,
                "format": "json"
            }
            response = requests.post(OLLAMA_URL, json=payload, timeout=30)
            data = json.loads(response.json()['response'])
            return data.get("reports", []) if isinstance(data, dict) else data
        except Exception as e:
            print(f"Ollama Error: {e}")
            raise ValueError(f"Local Ollama Analysis failed. Is Ollama running? Error: {str(e)}")

    def process_file_content(self, file_bytes, file_name):
        ext = os.path.splitext(file_name)[1].lower()
        if ext in [".pcap", ".pcapng"]:
            content = "".join([chr(b) if 32 <= b <= 126 else " " for b in file_bytes])
        else:
            try:
                content = file_bytes.decode("utf-8")
            except:
                content = file_bytes.decode("latin-1")
        return content
