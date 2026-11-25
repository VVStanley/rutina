(() => {
  const {root, demo, t, escape, date, field, actions, button, save, offlineNote,
    screen, render, form, confirmAction, toolbar, offlineButton, isOffline, page} = scenario;
  let notes = [
    {id: 1, text: 'Размер полки в прихожей — 68 × 24 см.', date: '', author: 'Алексей'},
    {id: 2, text: 'На приёме уточнить, когда повторить анализы.', date: '2026-11-25', author: 'Марина'}
  ];
  let nextId = 3;
  let admin = false;
  const role = () => `<button type="button" id="role" aria-pressed="${admin}">${admin ? t('Администратор', 'Admin') : t('Участник', 'Member')}</button>`;
  const summary = (item) => item.text.length > 76 ? item.text.slice(0, 76) + '…' : item.text;
  const noteRows = (items, back) => items.map((item) =>
    `<div class="stack">${button(summary(item), () => detail(item, back), 'entry')}
      ${item.date ? `<small>${date(item.date)}</small>` : ''}</div>`).join('');

  function list() {
    render(() => {
      toolbar(offlineButton() + role());
      screen(t('Заметки', 'Notes'), `<div class="stack">
        ${isOffline() ? offlineNote() : ''}
        ${button(t('Добавить заметку', 'Add note'), () => edit(), 'primary', isOffline())}
        ${notes.length ? noteRows(notes, list) : `<p>${t('Заметок пока нет.', 'No notes yet.')}</p>`}
        ${button(t('Открыть календарь', 'Open calendar'), calendar)}
      </div>`);
    });
  }

  function detail(item, previous = list) {
    render(() => {
      toolbar(offlineButton() + role());
      const remove = () => confirmAction(t('Удалить заметку?', 'Delete note?'),
        `<p>${escape(summary(item))}</p><p>${t('Восстановить заметку в приложении нельзя.', 'You can’t restore the note in the app.')}</p>`,
        t('Удалить', 'Delete'), () => { notes = notes.filter(({id}) => id !== item.id); previous(); }, true);
      screen(t('Заметка', 'Note'), `<div class="stack">
        ${isOffline() ? offlineNote() : ''}
        <div class="card"><p class="note-text">${escape(item.text)}</p>
          <small class="meta">${t('Автор', 'Author')} · ${escape(item.author)}</small>
          ${item.date ? `<small class="meta">${date(item.date)}</small>` : ''}
        </div>
        ${actions(button(t('Изменить', 'Edit'), () => edit(item, previous), 'primary', isOffline()),
          admin ? button(t('Удалить', 'Delete'), remove, 'danger', isOffline()) : '')}
      </div>`, previous);
    });
  }

  function edit(item, previous = list, draft = {text: item?.text ?? '', date: item?.date ?? ''}) {
    render(() => {
      toolbar(offlineButton() + role());
      screen(item ? t('Изменить заметку', 'Edit note') : t('Новая заметка', 'New note'), `
        <form>
          <label>${t('Текст', 'Text')}<textarea name="text" required>${escape(draft.text)}</textarea></label>
          ${field(t('Дата (необязательно)', 'Date (optional)'), 'date', draft.date, 'type="date"')}
          <small>${t('Заметка с датой появится в календаре. Напоминание не создаётся.',
            'A dated note appears in the calendar. It does not create a reminder.')}</small>
          ${isOffline() ? offlineNote() : save()}
        </form>`, item ? () => detail(item, previous) : previous);
      const noteForm = root.querySelector('form');
      noteForm.oninput = (event) => {
        draft[event.target.name] = event.target.value;
        event.target.setCustomValidity('');
      };
      form((data) => {
        const text = data.get('text').trim();
        if (!text) {
          noteForm.elements.text.setCustomValidity(t('Введите текст заметки.', 'Enter note text.'));
          noteForm.elements.text.reportValidity();
          return;
        }
        const updated = {id: item?.id ?? nextId++, text, date: data.get('date'),
          author: item?.author ?? (admin ? 'Алексей' : 'Марина')};
        if (item) notes = notes.map((entry) => entry.id === item.id ? updated : entry);
        else notes.push(updated);
        detail(updated, previous);
      });
    });
  }

  function calendar() {
    render(() => {
      toolbar(offlineButton() + role());
      const dated = notes.filter((item) => item.date).sort((a, b) => a.date.localeCompare(b.date));
      screen(t('Календарь', 'Calendar'), `<div class="stack">${isOffline() ? offlineNote() : ''}
        <h2>${t('Датированные заметки', 'Dated notes')}</h2>
        ${dated.length ? noteRows(dated, calendar) : `<p>${t('Заметок с датой пока нет.', 'No dated notes yet.')}</p>`}
      </div>`, list);
    });
  }

  demo.addEventListener('click', (event) => {
    if (event.target.id === 'role') { admin = !admin; list(); }
  });
  if (page.get('view') === 'calendar') calendar();
  else list();
})();
