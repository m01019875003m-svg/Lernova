(() => {
  const store = window.LernovaStore;
  if (!store) return;
  const safeKeys = () => Object.keys(localStorage).filter(key => key.startsWith('lernova_'));
  const todayWords = () => store.get('dailyStudyDate', '') === store.today() ? store.get('dailyWords', []) : [];
  const originalMarkKnown = store.markKnown.bind(store);
  store.markKnown = function(key) {
    const isNew = !this.known().includes(key);
    const result = originalMarkKnown(key);
    if (isNew && result) {
      const words = new Set(Array.isArray(todayWords()) ? todayWords() : []);
      words.add(key);
      this.set('dailyStudyDate', this.today());
      this.set('dailyWords', [...words]);
      window.dispatchEvent(new CustomEvent('lernova:daily-goal-updated'));
    }
    return result;
  };

  if (window.LernovaSync?.write) {
    const originalWrite = window.LernovaSync.write.bind(window.LernovaSync);
    window.LernovaSync.write = async (...args) => {
      const result = await originalWrite(...args);
      if (result) window.dispatchEvent(new CustomEvent('lernova:sync-complete'));
      return result;
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const status = document.getElementById('syncStatus');
    const goal = document.getElementById('dailyGoal');
    const progress = document.getElementById('dailyGoalProgress');
    const sayStatus = (text, state) => {
      if (!status) return;
      status.textContent = text;
      status.dataset.state = state;
    };
    const refreshStatus = () => sayStatus(navigator.onLine ? 'متصلة بالإنترنت · تقدمك محفوظ على الجهاز' : 'غير متصلة · تقدمك محفوظ على الجهاز وسيُزامن عند الاتصال', navigator.onLine ? 'online' : 'offline');
    refreshStatus();
    window.addEventListener('online', refreshStatus);
    window.addEventListener('offline', refreshStatus);
    window.addEventListener('lernova:sync-complete', () => sayStatus('تمت مزامنة تقدمك مع حسابك ✓', 'synced'));
    window.addEventListener('lernova:synced', refreshStatus);

    const updateGoal = () => {
      if (!goal || !progress) return;
      const target = Number(store.get('dailyGoal', 10)) || 10;
      const count = new Set(Array.isArray(todayWords()) ? todayWords() : []).size;
      const percent = Math.min(100, Math.round(count / target * 100));
      progress.textContent = count >= target ? 'أنجزت هدف اليوم: ' + count + ' من ' + target + ' كلمة 🎉' : 'أنجزت ' + count + ' من ' + target + ' كلمة (' + percent + '%)';
      progress.setAttribute('aria-valuenow', String(Math.min(count, target)));
      progress.setAttribute('aria-valuemax', String(target));
    };
    if (goal) {
      goal.value = String(store.get('dailyGoal', 10));
      goal.addEventListener('change', () => { store.set('dailyGoal', Number(goal.value)); updateGoal(); });
      window.addEventListener('lernova:daily-goal-updated', updateGoal);
      updateGoal();
    }

    document.getElementById('exportBackup')?.addEventListener('click', () => {
      const backup = { app: 'Lernova', version: 1, exportedAt: new Date().toISOString(), data: Object.fromEntries(safeKeys().map(key => [key, localStorage.getItem(key)])) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'lernova-backup-' + store.today() + '.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      sayStatus('تم تنزيل النسخة الاحتياطية على جهازك ✓', 'synced');
    });
    document.getElementById('importBackup')?.addEventListener('change', async event => {
      const file = event.target.files?.[0]; if (!file) return;
      try {
        const backup = JSON.parse(await file.text());
        if (backup.app !== 'Lernova' || !backup.data || typeof backup.data !== 'object') throw new Error('الملف ليس نسخة احتياطية صالحة من Lernova.');
        for (const [key, raw] of Object.entries(backup.data)) {
          if (!key.startsWith('lernova_') || typeof raw !== 'string') continue;
          const existing = localStorage.getItem(key);
          if (existing === null) { localStorage.setItem(key, raw); continue; }
          let incomingValue, existingValue;
          try { incomingValue = JSON.parse(raw); existingValue = JSON.parse(existing); } catch { continue; }
          if (Array.isArray(incomingValue) && Array.isArray(existingValue)) localStorage.setItem(key, JSON.stringify([...new Set([...existingValue, ...incomingValue])]));
          else if (['lernova_xp', 'lernova_streak'].includes(key)) localStorage.setItem(key, JSON.stringify(Math.max(Number(existingValue) || 0, Number(incomingValue) || 0)));
          else if (key === 'lernova_dailyStudyDate' && String(incomingValue) > String(existingValue)) localStorage.setItem(key, raw);
          else if (key === 'lernova_dailyWords' && localStorage.getItem('lernova_dailyStudyDate') === store.today()) localStorage.setItem(key, JSON.stringify([...new Set([...existingValue, ...incomingValue])]));
          else localStorage.setItem(key, raw);
        }
        sayStatus('تم استيراد التقدم. أعد تحميل الصفحة لتحديث الأرقام ✓', 'synced');
      } catch (error) { sayStatus(error.message || 'تعذر استيراد النسخة الاحتياطية.', 'offline'); }
      finally { event.target.value = ''; }
    });

    const voiceStatus = document.getElementById('offlineVoiceStatus');
    const testVoice = document.getElementById('testOfflineVoice');
    const checkVoice = () => {
      const voices = window.speechSynthesis?.getVoices?.() || [];
      const localGerman = voices.find(voice => /^de(-|$)/i.test(voice.lang) && voice.localService);
      if (voiceStatus) voiceStatus.textContent = localGerman ? 'صوت ألماني محمّل على الجهاز: ' + localGerman.name : 'لم يظهر صوت ألماني محمّل محليًا. ثبّتي الصوت الألماني من إعدادات تحويل النص إلى كلام في الهاتف ليعمل النطق دون إنترنت.';
      if (testVoice) testVoice.disabled = !localGerman;
      return localGerman;
    };
    checkVoice();
    window.speechSynthesis?.addEventListener?.('voiceschanged', checkVoice);
    testVoice?.addEventListener('click', () => { const voice = checkVoice(); if (!voice) return; const utterance = new SpeechSynthesisUtterance('Guten Tag! Wie geht es dir?'); utterance.lang = 'de-DE'; utterance.voice = voice; window.speechSynthesis.speak(utterance); });
  });
})();
