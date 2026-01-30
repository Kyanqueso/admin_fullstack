from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class ClientGet(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    client_id: int = Field(alias="id")
    company_id: int
    first_name: str
    last_name: str
    role: str
    address: str | None = None
    viber_number: str | None = None
    notes: str | None = None
    updated_at: datetime


class ClientCreate(BaseModel):
    company_id: int
    first_name: str
    last_name: str
    address: str | None = None
    viber_number: str | None = None
    notes: str | None = None


class ClientUpdate(BaseModel):
    company_id: int
    first_name: str | None = None
    last_name: str | None = None
    address: str | None = None
    viber_number: str | None = None
    notes: str | None = None


