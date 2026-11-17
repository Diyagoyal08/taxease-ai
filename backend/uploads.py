"""Safe handling of uploaded files: allowed types, real file contents, size limit, no leftovers."""
import os
import tempfile
from contextlib import contextmanager

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_FILES = 10
CHUNK_BYTES = 1024 * 1024

# The first bytes of each file type. A renamed file (an .exe called bill.pdf) fails this check.
SIGNATURES = {
    ".pdf": (b"%PDF-",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
}

TYPE_NAMES = {".pdf": "PDF", ".png": "PNG", ".jpg": "JPG", ".jpeg": "JPG"}


class UploadProblem(Exception):
    """The upload was refused. `status` is the HTTP status code to answer with."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


@contextmanager
def temp_upload(upload, allowed):
    """Save an upload to a temporary file and give back its path. The file is always deleted afterwards."""
    suffix = os.path.splitext(upload.filename or "")[1].lower()
    if suffix not in allowed:
        names = sorted({TYPE_NAMES[extension] for extension in allowed})
        raise UploadProblem("Supported files: " + ", ".join(names))

    handle, path = tempfile.mkstemp(suffix=suffix)
    try:
        size = 0
        with os.fdopen(handle, "wb") as out:
            while chunk := upload.file.read(CHUNK_BYTES):
                if size == 0 and not chunk.startswith(SIGNATURES[suffix]):
                    raise UploadProblem(f"This file is not a real {TYPE_NAMES[suffix]}.")
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise UploadProblem(f"Files can be at most {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.", status=413)
                out.write(chunk)
        if size == 0:
            raise UploadProblem("The file is empty.")
        yield path
    finally:
        if os.path.exists(path):
            os.remove(path)
