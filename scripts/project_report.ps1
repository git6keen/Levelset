param()

$ts = Get-Date -Format yyyyMMdd_HHmmss
$Out = Join-Path $env:USERPROFILE "Desktop\project_report_$ts.txt"

function W($s){ Add-Content -Path $Out -Value $s }

$ErrorActionPreference = "Continue"
$root = (Get-Location).Path
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
$tsnode = Join-Path $root "node_modules\ts-node\dist\bin.js"

# Header
Remove-Item $Out -ErrorAction SilentlyContinue
W "=== PROJECT REPORT ==="
W "Generated: $(Get-Date -Format s)"
W "Root: $root"
W ""

# Env
W "== ENV =="
W ("Node path: " + ($node ?? "(not found)"))
try { W ("node -v: " + (& $node -v)) } catch {}
$tsc = (Get-Command tsc -ErrorAction SilentlyContinue).Source
W ("tsc path: " + ($tsc ?? "(not found)"))
W ("ts-node bin: " + (Test-Path $tsnode))
W ""

# Ports/processes
W "== PORTS =="
$ports = 8001,5173
foreach($p in $ports){
  $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  if($conns){
    $pids = $conns | Select-Object -Expand OwningProcess -Unique
    foreach($pid in $pids){
      try{
        $proc = Get-Process -Id $pid -ErrorAction Stop
        W ("Port $p -> PID $pid (" + $proc.ProcessName + ")")
      } catch { W ("Port $p -> PID $pid (proc not found)") }
    }
  } else { W "Port $p -> (no listener)" }
}
W ""

# HTTP checks
W "== HTTP CHECKS =="
function ping($url){
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
    W ("[" + $r.StatusCode + "] " + $url + " len=" + $r.RawContentLength)
    if($r.Content){ W ($r.Content.Substring(0,[Math]::Min(400,$r.Content.Length))) }
  } catch {
    W ("[ERR] " + $url + " -> " + $_.Exception.Message)
  }
  W ""
}
ping "http://127.0.0.1:8001/healthz"
ping "http://127.0.0.1:8001/api/tasks"
ping "http://127.0.0.1:8001/api/checklists"

# Server log tail (if you captured errors there earlier)
$log = Join-Path $env:USERPROFILE "Desktop\server_500.log"
if(Test-Path $log){
  W "== server_500.log (tail 120) =="
  Get-Content $log -Tail 120 | ForEach-Object { W $_ }
  W ""
}

# DB schema + sample rows via ts-node (if available)
if(Test-Path $tsnode){
  W "== DB: schema =="
  try { & $node $tsnode .\scripts\inspect_schema.ts 2>&1 | ForEach-Object { W $_ } } catch { W ("inspect_schema ERR: " + $_) }
  W ""
  W "== DB: samples =="
  try { & $node $tsnode .\scripts\diag_sql.ts 2>&1 | ForEach-Object { W $_ } } catch { W ("diag_sql ERR: " + $_) }
  W ""
}

# Key files (first ~120 lines each if present)
function headfile($p,$lines=120){
  if(Test-Path $p){ W "== FILE: $p (head $lines) =="; Get-Content $p -TotalCount $lines | ForEach-Object { W $_ }; W "" }
  else { W "== FILE: $p (missing) =="; W "" }
}
headfile ".\package.json"
headfile ".\tsconfig.json"
headfile ".\vite.config.ts"
headfile ".\index.html"
headfile ".\main.tsx"
headfile ".\App.tsx"
headfile ".\api.ts"
headfile ".\TasksPage.tsx"
headfile ".\ChecklistsPage.tsx"
headfile ".\TopNav.tsx"
headfile ".\style.css"
headfile ".\server.ts"
headfile ".\features.ts"
headfile ".\trace.ts"
headfile ".\validate.ts"

W "=== END OF REPORT ==="
Write-Host ("Report written: " + $Out) -ForegroundColor Green
