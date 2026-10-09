(() => {
  const statusBox = document.getElementById('inboxStatus');
  const list = document.getElementById('inboxList');
  const refreshButton = document.getElementById('refreshInbox');
  const emptyBox = document.getElementById('inboxEmpty');
  if (!statusBox || !list) return;

  const categoryLabels = {
    suggestion: 'اقتراح للتطوير',
    problem: 'مشكلة تقنية',
    complaint: 'شكوى',
    other: 'أخرى'
  };
  const statusLabels = { new: 'جديدة', read: 'تمت المراجعة', resolved: 'تم الحل' };
  let client;

  function showStatus(text, isError = false) {
    statusBox.textContent = text;
    statusBox.classList.toggle('is-error', isError);
  }

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  async function changeStatus(row, nextStatus, button) {
    button.disabled = true;
    const { error } = await client.from('support_messages').update({ status: nextStatus }).eq('id', row.id);
    button.disabled = false;
    if (error) {
      showStatus('تعذر تحديث حالة الرسالة. حاول مرة أخرى.', true);
      return;
    }
    row.status = nextStatus;
    await loadInbox();
    showStatus('تم تحديث حالة الرسالة.');
  }

  function renderMessage(row) {
    const card = make('article', 'card inbox-message');
    const header = make('div', 'inbox-message-head');
    const title = make('h2', '', categoryLabels[row.category] || 'رسالة دعم');
    const badge = make('span', 'inbox-status inbox-status-' + row.status, statusLabels[row.status] || 'جديدة');
    header.append(title, badge);
    card.append(header);
    card.append(make('p', 'inbox-message-body', row.body));

    const details = make('div', 'inbox-message-details');
    const date = new Date(row.created_at);
    details.append(make('span', '', Number.isNaN(date.valueOf()) ? 'تاريخ غير متاح' : date.toLocaleString('ar-EG')));
    details.append(make('span', '', row.sender_email ? 'بريد الرد: ' + row.sender_email : (row.user_id ? 'مستخدم مسجل' : 'رسالة دون تسجيل دخول')));
    card.append(details);

    if (row.sender_email) {
      const reply = make('a', 'btn primary inbox-action', '✉️ الرد عبر البريد');
      reply.href = 'mailto:' + encodeURIComponent(row.sender_email) + '?subject=' + encodeURIComponent('رد Lernova على رسالتك') + '&body=' + encodeURIComponent('مرحبًا،\n\nشكرًا لتواصلك مع Lernova.\n\n');
      reply.setAttribute('aria-label', 'الرد على رسالة ' + row.sender_email);
      card.append(reply);
    }

    if (row.status !== 'resolved') {
      const nextStatus = row.status === 'new' ? 'read' : 'resolved';
      const actionText = row.status === 'new' ? 'تمت المراجعة' : 'تم الحل';
      const button = make('button', 'btn ghost inbox-action', actionText);
      button.type = 'button';
      button.addEventListener('click', () => changeStatus(row, nextStatus, button));
      card.append(button);
    }
    list.append(card);
  }

  function render(rows) {
    list.replaceChildren();
    const fresh = rows.filter(row => row.status === 'new').length;
    document.getElementById('inboxCount').textContent = String(rows.length);
    document.getElementById('inboxNewCount').textContent = String(fresh);
    emptyBox.hidden = rows.length > 0;
    for (const row of rows) renderMessage(row);
  }

  async function loadInbox() {
    if (!client) return;
    refreshButton.disabled = true;
    showStatus('جاري تحميل الرسائل…');
    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData?.session) {
        showStatus('سجل الدخول بحساب Lernova المصرح له لفتح صندوق الرسائل.', true);
        list.replaceChildren();
        emptyBox.hidden = true;
        return;
      }

      const { data: allowed, error: permissionError } = await client.rpc('lernova_is_support_admin');
      if (permissionError) throw permissionError;
      if (!allowed) {
        showStatus('هذا الحساب غير مضاف كمسؤول لصندوق الدعم. أكمل خطوة إضافة حسابك في تعليمات SETUP.md.', true);
        list.replaceChildren();
        emptyBox.hidden = true;
        return;
      }

      const { data, error } = await client.from('support_messages')
        .select('id,category,body,sender_email,created_at,status,user_id')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      showStatus('صندوق الدعم متصل.');
      render(data || []);
    } catch (error) {
      console.warn('Lernova support inbox unavailable:', error?.message || error);
      showStatus('تعذر تحميل الصندوق. تأكد من تشغيل supabase/support.sql ثم أعد المحاولة.', true);
      list.replaceChildren();
      emptyBox.hidden = true;
    } finally {
      refreshButton.disabled = false;
    }
  }

  client = window.LernovaAuth?.client || window.LernovaAuth?.init?.();
  refreshButton.addEventListener('click', loadInbox);
  window.addEventListener('online', loadInbox);
  if (client) loadInbox();
  else showStatus('إعداد اتصال Supabase غير مكتمل.', true);
})();
