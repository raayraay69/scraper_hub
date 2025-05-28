# run-job-scrapers.ps1
# This script manually runs the job scrapers

# Check if a company name was provided
param (
    [string]$company = ""
)

# Set up the API endpoint
$apiUrl = "https://api.naptownhub.com/api/jobs/scrape"
if ($company) {
    $apiUrl = "$apiUrl/$company"
}

# Get the admin token
$token = Read-Host "Enter admin JWT token"

# Make the API request
Write-Host "Running job scrapers..."
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers
    Write-Host "Job scraping completed successfully!" -ForegroundColor Green
    Write-Host $response.message
} catch {
    Write-Host "Error running job scrapers:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Provide instructions for viewing the results
Write-Host "`nTo view the scraped jobs, visit: https://naptownhub.com/jobs" -ForegroundColor Cyan
