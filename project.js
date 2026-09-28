/* project.js — shared behaviour for the case-study pages.
   Theme toggle, scroll reveals, masked heading reveals, hero-title scatter, image carousel,
   light/dark compare slider, scroll progress, magnetic buttons. All reduced-motion-safe.
   The 3D world is a separate module: assets/js/world.js + assets/js/scenes/<page>.js */
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

  /* split headings into masked words */
  function splitHeads(){
    Array.prototype.slice.call(document.querySelectorAll(".split")).forEach(function(el){
      var i = 0;
      (function walk(node){
        Array.prototype.slice.call(node.childNodes).forEach(function(c){
          if(c.nodeType === 3){
            var frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach(function(part){
              if(!part) return;
              if(/^\s+$/.test(part)){ frag.appendChild(document.createTextNode(part)); return; }
              var w = document.createElement("span"); w.className = "w";
              var wi = document.createElement("span"); wi.className = "wi";
              wi.style.setProperty("--i", i++); wi.textContent = part;
              w.appendChild(wi); frag.appendChild(w);
            });
            node.replaceChild(frag, c);
          } else if(c.nodeType === 1 && c.tagName !== "BR"){ walk(c); }
        });
      })(el);
    });
  }

  /* hero title: letters scatter in depth as the hero scrolls away */
  function titleScatter(){
    var el = document.querySelector(".ptitle"); if(!el) return;
    var label = el.textContent.trim();
    el.textContent = "";
    // the full title stays real heading text for assistive tech; the animated letters are decorative
    var sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = label; el.appendChild(sr);
    label.split(" ").forEach(function(word, wi){
      var w = document.createElement("span"); w.className = "word"; w.setAttribute("aria-hidden", "true");
      word.split("").forEach(function(ch){
        var o = document.createElement("span"); o.className = "lw";
        o.style.setProperty("--dx", ((Math.random() - .5) * 260).toFixed(1));
        o.style.setProperty("--dy", ((Math.random() - .5) * 180).toFixed(1));
        o.style.setProperty("--dz", (120 + Math.random() * 520).toFixed(1));
        o.style.setProperty("--rx", ((Math.random() - .5) * 140).toFixed(1));
        o.style.setProperty("--ry", ((Math.random() - .5) * 140).toFixed(1));
        o.textContent = ch; w.appendChild(o);
      });
      el.appendChild(w);
      if(wi < label.split(" ").length - 1) el.appendChild(document.createTextNode(" "));
    });
    if(RM) return;
    var hero = document.querySelector(".phero"), ticking = false;
    function update(){
      var h = hero ? hero.offsetHeight : window.innerHeight;
      var p = Math.min(1, Math.max(0, (window.pageYOffset || 0) / Math.max(1, h * 0.9)));
      el.style.setProperty("--sp", p.toFixed(3)); ticking = false;
    }
    window.addEventListener("scroll", function(){ if(!ticking){ ticking = true; requestAnimationFrame(update); } }, { passive:true });
    update();
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
        // scroll the strip only: scrollIntoView would also nudge the page, and page scroll drives the 3D camera
        var sl = slides[index];
        vp.scrollTo({ left: sl.offsetLeft - (vp.clientWidth - sl.offsetWidth) / 2, behavior: RM ? "auto" : "smooth" });
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

  /* light/dark image comparison slider — drag the divider (starts centered) to
     reveal the light theme on one side and the dark theme on the other. */
  function compare(){
    Array.prototype.slice.call(document.querySelectorAll("[data-compare]")).forEach(function(c){
      var handle = c.querySelector(".compare__handle"); if(!handle) return;
      var dragging = false;
      function set(pct){ pct = pct < 0 ? 0 : pct > 100 ? 100 : pct;
        c.style.setProperty("--pos", pct.toFixed(2) + "%"); handle.setAttribute("aria-valuenow", Math.round(pct)); }
      function at(e){ var r = c.getBoundingClientRect(); if(r.width) set((e.clientX - r.left) / r.width * 100); }
      c.addEventListener("pointerdown", function(e){
        dragging = true; try { c.setPointerCapture(e.pointerId); } catch(_){}
        at(e); handle.focus(); e.preventDefault();
      });
      c.addEventListener("pointermove", function(e){ if(dragging) at(e); });
      function end(){ dragging = false; }
      c.addEventListener("pointerup", end);
      c.addEventListener("pointercancel", end);
      handle.addEventListener("keydown", function(e){
        var cur = parseFloat(c.style.getPropertyValue("--pos")) || 50, step = e.shiftKey ? 10 : 2, k = e.key;
        if(k === "ArrowLeft" || k === "ArrowDown") set(cur - step);
        else if(k === "ArrowRight" || k === "ArrowUp") set(cur + step);
        else if(k === "Home") set(0);
        else if(k === "End") set(100);
        else return;
        e.preventDefault();
      });
    });
  }

  theme(); titleScatter(); splitHeads(); reveals(); scrollProgress(); magnetic(); carousel(); compare();
  window.__projectReady = true; // the page's head script un-hides content if this never runs
})();
