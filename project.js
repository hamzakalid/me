/* project.js — shared behaviour for the case-study pages.
   Theme toggle, canvas neural background, scroll reveals, image carousel,
   scroll progress, magnetic buttons. All reduced-motion-safe. */
(function(){
  "use strict";
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  /* theme toggle (the no-flash setter runs inline in each page head) */
  function theme(){
    var root = document.documentElement, btn = document.getElementById("themeToggle"), meta = document.getElementById("metaTheme");
    var COL = { light:"#EEF1F6", dark:"#0A0E19" };
    function apply(t){
      root.setAttribute("data-theme", t);
      if(meta) meta.setAttribute("content", COL[t] || COL.light);
      if(btn) btn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
    apply(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    if(btn) btn.addEventListener("click", function(){
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      try { localStorage.setItem("theme", next); } catch(e){}
      apply(next);
    });
  }

  /* neural-network canvas background (matches the homepage) */
  function buildBackground(){
    var host = document.getElementById("bg");
    var canvas = host && host.querySelector("canvas");
    if(!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d"); if(!ctx) return;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var W = 1, H = 1, nodes = [], connect = 150, c2 = connect*connect, glow = true, raf = 0, running = false, sY = 0;
    var palette = pal();
    function pal(){
      return document.documentElement.getAttribute("data-theme") === "dark"
        ? { dot:[168,184,255], line:[120,140,255] } : { dot:[31,52,200], line:[39,64,230] };
    }
    function size(){
      W = host.clientWidth || window.innerWidth; H = host.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.round(W*DPR)); canvas.height = Math.max(1, Math.round(H*DPR));
      canvas.style.width = W+"px"; canvas.style.height = H+"px";
      ctx.setTransform(DPR,0,0,DPR,0,0);
      connect = W < 700 ? 116 : 150; c2 = connect*connect; glow = W >= 700; seed();
    }
    function seed(){
      var count = Math.max(30, Math.min(W < 700 ? 60 : 104, Math.round((W*H)/15500)));
      nodes = [];
      for(var i=0;i<count;i++){
        var depth = 0.3 + Math.random()*0.85;
        nodes.push({ x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-0.5)*0.16, vy:(Math.random()-0.5)*0.16,
          depth:depth, pulse: Math.random()<0.09 ? Math.random()*6.283 : -1 });
      }
    }
    function wrap(v,l){ v%=l; return v<0?v+l:v; }
    function render(motion){
      sY = motion ? (window.pageYOffset || document.documentElement.scrollTop || 0) : 0;
      ctx.clearRect(0,0,W,H);
      var i,j,n;
      for(i=0;i<nodes.length;i++){ n=nodes[i];
        if(motion){ n.x=wrap(n.x+n.vx,W); n.y=wrap(n.y+n.vy,H); }
        n.px = wrap(n.x, W); n.py = wrap(n.y - sY*0.16*n.depth, H);
      }
      var lc=palette.line; ctx.lineWidth=1;
      for(i=0;i<nodes.length;i++){ var a=nodes[i];
        for(j=i+1;j<nodes.length;j++){ var b=nodes[j];
          var dx=a.px-b.px, dy=a.py-b.py; if(dx<-connect||dx>connect||dy<-connect||dy>connect) continue;
          var d2=dx*dx+dy*dy;
          if(d2<c2){ var op=(1-Math.sqrt(d2)/connect)*0.5*((a.depth+b.depth)*0.5);
            ctx.strokeStyle="rgba("+lc[0]+","+lc[1]+","+lc[2]+","+op.toFixed(3)+")";
            ctx.beginPath(); ctx.moveTo(a.px,a.py); ctx.lineTo(b.px,b.py); ctx.stroke(); } } }
      var dc=palette.dot, t = motion ? performance.now()*0.001 : 0;
      for(i=0;i<nodes.length;i++){ n=nodes[i]; var r=1.1+n.depth*1.5, o=0.3+n.depth*0.35;
        if(motion && n.pulse>=0){ var pp=(Math.sin(t*1.3+n.pulse)+1)*0.5; r+=pp*1.8; o=Math.min(0.95,o+pp*0.4);
          if(glow){ ctx.shadowColor="rgba("+dc[0]+","+dc[1]+","+dc[2]+",0.85)"; ctx.shadowBlur=8+pp*12; } }
        else if(glow){ ctx.shadowBlur=0; }
        ctx.fillStyle="rgba("+dc[0]+","+dc[1]+","+dc[2]+","+o.toFixed(3)+")";
        ctx.beginPath(); ctx.arc(n.px,n.py,r,0,6.283); ctx.fill(); }
      if(glow) ctx.shadowBlur=0;
    }
    function loop(){ render(true); raf=requestAnimationFrame(loop); }
    function start(){ if(!running){ running=true; raf=requestAnimationFrame(loop); } }
    function stop(){ running=false; if(raf){ cancelAnimationFrame(raf); raf=0; } }
    size();
    if(RM){ render(false); } else {
      start();
      document.addEventListener("visibilitychange", function(){ if(document.hidden) stop(); else start(); });
    }
    var rt; window.addEventListener("resize", function(){ clearTimeout(rt); rt=setTimeout(function(){ size(); if(RM) render(false); }, 180); });
    if(window.MutationObserver){ new MutationObserver(function(){ palette=pal(); if(RM) render(false); })
      .observe(document.documentElement, { attributes:true, attributeFilter:["data-theme"] }); }
  }

  function reveals(){
    var items = document.querySelectorAll(".reveal");
    if(RM || !("IntersectionObserver" in window)){ items.forEach(function(it){ it.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          var sibs = Array.prototype.slice.call(e.target.parentNode.querySelectorAll(":scope > .reveal"));
          e.target.style.transitionDelay = (Math.max(0, sibs.indexOf(e.target))*0.06).toFixed(2)+"s";
          e.target.classList.add("in"); io.unobserve(e.target);
        }
      });
    }, { threshold:0.16, rootMargin:"0px 0px -8% 0px" });
    items.forEach(function(it){ io.observe(it); });
  }

  function scrollProgress(){
    var p = document.getElementById("progress"); if(!p) return;
    var ticking = false;
    function update(){
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      p.style.width = (docH > 0 ? (y/docH*100) : 0) + "%"; ticking = false;
    }
    window.addEventListener("scroll", function(){ if(!ticking){ ticking=true; requestAnimationFrame(update); } }, { passive:true });
    window.addEventListener("resize", update); update();
  }

  function magnetic(){
    if(RM || !FINE) return;
    Array.prototype.slice.call(document.querySelectorAll("[data-magnetic]")).forEach(function(el){
      var s = parseFloat(el.getAttribute("data-magnetic")) || 0.25;
      el.addEventListener("pointermove", function(e){
        var r = el.getBoundingClientRect();
        el.style.transform = "translate(" + ((e.clientX-(r.left+r.width/2))*s).toFixed(1) + "px," + ((e.clientY-(r.top+r.height/2))*s).toFixed(1) + "px)";
      });
      el.addEventListener("pointerleave", function(){ el.style.transform = ""; });
    });
  }

  function carousel(){
    Array.prototype.slice.call(document.querySelectorAll("[data-gallery]")).forEach(function(g){
      var vp = g.querySelector(".gallery__viewport");
      var slides = Array.prototype.slice.call(g.querySelectorAll(".slide"));
      var dotsWrap = g.querySelector(".gallery__dots"), prev = g.querySelector(".g-prev"), next = g.querySelector(".g-next");
      if(!vp || slides.length < 2) return;
      var index = 0, timer = null, inView = false, paused = false, ticking = false;
      var dots = slides.map(function(_, i){
        var d = document.createElement("button"); d.type="button"; d.className="g-dot";
        d.setAttribute("aria-label","Go to image "+(i+1));
        d.addEventListener("click", function(){ go(i, true); }); dotsWrap.appendChild(d); return d;
      });
      function clamp(i){ return (i % slides.length + slides.length) % slides.length; }
      function go(i, user){ index = clamp(i);
        slides[index].scrollIntoView({ behavior: RM ? "auto":"smooth", inline:"center", block:"nearest" });
        if(user) restart(); }
      function paint(){
        var mid = vp.scrollLeft + vp.clientWidth/2, best=0, bd=Infinity;
        for(var i=0;i<slides.length;i++){
          var center = slides[i].offsetLeft + slides[i].offsetWidth/2, dist = Math.abs(center-mid);
          if(dist<bd){ bd=dist; best=i; }
          if(!RM){ var art=slides[i].firstElementChild; if(art){ var k=Math.min(1,dist/(vp.clientWidth||1));
            art.style.transform="scale("+(1-k*0.14).toFixed(3)+")"; art.style.opacity=(1-k*0.5).toFixed(3); } }
        }
        index=best; for(var j=0;j<dots.length;j++){ dots[j].classList.toggle("active", j===index); } ticking=false;
      }
      function schedule(){ if(!ticking){ ticking=true; requestAnimationFrame(paint); } }
      vp.addEventListener("scroll", schedule, { passive:true });
      if(prev) prev.addEventListener("click", function(){ go(index-1, true); });
      if(next) next.addEventListener("click", function(){ go(index+1, true); });
      function adv(){ if(inView && !paused) go(index+1, false); }
      function start(){ if(RM || timer) return; timer=setInterval(adv, 4800); }
      function stop(){ if(timer){ clearInterval(timer); timer=null; } }
      function restart(){ stop(); start(); }
      ["pointerenter","focusin"].forEach(function(ev){ g.addEventListener(ev, function(){ paused=true; }); });
      ["pointerleave","focusout"].forEach(function(ev){ g.addEventListener(ev, function(){ paused=false; }); });
      if("IntersectionObserver" in window){
        new IntersectionObserver(function(es){ es.forEach(function(e){ inView=e.isIntersecting; }); if(inView) start(); else stop(); }, { threshold:0.4 }).observe(g);
      } else { inView=true; start(); }
      paint(); window.addEventListener("resize", schedule); window.addEventListener("load", paint);
    });
  }

  theme(); buildBackground(); reveals(); scrollProgress(); magnetic(); carousel();
})();
