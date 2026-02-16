from pydantic import BaseModel, ConfigDict
from typing import Optional
from decimal import Decimal


class ShoeImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    image_url: str
    display_order: int


class ShoeCatalogCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: str
    price: Decimal


class ShoeCatalogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
    id: int
    model_name: str
    price: Decimal
    images: list[ShoeImageRead] = []


class ShoeCatalogUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: Optional[str] = None
    price: Optional[Decimal] = None
