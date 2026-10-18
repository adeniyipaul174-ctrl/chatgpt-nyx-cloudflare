export function installNextGen() {
  const $=id=>document.getElementById(id), form=$('composer')||$('prompt')?.closest('form');
  if (!form) return;
  const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className='nx-next-action';b.onclick=fn;return b;};
  const style=document.createElement('style');
  style.textContent='.nx-next-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.nx-next-action{color:inherit;background:transparent;border:1px solid #555;border-radius:10px;padding:6px 9px;font:inherit;font-size:12px;min-height:36px}.nx-next-actions details{font-size:12px}.nx-next-actions summary{cursor:pointer;padding:8px}.nx-next-action:focus-visible{outline:2px solid #a8baff}';
  document.head.append(style);
  const previousRender=render;
  function fork(chat,end){
    const copy={id:uid(),title:chat.title+' (branch)',messages:chat.messages.slice(0,end).map(m=>({...m}))};
    chats.unshift(copy);current=copy.id;persist();render();return copy;
  }
  render=function(){
    previousRender();
    const chat=chats.find(c=>c.id===current);if(!chat)return;
    document.querySelectorAll('#messages .bubble').forEach((node,index)=>{
      const message=chat.messages[index];if(!message||node.querySelector('.nx-next-actions'))return;
      const row=document.createElement('div');row.className='nx-next-actions';
      const more=document.createElement('details'), label=document.createElement('summary');label.textContent='Message actions';more.append(label);row.append(more);
      const guard=fn=>()=>{if(window.nyxIsGenerating||$('send')?.disabled){alert('Stop or finish the current answer first.');return;}fn();};
      more.append(button('Branch here',guard(()=>fork(chat,index+1))));
      if(message.role==='user')more.append(button('Edit and resubmit',guard(()=>{
        if(/\[Attached:/.test(message.content)){alert('Reattach the file when editing this message.');}
        const edited=prompt('Edit your message. The original conversation will be kept.',message.content);
        if(!edited?.trim())return;
        fork(chat,index);$('prompt').value=edited;form.requestSubmit();
      })));
      if(message.role==='assistant') {
        for(const file of message.generatedFiles||[]){
          if(file.type!=='application/json'||typeof file.content!=='string'||file.content.length>100000)continue;
          more.append(button('Download statistics',()=>{const url=URL.createObjectURL(new Blob([file.content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='nyx-statistics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}));
        }
        more.append(button('Regenerate',guard(()=>{
          const prior=chat.messages[index-1];if(prior?.role!=='user')return;
          if(/\[Attached:/.test(prior.content)){alert('Please reattach the original document or image before regenerating.');return;}
          fork(chat,index-1);$('prompt').value=prior.content;form.requestSubmit();
        })));
        more.append(button('Copy formatted',async()=>{
          try {
            const html=node.querySelector('.nx-ui4-md')?.innerHTML;
            if(html&&window.ClipboardItem)await navigator.clipboard.write([new ClipboardItem({'text/plain':new Blob([message.content],{type:'text/plain'}),'text/html':new Blob([html],{type:'text/html'})})]);
            else await navigator.clipboard.writeText(message.content);
          }catch{alert('Clipboard access is unavailable.');}
        }));
        if('speechSynthesis' in window)more.append(button('Read aloud',()=>{
          speechSynthesis.cancel();
          const utterance=new SpeechSynthesisUtterance(message.content.slice(0,20000));
          const local=speechSynthesis.getVoices().find(v=>v.localService&&v.lang.startsWith((navigator.language||'en').split('-')[0]));
          if(!local&&!confirm('Your browser may send this text to its speech service. Continue?'))return;
          if(local)utterance.voice=local;
          utterance.lang=navigator.language||'en-US';speechSynthesis.speak(utterance);
        }));
        if(message.status==='partial')row.append(document.createTextNode('Partial answer — interrupted'));
      }
      node.append(row);
    });
  };
  if('speechSynthesis' in window){
    const controls=document.createElement('div');controls.className='nx-next-actions';
    controls.append(button('Pause / resume voice',()=>speechSynthesis.paused?speechSynthesis.resume():speechSynthesis.pause()),button('Stop voice',()=>speechSynthesis.cancel()));
    form.append(controls);window.addEventListener('pagehide',()=>speechSynthesis.cancel());
  }
  // Existing dictation remains the only microphone path. Clarify browser processing before it starts.
  const mic=document.querySelector('#nxMic');
  if(mic)mic.addEventListener('click',event=>{
    if(!confirm('Dictation uses your browser speech service, which may send audio to its provider. NyX receives only the transcript. Start microphone?')){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  render();
}
