import asyncio

from app.core.database import AsyncSessionLocal, Base, engine
from app.services.catalog_publisher import publish_catalog
from app.services.seed_loader import load_seed_data


async def main():
    print("Connecting to database and creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

    print("Populating seed shows and episodes...")
    async with AsyncSessionLocal() as session:
        await load_seed_data(session)
        print("Publishing initial catalogue...")
        res = await publish_catalog(session, triggered_by="manual_seed")
        print(
            f"Catalog published: {res.get('status')} ({res.get('shows_count')} shows)"
        )

    print("\n========================================================")
    print("SUCCESS: All seed data loaded into your PostgreSQL database!")
    print("========================================================")


if __name__ == "__main__":
    asyncio.run(main())
