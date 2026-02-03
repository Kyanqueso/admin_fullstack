# File: alembic/env.py
from logging.config import fileConfig
import os
import sys
from dotenv import load_dotenv

from sqlalchemy import engine_from_config, pool
from alembic import context

# -------------------------------------------------
# 1. Load .env variables immediately
# -------------------------------------------------
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("❌ DATABASE_URL is not set in .env")

# -------------------------------------------------
# 2. Add your project root to system path
# -------------------------------------------------
# This is required so python can find 'app.db.base'
sys.path.append(os.getcwd())

# Import your models here so Alembic can see them
# Ensure 'app.db.base' and 'app.db.models' actually exist in your folder structure
from app.db.base import Base 
from app.db.models import * # noqa: F401

config = context.config

# -------------------------------------------------
# 3. OVERRIDE alembic.ini URL with .env URL
# -------------------------------------------------
# This is the most robust way to ensure the correct URL is used
config.set_main_option("sqlalchemy.url", DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in offline mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in online mode."""
    # engine_from_config will now use the overridden URL from step 3
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()