$FunctionUrl = "https://us-central1-meridian-station-preview.cloudfunctions.net/askParkinsons"

$Body = @{
  question = "What is the current evidence that exercise may help people with Parkinson's disease?"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri $FunctionUrl `
  -ContentType "application/json" `
  -Headers @{
    Origin = "https://meridian-station-preview--founder-review-mfgnns9g.web.app"
  } `
  -Body $Body