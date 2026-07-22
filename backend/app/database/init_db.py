"""Database initialization: run migrations and seed from SQL dump if empty."""
import os
import logging
from sqlalchemy import text
from alembic.config import Config
from alembic import command
from app.database.session import SessionLocal, engine

logger = logging.getLogger("courseforge")

def run_migrations():
    """Runs Alembic migrations programmatically to update the schema."""
    logger.info("Running database migrations via Alembic...")
    try:
        ini_path = "alembic.ini"
        if not os.path.exists(ini_path):
            ini_path = os.path.join(os.path.dirname(__file__), "..", "..", "alembic.ini")
            ini_path = os.path.abspath(ini_path)
            
        logger.info(f"Using Alembic configuration from: {ini_path}")
        alembic_cfg = Config(ini_path)
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations successfully applied.")
    except Exception as e:
        logger.exception("Failed to run database migrations: %s", e)

def seed_database():
    """Seeds the database if it is currently empty."""
    db = SessionLocal()
    try:
        # Check if table exists and count courses
        course_count = db.execute(text("SELECT COUNT(*) FROM courses")).scalar()
        if course_count > 0:
            logger.info("Database already seeded (courses count: %d). Skipping seeding.", course_count)
            return
    except Exception as e:
        logger.info("Courses table check failed or doesn't exist. Running migrations first...")
        run_migrations()
        try:
            course_count = db.execute(text("SELECT COUNT(*) FROM courses")).scalar()
            if course_count > 0:
                logger.info("Database already seeded. Skipping seeding.")
                return
        except Exception as e2:
            logger.error("Failed to check courses table count after migrations: %s", e2)
            return
    finally:
        db.close()

    # If we reached here, courses count is 0, so we seed the DB.
    logger.info("No courses found. Starting database seeding...")
    
    # Locate courseforge_production_seed.sql
    seed_file = "courseforge_production_seed.sql"
    if not os.path.exists(seed_file):
        seed_file = os.path.join(os.path.dirname(__file__), "..", "..", "courseforge_production_seed.sql")
        seed_file = os.path.abspath(seed_file)
        
    if not os.path.exists(seed_file):
        logger.error("Database seed SQL file not found at %s. Skipping.", seed_file)
        return
        
    logger.info("Loading SQL seed from: %s", seed_file)
    try:
        with open(seed_file, "r", encoding="utf-8") as f:
            sql_content = f.read()
            
        # Execute using raw DBAPI connection to support multi-statements safely
        raw_conn = engine.raw_connection()
        try:
            with raw_conn.cursor() as cursor:
                cursor.execute(sql_content)
            raw_conn.commit()
            logger.info("Database seeding successfully completed!")
        except Exception as e:
            logger.exception("Failed to execute SQL seed content: %s", e)
            raw_conn.rollback()
        finally:
            raw_conn.close()
    except Exception as e:
        logger.exception("Error during database seeding: %s", e)

def initialize_database():
    """Main entrypoint to run migrations and seed database if necessary."""
    # 1. Run migrations first to ensure database schema is up-to-date
    run_migrations()
    # 2. Seed database
    seed_database()
