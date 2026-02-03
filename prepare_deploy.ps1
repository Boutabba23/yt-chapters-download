# prepare_deploy.ps1

$source = Get-Location
$destination = "$source\deploy_package"

# Create destination folder
if (Test-Path $destination) {
    Remove-Item $destination -Recurse -Force
}
New-Item -ItemType Directory -Path $destination | Out-Null

Write-Host "📦 Preparing files for deployment..." -ForegroundColor Cyan

# List of files/folders to copy
$items = @(
    "src",
    "public",
    "backend",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "Dockerfile",
    ".dockerignore",
    "README.md"
)

foreach ($item in $items) {
    if (Test-Path "$source\$item") {
        Copy-Item -Path "$source\$item" -Destination "$destination\$item" -Recurse
        Write-Host "  + Copied $item" -ForegroundColor Green
    } else {
        Write-Host "  ! Warning: $item not found" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Ready! Folder created at: $destination" -ForegroundColor Cyan
Write-Host "👉 Drag the CONTENTS of the 'deploy_package' folder to Hugging Face." -ForegroundColor White
