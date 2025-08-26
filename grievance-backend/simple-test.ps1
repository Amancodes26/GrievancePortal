# Simple Grievance API Test
Write-Host "Testing Grievance API..."

# Get student token
$studentBody = @{
    rollNumber = "41522063"
    password = "qwertyuiop"
} | ConvertTo-Json

Write-Host "Getting student token..."
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/users/auth/login" -Method POST -Body $studentBody -ContentType "application/json"
    $studentToken = $loginResponse.token
    Write-Host "Login successful!"
} catch {
    Write-Host "Login failed: $($_.Exception.Message)"
    exit 1
}

# Test grievance creation
Write-Host "Creating grievance..."
$grievanceBody = @{
    subject = "Internet not working in hostel"
    description = "WiFi has been down for 3 days affecting my studies."
    issueCode = 1003
    campusId = 1
    hasAttachments = $false
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $studentToken"
}

try {
    $grievanceResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/grievances" -Method POST -Body $grievanceBody -Headers $headers
    Write-Host "SUCCESS! Grievance created:"
    $grievanceResponse | ConvertTo-Json -Depth 5
} catch {
    Write-Host "FAILED: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody"
    }
}
