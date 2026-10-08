// يحفظ التقدم في جدول user_progress الحالي بصيغة صف واحد لكل مستخدم.
// لا يستخدم service_role ولا ينشئ جداول تلقائيًا من المتصفح.
window.LernovaSync={
 ready:false,
 async user(){const c=window.LernovaAuth?.client;if(!c)return null;const {data,error}=await c.auth.getUser();if(error||!data.user)return null;return data.user},
 arrays(row){return {known:Array.isArray(row?.known_words)?row.known_words:[],review:Array.isArray(row?.review_words)?row.review_words:[]}},
 async read(user){
  const c=window.LernovaAuth?.client;if(!c||!user)return null;
  const {data,error}=await c.from('user_progress').select('user_id,xp,streak,last_activity,known_words,review_words,updated_at').eq('user_id',user.id).maybeSingle();
  if(error)throw error;return data;
 },
 async write(user,changes={}){
  const old=await this.read(user),fromDb=this.arrays(old),localKnown=window.LernovaStore?.known()||[],localReview=window.LernovaStore?.review()||[];
  const row={
   user_id:user.id,
   xp:Math.max(Number(old?.xp)||0,window.LernovaStore?.xp()||0),
   streak:Math.max(Number(old?.streak)||0,Number(window.LernovaStore?.get('streak',0))||0),
   last_activity:old?.last_activity||window.LernovaStore?.get('lastActivity',null)||null,
   known_words:[...new Set([...fromDb.known,...localKnown])],
   review_words:[...new Set([...fromDb.review,...localReview])],
   updated_at:new Date().toISOString(),
   ...changes
  };
  const {data,error}=await window.LernovaAuth.client.from('user_progress').upsert(row,{onConflict:'user_id'}).select().single();
  if(error)throw error;return data;
 },
 async load(){
  const user=await this.user();if(!user)return null;
  const row=await this.read(user);if(row&&window.LernovaStore){
   const sets=this.arrays(row),known=new Set([...LernovaStore.known(),...sets.known]),review=new Set([...LernovaStore.review(),...sets.review]);
   LernovaStore.set('known',[...known]);LernovaStore.set('review',[...review]);
   LernovaStore.set('xp',Math.max(LernovaStore.xp(),Number(row.xp)||0));LernovaStore.set('streak',Math.max(Number(LernovaStore.get('streak',0))||0,Number(row.streak)||0));
   if(row.last_activity)LernovaStore.set('lastActivity',String(row.last_activity).slice(0,10));
  }
  this.ready=true;window.dispatchEvent(new CustomEvent('lernova:synced'));return {user,row};
 },
 async saveWord(wordOrKey,patch={}){
  const user=await this.user();if(!user)return null;
  const word=typeof wordOrKey==='string'?LERNOVA.words.find(w=>LERNOVA.key(w)===wordOrKey):wordOrKey;if(!word)return null;
  const old=await this.read(user),sets=this.arrays(old),key=LERNOVA.key(word),known=new Set([...sets.known,...(window.LernovaStore?.known()||[])]),review=new Set([...sets.review,...(window.LernovaStore?.review()||[])]),status=patch.status;
  if(status==='known'){known.add(key);review.delete(key)}else if(status==='review'||status==='learning'){review.add(key);known.delete(key)}
  return this.write(user,{known_words:[...known],review_words:[...review],last_activity:window.LernovaStore?.get('lastActivity',old?.last_activity)||old?.last_activity||null});
 },
 async addXP(amount){
  const user=await this.user();if(!user)return null;const old=await this.read(user),today=LernovaStore.today();
  let streak=Number(old?.streak)||0;const last=String(old?.last_activity||'').slice(0,10);
  if(last!==today)streak=last===LernovaStore.afterDays(-1)?streak+1:Math.max(streak,1);
  return this.write(user,{xp:Math.max((Number(old?.xp)||0)+Number(amount||0),LernovaStore.xp()),streak:Math.max(streak,Number(LernovaStore.get('streak',0))||0),last_activity:today});
 },
 async mergeLocal(){
  const user=await this.user();if(!user||!window.LernovaStore)return false;
  const old=await this.read(user);
  await this.write(user,{xp:Math.max(LernovaStore.xp(),Number(old?.xp)||0),streak:Math.max(Number(LernovaStore.get('streak',0))||0,Number(old?.streak)||0),last_activity:LernovaStore.get('lastActivity',null)||old?.last_activity||null,known_words:[...new Set([...this.arrays(old).known,...LernovaStore.known()])],review_words:[...new Set([...this.arrays(old).review,...LernovaStore.review()])]});
  return true;
 }
};
if(window.LernovaAuth&&!window.LernovaAuth.client)window.LernovaAuth.init();
document.addEventListener('DOMContentLoaded',()=>{if(window.LernovaAuth?.client)LernovaSync.load().catch(error=>console.warn('Lernova sync unavailable:',error.message))});


// Sync progress saved on this device when the connection returns or the app opens online.
async function syncLocalProgressWhenOnline(){
 if(!navigator.onLine||!window.LernovaAuth?.client)return;
 try{
  if(!LernovaSync.ready)await LernovaSync.load();
  await LernovaSync.mergeLocal();
 }catch(error){console.warn('Lernova local progress sync pending:',error.message)}
}
window.addEventListener('online',syncLocalProgressWhenOnline);
document.addEventListener('DOMContentLoaded',syncLocalProgressWhenOnline);
