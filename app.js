document.addEventListener('DOMContentLoaded',()=>{
 const $=id=>document.getElementById(id);
 if($('xp'))$('xp').textContent=LernovaStore.xp();
 if($('known'))$('known').textContent=LernovaStore.known().length;
 if($('review'))$('review').textContent=LernovaStore.reviewDue().length;
 if($('streak'))$('streak').textContent=LernovaStore.get('streak',0);
 if($('daily'))$('daily').textContent=LernovaStore.get('dailyCount',0);
 const [name]=LERNOVA.level(LernovaStore.xp());if($('level'))$('level').textContent=name;
 const theme=LernovaStore.get('theme','light');document.documentElement.dataset.theme=theme;
 $('themeBtn')?.addEventListener('click',()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;LernovaStore.set('theme',n);});
 $('resetBtn')?.addEventListener('click',()=>{if(confirm('هل تريد حذف تقدمك المحفوظ على هذا الجهاز؟'))LernovaStore.reset()});
 const chapterHost=$('chapterOverview')||$('chapters');
 if(chapterHost&&LERNOVA.words.length){
  const all=LERNOVA.words,known=new Set(LernovaStore.known());
  chapterHost.innerHTML=LERNOVA.chapters().map(c=>{const list=all.filter(w=>w.chapter===c.id),done=list.filter(w=>known.has(LERNOVA.key(w))).length,pct=list.length?Math.round(done/list.length*100):0;return `<a class="card chapter-card" href="${chapterHost.id==='chapters'?'words.html':'pages/words.html'}?chapter=${c.id}"><div class="chapter-row"><small>Kapitel ${c.id}</small><span>${done} / ${list.length}</span></div><h3>${c.title}</h3><div class="progress"><i style="width:${pct}%"></i></div><p>${pct}% مكتمل</p></a>`}).join('');
 }
 const total=LERNOVA.words.length,knownCount=LernovaStore.known().length;
 if($('totalWords'))$('totalWords').textContent=total.toLocaleString('ar-EG');
 if($('courseProgress'))$('courseProgress').textContent=total?`${Math.min(100,Math.round(knownCount/total*100))}%`:'0%';
 const query=new URLSearchParams(location.search).get('chapter');if(query&&$('chapterSelect'))$('chapterSelect').value=query;
 window.addEventListener('lernova:synced',()=>{if($('xp'))$('xp').textContent=LernovaStore.xp();if($('known'))$('known').textContent=LernovaStore.known().length;if($('review'))$('review').textContent=LernovaStore.reviewDue().length;if($('streak'))$('streak').textContent=LernovaStore.get('streak',0);if($('level'))$('level').textContent=LERNOVA.level(LernovaStore.xp())[0];});
});
