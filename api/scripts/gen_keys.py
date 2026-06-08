"""Generate RSA key pair for JWT RS256 signing. Idempotent — skips if keys exist."""
import sys
from pathlib import Path


def main() -> None:
    priv = Path(sys.argv[1] if len(sys.argv) > 1 else "jwt_private.key")
    pub = Path(sys.argv[2] if len(sys.argv) > 2 else "jwt_public.key")

    if priv.exists() and pub.exists():
        print("JWT keys already present — skipping generation")
        return

    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    key = rsa.generate_private_key(public_exponent=65537, key_size=4096)

    priv.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        )
    )
    pub.write_bytes(
        key.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )
    print(f"Generated {priv} and {pub}")


if __name__ == "__main__":
    main()
