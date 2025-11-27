import os
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import declarative_base, sessionmaker

# Load DATABASE_URL from environment (Render)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("❌ DATABASE_URL environment variable is not set!")

# Create engine – safe for Render
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    future=True
)

Base = declarative_base()

# ---- Activity log (already used) ----
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(100))
    input_length = Column(Integer)
    output_length = Column(Integer)
    ip_address = Column(String(200))
    timestamp = Column(String(200))

# ---- NEW: Per-user history table ----
class UserHistory(Base):
    __tablename__ = "user_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100))     # from session["username"]
    action = Column(String(50))        # "summarize", "generate_quiz"
    input_preview = Column(Text)       # original text or summary
    output_preview = Column(Text)      # summary or quiz
    timestamp = Column(String(200))    # ISO string

# Create tables if not exist
Base.metadata.create_all(engine)

# Session factory
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
