(() => {
  const {root, demo, t, money, date, parseMoney, inputMoney, field, error, showError, actions,
    button, save, link, offlineNote, screen, render, form, confirmAction, toolbar, offlineButton, isOffline, page} = scenario;
  const purchase = page.get('purchase') === 'key'
    ? {name: 'Ключ для колбы', price: 45000, date: '2026-11-17', recipient: 'Марина'}
    : {name: 'Фильтр для воды', price: 89000, date: '2026-11-19'};
  let admin = false;
  let refund = null;
  let month = '2026-12';
  const today = '2026-12-02';
  const roleControl = () => `<button type="button" id="role" aria-pressed="${admin}">
    ${admin ? t('Администратор', 'Admin') : t('Участник', 'Member')}</button>`;
  const info = () => `<div class="card"><strong>${purchase.name}</strong>
    <small class="meta">Дом → Хозтовары · ${purchase.recipient ?? t('Семья', 'Family')}</small></div>`;
  const refundLine = (item) => `${money(item.amount)} · ${date(item.date)}`;

  function detail() {
    render(() => {
      toolbar(offlineButton() + roleControl());
      screen(t('Купленная покупка', 'Purchased item'), `
        <div class="stack">
          ${isOffline() ? offlineNote() : ''}
          ${info()}
          <div class="card"><strong>${money(purchase.price)}</strong>
            <small class="meta">${t('Куплено', 'Purchased')} · ${date(purchase.date)}</small>
          </div>
          <section aria-labelledby="refunds-title" class="stack">
            <h2 id="refunds-title">${t('Возвраты', 'Refunds')}</h2>
            ${refund ? button(refundLine(refund), () => refundDetail(refund), 'entry')
              : button(t('Добавить возврат', 'Add refund'), () => edit(), 'primary', isOffline() || purchase.price === 0)}
          </section>
          ${refund ? `<p class="muted">${t('Пока есть возврат, изменить статус «Куплено» или удалить покупку нельзя.',
            'You can’t undo the purchase or delete it while it has a refund.')}</p>` : ''}
          ${button(t('Посмотреть в финансах', 'View in finances'), finances)}
          ${link(t('К покупкам', 'Back to purchases'), 'linked-purchases.html')}
        </div>`);
    });
  }

  function refundDetail(item) {
    render(() => {
      toolbar(offlineButton() + roleControl());
      const remove = () => confirmAction(t('Удалить возврат?', 'Delete refund?'), `<p>${refundLine(item)}</p>
        <p>${t('Остаток и расходы за период возврата пересчитаются. Покупка сохранится. Восстановить возврат в приложении нельзя.',
          'The balance and spending for the refund period will be recalculated. The purchase stays. You can’t restore the refund in the app.')}</p>`,
      t('Удалить', 'Delete'), () => { refund = null; detail(); }, true);
      screen(t('Возврат', 'Refund'), `<div class="stack">${isOffline() ? offlineNote() : ''}
        ${info()}<div class="card">${refundLine(item)}</div>
        ${actions(button(t('Изменить', 'Edit'), () => edit(item), 'primary', isOffline()),
          admin ? button(t('Удалить возврат', 'Delete refund'), remove, 'danger', isOffline()) : '')}</div>`, detail);
    });
  }

  function edit(item, draft = {amount: inputMoney(item?.amount ?? purchase.price), date: item?.date ?? today}) {
    render(() => {
      toolbar(offlineButton() + roleControl());
      const maximum = purchase.price;
      screen(item ? t('Изменить возврат', 'Edit refund') : t('Добавить возврат', 'Add refund'), `
        <form>${info()}
          <div class="card">${t('Максимальная сумма', 'Maximum amount')} · <strong>${money(maximum)}</strong></div>
          ${field(t('Сумма возврата, ₽', 'Refund amount, RUB'), 'amount', draft.amount, 'inputmode="decimal" required')}
          ${field(t('Дата получения денег', 'Date money was received'), 'date', draft.date, `type="date" max="${today}" required`)}
          ${error()}${isOffline() ? offlineNote() : save()}
        </form>`, item ? () => refundDetail(item) : detail);
      root.querySelector('form').oninput = (event) => { draft[event.target.name] = event.target.value; };
      form((data) => {
        const amount = parseMoney(data.get('amount'));
        if (!(amount > 0)) return showError(t('Укажите сумму больше 0 ₽.', 'Enter an amount greater than zero.'));
        if (amount > maximum) return showError(t(`Сумма возврата не может превышать ${money(maximum)}.`, `The refund can’t exceed ${money(maximum)}.`));
        refund = {amount, date: data.get('date')};
        detail();
      });
    });
  }

  function finances() {
    render(() => {
      toolbar(offlineButton() + roleControl());
      const included = refund?.date.startsWith(month) ? refund : null;
      const purchaseExpense = purchase.date.startsWith(month) ? purchase.price : 0;
      const expenses = purchaseExpense - (included?.amount ?? 0);
      const balance = 1000000 - purchase.price + (refund?.amount ?? 0);
      screen(t('Финансы', 'Finances'), `<div class="stack">
        ${isOffline() ? offlineNote() : ''}
        <label>${t('Месяц', 'Month')}<select id="month">
          <option value="2026-11" ${month === '2026-11' ? 'selected' : ''}>${t('Ноябрь 2026', 'November 2026')}</option>
          <option value="2026-12" ${month === '2026-12' ? 'selected' : ''}>${t('Декабрь 2026', 'December 2026')}</option>
        </select></label>
        <div class="card">${t('Текущий остаток', 'Current balance')} · <strong>${money(balance)}</strong></div>
        <div class="card">${t('Расходы за месяц', 'Monthly spending')} · <strong>${money(expenses)}</strong></div>
        ${purchaseExpense ? button(`${purchase.name} · ${money(purchase.price)}`, detail, 'entry') : ''}
        ${included ? button(`${t('Возврат', 'Refund')} · ${refundLine(included)}`, () => refundDetail(included), 'entry') : ''}
        ${!purchaseExpense && !included ? `<p>${t('Операций за месяц нет.', 'No transactions this month.')}</p>` : ''}
      </div>`, detail);
      document.querySelector('#month').onchange = (event) => { month = event.target.value; finances(); document.querySelector('#month').focus(); };
    });
  }
  demo.addEventListener('click', (event) => {
    if (event.target.id === 'role') { admin = !admin; event.target.setAttribute('aria-pressed', String(admin)); detail(); }
  });
  detail();
})();
