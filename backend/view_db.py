import asyncio

from sqlalchemy import text

from app.core.database import engine


async def view_data():
    async with engine.connect() as conn:
        print("\n" + "=" * 60)
        print("         🐘 POSTGRESQL DATABASE SUMMARY (peblo_db)")
        print("=" * 60)

        # Shows
        res = await conn.execute(
            text(
                "SELECT id, title, section, category, status FROM shows ORDER BY title;"
            )
        )
        shows = res.fetchall()
        print(f"\n🎬 SHOWS ({len(shows)} total):")
        print("-" * 60)
        for s in shows:
            print(f" • [{s.status.upper()}] {s.title}  |  {s.category}  |  {s.section}")

        # Episodes Count
        res = await conn.execute(text("SELECT count(*) FROM episodes;"))
        ep_count = res.scalar()
        print(f"\n📺 TOTAL EPISODES IN DATABASE: {ep_count}")

        # Publish Runs
        res = await conn.execute(
            text(
                "SELECT run_id, status, shows_count, episodes_count, created_at FROM publish_runs ORDER BY created_at DESC LIMIT 5;"
            )
        )
        runs = res.fetchall()
        print(f"\n🚀 RECENT PUBLISH RUNS ({len(runs)}):")
        print("-" * 60)
        for r in runs:
            print(
                f" • Run: {r.run_id} | Status: {r.status} | {r.shows_count} shows | {r.episodes_count} eps"
            )
        print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(view_data())
