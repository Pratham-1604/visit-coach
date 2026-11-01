"""Simple login for the demo: users with passwords, one random token per login (no expiry yet).

Mentors use the whole app. The block officer only sees support planning. The state admin only
manages the state checklist. The teacher's shared link (/api/t/...) needs no login: teachers
never install or sign in to anything.
"""

from fastapi import Depends, Header, HTTPException
from pydantic import BaseModel

from app import db
from app.services import auth

ROLES = ("mentor", "officer", "admin")


class LoginIn(BaseModel):
    username: str
    password: str


def create_user(username, password, name, role, state="MH"):
    return db.execute(
        "INSERT INTO users (username, password_hash, name, role, state) VALUES (?, ?, ?, ?, ?)",
        (username.strip().lower(), auth.hash_password(password), name.strip(), role, state),
    )


def login(login_in):
    user = db.query_one("SELECT * FROM users WHERE username = ?", (login_in.username.strip().lower(),))
    if not user or not auth.check_password(login_in.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong username or password")
    token = auth.new_token()
    db.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user["id"]))
    return {"token": token, "user": public(user)}


def logout(token):
    db.execute("DELETE FROM sessions WHERE token = ?", (token,))


def public(user):
    return {key: user[key] for key in ("id", "username", "name", "role", "state")}


# FastAPI dependencies: add them to a route or router to require a login.


def bearer_token(authorization: str = Header(default="")):
    scheme, _, token = authorization.partition(" ")
    return token.strip() if scheme.lower() == "bearer" else ""


def current_user(token: str = Depends(bearer_token)):
    user = None
    if token:
        user = db.query_one("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?", (token,))
    if not user:
        raise HTTPException(status_code=401, detail="Please log in")
    return public(user)


def require_mentor(user=Depends(current_user)):
    if user["role"] != "mentor":
        raise HTTPException(status_code=403, detail="Only mentors can do this")
    return user


def require_admin(user=Depends(current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only the state admin can do this")
    return user
