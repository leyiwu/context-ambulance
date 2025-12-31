# PowerShell script to create simple icon placeholders
# Run this from the extension/ directory

Write-Host "Creating icon placeholder files..." -ForegroundColor Cyan

# Create icons directory
New-Item -ItemType Directory -Force -Path "icons" | Out-Null

# We'll create simple SVG files that Chrome can display
# Note: Chrome extensions support SVG for icons in manifest v3

$svg16 = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <rect width="16" height="16" fill="#667eea" rx="3"/>
  <text x="8" y="12" font-size="10" text-anchor="middle" fill="white">🚑</text>
</svg>
"@

$svg48 = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" fill="#667eea" rx="8"/>
  <text x="24" y="35" font-size="28" text-anchor="middle" fill="white">🚑</text>
</svg>
"@

$svg128 = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" fill="url(#grad)" rx="20"/>
  <text x="64" y="90" font-size="72" text-anchor="middle" fill="white">🚑</text>
</svg>
"@

# Save SVG files
$svg16 | Out-File -FilePath "icons/icon16.svg" -Encoding utf8
$svg48 | Out-File -FilePath "icons/icon48.svg" -Encoding utf8
$svg128 | Out-File -FilePath "icons/icon128.svg" -Encoding utf8

Write-Host "SVG icons created in icons/ directory" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Chrome may require PNG files for best compatibility." -ForegroundColor Yellow
Write-Host "To convert SVG to PNG:" -ForegroundColor Yellow
Write-Host "1. Open each SVG in a browser" -ForegroundColor Yellow
Write-Host "2. Take a screenshot" -ForegroundColor Yellow
Write-Host "3. Save as icon16.png, icon48.png, icon128.png" -ForegroundColor Yellow

