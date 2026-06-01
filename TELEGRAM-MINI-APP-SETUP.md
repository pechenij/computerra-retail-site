# Telegram Mini App для каталога

Публичный URL каталога:

```text
https://pechenij.github.io/computerra-retail-site/
```

## Что уже подготовлено в сайте

- подключен официальный Telegram WebApp SDK;
- каталог и страница товара открываются внутри Telegram WebView;
- сайт разворачивается на всю высоту Mini App;
- цвета интерфейса подстраиваются под тему Telegram;
- дилерский вход скрывается внутри Telegram;
- на странице товара включается системная кнопка Telegram `Back`.

Админка остается отдельной и не связывается с Telegram.

## Настройка бота с нуля

1. Открой `@BotFather` в Telegram.
2. Выполни `/newbot`.
3. Задай название бота, например `КОМПУТЕРРА каталог`.
4. Задай username бота, например `komputerra_price_bot`.
5. В настройках бота добавь Mini App / Web App с URL:

```text
https://pechenij.github.io/computerra-retail-site/
```

6. Для кнопки укажи текст:

```text
Каталог-прайс
```

## Автонастройка через Bot API

После создания бота BotFather выдаст token. Не коммить token в репозиторий.

Для настройки описания, команд и menu button выполни из корня проекта:

```powershell
.\scripts\telegram-set-bot.ps1 -Token "123456:ABC..." -ButtonText "Каталог-прайс"
```

Этот скрипт настраивает кнопку меню в личном чате с ботом. Main Mini App все равно нужно включить в `@BotFather`, потому что именно она дает прямую ссылку вида:

```text
https://t.me/<bot_username>?startapp=catalog
```

## Как показать кнопку в канале

Telegram Mini App открывается через бота. Важно: `web_app` inline-кнопки Telegram доступны только в приватных чатах между пользователем и ботом, поэтому для канала нужно использовать обычную URL-кнопку на Main Mini App.

1. В `@BotFather` включи Main Mini App для бота.
2. Добавь бота администратором канала с правом публиковать сообщения.
3. Отправь закрепленный пост с кнопкой:

```powershell
.\scripts\telegram-send-channel-button.ps1 `
  -Token "123456:ABC..." `
  -Channel "@channel_username" `
  -BotUsername "@bot_username"
```

Постоянная кнопка прямо в верхней зоне канала зависит от возможностей клиента Telegram и типа привязки бота к каналу. Если Telegram не показывает такую кнопку для канала, визуально ближайший вариант - закрепленный пост или кнопка под постом.
