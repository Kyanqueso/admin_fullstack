from pydantic import BaseModel, ConfigDict
from typing import Optional
from decimal import Decimal


class ShoeCatalogCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: str
    price: Decimal
    image_url: Optional[str] = None


class ShoeCatalogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
    id: int
    model_name: str
    price: Decimal
    image_url: Optional[str] = None


class ShoeCatalogUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: Optional[str] = None
    price: Optional[Decimal] = None
    image_url: Optional[str] = None
