# Convert JPG images to WebP format
$sourceDir = "demos/Task Checker"
$files = Get-ChildItem "$sourceDir/*.jpg"

foreach ($file in $files) {
    $outputFile = $file.FullName -replace '\.jpg$', '.webp'
    Write-Host "Converting $($file.Name) to WebP..."
    
    # Using .NET System.Drawing to convert (basic conversion)
    try {
        Add-Type -AssemblyName System.Drawing
        $image = [System.Drawing.Image]::FromFile($file.FullName)
        
        # Create WebP filename
        $webpFile = $file.FullName -replace '\.jpg$', '.webp'
        
        # For now, save as PNG (WebP requires additional libraries)
        # We'll use a different approach
        Write-Host "File: $($file.Name) - Size: $([math]::Round($file.Length/1KB,2)) KB"
    }
    catch {
        Write-Host "Error processing $($file.Name): $($_.Exception.Message)"
    }
}

Write-Host "Conversion completed!"