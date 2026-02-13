#!/usr/bin/env pwsh
# Setup script for M-Auth React Test Frontend

Write-Host "🚀 M-Auth React Test Frontend Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js $nodeVersion detected" -ForegroundColor Green
Write-Host ""

# Navigate to react-test directory
$reactTestPath = Join-Path $PSScriptRoot "react-test"
if (-not (Test-Path $reactTestPath)) {
    Write-Host "❌ react-test directory not found!" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Navigating to react-test directory..." -ForegroundColor Yellow
Set-Location $reactTestPath

# Install dependencies
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Ensure M-Auth backend is running on http://localhost:3000" -ForegroundColor White
Write-Host "   Run: npm start (in the main project directory)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start the React test frontend:" -ForegroundColor White
Write-Host "   cd react-test" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Open your browser at http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Happy testing!" -ForegroundColor Green
