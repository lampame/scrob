from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class OAuthDeviceGrant(Base):
    """One row per OAuth 2.0 Device Authorization Grant (RFC 8628) - the flow
    third-party clients (e.g. the Umbrella Kodi add-on) use to obtain a
    write-scoped access token without ever handling the user's password, so
    2FA accounts work and each device is revocable on its own (#331).

    Lifecycle: created `pending` by POST /auth/device/code -> the user opens
    the verification page while logged in and approves it (`approved`, with
    `user_id` set) or rejects it (`denied`) -> the client polls
    POST /auth/device/token, which issues the access token + refresh token
    once and stamps `token_issued_at` (the device_code is single-use from
    then on; the client refreshes via the refresh token). `revoked_at` (set
    from the user's Connected Apps list) immediately invalidates every token
    minted from the grant - dependencies.get_optional_user re-checks it on
    each request.

    Secrets are never stored in the clear: `device_code_hash` and
    `refresh_token_hash` are SHA-256 hex digests. `user_code` is the short
    human-entered code and is not a bearer secret (approval is gated behind a
    normal authenticated session), so it is stored as-is.
    """

    __tablename__ = "oauth_device_grants"

    id                : Mapped[int]                = mapped_column(Integer, primary_key=True)
    device_code_hash  : Mapped[str]                = mapped_column(String(64), unique=True, nullable=False, index=True)
    user_code         : Mapped[str]                = mapped_column(String(16), unique=True, nullable=False, index=True)
    client_name       : Mapped[str]                = mapped_column(String(120), nullable=False)
    scope             : Mapped[str]                = mapped_column(String(64), nullable=False, default="write")
    status            : Mapped[str]                = mapped_column(String(16), nullable=False, default="pending")
    interval          : Mapped[int]                = mapped_column(Integer, nullable=False, default=5)

    user_id           : Mapped[int | None]         = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    created_at        : Mapped[datetime]           = mapped_column(DateTime, server_default=func.now(), nullable=False)
    expires_at        : Mapped[datetime]           = mapped_column(DateTime, nullable=False)
    last_polled_at    : Mapped[datetime | None]    = mapped_column(DateTime, nullable=True)
    approved_at       : Mapped[datetime | None]    = mapped_column(DateTime, nullable=True)
    token_issued_at   : Mapped[datetime | None]    = mapped_column(DateTime, nullable=True)
    last_seen_at      : Mapped[datetime | None]    = mapped_column(DateTime, nullable=True)
    revoked_at        : Mapped[datetime | None]    = mapped_column(DateTime, nullable=True)

    refresh_token_hash          : Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    # Kept for one rotation so a replayed (already-rotated) refresh token can
    # be recognised as theft and used to revoke the whole grant.
    prev_refresh_token_hash     : Mapped[str | None] = mapped_column(String(64), nullable=True)
