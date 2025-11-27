import os
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

# Load DATABASE_URL from environment (Render)
DATABASE_URL = os.getenv("DATABASE_URL")

# Ensure the URL exists
if not DATABASE_URL:
    raise RuntimeError("❌ DATABASE_URL environment variable is not set!")

# Create engine – with safe connection handling for Render
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,       # 🟢 Prevents broken connections
    future=True               # 🟢 SQLAlchemy 2.0 behavior
)

# Base class
Base = declarative_base()

# Activity Log Table
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(100))
    input_length = Column(Integer)
    output_length = Column(Integer)
    ip_address = Column(String(200))
    timestamp = Column(String(200))

# Create database tables (important for first run)
Base.metadata.create_all(engine)

# Session for queries
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
