#!/usr/bin/env bash
# new-instance.sh — provision a fresh RM-Track instance for a new group
set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[info]${NC}  $*"; }
success() { echo -e "${GREEN}[done]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}  $*"; }

# ── Prerequisites ─────────────────────────────────────────────
for cmd in docker openssl python3; do
  command -v "$cmd" &>/dev/null || { echo "Error: '$cmd' is required but not installed."; exit 1; }
done

echo ""
echo "========================================"
echo "   RM-Track — New Instance Setup"
echo "========================================"
echo ""

# ── Inputs ────────────────────────────────────────────────────
read -rp "Group name (no spaces, e.g. campus or other-site): " GROUP_NAME
if [[ -z "$GROUP_NAME" || "$GROUP_NAME" =~ [[:space:]] ]]; then
  echo "Error: group name cannot be empty or contain spaces."; exit 1
fi

ENV_FILE=".env.${GROUP_NAME}"
if [[ -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE already exists. Choose a different group name or delete the file first."; exit 1
fi

read -rp "Site URL for this group (e.g. https://campus.rmtrack.uni.ac.uk): " SITE_URL
if [[ -z "$SITE_URL" ]]; then
  echo "Error: site URL cannot be empty."; exit 1
fi

# ── Port offset ───────────────────────────────────────────────
# Count existing .env.* files to determine port offset
INSTANCE_COUNT=$(ls .env.* 2>/dev/null | wc -l || echo 0)
KONG_PORT=$((8000 + INSTANCE_COUNT * 100))
STUDIO_PORT=$((5555 + INSTANCE_COUNT * 100))
DB_PORT=$((5432 + INSTANCE_COUNT))

info "Assigning ports: Kong=$KONG_PORT, Studio=$STUDIO_PORT, DB=$DB_PORT"

# ── Generate secrets ──────────────────────────────────────────
info "Generating secrets..."

POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_SECRET_EXPRESS=$(openssl rand -hex 32)

# Generate Supabase-compatible JWTs (anon + service_role) signed with JWT_SECRET
read -r ANON_KEY SERVICE_ROLE_KEY < <(python3 - "$JWT_SECRET" <<'PYEOF'
import sys, hmac, hashlib, base64, json, time

secret = sys.argv[1]

def b64url(data):
    if isinstance(data, str):
        data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

def make_jwt(role):
    now = int(time.time())
    header  = b64url(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(',', ':')))
    payload = b64url(json.dumps({"role": role, "iss": "supabase", "iat": now, "exp": now + 315360000}, separators=(',', ':')))
    msg = f"{header}.{payload}".encode()
    sig = hmac.new(secret.encode(), msg, hashlib.sha256).digest()
    return f"{header}.{payload}.{b64url(sig)}"

print(make_jwt("anon"), make_jwt("service_role"))
PYEOF
)

DASHBOARD_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)

success "Secrets generated."

# ── Write env file ────────────────────────────────────────────
cat > "$ENV_FILE" <<EOF
# RM-Track instance: ${GROUP_NAME}
# Created: $(date -u +"%Y-%m-%d %H:%M UTC")

SITE_URL=${SITE_URL}

# PostgreSQL
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=postgres
POSTGRES_USER=postgres

# Supabase
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# Express backend
JWT_SECRET_EXPRESS=${JWT_SECRET_EXPRESS}
JWT_EXPIRES_IN=7d

# Ports (offset per instance to avoid conflicts)
KONG_HTTP_PORT=${KONG_PORT}
KONG_HTTPS_PORT=$((KONG_PORT + 1))
DB_PORT=${DB_PORT}
STUDIO_PORT=${STUDIO_PORT}

# Studio credentials
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}
EOF

success "Created $ENV_FILE"

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "========================================"
echo "  Instance ready: ${GROUP_NAME}"
echo "========================================"
echo ""
echo "  Site URL:         ${SITE_URL}"
echo "  Studio port:      ${STUDIO_PORT}"
echo "  Studio password:  ${DASHBOARD_PASSWORD}"
echo ""
echo "  Env file:         ${ENV_FILE}"
echo ""

# ── Optionally start ──────────────────────────────────────────
read -rp "Start this instance now? [y/N] " START
if [[ "${START,,}" == "y" ]]; then
  info "Linking .env → ${ENV_FILE} (required by Docker Compose include)..."
  ln -sf "${ENV_FILE}" .env

  info "Starting stack (project: ${GROUP_NAME})..."
  docker compose --project-name "${GROUP_NAME}" --env-file "${ENV_FILE}" up -d --build
  success "Stack started."
  echo ""
  echo "Next steps:"
  echo "  1. Wait ~60s for PostgreSQL to initialise"
  echo "  2. Apply migrations:"
  echo "     docker compose -p ${GROUP_NAME} exec -T supabase-db psql -U postgres -d postgres < supabase/migrations/*.sql"
  echo "  3. Open Studio at http://localhost:${STUDIO_PORT}"
  echo "     Login: admin / ${DASHBOARD_PASSWORD}"
  echo "  4. Create the first admin user in Authentication → Users"
  echo "  5. Run the SQL below in the Studio SQL editor:"
  echo ""
  echo "     INSERT INTO public.profiles (id, name, email, role)"
  echo "     VALUES ('<user-uuid>', 'Admin Name', 'admin@example.com', 'ADMIN');"
  echo ""
  echo "     UPDATE auth.users"
  echo "     SET raw_app_meta_data = raw_app_meta_data || '{\"role\": \"ADMIN\"}'::jsonb"
  echo "     WHERE id = '<user-uuid>';"
else
  echo "To start later, run:"
  echo "  ln -sf ${ENV_FILE} .env"
  echo "  docker compose --project-name ${GROUP_NAME} --env-file ${ENV_FILE} up -d --build"
fi

echo ""
