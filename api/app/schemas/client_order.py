import re
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from decimal import Decimal


EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002700-\U000027BF"
    "\U0001F900-\U0001F9FF"
    "\U00002600-\U000026FF"
    "\U0001FA00-\U0001FA6F"
    "\U0001FA70-\U0001FAFF"
    "\U00002300-\U000023FF"
    "]+",
    re.UNICODE
)

# Allowed materials and heel/mold types — must match dropdown options
VALID_MATERIALS = {"Helga", "Tanya", "Snake", "Patent"}
VALID_HEEL_TYPES = {"Cuban", "Putol", "Wedge", "Cone", "Contessa"}
VALID_MOLD_TYPES = {"None", "Ferage", "Milani", "Liz", "Square"}
VALID_HEEL_SIZES = {f"h{i}" for i in range(1, 11)}

# Valid sizes: must end in .0 or .5
VALID_SIZE_PATTERN = re.compile(r"^\d+(\.[05])?$")


def _no_emoji(value: str, field_name: str) -> str:
    if EMOJI_PATTERN.search(value):
        raise ValueError(f"{field_name} must not contain emojis or special symbols.")
    return value


def _validate_size(v: Decimal) -> Decimal:
    # Must be positive
    if v <= 0:
        raise ValueError("Size must be a positive number.")
    # Decimal must end in .0 or .5
    remainder = v % Decimal("0.5")
    if remainder != 0:
        raise ValueError("Size must be in increments of 0.5 (e.g. 5.0, 5.5, 6.0).")
    return v



class ClientOrderCreate(BaseModel):
    client_id: int
    order_date: datetime | None = None
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

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Model is required.")
        if len(v) > 64:
            raise ValueError("Style/Model must not exceed 64 characters.")
        return _no_emoji(v, "Style/Model")

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Color is required.")
        if len(v) > 32:
            raise ValueError("Color must not exceed 32 characters.")
        return _no_emoji(v, "Color")

    @field_validator("material")
    @classmethod
    def validate_material(cls, v: str) -> str:
        if v not in VALID_MATERIALS:
            raise ValueError(f"Material must be one of: {', '.join(sorted(VALID_MATERIALS))}.")
        return v

    @field_validator("heel_type")
    @classmethod
    def validate_heel_type(cls, v: str) -> str:
        if v not in VALID_HEEL_TYPES:
            raise ValueError(f"Heel type must be one of: {', '.join(sorted(VALID_HEEL_TYPES))}.")
        return v

    @field_validator("mold")
    @classmethod
    def validate_mold(cls, v: str) -> str:
        if v not in VALID_MOLD_TYPES:
            raise ValueError(f"Mold type must be one of: {', '.join(sorted(VALID_MOLD_TYPES))}.")
        return v

    @field_validator("size")
    @classmethod
    def validate_size(cls, v: Decimal) -> Decimal:
        return _validate_size(v)

    @field_validator("heel_size")
    @classmethod
    def validate_heel_size(cls, v: str) -> str:
        if v not in VALID_HEEL_SIZES:
            raise ValueError("Heel size must be between h1 and h10.")
        return v

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity must be at least 1.")
        if v > 10000:
            raise ValueError("Quantity seems too large. Please double-check.")
        return v

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Price must be a positive number.")
        return v

    @field_validator("client_id")
    @classmethod
    def validate_client_id(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("A valid customer must be selected.")
        return v


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
    heel_size: str
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
    heel_size: str | None = None
    heel_type: str | None = None
    has_platform: bool | None = None
    has_slingback: bool | None = None
    has_buckle: bool | None = None
    quantity: int | None = None
    price: Decimal | None = None

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Style/Model cannot be empty.")
        if len(v) > 64:
            raise ValueError("Style/Model must not exceed 64 characters.")
        return _no_emoji(v, "Style/Model")

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Color cannot be empty.")
        if len(v) > 32:
            raise ValueError("Color must not exceed 32 characters.")
        return _no_emoji(v, "Color")

    @field_validator("material")
    @classmethod
    def validate_material(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in VALID_MATERIALS:
            raise ValueError(f"Material must be one of: {', '.join(sorted(VALID_MATERIALS))}.")
        return v

    @field_validator("heel_type")
    @classmethod
    def validate_heel_type(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in VALID_HEEL_TYPES:
            raise ValueError(f"Heel type must be one of: {', '.join(sorted(VALID_HEEL_TYPES))}.")
        return v

    @field_validator("mold")
    @classmethod
    def validate_mold(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in VALID_MOLD_TYPES:
            raise ValueError(f"Mold type must be one of: {', '.join(sorted(VALID_MOLD_TYPES))}.")
        return v

    @field_validator("size")
    @classmethod
    def validate_size(cls, v: Decimal | None) -> Decimal | None:
        if v is None:
            return v
        return _validate_size(v)

    @field_validator("heel_size")
    @classmethod
    def validate_heel_size(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip().lower()
        if v not in VALID_HEEL_SIZES:
            raise ValueError("Heel size must be between h1 and h10.")
        return v

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v <= 0:
            raise ValueError("Quantity must be at least 1.")
        if v > 10000:
            raise ValueError("Quantity seems too large. Please double-check.")
        return v

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: Decimal | None) -> Decimal | None:
        if v is None:
            return v

        if v < Decimal("0.01"):
            raise ValueError("Price must be at least 0.01.")

        if v.as_tuple().exponent < -2:
            raise ValueError("Price cannot have more than 2 decimal places.")

        return v    