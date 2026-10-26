# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6"]
# ///
"""Stable standalone entry point and compatibility API for the knowledge engine."""
import os
import sys
from kb_engine import governance as rsi
from kb_engine.model import *  # noqa: F403 - public compatibility surface
from kb_engine.repository import *  # noqa: F403
from kb_engine.search import *  # noqa: F403
from kb_engine.routing import *  # noqa: F403
from kb_engine.intake import *  # noqa: F403
from kb_engine.cli import main, default_vault

if __name__ == "__main__":
    sys.exit(main())
