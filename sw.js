/* Lernova A1 offline support */
const CACHE = "lernova-a1-v11";
const ASSETS = [
  "./", "./index.html", "./manifest.json",
  "./assets/lernova-icon.svg", "./assets/lernova-icon-192.png", "./assets/lernova-icon-512.png",
  "./css/main.css",
  "./data/a1.js", "./data/grammar-a1.js", "./data/conversations-a1.js",
  "./js/storage.js", "./js/core.js", "./js/app.js", "./js/words.js", "./js/review.js",
  "./js/quiz.js", "./js/auth.js", "./js/sync.js", "./js/config.js", "./js/language.js",
  "./js/profile-ui.js", "./js/tools.js/tools.js",
  "./pages/lessons.html", "./pages/chapters.html", "./pages/words.html", "./pages/review.html",
  "./pages/quiz.html", "./pages/exam.html", "./pages/grammar.html", "./pages/listening.html",
  "./pages/speaking.html", "./pages/progress.html", "./pages/profile.html",
  "./pages/login.html", "./pages/signup.html", "./pages/support.html"
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

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });

    if (cached) {
      // Refresh saved content when online while returning the cached copy immediately.
      event.waitUntil(fetch(request).then(response => {
        if (response.ok) return cache.put(request, response.clone());
      }).catch(() => {}));
      return cached;
    }

    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      if (request.mode === "navigate") {
        const page = await cache.match(request, { ignoreSearch: true });
        if (page) return page;
        const home = await cache.match("./index.html");
        if (home) return home;
        return new Response(
          "Lernova غير متصل بالإنترنت. افتح التطبيق مرة واحدة مع الاتصال لتحميل ملفاته.",
          { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
        );
      }
      return Response.error();
    }
  })());
});
