/* ===========================
   Простий PWA: SPA + IndexedDB
   Коментарі українською, щоб було зрозуміло кожен крок.
   =========================== */

/* Налаштування бази даних (IndexedDB) */
const DB_NAME = 'myConspDB';
const DB_VERSION = 1;
let db;               // тут збережеться об'єкт бази даних
let currentId = null; // id розділу, який зараз відкритий

/* ---------- Функції для роботи з IndexedDB ---------- */
/*
  openDB() - відкриває з'єднання з IndexedDB.
  Якщо БД ще не існує або версія змінилася, викликається onupgradeneeded.
*/
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const d = e.target.result;
      // створюємо об'єктний стор (table) для розділів, якщо ще немає
      if (!d.objectStoreNames.contains('sections')) {
        const store = d.createObjectStore('sections', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by_title', 'title', { unique: false });
      }
    };

    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e);
  });
}

/* Допоміжні функції: отримати store у режимі read або readwrite */
function getStore(mode='readonly') {
  const tx = db.transaction('sections', mode);
  return tx.objectStore('sections');
}

/* CRUD для розділів */
function addSection(obj){
  return new Promise((res,rej)=>{
    const s = getStore('readwrite');
    const r = s.add(obj);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function putSection(obj){
  return new Promise((res,rej)=>{
    const s = getStore('readwrite');
    const r = s.put(obj);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function deleteSection(id){
  return new Promise((res,rej)=>{
    const s = getStore('readwrite');
    const r = s.delete(Number(id));
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}
function getAllSections(){
  return new Promise((res,rej)=>{
    const s = getStore();
    const r = s.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function getSection(id){
  return new Promise((res,rej)=>{
    const s = getStore();
    const r = s.get(Number(id));
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

/* ---------- UI: елементи DOM ---------- */
const listView = document.getElementById('listView');
const sectionView = document.getElementById('sectionView');
const sectionsList = document.getElementById('sectionsList');
const addSectionBtn = document.getElementById('addSectionBtn');
const sectionTitle = document.getElementById('sectionTitle');
const sectionContent = document.getElementById('sectionContent');
const backBtn = document.getElementById('backBtn');
const noteInput = document.getElementById('noteInput');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const notesList = document.getElementById('notesList');
const linkUrl = document.getElementById('linkUrl');
const linkText = document.getElementById('linkText');
const addLinkBtn = document.getElementById('addLinkBtn');
const linksList = document.getElementById('linksList');
const deleteSectionBtn = document.getElementById('deleteSectionBtn');

/* renderList() - отримує всі розділи і рендерить їх у списку */
function renderList() {
  getAllSections().then(arr => {
    sectionsList.innerHTML = '';
    if (!arr.length) {
      sectionsList.innerHTML = '<li>Поки що немає розділів. Натисни "Додати розділ".</li>';
      return;
    }
    // сортуємо по даті оновлення (найновіші зверху)
    arr.sort((a,b)=> (a.updated||0) < (b.updated||0) ? 1 : -1);
    arr.forEach(s => {
      // створюємо елемент списку
      const li = document.createElement('li');
      li.className = 'section-item';

      // кнопка для відкриття розділу
      const btn = document.createElement('button'); btn.className='openBtn';
      btn.textContent = s.title || 'Без назви';
      btn.onclick = ()=>openSection(s.id);

      // мета (дата)
      const meta = document.createElement('div'); meta.className='meta';
      meta.innerHTML = `<small>${new Date(s.updated||s.created).toLocaleString()}</small>`;

      // кнопка видалення
      const del = document.createElement('button'); del.className='deleteBtn'; del.textContent='×';
      del.onclick = (ev)=>{ 
        ev.stopPropagation(); // щоб не спрацював openSection
        if (confirm('Видалити розділ?')) { deleteSection(s.id).then(renderList); } 
      }

      li.appendChild(btn); li.appendChild(meta); li.appendChild(del);
      sectionsList.appendChild(li);
    });
  });
}

/* openSection(id) - відкриває конкретний розділ у view */
function openSection(id){
  currentId = id;
  getSection(id).then(s=>{
    if (!s) return alert('Розділ не знайдено');
    // перемикаємо видимість
    listView.classList.add('hidden');
    sectionView.classList.remove('hidden');

    // заповнюємо поле заголовку і контенту
    sectionTitle.textContent = s.title;
    sectionContent.textContent = s.content || '';

    // рендеримо посилання
    linksList.innerHTML = '';
    (s.links||[]).forEach(l=>{
      const li = document.createElement('li');
      const a = document.createElement('a'); a.href = l.url; a.target = '_blank'; a.textContent = l.text || l.url;
      li.appendChild(a);
      linksList.appendChild(li);
    });

    // рендеримо нотатки (історія)
    notesList.innerHTML = '';
    (s.notes||[]).slice().reverse().forEach(n=>{
      const li = document.createElement('li');
      li.textContent = `${new Date(n.when).toLocaleString()}: ${n.text}`;
      notesList.appendChild(li);
    });
  });
}

/* Обробники кнопок / подій */

// Назад до списку
backBtn.onclick = ()=>{
  currentId = null;
  sectionView.classList.add('hidden');
  listView.classList.remove('hidden');
  renderList();
};

// Додати новий розділ — запитуємо назву, створюємо обʼєкт та додаємо
addSectionBtn.onclick = async ()=>{
  const title = prompt('Назва розділу:','Новий розділ');
  if (!title) return;
  const obj = { title, content:'', links:[], notes:[], created:Date.now(), updated:Date.now() };
  await addSection(obj);
  renderList();
};

// Зберегти нотатку в поточному розділі
saveNoteBtn.onclick = async ()=>{
  const text = noteInput.value.trim();
  if (!text) return alert('Введи текст');
  const s = await getSection(currentId);
  s.notes = s.notes || [];
  s.notes.push({ text, when: Date.now() });
  s.updated = Date.now();
  await putSection(s);
  noteInput.value = '';
  openSection(currentId); // перерендерити
};

// Додати посилання
addLinkBtn.onclick = async ()=>{
  const url = linkUrl.value.trim();
  const text = linkText.value.trim() || url;
  if (!url) return alert('Введи URL');
  const s = await getSection(currentId);
  s.links = s.links || [];
  s.links.push({ url, text });
  s.updated = Date.now();
  await putSection(s);
  linkUrl.value=''; linkText.value='';
  openSection(currentId);
};

// Видалити розділ (перманентно)
deleteSectionBtn.onclick = async ()=>{
  if (!confirm('Видалити цей розділ назавжди?')) return;
  await deleteSection(currentId);
  backBtn.click();
};

/* Ініціалізація програми при завантаженні сторінки */
(async function init(){
  await openDB();

  // Якщо БД пуста — додаємо приклад (щоб відразу було з чим працювати)
  const all = await getAllSections();
  if (!all.length) {
    await addSection({
      title: 'Що таке PWA',
      content: 'PWA (Progressive Web App) — вебзастосунок, який може працювати як нативний, має manifest і service worker.',
      links: [{url:'https://developer.mozilla.org', text:'MDN — PWA'}],
      notes: [{text:'Тут можна додати свої коментарі', when: Date.now()}],
      created: Date.now(),
      updated: Date.now()
    });
  }

  // Показати список розділів
  renderList();

  // Реєструємо service worker (якщо браузер підтримує)
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/service-worker.js');
      console.log('SW registered');
    } catch(e){
      console.warn('SW failed', e);
    }
  }
})();