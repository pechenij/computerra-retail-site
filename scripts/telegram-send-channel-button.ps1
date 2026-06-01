param(
  [Parameter(Mandatory = $true)]
  [string]$Token,

  [Parameter(Mandatory = $true)]
  [string]$Channel,

  [Parameter(Mandatory = $true)]
  [string]$BotUsername,

  [string]$ButtonText = "Открыть каталог-прайс",

  [string]$Message = "Актуальный каталог-прайс КОМПУТЕРРА: цены, наличие и страницы товаров.",

  [string]$StartParam = "catalog"
)

$ErrorActionPreference = "Stop"
$apiBase = "https://api.telegram.org/bot$Token"
$cleanBotUsername = $BotUsername.TrimStart("@")
$appLink = "https://t.me/$cleanBotUsername?startapp=$StartParam"

$body = @{
  chat_id = $Channel
  text = $Message
  reply_markup = @{
    inline_keyboard = @(
      @(
        @{
          text = $ButtonText
          url = $appLink
        }
      )
    )
  }
}

$response = Invoke-RestMethod `
  -Uri "$apiBase/sendMessage" `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body ($body | ConvertTo-Json -Depth 12)

if (-not $response.ok) {
  throw "Telegram API returned ok=false for sendMessage"
}

Write-Host "Sent message $($response.result.message_id) to $Channel"
Write-Host "Button URL: $appLink"
