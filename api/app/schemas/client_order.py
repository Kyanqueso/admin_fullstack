from pydantic import BaseModel, ConfigDict
from datetime import datetime
from decimal import Decimal


class ClientOrderCreate(BaseModel):
    client_id: int
    order_date: datetime | None = None
    model: str
    size: Decimal
    material: str
    color: str
    mold: str
    heel_size: Decimal
    heel_type: str
    has_platform: bool
    has_slingback: bool
    has_buckle: bool
    quantity: int
    price: Decimal


class ClientOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    order_date: datetime
    model: str
    size: Decimal
    material: str
    color: str
    mold: str
    heel_size: Decimal
    heel_type: str
    has_platform: bool
    has_slingback: bool
    has_buckle: bool
    quantity: int
    price: Decimal
    is_zero_balance: bool


class ClientOrderUpdate(BaseModel):
    client_id: int | None = None
    order_date: datetime | None = None
    model: str | None = None
    size: Decimal | None = None
    material: str | None = None
    color: str | None = None
    mold: str | None = None
    heel_size: Decimal | None = None
    heel_type: str | None = None
    has_platform: bool | None = None
    has_slingback: bool | None = None
    has_buckle: bool | None = None
    quantity: int | None = None
    price: Decimal | None = None
