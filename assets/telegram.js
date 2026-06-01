(function () {
  const params = new URLSearchParams(location.search);
  const forcedTelegramMode = params.get('telegram') === '1';
  const tg = window.Telegram && window.Telegram.WebApp;

  const isTelegram = Boolean(
    forcedTelegramMode ||
    tg?.initData ||
    tg?.initDataUnsafe?.user ||
    (tg?.platform && tg.platform !== 'unknown')
  );
  if (!isTelegram) return;

  document.body.classList.add('telegram-webapp');

  function openPhoneLink(href) {
    if (!href || !href.startsWith('tel:')) return;

    try {
      tg?.HapticFeedback?.impactOccurred?.('light');
    } catch (error) {
      // Haptics are optional and depend on the Telegram client.
    }

    try {
      const frame = document.createElement('iframe');
      frame.style.display = 'none';
      frame.src = href;
      document.body.appendChild(frame);
      setTimeout(function () {
        frame.remove();
      }, 1200);
    } catch (error) {
      // Some WebViews block tel: iframes; fall through to direct navigation.
    }

    try {
      window.open(href, '_blank', 'noopener');
    } catch (error) {
      // Direct navigation below is the final fallback.
    }

    window.location.href = href;
  }

  document.addEventListener('click', function (event) {
    const phoneLink = event.target.closest('a[href^="tel:"]');
    if (!phoneLink) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    openPhoneLink(phoneLink.getAttribute('href'));
  }, true);

  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.getAttribute('href'), location.href);
    if (url.origin !== location.origin) return;
    url.searchParams.set('telegram', '1');
    link.href = url.pathname.split('/').pop() + url.search + url.hash;
  }, true);

  if (!tg) return;

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
