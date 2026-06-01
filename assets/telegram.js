(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  if (!tg) return;

  const isTelegram = Boolean(
    tg.initData ||
    tg.initDataUnsafe?.user ||
    (tg.platform && tg.platform !== 'unknown')
  );
  if (!isTelegram) return;

  document.body.classList.add('telegram-webapp');

  const theme = tg.themeParams || {};
  const root = document.documentElement;
  const setVar = (name, value) => {
    if (value) root.style.setProperty(name, value);
  };

  setVar('--tg-bg-color', theme.bg_color);
  setVar('--tg-text-color', theme.text_color);
  setVar('--tg-hint-color', theme.hint_color);
  setVar('--tg-button-color', theme.button_color);
  setVar('--tg-button-text-color', theme.button_text_color);
  setVar('--tg-secondary-bg-color', theme.secondary_bg_color);

  try {
    tg.ready();
    tg.expand();
    if (theme.bg_color) tg.setBackgroundColor(theme.bg_color);
    if (theme.secondary_bg_color || theme.bg_color) {
      tg.setHeaderColor(theme.secondary_bg_color || theme.bg_color);
    }
    tg.MainButton?.hide();
  } catch (error) {
    // Telegram WebApp methods can be unavailable in older clients.
  }

  const isProductPage = /(^|\/)product\.html$/i.test(location.pathname);
  if (isProductPage && tg.BackButton) {
    tg.BackButton.show();
    tg.BackButton.onClick(function () {
      if (history.length > 1) history.back();
      else location.href = 'index.html';
    });
  } else {
    tg.BackButton?.hide();
  }
})();
