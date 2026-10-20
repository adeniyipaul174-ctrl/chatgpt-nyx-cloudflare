  // Background jobs reuse the exact same compact source-icon search UI.
  window.nyxSearchVisuals={
    hidden:false,
    begin(){this.hidden=false;progress.finished=false;},
    update(event){
      if(this.hidden||!event||!event.stage)return;
      if(!["starting","searching","reading","answering"].includes(event.stage))return;
      progress.finished=false;
      stage(event);
      if(Array.isArray(event.sources)&&event.sources.length)sites({results:event.sources});
      if(progress.skip){
        progress.skip.textContent="Hide";
        progress.skip.title="Hide progress while NyX finishes in the background";
        progress.skip.onclick=()=>{
          this.hidden=true;
          const bubble=progress.bubble;
          release();
          if(bubble){bubble.classList.remove("nx-ui4-searching");bubble.textContent="Working in background…"}
        };
      }
    },
    complete(){release()}
  };
