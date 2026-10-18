export const manifest={id:'/',name:'NyX AI',short_name:'NyX',start_url:'/',scope:'/',display:'standalone',background_color:'#050505',theme_color:'#050505',description:'NyX AI assistant',icons:[{src:'/nyx-app-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]};
export const serviceWorker=`
const CACHE='nyx-public-static-v1';
const PUBLIC=['/nyx-app-icon.svg','/manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PUBLIC))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('nyx-public-static-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 // Never cache authenticated pages, conversations, APIs, downloads or OAuth responses.
 if(PUBLIC.includes(url.pathname)&&!url.search){event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));return;}
 if(request.mode==='navigate')event.respondWith(fetch(request).catch(()=>new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>NyX offline</title><body><h1>NyX is offline</h1><p>Reconnect to use your assistant. Private conversations are not cached by the app.</p><a href="/">Try again</a></body></html>',{status:503,headers:{'Content-Type':'text/html','Cache-Control':'no-store'}})));
});
`;
export function pwaResponse(request,brand) {
 const path=new URL(request.url).pathname;if(request.method!=='GET')return null;
 const headers={'X-Content-Type-Options':'nosniff'};
 if(path==='/manifest.webmanifest')return Response.json(manifest,{headers:{...headers,'Content-Type':'application/manifest+json','Cache-Control':'public,max-age=3600'}});
 if(path==='/sw.js')return new Response(serviceWorker,{headers:{...headers,'Content-Type':'application/javascript','Cache-Control':'no-cache','Service-Worker-Allowed':'/'}});
 if(path==='/nyx-app-icon.svg')return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#050505"/><image href="data:image/webp;base64,'+brand+'" x="36" y="156" width="440" height="200"/></svg>',{headers:{...headers,'Content-Type':'image/svg+xml','Cache-Control':'public,max-age=3600'}});
 return null;
}

export function installPWA() {
 if(!('serviceWorker' in navigator))return;
 const link=document.createElement('link');link.rel='manifest';link.href='/manifest.webmanifest';document.head.append(link);
 const host=document.querySelector('.sidebottom');if(!host)return;
 const add=(label,action)=>{const b=document.createElement('button');b.type='button';b.className='sidebtn';b.textContent=label;b.onclick=action;host.append(b);return b;};
 let installEvent;
 const install=add('Install NyX',async()=>{
  if(installEvent){await installEvent.prompt();installEvent=null;install.hidden=true;}
  else alert('Use your browser menu → Add to Home screen or Install app. Installation support depends on your browser.');
 });
 if(matchMedia('(display-mode: standalone)').matches)install.hidden=true;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;install.hidden=false;});
 const hadController=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{
  const offer=()=>{if(!reg.waiting)return;add('Update NyX',()=>{if(window.nyxIsGenerating){alert('Stop generation before updating.');return;}reg.waiting.postMessage('ACTIVATE_UPDATE');});};
  offer();reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',offer);});
  let reloaded=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController&&!reloaded&&navigator.serviceWorker.controller){reloaded=true;if(!window.nyxIsGenerating)location.reload();}});
 }).catch(()=>{install.title='Automatic installation unavailable. Try your browser menu.';});
}
