from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from decimal import Decimal
from datetime import datetime
import re


#  Allowed image MIME types by magic bytes (checked server-side)
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Emoji detection regex
EMOJI_PATTERN = re.compile(
    r'[\U0001F600-\U0001F64F'
    r'\U0001F300-\U0001F5FF'
    r'\U0001F680-\U0001F6FF'
    r'\U0001F1E0-\U0001F1FF'
    r'\U00002700-\U000027BF'
    r'\U0001F900-\U0001F9FF'
    r'\U00002600-\U000026FF'
    r'\U0001FA00-\U0001FA6F'
    r'\U0001FA70-\U0001FAFF'
    r'\U00002300-\U000023FF]+',
    flags=re.UNICODE
)


class ShoeImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    image_url: str
    display_order: int


class ShoeCatalogCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: str
    price: Decimal

    @field_validator("model_name")
    @classmethod
    def validate_model_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Shoe name cannot be empty")

        v = v.strip()

        # Reject emojis
        if EMOJI_PATTERN.search(v):
            raise ValueError("Shoe name must not contain emojis")

        # Only allow letters, numbers, spaces, hyphens, apostrophes, and parentheses
        #  prevents SQL injection and special characters
        if not re.match(r'^[A-Za-z0-9À-ÿ\s\-\'().&,]+$', v):
            raise ValueError("Shoe name contains invalid characters")

        # Minimum 2 non-space characters
        if len(v.replace(" ", "")) < 2:
            raise ValueError("Shoe name is too short (minimum 2 characters)")

        # Maximum 50 characters
        if len(v) > 50:
            raise ValueError("Shoe name must not exceed 50 characters")

        return v

    @field_validator("price")
    @classmethod
    def validate_price(cls, v):
        if v is None:
            raise ValueError("Price is required")

        if v < Decimal("1"):
            raise ValueError("Price must be 1 or greater")

        if v > Decimal("9999999.99"):
            raise ValueError("Price is too large")

        # Max 2 decimal places
        if v.as_tuple().exponent < -2:
            raise ValueError("Price cannot have more than 2 decimal places")

        return v


class ShoeCatalogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
    id: int
    model_name: str
    price: Decimal
    is_visible: bool = True
    date_added: datetime
    images: list[ShoeImageRead] = []


class ShoeCatalogUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: Optional[str] = None
    price: Optional[Decimal] = None

    @field_validator("model_name")
    @classmethod
    def validate_model_name(cls, v):
        if v is None:
            return v

        if not v.strip():
            raise ValueError("Shoe name cannot be empty")

        v = v.strip()

        # Reject emojis
        if EMOJI_PATTERN.search(v):
            raise ValueError("Shoe name must not contain emojis")

        # Only allow letters, numbers, spaces, hyphens, apostrophes, and parentheses
        if not re.match(r'^[A-Za-z0-9À-ÿ\s\-\'().&,]+$', v):
            raise ValueError("Shoe name contains invalid characters")

        # Minimum 2 non-space characters
        if len(v.replace(" ", "")) < 2:
            raise ValueError("Shoe name is too short (minimum 2 characters)")

        # Maximum 50 characters
        if len(v) > 50:
            raise ValueError("Shoe name must not exceed 50 characters")

        return v

    @field_validator("price")
    @classmethod
    def validate_price(cls, v):
        if v is None:
            return v

        if v < Decimal("1"):
            raise ValueError("Price must be 1 or greater")

        if v > Decimal("9999999.99"):
            raise ValueError("Price is too large")

        # Max 2 decimal places
        if v.as_tuple().exponent < -2:
            raise ValueError("Price cannot have more than 2 decimal places")

        return v