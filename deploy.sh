#!/usr/bin/env bash
set -e

# ==============================================================================
# CartSync Docker Deployment Script (Bash)
# Interactive SemVer bump & push to Docker Hub
# ==============================================================================

IMAGE_NAME="paw2fajardo/cartsync"

# 1. Early Docker daemon check
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker daemon is not running. Please start Docker."
  exit 1
fi

# 2. Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
MAJOR=${MAJOR:-1}
MINOR=${MINOR:-0}
PATCH=${PATCH:-0}

NEXT_PATCH="${MAJOR}.${MINOR}.$((PATCH + 1))"
NEXT_MINOR="${MAJOR}.$((MINOR + 1)).0"
NEXT_MAJOR="$((MAJOR + 1)).0.0"

BUMP_TYPE="$1"

if [ -z "$BUMP_TYPE" ]; then
  echo ""
  echo "Current version: v${CURRENT_VERSION}"
  echo "Select release version bump:"
  echo "  1) Minimal change (patch: ${CURRENT_VERSION} -> ${NEXT_PATCH})"
  echo "  2) Big change     (minor: ${CURRENT_VERSION} -> ${NEXT_MINOR})"
  echo "  3) Major change   (major: ${CURRENT_VERSION} -> ${NEXT_MAJOR})"
  echo "  4) Keep current   (no bump: ${CURRENT_VERSION})"
  echo ""
  read -p "Enter choice [1-4] (default 1): " choice
  case "$choice" in
    2) BUMP_TYPE="minor" ;;
    3) BUMP_TYPE="major" ;;
    4) BUMP_TYPE="none" ;;
    *) BUMP_TYPE="patch" ;;
  esac
fi

NEW_VERSION="${CURRENT_VERSION}"
case "$BUMP_TYPE" in
  minor|big)
    NEW_VERSION="${NEXT_MINOR}"
    ;;
  major)
    NEW_VERSION="${NEXT_MAJOR}"
    ;;
  patch|minimal)
    NEW_VERSION="${NEXT_PATCH}"
    ;;
  none|keep)
    NEW_VERSION="${CURRENT_VERSION}"
    ;;
  *)
    echo "Error: Invalid bump choice '${BUMP_TYPE}'. Allowed: minimal, big, major, none"
    exit 1
    ;;
esac

# Update package.json if bumped
if [ "$NEW_VERSION" != "$CURRENT_VERSION" ]; then
  echo "==> Bumping version from v${CURRENT_VERSION} to v${NEW_VERSION}..."
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.version = '${NEW_VERSION}';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
  git add package.json
  git commit -m "chore(release): bump version to v${NEW_VERSION}" || true
  git tag "v${NEW_VERSION}" || true
fi

GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
TAG="latest"

echo ""
echo "=================================================="
echo " Deploying CartSync to Docker Hub"
echo " Image:      ${IMAGE_NAME}"
echo " Version:    v${NEW_VERSION}"
echo " Git Commit: ${GIT_COMMIT}"
echo " Tags:       ${TAG}, v${NEW_VERSION}, latest"
echo "=================================================="

echo "==> Building Docker image..."
docker build \
  --build-arg APP_VERSION="${NEW_VERSION}" \
  --build-arg GIT_COMMIT="${GIT_COMMIT}" \
  -t "${IMAGE_NAME}:${TAG}" \
  -t "${IMAGE_NAME}:v${NEW_VERSION}" \
  -t "${IMAGE_NAME}:latest" \
  .

echo "==> Pushing to Docker Hub..."
docker push "${IMAGE_NAME}:${TAG}"
docker push "${IMAGE_NAME}:v${NEW_VERSION}"

echo "=================================================="
echo " Successfully deployed v${NEW_VERSION} to Docker Hub!"
echo "=================================================="
