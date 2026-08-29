import logging

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from core.config import settings

logger = logging.getLogger(__name__)

# Conservative defaults so a single instance fits inside constrained managed
# PostgreSQL plans (e.g. Aiven free tier: max_connections=20, no connection
# pooling). Every value can be overridden via env (DB_POOL_SIZE / DB_MAX_OVERFLOW
# / DB_POOL_TIMEOUT / DB_POOL_RECYCLE / DB_POOL_PRE_PING); if unset, the default
# below is used. See develop-eggs/DB-CONNECTION-POOL-LIMITS.md
_POOL_DEFAULTS = {
    "pool_size": 20,
    "max_overflow": 10,
    "pool_timeout": 30,
    "pool_recycle": 1800,
    "pool_pre_ping": True,
}


def _build_pool_kwargs() -> dict:
    """Resolve engine pool kwargs from settings, falling back to defaults.

    Only values the user explicitly set via env override the defaults, so
    existing deployments keep their current behaviour.
    """
    overrides = {
        "pool_size": settings.db_pool_size,
        "max_overflow": settings.db_max_overflow,
        "pool_timeout": settings.db_pool_timeout,
        "pool_recycle": settings.db_pool_recycle,
        "pool_pre_ping": settings.db_pool_pre_ping,
    }
    pool_kwargs = dict(_POOL_DEFAULTS)
    overridden = False
    for key, value in overrides.items():
        if value is not None:
            pool_kwargs[key] = value
            overridden = True

    ceiling = pool_kwargs["pool_size"] + pool_kwargs["max_overflow"]
    # Guardrail for users who tuned the pool: warn if the resulting ceiling is
    # above the safe budget for the smallest managed plans. We only warn when an
    # override was supplied (default deployments stay silent). The DB limit is
    # unknown at startup, so this is a best-effort nudge, not an enforcement.
    if overridden and ceiling > 15:
        logger.warning(
            "DB pool ceiling (pool_size + max_overflow = %d) exceeds the safe budget "
            "for constrained PostgreSQL plans (e.g. Aiven free tier max_connections=20). "
            "If you run multiple replicas or ad-hoc connections you may exhaust the DB "
            "connection limit. See develop-eggs/DB-CONNECTION-POOL-LIMITS.md",
            ceiling,
        )
    return pool_kwargs


engine = create_async_engine(
    settings.db_url,
    echo=False,
    **_build_pool_kwargs(),
    # Every timestamp column in this app is naive (DateTime, no timezone) and
    # either defaults via Postgres's own func.now() or Python's
    # datetime.utcnow() - both are only consistent with each other, and with
    # the frontend's "treat naive timestamps as UTC" assumption, if the
    # database session's own timezone is UTC. Without pinning it here,
    # Postgres falls back to whatever timezone the container's TZ env var
    # (or the server's own config) happens to set, so func.now() silently
    # stores local wall-clock time into what everything else treats as UTC -
    # e.g. a job that ran at 8:36am AEST would be stored as "18:36" and then
    # displayed as if that were already UTC, showing hours in the future.
    connect_args={"server_settings": {"timezone": "UTC"}},
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session