#!/bin/bash
# scripts/smoke-test.sh
# Smoke test end-to-end de l'API Ebeno en production
#
# Usage :
#   ./scripts/smoke-test.sh                    # utilise les valeurs par défaut
#   API_URL=https://staging... ./scripts/smoke-test.sh
#   TEST_EMAIL=autre@test.com ./scripts/smoke-test.sh

set -u  # exit si variable non définie
set -o pipefail

# ============================================================
# CONFIG
# ============================================================

API_URL="${API_URL:-https://ebeno-backend.onrender.com/api}"
TEST_EMAIL="${TEST_EMAIL:-test@test.com}"
TEST_PASSWORD="${TEST_PASSWORD:-123456}"

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Compteurs
PASSED=0
FAILED=0

# ============================================================
# HELPERS
# ============================================================

log_test() {
  echo -e "${BLUE}▶${NC} $1"
}

log_pass() {
  echo -e "  ${GREEN}✓${NC} $1"
  PASSED=$((PASSED + 1))
}

log_fail() {
  echo -e "  ${RED}✗${NC} $1"
  FAILED=$((FAILED + 1))
}

log_warn() {
  echo -e "  ${YELLOW}⚠${NC} $1"
}

check_dependencies() {
  for cmd in curl jq; do
    if ! command -v $cmd &> /dev/null; then
      echo -e "${RED}❌ Dépendance manquante : $cmd${NC}"
      echo "   Installe-la avec : pkg install $cmd (Termux)"
      exit 1
    fi
  done
}

# ============================================================
# TESTS
# ============================================================

test_health() {
  log_test "Health check"
  local response
  response=$(curl -s -w "\n%{http_code}" "$API_URL/health")
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | head -n-1)

  if [ "$http_code" != "200" ]; then
    log_fail "HTTP $http_code (attendu 200)"
    return 1
  fi

  local status=$(echo "$body" | jq -r '.status')
  if [ "$status" = "OK" ]; then
    log_pass "API en ligne (uptime: $(echo "$body" | jq -r '.uptime | floor')s)"
  else
    log_fail "status=$status"
    return 1
  fi
}

test_breakers() {
  log_test "Circuit breakers"
  local body=$(curl -s "$API_URL/health/breakers")
  local count=$(echo "$body" | jq '.breakers | length')

  if [ "$count" -ge 0 ]; then
    log_pass "$count breaker(s) configuré(s)"
  else
    log_fail "Réponse invalide"
    return 1
  fi
}

test_login() {
  log_test "Login ($TEST_EMAIL)"
  local body=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

  TOKEN=$(echo "$body" | jq -r '.token // empty')

  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    log_fail "Pas de token retourné : $(echo "$body" | jq -r '.message // .error // "unknown"')"
    return 1
  fi

  log_pass "Token obtenu (${TOKEN:0:20}...)"
}

test_login_invalid() {
  log_test "Login invalide (doit échouer)"
  local http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"inexistant@fake.com","password":"wrong"}')

  if [ "$http_code" = "401" ]; then
    log_pass "Rejet correct (HTTP 401)"
  else
    log_fail "Attendu 401, reçu $http_code"
    return 1
  fi
}

test_stats_dashboard() {
  log_test "Stats dashboard"
  local body=$(curl -s "$API_URL/stats/dashboard" \
    -H "Authorization: Bearer $TOKEN")

  local success=$(echo "$body" | jq -r '.success')
  if [ "$success" != "true" ]; then
    log_fail "success=$success — $(echo "$body" | jq -r '.error // .message')"
    return 1
  fi

  local projects=$(echo "$body" | jq -r '.data.counts.projects')
  local entities=$(echo "$body" | jq -r '.data.counts.entities')
  log_pass "Stats OK (projets: $projects, entités: $entities)"
}

test_stats_cache() {
  log_test "Stats cache (2ème appel doit être cached)"
  curl -s "$API_URL/stats/dashboard" -H "Authorization: Bearer $TOKEN" > /dev/null

  local cached=$(curl -s "$API_URL/stats/dashboard" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.cached')

  if [ "$cached" = "true" ]; then
    log_pass "Cache fonctionnel"
  else
    log_warn "Cache miss (possible si TTL expiré)"
  fi
}

test_search() {
  log_test "Recherche globale"
  local http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    "$API_URL/search?q=test" \
    -H "Authorization: Bearer $TOKEN")

  if [ "$http_code" = "200" ]; then
    log_pass "Search répond (HTTP 200)"
  else
    log_fail "HTTP $http_code"
    return 1
  fi
}

test_projects_list() {
  log_test "Liste des projets"
  local body=$(curl -s "$API_URL/projects" \
    -H "Authorization: Bearer $TOKEN")

  local success=$(echo "$body" | jq -r '.success')
  if [ "$success" = "true" ]; then
    local count=$(echo "$body" | jq '.data | length')
    log_pass "$count projet(s)"
  else
    log_fail "Réponse invalide"
    return 1
  fi
}

test_unauthorized() {
  log_test "Accès sans token (doit échouer)"
  local http_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/projects")

  if [ "$http_code" = "401" ]; then
    log_pass "Rejet correct (HTTP 401)"
  else
    log_fail "Attendu 401, reçu $http_code"
    return 1
  fi
}

# ============================================================
# MAIN
# ============================================================

main() {
  echo ""
  echo "🔍 Smoke test — Ebeno Research Platform"
  echo "   API : $API_URL"
  echo ""

  check_dependencies

  test_health
  test_breakers
  test_login_invalid

  if test_login; then
    # Ces tests nécessitent un token
    test_unauthorized
    test_projects_list
    test_stats_dashboard
    test_stats_cache
    test_search
  fi

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ $FAILED -eq 0 ]; then
    echo -e "  ${GREEN}✅ Tous les tests passent ($PASSED/$((PASSED + FAILED)))${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
  else
    echo -e "  ${RED}❌ $FAILED échec(s) sur $((PASSED + FAILED)) tests${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
  fi
}

main
