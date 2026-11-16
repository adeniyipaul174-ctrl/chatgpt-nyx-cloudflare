/* Inside NyX active chat script: no new global APIs, existing IndexedDB media store. */
async function nxSiteOpen(message){
 let data=message.siteId?await findBlob(message.siteId):null;
 if(!data){notify('This website file is not stored on this device. Generate or revise it again.');return}
 const html=await data.text();
 const overlay=document.createElement('section');overlay.className='nx-site-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Website preview');
 const toolbar=document.createElement('div');toolbar.className='nx-site-toolbar';
 const left=document.createElement('div');left.className='nx-site-toolbar-left';
 const emblem=document.createElement('span');emblem.className='nx-site-card-icon';emblem.textContent='✳';
 const names=document.createElement('div');const title=document.createElement('strong');title.textContent=message.siteSpec?.brand||'Your new website';
 const caption=document.createElement('small');caption.textContent='NyX Site Studio · Live preview';names.append(title,caption);left.append(emblem,names);
 const controls=document.createElement('div');controls.className='nx-site-toolbar-right';
 const view=(label,device)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed',String(device==='desktop'));b.onclick=()=>{canvas.dataset.device=device;[desktop,phone].forEach(x=>x.setAttribute('aria-pressed',String(x===b)))};return b};
 const desktop=view('Desktop','desktop'),phone=view('Phone','phone');
 const download=document.createElement('button');download.type='button';download.textContent='↓ HTML';
 download.onclick=()=>{const url=URL.createObjectURL(data);const a=document.createElement('a');a.href=url;a.download=(message.siteSpec?.brand||'nyx-website').replace(/[^a-z0-9-]+/gi,'-').toLowerCase().slice(0,50)+'.html';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200)};
 const edit=document.createElement('button');edit.type='button';edit.textContent='✎ Revise';
 const close=document.createElement('button');close.type='button';close.className='nx-site-close';close.textContent='×';close.setAttribute('aria-label','Close website preview');
 controls.append(desktop,phone,download,edit,close);toolbar.append(left,controls);
 const canvas=document.createElement('div');canvas.className='nx-site-canvas';canvas.dataset.device='desktop';
 const frame=document.createElement('iframe');frame.className='nx-site-frame';frame.title='Website preview (scripts disabled)';
 frame.setAttribute('sandbox','');frame.setAttribute('referrerpolicy','no-referrer');frame.srcdoc=html;canvas.append(frame);
 const note=document.createElement('div');note.className='nx-site-note';note.textContent='Preview is isolated. Exported sites are static; connect real forms, payments, domains or databases separately.';
 overlay.append(toolbar,canvas,note);document.body.append(overlay);
 const previousFocus=document.activeElement;const dismiss=()=>{overlay.remove();document.removeEventListener('keydown',key);if(previousFocus?.focus)previousFocus.focus()};
 const key=e=>{if(e.key==='Escape')dismiss()};
 close.onclick=dismiss;edit.onclick=()=>{dismiss();input.value='Improve this website: ';input.focus();input.setSelectionRange(input.value.length,input.value.length)};
 document.addEventListener('keydown',key);close.focus();
}
function nxSiteAddCard(message,bubble){
 if(message.kind!=='website'||!message.siteId||bubble.querySelector('.nx-site-card'))return;
 const card=document.createElement('section');card.className='nx-site-card';
 const row=document.createElement('div');row.className='nx-site-card-head';
 const symbol=document.createElement('span');symbol.className='nx-site-card-icon';symbol.textContent='✳';
 const details=document.createElement('div');details.className='nx-site-card-text';
 const title=document.createElement('strong');title.textContent=message.siteSpec?.brand||'Your website';
 const line=document.createElement('small');line.textContent='Responsive website · Ready to preview & export';details.append(title,line);row.append(symbol,details);
 const actions=document.createElement('div');actions.className='nx-site-actions';
 const preview=document.createElement('button');preview.type='button';preview.className='nx-site-action';preview.textContent='↗ Preview website';preview.onclick=()=>nxSiteOpen(message);
 const revise=document.createElement('button');revise.type='button';revise.className='nx-site-action secondary';revise.textContent='✎ Edit design';
 revise.onclick=()=>{input.value='Improve this website: ';input.focus();input.setSelectionRange(input.value.length,input.value.length)};
 actions.append(preview,revise);card.append(row,actions);bubble.append(card);
}
function nxSiteRevisionPayload(chat,prompt){
 const recent=chat?.messages?.slice(0,-1).reverse().find(m=>m.kind==='website'&&m.siteSpec);
 if(!recent)return null;
 if(!/^(?:change|update|revise|redo|improve|refine|make|replace|adjust|add|remove|switch|modify|rework|rebuild|redesign)\b/i.test(prompt))return null;
 return recent.siteSpec;
}
