"""Real RS256 verification - the one thing conftest stubs everywhere else."""
import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from jose import jwt

from app.config import settings
from app.core import auth

pytestmark = pytest.mark.asyncio

_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_PEM = _KEY.private_bytes(
    serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()
)
_PUBLIC = _KEY.public_key().public_bytes(
    serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
).decode()


@pytest.fixture(autouse=True)
def signing_key(monkeypatch):
    async def _find(kid):
        return _PUBLIC if kid == "k1" else None
    monkeypatch.setattr(auth, "_find_key", _find)


def _token(**claims) -> str:
    now = int(time.time())
    body = {"sub": "user_1", "iss": settings.CLERK_JWT_ISSUER, "iat": now, "nbf": now, "exp": now + 60}
    body.update(claims)
    return jwt.encode(body, _PEM, algorithm="RS256", headers={"kid": "k1"})


async def test_accepts_a_valid_token():
    assert (await auth.verify_clerk_token(_token()))["sub"] == "user_1"


async def test_tolerates_a_server_clock_slightly_behind():
    # Minted "2s in the future" from our point of view: a clock 2s behind Clerk's.
    t = int(time.time()) + 2
    assert await auth.verify_clerk_token(_token(iat=t, nbf=t))


async def test_still_rejects_tokens_well_outside_the_window():
    far = int(time.time()) + 60
    with pytest.raises(HTTPException):
        await auth.verify_clerk_token(_token(iat=far, nbf=far, exp=far + 60))
    with pytest.raises(HTTPException):
        await auth.verify_clerk_token(_token(exp=int(time.time()) - 30))


async def test_rejects_a_foreign_issuer_or_key():
    with pytest.raises(HTTPException):
        await auth.verify_clerk_token(_token(iss="https://evil.example"))
    other = jwt.encode({"sub": "x"}, _PEM, algorithm="RS256", headers={"kid": "nope"})
    with pytest.raises(HTTPException):
        await auth.verify_clerk_token(other)
