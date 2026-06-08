import logging

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import CurrentUserID, DBSession
from app.core.security import decode_token
from app.identity import service
from app.identity.models import User
from app.identity.schemas import OrcidCallbackIn, RefreshIn, TokenOut, UserOut

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/orcid/login")
async def orcid_login() -> RedirectResponse:
    url = (
        f"{settings.orcid_base_url}/oauth/authorize"
        f"?client_id={settings.orcid_client_id}"
        f"&response_type=code"
        f"&scope=/authenticate"
        f"&redirect_uri={settings.orcid_redirect_uri}"
    )
    return RedirectResponse(url)


@router.post("/orcid/callback", response_model=TokenOut)
async def orcid_callback(payload: OrcidCallbackIn, session: DBSession) -> TokenOut:
    try:
        token_data = await service.exchange_orcid_code(payload.code)
    except Exception as exc:
        logger.warning("ORCID code exchange failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"ORCID exchange failed: {exc}")

    orcid_id: str = token_data.get("orcid", "")
    display_name: str = token_data.get("name", "")
    if not orcid_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ORCID ID missing")

    user = await service.get_or_create_user(session, orcid_id, display_name, email=None)

    # Background: sync coauthor graph (non-blocking, errors are logged)
    import asyncio
    asyncio.create_task(service.sync_coauthor_graph(session, user))

    return await service.issue_tokens(user.id)


@router.post("/refresh", response_model=TokenOut)
async def refresh(body: RefreshIn) -> TokenOut:
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError
        from uuid import UUID
        user_id = UUID(payload["sub"])
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return await service.issue_tokens(user_id)


@router.get("/me", response_model=UserOut)
async def me(user_id: CurrentUserID, session: DBSession) -> UserOut:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut.model_validate(user)
