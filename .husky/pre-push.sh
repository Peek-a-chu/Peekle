#!/bin/sh

echo "🚀 Running pre-push checks..."

# Get the default branch (master or main)
DEFAULT_BRANCH=$(git remote show origin 2>/dev/null | grep 'HEAD branch' | awk '{print $NF}')
if [ -z "$DEFAULT_BRANCH" ]; then
  # Fallback: check if origin/master or origin/main exists
  if git rev-parse --verify origin/master >/dev/null 2>&1; then
    DEFAULT_BRANCH="master"
  elif git rev-parse --verify origin/main >/dev/null 2>&1; then
    DEFAULT_BRANCH="main"
  else
    DEFAULT_BRANCH="master"
  fi
fi

echo "📌 Comparing with origin/$DEFAULT_BRANCH"

# Get changed files in current branch compared to default branch
FILES=$(git diff --name-only origin/$DEFAULT_BRANCH...HEAD 2>/dev/null)
if [ -z "$FILES" ]; then
  # Fallback: compare with merge-base if three-dot diff fails
  MERGE_BASE=$(git merge-base origin/$DEFAULT_BRANCH HEAD 2>/dev/null)
  if [ -n "$MERGE_BASE" ]; then
    FILES=$(git diff --name-only $MERGE_BASE HEAD)
  else
    FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")
  fi
fi

# Check if frontend files changed
FRONTEND_CHANGED=$(echo "$FILES" | grep -E '^apps/frontend/' || true)
# Check if backend files changed
BACKEND_CHANGED=$(echo "$FILES" | grep -E '^apps/backend/' || true)

if [ -z "$FRONTEND_CHANGED" ] && [ -z "$BACKEND_CHANGED" ]; then
  echo "ℹ️ No frontend or backend files changed, skipping checks"
  exit 0
fi

# Frontend checks
if [ -n "$FRONTEND_CHANGED" ]; then
  echo "\n📦 Frontend files changed, running checks..."

  echo "• Running unit tests (vitest)..."
  pnpm --filter frontend test --run
  if [ $? -ne 0 ]; then
    echo "❌ Frontend unit tests failed"
    exit 1
  fi

  echo "• Running E2E tests (playwright)..."
  pnpm --filter frontend test:e2e
  if [ $? -ne 0 ]; then
    echo "❌ Frontend E2E tests failed"
    exit 1
  fi

  echo "• Building..."
  pnpm --filter frontend build
  if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
  fi

  echo "✅ Frontend checks passed"
fi

# Backend checks
if [ -n "$BACKEND_CHANGED" ]; then
  echo "\n☕ Backend files changed, running checks..."
  
  echo "• Running tests..."
  cd apps/backend && chmod +x gradlew
  ./gradlew test --quiet
  if [ $? -ne 0 ]; then
    echo "❌ Backend tests failed"
    exit 1
  fi

  echo "• Building..."
  ./gradlew build -x test --quiet
  if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
  fi
  
  echo "✅ Backend checks passed"
fi

echo "\n✅ All pre-push checks passed!"
