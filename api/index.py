"""Vercel entry point.

Vercel only detects a FastAPI app at a fixed set of paths -- `app`, `index`,
`server`, `main`, `wsgi` or `asgi` with a `.py` extension, at the project root
or under `src/`, `app/` or `api/`. The real app lives in ``server/main.py``,
which is none of those, so this shim re-exports it from a path Vercel does
recognise.

Keep this file thin: it exists purely for routing detection. It must expose a
module-level ``app``.
"""

import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parent.parent / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from main import app  # noqa: E402,F401  -- the name `app` is what Vercel looks for
