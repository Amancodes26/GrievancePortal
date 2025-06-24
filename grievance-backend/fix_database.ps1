# PowerShell script to run the complete database fix
Write-Host "🔧 Running complete database fix for Campus and Admin issues..." -ForegroundColor Yellow

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL environment variable not set" -ForegroundColor Red
    Write-Host "Please set DATABASE_URL to your PostgreSQL connection string" -ForegroundColor Red
    Write-Host "Example: set DATABASE_URL=postgresql://username:password@localhost:5432/database_name" -ForegroundColor Yellow
    exit 1
}

# Check if psql is available
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "❌ psql command not found" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools or ensure psql is in your PATH" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Running database migrations..." -ForegroundColor Blue

# Run the complete fix
try {
    psql $env:DATABASE_URL -f "Database/COMPLETE_FIX.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database migration completed successfully!" -ForegroundColor Green
        Write-Host "🎉 All foreign key issues have been resolved!" -ForegroundColor Green
        Write-Host ""
        Write-Host "✨ You can now:" -ForegroundColor Cyan
        Write-Host "  • Create admins via the super-admin API" -ForegroundColor White
        Write-Host "  • Upload pre-grievance attachments" -ForegroundColor White
        Write-Host "  • Create grievances with attachments" -ForegroundColor White
        Write-Host ""
        Write-Host "🚀 Test the APIs:" -ForegroundColor Cyan
        Write-Host "  POST /api/v1/super-admin/admins" -ForegroundColor White
        Write-Host "  POST /api/v1/pre-grievance/upload-attachment" -ForegroundColor White
    } else {
        Write-Host "❌ Database migration failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Database migration failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
