<#
  win.ps1 — helpers Win32 pour le MCP lotr2.
  Toutes les actions ciblent la fenetre du processus DOSBox.

  Usage :
    powershell -NoProfile -ExecutionPolicy Bypass -File win.ps1 -Action status
    ... -Action focus
    ... -Action capture  -OutPath C:\tmp\shot.png
    ... -Action sendkeys -Keys "{ENTER}"
    ... -Action click    -X 100 -Y 200 [-Button right] [-Double]

  Sortie : une seule ligne JSON sur stdout (ok / err + champs utiles).
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('status', 'focus', 'capture', 'sendkeys', 'click')]
  [string]$Action,

  [string]$Process = 'DOSBox',
  [string]$OutPath,
  [string]$Keys,
  [int]$X,
  [int]$Y,
  [ValidateSet('left', 'right')]
  [string]$Button = 'left',
  [switch]$Double
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;

public static class Win {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hwnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hwnd, ref POINT p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();

  public struct RECT { public int Left, Top, Right, Bottom; }
  public struct POINT { public int X, Y; }
}
"@

# Coordonnees en pixels physiques (coherence ClientToScreen / SetCursorPos / PrintWindow).
[void][Win]::SetProcessDPIAware()

function Get-DosWindow {
  $p = Get-Process -Name $Process -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } |
    Select-Object -First 1
  return $p
}

function Fail([string]$msg) {
  ConvertTo-Json -Compress @{ ok = $false; error = $msg }
  exit 1
}

$proc = Get-DosWindow
if ($null -eq $proc) {
  if ($Action -eq 'status') {
    $running = $null -ne (Get-Process -Name $Process -ErrorAction SilentlyContinue)
    ConvertTo-Json -Compress @{ ok = $true; running = $running; hasWindow = $false }
    exit 0
  }
  Fail "Aucune fenetre $Process trouvee (le jeu est-il lance ?)"
}

$hwnd = $proc.MainWindowHandle

switch ($Action) {

  'status' {
    $r = New-Object Win+RECT
    [void][Win]::GetWindowRect($hwnd, [ref]$r)
    $c = New-Object Win+RECT
    [void][Win]::GetClientRect($hwnd, [ref]$c)
    ConvertTo-Json -Compress @{
      ok = $true; running = $true; hasWindow = $true
      pid = $proc.Id; title = $proc.MainWindowTitle
      window = @{ left = $r.Left; top = $r.Top; width = ($r.Right - $r.Left); height = ($r.Bottom - $r.Top) }
      client = @{ width = $c.Right; height = $c.Bottom }
    }
  }

  'focus' {
    if ([Win]::IsIconic($hwnd)) { [void][Win]::ShowWindow($hwnd, 9) } # SW_RESTORE
    [void][Win]::SetForegroundWindow($hwnd)
    Start-Sleep -Milliseconds 150
    ConvertTo-Json -Compress @{ ok = $true; focused = $true }
  }

  'capture' {
    if (-not $OutPath) { Fail "OutPath requis pour capture" }
    $dir = Split-Path -Parent $OutPath
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }

    $c = New-Object Win+RECT
    [void][Win]::GetClientRect($hwnd, [ref]$c)
    $w = $c.Right; $h = $c.Bottom
    if ($w -le 0 -or $h -le 0) { Fail "Taille fenetre invalide ($w x $h)" }

    # PrintWindow rend la FENETRE entiere (barre de titre comprise). Pour obtenir une image
    # dont (x,y) == coordonnee CLIENT (donc == cible de clic), on rend toute la fenetre puis
    # on recadre la zone client (decalage = origine client - origine fenetre).
    $wr = New-Object Win+RECT
    [void][Win]::GetWindowRect($hwnd, [ref]$wr)
    $ww = $wr.Right - $wr.Left; $wh = $wr.Bottom - $wr.Top
    $co = New-Object Win+POINT; $co.X = 0; $co.Y = 0
    [void][Win]::ClientToScreen($hwnd, [ref]$co)
    $offX = $co.X - $wr.Left; $offY = $co.Y - $wr.Top

    $method = 'printwindow'
    $full = New-Object System.Drawing.Bitmap($ww, $wh)
    $g = [System.Drawing.Graphics]::FromImage($full)
    $hdc = $g.GetHdc()
    # flag 2 = PW_RENDERFULLCONTENT (capture DirectX/surfaces accelerees)
    $ok = [Win]::PrintWindow($hwnd, $hdc, 2)
    $g.ReleaseHdc($hdc)
    $g.Dispose()
    # recadrage de la zone client
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $gc = [System.Drawing.Graphics]::FromImage($bmp)
    $srcRect = New-Object System.Drawing.Rectangle($offX, $offY, $w, $h)
    $dstRect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
    $gc.DrawImage($full, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $gc.Dispose()
    $full.Dispose()

    # Detection "image noire" -> fallback capture ecran (fenetre au premier plan)
    $black = $true
    $stepX = [Math]::Max(1, [int]($w / 16))
    $stepY = [Math]::Max(1, [int]($h / 16))
    for ($yy = 0; $yy -lt $h -and $black; $yy += $stepY) {
      for ($xx = 0; $xx -lt $w -and $black; $xx += $stepX) {
        $px = $bmp.GetPixel($xx, $yy)
        if ($px.R -gt 16 -or $px.G -gt 16 -or $px.B -gt 16) { $black = $false }
      }
    }

    if (-not $ok -or $black) {
      $method = 'screen'
      $bmp.Dispose()
      if ([Win]::IsIconic($hwnd)) { [void][Win]::ShowWindow($hwnd, 9) }
      [void][Win]::SetForegroundWindow($hwnd)
      Start-Sleep -Milliseconds 200
      $wr = New-Object Win+RECT
      [void][Win]::GetWindowRect($hwnd, [ref]$wr)
      # origine du client en coords ecran
      $origin = New-Object Win+POINT
      $origin.X = 0; $origin.Y = 0
      [void][Win]::ClientToScreen($hwnd, [ref]$origin)
      $bmp = New-Object System.Drawing.Bitmap($w, $h)
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.CopyFromScreen($origin.X, $origin.Y, 0, 0, (New-Object System.Drawing.Size($w, $h)))
      $g.Dispose()
    }

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    ConvertTo-Json -Compress @{ ok = $true; path = $OutPath; width = $w; height = $h; method = $method }
  }

  'sendkeys' {
    if (-not $Keys) { Fail "Keys requis pour sendkeys" }
    if ([Win]::IsIconic($hwnd)) { [void][Win]::ShowWindow($hwnd, 9) }
    [void][Win]::SetForegroundWindow($hwnd)
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait($Keys)
    Start-Sleep -Milliseconds 100
    ConvertTo-Json -Compress @{ ok = $true; sent = $Keys }
  }

  'click' {
    if ([Win]::IsIconic($hwnd)) { [void][Win]::ShowWindow($hwnd, 9) }
    [void][Win]::SetForegroundWindow($hwnd)
    Start-Sleep -Milliseconds 150
    $p = New-Object Win+POINT
    $p.X = $X; $p.Y = $Y
    [void][Win]::ClientToScreen($hwnd, [ref]$p)
    # Arrivee progressive : un point voisin puis la cible, pour forcer des WM_MOUSEMOVE
    # que DOSBox/SDL latche avant le clic (sinon le bouton synthetique est ignore).
    [void][Win]::SetCursorPos($p.X - 2, $p.Y - 2)
    Start-Sleep -Milliseconds 40
    [void][Win]::SetCursorPos($p.X, $p.Y)
    Start-Sleep -Milliseconds 120
    # flags : left down=0x02 up=0x04 ; right down=0x08 up=0x10
    if ($Button -eq 'right') { $down = 0x08; $up = 0x10 } else { $down = 0x02; $up = 0x04 }
    [Win]::mouse_event($down, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 90   # maintien : DOSBox doit voir down PUIS up sur 2 frames
    [Win]::mouse_event($up, 0, 0, 0, [UIntPtr]::Zero)
    if ($Double) {
      Start-Sleep -Milliseconds 80
      [Win]::mouse_event($down, 0, 0, 0, [UIntPtr]::Zero)
      Start-Sleep -Milliseconds 90
      [Win]::mouse_event($up, 0, 0, 0, [UIntPtr]::Zero)
    }
    ConvertTo-Json -Compress @{ ok = $true; x = $X; y = $Y; button = $Button; double = [bool]$Double }
  }
}
