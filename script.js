let db;
let request = indexedDB.open("MyDatabase", 1);

request.onsuccess = function (event) {
    db = event.target.result;
    displayTasks();

};

request.onupgradeneeded = function (event) {
    db = event.target.result;
    let objectStore = db.createObjectStore("MyStore", { keyPath: "id", autoIncrement: true });
    objectStore.createIndex("textIndex", "text", { unique: true });
};

function saveData(task, callback) {
    let transaction = db.transaction(["MyStore"], "readwrite");
    let store = transaction.objectStore("MyStore");
    let request = store.add(task);

    request.onsuccess = function (event) {
        const id = event.target.result;
        task.id = id;
        if (callback) callback(id);
    };
}

function displayTasks() {
    let transaction = db.transaction(["MyStore"], "readonly");
    let store = transaction.objectStore("MyStore");
    let request = store.getAll();
    request.onsuccess = function (event) {
        const tasks = event.target.result;
        list.innerHTML = "";
        if (tasks.length === 0) {
            emptyEle.classList.remove('hidden');
        } else {
            emptyEle.classList.add('hidden');
        }
        tasks.forEach(task => {
            list.append(createItem(task.text, `${task.date}, ${convertTo12HourFormat(task.time)}`, task.id));
        });
    };
}


const list = document.getElementById('ul');
const emptyEle = document.getElementById('empty');
const taskTitle = document.getElementById('base-input');
const date = document.getElementById('date');
const time = document.getElementById('time');

let mode = 'light';

document.getElementById('darkOrLightMode').addEventListener('click', function () {
    mode = mode === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark');
    this.src = `images/${mode}.png`;
});

document.getElementById('addTask').addEventListener('click', function () {
    if (taskTitle.value && date.value && time.value) {
        emptyEle.classList.add('hidden');
        const dueTime = new Date(`${date.value}T${time.value}:00`).getTime();
        const task = {
            text: taskTitle.value,
            date: date.value,
            time: time.value,
            dueTime: dueTime
        };

        saveData(task, (id) => {
            const li = createItem(task.text, `${task.date}, ${convertTo12HourFormat(task.time)}`, id);
            list.append(li);
            scheduleNotification({ ...task, id });
        });

        taskTitle.value = '';
        date.value = '';
        time.value = '';
    }
});


function createItem(title, taskDate, id) {
    const li = document.createElement('li');
    li.classList = 'flex justify-between gap-x-6 py-5';
    li.dataset.id = id;

    const task = document.createElement('div');
    task.classList = 'flex flex-col min-w-0 gap-x-4';
    const heading = document.createElement('p');
    heading.classList = 'text-2xl font-semibold text-gray-900 dark:text-white';
    heading.innerHTML = title;
    const date = document.createElement('p');
    date.classList = 'mt-1 truncate text-xs/5 text-gray-400';
    date.innerHTML = taskDate;
    task.append(heading, date);

    const close = document.createElement('button');
    close.classList = 'shrink-0 flex items-center justify-center font-bold rounded-full w-6 h-6 bg-red-600 text-white cursor-pointer';
    close.innerHTML = 'X';
    li.append(task, close);

    close.addEventListener('click', () => {
        heading.classList.add('line-through');
        date.classList.add('line-through');
        close.remove();
        li.classList += ' opacity-50 cursor-not-allowed';
    });

    return li;
}

function convertTo12HourFormat(time24h) {
    const [hourString, minute] = time24h.split(':');
    let hour = parseInt(hourString, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
}

Notification.requestPermission().then(status => {
    console.log('Notification permission:', status);
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

function scheduleNotification(task) {
    const now = Date.now();
    const delay = task.dueTime - now;

    if (delay > 0) {
        setTimeout(() => {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification('⏰ Reminder', {
                    body: `${task.text} (${convertTo12HourFormat(task.time)})`,
                    icon: 'icon.png',
                    vibrate: [100, 50, 100]
                });
            });

            const li = document.querySelector(`li[data-id="${task.id}"]`);
            if (li) {
                const heading = li.querySelector('p.text-2xl');
                const dateText = li.querySelector('p.text-xs\\/5');
                if (heading && dateText) {
                    heading.classList.add('line-through');
                    dateText.classList.add('line-through');
                }
                li.classList.add('opacity-50', 'cursor-not-allowed');
                const closeBtn = li.querySelector('button');
                if (closeBtn) closeBtn.remove();
            }

            const transaction = db.transaction(["MyStore"], "readwrite");
            const store = transaction.objectStore("MyStore");
            store.delete(task.id);
        }, delay);
    }
}
