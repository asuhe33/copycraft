# 把 electron-builder 的 win-unpacked 产物打包成 zip
# 适用于：签名失败但 exe 完整的分发场景
# 用户解压后双击 CopyCraft.exe 启动（SmartScreen 弹窗属正常，点"仍要运行"）
#
# 运行：PowerShell -ExecutionPolicy Bypass -File scripts/package-desktop-zip.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "release\win-unpacked"
$out = Join-Path $root "release\CopyCraft-0.1.0-win-portable.zip"

if (-not (Test-Path $src)) {
  Write-Error "找不到 $src，请先 npm run electron:build"
  exit 1
}

if (Test-Path $out) { Remove-Item $out -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($src, $out)

$size = (Get-Item $out).Length
$sizeMb = [math]::Round($size / 1MB, 1)
Write-Host "打包完成: $out ($sizeMb MB)"
