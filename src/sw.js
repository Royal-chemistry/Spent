/* Spent's service worker: keeps the app working offline, and shows reminders where the browser allows it while closed. */
const VERSION = "spent-__HASH__";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png"];
const RUNTIME = "spent-runtime", DATA = "spent-data";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("spent-") && ![VERSION, RUNTIME, DATA].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // The page itself: the newest copy when online, the saved copy when not
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("index.html", copy)); } return res; })
      .catch(() => caches.open(VERSION).then((c) => c.match("index.html"))));
    return;
  }
  if (url.origin === self.location.origin) { e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req))); return; }
  // Fonts and the report and import tools: use the saved copy, refresh it in the background
  if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)$/.test(url.hostname)) {
    e.respondWith(caches.open(RUNTIME).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((res) => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

/* Reminders while the app is closed (installed apps on browsers with periodic background sync) */
const pad = (n) => String(n).padStart(2, "0");
const dayOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
async function remind() {
  const c = await caches.open(DATA);
  const res = await c.match("reminders.json");
  if (!res) return;
  const { enabled, items = [] } = await res.json();
  if (!enabled) return;
  const now = new Date(), t = dayOf(now), tomorrow = dayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const sr = await c.match("sent.json");
  const sent = sr ? await sr.json() : {};
  for (const x of items.filter((i) => i.due <= tomorrow && sent[i.key] !== t).slice(0, 4)) {
    await self.registration.showNotification(x.title, { body: x.body, tag: x.key, icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: x.url } });
    sent[x.key] = t;
  }
  await c.put("sent.json", new Response(JSON.stringify(sent)));
}
self.addEventListener("periodicsync", (e) => { if (e.tag === "spent-reminders") e.waitUntil(remind()); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const w of list) if (w.url.startsWith(self.registration.scope)) { w.postMessage({ type: "open", url }); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
