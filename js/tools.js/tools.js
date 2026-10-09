(() => {
  const store = window.LernovaStore;
  if (!store) return;
  const safeKeys = () => Object.keys(localStorage).filter(key => key.startsWith('lernova_'));
  const todayWords = () => store.get('dailyStudyDate', '') === store.today() ? store.get('dailyWords', []) : [];
  const clampGoal = value => Math.max(30, Math.min(500, Math.round(Number(value) || 30)));
  if (Number(store.get('dailyGoal', 30)) !== clampGoal(store.get('dailyGoal', 30))) store.set('dailyGoal', clampGoal(store.get('dailyGoal', 30)));
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
      const target = clampGoal(store.get('dailyGoal', 30));
      const count = new Set(Array.isArray(todayWords()) ? todayWords() : []).size;
      const percent = Math.min(100, Math.round(count / target * 100));
      progress.textContent = count >= target ? 'أنجزت هدف اليوم: ' + count + ' من ' + target + ' كلمة 🎉' : 'أنجزت ' + count + ' من ' + target + ' كلمة (' + percent + '%)';
      progress.setAttribute('aria-valuenow', String(Math.min(count, target)));
      progress.setAttribute('aria-valuemax', String(target));
    };
    if (goal) {
      goal.value = String(clampGoal(store.get('dailyGoal', 30)));
      goal.addEventListener('change', () => { const target = clampGoal(goal.value); goal.value = String(target); store.set('dailyGoal', target); updateGoal(); });
      window.addEventListener('lernova:daily-goal-updated', updateGoal);
      updateGoal();
    }


    document.getElementById('exportBackup')?.addEventListener('click', () => {
