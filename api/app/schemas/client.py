from pydantic import BaseModel, ConfigDict


class ClientCreate(BaseModel):
    company_id: int
    first_name: str
    last_name: str
    address: str | None = None
    viber_number: str
    notes: str | None = None


class ClientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    company_id: int
    first_name: str
    last_name: str
    address: str | None = None
    viber_number: str
    notes: str | None = None


class ClientUpdate(BaseModel):
    company_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    address: str | None = None
    viber_number: str | None = None
    notes: str | None = None
