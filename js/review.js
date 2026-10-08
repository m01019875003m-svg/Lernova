document.addEventListener('DOMContentLoaded',()=>{
 const app=document.getElementById('reviewApp');if(!app)return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const keys=LernovaStore.reviewDue(),items=keys.map(k=>LERNOVA.words.find(w=>LERNOVA.key(w)===k)).filter(Boolean);
 if(!items.length){app.innerHTML='<div class="empty large">🎉 لا توجد كلمات مستحقة للمراجعة الآن. أضف كلمات من صفحة الكلمات أو ارجع لاحقًا.</div>';return;}
 let i=0;
 function draw(){
  if(i>=items.length){app.innerHTML='<div class="result"><div class="result-icon">✅</div><h2>خلصت مراجعة اليوم</h2><p>حدّثنا مواعيد المراجعة القادمة حسب إجاباتك.</p><a class="btn primary" href="../index.html">العودة للرئيسية</a></div>';return;}
  const w=items[i],key=LERNOVA.key(w);app.innerHTML=`<div class="review-card"><span class="counter">${i+1} / ${items.length}</span><p class="muted">Kapitel ${w.chapter} · ${esc(w.category)}</p><h1>${w.article?`${esc(w.article)} `:''}${esc(w.german)}</h1><button class="speak-big" id="speak" aria-label="استمع إلى الكلمة">🔊</button><div id="answer" hidden><p class="arabic">${esc(w.arabic)}</p><div class="sentence"><b>${esc(w.sentence||'')}</b><br><small>${esc(w.sentenceArabic||'')}</small></div>${w.plural?`<p class="meta">Plural: ${esc(w.plural)}</p>`:''}</div><div class="review-actions" id="actions"><button class="btn primary" id="showAnswer">إظهار المعنى والجملة</button></div></div>`;
  document.getElementById('speak').onclick=()=>LERNOVA.speak(w.german);
  document.getElementById('showAnswer').onclick=()=>{document.getElementById('answer').hidden=false;document.getElementById('actions').innerHTML='<button class="btn primary" id="remembered">عرفتها ✓</button><button class="btn ghost" id="forgot">لسه محتاجة مراجعة</button>';document.getElementById('remembered').onclick=()=>{LernovaStore.rateReview(key,true);i++;draw()};document.getElementById('forgot').onclick=()=>{LernovaStore.rateReview(key,false);i++;draw()};};
 }
 draw();
});
