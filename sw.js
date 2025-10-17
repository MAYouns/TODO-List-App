self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { id, title, date, time } = event.data.task;
        const targetTime = new Date(`${date}T${time}`);
        const delay = targetTime - Date.now();

        if (delay > 0) {
            setTimeout(() => {
                self.registration.showNotification('📅 Reminder', {
                    body: ` let's do this task: ${title}`,
                    icon: 'icon.png'
                });
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'TASK_DONE', id });
                    });
                });
            }, delay);
        }
    }
});
