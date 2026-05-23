import os


class File:

    __slots__ = ("fp", "filename", "_owns_fp")

    def __init__(self, fp, filename=None):
        self._owns_fp = False
        if isinstance(fp, (bytes, bytearray)):
            self.fp = bytes(fp)
            if not filename:
                raise ValueError("File(bytes, ...) requires filename=")
            self.filename = filename
        elif isinstance(fp, str):
            if not filename:
                filename = os.path.basename(fp)
            with open(fp, "rb") as f:
                self.fp = f.read()
            self.filename = filename
        else:
            data = fp.read()
            if not isinstance(data, (bytes, bytearray)):
                raise TypeError("file-like must return bytes from .read()")
            self.fp = bytes(data)
            if not filename:
                filename = getattr(fp, "name", None)
                if filename:
                    filename = os.path.basename(filename)
            if not filename:
                raise ValueError("File(file-like, ...) requires filename= or fp.name")
            self.filename = filename

    def __repr__(self):
        return f"File({self.filename!r}, {len(self.fp)} bytes)"