(() => {
  const {t, money, parseMoney, inputMoney, field, error, showError, actions, button, save,
    link, offlineNote, screen, render, form, confirmAction, toolbar, offlineButton, isOffline, page} = scenario;
  const schedules = {
    electricity: {name: 'Электричество', base: 85000, first: '2026-01'},
    internet: {name: 'Интернет', base: 85000, first: '2026-10', end: '2027-04'},
    insurance: {name: 'Страховка квартиры', base: 1200000, first: '2026-12', yearlyMonth: 12}
  };
  const requested = page.get('schedule');
  let schedule = Object.hasOwn(schedules, requested) ? requested : 'electricity';
  let year = 2027;
  const scheduleBase = page.get('base');
  if (schedule === requested && scheduleBase !== null) {
    if (scheduleBase === '') schedules[schedule].base = null;
    else if (/^\d{1,12}$/.test(scheduleBase)) schedules[schedule].base = Number(scheduleBase);
  }
  const records = {
    electricity: {
      '2026-01': {amount: 79000, source: 'paid'}, '2026-02': {amount: 81000, source: 'paid'},
      '2026-03': {amount: 0, source: 'paid'}, '2026-11': {amount: 87000, source: 'paid'},
      '2027-03': {amount: 100000, source: 'manual'}, '2027-06': {amount: 0, source: 'manual'},
      '2027-09': {amount: 95000, source: 'paid'}
    },
    internet: {'2026-11': {amount: 87000, source: 'paid'}},
    insurance: {}
  };
  const key = (month, target = year) => `${target}-${String(month).padStart(2, '0')}`;
  const current = () => schedules[schedule];
  const payments = () => records[schedule];
  const months = () => (current().yearlyMonth ? [current().yearlyMonth]
    : Array.from({length: 12}, (_, index) => index + 1)).filter((month) => {
    const value = key(month);
    return value >= current().first && (!current().end || value <= current().end);
  });
  const unpaidMonths = () => months().filter((month) => payments()[key(month)]?.source !== 'paid');
  const monthName = (month) => new Intl.DateTimeFormat(t('ru-RU', 'en-GB'), {
    month: 'long', timeZone: 'UTC'
  }).format(new Date(Date.UTC(2026, month - 1, 1)));
  const sourceName = (source) => ({
    paid: t('Оплачено', 'Paid'), manual: t('Вручную', 'Manual amount'),
    base: t('Общий ориентир', 'Default estimate'), copied: t('Оплата за прошлый год', 'Last year’s payment')
  })[source];

  function list() {
    render(() => {
      toolbar(offlineButton());
      const rows = months().map((month) => {
        const entry = payments()[key(month)] ?? {amount: null};
        const name = monthName(month);
        const label = `${name} · ${money(entry.amount)}`;
        const control = entry.source === 'paid' || isOffline()
          ? `<strong>${label}</strong>` : button(label, () => editMonth(month), 'entry');
        return `<div class="card">${control}${entry.source ? `<small>${sourceName(entry.source)}</small>` : ''}</div>`;
      }).join('');
      const yearOptions = [2026, 2027, 2028].map((option) =>
        `<option ${option === year ? 'selected' : ''}>${option}</option>`).join('');
      screen(t('Суммы платежей на год', 'Annual payment estimates'), `
        <div class="stack">
          ${isOffline() ? offlineNote() : ''}
          <label>${t('Расписание', 'Schedule')}<select id="schedule">
            ${Object.entries(schedules).map(([id, item]) =>
              `<option value="${id}" ${schedule === id ? 'selected' : ''}>${item.name}</option>`).join('')}
          </select></label>
          <label>${t('Год', 'Year')}<select id="year">${yearOptions}</select></label>
          <div class="card"><small>${t('Общий ориентир', 'Default estimate')}</small>
            <div class="amount"><strong>${money(current().base)}</strong></div>
          </div>
          ${actions(
            button(t('Заполнить ориентиром', 'Fill with default estimate'), () => fillYear(false), 'primary',
              isOffline() || current().base === null || !unpaidMonths().length),
            link(t('К расписаниям платежей', 'Back to payment schedules'),
              'obligatory-payments.html?view=schedules' + (isOffline() ? '&offline=1' : '')),
            button(t('Подставить оплаты прошлого года', 'Copy last year’s payments'), () => fillYear(true), '',
              isOffline() || !unpaidMonths().length))}
          <div class="stack">${rows || `<p>${t('На этот год платежей по расписанию нет.', 'No scheduled payments this year.')}</p>`}</div>
        </div>`);
      document.querySelector('#schedule').onchange = (event) => { schedule = event.target.value; list(); document.querySelector('#schedule').focus(); };
      document.querySelector('#year').onchange = (event) => { year = Number(event.target.value); list(); document.querySelector('#year').focus(); };
    });
  }

  function editMonth(month, draft = inputMoney(payments()[key(month)]?.amount ?? null)) {
    render(() => {
      toolbar(offlineButton());
      screen(t('Ориентир на месяц', 'Monthly estimate'), `
        <form><p>${monthName(month)} ${year}</p>
          ${field(t('Сумма, ₽', 'Amount, RUB'), 'amount', draft, 'inputmode="decimal"')}
          ${error()}${isOffline() ? offlineNote() : save()}
        </form>`, list);
      document.querySelector('[name="amount"]').oninput = (event) => { draft = event.target.value; };
      form((data) => {
        const amount = parseMoney(data.get('amount'));
        if (Number.isNaN(amount) || amount < 0) return showError(t('Укажите сумму от 0 ₽ или оставьте поле пустым.', 'Enter a non-negative amount or leave the field blank.'));
        payments()[key(month)] = {amount, source: 'manual'};
        list();
      });
    });
  }

  function fillYear(copyPreviousYear) {
    const updates = unpaidMonths().flatMap((month) => {
      const previous = payments()[key(month, year - 1)];
      if (copyPreviousYear && previous?.source === 'paid') {
        return [{month, amount: previous.amount, source: 'copied'}];
      }
      return current().base === null ? [] : [{month, amount: current().base, source: 'base'}];
    });
    if (!updates.length) return;
    const overwritten = updates.some(({month, amount}) => {
      const entry = payments()[key(month)];
      return entry?.source === 'manual' && entry.amount !== amount;
    });
    const apply = () => {
      for (const {month, amount, source} of updates) {
        const entry = payments()[key(month)];
        if (entry?.source === 'manual' && entry.amount === amount) continue;
        payments()[key(month)] = {amount, source};
      }
      list();
    };
    if (!overwritten) {
      apply();
      return;
    }
    confirmAction(t('Заменить ручные суммы?', 'Replace manual amounts?'),
      `<p>${current().name} · ${year}</p>
        <p>${t('Заполнение заменит ручные суммы в выбранном году. Оплаченные платежи сохранятся.',
          'Filling this year will replace manual estimates. Paid amounts stay as recorded.')}</p>`,
      t('Заменить и заполнить', 'Replace and fill'), apply);
  }

  list();
})();
