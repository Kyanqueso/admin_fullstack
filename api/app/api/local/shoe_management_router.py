import os
import uuid
import supabase
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/shoe-management", tags=["Shoe Management"])

# 3. Pydantic Models for Validation
class ShoeUpdate(BaseModel):
    model_name: Optional[str] = None
    price: Optional[float] = None

# --- CRUD ENDPOINTS ---

@router.get("/shoes")
def get_shoes():
    """Read all shoes."""
    response = supabase.table("shoe_catalog").select("*").execute()
    return response.data

@router.get("/shoes/{shoe_id}")
def get_shoe(shoe_id: int):
    """Read a single shoe."""
    response = supabase.table("shoe_catalog").select("*").eq("shoe_catalog_id", shoe_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Shoe not found")
    return response.data[0]

@router.post("/shoes/")
async def create_shoe(
    model_name: str = Form(...),
    price: float = Form(...),
    image: UploadFile = File(...)
):
    """Create a shoe with an image upload."""
    
    # A. Upload Image to Supabase Storage
    file_ext = image.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_content = await image.read()
    
    try:
        supabase.storage.from_("shoe_images").upload(
            path=file_name,
            file=file_content,
            file_options={"content-type": image.content_type}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

    # B. Get Public URL
    public_url = supabase.storage.from_("shoe_images").get_public_url(file_name)

    # C. Insert Data into DB
    data = {
        "model_name": model_name,
        "price": price,
        "image_url": public_url
    }
    
    response = supabase.table("shoe_catalog").insert(data).execute()
    return response.data[0]

@router.patch("/shoes/{shoe_id}")
def update_shoe(shoe_id: int, shoe: ShoeUpdate):
    """Update shoe details (Price or Model)."""
    # Filter out None values to only update what was sent
    update_data = {k: v for k, v in shoe.dict().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No data provided to update")

    response = supabase.table("shoe_catalog").update(update_data).eq("shoe_catalog_id", shoe_id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Shoe not found")
        
    return response.data[0]

@router.delete("/shoes/{shoe_id}")
def delete_shoe(shoe_id: int):
    """Delete a shoe."""
    response = supabase.table("shoe_catalog").delete().eq("shoe_catalog_id", shoe_id).execute()
    if not response.data:
         raise HTTPException(status_code=404, detail="Shoe not found")
    return {"message": "Shoe deleted successfully"}