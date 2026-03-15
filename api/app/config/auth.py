import os
import sys
import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
from dotenv import load_dotenv

load_dotenv()

# Get Supabase URL
SUPABASE_URL = os.getenv("SUPABASE_URL")
if not SUPABASE_URL:
    print("FATAL: SUPABASE_URL is missing from .env", file=sys.stderr)
    raise ValueError("FATAL: SUPABASE_URL is missing from .env file!")

# Construct JWKS URL
# Remove trailing slash from SUPABASE_URL if present to avoid double slash
base_url = SUPABASE_URL.rstrip("/")
JWKS_URL = f"{base_url}/auth/v1/.well-known/jwks.json"

print(f"DEBUG: Using JWKS URL: {JWKS_URL}", file=sys.stderr)

security = HTTPBearer()

# Module-level singleton — caches JWKS keys instead of re-fetching on every request
jwks_client = PyJWKClient(JWKS_URL)

def get_current_user(auth: HTTPBearer = Depends(security)):
    token = auth.credentials

    print(f"\n--- NEW AUTH REQUEST ---", file=sys.stderr)

    try:
        header = jwt.get_unverified_header(token)

        # Fetch the correct key
        # This connects to Supabase to find the Public Key matching the 'kid' in the header
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Verify
        payload = jwt.decode(
            token,
            key=signing_key.key,
            algorithms=["ES256", "RS256", "HS256"], # Try all common algs
            audience="authenticated",
            leeway=60,
            options={"verify_exp": True}
        )
        
        print("Success! Payload decoded.")
        return payload

    except jwt.PyJWKClientError as e:
        print(f"CRITICAL: JWKS Client Error (Could not fetch keys): {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail="Could not verify token source.")
    except jwt.ExpiredSignatureError:
        print("ERROR: Token Expired", file=sys.stderr)
        raise HTTPException(status_code=401, detail="Token has expired.")
    except jwt.InvalidAudienceError:
        print("ERROR: Invalid Audience", file=sys.stderr)
        raise HTTPException(status_code=401, detail="Invalid audience.")
    except Exception as e:
        print(f"CRITICAL UNKNOWN ERROR: {type(e).__name__}: {e}", file=sys.stderr)
        # print stack trace to see line number
        import traceback
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(status_code=401, detail="Authentication failed")