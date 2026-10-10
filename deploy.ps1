# ==============================================================================
# CartSync Docker Deployment Script (PowerShell)
# Interactive SemVer bump & push to Docker Hub
# ==============================================================================
param(
    [string]$Bump = "", # "patch" / "minor" / "major" / "none"
    [string]$Tag = ""
)

$ErrorActionPreference = "Stop"
$ImageName = "paw2fajardo/cartsync"

# 1. Check if Docker engine is running early
try {
    $null = & docker info --format '{{.ServerVersion}}' 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker exited with code $LASTEXITCODE"
    }
} catch {
    Write-Error "Docker daemon is not running. Please start Docker Desktop and try again."
    exit 1
}

# 2. Determine current version from package.json
$pkg = Get-Content -Raw "package.json" | ConvertFrom-Json
$currentVersion = $pkg.version
if (-not $currentVersion) { $currentVersion = "1.0.0" }

$parts = $currentVersion.Split('.') | ForEach-Object { [int]$_ }
while ($parts.Count -lt 3) { $parts += 0 }

$nextPatch = "$($parts[0]).$($parts[1]).$($parts[2] + 1)"
$nextMinor = "$($parts[0]).$($parts[1] + 1).0"
$nextMajor = "$($parts[0] + 1).0.0"

$choice = $Bump.ToLower()

if (-not $choice) {
    Write-Host ""
    Write-Host "Current version: v$currentVersion" -ForegroundColor Cyan
    Write-Host "Select release version bump:" -ForegroundColor Yellow
    Write-Host "  1) Minimal change (patch: $currentVersion -> $nextPatch)"
    Write-Host "  2) Big change     (minor: $currentVersion -> $nextMinor)"
    Write-Host "  3) Major change   (major: $currentVersion -> $nextMajor)"
    Write-Host "  4) Keep current   (no bump: $currentVersion)"
    Write-Host ""
    $inputChoice = Read-Host "Enter choice [1-4] (default 1)"

    switch ($inputChoice) {
        "2" { $choice = "minor" }
        "3" { $choice = "major" }
        "4" { $choice = "none" }
        default { $choice = "patch" }
    }
}

$newVersion = $currentVersion

if ($choice -eq "minor" -or $choice -eq "big") {
    $newVersion = $nextMinor
} elseif ($choice -eq "major") {
    $newVersion = $nextMajor
} elseif ($choice -eq "patch" -or $choice -eq "minimal") {
    $newVersion = $nextPatch
} elseif ($choice -eq "none" -or $choice -eq "keep") {
    $newVersion = $currentVersion
} else {
    Write-Error "Invalid bump choice: $choice. Allowed values: minimal (patch), big (minor), major, none."
    exit 1
}

# Update package.json if bumped
if ($newVersion -ne $currentVersion) {
    Write-Host "==> Bumping version from v$currentVersion to v$newVersion..." -ForegroundColor Green
    $pkg.version = $newVersion
    $pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Encoding UTF8

    try {
        git add package.json
        git commit -m "chore(release): bump version to v$newVersion"
        git tag "v$newVersion"
        Write-Host "==> Created git tag v$newVersion" -ForegroundColor Green
    } catch {
        Write-Warning "Could not automatically commit/tag git: $_"
    }
}

$GitCommit = (git rev-parse --short HEAD 2>$null)
if (-not $GitCommit) { $GitCommit = "unknown" }

if (-not $Tag) { $Tag = "latest" }

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Deploying CartSync to Docker Hub" -ForegroundColor Cyan
Write-Host " Image:      $ImageName"
Write-Host " Version:    v$newVersion"
Write-Host " Git Commit: $GitCommit"
Write-Host " Tags:       $Tag, v$newVersion, latest"
Write-Host "=================================================="

Write-Host "==> Building Docker image..." -ForegroundColor Green
docker build `
  --build-arg "APP_VERSION=$newVersion" `
  --build-arg "GIT_COMMIT=$GitCommit" `
  -t "$ImageName`:$Tag" `
  -t "$ImageName`:v$newVersion" `
  -t "$ImageName`:latest" `
  .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed."
    exit 1
}

Write-Host "==> Pushing to Docker Hub..." -ForegroundColor Green
docker push "$ImageName`:$Tag"
if ($LASTEXITCODE -ne 0) { exit 1 }

docker push "$ImageName`:v$newVersion"
if ($LASTEXITCODE -ne 0) { exit 1 }

if ($Tag -ne "latest") {
    docker push "$ImageName`:latest"
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Successfully deployed v$newVersion to Docker Hub!" -ForegroundColor Green
Write-Host "=================================================="
