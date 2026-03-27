from pydantic import BaseModel, ConfigDict
import re
from pydantic import field_validator

class ClientCreate(BaseModel):
    company_id: int
    first_name: str
    last_name: str
    address: str | None = None
    viber_number: str
    notes: str | None = None

    # ✅ VALIDATORS MUST BE INDENTED INSIDE CLASS

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_names(cls, v):
        if not v or not v.strip():
            raise ValueError("Name cannot be empty")

        if not re.match(r'^[A-Za-z]+$', v):
            raise ValueError("Name must contain letters only")

        return v

    @field_validator("address")
    @classmethod
    def validate_address(cls, v):
        if v is None or v.strip() == "":
            return v

        if not re.match(r'^[A-Za-z0-9\s]+$', v):
            raise ValueError("Address must be letters and numbers only")

        return v

    @field_validator("viber_number")
    @classmethod
    def validate_contact(cls, v):
        if not v or not v.strip():
            raise ValueError("Contact number cannot be empty")

        v = v.replace(" ", "")

        if v.startswith("+63"):
            v = "0" + v[3:]

        if not re.match(r'^[0-9]+$', v):
            raise ValueError("Contact must be numbers only")

        if len(v) != 11:
            raise ValueError("Contact must be 11 digits")

        return v

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, v):
        if v is None:
            return v

        v = v.strip()
        
        return v


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

    # ✅ VALIDATORS INSIDE CLASS

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_names(cls, v):
        if v is None:
            return v

        if not v.strip():
            raise ValueError("Name cannot be empty")

        if not re.match(r'^[A-Za-z]+$', v):
            raise ValueError("Name must contain letters only")

        return v

    @field_validator("address")
    @classmethod
    def validate_address(cls, v):
        if v is None or v.strip() == "":
            return v

        if not re.match(r'^[A-Za-z0-9\s]+$', v):
            raise ValueError("Address must be letters and numbers only")

        return v

    @field_validator("viber_number")
    @classmethod
    def validate_contact(cls, v):
        if v is None:
            return v

        v = v.replace(" ", "")

        if v.startswith("+63"):
            v = "0" + v[3:]

        if not re.match(r'^[0-9]+$', v):
            raise ValueError("Contact must be numbers only")

        if len(v) != 11:
            raise ValueError("Contact must be 11 digits")

        return v