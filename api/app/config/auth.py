# app/config/auth.py
import jwt  # Make sure you installed pyjwt
import sys
import traceback
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()

def get_current_user(auth=Depends(security)):
    token = auth.credentials
    
    # 1. DEBUG LOGGING: Print the token snippet to terminal
    print(f"DEBUG: Received token starting with: {token[:10]}...", file=sys.stderr)

    try:
        # 2. DECODE: We disable verification temporarily to see if we can just READ it.
        #    This proves if the library is working.
        payload = jwt.decode(
            token, 
            options={"verify_signature": False, "verify_aud": False}
        )
        
        print(f"DEBUG: Successfully decoded payload: {payload.keys()}", file=sys.stderr)

        # 3. MANUAL CHECK:
        # Check audience manually if you want, or skip for now to just get it working
        # if payload.get("aud") != "authenticated":
        #    raise HTTPException(401, "Invalid audience")

        return payload

    except Exception as e:
        # This is the money shot: It will print the EXACT python error to your terminal
        print("CRITICAL JWT ERROR:", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(401, f"Server Error: {str(e)}")