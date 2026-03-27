from pydantic import BaseModel, ConfigDict
from datetime import datetime
from decimal import Decimal
 
 
class CompletedOrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
 
    id: int
    client_id: int
    order_date: datetime
    model: str
    size: Decimal
    material: str
    color: str
    mold: str
    heel_size: str
    heel_type: str
    has_platform: bool
    has_slingback: bool
    has_buckle: bool
    quantity: int
    price: Decimal
    original_order_id: int | None = None