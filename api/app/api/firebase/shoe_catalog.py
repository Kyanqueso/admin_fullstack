from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
from app.config.firebase_config import db, bucket
from uuid import uuid4
from typing import Optional

router = APIRouter(
    prefix="/shoe-catalog",
    tags=["Shoe Catalog"]
)

COLLECTION = "items"
ALLOWED_UPDATE_FIELDS = {"name", "description", "imageUrl"}


@router.post("/items")
async def create_item(
    name: str = Form(...),
    description: str = Form(...),
    image: UploadFile = File(...),  # REQUIRED
):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid image type")

    try:
        blob = bucket.blob(f"images/{uuid4()}-{image.filename}")
        blob.upload_from_file(
            image.file,
            content_type=image.content_type
        )
        blob.make_public()
        image_url = blob.public_url
    except Exception:
        raise HTTPException(status_code=500, detail="Image upload failed")

    doc_ref = db.collection(COLLECTION).document()
    doc_ref.set({
        "name": name,
        "description": description,
        "imageUrl": image_url
    })

    return {"id": doc_ref.id}


# ---------------------------
# READ ALL
# ---------------------------
@router.get("/items")
def get_items(limit: int = 20):
    docs = db.collection(COLLECTION).limit(limit).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


# ---------------------------
# READ ONE
# ---------------------------
@router.get("/items/{item_id}")
def get_item(item_id: str):
    doc = db.collection(COLLECTION).document(item_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Item not found")

    return {"id": doc.id, **doc.to_dict()}


# ---------------------------
# PATCH (Partial Update)
# ---------------------------
@router.patch("/items/{item_id}")
async def update_item(
    item_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
):
    doc_ref = db.collection(COLLECTION).document(item_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = {}

    if name is not None:
        update_data["name"] = name

    if description is not None:
        update_data["description"] = description

    if image:
        if not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Invalid image type")

        try:
            blob = bucket.blob(f"images/{uuid4()}-{image.filename}")
            blob.upload_from_file(
                image.file,
                content_type=image.content_type
            )
            blob.make_public()
            update_data["imageUrl"] = blob.public_url
        except Exception:
            raise HTTPException(status_code=500, detail="Image upload failed")

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    doc_ref.update(update_data)
    return {"success": True}


# ---------------------------
# DELETE
# ---------------------------
@router.delete("/items/{item_id}")
def delete_item(item_id: str):
    doc_ref = db.collection(COLLECTION).document(item_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Item not found")

    try:
        doc_ref.delete()
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Failed to delete item"
        )

    return {"success": True}