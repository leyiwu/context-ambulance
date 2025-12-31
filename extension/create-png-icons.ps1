Add-Type -AssemblyName System.Drawing

$iconDir = $PSScriptRoot + "\icons"

$sizes = @(16, 48, 128)

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # Gradient background
    $color1 = [System.Drawing.Color]::FromArgb(102, 126, 234)
    $color2 = [System.Drawing.Color]::FromArgb(118, 75, 162)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $color1, $color2, 45)
    $g.FillRectangle($brush, 0, 0, $size, $size)
    
    # White text "CA"
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $fontSize = [Math]::Max(8, [int]($size * 0.4))
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $text = "CA"
    
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $rectF = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $g.DrawString($text, $font, $whiteBrush, $rectF, $format)
    
    # Save
    $outputPath = Join-Path $iconDir "icon$size.png"
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup
    $font.Dispose()
    $whiteBrush.Dispose()
    $brush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    
    Write-Host "Created icon$size.png" -ForegroundColor Green
}

Write-Host "`nAll PNG icons created successfully!" -ForegroundColor Cyan
