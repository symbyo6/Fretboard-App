$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$root = (Get-Location).Path
$target = Join-Path $root 'Fretboard-App-Standalone\electron.exe'
$working = Join-Path $root 'Fretboard-App-Standalone'
$arguments = '"resources\app"'
$shortcut = $shell.CreateShortcut((Join-Path $desktop 'Fretboard App - Standalone.lnk'))
$shortcut.TargetPath = $target
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = $working
$shortcut.Description = 'Fretboard App independiente'
$shortcut.IconLocation = "$target,0"
$shortcut.Save()
Write-Output "target=$target"
Write-Output "working=$working"
