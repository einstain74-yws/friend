# .env.local 의 VITE_SUPABASE_* 를 GitHub Actions 저장소 시크릿으로 등록합니다.
# 사전: GitHub CLI 설치 후 한 번 `gh auth login` 실행
$ErrorActionPreference = "Stop"
$gh = "${env:ProgramFiles}\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { $gh = "gh" }

$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Error ".env.local 이 없습니다."
}

$url = $null
$key = $null
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  $line = ($_ -split '#', 2)[0].Trim()
  if ($line -match '^\s*VITE_SUPABASE_URL\s*=\s*(.+)$') { $url = $matches[1].Trim().Trim('"').Trim("'") }
  if ($line -match '^\s*VITE_SUPABASE_ANON_KEY\s*=\s*(.+)$') { $key = $matches[1].Trim().Trim('"').Trim("'") }
}
if (-not $url -or -not $key) {
  Write-Error ".env.local 에 VITE_SUPABASE_URL 과 VITE_SUPABASE_ANON_KEY 가 필요합니다."
}

$prevErr = $ErrorActionPreference
$ErrorActionPreference = 'SilentlyContinue'
$null = & $gh auth status 2>&1
$loggedIn = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevErr
if (-not $loggedIn) {
  Write-Host "GitHub 로그인이 필요합니다. 아래를 실행한 뒤 이 스크립트를 다시 실행하세요."
  Write-Host "  & `"$gh`" auth login"
  exit 1
}

$remote = (& git -C $root remote get-url origin 2>$null)
if ($remote -match "github\.com[:/]([^/]+)/([^/.]+)") {
  $repo = "$($Matches[1])/$($Matches[2])"
} else {
  Write-Error "git origin 이 github.com 이 아닙니다."
}

Write-Host "저장소: $repo"
& $gh secret set VITE_SUPABASE_URL --body $url -R $repo
& $gh secret set VITE_SUPABASE_ANON_KEY --body $key -R $repo
Write-Host "완료: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 가 Actions 시크릿에 등록되었습니다."
