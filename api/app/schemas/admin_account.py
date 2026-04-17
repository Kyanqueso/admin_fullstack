from pydantic import BaseModel, field_validator
import re

EMOJI_PATTERN = re.compile(
    r'[\U0001F600-\U0001F64F'
    r'\U0001F300-\U0001F5FF'
    r'\U0001F680-\U0001F6FF'
    r'\U0001F1E0-\U0001F1FF'
    r'\U00002700-\U000027BF'
    r'\U0001F900-\U0001F9FF'
    r'\U00002600-\U000026FF'
    r'\U0001FA00-\U0001FA6F'
    r'\U0001FA70-\U0001FAFF'
    r'\U00002300-\U000023FF]+',
    flags=re.UNICODE
)

NAME_REGEX = re.compile(r'^[A-Za-zÀ-ÿ\s\-]+$')
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')


class AdminCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Name cannot be empty")
        v = v.strip()
        if EMOJI_PATTERN.search(v):
            raise ValueError("Name must not contain emojis")
        if len(v.replace(" ", "").replace("-", "")) < 2:
            raise ValueError("Name is too short (minimum 2 characters)")
        if len(v) > 30:
            raise ValueError("Name cannot exceed 30 characters")
        if not NAME_REGEX.match(v):
            raise ValueError("Name can only contain letters, spaces, and hyphens")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        v = v.strip().lower()
        if not v:
            raise ValueError("Email is required")
        if not EMAIL_REGEX.match(v):
            raise ValueError("Invalid email format")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class AdminRead(BaseModel):
    uid: str
    first_name: str
    last_name: str
    email: str
