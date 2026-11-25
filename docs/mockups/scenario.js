(() => {
  const root = document.querySelector('.screen');
  const demo = document.querySelector('.demo');
  const heading = document.querySelector('h1');
  const back = document.querySelector('#back');
  const dialog = document.querySelector('dialog');
  const locale = document.querySelector('#locale');
  const page = new URLSearchParams(location.search);
  locale.value = page.get('lang') === 'en' ? 'en' : 'ru';

  const t = (ru, en) => locale.value === 'en' ? en : ru;
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[char]);
  const money = (cents) => {
    if (cents === null) return t('Сумма не указана', 'Amount not set');
    const value = new Intl.NumberFormat(t('ru-RU', 'en-GB'), {maximumFractionDigits: 2}).format(cents / 100);
    return t(`${value} ₽`, `RUB ${value}`);
  };
  const date = (value) => new Intl.DateTimeFormat(t('ru-RU', 'en-GB'), {
    day: '2-digit', month: t('2-digit', 'short'), year: 'numeric', timeZone: 'UTC'
  }).format(new Date(value + 'T00:00:00Z'));
  const parseMoney = (value) => {
    const normalized = value.trim().replace(/[\s\u00a0]/g, '').replace(',', '.');
    if (!normalized) return null;
    if (!/^-?\d{1,10}(\.\d{1,2})?$/.test(normalized)) return NaN;
    return Math.round(Number(normalized) * 100);
  };
  const inputMoney = (value) => value === null ? '' : String(value / 100).replace('.', t(',', '.'));
  const field = (label, name, value = '', options = '') =>
    `<label>${label}<input name="${name}" value="${escape(value)}" ${options}></label>`;
  const error = () => '<p class="error" role="alert" hidden></p>';
  const showError = (message) => {
    const messageBox = root.querySelector('[role="alert"]');
    messageBox.textContent = message;
    messageBox.hidden = false;
  };
  const actions = (...buttons) => `<div class="actions">${buttons.join('')}</div>`;
  const button = (label, callback, style = '', disabled = false) => {
    const id = callbacks.push(callback) - 1;
    return `<button type="button" class="${style}" data-action="${id}" ${disabled ? 'disabled' : ''}>${escape(label)}</button>`;
  };
  const save = (label = t('Сохранить', 'Save')) => `<button class="primary" type="submit">${label}</button>`;
  const cancel = () => t('Отмена', 'Cancel');
  const link = (label, url) => `<a class="entry-link" href="${escape(url)}">${escape(label)}</a>`;
  const offlineNote = () => `<p class="notice">${t('Без сети. Доступен просмотр загруженных данных.', 'Offline. You can view previously loaded data.')}</p>`;

  let callbacks = [];
  let refresh;
  let backAction;
  let offline = page.get('offline') === '1';

  function screen(title, markup, previous) {
    const moved = heading.textContent !== title;
    document.documentElement.lang = locale.value;
    heading.textContent = title;
    back.hidden = !previous;
    backAction = previous;
    back.setAttribute('aria-label', t('Назад', 'Back'));
    root.innerHTML = markup;
    if (moved) heading.focus();
  }

  function render(draw) {
    callbacks = [];
    refresh = () => render(draw);
    draw();
  }

  function form(handler) {
    root.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      handler(new FormData(event.currentTarget));
    });
  }

  function confirmAction(title, body, label, callback, danger = false) {
    dialog.innerHTML = `
      <form method="dialog">
        <h2 id="confirm-title">${title}</h2>
        <div class="stack">${body}</div>
        <div class="actions">
          <button value="cancel" autofocus>${cancel()}</button>
          <button value="confirm" class="${danger ? 'danger' : 'primary'}">${label}</button>
        </div>
      </form>`;
    dialog.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      dialog.close();
      if (event.submitter?.value === 'confirm') callback();
    });
    dialog.showModal();
  }

  function toolbar(controls) {
    const focused = demo.contains(document.activeElement) ? document.activeElement.id : '';
    demo.querySelector('[data-controls]')?.remove();
    const container = document.createElement('div');
    container.className = 'actions';
    container.dataset.controls = '';
    container.innerHTML = controls;
    demo.append(container);
    if (focused) document.getElementById(focused)?.focus();
    document.querySelector('#review').textContent = t('Все макеты', 'All mockups');
  }

  function offlineButton() {
    return `<button type="button" id="offline" aria-pressed="${offline}">${t('Без сети', 'Offline')}</button>`;
  }

  function runAction(event) {
    const action = event.target.closest('button[data-action]');
    if (action) callbacks[Number(action.dataset.action)]();
  }

  root.addEventListener('click', runAction);
  demo.addEventListener('click', runAction);
  demo.addEventListener('click', (event) => {
    if (event.target.id === 'offline') {
      offline = !offline;
      dialog.close();
      refresh();
    }
  });
  back.addEventListener('click', () => backAction());
  locale.addEventListener('change', () => {
    dialog.close();
    refresh();
  });

  window.scenario = {root, demo, page, t, escape, money, date, parseMoney, inputMoney, field, error,
    showError, actions, button, save, cancel, link, offlineNote, screen, render, form, confirmAction,
    toolbar, offlineButton, isOffline: () => offline};
})();
