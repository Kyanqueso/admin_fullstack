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

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_names(cls, v):
        if not v or not v.strip():
            raise ValueError("Name cannot be empty")

        v = v.strip()

        #  allow spaces and hyphens for compound names like "Raymond Austin" or "Mary-Jane"
        if not re.match(r'^[A-Za-zÀ-ÿ\s\-]+$', v):
            raise ValueError("Name must contain letters only")

        # Prevent single-character names
        if len(v.replace(" ", "").replace("-", "")) < 2:
            raise ValueError("Name is too short")

        return v

    @field_validator("address")
    @classmethod
    def validate_address(cls, v):
        if v is None or v.strip() == "":
            return v

        v = v.strip()

        # Allow letters, numbers, spaces, commas, periods, hyphens, # (for unit/street numbers)
        if not re.match(r'^[A-Za-z0-9À-ÿ\s,.\-#]+$', v):
            raise ValueError("Address must be letters, numbers, and basic punctuation only")

        return v

    @field_validator("viber_number")
    @classmethod
    def validate_contact(cls, v):
        if not v or not v.strip():
            raise ValueError("Contact number cannot be empty")

        v = v.replace(" ", "")

        if v.startswith("+63"):
            v = "0" + v[3:]

        if not re.match(r'^[0-9]{11}$', v):
            raise ValueError("Contact must be 11 digits (e.g. 09171234567)")

        if not v.startswith("09"):
            raise ValueError("Contact number must start with 09 (e.g. 09171234567)")

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

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_names(cls, v):
        if v is None:
            return v

        if not v.strip():
            raise ValueError("Name cannot be empty")

        v = v.strip()

        # allow spaces and hyphens for compound names
        if not re.match(r'^[A-Za-zÀ-ÿ\s\-]+$', v):
            raise ValueError("Name must contain letters only")

        # Prevent single-character names
        if len(v.replace(" ", "").replace("-", "")) < 2:
            raise ValueError("Name is too short")

        return v

    @field_validator("address")
    @classmethod
    def validate_address(cls, v):
        if v is None or v.strip() == "":
            return v

        v = v.strip()

        # Allow letters, numbers, spaces, commas, periods, hyphens, #
        if not re.match(r'^[A-Za-z0-9À-ÿ\s,.\-#]+$', v):
            raise ValueError("Address must be letters, numbers, and basic punctuation only")

        return v

    @field_validator("viber_number")
    @classmethod
    def validate_contact(cls, v):
        if v is None:
            return v

        v = v.replace(" ", "")

        if v.startswith("+63"):
            v = "0" + v[3:]

        if not re.match(r'^[0-9]{11}$', v):
            raise ValueError("Contact must be 11 digits (e.g. 09171234567)")

        if not v.startswith("09"):
            raise ValueError("Contact number must start with 09 (e.g. 09171234567)")

        return v