const LERNOVA = {
  get words(){ return Array.isArray(window.lernovaA1Words) ? window.lernovaA1Words : []; },
  chapterTitles:{1:'Guten Tag!',2:'Freunde, Kollegen und ich',3:'In Hamburg',4:'Guten Appetit!',5:'Alltag und Familie',6:'Zeit mit Freunden',7:'Arbeitsalltag',8:'Fit und gesund',9:'Meine Wohnung',10:'Studium und Beruf',11:'Die Jacke gefällt mir!',12:'Ab in den Urlaub!'},
  key(w){return [w.chapter,w.category,w.order,w.german].join('|')},
  search(q){q=(q||'').trim().toLocaleLowerCase(); if(!q)return this.words; return this.words.filter(w=>`${w.german} ${w.arabic} ${w.type} ${w.article} ${w.plural} ${w.sentence} ${w.sentenceArabic} Kapitel ${w.chapter}`.toLocaleLowerCase().includes(q));},
  chapters(){return [...new Set(this.words.map(w=>w.chapter))].sort((a,b)=>a-b).map(n=>({id:n,title:this.chapterTitles[n]||`Kapitel ${n}`,count:this.words.filter(w=>w.chapter===n).length}));},
  categories(ch){return [...new Set(this.words.filter(w=>!ch||w.chapter===+ch).map(w=>w.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de',{numeric:true}));},
  speak(text){if(!('speechSynthesis' in window))return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text);u.lang='de-DE';u.rate=.82;speechSynthesis.speak(u);},
  level(xp){if(xp>=1000)return['Lernova Meister',5];if(xp>=500)return['Sprachprofi',4];if(xp>=250)return['Fortgeschritten',3];if(xp>=100)return['Lernender',2];return['Anfänger',1];}
};
window.LERNOVA=LERNOVA;
