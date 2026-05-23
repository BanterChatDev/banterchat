#!/usr/bin/env bash
set -e

if [ "$(id -u)" = "0" ]; then
  echo "do not run setup.sh as root. postgres initdb refuses to run as root."
  echo "run as your normal user. it will sudo when it needs to install packages."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

DEPLOY_GO="$ROOT/modules/conf/deploy.go"
if [ ! -f "$DEPLOY_GO" ]; then
  echo "modules/conf/deploy.go not found. are you in the repo root?"
  exit 1
fi

OS=""
if [ -f /etc/debian_version ]; then OS=debian
elif [ -f /etc/redhat-release ]; then OS=redhat
elif [ -f /etc/arch-release ]; then OS=arch
elif [ "$(uname)" = "Darwin" ]; then OS=mac
else
  echo "unsupported OS. install go, postgres, and node manually then re-run."
  exit 1
fi

install_pkg() {
  case "$OS" in
    debian) sudo apt-get install -y "$@" ;;
    redhat) sudo dnf install -y "$@" ;;
    arch)   sudo pacman -S --noconfirm "$@" ;;
    mac)    brew install "$@" ;;
  esac
}

if [ "$OS" = "debian" ]; then sudo apt-get update -qq; fi

if ! command -v go >/dev/null 2>&1; then
  echo "installing go..."
  case "$OS" in
    debian|redhat) install_pkg golang-go ;;
    arch)          install_pkg go ;;
    mac)           install_pkg go ;;
  esac
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "installing postgres..."
  case "$OS" in
    debian) install_pkg postgresql postgresql-contrib ;;
    redhat) install_pkg postgresql-server postgresql-contrib ;;
    arch)   install_pkg postgresql ;;
    mac)    install_pkg postgresql ;;
  esac
fi

if ! command -v node >/dev/null 2>&1; then
  echo "installing node..."
  case "$OS" in
    debian) install_pkg nodejs npm ;;
    redhat) install_pkg nodejs npm ;;
    arch)   install_pkg nodejs npm ;;
    mac)    install_pkg node ;;
  esac
fi

PGBIN=""
for d in /usr/lib/postgresql/*/bin /usr/local/opt/postgresql*/bin /opt/homebrew/opt/postgresql*/bin; do
  if [ -x "$d/initdb" ]; then PGBIN="$d"; fi
done
if [ -z "$PGBIN" ]; then
  if command -v initdb >/dev/null 2>&1; then
    PGBIN="$(dirname "$(command -v initdb)")"
  fi
fi
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/initdb" ]; then
  echo "postgres binaries not found after install. install postgres manually and re-run."
  exit 1
fi

PGDATA="$ROOT/pgdata"
PGPORT=5433
PGUSER=banter
PGDB=banter
FRESH_DB=0

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  FRESH_DB=1
  "$PGBIN/initdb" -D "$PGDATA" --auth=trust --username="$PGUSER" --no-locale -E UTF8 >/dev/null
fi

cat > "$PGDATA/postgresql.conf" <<EOF
listen_addresses = 'localhost'
port = $PGPORT
unix_socket_directories = '$PGDATA'
max_connections = 50
shared_buffers = 128MB
logging_collector = off
EOF

cat > "$PGDATA/pg_hba.conf" <<EOF
local   all   all                 trust
host    all   all   127.0.0.1/32  md5
host    all   all   ::1/128       md5
EOF

"$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1 || \
  "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/postgres.log" -w -t 10 start >/dev/null

PSQL="$PGBIN/psql -h $PGDATA -p $PGPORT -U $PGUSER"

for i in 1 2 3 4 5 6 7 8 9 10; do
  $PSQL -c "SELECT 1" postgres >/dev/null 2>&1 && break
  sleep 1
done

read_var() {
  grep -E "^[[:space:]]+$1[[:space:]]*=" "$DEPLOY_GO" | head -1 | sed -E 's/.*=[[:space:]]*"(.*)"[[:space:]]*$/\1/'
}

write_string_var() {
  python3 - "$DEPLOY_GO" "$1" "$2" <<'PYEOF'
import sys, re
path, name, val = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f: src = f.read()
pat = re.compile(r'(^\s+' + re.escape(name) + r'\s*=\s*)"[^"]*"', re.M)
new, n = pat.subn(lambda m: m.group(1) + '"' + val + '"', src, count=1)
if n == 0:
    sys.stderr.write(f'could not find {name} in {path}\n'); sys.exit(1)
with open(path, 'w') as f: f.write(new)
PYEOF
}

write_bool_var() {
  python3 - "$DEPLOY_GO" "$1" "$2" <<'PYEOF'
import sys, re
path, name, val = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f: src = f.read()
pat = re.compile(r'(^\s+' + re.escape(name) + r'\s*=\s*)(true|false)', re.M)
new, n = pat.subn(lambda m: m.group(1) + val, src, count=1)
if n == 0:
    sys.stderr.write(f'could not find {name} in {path}\n'); sys.exit(1)
with open(path, 'w') as f: f.write(new)
PYEOF
}

write_origins() {
  python3 - "$DEPLOY_GO" "$1" <<'PYEOF'
import sys, re
path, domain = sys.argv[1], sys.argv[2]
with open(path) as f: src = f.read()
if domain == "localhost":
    block = ('AllowedOrigins = []string{\n'
             '\t\t"http://localhost",\n'
             '\t\t"http://localhost:3030",\n'
             '\t}')
else:
    block = ('AllowedOrigins = []string{\n'
             '\t\t"https://' + domain + '",\n'
             '\t\t"http://' + domain + '",\n'
             '\t\t"http://localhost:3030",\n'
             '\t}')
pat = re.compile(r'AllowedOrigins\s*=\s*\[\]string\{[^}]*\}', re.S)
new, n = pat.subn(block, src, count=1)
if n == 0:
    sys.stderr.write('could not find AllowedOrigins block\n'); sys.exit(1)
with open(path, 'w') as f: f.write(new)
PYEOF
}

CURRENT_DOMAIN="$(read_var Domain)"
CURRENT_MASTER_KEY="$(read_var MasterKey)"
CURRENT_DB_PASSWORD="$(read_var DBPassword)"
CURRENT_TERMS_URL="$(read_var TermsURL)"
CURRENT_LK_URL="$(read_var LiveKitURL)"
CURRENT_LK_KEY="$(read_var LiveKitAPIKey)"
CURRENT_LK_SECRET="$(read_var LiveKitAPISecret)"
CURRENT_TENOR="$(read_var TenorAPIKey)"

echo ""
echo "=================================================================="
echo "  banter setup"
echo "=================================================================="
echo ""

DEFAULT_DOMAIN="${CURRENT_DOMAIN:-localhost}"
read -p "domain [$DEFAULT_DOMAIN]: " IN_DOMAIN
DOMAIN="${IN_DOMAIN:-$DEFAULT_DOMAIN}"

if [ "$DOMAIN" = "localhost" ]; then
  SECURE="false"
else
  read -p "running behind HTTPS? [Y/n]: " IN_HTTPS
  case "$IN_HTTPS" in
    n|N|no|NO) SECURE="false" ;;
    *)         SECURE="true" ;;
  esac
fi

DEFAULT_TERMS="$CURRENT_TERMS_URL"
if [ -z "$DEFAULT_TERMS" ] || [ "$DEFAULT_TERMS" = "https://example.com/terms" ]; then
  if [ "$SECURE" = "true" ]; then
    DEFAULT_TERMS="https://$DOMAIN/terms"
  else
    DEFAULT_TERMS="http://$DOMAIN/terms"
  fi
fi
read -p "terms-of-service URL [$DEFAULT_TERMS]: " IN_TERMS
TERMS_URL="${IN_TERMS:-$DEFAULT_TERMS}"

if [ -z "$CURRENT_MASTER_KEY" ]; then
  MASTER_KEY="$(openssl rand -hex 32)"
  echo ""
  echo "================================================================"
  echo "================================================================"
  echo ""
  echo "    SAVE THIS MASTER KEY SOMEWHERE SAFE RIGHT NOW"
  echo ""
  echo "    $MASTER_KEY"
  echo ""
  echo "    Put it in a password manager. Write it down."
  echo "    Do something."
  echo ""
  echo "    This key encrypts everything in your database."
  echo "    If you lose it, your data is gone forever."
  echo "    There is no recovery. Banter staff cannot help you."
  echo "    Anyone who has it can decrypt your entire server."
  echo ""
  echo "    It is being written into modules/conf/deploy.go on this"
  echo "    machine. Back up that file too. Never commit it to git."
  echo ""
  echo "================================================================"
  echo "================================================================"
  echo ""
  read -p "    Press enter once you have saved the key. " _
else
  MASTER_KEY="$CURRENT_MASTER_KEY"
  echo "(keeping existing MasterKey)"
fi

if [ -z "$CURRENT_DB_PASSWORD" ]; then
  DB_PASSWORD="$(openssl rand -hex 16)"
else
  DB_PASSWORD="$CURRENT_DB_PASSWORD"
fi

echo ""
read -p "configure LiveKit for voice/video? [y/N]: " IN_LK
case "$IN_LK" in
  y|Y|yes|YES)
    read -p "  LiveKit URL (wss://...) [$CURRENT_LK_URL]: " IN_LK_URL
    LK_URL="${IN_LK_URL:-$CURRENT_LK_URL}"
    read -p "  LiveKit API key [$CURRENT_LK_KEY]: " IN_LK_KEY
    LK_KEY="${IN_LK_KEY:-$CURRENT_LK_KEY}"
    read -p "  LiveKit API secret [$CURRENT_LK_SECRET]: " IN_LK_SECRET
    LK_SECRET="${IN_LK_SECRET:-$CURRENT_LK_SECRET}"
    ;;
  *)
    LK_URL="$CURRENT_LK_URL"
    LK_KEY="$CURRENT_LK_KEY"
    LK_SECRET="$CURRENT_LK_SECRET"
    ;;
esac

read -p "Tenor (GIF picker) API key [$CURRENT_TENOR]: " IN_TENOR
TENOR="${IN_TENOR:-$CURRENT_TENOR}"

echo ""
echo "writing modules/conf/deploy.go..."

write_string_var Domain "$DOMAIN"
write_bool_var Secure "$SECURE"
write_string_var TermsURL "$TERMS_URL"
write_string_var MasterKey "$MASTER_KEY"
write_string_var DBPassword "$DB_PASSWORD"
write_string_var LiveKitURL "$LK_URL"
write_string_var LiveKitAPIKey "$LK_KEY"
write_string_var LiveKitAPISecret "$LK_SECRET"
write_string_var TenorAPIKey "$TENOR"
write_origins "$DOMAIN"

$PSQL -c "ALTER USER $PGUSER WITH PASSWORD '$DB_PASSWORD';" postgres >/dev/null

if ! $PSQL -lqt postgres | cut -d \| -f 1 | grep -qw "$PGDB"; then
  $PSQL -c "CREATE DATABASE $PGDB;" postgres
fi

if [ "$FRESH_DB" = "1" ]; then
  $PSQL -f "$ROOT/data/schema.sql" "$PGDB" >/dev/null
fi

mkdir -p assets/media/attachments
mkdir -p assets/media/avatars
mkdir -p assets/media/banners
mkdir -p assets/media/guild_avatars
mkdir -p assets/media/guild_banners

echo ""
echo "setup done. next: ./build.sh && ./main"