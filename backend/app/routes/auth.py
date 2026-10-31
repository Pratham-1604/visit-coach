"""HTTP endpoints for logging in and out."""

from fastapi import APIRouter, Depends

from app.controllers import auth as auth_controller

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(login_in: auth_controller.LoginIn):
    return auth_controller.login(login_in)


@router.post("/logout")
def logout(token: str = Depends(auth_controller.bearer_token)):
    auth_controller.logout(token)
    return {"ok": True}


@router.get("/me")
def me(user=Depends(auth_controller.current_user)):
    return user
