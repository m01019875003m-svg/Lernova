const CACHE='lernova-a1-v7';
const ASSETS=['./','./index.html','./manifest.json','./assets/lernova-icon.svg','./assets/lernova-icon-192.png','./assets/lernova-icon-512.png','./css/main.css','./data/a1.js','./data/grammar-a1.js','./data/conversations-a1.js','./js/storage.js','./js/core.js','./js/app.js','./js/words.js','./js/review.js','./js/quiz.js','./js/auth.js','./js/sync.js','./js/config.js','./js/language.js','./js/profile-ui.js','./pages/lessons.html','./pages/chapters.html','./pages/words.html','./pages/review.html','./pages/quiz.html','./pages/exam.html','./pages/grammar.html','./pages/listening.html','./pages/speaking.html','./pages/progress.html','./pages/profile.html','./pages/login.html','./pages/signup.html','./pages/support.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
  return response;
 }).catch(()=>request.mode==='navigate'?caches.match('./index.html'):Response.error())));
});
