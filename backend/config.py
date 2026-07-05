import os
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", 8000))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")

# Google Cloud Settings (For Command Center persistence)
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
BIGQUERY_DATASET = os.getenv("BIGQUERY_DATASET", "trustgraph")
STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "trustgraph-reports")
