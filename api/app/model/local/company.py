from pydantic import BaseModel, ConfigDict

class CompanyGet(BaseModel):
    model_config = ConfigDict(from_attributes=True)  # This enables model_validate()

    company_id: int
    name: str
    address: str | None = None

class CompanyCreate(BaseModel):
    name: str
    address: str | None = None

class CompanyUpdate(BaseModel):
    name: str
    address: str | None = None

