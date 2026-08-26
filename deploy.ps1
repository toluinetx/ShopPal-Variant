$RepoUrl = "https://github.com/toluinetx/ShopPal"
$Branch = "main"
$ProjectDir = "ShopPal"

if (Test-Path "$ProjectDir\.git" -PathType Container) {
    Push-Location $ProjectDir
    git checkout "$Branch"
    git pull origin "$Branch"
    Pop-Location
}
else {
    if ($env:GITHUB_TOKEN) {
        git clone "https://$($env:GITHUB_TOKEN)@github.com/toluinetx/ShopPal" $ProjectDir
    }
    else {
        git clone "$RepoUrl" $ProjectDir
    }
}

Push-Location $ProjectDir
try {
    docker compose up --build -d
}
finally {
    Pop-Location
}

Write-Host "Waiting for server to become ready..."
$ready = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $null = Invoke-RestMethod -Uri "http://localhost:3000/ready" -ErrorAction Stop
        Write-Host "Server is ready."
        $ready = $true
        break
    }
    catch {
        Start-Sleep -Seconds 2
    }
}

if (-not $ready) {
    Write-Warning "Server did not become ready within 60 seconds."
}

Write-Host "Deployed:"
Write-Host "  App:              http://localhost:8087"
Write-Host "  Admin panel:      http://localhost:8090  (login: admin / Admin123!)"
Write-Host "  Server API docs:  http://localhost:3000/docs"
Write-Host "  Support API docs: http://localhost:8086/docs"
Write-Host "  Notifications API docs: http://localhost:8085/docs"
