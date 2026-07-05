$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "../..")
$payload = Join-Path $root "otto/maestro-payload.json"
$otto = if ($env:OTTO_BIN) { $env:OTTO_BIN } else { "otto" }

function Invoke-Otto {
  param (
    [Parameter(Mandatory=$true)]
    [string[]]$Args
  )

  if ($env:OTTO_DRY_RUN -eq "1") {
    Write-Host "[dry-run] $otto $($Args -join ' ')"
    return
  }

  & $otto @Args
}

if (!(Test-Path $payload)) {
  throw "Missing payload file: $payload"
}

if (($env:OTTO_DRY_RUN -ne "1") -and -not (Get-Command $otto -ErrorAction SilentlyContinue)) {
  throw "Otto CLI not found. Set OTTO_BIN or install Otto first."
}

Invoke-Otto -Args @("ui", "splash", "--product", "maestro")
Invoke-Otto -Args @("self-update", "--channel", "stable")
Invoke-Otto -Args @("maestro", "install", "--payload", $payload, "--channel", "stable")

Write-Host "Maestro bootstrap install flow completed."
