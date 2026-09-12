$input_data = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($input_data)) {
    Write-Output "{}"
    exit
}
try {
    $payload = $input_data | ConvertFrom-Json
    $workspace = ""
    if ($payload.workspacePaths -and $payload.workspacePaths.Count -gt 0) {
        $workspace = $payload.workspacePaths[0]
    } else {
        $workspace = (Get-Location).Path
    }
    $session_file = Join-Path $workspace ".job-assistant-session.json"
    
    if (Test-Path $session_file) {
        $session_data = Get-Content $session_file -Raw | ConvertFrom-Json
        $user_id = $session_data.userId
        $email = $session_data.email
        
        if ($user_id -and $email) {
            $msg = "[SYSTEM CACHE: The current logged-in user is User ID: $user_id, Email: $email.]"
            $output = @{
                injectSteps = @(
                    @{ userMessage = $msg }
                )
            }
            $output | ConvertTo-Json -Depth 10 -Compress | Write-Output
            exit
        }
    } else {
        $msg = "[DEBUG: Session script ran, but could not find session file at: $session_file]"
        $output = @{
            injectSteps = @(
                @{ userMessage = $msg }
            )
        }
        $output | ConvertTo-Json -Depth 10 -Compress | Write-Output
        exit
    }
} catch {
    $msg = "[DEBUG: Session script crashed: $_]"
    $output = @{ injectSteps = @( @{ userMessage = $msg } ) }
    $output | ConvertTo-Json -Depth 10 -Compress | Write-Output
    exit
}
