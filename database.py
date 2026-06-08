import hashlib
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

_supabase_client: Client = None

def get_supabase() -> Client:
    """Return a singleton Supabase client."""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client

def hash_password(password: str) -> str:
    """SHA-256 hash for passwords (same as SQLite version for compatibility)."""
    return hashlib.sha256(password.encode()).hexdigest()

def init_db():
    """No-op: tables are created via SQL in the Supabase dashboard."""
    pass
