# run-event-scrapers.ps1
# This script manually runs the event scrapers

# Check if a source name was provided
param (
    [string]$source = ""
)

# Set up the API endpoint
$apiUrl = "https://api.naptownhub.com/api/events/scrape"
if ($source) {
    $apiUrl = "$apiUrl/$source"
}

# Get the admin token
$token = Read-Host "Enter admin JWT token"

# Make the API request
Write-Host "Running event scrapers..." -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers
    Write-Host "Event scraping completed successfully!" -ForegroundColor Green
    Write-Host $response.message
} catch {
    Write-Host "Error running event scrapers:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}

# Provide instructions for viewing the results
Write-Host "`nTo view the scraped events, visit: https://naptownhub.com/events" -ForegroundColor Cyan
