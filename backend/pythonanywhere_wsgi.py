import os
import sys

path = "/home/YOUR_USERNAME/skillmatrix-ai/backend"
if path not in sys.path:
    sys.path.insert(0, path)
os.chdir(path)

from app import app as application  # noqa: E402,F401
