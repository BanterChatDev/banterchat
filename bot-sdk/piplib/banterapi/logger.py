import logging
import os
import sys


_LEVEL_COLOURS = {
    logging.DEBUG:    "\x1b[36m",
    logging.INFO:     "\x1b[34m",
    logging.WARNING:  "\x1b[33m",
    logging.ERROR:    "\x1b[31m",
    logging.CRITICAL: "\x1b[41m",
}
_RESET = "\x1b[0m"
_DIM = "\x1b[30;1m"
_NAME_COLOUR = "\x1b[35m"


def _supports_colour():
    if os.environ.get("NO_COLOR"):
        return False
    if os.environ.get("FORCE_COLOR"):
        return True
    return hasattr(sys.stderr, "isatty") and sys.stderr.isatty()


class _ColourFormatter(logging.Formatter):
    def __init__(self, use_colour):
        super().__init__()
        self.use_colour = use_colour
        self._plain = logging.Formatter("%(asctime)s [%(name)s] %(levelname)s: %(message)s", datefmt="%H:%M:%S")

    def format(self, record):
        if not self.use_colour:
            return self._plain.format(record)
        colour = _LEVEL_COLOURS.get(record.levelno, "")
        fmt = (
            f"{_DIM}%(asctime)s{_RESET} "
            f"{colour}%(levelname)-8s{_RESET} "
            f"{_NAME_COLOUR}%(name)s{_RESET} %(message)s"
        )
        formatter = logging.Formatter(fmt, datefmt="%H:%M:%S")
        return formatter.format(record)


def _install_handler():
    root = logging.getLogger("banterapi")
    if root.handlers:
        return
    h = logging.StreamHandler()
    h.setFormatter(_ColourFormatter(_supports_colour()))
    root.addHandler(h)
    debug_env = os.environ.get("BANTERAPI_DEBUG", "").lower() in ("1", "true", "yes")
    root.setLevel(logging.DEBUG if debug_env else logging.INFO)


_install_handler()


class Logger:

    __slots__ = ("_log",)

    def __init__(self, name):
        if not name.startswith("banterapi"):
            name = "banterapi." + name
        self._log = logging.getLogger(name)

    def debug(self, msg, *args):
        self._log.debug(msg, *args)

    def info(self, msg, *args, exc=False):
        self._log.info(msg, *args, exc_info=exc)

    def panic(self, msg, *args):
        self._log.critical(msg, *args)
        raise SystemExit(1)