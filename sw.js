/* Service worker do Controle Financeiro.
 * Só cuida do "esqueleto" do app (HTML/CSS/JS/ícones) para abrir offline.
 * Os dados em si (Firestore) têm seu próprio cache offline, gerenciado
 * pelo SDK do Firebase — este arquivo não mexe nisso.
 */

const CACHE_NAME = "controle-financeiro-shell-v1";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // só intercepta requisições do próprio site (mesma origem) para os
  // arquivos do "esqueleto" — tudo que é do Firestore/Firebase (outra
  // origem) passa direto, sem cache, para não atrapalhar a sincronização.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
