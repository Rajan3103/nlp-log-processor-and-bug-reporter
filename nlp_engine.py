import os
import json
import re
import google.generativeai as genai
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
import joblib
from dotenv import load_dotenv

load_dotenv(".env.local")

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_PATH = "local_bug_classifier.joblib"

class NLPEngine:
    def __init__(self):
        self.has_gemini = False
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel("gemini-1.5-flash")
            self.has_gemini = True
        
        self.local_model = self.load_local_model()

    def load_local_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                return joblib.load(MODEL_PATH)
            except:
                return None
        return None

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

    def analyze_with_gemini(self, content, file_name):
        if not self.has_gemini:
            return []

        prompt = f"""Analyze the following log content from file "{file_name}". 
        Identify all significant issues and convert them into structured bug reports.
        Return ONLY a JSON array of objects.
        
        JSON Schema:
        [
          {{
            "description": "Human-readable bug description",
            "category": "Network Error" | "Performance Issue" | "Security Alert" | "System Failure" | "Application Bug",
            "priority": "Low" | "Medium" | "High" | "Critical",
            "source_file": "{file_name}"
          }}
        ]
        
        Content (truncated):
        {content[:10000]}"""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            text = response.text
            reports = json.loads(text)
            
            if self.local_model:
                for r in reports:
                    local_pred = self.predict_local(r['description'])
                    r['local_prediction'] = local_pred

            return reports
        except Exception as e:
            print(f"Gemini Analysis Error: {e}")
            # Fallback to a very simple heuristic or empty list
            return []

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
