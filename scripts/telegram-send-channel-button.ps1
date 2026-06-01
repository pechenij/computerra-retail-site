param(
  [Parameter(Mandatory = $true)]
  [string]$Token,

  [Parameter(Mandatory = $true)]
  [string]$Channel,

  [Parameter(Mandatory = $true)]
  [string]$BotUsername,

  [string]$ButtonText = ([regex]::Unescape("\u0412\u0456\u0434\u043a\u0440\u0438\u0442\u0438 \u043a\u0430\u0442\u0430\u043b\u043e\u0433-\u043f\u0440\u0430\u0439\u0441")),

  [string]$Message = ([regex]::Unescape("\u0410\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u0438\u0439 \u043a\u0430\u0442\u0430\u043b\u043e\u0433-\u043f\u0440\u0430\u0439\u0441 \u041a\u041e\u041c\u041f\u0423\u0422\u0415\u0420\u0420\u0410: \u0446\u0456\u043d\u0438, \u043d\u0430\u044f\u0432\u043d\u0456\u0441\u0442\u044c \u0456 \u0441\u0442\u043e\u0440\u0456\u043d\u043a\u0438 \u0442\u043e\u0432\u0430\u0440\u0456\u0432.")),

  [string]$StartParam = "catalog"
)

$ErrorActionPreference = "Stop"
$apiBase = "https://api.telegram.org/bot$Token"
$cleanBotUsername = $BotUsername.TrimStart("@")
$appLink = "https://t.me/${cleanBotUsername}?startapp=$StartParam"

$body = @{
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

$json = $body | ConvertTo-Json -Depth 12
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)

$response = Invoke-RestMethod `
  -Uri "$apiBase/sendMessage" `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body $bytes

if (-not $response.ok) {
  throw "Telegram API returned ok=false for sendMessage"
}

Write-Host "Sent message $($response.result.message_id) to $Channel"
Write-Host "Button URL: $appLink"
