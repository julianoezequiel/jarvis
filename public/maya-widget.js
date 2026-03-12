/**
 * maya-widget.js — Maya Widget Embed Loader (distributable)
 *
 * Compiled from embed/script.ts. Serve via CDN or include directly.
 *
 * Usage:
 *   <script
 *     src="https://maya.yourdomain.com/maya-widget.js"
 *     data-token="sk-..."
 *     data-position="right"
 *     data-theme="#00d4ff"
 *   ></script>
 *
 * Public API:
 *   window.__maya.enrollVoice(name, userId?)   — open enrollment modal for a user
 *   window.__maya.open()                        — open widget programmatically
 *   window.__maya.on('enroll-complete', fn)     — subscribe to enrollment results
 *   window.__maya.on('open-change', fn)         — subscribe to open/close events
 *   window.__maya.off(event, fn)               — unsubscribe
 */
;(function(){'use strict';
  var ORB_SIZE=120,SIDEBAR_W=420,IFRAME_ID='maya-widget-iframe';
  function findScript(){
    var s=document.querySelector('script[data-token]');
    if(s)return s;
    var all=Array.from(document.querySelectorAll('script[src]'));
    return all.find(function(el){return el.src.indexOf('maya-widget')!==-1;})||null;
  }
  var scriptEl=findScript();
  var scriptSrc=scriptEl&&scriptEl.src||'';
  var baseUrl=scriptSrc?(new URL(scriptSrc)).origin:window.location.origin;
  var token=scriptEl&&scriptEl.getAttribute('data-token')||'';
  var position=scriptEl&&scriptEl.getAttribute('data-position')||'right';
  var theme=scriptEl&&scriptEl.getAttribute('data-theme')||'#00d4ff';
  var params=new URLSearchParams({position:position,theme:theme});
  if(token)params.set('token',token);
  var src=baseUrl+'/embed?'+params.toString();
  var iframe=document.createElement('iframe');
  iframe.id=IFRAME_ID;
  iframe.src=src;
  iframe.setAttribute('aria-label','Maya AI Widget');
  iframe.setAttribute('title','Maya AI Widget');
  iframe.allow='microphone; autoplay; clipboard-write';
  iframe.setAttribute('scrolling','no');
  var isLeft=position==='left'||position==='bottom-left';
  var st=iframe.style;
  st.position='fixed';st.bottom='0';st.border='none';st.background='transparent';
  st.zIndex='2147483640';st.overflow='hidden';st.colorScheme='normal';
  st.transition='width 0.25s ease,height 0.25s ease';
  st.width=ORB_SIZE+'px';st.height=ORB_SIZE+'px';
  if(isLeft){st.left='0';}else{st.right='0';}
  (document.body||document.documentElement).appendChild(iframe);
  var handlers={};
  function fire(ev,detail){
    var fns=handlers[ev];
    if(!fns)return;
    for(var i=0;i<fns.length;i++){try{fns[i](detail);}catch(e){}}
  }
  window.addEventListener('message',function(e){
    if(e.source!==iframe.contentWindow)return;
    if(!e.data||typeof e.data.type!=='string')return;
    var t=e.data.type;
    if(t==='widget:open-change'){
      var open=!!e.data.isOpen;
      if(open){
        var vh=document.documentElement.clientHeight;
        st.width=SIDEBAR_W+'px';st.height=vh+'px';st.bottom='0';st.top='auto';
      } else {
        st.width=ORB_SIZE+'px';st.height=ORB_SIZE+'px';
      }
      fire('open-change',{isOpen:open});
    } else if(t==='maya:enroll-complete'){
      fire('enroll-complete',e.data);
    }
  });
  window.__maya={
    enrollVoice:function(name,userId){
      iframe.contentWindow&&iframe.contentWindow.postMessage({type:'maya:enroll-voice',name:name,userId:userId},baseUrl);
    },
    open:function(){
      iframe.contentWindow&&iframe.contentWindow.postMessage({type:'maya:open'},baseUrl);
    },
    close:function(){
      iframe.contentWindow&&iframe.contentWindow.postMessage({type:'maya:close'},baseUrl);
    },
    on:function(ev,fn){
      if(!handlers[ev])handlers[ev]=[];
      handlers[ev].push(fn);
    },
    off:function(ev,fn){
      if(!handlers[ev])return;
      handlers[ev]=handlers[ev].filter(function(f){return f!==fn;});
    }
  };
})();
