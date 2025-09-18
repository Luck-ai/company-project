
[CmdletBinding()]
param(
    [switch]$DryRun,
    [string]$RepoRoot = (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent),
    [string]$DockerComposeCmd = 'docker-compose',
    [string]$BackendPath = "$PSScriptRoot\backend",
    [string]$FrontendPath = "$PSScriptRoot\frontend",
    [int]$PostgresPort = 5432,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000
)

function ExecOrEcho($cmd) {
    if ($DryRun) { Write-Host "DRYRUN: $cmd" -ForegroundColor Yellow }
    else { iex $cmd }
}

Write-Host "Repo root: $RepoRoot"

# 1) Start DB using docker-compose
$composeUp = "$DockerComposeCmd up -d db"
ExecOrEcho $composeUp


function Launch-InNewPwshWindow {
    param(
        [string]$WorkingDirectory,
        [string]$CommandLine
    )

    $activateCandidates = @(
        Join-Path -Path $WorkingDirectory -ChildPath '.venv\Scripts\Activate.ps1'
        Join-Path -Path $RepoRoot -ChildPath '.venv\Scripts\Activate.ps1'
    )

    $activateCmd = $null
    foreach ($candidate in $activateCandidates) {
        if (Test-Path $candidate) {
            # Use the dot-sourcing pattern to run the activation script in the shell
            $activateCmd = ". '$candidate'"
            break
        }
    }

    if ($activateCmd) {
        $inner = "& { Set-Location -Path '$WorkingDirectory'; $activateCmd; $CommandLine }"
    } else {
        $inner = "& { Set-Location -Path '$WorkingDirectory'; $CommandLine }"
    }

    if ($DryRun) {
        Write-Host "DRYRUN: Start-Process pwsh -ArgumentList '-NoExit','-Command', \"$inner\" -WorkingDirectory '$WorkingDirectory'" -ForegroundColor Yellow
    } else {
        Start-Process -FilePath pwsh -ArgumentList @('-NoExit','-Command',$inner) -WorkingDirectory $WorkingDirectory
    }
}

# Launch backend (activate .venv if present)
Launch-InNewPwshWindow -WorkingDirectory $BackendPath -CommandLine "`$env:DATABASE_URL = 'postgresql+asyncpg://postgres:postgres@localhost:$PostgresPort/stockdb'; uvicorn app.main:app --reload --port $BackendPort"

# Launch frontend (activate .venv if present)
Launch-InNewPwshWindow -WorkingDirectory $FrontendPath -CommandLine "npm run dev"

Write-Host "All start commands executed. Use Ctrl+C in the docker-compose context to stop containers, or run '$DockerComposeCmd down' to stop the DB." -ForegroundColor Cyan
