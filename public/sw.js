
self.addEventListener("push", event => {
  let data = {
    title: "SANCUWEK CEO",
    body: "Ada pembayaran baru masuk.",
    url: "/admin.html"
  };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/push-icon.svg",
      badge: "/push-icon.svg",
      tag: data.id ? `payment-${data.id}` : "sancuwek-payment",
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300],
      silent: false,
      data: { url: data.url || "/admin.html" }
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data?.url || "/admin.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
