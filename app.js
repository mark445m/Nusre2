/*
  محاضرات تمريض — 2.0 (clean, memory-safe)
  Private offline-first library; no accounts, servers, dependencies, or external requests.
  Initial library: exactly nine subject names, with ZERO lectures.
  HTML lectures run in sandboxed frames. Shareable .medlib archives are binary blobs,
  not ZIPs, and contain the whole database including source documents.
*/
(() => {
  'use strict';

  const DB_NAME = 'nursing-lectures-clean-v2';
  const DB_VERSION = 1;
  const FORMAT_MAGIC = 'MEDLIB3\n';
  const PREVIOUS_MAGIC = 'MEDLIB2\n';
  const LEGACY_MAGIC = 'MEDLIB1\n';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const PRESET_SUBJECTS = [
    {id:'s-surgical-nursing-1', name:'التمريض الجراحي 1', english:'Surgical Nursing 1'},
    {id:'s-medical-nursing-1', name:'التمريض الباطني 1', english:'Medical Nursing 1'},
    {id:'s-english-language', name:'اللغة الإنجليزية', english:'English Language'},
    {id:'s-surgical-diseases-1', name:'الأمراض الجراحية 1', english:'Surgical Diseases 1'},
    {id:'s-pharmacology-1', name:'علم الأدوية 1', english:'Pharmacology 1'},
    {id:'s-nutrition', name:'التغذية', english:'Nutrition'},
    {id:'s-medical-diseases-1', name:'الأمراض الباطنية 1', english:'Medical Diseases 1'},
    {id:'s-infectious-diseases', name:'الأمراض المعدية', english:'Infectious Diseases'},
    {id:'s-epidemiology-1', name:'علم الوبائيات 1', english:'Epidemiology 1'}
  ].map((s, order) => ({...s, order, createdAt: 0}));

  const DAY_GROUPS = [
    {day:'الثلاثاء', ids:['s-surgical-nursing-1','s-medical-nursing-1','s-english-language']},
    {day:'الأربعاء', ids:['s-surgical-diseases-1','s-pharmacology-1','s-nutrition']},
    {day:'الخميس', ids:['s-medical-diseases-1','s-infectious-diseases','s-epidemiology-1']}
  ];

  const icons = {
    home:'<path d="m3 10 9-7 9 7v11H3z"/><path d="M9 21v-7h6v7"/>',
    books:'<rect x="3" y="4" width="6" height="16" rx="1"/><rect x="10" y="3" width="6" height="17" rx="1"/><path d="m17 5 4-1v16l-4 1z"/>',
    backup:'<path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7"/><path d="M8 12 12 16l4-4M12 16V3"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4"/><path d="M12 17h.01"/>',
    heart:'<path d="M20.7 5.8a5.3 5.3 0 0 0-7.5 0L12 7l-1.2-1.2a5.3 5.3 0 1 0-7.5 7.5L12 22l8.7-8.7a5.3 5.3 0 0 0 0-7.5z"/><path d="M4 13h4l2.2-4 3.4 8 2.2-4H20"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>',
    arrow:'<path d="m15 18-6-6 6-6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    file:'<path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5M8 13h8M8 17h7"/>',
    upload:'<path d="M12 16V3m-5 5 5-5 5 5"/><path d="M4 16v4h16v-4"/>',
    download:'<path d="M12 3v13m-5-5 5 5 5-5"/><path d="M4 18v3h16v-3"/>',
    edit:'<path d="m4 16-.5 4 4-.5L19 8a3 3 0 0 0-4-4L4 16z"/><path d="M13 6l5 5"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7M10 11v6M14 11v6"/>',
    up:'<path d="m6 15 6-6 6 6"/>',
    down:'<path d="m6 9 6 6 6-6"/>',
    close:'<path d="M5 5l14 14M19 5 5 19"/>',
    screen:'<path d="M7 3H3v4m14-4h4v4M3 17v4h4m14-4v4h-4"/>',
    rotate:'<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M3 12a9 9 0 0 0 2 6M21 12a9 9 0 0 0-2-6"/>',
    check:'<path d="m4 12 5 5 11-11"/>',
    shield:'<path d="m12 2 9 4v6c0 5-3 8-9 10-6-2-9-5-9-10V6z"/><path d="m8 12 3 3 5-6"/>',
    wifi:'<path d="M2 9a16 16 0 0 1 20 0M5 13a11 11 0 0 1 14 0M9 17a5 5 0 0 1 6 0M12 21h.01"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    dots:'<circle cx="12" cy="5" r="1.35"/><circle cx="12" cy="12" r="1.35"/><circle cx="12" cy="19" r="1.35"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    folder:'<path d="M2 6h8l2 2h10v12H2z"/>',
    share:'<path d="M12 16V3m-5 5 5-5 5 5"/><path d="M4 13v8h16v-8"/>',
    alert:'<path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    document:'<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5M9 12h8M9 16h8"/>',
    phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    tablet:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M11 19h2"/>',
    warning:'<path d="M12 3 2 21h20L12 3z"/><path d="M12 9v5M12 17h.01"/>',
    sparkles:'<path d="m12 3 2.1 6.9L21 12l-6.9 2.1L12 21l-2.1-6.9L3 12l6.9-2.1z"/>',
    zoomin:'<circle cx="10" cy="10" r="7"/><path d="M7 10h6M10 7v6m6 6 5 5"/>',
    zoomout:'<circle cx="10" cy="10" r="7"/><path d="M7 10h6m9 9-5-5"/>'
  };
  function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.file}</svg>`; }
  function decorate(root=document) {root.querySelectorAll('[data-icon]').forEach(el => {el.innerHTML=icon(el.getAttribute('data-icon'));});}
  function h(value) {return String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}
  function uid() {return globalThis.crypto?.randomUUID?.() || ('medlib-'+Date.now()+'-'+Math.random().toString(36).slice(2));}
  function formatSize(size) {if (!Number.isFinite(size)||size<=0) return '0 ك.ب';const units=['بايت','ك.ب','م.ب','ج.ب'];let i=0;while(size>=1024 && i<3){size/=1024;i++;}return `${size.toFixed(i===0?0:1)} ${units[i]}`;}
  function sortByOrder(a,b){return (a.order||0)-(b.order||0) || (a.createdAt||0)-(b.createdAt||0) || String(a.name||a.title||'').localeCompare(String(b.name||b.title||''),'ar');}
  function normalizeName(name) {return String(name||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('ar');}
  function kindOf(file) {const name=String(file?.name||file?.fileName||'').toLowerCase();if(/\.pdf$/.test(name))return 'pdf';if(/\.(html?|xhtml)$/.test(name))return 'html';return null;}
  const state = {db:null, subjects:[], lectures:[], page:'home', subjectId:null, backupFile:null, backupInfo:null, restoreSource:null, reading:null, search:'', swReady:false, busy:false};

  const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
  async function crc32Blob(blob){let c=0xFFFFFFFF;const chunk=1024*1024;for(let i=0;i<blob.size;i+=chunk){const data=new Uint8Array(await blob.slice(i,Math.min(i+chunk,blob.size)).arrayBuffer());for(let j=0;j<data.length;j++)c=CRC_TABLE[(c^data[j])&255]^(c>>>8);}return ((c^0xFFFFFFFF)>>>0).toString(16).padStart(8,'0');}
  async function verifySavedLecture(record, sourceBlob=null){
    const saved=await dbRequest(state.db.transaction('lectures','readonly').objectStore('lectures').get(record.id));
    const stored=await getFile(record.id);
    if(!saved || !stored || !(stored.blob instanceof Blob) || stored.blob.size!==record.size ||
       saved.title!==record.title || saved.order!==record.order || saved.subjectId!==record.subjectId){
      throw new Error('تعذّر التحقق من حفظ المحاضرة. تأكد من توفر مساحة وأعد المحاولة.');
    }
    if(record.crc32 && stored.crc32!==record.crc32)throw new Error('بيانات الملف المحفوظ لا تطابق بياناته الأصلية.');
    if(sourceBlob && await crc32Blob(stored.blob)!==record.crc32)throw new Error('حدث اختلاف أثناء حفظ المحاضرة؛ لم يتم اعتمادها.');
    return true;
  }
    function dbRequest(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('فشل الوصول إلى البيانات'));});}
  function transactionPromise(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('أُلغيت عملية الحفظ'));tx.onerror=()=>{};});}
  function openDB(){return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){reject(new Error('التخزين المحلي غير متاح في هذا المتصفح'));return;}
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{
      const db=request.result;
      const subjects=db.createObjectStore('subjects',{keyPath:'id'});
      subjects.createIndex('order','order',{unique:false});
      const lectures=db.createObjectStore('lectures',{keyPath:'id'});
      lectures.createIndex('subjectId','subjectId',{unique:false});
      db.createObjectStore('files',{keyPath:'id'});
      PRESET_SUBJECTS.forEach(s=>subjects.put(s));
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('أغلق النوافذ الأخرى المفتوحة من التطبيق ثم حاول مجددًا'));
  });}
  async function getFile(id){return dbRequest(state.db.transaction('files','readonly').objectStore('files').get(id));}
  async function saveLectureAndFile(record, file=null){
    const stores=file?['lectures','files']:['lectures'];
    const tx=state.db.transaction(stores,'readwrite'); const done=transactionPromise(tx);
    tx.objectStore('lectures').put(record);
    if(file)tx.objectStore('files').put({id:record.id,blob:file,kind:record.kind,size:record.size,crc32:record.crc32});
    await done;
  }
  async function deleteLectureAndFile(id){const tx=state.db.transaction(['lectures','files'],'readwrite');const done=transactionPromise(tx);tx.objectStore('lectures').delete(id);tx.objectStore('files').delete(id);await done;}
    async function readStore(storeName){const tx=state.db.transaction(storeName,'readonly');return dbRequest(tx.objectStore(storeName).getAll());}
  async function saveOne(storeName,value){const tx=state.db.transaction(storeName,'readwrite');const done=transactionPromise(tx);tx.objectStore(storeName).put(value);await done;}
  async function deleteOne(storeName,id){const tx=state.db.transaction(storeName,'readwrite');const done=transactionPromise(tx);tx.objectStore(storeName).delete(id);await done;}
  async function saveMany(storeName,items){const tx=state.db.transaction(storeName,'readwrite');const done=transactionPromise(tx);const store=tx.objectStore(storeName);for(const item of items)store.put(item);await done;}
  async function refresh(){state.backupFile=null;state.subjects=(await readStore('subjects')).sort(sortByOrder);state.lectures=(await readStore('lectures')).sort(sortByOrder);await render();updateUsage();}
  function subjectOf(id){return state.subjects.find(s=>s.id===id);}
  function lectureOf(id){return state.lectures.find(l=>l.id===id);}
  function countOf(id){return state.lectures.filter(l=>l.subjectId===id).length;}
  function bytesOf(id){return state.lectures.filter(l=>l.subjectId===id).reduce((t,l)=>t+(l.size||l.blob?.size||0),0);}
  function totalBytes(){return state.lectures.reduce((t,l)=>t+(l.size||l.blob?.size||0),0);}
  function toast(message,error=false){const root=document.getElementById('toast-root');root.innerHTML=`<div class="toast ${error?'error':''}">${h(message)}</div>`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>root.replaceChildren(),4600);}
  function errMsg(err){if(err?.name==='QuotaExceededError')return 'مساحة التخزين غير كافية. أفرغ مساحة على الجهاز ثم جرّب مجددًا.';return err?.message||'حدث خطأ غير متوقع';}
  async function updateUsage(){try{const estimate=await navigator.storage?.estimate?.();if(estimate?.quota){const pct=Math.min(100,(estimate.usage/estimate.quota)*100);document.getElementById('storage-meter').style.width=pct+'%';document.getElementById('storage-text').textContent=`المحفوظ: ${formatSize(totalBytes())} · استخدام الجهاز ${pct.toFixed(1)}% من الحصة`;return;}}catch(_){}const el=document.getElementById('storage-text');if(el)el.textContent=`المحاضرات: ${formatSize(totalBytes())}`;}

  function pageHeading(){const map={home:['الرئيسية','كل محاضراتك في مكان واحد'],subjects:['المواد الدراسية','موادك ومحاضراتك في مكان واحد'],backup:['النسخ والمشاركة','انقل مكتبتك بين الأجهزة بسهولة'],guide:['المساعدة والتثبيت','دليل التثبيت والاستخدام'],detail:['تفاصيل المادة','إدارة المحاضرات وترتيبها']};const values=map[state.page]||map.home;document.getElementById('header-title').textContent=state.page==='detail'?(subjectOf(state.subjectId)?.name||values[0]):values[0];document.getElementById('header-subtitle').textContent=values[1];document.querySelectorAll('[data-nav]').forEach(btn=>btn.classList.toggle('active',btn.dataset.nav===(state.page==='detail'?'subjects':state.page)));}
  function navigate(page,id=null){if(state.reading)closeReader();state.page=page;state.subjectId=id;state.search='';render();window.scrollTo({top:0,behavior:'instant'});}
  function subjectTile(subject){const cnt=countOf(subject.id);return `<button type="button" class="subject-card" data-subject="${h(subject.id)}" aria-label="فتح مادة ${h(subject.name)}، ${cnt} محاضرات"><div class="subject-head"><span class="subject-icon">${icon('books')}</span><span class="subject-count">${cnt} محاضرة</span></div><h3>${h(subject.name)}</h3><p lang="en">${h(subject.english||'')}</p><div class="subject-foot"><span>${cnt?'عرض المحاضرات':'بانتظار أول محاضرة'}</span>${icon('arrow')}</div></button>`;}
  function groupedSubjects(subjects){
    const idMap=new Map(subjects.map(s=>[s.id,s]));
    const used=new Set();
    const groups=DAY_GROUPS.map(group=>{
      const items=group.ids.map(id=>idMap.get(id)).filter(Boolean);
      items.forEach(item=>used.add(item.id));
      return {day:group.day, items};
    }).filter(group=>group.items.length);
    const extras=subjects.filter(item=>!used.has(item.id)).sort(sortByOrder);
    if(extras.length)groups.push({day:'مواد إضافية',items:extras});
    return groups.map(group=>`<section class="day-section"><div class="day-heading"><h3>${h(group.day)}</h3><span>${group.items.length} مواد</span></div><div class="subject-grid">${group.items.map(subjectTile).join('')}</div></section>`).join('');
  }
  function stats(){return `<div class="statistics"><div class="stat-card"><span class="stat-icon">${icon('books')}</span><div><strong>${state.subjects.length}</strong><small>مادة دراسية</small></div></div><div class="stat-card"><span class="stat-icon">${icon('file')}</span><div><strong>${state.lectures.length}</strong><small>محاضرة محفوظة</small></div></div><div class="stat-card"><span class="stat-icon">${icon('download')}</span><div><strong>${formatSize(totalBytes())}</strong><small>محتوى دون إنترنت</small></div></div></div>`;}
  function renderHome(){return `<div class="hero"><div class="hero-copy"><span class="hero-chip">${icon('sparkles').replace('<svg ','<svg style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-left:4px" ')} مساحتك الخاصة للدراسة</span><h1>كل محاضرة في مكانها.<br>وكل شيء تحت سيطرتك.</h1><p>رتّب موادك، أضف ملفات محاضراتك، واحتفظ بمكتبتك جاهزة للدراسة حتى دون إنترنت.</p><button class="btn btn-dark hero-btn" data-action="goto-subjects">استعرض المواد ${icon('arrow')}</button></div><div class="hero-art">${icon('heart')}</div></div>${stats()}<div class="section-head"><div><h2>موادي الدراسية</h2><p>اختر المادة لإضافة محاضراتها أو استعراضها</p></div><button class="btn btn-outline btn-small" data-action="goto-subjects">عرض الكل ${icon('arrow')}</button></div>${groupedSubjects(state.subjects)}<div class="section-head"><div><h2>أدوات مكتبتك</h2><p>كل شيء تضيفه محفوظ داخل مكتبتك</p></div></div><div class="backup-grid"><div class="paper"><h2>أضف محاضراتك بنفسك</h2><p>ادخل إلى أي مادة واختر ملف HTML أو PDF من تطبيق «الملفات»، ثم سمِّ المحاضرة ورتّبها.</p><button class="btn btn-primary btn-small" style="margin-top:13px" data-action="goto-subjects">الذهاب إلى المواد ${icon('arrow')}</button></div><div class="paper"><h2>أرسل مكتبتك لزميلك</h2><p>أنشئ نسخة واحدة بامتداد .medlib. يستوردها صديقك من نفس التطبيق فتصل المواد والمحاضرات كما رتّبتها.</p><button class="btn btn-outline btn-small" style="margin-top:13px" data-action="goto-backup">النسخ والمشاركة ${icon('share')}</button></div></div>`;}
  function renderSubjects(){return `<div class="section-head" style="margin-top:0"><div><span class="kicker">المكتبة الدراسية</span><h2 style="margin-top:7px">جميع المواد</h2><p>ابدأ من أي مادة وأضف محاضراتها من داخل التطبيق.</p></div><button class="btn btn-primary" data-action="add-subject">${icon('plus')} إضافة مادة</button></div>${stats()}<div class="filter-row"><label class="search-field">${icon('search')}<input id="subject-search" type="search" placeholder="ابحث عن مادة أو محاضرة…" aria-label="بحث عن مادة أو محاضرة" autocomplete="off"/></label><span class="small muted" id="search-count">${state.subjects.length} مواد</span></div><div id="subjects-grid">${groupedSubjects(state.subjects)}</div><div id="subject-no-results" class="empty-state hidden"><span class="empty-icon">${icon('search')}</span><h3>لا توجد نتائج</h3><p>جرّب كلمة أخرى للبحث.</p></div>`;}
  function lectureRow(l,idx,len){
    const menu=`<details class="lecture-more"><summary aria-label="خيارات المحاضرة ${h(l.title)}" title="المزيد من الخيارات">${icon('dots')}</summary><div class="lecture-menu" role="group" aria-label="إدارة المحاضرة"><button data-action="edit-lecture" data-id="${h(l.id)}">${icon('edit')} تعديل الاسم والرقم</button><button data-action="move-up" data-id="${h(l.id)}" ${idx===0?'disabled':''}>${icon('up')} تقديم المحاضرة</button><button data-action="move-down" data-id="${h(l.id)}" ${idx===len-1?'disabled':''}>${icon('down')} تأخير المحاضرة</button><button class="danger" data-action="delete-lecture" data-id="${h(l.id)}">${icon('trash')} حذف المحاضرة</button></div></details>`;
    return `<article class="lecture-row"><div class="lecture-row-top"><div class="lecture-num">${String(l.order||idx+1).padStart(2,'0')}</div><div class="lecture-main"><strong>${h(l.title)}</strong><p><span>${l.kind==='pdf'?'PDF':'HTML'}</span><span>${formatSize(l.size||l.blob?.size||0)}</span></p></div></div>${menu}<button class="lecture-open" data-action="read" data-id="${h(l.id)}">${icon('books')} فتح</button></article>`;
  }
  function renderDetail(){const s=subjectOf(state.subjectId);if(!s){state.page='subjects';return renderSubjects();}const ls=state.lectures.filter(l=>l.subjectId===s.id).sort(sortByOrder);return `<div class="breadcrumb"><button class="crumb-btn" data-action="goto-subjects">المواد الدراسية</button><span>/</span><span>${h(s.name)}</span></div><div class="subject-detail-top"><div class="detail-title"><span class="detail-title-icon">${icon('books')}</span><div><h1>${h(s.name)}</h1><p>${h(s.english||'')} · ${ls.length} محاضرة</p></div></div><div class="detail-actions"><button class="btn btn-outline btn-small" data-action="edit-subject" data-id="${h(s.id)}">${icon('edit')} تعديل المادة</button><button class="btn btn-primary" data-action="add-lecture" data-id="${h(s.id)}">${icon('plus')} إضافة محاضرة</button></div></div><div class="notice" style="margin-bottom:17px">${icon('info').replace('<svg ','<svg style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-left:4px" ')} المحاضرات المُضافة هنا محفوظة على جهازك. يمكنك تغيير اسم المحاضرة وترتيبها، وتفتح تلقائيًا بالحجم المناسب لشاشتك.</div>${ls.length?`<div class="lecture-list">${ls.map((l,i)=>lectureRow(l,i,ls.length)).join('')}</div>`:`<div class="empty-state"><div class="empty-icon">${icon('folder')}</div><h3>هذه المادة لا تحتوي على محاضرات بعد</h3><p>أضف أول ملف HTML أو PDF، واكتب الاسم الذي يناسبك. تستطيع تعديله لاحقًا في أي وقت.</p><button class="btn btn-primary" data-action="add-lecture" data-id="${h(s.id)}">${icon('plus')} إضافة أول محاضرة</button></div>`}<div class="section-head"><div><h2>معلومات المادة</h2><p>تظهر هذه البيانات أيضًا عند مشاركة المكتبة</p></div></div><div class="paper"><div class="settings-row"><span>اسم المادة</span><strong>${h(s.name)}</strong></div><div class="settings-row"><span>عدد المحاضرات</span><strong>${ls.length}</strong></div><div class="settings-row"><span>المساحة المستخدمة</span><strong>${formatSize(bytesOf(s.id))}</strong></div><div class="settings-row"><span>إجراءات المادة</span><button class="subtle-link" data-action="delete-subject" data-id="${h(s.id)}">حذف المادة وملفاتها</button></div></div>`;}
  function renderBackup(){return `<div><span class="kicker">مشاركتك أسهل</span><h1 style="font-size:27px;margin:7px 0 9px">النسخ الاحتياطي والمشاركة</h1><p class="muted small" style="line-height:2">رتّب مكتبتك ثم أرسلها لصديقك. لن يحتاج لفتح ZIP أو إضافة الملفات واحدًا واحدًا.</p></div><div class="backup-grid"><div class="paper feature-card"><span class="feature-icon">${icon('share')}</span><h3>تصدير مكتبتي</h3><p>إنشاء ملف مكتبة واحد يشمل جميع أسماء المواد وترتيب المحاضرات ومحتوى الملفات نفسه.</p><button class="btn btn-primary" data-action="prepare-backup">${icon('share')} إنشاء نسخة للمشاركة</button></div><div class="paper feature-card"><span class="feature-icon">${icon('download')}</span><h3>استيراد مكتبة</h3><p>اختر النسخة التي أرسلها زميلك؛ ستظهر المواد ومحاضراتها جاهزة داخل تطبيقك.</p><button class="btn btn-outline" data-action="select-restore">${icon('upload')} اختيار نسخة للاستيراد</button></div></div><div class="section-head"><div><h2>ماذا تحتوي النسخة؟</h2><p>ملف خاص بالتطبيق بامتداد .medlib، وليس ملف ZIP تحتاج لفكّه.</p></div></div><div class="paper"><div class="settings-row"><span>المواد الدراسية</span><strong>${state.subjects.length} مواد</strong></div><div class="settings-row"><span>المحاضرات</span><strong>${state.lectures.length} محاضرة</strong></div><div class="settings-row"><span>أحجام ملفات المحاضرات</span><strong>${formatSize(totalBytes())}</strong></div><div class="settings-row"><span>تنقل النسخة</span><strong>الأسماء والترتيب وملفات HTML / PDF</strong></div><div class="notice warning" style="margin-top:14px">${icon('alert').replace('<svg ','<svg style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-left:4px" ')} احفظ نسخة من مكتبتك في «الملفات» أو iCloud بانتظام. قد يمحو المتصفح التخزين المحلي عند انخفاض المساحة أو إزالة التطبيق.</div></div><div class="section-head"><div><h2>كيف يفتحها صديقك؟</h2></div></div><div class="paper"><div class="steps"><div class="step"><span class="step-num">1</span><p><strong>أنت:</strong> اضغط «إنشاء نسخة للمشاركة»، وأرسل الملف بواسطة واتساب أو AirDrop أو «حفظ في الملفات».</p></div><div class="step"><span class="step-num">2</span><p><strong>صديقك:</strong> يفتح تطبيق «محاضرات تمريض» على جهازه ثم يدخل صفحة «النسخ والمشاركة».</p></div><div class="step"><span class="step-num">3</span><p><strong>صديقك:</strong> يضغط «اختيار نسخة للاستيراد» ويحدد الملف؛ التطبيق يستعيد جميع المواد والمحاضرات في أماكنها.</p></div></div></div>`;}
  function renderGuide(){return `<div><span class="kicker">دليلك السريع</span><h1 style="font-size:27px;margin:7px 0 9px">استخدام التطبيق</h1><p class="muted small" style="line-height:2">رتب المحاضرات واحفظ مكتبتك وشارك نسخة منها بسهولة.</p></div><div class="backup-grid"><div class="paper"><span class="feature-icon">${icon('books')}</span><h2>إضافة محاضرة</h2><div class="steps"><div class="step"><span class="step-num">1</span><p>افتح «المواد» واختر المادة المطلوبة.</p></div><div class="step"><span class="step-num">2</span><p>اضغط «إضافة محاضرة» ثم اختر ملف HTML أو PDF وحدد الاسم والترتيب.</p></div><div class="step"><span class="step-num">3</span><p>انتظر رسالة تأكيد الحفظ، ثم افتح المحاضرة من زر «فتح».</p></div></div></div><div class="paper"><span class="feature-icon">${icon('share')}</span><h2>مشاركة المكتبة</h2><div class="steps"><div class="step"><span class="step-num">1</span><p>ادخل إلى «النسخ» واختر «إنشاء نسخة للمشاركة».</p></div><div class="step"><span class="step-num">2</span><p>احفظ ملف .medlib أو شاركه مع زميلك.</p></div><div class="step"><span class="step-num">3</span><p>يستورد زميلك الملف من داخل التطبيق، فتنتقل المواد والمحاضرات وترتيبها.</p></div></div></div></div><div class="section-head"><div><h2>التثبيت والعمل دون إنترنت</h2></div></div><div class="paper"><div class="notice">${icon('shield').replace('<svg ','<svg style="width:17px;height:17px;display:inline-block;vertical-align:middle;margin-left:5px" ')} افتح رابط الموقع مرة واحدة أثناء الاتصال بالإنترنت. يمكنك إضافته للشاشة الرئيسية من قائمة المتصفح، ثم استيراد محاضراتك وحفظها محليًا.</div><div class="steps"><div class="step"><span class="step-num">1</span><p>يعمل التطبيق ومحاضراته المحفوظة دون اتصال بعد تخزين ملفات الواجهة والمحتوى بنجاح.</p></div><div class="step"><span class="step-num">2</span><p>للمحاضرات التفاعلية: يجب أن تكون الصور والملفات الضرورية مدمجة في HTML حتى تعمل دون إنترنت.</p></div><div class="step"><span class="step-num">3</span><p>احفظ نسخة .medlib خارج التطبيق بانتظام؛ فقد تُحذف البيانات المحلية عند تنظيف مساحة التخزين.</p></div></div></div><div class="section-head"><div><h2>خصوصية المحتوى</h2></div></div><div class="paper"><p>تبقى الملفات التي تضيفها على الجهاز داخل مساحة التخزين المحلية. وتُعرض محاضرات HTML في إطار منفصل محدود الصلاحيات.</p><p style="margin-top:12px">قد لا تعمل ملفات HTML التي تعتمد على روابط خارجية أو أذونات خاصة دون إنترنت. لا يمكن ضمان توافق كل ملف مصدر خارجي.</p></div>`;}
  async function render(){pageHeading();const root=document.getElementById('main-content');let content='';switch(state.page){case 'home':content=renderHome();break;case 'subjects':content=renderSubjects();break;case 'detail':content=renderDetail();break;case 'backup':content=renderBackup();break;case 'guide':content=renderGuide();break;}root.innerHTML=content;}

  function showModal(html,wide=false){document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop"><div class="modal ${wide?'modal-wide':''}" role="dialog" aria-modal="true">${html}</div></div>`;}
  function closeModal(){document.getElementById('modal-root').replaceChildren();state.backupFile=null;state.restoreSource=null;}
  function modalHeader(title,sub=''){return `<div class="modal-head"><div><h2>${h(title)}</h2>${sub?`<p>${h(sub)}</p>`:''}</div><button class="close-btn" type="button" data-action="close-modal" aria-label="إغلاق">${icon('close')}</button></div>`;}
  function formActions(label='حفظ'){return `<div class="form-actions"><button class="btn btn-primary" type="submit">${icon('check')} ${h(label)}</button><button class="btn btn-quiet" type="button" data-action="close-modal">إلغاء</button></div>`;}
  function showSubjectForm(subjectId=null){const subject=subjectId?subjectOf(subjectId):null;showModal(`${modalHeader(subject?'تعديل المادة':'إضافة مادة جديدة','اسم المادة وترتيبها قابلان للتعديل لاحقًا')}<form id="subject-form" class="form"><div class="field"><label for="subject-name">اسم المادة</label><input id="subject-name" type="text" required maxlength="90" placeholder="مثال: الإسعافات الأولية" value="${h(subject?.name||'')}"></div><div class="field"><label for="subject-english">الاسم بالإنجليزية (اختياري)</label><input id="subject-english" dir="ltr" maxlength="90" placeholder="First Aid" value="${h(subject?.english||'')}"></div><input type="hidden" id="subject-id" value="${h(subjectId||'')}">${formActions(subject?'حفظ التغييرات':'إضافة المادة')}</form>`);document.getElementById('subject-name').focus();}
  async function submitSubject(event){event.preventDefault();if(state.busy)return;const id=document.getElementById('subject-id').value;const name=document.getElementById('subject-name').value.trim();const english=document.getElementById('subject-english').value.trim();if(!name){toast('أدخل اسم المادة',true);return;}if(state.subjects.some(s=>s.id!==id&&normalizeName(s.name)===normalizeName(name))){toast('هذه المادة موجودة بالفعل',true);return;}const s=id?subjectOf(id):null;await saveOne('subjects',{id:id||uid(),name,english,order:s?.order??state.subjects.length,createdAt:s?.createdAt||Date.now()});closeModal();await refresh();toast(s?'تم تعديل اسم المادة':'تمت إضافة المادة بنجاح');}
  function showLectureForm(subjectId,lectureId=null){const s=subjectOf(subjectId);const l=lectureId?lectureOf(lectureId):null;if(!s)return;const ls=state.lectures.filter(x=>x.subjectId===subjectId);const next=ls.length?Math.max(...ls.map(x=>Number(x.order)||0))+1:1;showModal(`${modalHeader(l?'تعديل المحاضرة':'إضافة محاضرة جديدة',s.name)}<form class="form" id="lecture-form"><div class="field"><label>اختر ملف المحاضرة ${l?'(اختياري عند تعديل البيانات)':'*'}</label><label class="file-drop" for="lecture-file">${icon('upload')}<strong id="lecture-file-label">${l?`الملف الحالي: ${h(l.fileName)}`:'اضغط لاختيار ملف HTML أو PDF'}</strong><small>يمكن اختيار الملف من تطبيق «الملفات» على جهازك</small><input id="lecture-file" type="file" accept=".html,.htm,.pdf,text/html,application/pdf" ${l?'':'required'} aria-label="اختر ملف المحاضرة"></label></div><div class="field"><label for="lecture-title">اسم المحاضرة *</label><input id="lecture-title" required maxlength="130" value="${h(l?.title||'')}" placeholder="مثال: مقدمة عن أمراض القلب"><small>يمكن تغيير الاسم لاحقًا دون إعادة رفع الملف.</small></div><div class="field"><label for="lecture-order">رقم المحاضرة وترتيبها</label><input id="lecture-order" type="number" min="1" max="9999" required value="${h(l?.order||next)}" inputmode="numeric"></div><input type="hidden" id="lecture-subject" value="${h(subjectId)}"><input type="hidden" id="lecture-id" value="${h(lectureId||'')}"><div class="notice warning">ملفات HTML التي تحتوي صورها وسكربتاتها بداخلها هي الأفضل للعمل دون إنترنت. لن تُنشر المحاضرة على الإنترنت.</div>${formActions(l?'حفظ التعديلات':'حفظ المحاضرة')}</form>`,true);document.getElementById('lecture-file').addEventListener('change',()=>{const file=document.getElementById('lecture-file').files[0];if(!file)return;document.getElementById('lecture-file-label').textContent=file.name;const title=document.getElementById('lecture-title');if(!title.value.trim())title.value=file.name.replace(/\.(html?|pdf)$/i,'').replace(/[_-]+/g,' ').trim();});}
  async function submitLecture(event){
    event.preventDefault(); if(state.busy)return;
    const id=document.getElementById('lecture-id').value;
    const subjectId=document.getElementById('lecture-subject').value;
    const file=document.getElementById('lecture-file').files[0];
    const title=document.getElementById('lecture-title').value.trim();
    const order=Math.floor(Number(document.getElementById('lecture-order').value));
    const old=id?lectureOf(id):null;
    if(!title||!Number.isInteger(order)||order<1||order>9999){toast('اكتب اسم المحاضرة ورقمًا صحيحًا من 1 إلى 9999',true);return;}
    if(!old&&!file){toast('اختر ملف المحاضرة أولًا',true);return;}
    if(file&&!kindOf(file)){toast('الملفات المدعومة: HTML وPDF',true);return;}
    if(file&&file.size===0){toast('الملف المختار فارغ',true);return;}
    if(!subjectOf(subjectId)){toast('المادة غير موجودة',true);return;}
    const btn=event.target.querySelector('button[type="submit"]');
    state.busy=true;btn.disabled=true;btn.textContent='جارٍ فحص الملف وحفظه…';
    try{
      const crc=file?await crc32Blob(file):old.crc32;
      // Prevent exact duplicate import even if the same file was renamed.
      const duplicate=file?state.lectures.find(l=>l.id!==id && l.subjectId===subjectId && l.size===file.size && l.crc32===crc):null;
      if(duplicate)throw new Error('هذه المحاضرة موجودة بالفعل في المادة، ويمكن تعديل اسمها وترتيبها دون إعادة رفعها.');
      const record={id:id||uid(),subjectId,title,order,
        fileName:file?.name||old?.fileName,
        kind:file?kindOf(file):old.kind,size:file?file.size:old.size,
        crc32:crc,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now(),lastOpenedAt:old?.lastOpenedAt||0};
      await saveLectureAndFile(record,file||null);
      await verifySavedLecture(record,file||null);
      closeModal();await refresh();
      toast(old?'تم حفظ التعديلات والتحقق منها':'تم حفظ المحاضرة والتحقق من سلامة ملفها');
    }catch(err){btn.disabled=false;btn.textContent='حفظ المحاضرة';toast(errMsg(err),true);}
    finally{state.busy=false;}
  }
    function confirmDialog(title,message,confirmLabel,action,danger=false){showModal(`${modalHeader(title)}<p class="muted small" style="line-height:2;margin-bottom:20px">${h(message)}</p><div class="form-actions"><button id="confirm-action" class="btn ${danger?'btn-danger':'btn-primary'}">${h(confirmLabel)}</button><button class="btn btn-outline" data-action="close-modal">إلغاء</button></div>`);document.getElementById('confirm-action').addEventListener('click',async()=>{if(state.busy)return;state.busy=true;try{await action();closeModal();await refresh();}catch(e){toast(errMsg(e),true);}finally{state.busy=false;}});}
  function askDeleteLecture(id){const l=lectureOf(id);if(!l)return;confirmDialog('حذف المحاضرة',`سيُحذف «${l.title}» وملفها المحفوظ من هذا الجهاز. لا يمكن التراجع إلا باستيراد نسخة احتياطية.`, 'حذف المحاضرة',async()=>{await deleteLectureAndFile(id);toast('حُذفت المحاضرة');},true);}
  function askDeleteSubject(id){const s=subjectOf(id);if(!s)return;const n=countOf(id);confirmDialog('حذف المادة',`سيُحذف «${s.name}» مع ${n} من محاضراتها المحفوظة. احتفظ بنسخة احتياطية إن كنت تحتاجها.`, 'حذف المادة وملفاتها',async()=>{const tx=state.db.transaction(['subjects','lectures','files'],'readwrite');const done=transactionPromise(tx);tx.objectStore('subjects').delete(id);const store=tx.objectStore('lectures');state.lectures.filter(l=>l.subjectId===id).forEach(l=>{store.delete(l.id);tx.objectStore('files').delete(l.id);});await done;state.page='subjects';state.subjectId=null;toast('حُذفت المادة ومحاضراتها');},true);}
  async function moveLecture(id,direction){const l=lectureOf(id);if(!l)return;const ordered=state.lectures.filter(x=>x.subjectId===l.subjectId).sort(sortByOrder);const idx=ordered.findIndex(x=>x.id===id);const other=idx+direction;if(other<0||other>=ordered.length)return;[ordered[idx],ordered[other]]=[ordered[other],ordered[idx]];const updates=ordered.map((item,index)=>({...item,order:index+1}));await saveMany('lectures',updates);await refresh();}

  // A single light metadata record lives in memory; the large lecture Blob never does.
  // When controlled by the service worker, navigation streams the document from IndexedDB.
  function readerHtml(l,s){return `<div class="reader" role="dialog" aria-label="قارئ المحاضرة" aria-modal="true"><div class="reader-header"><button class="reader-close" data-action="close-reader">${icon('arrow')} رجوع</button><div class="reader-header-title"><strong>${h(l.title)}</strong><small>${h(s?.name||'')} · ${l.kind==='pdf'?'PDF':'HTML'}</small></div><div class="reader-tools" aria-label="أدوات المحاضرة"><button class="reader-tool" data-action="retry-reader" title="إعادة تحميل المحاضرة" aria-label="إعادة تحميل المحاضرة">${icon('rotate')}</button><button class="reader-tool" data-action="zoom-out" title="تصغير" aria-label="تصغير">${icon('zoomout')}</button><button class="reader-tool" data-action="zoom-reset" title="الحجم الأصلي" id="zoom-label">100%</button><button class="reader-tool" data-action="zoom-in" title="تكبير" aria-label="تكبير">${icon('zoomin')}</button></div></div><div class="reader-body"><div class="reader-stage" id="reader-stage"></div><div class="reader-load-status" id="reader-load-status" role="status"><div class="spinner"></div><strong id="reader-load-title">جارٍ فتح المحاضرة…</strong><p id="reader-load-hint">يُرجى الانتظار حتى تظهر الصفحة.</p><button class="btn btn-outline" data-action="retry-reader">إعادة المحاولة</button></div></div></div>`;}
  function readerStatus(message,problem=false){const box=document.getElementById('reader-load-status');if(!box)return;
    box.hidden=false;box.classList.toggle('has-problem',problem);
    const title=document.getElementById('reader-load-title');if(title)title.textContent=message;
    const hint=document.getElementById('reader-load-hint');if(hint)hint.textContent=problem?'يمكنك إعادة المحاولة دون إغلاق التطبيق.':'قد تستغرق الملفات الكبيرة وقتًا أطول.';
  }
  function releaseReaderUrl(r){if(r?.url){URL.revokeObjectURL(r.url);r.url=null;}}
  async function loadReaderFrame(forceFallback=false){
    const r=state.reading;if(!r)return;
    const l=lectureOf(r.id);if(!l){readerStatus('المحاضرة غير موجودة',true);return;}
    const attempt=++r.attempt;
    clearTimeout(r.timer);
    const stage=document.getElementById('reader-stage');if(!stage)return;
    // Unmount the old document BEFORE revoking its URL: avoids stale WebKit frames.
    stage.replaceChildren();releaseReaderUrl(r);
    readerStatus('جارٍ فتح المحاضرة…');
    const frame=document.createElement('iframe');frame.id='lecture-frame';frame.className='reader-frame';frame.title=l.title;frame.loading='eager';frame.referrerPolicy='no-referrer';
    frame.setAttribute('allow','autoplay; fullscreen');
    if(l.kind==='html')frame.setAttribute('sandbox','allow-scripts allow-forms allow-modals allow-downloads');
    frame.style.width=`${100/r.zoom}%`;frame.style.height=`${100/r.zoom}%`;frame.style.transform=`scale(${r.zoom})`;
    let completed=false;
    frame.addEventListener('load',()=>{
      if(state.reading!==r||r.attempt!==attempt)return;
      completed=true;clearTimeout(r.timer);
      const box=document.getElementById('reader-load-status');if(box)box.hidden=true;
    });
    frame.addEventListener('error',()=>{if(state.reading===r&&r.attempt===attempt)readerStatus('تعذّر فتح المحاضرة. اضغط إعادة المحاولة.',true);});
    r.timer=setTimeout(()=>{if(state.reading===r&&r.attempt===attempt&&!completed)readerStatus('تأخر فتح المحاضرة. حاول مجددًا.',true);},18000);
    try{
      // The service worker sends a streaming Response from IndexedDB. Never stringifies HTML.
      const controlled=!!navigator.serviceWorker?.controller;
      if(controlled && !forceFallback){
        const url=new URL('./_nursing_local_lecture/'+encodeURIComponent(l.id),location.href);
        url.searchParams.set('v',String(l.updatedAt||0));
        if(state.reading!==r||r.attempt!==attempt)return;
        frame.src=url.href;stage.appendChild(frame);
      }else{
        const stored=await getFile(l.id);
        if(!stored || !(stored.blob instanceof Blob) || stored.blob.size!==l.size)throw new Error('ملف المحاضرة غير موجود أو غير مكتمل.');
        const url=URL.createObjectURL(stored.blob);
        if(state.reading!==r||r.attempt!==attempt){URL.revokeObjectURL(url);return;}
        r.url=url;frame.src=url;stage.appendChild(frame);
      }
    }catch(e){if(state.reading===r&&r.attempt===attempt){console.error(e);readerStatus(errMsg(e),true);}}
  }
  async function openReader(id){
    const l=lectureOf(id);if(!l){toast('لم يتم العثور على المحاضرة',true);return;}
    if(state.reading)closeReader();
    const stored=await getFile(id);
    if(!stored || !(stored.blob instanceof Blob) || stored.blob.size!==l.size){toast('ملف المحاضرة غير محفوظ بشكل صحيح',true);return;}
    const root=document.getElementById('reader-root');root.innerHTML=readerHtml(l,subjectOf(l.subjectId));
    state.reading={id,url:null,zoom:1,attempt:0,timer:null};
    document.body.style.overflow='hidden';
    await loadReaderFrame(false);
    // Update ONLY metadata; never rewrite 30 MB binary files to log a visit.
    try{await saveOne('lectures',{...l,lastOpenedAt:Date.now()});}catch(e){console.warn('Failed to update history',e);}
  }
  function closeReader(){
    const r=state.reading;if(!r)return;
    state.reading=null;clearTimeout(r.timer);
    const root=document.getElementById('reader-root');root.replaceChildren();releaseReaderUrl(r);
    document.body.style.overflow='';
  }
  async function retryReader(){const r=state.reading;if(!r)return;await loadReaderFrame(true);}
  function setReaderZoom(delta){const r=state.reading;if(!r)return;r.zoom=delta===0?1:Math.min(2,Math.max(.5,Math.round((r.zoom+delta)*10)/10));const frame=document.getElementById('lecture-frame');if(!frame)return;frame.style.width=`${100/r.zoom}%`;frame.style.height=`${100/r.zoom}%`;frame.style.transform=`scale(${r.zoom})`;const label=document.getElementById('zoom-label');if(label)label.textContent=`${Math.round(r.zoom*100)}%`;}
    async function prepareBackup(){
    if(state.busy)return;state.busy=true;
    const trigger=document.querySelector('[data-action="prepare-backup"]');const oldLabel=trigger?.innerHTML;
    if(trigger){trigger.disabled=true;trigger.textContent='جارٍ فحص المحاضرات وتجهيز النسخة…';}
    try{
      // Lecture metadata is tiny. Load one Blob at a time, never all files as JS strings.
      const subjects=(await readStore('subjects')).sort(sortByOrder);
      const lectures=(await readStore('lectures')).sort(sortByOrder);
      const contents=[],checks=[];let total=0;
      for(let i=0;i<lectures.length;i++){
        const l=lectures[i];if(trigger)trigger.textContent=`جارٍ فحص المحاضرة ${i+1} من ${lectures.length}…`;
        const data=await getFile(l.id);
        if(!data || !(data.blob instanceof Blob) || data.blob.size!==l.size)throw new Error(`الملف «${l.title}» غير مكتمل؛ لن تُنشأ نسخة ناقصة.`);
        const crc=await crc32Blob(data.blob);
        if(l.crc32 && crc!==l.crc32)throw new Error(`الملف «${l.title}» لا يطابق الملف الأصلي.`);
        contents.push(data.blob);checks.push(crc);total+=l.size;
      }
      const metadata={format:'MEDLIB',version:3,createdAt:new Date().toISOString(),subjects:subjects.map(({id,name,english,order,createdAt})=>({id,name,english,order,createdAt})),lectures:lectures.map(({id,subjectId,title,order,fileName,kind,size,createdAt,updatedAt},i)=>({id,subjectId,title,order,fileName,kind,size,createdAt,updatedAt,crc32:checks[i]}))};
      const bytes=encoder.encode(JSON.stringify(metadata));if(bytes.length>10*1024*1024)throw new Error('بيانات النسخة كبيرة جدًا');
      const header=new Uint8Array(12);header.set(encoder.encode(FORMAT_MAGIC),0);new DataView(header.buffer).setUint32(8,bytes.length,false);
      const expected=12+bytes.length+total;
      // The archive contains each original file once, unencoded and uncompressed.
      const date=new Date().toISOString().slice(0,10);
      const backup=new File([header,bytes,...contents],`محاضرات-تمريض-${date}.medlib`,{type:'application/octet-stream',lastModified:Date.now()});
      if(backup.size!==expected)throw new Error(`فشل فحص الحجم: المتوقع ${formatSize(expected)} لكن الناتج ${formatSize(backup.size)}.`);
      state.backupFile=backup;state.backupInfo={subjects:subjects.length,lectures:lectures.length};
      showModal(`${modalHeader('نسختك جاهزة للمشاركة','تحتوي على المواد والمحاضرات وملفاتها كاملة.')}<div class="backup-preview"><div class="preview-list"><div class="preview-line"><span>المواد</span><b>${subjects.length}</b></div><div class="preview-line"><span>المحاضرات</span><b>${lectures.length}</b></div><div class="preview-line"><span>حجم الملفات الأصلية</span><b>${formatSize(total)}</b></div><div class="preview-line"><span>حجم النسخة الفعلي</span><b>${formatSize(backup.size)}</b></div><div class="preview-line"><span>الفحص</span><b>كل ملف أُضيف مرة واحدة ✅</b></div></div></div><div class="notice">ملف مشاركة واحد بامتداد .medlib. يستطيع زميلك استيراده مباشرة داخل التطبيق.</div><div class="form-actions"><button class="btn btn-primary" data-action="share-backup">${icon('share')} مشاركة النسخة</button><button class="btn btn-outline" data-action="download-backup">${icon('download')} حفظ نسخة</button></div><button class="btn btn-quiet btn-wide" style="margin-top:10px" data-action="close-modal">إغلاق</button>`);
    }catch(e){console.error(e);toast(errMsg(e),true);}
    finally{state.busy=false;if(trigger){trigger.disabled=false;trigger.innerHTML=oldLabel;}}
  }
    function downloadBackup(){const file=state.backupFile;if(!file){toast('أنشئ نسخة أولًا',true);return;}const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('تم طلب حفظ النسخة. اختر «الملفات» عند ظهور خيارات التنزيل.');}
  function shareBackup(){const file=state.backupFile;if(!file){toast('أنشئ نسخة أولًا',true);return;}if(!navigator.share||!navigator.canShare?.({files:[file]})){toast('المشاركة المباشرة غير متاحة هنا؛ استخدم «حفظ نسخة» وأرسل الملف من تطبيق الملفات.');return;}navigator.share({files:[file],title:'محاضرات تمريض',text:'نسخة من محاضرات تمريض — افتح التطبيق ثم اختر استيراد نسخة.'}).catch(err=>{if(err.name!=='AbortError')toast('تعذرت المشاركة: '+errMsg(err),true);});}

  async function inspectBackup(file){
    if(!(file instanceof File)||file.size<12)throw new Error('الملف غير صالح أو فارغ');
    const first=new Uint8Array(await file.slice(0,12).arrayBuffer());
    const magic=decoder.decode(first.slice(0,8));
    if(![FORMAT_MAGIC,PREVIOUS_MAGIC,LEGACY_MAGIC].includes(magic))throw new Error('هذا ليس ملف نسخة صالحة لتطبيق محاضرات تمريض (.medlib)');
    const metaLength=new DataView(first.buffer).getUint32(8,false);
    if(metaLength<2||metaLength>10*1024*1024||metaLength+12>file.size)throw new Error('بيانات النسخة غير صالحة');
    let manifest;try{manifest=JSON.parse(await file.slice(12,12+metaLength).text());}catch(_){throw new Error('تعذرت قراءة معلومات النسخة');}
    if(manifest.format!=='MEDLIB'||!Array.isArray(manifest.subjects)||!Array.isArray(manifest.lectures)||!((magic===FORMAT_MAGIC&&manifest.version===3)||(magic===PREVIOUS_MAGIC&&manifest.version===2)||(magic===LEGACY_MAGIC&&manifest.version===1)))throw new Error('نسخة غير متوافقة مع إصدار التطبيق');
    if(manifest.subjects.length>500||manifest.lectures.length>50000)throw new Error('عدد العناصر أكبر من المسموح');
    const subjectIds=new Set(),lectureIds=new Set();
    for(const item of manifest.subjects){if(!item||typeof item.id!=='string'||!item.id||item.id.length>250||typeof item.name!=='string'||!item.name.trim()||item.name.length>500||subjectIds.has(item.id))throw new Error('توجد مادة غير صالحة أو مكررة داخل النسخة');subjectIds.add(item.id);}
    for(const item of manifest.lectures){if(!item||typeof item.id!=='string'||!item.id||item.id.length>250||lectureIds.has(item.id)||!subjectIds.has(item.subjectId)||!['html','pdf'].includes(item.kind)||typeof item.title!=='string'||!item.title.trim()||item.title.length>500||typeof item.fileName!=='string'||item.fileName.length>500||!Number.isSafeInteger(item.size)||item.size<1||(manifest.version>=2&&!/^[0-9a-f]{8}$/.test(item.crc32||'')))throw new Error('توجد محاضرة غير صالحة أو ناقصة داخل النسخة');lectureIds.add(item.id);}
    let offset=12+metaLength;
    for(const item of manifest.lectures){if(item.size>file.size-offset)throw new Error('النسخة ناقصة ولا تحتوي على كل ملفات المحاضرات');item._offset=offset;offset+=item.size;}
    if(offset!==file.size)throw new Error('حجم النسخة لا يطابق بياناتها');
    return manifest;
  }
  async function selectBackup(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;try{const manifest=await inspectBackup(file);state.restoreSource={file,manifest};showModal(`${modalHeader('استيراد مكتبة','تم التحقق من صيغة ملف المشاركة وحساب محتوياته.')}<div class="backup-preview"><div class="preview-list"><div class="preview-line"><span>اسم الملف</span><b style="max-width:60%;overflow-wrap:anywhere;text-align:left" dir="auto">${h(file.name)}</b></div><div class="preview-line"><span>المواد</span><b>${manifest.subjects.length}</b></div><div class="preview-line"><span>المحاضرات</span><b>${manifest.lectures.length}</b></div><div class="preview-line"><span>الحجم</span><b>${formatSize(file.size)}</b></div></div></div><p class="small" style="font-weight:800;margin-bottom:9px">كيف تريد استيرادها؟</p><label class="choice"><input type="radio" name="restore-mode" value="merge" checked><span><strong>إضافة وتحديث</strong><small>احتفظ بمحاضراتي، وأضف الجديد وحدّث العناصر الموجودة من نفس النسخة دون تكرار معرفاتها.</small></span></label><label class="choice"><input type="radio" name="restore-mode" value="replace"><span><strong>استبدال مكتبتي بالكامل</strong><small>امسح جميع المواد والمحاضرات الحالية واستعد مكتبة الزميل كما هي تمامًا.</small></span></label><div class="form-actions"><button class="btn btn-primary" data-action="restore-backup">${icon('download')} بدء الاستيراد</button><button class="btn btn-outline" data-action="close-modal">إلغاء</button></div>`,true);}catch(e){toast(errMsg(e),true);}}
  async function restoreBackup(){
    if(state.busy||!state.restoreSource)return;
    const mode=document.querySelector('input[name="restore-mode"]:checked')?.value||'merge';
    if(mode==='replace'){
      showModal(`${modalHeader('تأكيد استبدال المكتبة')}<div class="notice warning">${icon('alert')} سيتم حذف جميع موادك ومحاضراتك الحالية واستبدالها بمحتوى النسخة. لا يمكن التراجع إلا بوجود نسخة احتياطية أخرى.</div><p class="muted small" style="line-height:2;margin:16px 0">هل أنت متأكد أنك تريد المتابعة؟</p><div class="form-actions"><button class="btn btn-danger" data-action="confirm-restore">نعم، استبدال المكتبة</button><button class="btn btn-outline" data-action="close-modal">إلغاء</button></div>`);
      return;
    }
    await performRestoreBackup('merge');
  }
  async function performRestoreBackup(mode){
    if(state.busy||!state.restoreSource)return;
    const {file,manifest}=state.restoreSource;state.busy=true;
    const btn=document.querySelector('[data-action="restore-backup"],[data-action="confirm-restore"]');
    if(btn){btn.disabled=true;btn.textContent='جارٍ فحص المحاضرات…';}
    try{
      const importedSubjects=[],importedLectures=[],importedFiles=[];
      const existingSubjects=mode==='merge'?state.subjects:[];
      const existingLectures=mode==='merge'?state.lectures:[];
      const bySubjectId=new Map(existingSubjects.map(s=>[s.id,s]));
      const bySubjectName=new Map(existingSubjects.map(s=>[normalizeName(s.name),s]));
      const byLectureId=new Map(existingLectures.map(l=>[l.id,l]));
      const idMap=new Map();let additional=0;
      for(const raw of manifest.subjects){
        const current=bySubjectId.get(raw.id)||bySubjectName.get(normalizeName(raw.name));
        const id=current?.id||raw.id;
        if(current){if(current.id===raw.id)importedSubjects.push({...current,name:raw.name,english:raw.english||'',order:Number(raw.order)||0});}
        else importedSubjects.push({id,name:raw.name,english:raw.english||'',order:mode==='merge'?existingSubjects.length+additional++:(Number(raw.order)||0),createdAt:Number(raw.createdAt)||Date.now()});
        idMap.set(raw.id,id);
      }
      const seenIds=new Set();
      for(let index=0;index<manifest.lectures.length;index++){
        const raw=manifest.lectures[index];
        const type=raw.kind==='pdf'?'application/pdf':'text/html';
        const content=file.slice(raw._offset,raw._offset+raw.size,type);
        if(btn)btn.textContent=`فحص المحاضرة ${index+1} من ${manifest.lectures.length}…`;
        const crc=await crc32Blob(content);
        if(raw.crc32 && crc!==raw.crc32)throw new Error(`الملف «${raw.title}» تالف أو غير مكتمل. لم تتغير مكتبتك.`);
        const subjectId=idMap.get(raw.subjectId);
        const matched=byLectureId.get(raw.id)||existingLectures.find(l=>l.subjectId===subjectId && normalizeName(l.title)===normalizeName(raw.title) && (normalizeName(l.fileName)===normalizeName(raw.fileName)||l.order===raw.order));
        const id=matched?.id||raw.id;
        if(seenIds.has(id))throw new Error('تكررت محاضرة داخل النسخة؛ لم تتغير مكتبتك.');
        seenIds.add(id);
        importedLectures.push({id,subjectId,title:raw.title,order:Number(raw.order)||1,fileName:raw.fileName,kind:raw.kind,size:raw.size,crc32:crc,createdAt:Number(raw.createdAt)||Date.now(),updatedAt:Number(raw.updatedAt)||Date.now(),lastOpenedAt:matched?.lastOpenedAt||0});
        importedFiles.push({id,blob:content,kind:raw.kind,size:raw.size,crc32:crc});
      }
      if(btn)btn.textContent='جارٍ حفظ المكتبة…';
      // Atomically commit all three stores; if quota fails, nothing is deleted.
      const tx=state.db.transaction(['subjects','lectures','files'],'readwrite');const done=transactionPromise(tx);
      const sub=tx.objectStore('subjects'),lec=tx.objectStore('lectures'),files=tx.objectStore('files');
      if(mode==='replace'){sub.clear();lec.clear();files.clear();}
      for(const item of importedSubjects)sub.put(item);
      for(const item of importedLectures)lec.put(item);
      for(const item of importedFiles)files.put(item);
      await done;
      for(const item of importedLectures){const saved=await getFile(item.id);
        if(!saved || !(saved.blob instanceof Blob) || saved.blob.size!==item.size)throw new Error('فشل التحقق من أحد الملفات المستوردة.');
      }
      state.restoreSource=null;closeModal();state.page='subjects';state.subjectId=null;
      await refresh();toast(`تم استيراد ${manifest.subjects.length} مادة و${manifest.lectures.length} محاضرة بالترتيب بنجاح`);
    }catch(e){console.error(e);toast(errMsg(e),true);if(btn){btn.disabled=false;btn.textContent='إعادة المحاولة';}}
    finally{state.busy=false;}
  }
    async function registerSW(){if(!('serviceWorker' in navigator)||!window.isSecureContext){toast('تعمل ميزة فتح التطبيق دون إنترنت عند نشره عبر HTTPS أو localhost.',true);return;}try{await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;state.swReady=true;try{await navigator.storage?.persist?.();}catch(_){};}catch(e){console.warn('ServiceWorker unavailable:',e);toast('تعذر تثبيت ملفات التطبيق دون إنترنت. تأكد من فتح الرابط عبر HTTPS.',true);}}
  function searchSubjects(q){const needle=normalizeName(q);let n=0;document.querySelectorAll('#subjects-grid .subject-card').forEach(el=>{const id=el.dataset.subject;const s=subjectOf(id);const ls=state.lectures.filter(l=>l.subjectId===id);const okay=!needle||normalizeName([s?.name,s?.english,...ls.map(l=>l.title)].join(' ')).includes(needle);el.classList.toggle('hidden',!okay);if(okay)n++;});document.getElementById('search-count').textContent=`${n} مواد`;document.getElementById('subject-no-results').classList.toggle('hidden',n>0);}

  async function clicked(event){document.querySelectorAll('.lecture-more[open]').forEach(el=>{if(!el.contains(event.target))el.open=false;});const nav=event.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return;}const subj=event.target.closest('[data-subject]');if(subj){navigate('detail',subj.dataset.subject);return;}const btn=event.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action;const id=btn.dataset.id;
    try{switch(action){
      case 'goto-subjects':navigate('subjects');break;
      case 'goto-backup':navigate('backup');break;
      case 'add-subject':showSubjectForm();break;
      case 'edit-subject':showSubjectForm(id);break;
      case 'delete-subject':askDeleteSubject(id);break;
      case 'add-lecture':showLectureForm(id);break;
      case 'edit-lecture':{const l=lectureOf(id);if(l)showLectureForm(l.subjectId,id);break;}
      case 'delete-lecture':askDeleteLecture(id);break;
      case 'move-up':await moveLecture(id,-1);break;
      case 'move-down':await moveLecture(id,1);break;
      case 'read':await openReader(id);break;
      case 'close-reader':closeReader();break;
      case 'retry-reader':await retryReader();break;
      case 'zoom-in':setReaderZoom(.1);break;
      case 'zoom-out':setReaderZoom(-.1);break;
      case 'zoom-reset':setReaderZoom(0);break;
      case 'close-modal':closeModal();break;
      case 'prepare-backup':await prepareBackup();break;
      case 'share-backup':shareBackup();break;
      case 'download-backup':downloadBackup();break;
      case 'select-restore':document.getElementById('backup-import-input').click();break;
      case 'restore-backup':await restoreBackup();break;
      case 'confirm-restore':await performRestoreBackup('replace');break;
    }}catch(e){console.error(e);toast(errMsg(e),true);}
  }
  async function init(){decorate();document.addEventListener('click',clicked);document.addEventListener('submit',async event=>{try{if(event.target.id==='subject-form')await submitSubject(event);else if(event.target.id==='lecture-form')await submitLecture(event);}catch(e){event.preventDefault();toast(errMsg(e),true);}});document.addEventListener('input',event=>{if(event.target.id==='subject-search')searchSubjects(event.target.value);});document.getElementById('backup-import-input').addEventListener('change',selectBackup);document.getElementById('quick-backup-btn').addEventListener('click',()=>navigate('backup'));document.getElementById('modal-root').addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeModal();});window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(state.reading)closeReader();else closeModal();}});
    try{state.db=await openDB();await refresh();registerSW();}catch(e){console.error(e);document.getElementById('main-content').innerHTML=`<div class="empty-state"><span class="empty-icon">${icon('alert')}</span><h3>تعذر فتح التخزين المحلي</h3><p>${h(errMsg(e))}</p><p>جرّب فتح التطبيق في Safari العادي بدل التصفح الخاص، وتأكد من توفر مساحة على الجهاز.</p></div>`;}
  }
  document.addEventListener('DOMContentLoaded',init);
})();
