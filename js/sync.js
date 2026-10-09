/* Account-scoped, retryable progress sync. Database rows remain protected by RLS. */
window.LernovaSync={
 ready:false,queue:Promise.resolve(),timer:null,status:'local',
 device(){let id=localStorage.getItem('lernova_device');if(!id){id=crypto.randomUUID();localStorage.setItem('lernova_device',id);}return id;},
 snapshot(){const s=window.LernovaStore;return {id:s.userId,xp:s.xp(),counter:Number(s.get('_xpCounter',0)),known:s.known(),review:s.review(),words:s.get('_wordStates',{}),times:s.get('_fieldTimes',{}),fields:Object.fromEntries([...s.fields,'lastActivity','streak'].map(k=>[k,s.get(k,null)]))};},
 view(){const s=window.LernovaStore;return s?JSON.stringify([s.userId,s.xp(),s.known(),s.review(),...s.fields.map(k=>s.get(k,null)),s.get('streak',0)]):'';},
 state(status){this.status=status;window.dispatchEvent(new CustomEvent('lernova:sync-status',{detail:status}));},
 async user(){const c=window.LernovaAuth?.client;if(!c)return null;const {data,error}=await c.auth.getSession();if(error)throw error;return data?.session?.user||null;},
 async read(user){const {data,error}=await LernovaAuth.client.from('user_progress').select('*').eq('user_id',user.id).maybeSingle();if(error)throw error;return data;},
 merge(old,local){
  const state=old?.client_state||{},words={...state.words};
  for(const key of new Set([...(old?.known_words||[]),...(old?.review_words||[])]))if(!words[key])words[key]={known:(old?.known_words||[]).includes(key),review:(old?.review_words||[]).includes(key),time:0};
  for(const key of new Set([...local.known,...local.review]))if(!local.words[key]&&!words[key])words[key]={known:local.known.includes(key),review:local.review.includes(key),time:0};
  for(const [key,value] of Object.entries(local.words))if(!words[key]||Number(value.time)>=Number(words[key].time))words[key]=value;
  const fields={...state.fields},times={...state.times};
  for(const [key,value] of Object.entries(local.fields))if(value!==null&&(!(key in fields)||Number(local.times[key]||0)>Number(times[key]||0))){fields[key]=value;times[key]=local.times[key]||0;}
  const remoteDate=old?.last_activity||'',localDate=local.fields.lastActivity||'';
  const last=localDate>=remoteDate?localDate:remoteDate;
  const streak=localDate>=remoteDate?Number(local.fields.streak??old?.streak??0):Number(old?.streak||0);
  const device=this.device(),xpDevices={...state.xpDevices};
  const delta=Math.max(0,local.counter-Number(xpDevices[device]||0));xpDevices[device]=Math.max(local.counter,Number(xpDevices[device]||0));
  const known=Object.keys(words).filter(k=>words[k].known),review=Object.keys(words).filter(k=>words[k].review);
  return {user_id:local.id,xp:Math.max(Number(old?.xp||0)+delta,local.xp),streak,last_activity:last||null,known_words:known,review_words:review,client_state:{version:1,words,fields,times,xpDevices},updated_at:new Date(Math.max(Date.now(),(Date.parse(old?.updated_at)||0)+1)).toISOString()};
 },
 apply(row,captured){
  const s=window.LernovaStore;if(s.userId!==captured.id)return;
  const current=this.snapshot(),merged=this.merge(row,{...current,counter:0,xp:row.xp});
  s.raw('known',merged.known_words);s.raw('review',merged.review_words);s.raw('_wordStates',merged.client_state.words);
  s.raw('_fieldTimes',merged.client_state.times);
  s.raw('_clock',Math.max(Number(s.get('_clock',0)),...Object.values(merged.client_state.times).map(Number),...Object.values(merged.client_state.words).map(w=>Number(w.time)||0)));
  for(const [k,v] of Object.entries(merged.client_state.fields))s.raw(k,v);
  s.raw('xp',Number(row.xp)+Math.max(0,current.counter-captured.counter));
  s.raw('streak',merged.streak);if(merged.last_activity)s.raw('lastActivity',merged.last_activity);
  this.ready=true;window.dispatchEvent(new CustomEvent('lernova:synced'));window.dispatchEvent(new CustomEvent('lernova:daily-goal-updated'));
 },
 async flush(){
  const s=window.LernovaStore;if(!s?.userId)return false;
  if(!navigator.onLine){this.state('offline');return false;}
  const user=await this.user();if(!user||user.id!==s.userId)return false;
  this.state('syncing');const local=this.snapshot();
  try{
   for(let attempt=0;attempt<4;attempt++){
    if(s.userId!==user.id)return false;
    const old=await this.read(user),row=this.merge(old,local);let result;
    if(old)result=await LernovaAuth.client.from('user_progress').update(row).eq('user_id',user.id).eq('updated_at',old.updated_at).select().maybeSingle();
    else result=await LernovaAuth.client.from('user_progress').insert(row).select().maybeSingle();
    if(result.error){if(result.error.code==='23505')continue;throw result.error;}
    if(!result.data)continue;
    this.apply(result.data,local);this.state('synced');return true;
   }
   throw new Error('Progress changed on another device. Sync will retry.');
  }catch(error){this.state(navigator.onLine?'pending':'offline');throw error;}
 },
 enqueue(){const run=this.queue.catch(()=>{}).then(()=>this.flush());this.queue=run;return run;},
 schedule(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.enqueue().catch(e=>console.warn('Cloud sync pending:',e.message)),250);},
 async initialize(user){if(!window.LernovaStore)return false;const before=this.view();LernovaStore.bindUser(user.id);this.ready=false;try{await this.enqueue();}catch(e){console.warn('Cloud sync pending:',e.message);}return before!==this.view();},
 async load(){const user=await this.user();if(!user||!window.LernovaStore)return null;await this.initialize(user);return {user};},
 mergeLocal(){return this.enqueue();},
 saveWord(){this.schedule();return Promise.resolve();},
 addXP(){this.schedule();return Promise.resolve();}
};
window.addEventListener('online',()=>LernovaSync.enqueue().catch(e=>console.warn('Cloud sync pending:',e.message)));
window.addEventListener('offline',()=>LernovaSync.state('offline'));
window.addEventListener('focus',()=>{if(LernovaSync.ready)LernovaSync.schedule();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&LernovaSync.ready)LernovaSync.schedule();});
