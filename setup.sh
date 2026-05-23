#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

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

if [ ! -f "$ROOT/.env" ]; then
  MASTER_KEY="$(openssl rand -hex 32)"
  DB_PASSWORD="$(openssl rand -hex 16)"

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
  echo "    It is also saved in ./.env on this machine."
  echo "    Back up that file too. Never commit it to git."
  echo ""
  echo "================================================================"
  echo "================================================================"
  echo ""
  read -p "    Press enter once you have saved the key. " _

  cat > "$ROOT/.env" <<EOF
HTTP_ADDR=:3030
DOMAIN=localhost
SECURE_COOKIES=false
MAX_BODY_SIZE=10M

MASTER_KEY=$MASTER_KEY

DB_HOST=127.0.0.1
DB_PORT=$PGPORT
DB_USER=$PGUSER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$PGDB
DB_SSLMODE=disable

LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

TENOR_API_KEY=
EOF
fi

DB_PASSWORD="$(grep ^DB_PASSWORD= "$ROOT/.env" | cut -d= -f2-)"
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