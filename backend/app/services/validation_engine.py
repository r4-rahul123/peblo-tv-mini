from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import Season, Show
from app.schemas.schemas import ValidationIssue, ValidationReport


async def generate_validation_report(db: AsyncSession) -> ValidationReport:
    """
    Inspects all shows, seasons, and episodes to discover anything blocking publication.
    Gives non-technical editors actionable descriptions on how to fix each issue.
    """
    result = await db.execute(
        select(Show)
        .options(selectinload(Show.seasons).selectinload(Season.episodes))
        .order_by(Show.title)
    )
    shows = result.scalars().all()

    issues_by_show: dict[str, list[ValidationIssue]] = {}
    general_issues: list[ValidationIssue] = []
    total_blockers = 0
    total_warnings = 0
    published_shows_count = 0
    published_episodes_count = 0

    content_group_lang_tracker: dict[tuple, list[str]] = {}

    for show in shows:
        show_issues: list[ValidationIssue] = []
        is_show_published = show.status == "published"
        if is_show_published:
            published_shows_count += 1

        # Check 1: Published show must have a section
        if is_show_published and not show.section:
            show_issues.append(
                ValidationIssue(
                    entity_type="show",
                    entity_id=show.id,
                    entity_title=show.title,
                    severity="BLOCKER",
                    field="section",
                    message="Published show is missing a Section assignment.",
                    action_required="Assign a valid Section (e.g. 'Top Picks', 'Animated Stories') in the Show edit form.",
                )
            )
            total_blockers += 1

        # Check 2: Published show must have a poster artwork
        if is_show_published and not show.poster_url:
            show_issues.append(
                ValidationIssue(
                    entity_type="show",
                    entity_id=show.id,
                    entity_title=show.title,
                    severity="BLOCKER",
                    field="poster_url",
                    message="Published show is missing a 2:3 Poster artwork.",
                    action_required="Upload a 2:3 portrait poster (~600x900px, <200KB) in the Show edit form.",
                )
            )
            total_blockers += 1

        # Check 3: Published show must have a banner artwork
        if is_show_published and not show.banner_url:
            show_issues.append(
                ValidationIssue(
                    entity_type="show",
                    entity_id=show.id,
                    entity_title=show.title,
                    severity="BLOCKER",
                    field="banner_url",
                    message="Published show is missing a 16:9 Banner artwork.",
                    action_required="Upload a 16:9 banner (~1280x720px, <200KB) in the Show edit form.",
                )
            )
            total_blockers += 1

        # Check Seasons & Episodes
        for season in show.seasons:
            for ep in season.episodes:
                is_ep_published = ep.status == "published"
                if is_ep_published and is_show_published:
                    published_episodes_count += 1

                # Check unique (content_group, language)
                key = (ep.content_group, ep.language)
                if key in content_group_lang_tracker:
                    content_group_lang_tracker[key].append(ep.id)
                    show_issues.append(
                        ValidationIssue(
                            entity_type="episode",
                            entity_id=ep.id,
                            entity_title=f"{ep.title} (Ep {ep.episode_number})",
                            severity="BLOCKER",
                            field="content_group",
                            message=f"Duplicate language '{ep.language}' found for content_group '{ep.content_group}'.",
                            action_required="Each content_group can have only ONE episode per language. Change the content group or language.",
                        )
                    )
                    total_blockers += 1
                else:
                    content_group_lang_tracker[key] = [ep.id]

                # Check 4: Published episode must have duration > 0
                if is_ep_published and (
                    ep.duration_seconds is None or ep.duration_seconds <= 0
                ):
                    show_issues.append(
                        ValidationIssue(
                            entity_type="episode",
                            entity_id=ep.id,
                            entity_title=f"{ep.title} (S{season.season_number}E{ep.episode_number})",
                            severity="BLOCKER",
                            field="duration_seconds",
                            message="Published episode duration must be greater than 0 seconds.",
                            action_required="Enter a valid duration (in seconds) in the Episode edit modal.",
                        )
                    )
                    total_blockers += 1

                # Check 5: Published episode must have thumbnail artwork
                if is_ep_published and not ep.thumbnail_url:
                    show_issues.append(
                        ValidationIssue(
                            entity_type="episode",
                            entity_id=ep.id,
                            entity_title=f"{ep.title} (S{season.season_number}E{ep.episode_number})",
                            severity="BLOCKER",
                            field="thumbnail_url",
                            message="Published episode is missing a 16:9 thumbnail artwork.",
                            action_required="Upload a 16:9 thumbnail image (~640x360px, <200KB) for this episode.",
                        )
                    )
                    total_blockers += 1

        if show_issues:
            issues_by_show[show.title] = show_issues

    is_publishable = (total_blockers == 0) and (published_shows_count > 0)
    if published_shows_count == 0:
        general_issues.append(
            ValidationIssue(
                entity_type="system",
                entity_id="catalog",
                entity_title="Catalogue",
                severity="BLOCKER",
                field="status",
                message="No published shows found in the database.",
                action_required="Set at least one show status to 'published' to build a catalogue.",
            )
        )
        total_blockers += 1
        is_publishable = False

    return ValidationReport(
        is_publishable=is_publishable,
        total_blockers=total_blockers,
        total_warnings=total_warnings,
        published_shows_count=published_shows_count,
        published_episodes_count=published_episodes_count,
        issues_by_show=issues_by_show,
        general_issues=general_issues,
    )
