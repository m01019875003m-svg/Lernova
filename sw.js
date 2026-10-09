/* Lernova A1 offline support */
const CACHE = "lernova-a1-v21";
const AUTH_SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
const ASSETS = [
  AUTH_SDK,
  "./", "./index.html", "./manifest.json",
  "./assets/lernova-icon.svg", "./assets/lernova-icon-192.png", "./assets/lernova-icon-512.png",
  "./css/main.css",
  "./data/a1.js", "./data/grammar-a1.js", "./data/conversations-a1.js",
  "./js/storage.js", "./js/core.js", "./js/app.js", "./js/words.js", "./js/review.js", "./js/mistakes.js",
  "./js/quiz.js", "./js/auth.js", "./js/sync.js", "./js/config.js", "./js/language.js",
  "./js/profile-ui.js", "./js/support.js", "./js/support-inbox.js", "./js/tools.js/tools.js",
  "./pages/lessons.html", "./pages/chapters.html", "./pages/words.html", "./pages/review.html",
  "./pages/quiz.html", "./pages/exam.html", "./pages/grammar.html", "./pages/listening.html",
  "./pages/speaking.html", "./pages/progress.html", "./pages/profile.html", "./pages/today.html",
  "./pages/login.html", "./pages/signup.html", "./pages/mistakes.html", "./pages/support.html", "./pages/support-inbox.html",
  "./assets/lernova-launcher-v2-192.png", "./assets/lernova-launcher-v2-512.png", "./assets/ui-exam-v2.svg", "./assets/ui-grammar-v2.svg", "./assets/ui-listening-v2.svg", "./assets/ui-mistakes-v2.svg", "./assets/ui-profile-v2.svg", "./assets/ui-progress-v2.svg", "./assets/ui-quiz-v2.svg", "./assets/ui-review-v2.svg", "./assets/ui-speaking-v2.svg", "./assets/ui-support-v2.svg", "./assets/ui-today-v2.svg", "./assets/ui-words-v2.svg"
];


self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // A single unavailable file should not cancel offline setup for the whole app.
    await Promise.allSettled(ASSETS.map(asset => cache.add(asset)));
    await self.skipWaiting();
  })());
});


self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Keep caches belonging to other apps on the shared github.io origin.
    await Promise.all(keys
      .filter(key => key.startsWith("lernova-a1-") && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});




// Only static app files and the public SDK are cached; auth/data API calls are never cached.
self.addEventListener('fetch', event => {
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET')return;
  const appFile=url.origin===scope.origin&&url.pathname.startsWith(scope.pathname);
  if(!appFile&&request.url!==AUTH_SDK)return;
  const key=appFile?url.origin+url.pathname:request.url;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(request);
      if(response.ok||response.type==='opaque')await cache.put(key,response.clone());
      return response;
    }catch(error){
      const saved=await cache.match(key);
      if(saved)return saved;
      if(request.mode==='navigate')return new Response('<html lang="ar" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><h1>هذه الصفحة غير محفوظة بعد</h1><p>اتصل بالإنترنت وافتح التطبيق مرة واحدة، ثم حاول مجددًا.</p></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
      throw error;
    }
  })());
});
