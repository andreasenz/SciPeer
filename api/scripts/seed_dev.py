#!/usr/bin/env python3
"""
Convenience wrapper — runs the dev seed directly from the project root.
Usage: python scripts/seed_dev.py
"""
import asyncio
import logging
import os
import sys

# Ensure /app (or the api/ directory when running locally) is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.seed_dev import seed  # noqa: E402

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    asyncio.run(seed())
