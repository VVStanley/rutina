(() => {
  const {root, demo, t, escape, field, error, showError, actions, button, save,
    offlineNote, screen, render, form, confirmAction, toolbar, offlineButton, isOffline, page} = scenario;
  const family = [
    {id: 1, name: 'Алексей', type: 'person', admin: true, access: 'active', email: 'alex@example.test'},
    {id: 2, name: 'Марина', type: 'person', access: 'active', email: 'marina@example.test'},
    {id: 3, name: 'Саша', type: 'person', access: 'none', purchases: true},
    {id: 4, name: 'Мята', type: 'pet', access: 'none'}
  ];
  const mailbox = [];
  let nextId = 5;
  let view = page.get('role') === 'member' ? 'member' : 'admin';
  let participant = family[1];
  const receivedAccess = new Map([[participant.id, 'active']]);
  let anotherAccount = false;
  const roleOptions = () => [['admin', t('Администратор', 'Admin')], ['member', t('Участник', 'Member')],
    ['mail', t('Тестовые письма', 'Sample emails')], ['device', t('Телефон участника', 'Member’s phone')]];
  const memberAccess = (member) => ({
    active: t('Активен', 'Active'), inactive: t('Приостановлен', 'Suspended'),
    none: t('Без учётной записи', 'No account')
  })[member.access];
  const typeName = (type) => type === 'person' ? t('Человек', 'Person') : t('Питомец', 'Pet');

  function controls(extra = '') {
    toolbar(offlineButton() + `<label>${t('Режим макета', 'Preview mode')}<select id="mode">
      ${roleOptions().map(([value, title]) => `<option value="${value}" ${view === value ? 'selected' : ''}>${title}</option>`).join('')}
    </select></label>` + extra);
  }

  function list() {
    render(() => {
      controls();
      screen(t('Состав семьи', 'Family members'), `<div class="stack">
        ${isOffline() ? offlineNote() : ''}
        ${family.map((member) => `<div class="stack">
          ${button(member.name, () => detail(member), 'entry')}
          <small>${typeName(member.type)} · ${member.admin ? t('Администратор', 'Admin') : memberAccess(member)}</small>
        </div>`).join('')}
        ${view === 'admin' ? button(t('Добавить члена семьи', 'Add family member'), () => add(), 'primary', isOffline()) : ''}
      </div>`);
    });
  }

  function detail(member) {
    render(() => {
      controls();
      const canManage = view === 'admin' && !member.admin;
      const pending = member.invite?.state === 'pending';
      const account = member.access !== 'none';
      const remove = () => confirmAction(t('Удалить карточку?', 'Delete family member?'),
        `<p>${escape(member.name)}</p><p>${t('Восстановить карточку в приложении нельзя.', 'You can’t restore the profile in the app.')}</p>`,
        t('Удалить', 'Delete'), () => {
          if (member.invite) member.invite.state = 'invalid';
          family.splice(family.indexOf(member), 1);
          list();
        }, true);

      screen(t('Карточка члена семьи', 'Family member profile'), `<div class="stack">
        ${isOffline() ? offlineNote() : ''}
        <div class="card"><strong>${escape(member.name)}</strong><small class="meta">${typeName(member.type)}</small></div>
        ${member.type === 'person' ? `
          <div class="card"><small class="meta">${t('Доступ к приложению', 'App access')}</small>
            ${memberAccess(member)}
            ${member.displayName ? `<small class="meta">${t('Отображаемое имя', 'Display name')} · ${escape(member.displayName)}</small>` : ''}
          </div>` : ''}
        ${canManage && pending ? `<div class="card stack">
          <strong>${t('Приглашение ожидает принятия', 'Invitation pending')}</strong>
          <small>${escape(member.invite.email)}</small>
          ${actions(button(t('Отправить заново', 'Resend'), () => sendInvite(member, member.invite.email), '', isOffline()),
            button(t('Отменить приглашение', 'Cancel invitation'), () => {
              member.invite.state = 'invalid';
              detail(member);
            }, '', isOffline()))}
        </div>` : ''}
        ${canManage && member.type === 'person' && !account && !pending
          ? button(t('Пригласить в приложение', 'Invite to the app'), () => inviteForm(member), 'primary', isOffline()) : ''}
        ${canManage && account ? actions(
          button(member.access === 'active' ? t('Приостановить доступ', 'Suspend access') : t('Вернуть доступ', 'Restore access'),
            () => changeAccess(member), '', isOffline()),
          button(t('Отправить ссылку сброса пароля', 'Send password reset link'), () => resetLink(member), '', isOffline())) : ''}
        ${canManage ? button(t('Удалить карточку', 'Delete family member'), remove, 'danger', isOffline() || account || member.purchases) : ''}
        ${canManage && (account || member.purchases) ? `<small>${t('Карточка связана с покупками или учётной записью.',
          'This profile is linked to purchases or an account.')}</small>` : ''}
      </div>`, list);
    });
  }

  function add(draft = {name: '', type: 'person'}) {
    render(() => {
      controls();
      screen(t('Новый член семьи', 'New family member'), `<form>
        <label>${t('Тип', 'Type')}<select name="type">
          ${['person', 'pet'].map((value) => `<option value="${value}" ${value === draft.type ? 'selected' : ''}>${typeName(value)}</option>`).join('')}
        </select></label>
        ${field(t('Имя', 'Name'), 'name', draft.name, 'required')}
        ${error()}${isOffline() ? offlineNote() : save()}
      </form>`, list);
      root.querySelector('form').oninput = (event) => { draft[event.target.name] = event.target.value; };
      form((data) => {
        const name = data.get('name').trim();
        if (!name) return showError(t('Укажите имя.', 'Enter a name.'));
        const member = {id: nextId++, name, type: data.get('type'), access: 'none'};
        family.push(member);
        detail(member);
      });
    });
  }

  function sendInvite(member, email) {
    if (member.invite) member.invite.state = 'invalid';
    const letter = {kind: 'invite', state: 'pending', member, email};
    member.invite = letter;
    mailbox.push(letter);
    detail(member);
  }

  function inviteForm(member, email = '') {
    render(() => {
      controls();
      screen(t('Приглашение в приложение', 'Invite to the app'), `<form>
        <p>${escape(member.name)}</p>
        ${field(t('Почта', 'Email'), 'email', email, 'type="email" required')}
        <small>${t('Для проверки занятой почты: marina@example.test', 'To preview a registered email: marina@example.test')}</small>
        ${error()}${isOffline() ? offlineNote() : save(t('Отправить приглашение', 'Send invitation'))}
      </form>`, () => detail(member));
      root.querySelector('form').oninput = (event) => { email = event.target.value; };
      form((data) => {
        email = data.get('email').toLowerCase();
        if (family.some((entry) => entry.email === email)) {
          return showError(t('Эта почта уже зарегистрирована. Укажите другую.', 'This email is already registered. Enter a different one.'));
        }
        sendInvite(member, email);
      });
    });
  }

  function changeAccess(member) {
    const suspend = member.access === 'active';
    confirmAction(suspend ? t('Приостановить доступ?', 'Suspend access?') : t('Вернуть доступ?', 'Restore access?'),
      `<p>${escape(member.name)}</p><p>${suspend
        ? t('Карточка и семейные записи сохранятся. После обновления телефон участника скроет данные и отменит напоминания.',
          'The profile and family records stay. After updating, the member’s phone will hide data and cancel reminders.')
        : t('После проверки доступа и обновления участник снова увидит данные. Новая регистрация не нужна.',
          'The member can view data after access is verified and data is refreshed. They can use their existing account.')}</p>`,
      suspend ? t('Приостановить', 'Suspend') : t('Вернуть доступ', 'Restore access'),
      () => { member.access = suspend ? 'inactive' : 'active'; detail(member); });
  }

  function resetLink(member) {
    confirmAction(t('Отправить ссылку сброса пароля?', 'Send password reset link?'),
      `<p>${escape(member.email)}</p><p>${t('Ссылка одноразовая и действует 30 минут.', 'The single-use link is valid for 30 minutes.')}</p>`,
      t('Отправить', 'Send'), () => {
        mailbox.push({kind: 'reset', state: 'pending', member, email: member.email});
        render(() => {
          controls();
          screen(t('Ссылка отправлена', 'Link sent'), `<p>${escape(member.email)}</p>`, () => detail(member));
        });
      });
  }

  function mail() {
    render(() => {
      controls();
      screen(t('Тестовые письма', 'Sample emails'), `<div class="stack">
        ${mailbox.length ? [...mailbox].reverse().map((letter) => button(
          `${letter.kind === 'invite' ? t('Приглашение', 'Invitation') : t('Сброс пароля', 'Password reset')} · ${letter.email}`,
          () => openLetter(letter), 'entry')).join('') : `<p>${t('Писем пока нет.', 'No emails yet.')}</p>`}
      </div>`);
    });
  }

  function openLetter(letter, name = '') {
    render(() => {
      const invitation = letter.kind === 'invite';
      const accountControl = invitation ? `<button type="button" id="another-account" aria-pressed="${anotherAccount}">
        ${t('Открыт другой аккаунт', 'Different account signed in')}</button>` : '';
      const expiryControl = invitation || letter.state !== 'pending' || isOffline() ? ''
        : button(t('Имитировать истечение 30 минут', 'Simulate 30 minutes passing'),
          () => { letter.state = 'expired'; openLetter(letter); });
      controls(accountControl + expiryControl);
      const accountToggle = demo.querySelector('#another-account');
      if (accountToggle) accountToggle.onclick = () => { anotherAccount = !anotherAccount; openLetter(letter, name); };
      const title = invitation ? t('Приглашение', 'Invitation') : t('Новый пароль', 'New password');
      if (isOffline()) {
        screen(title, `<p class="notice">${t('Для проверки ссылки нужно подключение.', 'Connect to verify the link.')}</p>`, mail);
        return;
      }
      const invalid = letter.state === 'pending' && invitation && family.some((member) => member.email === letter.email);
      if (letter.state !== 'pending' || invalid) {
        const message = letter.state === 'used' ? t('Ссылка уже использована.', 'This link has already been used.')
          : letter.state === 'expired' ? t('Срок ссылки истёк. Запросите новую.', 'The link has expired. Request a new one.')
          : t('Приглашение недействительно.', 'The invitation is invalid.');
        screen(title, `<p class="notice">${message}</p>`, mail);
        return;
      }
      if (invitation && anotherAccount) {
        screen(title, `<p class="notice">${t(
          'На этом устройстве уже открыт другой аккаунт. Откройте приглашение на устройстве, где подключаетесь к дому.',
          'A different account is signed in on this device. Open the invitation on the device you are using to join the home.'
        )}</p>`, mail);
        return;
      }
      screen(title, `<form><p>${escape(letter.email)}</p>
        ${invitation ? field(t('Отображаемое имя', 'Display name'), 'name', name, 'required') : ''}
        ${field(invitation ? t('Задайте пароль', 'Set your password') : title, 'password', '', 'type="password" autocomplete="new-password" required')}
        ${error()}${save(invitation ? t('Принять приглашение', 'Accept invitation') : t('Изменить пароль', 'Change password'))}
      </form>`, mail);
      if (invitation) root.querySelector('[name="name"]').oninput = (event) => { name = event.target.value; };
      form(() => {
        if (invitation && !name.trim()) return showError(t('Укажите отображаемое имя.', 'Enter your display name.'));
        letter.state = 'used';
        participant = letter.member;
        if (invitation) {
          Object.assign(participant, {access: 'active', displayName: name.trim(), email: letter.email});
          receivedAccess.set(participant.id, 'active');
        } else {
          participant.needsSignIn = true;
        }
        view = 'device';
        device(invitation ? 'joined' : '');
      });
    });
  }

  function device(message = '') {
    render(() => {
      controls();
      const refresh = () => { receivedAccess.set(participant.id, participant.access); device(); };
      const load = button(t('Обновить', 'Refresh'), refresh, 'primary', isOffline());
      if (participant.needsSignIn) {
        screen(t('Вход', 'Sign in'), `<form>
          <p class="notice">${t('Пароль изменён. Войдите заново на всех устройствах.', 'Password changed. Sign in again on all devices.')}</p>
          ${field(t('Почта', 'Email'), 'email', participant.email, 'type="email" required')}
          ${field(t('Пароль', 'Password'), 'password', '', 'type="password" required')}
          ${isOffline() ? offlineNote() : save(t('Войти', 'Sign in'))}
        </form>`);
        form(() => { participant.needsSignIn = false; refresh(); });
        return;
      }
      if (receivedAccess.get(participant.id) === 'inactive') {
        screen(t('Доступ к дому', 'Home access'), `<div class="stack">
          <p class="notice">${t('Доступ к дому приостановлен. Обратитесь к администратору.',
            'Access to this home is suspended. Contact your admin.')}</p>${load}</div>`);
        return;
      }
      screen(t('Главная', 'Home'), `<div class="stack">
        ${message === 'joined' ? `<p class="notice">${t('Приглашение принято.', 'Invitation accepted.')}</p>` : ''}
        ${isOffline() ? offlineNote() : ''}
        <p>${escape(participant.displayName ?? participant.name)}</p>
        <div class="card">${t('Ближайшие дела', 'Upcoming tasks')}<small class="meta">Заменить фильтр для воды</small></div>
        ${load}
      </div>`);
    });
  }

  demo.addEventListener('change', (event) => {
    if (event.target.id !== 'mode') return;
    view = event.target.value;
    if (view === 'mail') mail();
    else if (view === 'device') device();
    else list();
  });
  list();
})();
