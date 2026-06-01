param(
  [Parameter(Mandatory = $true)]
  [string]$Token,

  [Parameter(Mandatory = $true)]
  [string]$Channel,

  [Parameter(Mandatory = $true)]
  [string]$BotUsername,

  [string]$ButtonText = ([regex]::Unescape("\u041a\u0430\u0442\u0430\u043b\u043e\u0433-\u043f\u0440\u0430\u0439\u0441")),

  [string]$Message = ([regex]::Unescape("\u041a\u0430\u0442\u0430\u043b\u043e\u0433-\u043f\u0440\u0430\u0439\u0441 \u041a\u041e\u041c\u041f\u0423\u0422\u0415\u0420\u0420\u0410")),

  [string]$StartParam = "catalog"
)

$ErrorActionPreference = "Stop"
$apiBase = "https://api.telegram.org/bot$Token"
$cleanBotUsername = $BotUsername.TrimStart("@")
$appLink = "https://t.me/${cleanBotUsername}?startapp=$StartParam"

function Invoke-TelegramMethod {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Method,

    [Parameter(Mandatory = $true)]
    [hashtable]$Body
  )

  $json = $Body | ConvertTo-Json -Depth 12
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

  $response = Invoke-RestMethod `
    -Uri "$apiBase/$Method" `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body $bytes

  if (-not $response.ok) {
    throw "Telegram API returned ok=false for $Method"
  }

  return $response.result
}

$messageResult = Invoke-TelegramMethod -Method "sendMessage" -Body @{
  chat_id = $Channel
  text = $Message
  reply_markup = @{
    inline_keyboard = @(
      ,@(
        @{
          text = $ButtonText
          url = $appLink
        }
      )
    )
  }
}

Invoke-TelegramMethod -Method "pinChatMessage" -Body @{
  chat_id = $Channel
  message_id = $messageResult.message_id
  disable_notification = $true
} | Out-Null

Write-Host "Sent and pinned message $($messageResult.message_id) in $Channel"
Write-Host "Button URL: $appLink"
