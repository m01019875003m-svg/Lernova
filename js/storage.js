const LernovaStore={
  get(k,f){try{const v=localStorage.getItem('lernova_'+k);return v===null?f:JSON.parse(v)}catch{return f}},
  set(k,v){localStorage.setItem('lernova_'+k,JSON.stringify(v));return v},
  today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`},
  known(){const v=this.get('known',[]);return Array.isArray(v)?v:[]},
  review(){const v=this.get('review',[]);return Array.isArray(v)?v:[]},
  xp(){return Number(this.get('xp',0))||0},
  reviews(){return this.get('reviewSchedule',{})},
  reviewDue(){const schedule=this.reviews(),today=this.today();return this.review().filter(key=>!schedule[key]||schedule[key].dueDate<=today)},
  syncCall(method,...args){const fn=window.LernovaSync?.[method];if(typeof fn==='function')fn.apply(window.LernovaSync,args).catch(error=>console.warn('Cloud sync pending:',error.message));},
  addXP(amount=5){this.set('xp',this.xp()+amount);this.touchDaily();this.syncCall('addXP',amount);},
  markKnown(key){const known=new Set(this.known());const isNew=!known.has(key);if(isNew){known.add(key);this.set('known',[...known]);this.addXP(5);}const word=window.LERNOVA?.words?.find(w=>window.LERNOVA.key(w)===key);if(word)this.syncCall('saveWord',word,{status:'known',due_at:null,last_seen_at:new Date().toISOString()});return isNew},
  addReview(key){const keys=new Set(this.review());keys.add(key);this.set('review',[...keys]);const schedule=this.reviews();if(!schedule[key])schedule[key]={stage:0,dueDate:this.today(),lastReviewed:null};else schedule[key].dueDate=this.today();this.set('reviewSchedule',schedule);const word=window.LERNOVA?.words?.find(w=>window.LERNOVA.key(w)===key);if(word)this.syncCall('saveWord',word,{status:'review',due_at:new Date(`${schedule[key].dueDate}T00:00:00`).toISOString()});},
  removeReview(key){this.set('review',this.review().filter(x=>x!==key));const schedule=this.reviews();delete schedule[key];this.set('reviewSchedule',schedule);},
  rateReview(key,remembered){const schedule=this.reviews();const row=schedule[key]||{stage:0,dueDate:this.today()};row.lastReviewed=this.today();if(remembered){row.stage=Math.min(4,(row.stage||0)+1);row.dueDate=this.afterDays([1,3,7,14,30][row.stage]);this.markKnown(key);}else{row.stage=0;row.dueDate=this.afterDays(1);this.addXP(1);}schedule[key]=row;this.set('reviewSchedule',schedule);const word=window.LERNOVA?.words?.find(w=>window.LERNOVA.key(w)===key);if(word)this.syncCall('saveWord',word,{status:remembered?'known':'review',due_at:new Date(`${row.dueDate}T00:00:00`).toISOString(),last_seen_at:new Date().toISOString()});},
  afterDays(n){const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`},
  touchDaily(){const today=this.today(),last=this.get('lastActivity','');if(last!==today){const yesterday=this.afterDays(-1);let streak=Number(this.get('streak',0))||0;this.set('streak',last===yesterday?streak+1:1);this.set('lastActivity',today);this.set('dailyCount',1);}else this.set('dailyCount',(Number(this.get('dailyCount',0))||0)+1);},
  reset(){Object.keys(localStorage).filter(k=>k.startsWith('lernova_')).forEach(k=>localStorage.removeItem(k));location.reload()}
};


// Track unique newly learned words for the profile's daily goal.
(() => {
  const markKnown = LernovaStore.markKnown.bind(LernovaStore);
  LernovaStore.markKnown = function(key) {
    const added = markKnown(key);
    if (!added) return added;
    const today = this.today();
    const dateKey = 'lernova_dailyStudyDate';
    const wordsKey = 'lernova_dailyWords';
    const date = localStorage.getItem(dateKey) || '';
    let words = [];
    try { words = date === today ? JSON.parse(localStorage.getItem(wordsKey) || '[]') : []; } catch {}
    if (!Array.isArray(words)) words = [];
    if (!words.includes(key)) words.push(key);
    localStorage.setItem(dateKey, today);
    localStorage.setItem(wordsKey, JSON.stringify(words));
    window.dispatchEvent(new CustomEvent('lernova:daily-goal-updated'));
    return added;
  };
})();
