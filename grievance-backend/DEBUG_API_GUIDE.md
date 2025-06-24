# Pre-Grievance Attachment API Debug Guide

## Issue: Getting "Not Found" on `/api/v1/pre-grievance/upload-attachment`

### Step 1: Check if Server is Running

1. **Start the development server:**
   ```powershell
   npm run dev
   ```

2. **Or if that doesn't work, try:**
   ```powershell
   npm run build
   npm start
   ```

3. **Check which port the server is running on:**
   - Default is port 5000: `http://localhost:5000`
   - Sometimes port 3000: `http://localhost:3000`

### Step 2: Test Basic Server Connection

Test the basic server endpoint first:
```powershell
# Test if server is responding
curl http://localhost:5000/api/test
# or
curl http://localhost:3000/api/test
```

**Expected response:**
```json
{
  "message": "Test endpoint is working!"
}
```

### Step 3: Test Route Structure

Test the route hierarchy step by step:

1. **Test V1 routes exist:**
   ```powershell
   curl http://localhost:5000/api/v1/grievances
   ```
   Should return 403 (auth required) or 405 (method not allowed), NOT 404

2. **Test pre-grievance base route:**
   ```powershell
   curl http://localhost:5000/api/v1/pre-grievance
   ```

3. **Test the upload endpoint:**
   ```powershell
   curl -X POST http://localhost:5000/api/v1/pre-grievance/upload-attachment
   ```
   Should return 403 (auth required), NOT 404

### Step 4: Common Issues and Solutions

#### Issue 1: TypeScript Not Compiled
**Symptoms:** Server starts but routes return 404
**Solution:**
```powershell
npm run build
npm start
```

#### Issue 2: Development vs Production Mode
**Symptoms:** Routes work in dev but not production
**Solution:** Make sure you're using the right command:
- Development: `npm run dev`
- Production: `npm run build && npm start`

#### Issue 3: Module Import/Export Issues
**Symptoms:** Server crashes on startup or routes not registered
**Solution:** Check the console output for import errors

#### Issue 4: Wrong Base URL
**Symptoms:** All API calls return 404
**Solution:** Make sure you're using the correct URL format:
- ✅ Correct: `http://localhost:5000/api/v1/pre-grievance/upload-attachment`
- ❌ Wrong: `http://localhost:5000/pre-grievance/upload-attachment`
- ❌ Wrong: `http://localhost:5000/api/pre-grievance/upload-attachment`

### Step 5: Test with Authentication

Once the endpoint is found, test with proper JWT:

```powershell
# First, get a JWT token by logging in
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/users/login" -Method POST -Body (@{
    email = "your-email@example.com"
    password = "your-password"
} | ConvertTo-Json) -ContentType "application/json"

$token = $loginResponse.token

# Then test the upload endpoint
$headers = @{
    "Authorization" = "Bearer $token"
}

# Test with a dummy file
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/pre-grievance/upload-attachment" -Method POST -Headers $headers -Form @{
    attachment = Get-Item "path-to-test-file.pdf"
}
```

### Step 6: Check Server Logs

When you start the server with `npm run dev`, check the console output for:
1. ✅ Server startup messages
2. ✅ Database connection messages  
3. ❌ Import/export errors
4. ❌ Route registration errors

### Step 7: Debug with Test Script

Run the PowerShell test script:
```powershell
.\test-api.ps1
```

This will systematically test all endpoints and give you detailed feedback.

### Expected Working Flow

1. **Start server:** `npm run dev`
2. **Console should show:**
   ```
   Server running on http://localhost:5000
   Database connected successfully
   ```
3. **Test basic endpoint:** `GET http://localhost:5000/api/test`
4. **Test upload endpoint:** `POST http://localhost:5000/api/v1/pre-grievance/upload-attachment` (with auth)

### If Still Not Working

1. **Check the exact error in server console**
2. **Verify environment variables are set**
3. **Check database connection**
4. **Look for TypeScript compilation errors**

### Quick Fix Commands

```powershell
# Clean and restart
npm run build
npm start

# Or for development
npm run dev

# Check if TypeScript files are properly compiled
ls dist/
```

The route IS properly implemented and should work. The "Not Found" error suggests the server isn't running properly or there's a compilation issue.
