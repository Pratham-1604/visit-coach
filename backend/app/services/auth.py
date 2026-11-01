"""Password hashing with the standard library (PBKDF2). Enough for demo users; no extra packages."""

import hashlib
import hmac
import secrets

ITERATIONS = 100_000


def hash_password(password):
    salt = secrets.token_hex(16)
    return f"{salt}${_digest(password, salt)}"


def check_password(password, stored):
    salt, digest = stored.split("$", 1)
    return hmac.compare_digest(_digest(password, salt), digest)


def new_token():
    return secrets.token_urlsafe(32)


def _digest(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), ITERATIONS).hex()
