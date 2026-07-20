import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.core.security import get_password_hash
from app.core.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL.replace('db:5432', 'localhost:5433'))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        hashed_password = get_password_hash('password123')
        await session.execute(
            text("""
            INSERT INTO users (email, name, hashed_password, is_active, is_superuser, created_at) 
            VALUES ('demo@courseforge.dev', 'Demo User', :hp, true, false, NOW())
            """)
            , {'hp': hashed_password}
        )
        await session.commit()
        print('Demo user created!')

asyncio.run(main())
