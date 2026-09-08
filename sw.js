/* Service worker do Controle Financeiro.
 * Só cuida do "esqueleto" do app (HTML/CSS/JS/ícones) para abrir offline.
 * Os dados em si (Firestore) têm seu próprio cache offline, gerenciado
 * pelo SDK do Firebase — este arquivo não mexe nisso.
 *
 * IMPORTANTE: sempre que este app for atualizado, mude o número da
 * versão abaixo (v2, v3, ...). Isso força o navegador a perceber que
 * o service worker mudou e a limpar o cache antigo automaticamente.
 */

const CACHE_NAME = "controle-financeiro-shell-v3";
const APP_SHELL = ["./manifest.json", "./icon-192.png", "./icon-512.png"];

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

  // só intercepta requisições do próprio site (mesma origem) — tudo que
  // é do Firestore/Firebase (outra origem) passa direto, sem cache.
  if (url.origin !== self.location.origin) return;

  // a própria página (index.html) e a navegação: sempre tenta buscar a
  // versão mais nova na rede primeiro. Só usa o cache se estiver offline.
  // Isso garante que atualizações do app apareçam na hora, sem precisar
  // limpar cache manualmente — e ainda funciona sem internet.
  const isNavigation = event.request.mode === "navigate" || url.pathname.endsWith("index.html") || url.pathname.endsWith("/");
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // demais arquivos estáticos (ícones, manifest): cache primeiro, mais rápido.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});

