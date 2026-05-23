class BanterError(Exception):
    pass


class HTTPException(BanterError):

    def __init__(self, status, code, message, method="", path=""):
        self.status = status
        self.code = code
        self.message = message
        self.method = method
        self.path = path
        if method and path:
            super().__init__(f"{method} {path} -> {status} {code}: {message}")
        else:
            super().__init__(f"{status} {code}: {message}")


class Forbidden(HTTPException):
    pass


class NotFound(HTTPException):
    pass


class DuplicateCommand(BanterError):
    """Raised when a slash command is registered with a name that's
    already in use on this Bot instance, or when the server rejects a
    registration payload for the same reason (code 20005).

    Subclasses BanterError rather than HTTPException because the
    primary trigger is now local — the pip lib refuses to enqueue a
    duplicate before any network call. The server-side branch wraps
    the original HTTPException in this class so callers can write a
    single `except DuplicateCommand` regardless of which side caught
    it.
    """

    def __init__(self, name, *, source="local", http_exc=None):
        self.name = name
        self.source = source
        self.http_exc = http_exc
        if source == "server":
            super().__init__(f"server rejected duplicate command name: {name!r}")
        else:
            super().__init__(f"duplicate slash command name: {name!r} is already registered")


class RateLimited(HTTPException):

    def __init__(self, status, code, message, retry_after, method="", path=""):
        super().__init__(status, code, message, method=method, path=path)
        self.retry_after = retry_after


class GatewayError(BanterError):
    pass


class LoginFailure(BanterError):
    pass


class MissingPermissions(BanterError):

    def __init__(self, missing):
        self.missing = missing
        names = ", ".join(missing) if missing else "unknown"
        super().__init__(f"Missing permissions: {names}")