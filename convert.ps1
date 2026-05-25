Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap('assets/images/onboarding_3_fixed.png')
$bmp.Save('assets/images/onboarding_3_final.jpg', [System.Drawing.Imaging.ImageFormat]::Jpeg)
$bmp.Dispose()
