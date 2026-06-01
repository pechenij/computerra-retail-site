param(
  [Parameter(Mandatory = $true)]
  [string]$Token,

  [string]$AppUrl = "https://pechenij.github.io/computerra-retail-site/",

  [string]$ButtonText = "Каталог-прайс",

  [string]$Description = "Каталог-прайс КОМПУТЕРРА: актуальные цены, наличие и страницы товаров."
)

$ErrorActionPreference = "Stop"
$apiBase = "https://api.telegram.org/bot$Token"

function Invoke-TelegramMethod {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Method,

    [Parameter(Mandatory = $true)]
    [hashtable]$Body
  )

  $response = Invoke-RestMethod `
    -Uri "$apiBase/$Method" `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body ($Body | ConvertTo-Json -Depth 12)

  if (-not $response.ok) {
    throw "Telegram API returned ok=false for $Method"
  }

  return $response.result
}

$me = Invoke-TelegramMethod -Method "getMe" -Body @{}
Write-Host "Bot: @$($me.username)"

Invoke-TelegramMethod -Method "setMyDescription" -Body @{
  description = $Description
} | Out-Null

Invoke-TelegramMethod -Method "setMyShortDescription" -Body @{
  short_description = "Каталог-прайс КОМПУТЕРРА"
} | Out-Null

Invoke-TelegramMethod -Method "setMyCommands" -Body @{
  commands = @(
    @{
      command = "start"
      description = "Открыть каталог"
    },
    @{
      command = "catalog"
      description = "Каталог-прайс"
    }
  )
} | Out-Null

Invoke-TelegramMethod -Method "setChatMenuButton" -Body @{
  menu_button = @{
    type = "web_app"
    text = $ButtonText
    web_app = @{
      url = $AppUrl
    }
  }
} | Out-Null

Write-Host "Done. Menu button '$ButtonText' opens $AppUrl"
Write-Host "Next: in @BotFather configure the bot's Main Mini App with the same URL."
