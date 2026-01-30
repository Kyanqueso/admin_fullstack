import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, storage

# Load environment variables from .env
load_dotenv()

# Read variables
cred_path = os.getenv("FIREBASE_KEY_PATH")
project_id = os.getenv("FIREBASE_PROJECT_ID")
storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET")

# Initialize Firebase
cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred, {
    "projectId": project_id,
    "storageBucket": storage_bucket
})

# Firebase services
db = firestore.client()
bucket = storage.bucket()
