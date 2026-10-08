document.addEventListener('DOMContentLoaded',()=>{
 const app=document.getElementById('quizApp');if(!app)return;
 const $=id=>document.getElementById(id),chapterSelect=$('quizChapter'),modeSelect=$('quizMode'),countInput=$('questionCount'),allToggle=$('allWords'),setup=$('quizSetup');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const params=new URLSearchParams(location.search);let queue=[],score=0,index=0,missed=[],current=null,answered=false;
 const titles=new Map(LERNOVA.chapters().map(c=>[c.id,c.title]));
 chapterSelect.add(new Option('كل الفصول','all'));
 LERNOVA.chapters().forEach(c=>chapterSelect.add(new Option(`Kapitel ${c.id} — ${c.title}`,String(c.id))));
 const requestedChapter=params.get('chapter');if(requestedChapter==='all'||titles.has(Number(requestedChapter)))chapterSelect.value=requestedChapter;
 const requestedMode=params.get('mode');if(requestedMode&&[...modeSelect.options].some(o=>o.value===requestedMode))modeSelect.value=requestedMode;
 const wordKey=w=>LERNOVA.key(w),label=w=>`${w.article?`${w.article} `:''}${w.german}`;
 const chapterWords=()=>LERNOVA.words.filter(w=>chapterSelect.value==='all'||w.chapter===Number(chapterSelect.value));
 const grammarItems=()=>((window.LERNOVA_GRAMMAR_QUESTIONS)||[]).filter(q=>chapterSelect.value==='all'||q.chapter===Number(chapterSelect.value));
 function eligibleWords(mode){let words=chapterWords();if(mode==='article')words=words.filter(w=>w.type==='Nomen'&&w.article);if(mode==='plural')words=words.filter(w=>w.type==='Nomen'&&w.plural);return words;}
 function modeChoices(word){const choices=['de-ar','ar-de','typing','listen'];if(word.type==='Nomen'&&word.article)choices.push('article');if(word.type==='Nomen'&&word.plural)choices.push('plural');return choices;}
 function candidates(mode){
  if(mode==='grammar')return grammarItems().map(question=>({kind:'grammar',question}));
  if(mode==='mixed'||mode==='exam'){
   const words=eligibleWords('mixed').map(word=>({kind:'word',word,qmode:modeChoices(word)[Math.floor(Math.random()*modeChoices(word).length)]}));
   return [...words,...grammarItems().map(question=>({kind:'grammar',question}))];
  }
  return eligibleWords(mode).map(word=>({kind:'word',word,qmode:mode}));
 }
 const shuffle=array=>{const a=[...array];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 function updateAvailable(){
  const mode=modeSelect.value,all=candidates(mode).length;
  $('availableCount').textContent=`المتاح في الاختيار الحالي: ${all.toLocaleString('ar-EG')} سؤال.`;
  countInput.max=String(Math.max(1,all));countInput.disabled=allToggle.checked;
  $('countLabel').classList.toggle('muted',allToggle.checked);
  if(Number(countInput.value)>all&&all>0)countInput.value=String(all);
  $('startQuiz').disabled=all===0;
 }
 [chapterSelect,modeSelect].forEach(x=>x.addEventListener('change',updateAvailable));
 allToggle.addEventListener('change',updateAvailable);
 setup.addEventListener('submit',e=>{e.preventDefault();start()});
 function start(){
  let pool=candidates(modeSelect.value);if(!pool.length){app.innerHTML='<div class="empty-state">مفيش أسئلة متاحة للاختيار ده.</div>';return;}
  const all=allToggle.checked,requested=Math.max(1,Math.min(Number(countInput.value)||10,pool.length));
  if(!all&&(modeSelect.value==='mixed'||modeSelect.value==='exam')){
   const grammar=shuffle(pool.filter(q=>q.kind==='grammar')),words=shuffle(pool.filter(q=>q.kind==='word'));
   const n=Math.min(requested,pool.length),grammarCount=Math.min(grammar.length,Math.ceil(n/4));
   pool=[...grammar.slice(0,grammarCount),...words.slice(0,n-grammarCount)];
  }else if(!all)pool=shuffle(pool).slice(0,requested);else pool=shuffle(pool);
  queue=pool;score=0;index=0;missed=[];draw();
 }
 function header(){return `<div class="quiz-head"><span>السؤال ${index+1} / ${queue.length}</span><span>${score} صحيح</span><span>${chapterSelect.value==='all'?'كل الفصول':`Kapitel ${chapterSelect.value}`}</span></div>`;}
 function draw(){
  if(index>=queue.length){finish();return;}
  current=queue[index];answered=false;
  if(current.kind==='grammar'){drawGrammar(current.question);return;}
  drawWord(current.word,current.qmode);
 }
 function drawGrammar(q){
  const opts=shuffle(q.options);current.correct=q.answer;
  app.innerHTML=`${header()}<section class="quiz-question"><small>قواعد · Kapitel ${q.chapter} — ${esc(titles.get(q.chapter)||'')}</small><h2>${esc(q.prompt)}</h2></section><div class="options">${opts.map((o,i)=>`<button class="option" data-option="${i}">${esc(o)}</button>`).join('')}</div><div class="quiz-feedback" id="feedback" aria-live="polite"></div><button class="btn primary" id="continue" hidden>السؤال التالي</button>`;
  app.querySelectorAll('.option').forEach((button,i)=>button.addEventListener('click',()=>grade(opts[i]===q.answer,button,q.answer,q.explanation)));
 }
 function drawWord(word,kind){
  const optionsSource=kind==='article'?eligibleWords('article'):kind==='plural'?eligibleWords('plural'):eligibleWords('mixed');
  const correct=kind==='article'?word.article:kind==='plural'?word.plural:kind==='ar-de'?label(word):word.arabic;
  const prompt=kind==='ar-de'?`<small>اختر الكلمة بالألمانية</small><h2>${esc(word.arabic)}</h2>`:
   kind==='typing'?`<small>اكتب الكلمة الألمانية من دون Artikel</small><h2>${esc(word.arabic)}</h2>`:
   kind==='article'?`<small>اختر Artikel الصحيح</small><h2>${esc(word.german)}</h2>`:
   kind==='plural'?`<small>اختر صيغة الجمع الصحيحة</small><h2>${esc(label(word))}</h2>`:
   kind==='listen'?`<small>استمع إلى الكلمة واختر معناها</small><h2>ما معنى الكلمة التي سمعتها؟</h2>`:
   `<small>اختر المعنى الصحيح</small><h2>${esc(label(word))}</h2>`;
  const choices=kind==='article'?['der','die','das']:null;
  if(kind==='typing'){
   app.innerHTML=`${header()}<div class="quiz-question">${prompt}</div><form id="typingForm" class="toolbar"><input class="field" id="typingAnswer" autocomplete="off" autocapitalize="none" placeholder="اكتب الكلمة هنا"><button class="btn primary">تحقق</button></form><div class="quiz-feedback" id="feedback" aria-live="polite"></div><button class="btn primary" id="continue" hidden>السؤال التالي</button>`;
   $('typingAnswer').focus();$('typingForm').onsubmit=e=>{e.preventDefault();grade(norm($('typingAnswer').value)===norm(word.german),null,word.german,'')};return;
  }
  let distractors;
  if(choices)distractors=choices.filter(x=>x!==correct);
  else{
   const field=kind==='plural'?'plural':kind==='ar-de'?'german':'arabic';
   const values=[...new Set(optionsSource.filter(x=>wordKey(x)!==wordKey(word)).map(x=>kind==='ar-de'?label(x):x[field]).filter(Boolean))].filter(x=>x!==correct);
   distractors=shuffle(values).slice(0,3);
  }
  const options=shuffle([...new Set([correct,...distractors])]);
  app.innerHTML=`${header()}<div class="quiz-question">${prompt}</div>${kind==='listen'?'<button class="speak-big" id="playWord" aria-label="شغّل الكلمة">🔊</button>':''}<div class="options">${options.map((o,i)=>`<button class="option" data-option="${i}">${esc(o)}</button>`).join('')}</div><div class="quiz-feedback" id="feedback" aria-live="polite"></div><button class="btn primary" id="continue" hidden>السؤال التالي</button>`;
  if(kind==='listen'){$('playWord').onclick=()=>LERNOVA.speak(word.german);LERNOVA.speak(word.german)}
  app.querySelectorAll('.option').forEach((button,i)=>button.addEventListener('click',()=>grade(options[i]===correct,button,correct,word.sentence?`${word.sentence} — ${word.sentenceArabic}`:'')));
  function norm(s){return String(s||'').trim().toLocaleLowerCase().normalize('NFC').replace(/[.!?؟،,]/g,'').replace(/\s+/g,' ')}
 }
 function grade(ok,button,correct,explanation){
  if(answered)return;answered=true;
  if(ok){score++;if(current.kind==='word')LernovaStore.markKnown(wordKey(current.word));LernovaStore.addXP(2);if(button)button.classList.add('correct')}
  else{if(current.kind==='word'){LernovaStore.addReview(wordKey(current.word));missed.push(label(current.word))}if(button)button.classList.add('wrong')}
  app.querySelectorAll('.option').forEach(b=>{b.disabled=true;if(b.textContent.trim()===String(correct).trim())b.classList.add('correct')});
  $('feedback').innerHTML=`<p>${ok?'إجابة صحيحة ✓':`الإجابة الصحيحة: <b>${esc(correct)}</b>`}</p>${explanation?`<small>${esc(explanation)}</small>`:''}`;
  $('continue').hidden=false;$('continue').onclick=()=>{index++;draw()};
 }
 function finish(){
  const percent=queue.length?Math.round(score/queue.length*100):0;
  app.innerHTML=`<section class="result"><div class="result-icon">🏆</div><h2>خلص التدريب!</h2><p>نتيجتك: <strong>${score} / ${queue.length}</strong> (${percent}٪)</p><p>الفصل: ${chapterSelect.value==='all'?'كل الفصول':`Kapitel ${chapterSelect.value}`}</p>${missed.length?`<p>أضفنا الكلمات التي أخطأت فيها لقائمة المراجعة.</p><p>${missed.map(esc).join('، ')}</p>`:''}<button class="btn primary" id="again">إعادة بنفس الإعدادات</button></section>`;
  $('again').onclick=start;
 }
 updateAvailable();
});
