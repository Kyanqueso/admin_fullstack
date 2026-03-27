import re
from pydantic import BaseModel, ConfigDict, field_validator


# Only letters (any language/unicode), numbers, spaces, hyphens, apostrophes, ampersands, and periods
VALID_NAME_PATTERN = re.compile(r"^[\w\s\-'&.]+$", re.UNICODE)

# Detect emoji and other symbol blocks
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # emoticons
    "\U0001F300-\U0001F5FF"  # symbols & pictographs
    "\U0001F680-\U0001F6FF"  # transport & map
    "\U0001F1E0-\U0001F1FF"  # flags
    "\U00002700-\U000027BF"  # dingbats
    "\U0001F900-\U0001F9FF"  # supplemental symbols
    "\U00002600-\U000026FF"  # misc symbols
    "\U0001FA00-\U0001FA6F"  # chess, etc.
    "\U0001FA70-\U0001FAFF"  # more symbols
    "\U00002300-\U000023FF"  # misc technical
    "]+",
    re.UNICODE
)


def validate_name_field(v: str) -> str:
    v = v.strip()

    if not v:
        raise ValueError("Company name cannot be empty.")

    if len(v) < 2:
        raise ValueError("Company name must be at least 2 characters.")

    if len(v) > 32:
        raise ValueError("Company name must not exceed 32 characters.")

    if EMOJI_PATTERN.search(v):
        raise ValueError("Company name must not contain emojis or symbols.")

    if not VALID_NAME_PATTERN.match(v):
        raise ValueError(
            "Company name may only contain letters, numbers, spaces, "
            "hyphens (-), apostrophes ('), ampersands (&), and periods (.)."
        )

    return v


class CompanyCreate(BaseModel):
    name: str
    address: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return validate_name_field(v)


class CompanyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    address: str | None = None


class CompanyUpdate(BaseModel):
    name: str | None = None
    address: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return validate_name_field(v)