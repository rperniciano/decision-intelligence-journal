# Ralph Wiggum - Long-running AI agent loop (Claude Code Edition)
# Usage: .\ralph.ps1 [-MaxIterations 10]
# Requires: claude CLI, jq (optional, for JSON parsing)

param(
    [int]$MaxIterations = 10
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PrdFile = Join-Path $ScriptDir "prd.json"
$ProgressFile = Join-Path $ScriptDir "progress.txt"
$ArchiveDir = Join-Path $ScriptDir "archive"
$LastBranchFile = Join-Path $ScriptDir ".last-branch"

# Helper function to read JSON property
function Get-JsonProperty {
    param($FilePath, $Property)
    if (Test-Path $FilePath) {
        try {
            $json = Get-Content $FilePath -Raw | ConvertFrom-Json
            return $json.$Property
        } catch {
            return $null
        }
    }
    return $null
}

# Archive previous run if branch changed
if ((Test-Path $PrdFile) -and (Test-Path $LastBranchFile)) {
    $CurrentBranch = Get-JsonProperty -FilePath $PrdFile -Property "branchName"
    $LastBranch = Get-Content $LastBranchFile -ErrorAction SilentlyContinue

    if ($CurrentBranch -and $LastBranch -and ($CurrentBranch -ne $LastBranch)) {
        $Date = Get-Date -Format "yyyy-MM-dd"
        $FolderName = $LastBranch -replace "^ralph/", ""
        $ArchiveFolder = Join-Path $ArchiveDir "$Date-$FolderName"

        Write-Host "Archiving previous run: $LastBranch" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $ArchiveFolder -Force | Out-Null

        if (Test-Path $PrdFile) { Copy-Item $PrdFile $ArchiveFolder }
        if (Test-Path $ProgressFile) { Copy-Item $ProgressFile $ArchiveFolder }

        Write-Host "   Archived to: $ArchiveFolder" -ForegroundColor Gray

        # Reset progress file for new run
        @"
# Ralph Progress Log
Started: $(Get-Date)
---
"@ | Set-Content $ProgressFile
    }
}

# Track current branch
if (Test-Path $PrdFile) {
    $CurrentBranch = Get-JsonProperty -FilePath $PrdFile -Property "branchName"
    if ($CurrentBranch) {
        $CurrentBranch | Set-Content $LastBranchFile
    }
}

# Initialize progress file if it doesn't exist
if (-not (Test-Path $ProgressFile)) {
    @"
# Ralph Progress Log
Started: $(Get-Date)
---
"@ | Set-Content $ProgressFile
}

Write-Host ""
Write-Host "Starting Ralph (Claude Code Edition) - Max iterations: $MaxIterations" -ForegroundColor Cyan
Write-Host ""

for ($i = 1; $i -le $MaxIterations; $i++) {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Magenta
    Write-Host "  Ralph Iteration $i of $MaxIterations" -ForegroundColor Magenta
    Write-Host ("=" * 60) -ForegroundColor Magenta
    Write-Host ""

    # Read the prompt file
    $PromptPath = Join-Path $ScriptDir "prompt.md"
    $PromptContent = Get-Content $PromptPath -Raw

    # Run Claude Code with the ralph prompt
    try {
        $Output = claude -p $PromptContent --dangerously-skip-permissions 2>&1 | Tee-Object -Variable OutputVar
        $Output = $OutputVar -join "`n"
    } catch {
        Write-Host "Error running Claude: $_" -ForegroundColor Red
        $Output = ""
    }

    # Check for completion signal
    if ($Output -match "<promise>COMPLETE</promise>") {
        Write-Host ""
        Write-Host ("=" * 60) -ForegroundColor Green
        Write-Host "  Ralph completed all tasks!" -ForegroundColor Green
        Write-Host "  Completed at iteration $i of $MaxIterations" -ForegroundColor Green
        Write-Host ("=" * 60) -ForegroundColor Green
        exit 0
    }

    Write-Host ""
    Write-Host "Iteration $i complete. Continuing..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Red
Write-Host "  Ralph reached max iterations ($MaxIterations) without completing all tasks." -ForegroundColor Red
Write-Host "  Check $ProgressFile for status." -ForegroundColor Red
Write-Host ("=" * 60) -ForegroundColor Red
exit 1
