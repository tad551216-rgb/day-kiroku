/* つくる手帖 ── キャッシュはオリジン単位で共有されます。
   github.io は全リポジトリが同じオリジンなので、
   自分の名前空間（TT_NS）のものだけを消します。 */
const TT_NS = 'tt:day-kiroku:';
const TT_OLD = 'day-kiroku-v19';   /* 旧名。次の更新のときに消して構いません */
const CACHE = TT_NS + 'v19';
const ASSETS = ['./','./index.html','./manifest.json','./qrcode.js','./jsQR.js','./icon-192.png','./icon-512.png','./icon-180.png'];

/* 入れておく。1つ失敗しても、ほかは入れる */
self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.all(ASSETS.map(a=>c.add(a).catch(()=>null))))
      .then(()=>self.skipWaiting())
  );
});

/* 古い控えを片づける */
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k => (k.startsWith(TT_NS) || k === TT_OLD) && k !== CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const isPage = req.mode==='navigate' ||
    (req.headers.get('accept')||'').indexOf('text/html')>=0;

  if(isPage){
    /* 画面そのものは、まず新しいものを取りに行く（古い画面が残らないように） */
    e.respondWith(
      fetch(req).then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
        return res;
      }).catch(()=>
        caches.match(req)
          .then(hit=>hit||caches.match('./index.html'))
          .then(hit=>hit||new Response(
            '<!DOCTYPE html><meta charset="utf-8"><body style="font-family:-apple-system,sans-serif;padding:24px;line-height:1.9">'+
            '<h2>いま開けませんでした</h2><p>電波の届くところで、もう一度お試しください。</p></body>',
            {headers:{'Content-Type':'text/html; charset=utf-8'}}))
      )
    );
    return;
  }

  /* 絵や部品は、控えがあればそれを使う */
  e.respondWith(
    caches.match(req).then(hit=>hit||fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
      return res;
    }).catch(()=>new Response('', {status:504})))
  );
});
