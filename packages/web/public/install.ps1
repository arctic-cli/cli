$ErrorActionPreference = 'Stop'

$APP = "arctic"
$NPM_REGISTRY = if ($env:NPM_REGISTRY) { $env:NPM_REGISTRY } else { "https://registry.npmjs.org" }

$requestedVersion = $env:VERSION
$requestedTag = if ($env:TAG) { $env:TAG } else { "beta" }

$arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
$os = "windows"
$target = "$os-$arch"
$filename = "$APP-$target.zip"
$packageName = "$APP-$target"

try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri "https://usearctic.sh/api/track/install?os=$os&arch=$arch" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue | Out-Null
} catch {
}

Write-Host "Installing Arctic CLI..." -ForegroundColor Cyan

function Resolve-NpmTagVersion {
    param([string]$tag)
    
    $metaUrl = "$NPM_REGISTRY/@arctic-cli%2F$packageName"
    try {
        $response = Invoke-RestMethod -Uri $metaUrl -ErrorAction Stop
        return $response.'dist-tags'.$tag
    } catch {
        return $null
    }
}

function Test-SemVer {
    param([string]$version)
    return $version -match '^\d+\.\d+\.\d+'
}

$specificVersion = $null
$forceNpmDownload = $false
$url = $null

if ($requestedTag) {
    $specificVersion = Resolve-NpmTagVersion -tag $requestedTag
    if (-not $specificVersion) {
        Write-Host "Failed to resolve npm dist-tag '$requestedTag' for @arctic-cli/$packageName" -ForegroundColor Red
        exit 1
    }
    $forceNpmDownload = $true
} elseif ($requestedVersion) {
    if (Test-SemVer -version $requestedVersion) {
        $url = "https://github.com/arctic-cli/interface/releases/download/v$requestedVersion/$filename"
        $specificVersion = $requestedVersion
    } else {
        $specificVersion = Resolve-NpmTagVersion -tag $requestedVersion
        if (-not $specificVersion) {
            Write-Host "Failed to resolve npm dist-tag '$requestedVersion' for @arctic-cli/$packageName" -ForegroundColor Red
            exit 1
        }
        $forceNpmDownload = $true
    }
} else {
    $specificVersion = Resolve-NpmTagVersion -tag $requestedTag
    if (-not $specificVersion) {
        Write-Host "Failed to resolve npm dist-tag '$requestedTag' for @arctic-cli/$packageName" -ForegroundColor Red
        exit 1
    }
    $forceNpmDownload = $true
}

Write-Host "Version: $specificVersion" -ForegroundColor Gray

$installDir = "$env:USERPROFILE\.arctic\bin"
$arcticExe = "$installDir\arctic.exe"

if (Test-Path $arcticExe) {
    $installedVersion = (& $arcticExe --version 2>$null | Select-Object -First 1).Trim() -replace '^v', ''
    if ($installedVersion -eq $specificVersion) {
        Write-Host "Version $specificVersion already installed" -ForegroundColor Gray
        exit 0
    }
    Write-Host "Installed version: $installedVersion" -ForegroundColor Gray
}

New-Item -ItemType Directory -Force -Path $installDir | Out-Null

$tmpDir = "$env:TEMP\arctic_install_$PID"
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

try {
    Push-Location $tmpDir
    
    if ($forceNpmDownload) {
        $npmUrl = "$NPM_REGISTRY/@arctic-cli/$packageName/-/$packageName-$specificVersion.tgz"
        Write-Host "Downloading from npm..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $npmUrl -OutFile "$packageName.tgz"
        tar -xzf "$packageName.tgz"
        $binaryPath = "package\bin\arctic.exe"
    } else {
        Write-Host "Downloading from GitHub..." -ForegroundColor Gray
        Invoke-WebRequest -Uri $url -OutFile $filename
        Expand-Archive -Path $filename -DestinationPath . -Force
        $binaryPath = "arctic.exe"
        if (-not (Test-Path $binaryPath)) {
            $binaryPath = "bin\arctic.exe"
        }
    }
    
    if (-not (Test-Path $binaryPath)) {
        Write-Host "Unable to locate Arctic binary in downloaded archive" -ForegroundColor Red
        exit 1
    }
    
    Copy-Item -Path $binaryPath -Destination $arcticExe -Force
    
} finally {
    Pop-Location
    Remove-Item -Path $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
}

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$installDir", "User")
    $env:Path = "$env:Path;$installDir"
    Write-Host "Added $installDir to PATH" -ForegroundColor Gray
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Arctic installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Get started:" -ForegroundColor Gray
Write-Host ""
Write-Host "  cd <project>  " -NoNewline; Write-Host "# Open your project" -ForegroundColor DarkGray
Write-Host "  arctic        " -NoNewline; Write-Host "# Launch Arctic" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Docs: " -NoNewline; Write-Host "https://usearctic.sh/docs" -ForegroundColor Cyan
Write-Host ""
