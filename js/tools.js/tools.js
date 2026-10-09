(() => {
  const store = window.LernovaStore || {
    get(k, fallback) { try { const v = localStorage.getItem('lernova_' + k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(k, value) { localStorage.setItem('lernova_' + k, JSON.stringify(value)); return value; },
    today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  };
  const clamp = value => Math.max(5, Math.min(1943, Math.round(Number(value) || 5)));
  document.addEventListener('DOMContentLoaded', () => {
    const goal = document.getElementById('dailyGoal');
    const progress = document.getElementById('dailyGoalProgress');
    const wordsToday = () => store.get('dailyStudyDate', '') === store.today() ? store.get('dailyWords', []) : [];
    const update = () => { if (!goal || !progress) return; const target = clamp(store.get('dailyGoal', 5)); const count = new Set(wordsToday()).size; progress.textContent = count >= target ? 'أنجزت هدف اليوم: ' + count + ' من ' + target + ' كلمة 🎉' : 'أنجزت ' + count + ' من ' + target + ' كلمة (' + Math.min(100, Math.round(count / target * 100)) + '%)'; };
    if (goal) {
      const save = () => { goal.value = String(clamp(goal.value)); store.set('dailyGoal', Number(goal.value)); update(); };
      goal.value = String(clamp(store.get('dailyGoal', 5)));
      goal.addEventListener('change', save);
      document.querySelectorAll('.goal-preset').forEach(button => button.addEventListener('click', () => { goal.value = button.dataset.goal; save(); }));
      window.addEventListener('lernova:daily-goal-updated', update); update();
    }
    document.getElementById('exportBackup')?.addEventListener('click', () => {
      const data = Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('lernova_')).map(k => [k, localStorage.getItem(k)]));
      const url = URL.createObjectURL(new Blob([JSON.stringify({app:'Lernova',version:1,data}, null, 2)], {type:'application/json'}));
      const a = document.createElement('a'); a.href = url; a.download = 'lernova-backup.json'; a.click(); URL.revokeObjectURL(url);
    });
    document.getElementById('importBackup')?.addEventListener('change', async event => {
      try { const file = event.target.files?.[0]; if (!file) return; const data = JSON.parse(await file.text()).data; if (!data || typeof data !== 'object') throw new Error();
        Object.entries(data).filter(([k]) => k.startsWith('lernova_')).forEach(([k,v]) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)));
        location.reload();
      } catch { alert('تعذر استيراد النسخة. تأكد من اختيار ملف Lernova صحيح.'); }
    });
  });
})();
