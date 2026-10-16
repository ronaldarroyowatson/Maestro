param(
  [string]$InstallRoot = "$env:USERPROFILE\Maestro-Otto",
  [string]$ManifestPath = "",
  [ValidateSet("Install", "Repair", "Validate")]
  [string]$Mode = "Install",
  [switch]$OpenManifest,
  [switch]$PrintManifest,
  [switch]$DryRun,
  [string]$TracePath = "",
  [switch]$VerifySignatures
)

$ErrorActionPreference = "Stop"

function Write-Log {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [ValidateSet("INFO", "WARN", "ERROR", "OK")]
    [string]$Level = "INFO"
  )

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "[$timestamp] [$Level] $Message"
}

function Resolve-MaestroRoot {
  $candidate = Resolve-Path (Join-Path $PSScriptRoot "../..")
  return $candidate.Path
}

function Get-ManifestPath {
  param(
    [string]$InputPath,
    [string]$MaestroRoot
  )

  if (![string]::IsNullOrWhiteSpace($InputPath)) {
    return (Resolve-Path $InputPath).Path
  }

  return (Join-Path $MaestroRoot "installer/windows/maestro-install-manifest.json")
}

function Ensure-Tool {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Required tool '$Name' was not found in PATH."
  }
}

function Ensure-InstallRootWritable {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RootPath
  )

  try {
    New-Item -ItemType Directory -Force -Path $RootPath | Out-Null
    $probe = Join-Path $RootPath ".maestro-write-probe.tmp"
    "ok" | Set-Content -Path $probe -Encoding UTF8
    Remove-Item -Force $probe
  } catch [System.UnauthorizedAccessException] {
    throw "Install path is not writable: '$RootPath'. Run elevated (Administrator) or choose a writable path (for example under `$env:USERPROFILE)."
  } catch {
    throw "Install path validation failed for '$RootPath': $($_.Exception.Message)"
  }
}

function Invoke-WithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Action,
    [int]$Attempts = 3,
    [int]$DelaySeconds = 2,
    [Parameter(Mandatory = $true)]
    [string]$Description
  )

  for ($i = 1; $i -le $Attempts; $i += 1) {
    try {
      & $Action
      return
    } catch {
      if ($i -eq $Attempts) {
        throw "Failed after $Attempts attempt(s): $Description. Error: $($_.Exception.Message)"
      }
      Write-Log "Retrying ($i/$Attempts): $Description. Error: $($_.Exception.Message)" "WARN"
      Start-Sleep -Seconds $DelaySeconds
    }
  }
}

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args,
    [string]$WorkingDirectory = ""
  )

  if ($DryRun) {
    if ([string]::IsNullOrWhiteSpace($WorkingDirectory)) {
      Write-Log "[dry-run] git $($Args -join ' ')" "INFO"
    } else {
      Write-Log "[dry-run] (cd $WorkingDirectory) git $($Args -join ' ')" "INFO"
    }
    return
  }

  if ([string]::IsNullOrWhiteSpace($WorkingDirectory)) {
    & git @Args | Out-Host
    $exitCode = $LASTEXITCODE
  } else {
    Push-Location $WorkingDirectory
    try {
      & git @Args | Out-Host
      $exitCode = $LASTEXITCODE
    } finally {
      Pop-Location
    }
  }

  if ($exitCode -ne 0) {
    throw "Git command failed: git $($Args -join ' ')"
  }
}

function Test-RepositoryHealthy {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
  )

  return (Test-Path (Join-Path $RepoPath ".git"))
}

function Ensure-Repository {
  param(
    [Parameter(Mandatory = $true)]
    $Repo,
    [Parameter(Mandatory = $true)]
    [string]$RootPath
  )

  $repoPath = Join-Path $RootPath $Repo.installSubPath
  $ref = if ([string]::IsNullOrWhiteSpace([string]$Repo.ref)) { "main" } else { [string]$Repo.ref }
  $branchRef = "origin/$ref"

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $repoPath) | Out-Null

  if (-not (Test-RepositoryHealthy -RepoPath $repoPath)) {
    if (Test-Path $repoPath) {
      Write-Log "Repository directory for '$($Repo.id)' exists but is unhealthy. Rebuilding." "WARN"
      if (-not $DryRun) {
        Remove-Item -Recurse -Force $repoPath
      }
    }

    Write-Log "Cloning $($Repo.id) from $($Repo.url)"
    Invoke-WithRetry -Description "clone $($Repo.id)" -Action {
      Invoke-Git -Args @("clone", "--depth", "1", "--branch", $ref, [string]$Repo.url, $repoPath)
    }
    return $repoPath.Trim()
  }

  Write-Log "Updating existing repository '$($Repo.id)'"
  Invoke-WithRetry -Description "fetch $($Repo.id)" -Action {
    Invoke-Git -WorkingDirectory $repoPath -Args @("fetch", "--prune", "origin")
  }

  Invoke-WithRetry -Description "checkout $($Repo.id)" -Action {
    Invoke-Git -WorkingDirectory $repoPath -Args @("checkout", $ref)
  }

  Invoke-WithRetry -Description "reset $($Repo.id)" -Action {
    Invoke-Git -WorkingDirectory $repoPath -Args @("reset", "--hard", $branchRef)
  }

  return $repoPath.Trim()
}

function Repair-Repository {
  param(
    [Parameter(Mandatory = $true)]
    $Repo,
    [Parameter(Mandatory = $true)]
    [string]$RepoPath
  )

  $ref = if ([string]::IsNullOrWhiteSpace([string]$Repo.ref)) { "main" } else { [string]$Repo.ref }
  $branchRef = "origin/$ref"

  Write-Log "Repairing repository '$($Repo.id)'" "WARN"
  Invoke-WithRetry -Description "repair fetch $($Repo.id)" -Action {
    Invoke-Git -WorkingDirectory $RepoPath -Args @("fetch", "--prune", "origin")
  }
  Invoke-WithRetry -Description "repair reset $($Repo.id)" -Action {
    Invoke-Git -WorkingDirectory $RepoPath -Args @("reset", "--hard", $branchRef)
  }
}

function Assert-RequiredFiles {
  param(
    [Parameter(Mandatory = $true)]
    $Repo,
    [Parameter(Mandatory = $true)]
    [string]$RepoPath,
    [switch]$AllowRepair
  )

  $normalizedRepoPath = $RepoPath.Trim()
  Write-Log "Checking required files for '$($Repo.id)' in '$normalizedRepoPath'"

  function Get-MissingRequiredFiles {
    $missingItems = @()
    foreach ($required in $Repo.requiredFiles) {
      $fullPath = Join-Path $normalizedRepoPath ([string]$required)
      $exists = Test-Path -LiteralPath $fullPath
      if (-not $exists) {
        $missingItems += [string]$required
      }
    }
    return $missingItems
  }

  $missing = @()
  for ($attempt = 1; $attempt -le 5; $attempt += 1) {
    $missing = Get-MissingRequiredFiles
    if ($missing.Count -eq 0) {
      break
    }
    if ($attempt -lt 5) {
      Start-Sleep -Seconds 1
    }
  }

  if ($missing.Count -eq 0) {
    Write-Log "Verified required files for '$($Repo.id)'" "OK"
    return
  }

  Write-Log "Missing required files in '$($Repo.id)': $($missing -join ', ')" "WARN"
  if ($AllowRepair) {
    Repair-Repository -Repo $Repo -RepoPath $RepoPath
    $retryMissing = Get-MissingRequiredFiles
    if ($retryMissing.Count -eq 0) {
      Write-Log "Recovered missing files for '$($Repo.id)'" "OK"
      return
    }
    throw "Repair failed for '$($Repo.id)'. Missing files remain: $($retryMissing -join ', ')"
  }

  throw "Missing required files in '$($Repo.id)': $($missing -join ', ')"
}

function Validate-Contracts {
  param(
    [Parameter(Mandatory = $true)]
    $Manifest,
    [Parameter(Mandatory = $true)]
    [string]$RootPath
  )

  $repoIndex = @{}
  foreach ($repo in $Manifest.repositories) {
    $repoIndex[[string]$repo.id] = (Join-Path $RootPath ([string]$repo.installSubPath))
  }

  foreach ($contract in $Manifest.contracts) {
    $repoId = [string]$contract.repository
    if (-not $repoIndex.ContainsKey($repoId)) {
      throw "Contract '$($contract.id)' references unknown repository '$repoId'"
    }
    $contractPath = Join-Path $repoIndex[$repoId] ([string]$contract.path)
    if (-not (Test-Path -LiteralPath $contractPath)) {
      throw "Contract '$($contract.id)' missing file: $contractPath"
    }
    Write-Log "Validated contract '$($contract.id)' at $contractPath" "OK"
  }
}

function Write-InstallState {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RootPath,
    [Parameter(Mandatory = $true)]
    [string]$ManifestFile,
    [Parameter(Mandatory = $true)]
    [string]$ModeUsed
  )

  $state = [pscustomobject]@{
    completedAt = (Get-Date).ToString("o")
    mode = $ModeUsed
    manifest = $ManifestFile
    installRoot = $RootPath
    status = "ok"
  }

  $statePath = Join-Path $RootPath "install-state.json"
  $state | ConvertTo-Json -Depth 5 | Set-Content -Path $statePath -Encoding UTF8
  Write-Log "Wrote install state: $statePath" "OK"
}

function Report-SigningStatus {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Paths
  )

  foreach ($target in $Paths) {
    if (-not (Test-Path -LiteralPath $target)) {
      Write-Log "Signature check skipped (missing file): $target" "WARN"
      continue
    }
    try {
      $signature = Get-AuthenticodeSignature -FilePath $target
      $status = [string]$signature.Status
      if ($status -eq "Valid") {
        Write-Log "Signature valid: $target" "OK"
      } else {
        Write-Log "Signature status '$status' for: $target" "WARN"
      }
    } catch {
      Write-Log "Signature check failed for '$target': $($_.Exception.Message)" "WARN"
    }
  }
}

$transcriptStarted = $false
if (-not [string]::IsNullOrWhiteSpace($TracePath)) {
  $traceDir = Split-Path -Parent $TracePath
  if (-not [string]::IsNullOrWhiteSpace($traceDir) -and -not (Test-Path -LiteralPath $traceDir)) {
    New-Item -ItemType Directory -Force -Path $traceDir | Out-Null
  }
  Start-Transcript -Path $TracePath -Force | Out-Null
  $transcriptStarted = $true
}

try {
  $maestroRoot = Resolve-MaestroRoot
  $resolvedManifest = Get-ManifestPath -InputPath $ManifestPath -MaestroRoot $maestroRoot

  if (-not (Test-Path $resolvedManifest)) {
    throw "Manifest file not found: $resolvedManifest"
  }

  if ($OpenManifest) {
    $process = Start-Process notepad.exe $resolvedManifest -PassThru
    Write-Log "Opened manifest in Notepad: $resolvedManifest (PID: $($process.Id))"
  }

  if ($PrintManifest) {
    Write-Host "Manifest path: $resolvedManifest"
    Get-Content $resolvedManifest
  }

  $manifest = Get-Content $resolvedManifest -Raw | ConvertFrom-Json
  if (-not $manifest.repositories -or $manifest.repositories.Count -eq 0) {
    throw "Manifest has no repositories: $resolvedManifest"
  }

  Ensure-Tool -Name "git"

  if ($Mode -eq "Install" -or $Mode -eq "Repair") {
    Ensure-Tool -Name "node"
    Ensure-Tool -Name "npm"
  }

  Write-Log "Starting mode '$Mode' using manifest '$resolvedManifest'"
  Write-Log "Install root: $InstallRoot"

  if (-not $DryRun) {
    Ensure-InstallRootWritable -RootPath $InstallRoot
  }

  foreach ($repo in $manifest.repositories) {
    $repoPath = [string](Ensure-Repository -Repo $repo -RootPath $InstallRoot)
    Write-Log "Resolved repository path for '$($repo.id)': [$repoPath]"
    Write-Log "Repository path exists for '$($repo.id)': $(Test-Path -LiteralPath $repoPath)"
    Assert-RequiredFiles -Repo $repo -RepoPath $repoPath -AllowRepair:($Mode -ne "Validate")
  }

  Validate-Contracts -Manifest $manifest -RootPath $InstallRoot

  if ($VerifySignatures) {
    $signingTargets = @(
      (Join-Path $InstallRoot "repos/maestro/installer/windows/bootstrap.ps1")
    )
    Report-SigningStatus -Paths $signingTargets
  }

  if (-not $DryRun) {
    Write-InstallState -RootPath $InstallRoot -ManifestFile $resolvedManifest -ModeUsed $Mode
  }

  Write-Log "Minimal Otto + Maestro installation flow completed successfully." "OK"
} finally {
  if ($transcriptStarted) {
    Stop-Transcript | Out-Null
  }
}
