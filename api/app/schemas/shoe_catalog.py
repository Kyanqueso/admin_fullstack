from pydantic import BaseModel, ConfigDict
from typing import Optional


class ShoeCatalogCreate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: str
    price: float
    image_url: Optional[str] = None


class ShoeCatalogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
    id: int
    model_name: str
    price: float
    image_url: Optional[str] = None


class ShoeCatalogUpdate(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    model_name: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
