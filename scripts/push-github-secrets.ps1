# .env.local 의 VITE_* 를 GitHub Actions 저장소 시크릿으로 등록합니다.
# 사전: GitHub CLI 설치 후 한 번 `gh auth login` 실행
$ErrorActionPreference = "Stop"
$gh = "${env:ProgramFiles}\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { $gh = "gh" }

$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Error ".env.local 이 없습니다."
}

$vars = @{}
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  $line = ($_ -split '#', 2)[0].Trim()
  if ($line -match '^\s*(VITE_[A-Z0-9_]+)\s*=\s*(.+)$') {
    $name = $matches[1]
    $val = $matches[2].Trim().Trim('"').Trim("'")
    if ($val) { $vars[$name] = $val }
  }
}

$requiredFb = @('VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID')
$hasFirebase = ($requiredFb | ForEach-Object { $vars.ContainsKey($_) -and $vars[$_] }) -notcontains $false
$hasSupabase = $vars.ContainsKey('VITE_SUPABASE_URL') -and $vars.ContainsKey('VITE_SUPABASE_ANON_KEY') -and $vars['VITE_SUPABASE_URL'] -and $vars['VITE_SUPABASE_ANON_KEY']

if (-not $hasFirebase -and -not $hasSupabase) {
  Write-Error ".env.local 에 Supabase(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) 또는 Firestore(VITE_FIREBASE_*) 가 필요합니다."
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
foreach ($pair in $vars.GetEnumerator()) {
  $n = $pair.Key
  if ($n -notmatch '^VITE_') { continue }
  if ($n -match '^VITE_FIREBASE_' -or $n -match '^VITE_SUPABASE_' -or $n -eq 'VITE_BASE_PATH' -or $n -eq 'VITE_DATA_BACKEND') {
    Write-Host "secret set $n"
    & $gh secret set $n --body $pair.Value -R $repo
  }
}
Write-Host "완료: .env.local 의 VITE_* (Supabase/Firebase/BASE_PATH/DATA_BACKEND) 가 등록되었습니다(해당 키가 있을 때)."
