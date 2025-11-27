import os
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

# Create engine
engine = create_engine(DATABASE_URL, echo=False)

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

# Create tables
Base.metadata.create_all(engine)

# Session
SessionLocal = sessionmaker(bind=engine)
