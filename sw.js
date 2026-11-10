/* محاضرات تمريض — stable shell and local lecture streaming, build 2.0 */
const CACHE='nursing-lectures-shell-clean-v2-20261110';
const DB_NAME='nursing-lectures-clean-v2';
const SHELL=['./','./index.html','./app.js','./styles.css','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
const LOCAL_PATH=new URL('./_nursing_local_lecture/',self.registration.scope).pathname;

function openDB(){return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,1);
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('Database unavailable'));
  request.onupgradeneeded=()=>{ // The app normally creates the database first.
    const db=request.result;
    if(!db.objectStoreNames.contains('subjects'))db.createObjectStore('subjects',{keyPath:'id'});
    if(!db.objectStoreNames.contains('lectures'))db.createObjectStore('lectures',{keyPath:'id'});
    if(!db.objectStoreNames.contains('files'))db.createObjectStore('files',{keyPath:'id'});
  };
});}
async function getLocalLecture(id){
  const db=await openDB();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction('files','readonly');
    const req=tx.objectStore('files').get(id);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('Read error'));
  });}finally{db.close();}
}
function errorDoc(message,status){
  const safe=String(message).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return new Response(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;padding:25px"><h2>تعذّر فتح المحاضرة</h2><p>${safe}</p><p>ارجع ثم اضغط «إعادة تحميل».</p></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
self.addEventListener('install',event=>{event.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(SHELL);await self.skipWaiting();})());});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(x=>x.startsWith('nursing-lectures-shell-')&&x!==CACHE).map(x=>caches.delete(x)));await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url),scope=new URL(self.registration.scope);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(scope.pathname))return;
  if(url.pathname.startsWith(LOCAL_PATH)){
    event.respondWith((async()=>{
      try{
        const id=decodeURIComponent(url.pathname.slice(LOCAL_PATH.length));
        if(!id||id.includes('/'))return errorDoc('معرّف المحاضرة غير صالح',400);
        const record=await getLocalLecture(id);
        if(!record||!(record.blob instanceof Blob)||record.blob.size!==record.size)return errorDoc('ملف المحاضرة غير موجود في التخزين المحلي',404);
        const type=record.kind==='pdf'?'application/pdf':'text/html; charset=utf-8';
        const headers={'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
        if(record.kind==='pdf'){
          headers['Accept-Ranges']='bytes';
          const range=req.headers.get('Range');
          if(range){
            const found=/^bytes=(\d*)-(\d*)$/.exec(range.trim());
            if(found){
              const size=record.blob.size;
              let start=found[1]?Number(found[1]):null;
              let end=found[2]?Number(found[2]):null;
              if(start===null&&end!==null){start=Math.max(0,size-end);end=size-1;}
              else if(start!==null&&end===null){end=size-1;}
              if(start!==null&&end!==null&&start>=0&&start<size&&end>=start){
                end=Math.min(end,size-1);
                const part=record.blob.slice(start,end+1,'application/pdf');
                headers['Content-Range']=`bytes ${start}-${end}/${size}`;
                headers['Content-Length']=String(part.size);
                return new Response(part,{status:206,headers});
              }
            }
            return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${record.blob.size}`}});
          }
        }
        return new Response(record.blob,{status:200,headers});
      }catch(e){return errorDoc('تعذرت قراءة الملف من تخزين الجهاز',503);}
    })());return;
  }
  // Offline-first shell. Never cache private user lecture documents in HTTP caches.
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(req,{ignoreSearch:true});
    if(cached)return cached;
    const pathname=url.pathname;
    if(req.mode==='navigate'&&(pathname===scope.pathname||pathname===scope.pathname+'index.html')){
      const fallback=await cache.match('./index.html');if(fallback)return fallback;
    }
    try{return await fetch(req);}catch(e){
      if(req.mode==='navigate')return (await cache.match('./index.html'))||Response.error();
      return Response.error();
    }
  })());
});
