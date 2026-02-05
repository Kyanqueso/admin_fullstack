from pydantic import BaseModel, ConfigDict


class CompanyCreate(BaseModel):
    name: str
    address: str | None = None


class CompanyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    address: str | None = None


class CompanyUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
