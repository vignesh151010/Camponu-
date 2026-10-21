import secrets
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

# Argon2id password hasher with secure parameters
ph = PasswordHasher(
    time_cost=3,        # 3 iterations
    memory_cost=65536,  # 64 MB
    parallelism=4,      # 4 parallel threads
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """
    Hashes a plaintext password using Argon2id.
    """
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against an Argon2id hash.
    """
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def generate_session_token() -> str:
    """
    Generates a cryptographically strong random token for server-side sessions.
    """
    return secrets.token_urlsafe(48)
