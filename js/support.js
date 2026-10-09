(() => {
  const form = document.getElementById('supportForm');
  if (!form) return;
  const category = document.getElementById('supportCategory');
  const input = document.getElementById('supportText');
  const emailInput = document.getElementById('supportEmail');
  const status = document.getElementById('supportMessage');
  const queueKey = 'lernova_support_queue';
  const savedKey = 'lernova_support';
  let sending = false;

  function readArray(key, fallback = '[]') {
    try {
      const value = JSON.parse(localStorage.getItem(key) || fallback);
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  }

  function setStatus(text, isError = false) {
    status.textContent = text;
    status.classList.toggle('is-error', isError);
  }

  function saveQueue(queue) {
    localStorage.setItem(queueKey, JSON.stringify(queue));
  }

  async function syncPending() {
    if (sending || !navigator.onLine) return;
    const client = window.LernovaAuth?.client || window.LernovaAuth?.init?.();
    if (!client) return;
    let queue = readArray(queueKey);
    if (!queue.length) return;
    sending = true;
    try {
      const { data: sessionData } = await client.auth.getSession();
      const userId = sessionData?.session?.user?.id || null;
      while (queue.length) {
        const item = queue[0];
        const row = {
          id: item.id,
          user_id: userId,
          category: item.category,
          body: item.text,
          sender_email: item.email || null,
          created_at: item.date
        };
        const { error } = await client.from('support_messages').upsert(row, {
          onConflict: 'id',
          ignoreDuplicates: true
        });
        if (error) throw error;
        queue.shift();
        saveQueue(queue);
      }
      setStatus('وصلت رسالتك لفريق الدعم ✓');
    } catch (error) {
      console.warn('Lernova support sync is pending:', error?.message || error);
      setStatus('اتحفظت على الجهاز، والإرسال هيتجرب تاني لما الاتصال وقاعدة الدعم يكونوا جاهزين.');
    } finally {
      sending = false;
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (text.length < 8) {
      setStatus('اكتب تفاصيل أكثر قليلًا قبل الحفظ.', true);
      input.focus();
      return;
    }
    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2),
      category: category.value,
      text,
      email: emailInput?.value.trim() || '',
      date: new Date().toISOString()
    };
    try {
      const queue = readArray(queueKey);
      queue.push(item);
      saveQueue(queue);
      const saved = readArray(savedKey, localStorage.getItem('lernovaSupport') || '[]');
      saved.push(item);
      localStorage.setItem(savedKey, JSON.stringify(saved));
      form.reset();
      setStatus(navigator.onLine
        ? 'اتحفظت على الجهاز، وجاري إرسالها…'
        : 'اتحفظت على الجهاز، وهتتبعت تلقائيًا لما الإنترنت يرجع.');
      await syncPending();
    } catch (error) {
      console.warn('Lernova support could not be queued:', error?.message || error);
      setStatus('ماقدرناش نحفظ الرسالة على الجهاز. فضّي مساحة وجرب تاني.', true);
    }
  });

  window.addEventListener('online', syncPending);
  if (navigator.onLine) syncPending();
})();
