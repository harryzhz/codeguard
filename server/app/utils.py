import secrets


def generate_short_id() -> str:
    return secrets.token_urlsafe(8)[:10]
