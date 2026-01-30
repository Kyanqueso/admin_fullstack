from pydantic import BaseModel, ConfigDict
from datetime import datetime


class ClientOrderGet(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    client_order_id: int
    client_id: int
    order_date: datetime
    model: str
    size: float
    material: str
    mold: str
    color: str
    heel_size: str
    heel_type: str
    has_platform: bool
    has_slingback: bool
    has_buckle: bool
    quantity: int
    price: float


class ClientOrderCreate(BaseModel):
    client_id: int
    model: str
    size: float
    material: str
    mold: str
    color: str
    heel_size: str
    heel_type: str
    has_platform: bool
    has_slingback: bool
    has_buckle: bool
    quantity: int
    price: float


class ClientOrderUpdate(BaseModel):
    model: str | None = None
    size: float | None = None
    material: str | None = None
    mold: str | None = None
    color: str | None = None
    heel_size: str | None = None
    heel_type: str | None = None
    has_platform: bool | None = None
    has_slingback: bool | None = None
    has_buckle: bool | None = None
    quantity: int | None = None
    price: float | None = None


