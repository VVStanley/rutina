(() => {
  const {root, demo, t, escape, money, date, parseMoney, inputMoney, field, error, showError, actions,
    button, save, cancel, link, offlineNote, screen, render, form, confirmAction, toolbar,
    offlineButton, isOffline, page} = scenario;
  let opening = null;
  let accountingStart = null;
  let categories = [
    {id: 1, name: 'Дом'}, {id: 2, name: 'Хозтовары', parent: 1, linked: true},
    {id: 3, name: 'Книги'}, {id: 4, name: 'Зарплата'}
  ];
  let nextId = 5;
  let admin = page.get('role') === 'admin';
  const income = [];
  let financeMonth = '2026-11';
  let activeView = 'finances';
  let simulated = 'success';
  let purchase = {name: 'Фильтр для воды', amount: 89000, category: 'Хозтовары'};
  let entered;
  let pending;
  let updateFailed = false;
  let refreshed = false;
  let checked = false;
  let editCategories = ['Хозтовары', 'Ремонт', 'Книги'];
  let completeReport = false;
  const today = '2026-11-19';
  const simulations = () => [
    ['success', t('Успешное сохранение', 'Successful save')],
    ['offline', t('Сбой при сохранении', 'Save connection error')],
    ['conflict', t('Конфликт правок', 'Edit conflict')],
    ['deleted', t('Запись удалена', 'Record deleted')],
    ['category', t('Категория удалена', 'Category deleted')],
    ['uncertain', t('Ответ потерян', 'Response lost')]
  ];
  const controls = () => toolbar(offlineButton() +
    `<button type="button" id="role" aria-pressed="${admin}">${admin ? t('Администратор', 'Admin') : t('Участник', 'Member')}</button>` +
    (activeView === 'sync' ? `<label>${t('Ответ сервера в макете', 'Simulated server response')}<select id="simulation">
      ${simulations().map(([value, label]) => `<option value="${value}" ${simulated === value ? 'selected' : ''}>${label}</option>`).join('')}
    </select></label>` : '') + (activeView === 'finances'
      ? button(t('Проверить состояния синхронизации', 'Preview sync states'), syncOverview) : ''));

  function finances() {
    activeView = 'finances';
    render(() => {
      controls();
      const incomeSum = income.reduce((sum, item) => sum + item.amount, 0);
      const inMonth = income.filter((item) => item.date.startsWith(financeMonth));
      const monthlySum = inMonth.reduce((sum, item) => sum + item.amount, 0);
      screen(t('Финансы', 'Finances'), `<div class="stack">
        ${isOffline() ? offlineNote() : ''}
        ${opening === null ? '' : `<div class="card">${t('Текущий остаток', 'Current balance')}
          <div><strong>${money(opening + incomeSum)}</strong></div></div>`}
        <label>${t('Месяц', 'Month')}<select id="finance-month">
          <option value="2026-11" ${financeMonth === '2026-11' ? 'selected' : ''}>${t('Ноябрь 2026', 'November 2026')}</option>
          <option value="2026-10" ${financeMonth === '2026-10' ? 'selected' : ''}>${t('Октябрь 2026', 'October 2026')}</option>
        </select></label>
        <div class="card">${t('Доходы за месяц', 'Monthly income')} · ${money(monthlySum)}</div>
        ${button(t('Добавить доход', 'Add income'), incomeForm, '', isOffline())}
        ${inMonth.map((item) => `<div class="card">${money(item.amount)} · ${date(item.date)}
          <small class="meta">${escape(categories.find(({id}) => id === item.category)?.name ?? '')}
          ${item.comment ? ' · ' + escape(item.comment) : ''}</small></div>`).join('')}
        ${button(t('Категории', 'Categories'), categoryList)}
        ${button(t('Кабинет', 'Account'), cabinet)}
      </div>`);
      document.querySelector('#finance-month').onchange = (event) => {
        financeMonth = event.target.value;
        finances();
        document.querySelector('#finance-month').focus();
      };
    });
  }

  function cabinet() {
    activeView = 'cabinet';
    render(() => {
      controls();
      screen(t('Кабинет', 'Account'), `<div class="stack">
        ${isOffline() ? offlineNote() : ''}
        <div class="card">${admin ? t('Администратор дома', 'Home admin') : t('Участник дома', 'Home member')}</div>
        ${admin ? button(opening === null ? t('Указать начальный остаток', 'Set opening balance')
          : t('Изменить начальный остаток', 'Edit opening balance'), () => openingForm(), '', isOffline()) : ''}
      </div>`, finances);
    });
  }

  function openingForm(draft = inputMoney(opening)) {
    if (!admin) return cabinet();
    render(() => {
      controls();
      screen(t('Начальный остаток', 'Opening balance'), `<form>
        <p>${t('На начало учёта', 'At the start of tracking')} · ${date(accountingStart ?? today)}</p>
        ${field(t('Сумма, ₽', 'Amount, RUB'), 'amount', draft, 'inputmode="decimal" required')}
        ${error()}${isOffline() ? offlineNote() : save()}
      </form>`, cabinet);
      root.querySelector('input').oninput = (event) => { draft = event.target.value; };
      form((data) => {
        if (isOffline()) return;
        const amount = parseMoney(data.get('amount'));
        if (amount === null || Number.isNaN(amount)) return showError(t('Укажите сумму в рублях.', 'Enter an amount in rubles.'));
        const apply = () => {
          accountingStart ??= today;
          opening = amount;
          cabinet();
        };
        if (opening === null) return apply();
        if (opening === amount) return cabinet();
        confirmAction(t('Изменить начальный остаток?', 'Edit opening balance?'),
          `<p>${money(opening)} → ${money(amount)}</p>
            <p>${t('Текущий остаток семьи пересчитается.', 'The family’s current balance will be recalculated.')}</p>`,
          t('Подтвердить', 'Confirm'), apply);
      });
    });
  }

  function incomeForm(draft = {amount: '', date: today, category: '', comment: ''}) {
    render(() => {
      controls();
      screen(t('Новый доход', 'New income'), `<form>
        ${field(t('Сумма, ₽', 'Amount, RUB'), 'amount', draft.amount, 'inputmode="decimal" required')}
        ${field(t('Дата получения', 'Date received'), 'date', draft.date, `type="date" min="${accountingStart ?? today}" max="${today}" required`)}
        <label>${t('Категория', 'Category')}<select name="category" required>
          <option value="">${t('Выберите категорию', 'Select a category')}</option>
          ${categories.map((item) => `<option value="${item.id}" ${Number(draft.category) === item.id ? 'selected' : ''}>${escape(item.name)}</option>`).join('')}
        </select></label>
        ${field(t('Комментарий (необязательно)', 'Comment (optional)'), 'comment', draft.comment)}
        ${error()}${isOffline() ? offlineNote() : save()}
      </form>`, finances);
      root.querySelector('form').oninput = (event) => { draft[event.target.name] = event.target.value; };
      form((data) => {
        const amount = parseMoney(data.get('amount'));
        if (!(amount > 0)) return showError(t('Укажите сумму больше 0 ₽.', 'Enter an amount greater than zero.'));
        income.push({amount, date: data.get('date'), category: Number(data.get('category')), comment: data.get('comment')});
        finances();
      });
    });
  }

  function categoryList() {
    activeView = 'finances';
    render(() => {
      controls();
      const rows = categories.filter(({parent}) => !parent).map((item) => `<div class="card stack">
        ${button(item.name, () => categoryDetail(item), 'entry')}
        ${categories.filter(({parent}) => parent === item.id)
          .map((child) => button(`↳ ${child.name}`, () => categoryDetail(child), 'entry')).join('')}
      </div>`).join('');
      screen(t('Категории', 'Categories'), `<div class="stack">
        ${isOffline() ? offlineNote() : ''}
        ${button(t('Добавить категорию', 'Add category'), () => categoryForm(), 'primary', isOffline())}
        ${rows || `<p>${t('Категорий пока нет.', 'No categories yet.')}</p>`}
      </div>`, finances);
    });
  }

  function categoryDetail(item) {
    render(() => {
      controls();
      const hasChildren = categories.some(({parent}) => parent === item.id);
      const linked = item.linked || income.some(({category}) => category === item.id);
      const remove = () => confirmAction(t('Удалить категорию?', 'Delete category?'), `<p>${escape(item.name)}</p>
        <p>${t('Восстановить категорию в приложении нельзя.', 'You can’t restore the category in the app.')}</p>`,
      t('Удалить', 'Delete'), () => { categories = categories.filter(({id}) => id !== item.id); categoryList(); }, true);
      screen(item.parent ? t('Подкатегория', 'Subcategory') : t('Категория', 'Category'), `<div class="stack">
        ${isOffline() ? offlineNote() : ''}
        <div class="card"><strong>${escape(item.name)}</strong></div>
        ${button(t('Изменить название', 'Rename'), () => categoryForm(item), 'primary', isOffline())}
        ${item.parent ? '' : button(t('Добавить подкатегорию', 'Add subcategory'), () => categoryForm(null, item.id), '', isOffline())}
        ${admin ? button(t('Удалить категорию', 'Delete category'), remove, 'danger', isOffline() || linked || hasChildren) : ''}
        ${admin && (linked || hasChildren) ? `<p class="muted">${hasChildren
          ? t('В категории есть подкатегории.', 'This category has subcategories.')
          : t('Категория используется в покупках или финансовых операциях.', 'This category is used by purchases or transactions.')}</p>` : ''}
      </div>`, categoryList);
    });
  }

  function categoryForm(item, parent = item?.parent, draft = item?.name ?? '') {
    const previous = item ? () => categoryDetail(item)
      : parent ? () => categoryDetail(categories.find(({id}) => id === parent)) : categoryList;
    render(() => {
      controls();
      screen(item ? t('Изменить название', 'Rename') : parent ? t('Новая подкатегория', 'New subcategory') : t('Новая категория', 'New category'),
        `<form>${field(t('Название', 'Name'), 'name', draft, 'required')}
          ${error()}${isOffline() ? offlineNote() : save()}
        </form>`, previous);
      root.querySelector('input').oninput = (event) => { draft = event.target.value; };
      form((data) => {
        const name = data.get('name').trim();
        if (!name) return showError(t('Укажите название.', 'Enter a name.'));
        if (item) {
          item.name = name;
          categoryDetail(item);
        } else {
          const updated = {id: nextId++, name, parent};
          categories.push(updated);
          categoryDetail(updated);
        }
      });
    });
  }

  function syncOverview() {
    activeView = 'sync';
    render(() => {
      controls();
      screen(t('Покупки', 'Purchases'), `<div class="stack">
        ${isOffline() ? offlineNote() : ''}
        <p class="muted">${refreshed ? t('Обновлено сегодня в 12:35', 'Updated today at 12:35')
          : t('Обновлено сегодня в 12:30', 'Updated today at 12:30')}</p>
        ${updateFailed ? `<p role="alert" class="error">${t('Не удалось обновить.', 'Couldn’t refresh.')}</p>` : ''}
        ${button(t('Обновить', 'Refresh'), () => {
          updateFailed = isOffline();
          if (!updateFailed) refreshed = true;
          syncOverview();
        })}
        ${purchase ? button(`${purchase.name} · ${money(purchase.amount)}`, () => editPurchase(), 'entry') : ''}
        ${!purchase ? `<p>${t('Покупок пока нет.', 'No purchases yet.')}</p>` : ''}
        ${button(t('Показать первую загрузку', 'Preview first load'), firstLoad)}
        ${button(t('Отчёт за период', 'Period report'), report)}
      </div>`, finances);
    });
  }

  function firstLoad() {
    render(() => {
      controls();
      const message = isOffline() ? t('Не удалось загрузить покупки. Проверьте подключение.', 'Couldn’t load purchases. Check the connection.')
        : t('Покупок пока нет.', 'No purchases yet.');
      screen(t('Покупки', 'Purchases'), `<div class="stack"><p>${message}</p>
        ${button(t('Обновить', 'Refresh'), firstLoad)}
      </div>`, syncOverview);
    });
  }

  function report() {
    render(() => {
      controls();
      screen(t('Отчёт', 'Report'), `<div class="stack"><label>${t('Период', 'Period')}<select id="period">
        <option value="year" ${completeReport ? '' : 'selected'}>${t('2025 год', '2025')}</option>
        <option value="month" ${completeReport ? 'selected' : ''}>${t('Ноябрь 2026', 'November 2026')}</option>
      </select></label>
      ${isOffline() && !completeReport
        ? `<p class="notice">${t('Часть данных за этот период не загружена. Для отчёта нужна связь.',
          'Some data for this period hasn’t loaded. Connect to see the report.')}</p>`
        : `<div class="card">${t('Расходы', 'Spending')} · <strong>${money(completeReport ? purchase?.amount ?? 0 : 0)}</strong></div>
          ${isOffline() ? `<small>${t('Обновлено сегодня в 12:30', 'Updated today at 12:30')}</small>` : ''}`}
      </div>`, syncOverview);
      document.querySelector('#period').onchange = (event) => {
        completeReport = event.target.value === 'month';
        report();
        document.querySelector('#period').focus();
      };
    });
  }

  const fromPurchase = () => purchase
    ? {name: purchase.name, amount: inputMoney(purchase.amount), category: purchase.category} : {name: '', amount: '', category: ''};
  function editPurchase(draft = fromPurchase(), message = '', creation = false) {
    render(() => {
      controls();
      screen(creation ? t('Новая покупка', 'New purchase') : t('Изменить покупку', 'Edit purchase'), `<form>
        ${field(t('Название', 'Name'), 'name', draft.name, 'required')}
        ${field(t('Сумма, ₽', 'Amount, RUB'), 'amount', draft.amount, 'inputmode="decimal" required')}
        <label>${t('Категория', 'Category')}<select name="category" required>
          <option value="">${t('Выберите категорию', 'Select a category')}</option>
          ${editCategories.map((option) => `<option ${option === draft.category ? 'selected' : ''}>${option}</option>`).join('')}
        </select></label>
        ${entered ? `<details><summary>${t('Мой прежний ввод', 'My earlier input')}</summary>
          <p>${escape(entered.name)} · ${money(entered.amount)} · ${escape(entered.category)}</p></details>` : ''}
        ${error()}${isOffline() ? offlineNote() : save()}
      </form>`, () => { entered = undefined; syncOverview(); });
      root.querySelector('form').oninput = (event) => { draft[event.target.name] = event.target.value; };
      if (message === 'offline') showError(t('Не удалось сохранить. Проверьте подключение и повторите.', 'Couldn’t save. Check your connection and try again.'));
      if (message === 'category') showError(t('Категория больше недоступна. Выберите другую.', 'This category is no longer available. Select another one.'));
      form((data) => {
        const amount = parseMoney(data.get('amount'));
        const name = data.get('name').trim();
        if (!name || amount === null || Number.isNaN(amount) || amount < 0) {
          return showError(t('Укажите название и корректную сумму.', 'Enter a name and a valid amount.'));
        }
        const proposed = {name, amount, category: data.get('category')};
        if (simulated === 'offline') return editPurchase(draft, 'offline', creation);
        if (simulated === 'category') {
          editCategories = editCategories.filter((option) => option !== proposed.category);
          simulated = 'success';
          return editPurchase({...draft, category: ''}, 'category', creation);
        }
        if (simulated === 'conflict') {
          purchase = {...purchase, amount: 99000};
          entered = proposed;
          simulated = 'success';
          return conflict(false);
        }
        if (simulated === 'deleted') {
          purchase = null;
          simulated = 'success';
          return deleted(draft);
        }
        if (simulated === 'uncertain') {
          pending = proposed;
          checked = false;
          simulated = 'success';
          return uncertain(draft);
        }
        purchase = proposed;
        entered = undefined;
        syncOverview();
      });
    });
  }

  function conflict(comparing, failed = false) {
    render(() => {
      controls();
      const showRecord = (label, record) => `<div class="card"><strong>${label}</strong>
        <p>${escape(record.name)} · ${money(record.amount)} · ${escape(record.category)}</p></div>`;
      screen(t('Запись изменилась', 'Record changed'), `<div class="stack">
        <p class="notice">${t('Запись уже изменена на другом устройстве. Ваши изменения пока не сохранены.',
          'This record changed on another device. Your edits haven’t been saved.')}</p>
        ${comparing
          ? showRecord(t('Актуальная запись', 'Current record'), purchase) + showRecord(t('Ваш ввод', 'Your input'), entered) +
            actions(button(t('Оставить актуальную запись', 'Keep current record'), () => { entered = undefined; syncOverview(); }),
              button(t('Редактировать актуальную', 'Edit current record'), () => editPurchase(), 'primary', isOffline()))
          : button(t('Посмотреть актуальную запись', 'View current record'), () => conflict(!isOffline(), isOffline()), 'primary')}
        ${failed ? `<p role="alert" class="error">${t('Не удалось загрузить актуальную запись. Ваш ввод сохранён в открытой форме.',
          'Couldn’t load the current record. Your input is still in the open form.')}</p>` : ''}
      </div>`, () => { entered = undefined; syncOverview(); });
    });
  }

  function deleted(draft) {
    render(() => {
      controls();
      screen(t('Запись удалена', 'Record deleted'), `<div class="stack">
        <p class="notice">${t('Запись удалена. Сохранить изменения нельзя.', 'This record was deleted. The changes can’t be saved.')}</p>
        <div class="card">${escape(draft.name)} · ${money(parseMoney(draft.amount))} · ${escape(draft.category)}</div>
        ${actions(button(t('Закрыть', 'Close'), syncOverview),
          button(t('Создать новую запись', 'Create a new record'), () => editPurchase(draft, '', true), 'primary', isOffline()))}
      </div>`, syncOverview);
    });
  }

  function uncertain(draft) {
    render(() => {
      controls();
      screen(t('Проверка сохранения', 'Verify save'), `<div class="stack">
        <p class="notice">${checked ? t('Изменение сохранено.', 'The change was saved.')
          : t('Не удалось получить подтверждение. Изменение могло сохраниться.',
            'No confirmation was received. The change may have been saved.')}</p>
        <div class="card">${escape(draft.name)} · ${money(parseMoney(draft.amount))} · ${escape(draft.category)}</div>
        ${checked ? button(t('К покупкам', 'Back to purchases'), syncOverview, 'primary')
          : button(t('Проверить результат', 'Check result'), () => {
            purchase = pending;
            checked = true;
            uncertain(draft);
          }, 'primary', isOffline())}
        ${!checked && isOffline() ? offlineNote() : ''}
      </div>`, () => {
        if (!checked) purchase = pending;
        syncOverview();
      });
    });
  }

  demo.addEventListener('change', (event) => {
    if (event.target.id === 'simulation') simulated = event.target.value;
  });
  demo.addEventListener('click', (event) => {
    if (event.target.id === 'role') {
      admin = !admin;
      event.target.setAttribute('aria-pressed', String(admin));
      if (activeView === 'sync') syncOverview();
      else if (activeView === 'cabinet') cabinet();
      else categoryList();
    }
  });
  if (page.get('view') === 'sync') syncOverview();
  else if (page.get('view') === 'cabinet') cabinet();
  else if (page.get('view') === 'categories') categoryList();
  else finances();
})();
