$input_data = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($input_data)) {
    Write-Output "{}"
    exit
}
try {
    $payload = $input_data | ConvertFrom-Json
    $workspace = $payload.workspacePaths[0]
    $session_file = Join-Path $workspace ".job-assistant-session.json"
    
    if (Test-Path $session_file) {
        $session_data = Get-Content $session_file -Raw | ConvertFrom-Json
        $user_id = $session_data.userId
        $email = $session_data.email
        
        if ($user_id -and $email) {
            $msg = "SYSTEM CACHE: The current logged-in user is User ID: $user_id, Email: $email."
            $output = @{
                injectSteps = @(
                    @{ ephemeralMessage = $msg }
                )
            }
            $output | ConvertTo-Json -Depth 10 -Compress | Write-Output
            exit
        }
    }
} catch {
    # Fail silently and output empty JSON
}
Write-Output "{}"
