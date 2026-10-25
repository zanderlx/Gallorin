param([string]$Executable = './dist/win-unpacked/Gallorin.exe')
$ErrorActionPreference = 'Stop'
# Separate temporary saves and Chromium profiles for every motion mode.
$root = Join-Path ([System.IO.Path]::GetTempPath()) ('gallorin-smoke-' + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $root | Out-Null
if ($env:GITHUB_ENV) { "SMOKE_DIAGNOSTICS=$root" >> $env:GITHUB_ENV }
foreach ($motion in @('normal', 'reduced')) {
  $env:AETHERION_TEST_DATA = Join-Path $root $motion
  $env:GALLORIN_SMOKE_MOTION = $motion
  $env:AETHERION_SOFTWARE_RENDERING = '1'
  $env:ELECTRON_ENABLE_LOGGING = '1'
  New-Item -ItemType Directory -Path $env:AETHERION_TEST_DATA | Out-Null
  $stdout = Join-Path $env:AETHERION_TEST_DATA 'stdout.log'
  $stderr = Join-Path $env:AETHERION_TEST_DATA 'stderr.log'
  $process = Start-Process -FilePath $Executable -ArgumentList '--smoke-test' -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  $null = $process.Handle
  $timedOut = -not $process.WaitForExit(180000)
  if ($timedOut) { $process.Kill(); $process.WaitForExit() }
  foreach ($file in @($stdout, $stderr, (Join-Path $env:AETHERION_TEST_DATA 'browser/desktop.log'))) {
    if (Test-Path $file) { Write-Host "::group::$motion $(Split-Path $file -Leaf)"; Get-Content $file | Write-Host; Write-Host '::endgroup::' }
  }
  if ($timedOut) { throw "$motion desktop smoke timed out. Diagnostics: $root" }
  if ($process.ExitCode -ne 0 -or -not (Test-Path (Join-Path $env:AETHERION_TEST_DATA 'desktop-smoke.json'))) {
    throw "$motion desktop smoke failed (exit $($process.ExitCode)). Diagnostics: $root"
  }
}
