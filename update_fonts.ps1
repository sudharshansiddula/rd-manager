Get-ChildItem -Path "src" -Recurse -Include *.tsx | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $newContent = $content -replace "fontSize:\s*['""](\d+)px['""]", "fontSize: `calc($1px * var(--text-scale, 1))`"
    if ($content -ne $newContent) {
        Write-Host "Updated $(.Name)"
        [IO.File]::WriteAllText($_.FullName, $newContent)
    }
}
Get-ChildItem -Path "src" -Recurse -Include *.css | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $newContent = $content -replace "font-size:\s*(\d+)px", "font-size: calc($1px * var(--text-scale, 1))"
    if ($content -ne $newContent) {
        Write-Host "Updated CSS $(.Name)"
        [IO.File]::WriteAllText($_.FullName, $newContent)
    }
}
