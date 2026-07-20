"""OAuth identity helpers for Google and GitHub.

These helpers exchange an authorization code for an access token and fetch the
provider's user profile. They use httpx for async-friendly HTTP calls.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import httpx

from app.config import settings


@dataclass
class OAuthProfile:
    provider: str
    subject: str
    email: str
    name: str
    image: Optional[str] = None


# --- Google ---
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


async def exchange_google_code(code: str) -> str:
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
    return data["access_token"]


async def fetch_google_profile(access_token: str) -> OAuthProfile:
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        data = resp.json()
    return OAuthProfile(
        provider="google",
        subject=str(data.get("sub")),
        email=data.get("email", ""),
        name=data.get("name") or data.get("email", "").split("@")[0],
        image=data.get("picture"),
    )


def google_authorize_url(state: str) -> str:
    return (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        "response_type=code&access_type=offline&scope=openid email profile"
        f"&client_id={settings.google_client_id}"
        f"&redirect_uri={settings.google_redirect_uri}"
        f"&state={state}"
    )


# --- GitHub ---
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


async def exchange_github_code(code: str) -> str:
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            GITHUB_TOKEN_URL,
            json={
                "code": code,
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "redirect_uri": settings.github_redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
    return data["access_token"]


async def fetch_github_profile(access_token: str) -> OAuthProfile:
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(GITHUB_USER_URL, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        subject = str(data.get("id"))
        name = data.get("name") or data.get("login") or "GitHub User"
        image = data.get("avatar_url")
        email = data.get("email")
        if not email:
            email_resp = await client.get(GITHUB_EMAILS_URL, headers=headers)
            if email_resp.status_code == 200:
                for e in email_resp.json():
                    if e.get("primary") and e.get("verified"):
                        email = e["email"]
                        break
    if not email:
        email = f"user-{subject}@example.com"
    return OAuthProfile(
        provider="github",
        subject=subject,
        email=email,
        name=name,
        image=image,
    )


def github_authorize_url(state: str) -> str:
    return (
        "https://github.com/login/oauth/authorize?scope=read:user user:email"
        f"&client_id={settings.github_client_id}"
        f"&redirect_uri={settings.github_redirect_uri}"
        f"&state={state}"
    )
