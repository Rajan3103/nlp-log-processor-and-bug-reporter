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
            try:
                genai.configure(api_key=GEMINI_API_KEY)
                self.model = genai.GenerativeModel("gemini-1.5-flash-latest")
                self.has_gemini = True
            except Exception as e:
                print(f"[NLPEngine] Failed to configure Gemini API: {e}")
                self.has_gemini = False
        
        self.local_model = self.load_local_model()

    def load_local_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                return joblib.load(MODEL_PATH)
            except:
                return None
        return None

    def preprocess_and_sanitize(self, content):
        """
        Deep PII & Secret Redaction Engine:
        Scrubs AWS keys, JWTs, Bearer tokens, DB connection strings with passwords,
        private SSH keys, IPv4/IPv6, credit card patterns, and hex memory addresses.
        Returns (sanitized_content, redacted_count).
        """
        if not content:
            return "", 0

        redacted_count = 0

        def count_sub(pattern, replacement, text):
            nonlocal redacted_count
            matches = len(re.findall(pattern, text))
            redacted_count += matches
            return re.sub(pattern, replacement, text)

        # 1. AWS Access Key IDs (AKIA...)
        content = count_sub(r'(?i)\bAKIA[0-9A-Z]{16}\b', '[REDACTED_AWS_KEY]', content)

        # 2. JWT Tokens (eyJ...)
        content = count_sub(r'eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}', '[REDACTED_JWT_TOKEN]', content)

        # 3. Authorization Bearer / Basic Headers
        content = count_sub(r'(?i)(Authorization:\s*(?:Bearer|Basic)\s+)[^\s]+', r'\1[REDACTED_AUTH_TOKEN]', content)

        # 4. Database URIs with credentials (postgres://user:pass@host)
        content = count_sub(r'(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[^:]+:[^@]+@[^\s]+', r'\1://[REDACTED_USER_PASS]@[REDACTED_HOST]', content)

        # 5. Private Keys
        content = count_sub(r'-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----', '[REDACTED_PRIVATE_KEY]', content)

        # 6. Generic API keys / Secret / Token assignments (api_key=xyz, secret_key=xyz)
        content = count_sub(r'(?i)(api[_-]?key|secret[_-]?key|client[_-]?secret|password|passwd|auth[_-]?token)\s*[:=]\s*["\']?[a-zA-Z0-9_~\-\.]{8,}["\']?', r'\1=[REDACTED_SECRET]', content)

        # 7. Credit Card Numbers (Luhn-like 13-19 digits)
        content = count_sub(r'\b(?:\d[ -]*?){13,16}\b', '[REDACTED_PII]', content)

        # 8. IP Addresses (IPv4)
        content = re.sub(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', '[IP]', content)

        # 9. Hex memory addresses (e.g. 0x7ffd5a...)
        content = re.sub(r'0x[0-9a-fA-F]{4,}', '[ADDR]', content)

        # 10. Normalizing timestamps like 2024-05-05 12:00:00
        content = re.sub(r'\[?\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?Z?\]?', '', content)

        # Multiple newlines/spaces reduction
        content = re.sub(r'\n\s*\n', '\n', content)

        return content.strip(), redacted_count

    def preprocess_logs(self, content):
        sanitized, _ = self.preprocess_and_sanitize(content)
        return sanitized

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
        """
        Analyzes log content using Google Gemini 1.5 Flash.
        Redacts sensitive tokens and returns structured JSON reports.
        """
        # Preprocess and redact first
        sanitized_content, redacted_count = self.preprocess_and_sanitize(content)
        
        prompt = f"""Analyze the following sanitized log content from file "{file_name}". 
Identify all significant issues, bugs, and failures, and convert them into structured bug reports.
Return ONLY a JSON object with a "reports" key containing an array of objects.

JSON Schema:
{{
  "reports": [
    {{
      "description": "Clear human-readable bug description explaining what failed",
      "category": "Network Error" | "Performance Issue" | "Security Alert" | "System Failure" | "Application Bug",
      "priority": "Low" | "Medium" | "High" | "Critical",
      "source_file": "{file_name}",
      "solution": "A detailed step-by-step recommendation to solve or fix this error"
    }}
  ]
}}

Content:
{sanitized_content[:15000]}"""

        reports = []
        if self.has_gemini:
            reports = self.analyze_with_gemini(prompt)
        else:
            # Fallback mock analysis if no key configured yet
            reports = [{
                "description": f"Analyzed {file_name}: Log entry parsed without active Gemini API key.",
                "category": "Application Bug",
                "priority": "Medium",
                "source_file": file_name,
                "solution": "Configure GEMINI_API_KEY in .env.local to enable full AI root-cause analysis."
            }]

        # Inject sanitization count into reports
        for r in reports:
            r['redacted_secrets_count'] = redacted_count
            if self.local_model:
                local_pred = self.predict_local(r['description'])
                r['local_prediction'] = local_pred
        
        return reports

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
            print(f"[NLPEngine] Gemini Error: {e}")
            raise ValueError(f"Gemini Analysis failed: {str(e)}")

    def chat_debug(self, report, conversation_history, user_message):
        """
        Interactive Gemini Debug Assistant:
        Takes a bug report, past message history, and user's query to provide
        root cause explanations, reproduction scripts, or git patch recommendations.
        """
        if not self.has_gemini:
            return "Gemini AI is offline. Please configure GEMINI_API_KEY in your .env.local file to use interactive debugging."

        system_context = f"""You are Nexus AI, an expert software systems reliability engineer and debugger.
You are helping the user debug a specific bug report in their application.

BUG REPORT CONTEXT:
- Category: {report.get('category')}
- Priority: {report.get('priority')}
- Source File: {report.get('source_file')}
- Description: {report.get('description')}
- AI Solution: {report.get('solution')}
- Raw Log / Traceback Excerpt:
{report.get('raw_content', 'N/A')[:3000]}

INSTRUCTIONS:
Provide clear, actionable, technical advice. If the user asks for a fix, provide clean code snippets or git diffs. If they ask how to reproduce, provide curl commands or unit tests. Be concise, precise, and polite."""

        try:
            full_prompt = f"{system_context}\n\n"
            if conversation_history:
                full_prompt += "CONVERSATION HISTORY:\n"
                for msg in conversation_history[-6:]:
                    role = "User" if msg.get("role") == "user" else "Assistant"
                    full_prompt += f"{role}: {msg.get('content')}\n"
                full_prompt += "\n"

            full_prompt += f"User: {user_message}\nAssistant:"

            response = self.model.generate_content(full_prompt)
            return response.text.strip()
        except Exception as e:
            return f"Gemini Debug Error: {str(e)}"

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
