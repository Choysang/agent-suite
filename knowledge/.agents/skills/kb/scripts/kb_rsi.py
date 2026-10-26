"""Compatibility import for the pure governance module."""
import sys
from kb_engine import governance
sys.modules[__name__] = governance
