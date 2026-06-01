# Telegram Mini App для каталогу

Публічний URL каталогу:

```text
https://pechenij.github.io/computerra-retail-site/?telegram=1
```

## Що вже підготовлено на сайті

- підключено офіційний Telegram WebApp SDK;
- каталог і сторінка товару відкриваються всередині Telegram WebView;
- сайт розгортається на всю висоту Mini App;
- кольори інтерфейсу підлаштовуються під тему Telegram;
- дилерський вхід приховується всередині Telegram;
- на сторінці товару вмикається системна кнопка Telegram `Back`.

Адмінка залишається окремою і не прив'язується до Telegram.

## Налаштування бота з нуля

1. Відкрий `@BotFather` у Telegram.
2. Виконай `/newbot`.
3. Задай назву бота, наприклад `КОМПУТЕРРА каталог`.
4. Задай username бота, наприклад `komputerra_price_bot`.
5. У налаштуваннях бота додай Mini App / Web App з URL:

```text
https://pechenij.github.io/computerra-retail-site/?telegram=1
```

6. Для кнопки вкажи текст:

```text
Каталог-прайс
```

## Автоналаштування через Bot API

Після створення бота BotFather видасть token. Не коміть token у репозиторій.

Щоб налаштувати опис, команди та menu button, виконай з кореня проєкту:

```powershell
.\scripts\telegram-set-bot.ps1 -Token "123456:ABC..." -ButtonText "Каталог-прайс"
```

Цей скрипт налаштовує кнопку меню в особистому чаті з ботом. Main Mini App усе одно потрібно ввімкнути в `@BotFather`, тому що саме вона дає пряме посилання виду:

```text
https://t.me/<bot_username>?startapp=catalog
```

## Як показати кнопку в каналі

Telegram Mini App відкривається через бота. Важливо: `web_app` inline-кнопки Telegram доступні тільки в приватних чатах між користувачем і ботом, тому для каналу потрібно використовувати звичайну URL-кнопку на Main Mini App.

1. У `@BotFather` увімкни Main Mini App для бота.
2. Додай бота адміністратором каналу з правом публікувати повідомлення.
3. Надішли закріплений пост із кнопкою:

```powershell
.\scripts\telegram-pin-channel-button.ps1 `
  -Token "123456:ABC..." `
  -Channel "@channel_username" `
  -BotUsername "@bot_username"
```

Постійна кнопка прямо у верхній зоні каналу не доступна через Bot API для звичайного каналу. Найближчий надійний варіант - закріплений пост із кнопкою: Telegram покаже закріплену плашку під шапкою каналу, а кнопка в самому пості відкриє Mini App.
