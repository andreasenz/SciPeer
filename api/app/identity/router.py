from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.core.deps import CurrentUserID, DBSession
from app.identity import service
from app.identity.schemas import OrcidCallbackIn, TokenOut, UserOut
from sqlalchemy import select
from app.identity.models import User

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
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ORCID exchange failed")

    orcid_id: str = token_data.get("orcid", "")
    display_name: str = token_data.get("name", "")
    if not orcid_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ORCID ID missing")

    user = await service.get_or_create_user(session, orcid_id, display_name, email=None)
    return await service.issue_tokens(user.id)


@router.get("/me", response_model=UserOut)
async def me(user_id: CurrentUserID, session: DBSession) -> UserOut:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserOut.model_validate(user)
