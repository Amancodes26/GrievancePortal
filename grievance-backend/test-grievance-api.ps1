# Test script for Grievance API
Write-Host "🧪 Testing Grievance API with your exact request..." -ForegroundColor Cyan

# Step 1: Get student token
Write-Host "`n🔐 Step 1: Getting student authentication token..." -ForegroundColor Yellow

$studentBody = @{
    rollNumber = "41522063"
    password = "qwertyuiop"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/users/login" -Method POST -Body $studentBody -ContentType "application/json"
    $studentToken = $loginResponse.token
    Write-Host "✅ Student login successful!" -ForegroundColor Green
    Write-Host "Token (first 30 chars): $($studentToken.Substring(0,30))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Student login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Test your exact grievance creation request
Write-Host "`n📝 Step 2: Creating grievance with your exact payload..." -ForegroundColor Yellow
Write-Host "Endpoint: POST http://localhost:5000/api/v1/grievances" -ForegroundColor Gray

$grievanceBody = @{
    subject = "Internet not working in hostel"
    description = "WiFi has been down for 3 days affecting my studies."
    issueCode = 1003
    campusId = 1
    hasAttachments = $false
} | ConvertTo-Json

$grievanceHeaders = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $studentToken"
}

Write-Host "Payload: $grievanceBody" -ForegroundColor Gray

try {
    $grievanceResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/grievances" -Method POST -Body $grievanceBody -Headers $grievanceHeaders
    
    Write-Host "✅ SUCCESS! Grievance created successfully!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Gray
    $grievanceResponse | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    
    # Extract grievance ID for further testing
    $grievanceId = $grievanceResponse.data.grievanceId
    Write-Host "`n🎯 Grievance ID: $grievanceId" -ForegroundColor Cyan
    
    # Step 3: Test getting the grievance
    Write-Host "`n📖 Step 3: Testing GET request for the created grievance..." -ForegroundColor Yellow
    
    $getResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/grievances/$grievanceId" -Method GET -Headers @{"Authorization" = "Bearer $studentToken"}
    Write-Host "✅ GET request successful!" -ForegroundColor Green
    Write-Host "Retrieved Grievance:" -ForegroundColor Gray
    $getResponse | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    
} catch {
    Write-Host "❌ Error creating/retrieving grievance:" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        try {
            $errorResponse = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorResponse)
            $errorContent = $reader.ReadToEnd()
            Write-Host "Error Response Body: $errorContent" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error response body" -ForegroundColor Red
        }
    }
}

Write-Host "`n🎉 Test completed!" -ForegroundColor Cyan
