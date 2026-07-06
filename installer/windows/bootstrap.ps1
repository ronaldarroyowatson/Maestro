$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "../..")
$ottoEmbeddedPayload = Join-Path $root "otto/payload.json"
$maestroPayload = Join-Path $root "otto/maestro-payload.json"
$otto = Join-Path $root "otto/bin/otto"

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

if (!(Test-Path $ottoEmbeddedPayload)) {
  throw "Missing embedded Otto payload file: $ottoEmbeddedPayload"
}

if (!(Test-Path $maestroPayload)) {
  throw "Missing Maestro payload file: $maestroPayload"
}

if (($env:OTTO_DRY_RUN -ne "1") -and -not (Test-Path $otto)) {
  throw "Embedded Otto binary is missing: $otto"
}

Invoke-Otto -Args @("--payload", $ottoEmbeddedPayload, "--maestro-payload", $maestroPayload, "--channel", "stable")

Write-Host "Maestro embedded Otto bootstrap flow completed."
