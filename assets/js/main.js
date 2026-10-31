// Core behaviour (menu, showreel, game select, form) works on its own.
// Anime.js is loaded afterwards and layered on top; if it fails or the visitor
// prefers reduced motion, the page simply stays still.

const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

let A = null;              // the Anime.js module, once loaded
let EASE, EASE_IO, EASE_BACK, EASE_TIMER;

// ---------- Mobile menu ----------
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelectorAll(".nav-links a");
const closeMenu = () => {
  document.body.classList.remove("nav-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.textContent = "Menu";
};
navToggle.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.textContent = open ? "Close" : "Menu";
});
navLinks.forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

// ---------- Highlight the nav link of the section in view ----------
const spyTargets = [document.getElementById("top")].concat(
  [...navLinks].map((a) => document.querySelector(a.getAttribute("href")))
).filter(Boolean);
const spy = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id));
  }),
  { rootMargin: "-45% 0px -50% 0px" }
);
spyTargets.forEach((s) => spy.observe(s));

// Decode text like a game title screen; plain swap without the library
function scramble(el, text) {
  if (!A) {
    el.textContent = text;
    return;
  }
  A.animate(el, {
    innerHTML: A.scrambleText({ text, chars: "A-Z0-9#%", ease: EASE, revealRate: 45 }),
  });
}

// ---------- Hero showreel: cycles through game clips ----------
const reelVideo = document.querySelector(".reel-video");
const reelCaption = document.querySelector(".reel-caption strong");
const toggleBtn = document.querySelector('[data-reel="toggle"]');
const nextBtn = document.querySelector('[data-reel="next"]');
const clips = [
  ["XANA Metaverse", "xana"],
  ["Rift Breach: Survival", "rift-breach"],
  ["Paintball Battle Arena", "paintball"],
  ["Epic War Simulator", "epic-war"],
  ["Border Patrol Police", "border-patrol"],
  ["Car Dealership Simulator", "car-dealer"],
  ["Blade Spinner Arena", "blade-spinner"],
  ["Car Thief Simulator", "car-thief"],
];
let clip = 0;
let userPaused = reduceMotion;

function setPaused(paused) {
  userPaused = paused;
  toggleBtn.textContent = paused ? "Play" : "Pause";
  toggleBtn.setAttribute("aria-pressed", String(paused));
  if (paused) reelVideo.pause();
  else reelVideo.play().catch(() => {});
}

function showClip(i) {
  clip = (i + clips.length) % clips.length;
  const [name, file] = clips[clip];
  const load = () => {
    reelVideo.src = "assets/media/" + file + ".mp4";
    reelVideo.poster = "assets/media/" + file + ".jpg";
    if (!userPaused) reelVideo.play().catch(() => {});
  };
  if (!A) {
    load();
    reelCaption.textContent = name;
    return;
  }
  A.animate(reelVideo, {
    opacity: 0, scale: 1.03, duration: 280, ease: EASE_IO,
    onComplete: () => {
      load();
      A.animate(reelVideo, { opacity: [0, 1], scale: [1.08, 1], duration: 1100, ease: EASE });
      scramble(reelCaption, name);
    },
  });
}

reelVideo.addEventListener("ended", () => showClip(clip + 1));
toggleBtn.addEventListener("click", () => setPaused(!userPaused));
nextBtn.addEventListener("click", () => showClip(clip + 1));
if (reduceMotion) setPaused(true);

// pause while scrolled away, resume if the visitor hadn't paused it
new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) reelVideo.pause();
  else if (!userPaused) reelVideo.play().catch(() => {});
}).observe(reelVideo);

// ---------- Games: list drives one shared stage on wide screens ----------
const stage = document.getElementById("stage");
const stageMedia = stage.querySelector(".stage-media");
const stageImg = stage.querySelector(".stage-img");
const stageVideo = stage.querySelector(".stage-video");
const stageInfo = stage.querySelector(".stage-info");
const stageTitle = stage.querySelector(".stage-title");
const games = [...document.querySelectorAll(".game")];
const wide = window.matchMedia("(min-width: 960px)");
let current = null;
let swapToken = 0;

function fillStage(game, withTitle) {
  const detail = game.querySelector(".game-detail");
  const link = detail.querySelector(".text-link");
  stageImg.src = game.dataset.poster;
  stageImg.alt = detail.querySelector("img").alt;
  if (withTitle) stageTitle.textContent = game.querySelector(".game-name").textContent;
  stage.querySelector(".stage-meta").textContent = detail.querySelector(".game-meta").textContent;
  stage.querySelector(".stage-desc").textContent = detail.querySelector(".game-desc").textContent;
  stage.querySelector(".stage-link").innerHTML = link ? link.outerHTML : "";

  if (game.dataset.video && !reduceMotion) {
    stageVideo.src = game.dataset.video;
    stageVideo.play().then(() => stageMedia.classList.add("playing")).catch(() => {});
  } else {
    stageVideo.removeAttribute("src");
  }
}

function select(game) {
  if (game === current) return;
  current = game;
  games.forEach((g) => {
    g.classList.toggle("active", g === game);
    g.querySelector(".game-pick").setAttribute("aria-pressed", String(g === game));
  });
  if (!wide.matches) return;

  stageMedia.classList.remove("playing");
  stageVideo.pause();
  if (!A) {
    fillStage(game, true);
    return;
  }

  const token = ++swapToken;
  A.animate([stageImg, stageInfo], {
    opacity: 0, duration: 160, ease: EASE_IO,
    onComplete: () => {
      if (token !== swapToken) return;
      fillStage(game, false);
      A.animate(stageImg, { opacity: [0, 1], scale: [1.06, 1], duration: 900, ease: EASE });
      A.animate(stageInfo, { opacity: [0, 1], duration: 200, ease: EASE });
      A.animate([...stageInfo.children].slice(1), {
        opacity: [0, 1], y: [13, 0], duration: 700, ease: EASE, delay: A.stagger(55),
      });
      scramble(stageTitle, game.querySelector(".game-name").textContent);
    },
  });
}

games.forEach((game) => {
  const pick = game.querySelector(".game-pick");
  let hoverTimer;
  pick.addEventListener("click", () => select(game));
  pick.addEventListener("focus", () => select(game));
  pick.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "mouse") return;
    hoverTimer = setTimeout(() => select(game), 120);
  });
  pick.addEventListener("pointerleave", () => clearTimeout(hoverTimer));
});
select(games[0]);
wide.addEventListener("change", () => {
  const g = current;
  current = null;
  select(g);
});

// ---------- Testimonials slideshow ----------
const carousel = (() => {
  const root = document.querySelector(".carousel");
  const slides = [...root.querySelectorAll(".slide")];
  const live = root.querySelector(".slides");
  const people = root.querySelector(".testi-people");
  const indexLabel = root.querySelector(".testi-index");
  const bar = root.querySelector(".testi-bar");
  const mark = root.querySelector(".quote-mark");
  const DURATION = 7000;
  const autoplay = !reduceMotion;
  let index = 0;
  let timer = null;
  let progress = null;
  const holds = new Set();   // reasons to pause: hover, focus, offscreen, hidden tab

  root.classList.add("is-ready");
  if (autoplay) root.classList.add("autoplay");
  live.setAttribute("aria-live", autoplay ? "off" : "polite");
  slides[0].classList.add("is-active");

  // face thumbnails double as the slide picker
  const thumbs = slides.map((slide, i) => {
    const name = slide.querySelector(".person-name").textContent;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "testi-person";
    btn.setAttribute("aria-label", "Recommendation from " + name);
    btn.innerHTML = '<img alt="" loading="lazy" src="' + slide.querySelector(".person img").getAttribute("src") + '">';
    btn.addEventListener("click", () => go(i));
    people.appendChild(btn);
    return btn;
  });

  const words = new Map();
  const wordsOf = (slide) => {
    if (!words.has(slide)) words.set(slide, A.splitText(slide.querySelector(".slide-quote p"), { words: true }).words);
    return words.get(slide);
  };

  function updateUI() {
    indexLabel.textContent = String(index + 1).padStart(2, "0");
    thumbs.forEach((t, i) => t.setAttribute("aria-current", String(i === index)));
  }

  function animateIn(slide, dir) {
    const w = wordsOf(slide);
    const person = slide.querySelector(".person");
    A.utils.set(w, { opacity: 0, y: "0.5em", filter: "blur(8px)" });
    A.animate(w, { opacity: 1, y: 0, filter: "blur(0px)", duration: 900, ease: EASE, delay: A.stagger(24, { start: 120 }) });
    A.animate(person, { opacity: [0, 1], x: [34 * dir, 0], duration: 900, ease: EASE, delay: 250 });
    A.animate(person.querySelector("img"), { scale: [0.6, 1], duration: 900, ease: EASE_BACK, delay: 250 });
    const name = person.querySelector(".person-name");
    name.dataset.name = name.dataset.name || name.textContent;   // keep the real name if a decode is cut short
    scramble(name, name.dataset.name);
    A.animate(mark, { opacity: [0, 1], rotate: [-18 * dir, 0], scale: [0.7, 1], duration: 900, ease: EASE_BACK });
  }

  function go(next, dir) {
    next = (next + slides.length) % slides.length;
    if (next === index) return;
    dir = dir || (next > index ? 1 : -1);
    const from = slides[index];
    const to = slides[next];
    index = next;
    updateUI();
    to.classList.add("is-active");

    if (!A) {
      from.classList.remove("is-active");
    } else {
      A.animate([from.querySelector(".slide-quote"), from.querySelector(".person")], {
        opacity: 0, x: -34 * dir, duration: 380, ease: EASE_IO,
        onComplete: () => {
          if (slides[index] !== from) from.classList.remove("is-active");
          A.utils.set([from.querySelector(".slide-quote"), from.querySelector(".person")], { opacity: 1, x: 0 });
        },
      });
      A.utils.set(to.querySelector(".slide-quote"), { opacity: 1, x: 0 });
      animateIn(to, dir);
    }
    restart();
  }

  // autoplay: a progress bar runs down, then the next slide plays
  function restart() {
    clearTimeout(timer);
    if (progress) progress.cancel();
    progress = null;
    if (!autoplay) return;
    if (A) {
      progress = A.animate(bar, { scaleX: [0, 1], duration: DURATION, ease: EASE_TIMER, onComplete: () => go(index + 1, 1) });
      if (holds.size) progress.pause();
    } else if (!holds.size) {
      timer = setTimeout(() => go(index + 1, 1), DURATION);
    }
  }
  function hold(reason, on) {
    if (on) holds.add(reason); else holds.delete(reason);
    if (progress) holds.size ? progress.pause() : progress.play();
    else if (!A) restart();
  }

  root.querySelectorAll(".testi-btn").forEach((b) =>
    b.addEventListener("click", () => go(index + Number(b.dataset.dir), Number(b.dataset.dir)))
  );
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(index + 1, 1);
    if (e.key === "ArrowLeft") go(index - 1, -1);
  });
  root.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && hold("hover", true));
  root.addEventListener("pointerleave", () => hold("hover", false));
  root.addEventListener("focusin", () => hold("focus", true));
  root.addEventListener("focusout", (e) => !root.contains(e.relatedTarget) && hold("focus", false));
  document.addEventListener("visibilitychange", () => hold("tab", document.hidden));
  new IntersectionObserver(([entry]) => hold("offscreen", !entry.isIntersecting), { threshold: 0.3 }).observe(root);

  // swipe on touch screens
  let startX = null;
  live.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") startX = e.clientX; });
  live.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });

  updateUI();
  hold("offscreen", true);
  return { enhance: restart };
})();

// ---------- Contact form (Formspree) ----------
const form = document.getElementById("contact-form");
const status = form.querySelector(".form-status");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  status.textContent = "Sending…";
  try {
    const res = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(res.statusText);
    form.reset();
    status.textContent = "Message sent. I'll reply within a couple of days.";
  } catch (err) {
    status.textContent = "Your message didn't send. Email me at hassansohail@live.com instead.";
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("year").textContent = new Date().getFullYear();

// =========================================================
// Motion layer (Anime.js)
// =========================================================

// Title-screen intro: the name assembles letter by letter, then the rest follows
function heroIntro() {
  const name = document.querySelector(".hero .display");
  const statement = document.querySelector(".hero-statement");
  const buttons = document.querySelectorAll(".hero-actions .btn");
  const reel = document.querySelector(".reel-screen");
  const reelBar = document.querySelector(".reel-bar");

  const { chars } = A.splitText(name, { chars: true });
  const { words } = A.splitText(statement, { words: true });
  A.utils.set(chars, { opacity: 0, y: "0.5em", rotate: () => A.utils.random(-14, 14) });
  A.utils.set(words, { opacity: 0, y: 21 });
  A.utils.set(buttons, { opacity: 0, y: 21, scale: 0.9 });
  A.utils.set(reel, { clipPath: "inset(0% 0% 100% 0%)" });
  A.utils.set(reelBar, { opacity: 0 });
  root.classList.add("anime");   // hands the hero over from the CSS fallback

  A.createTimeline({ defaults: { ease: EASE } })
    .add(chars, { opacity: 1, y: 0, rotate: 0, duration: 1000, delay: A.stagger(34) })
    .add(words, { opacity: 1, y: 0, duration: 800, delay: A.stagger(21) }, "-=700")
    .add(buttons, { opacity: 1, y: 0, scale: 1, duration: 800, ease: EASE_BACK, delay: A.stagger(89) }, "-=600")
    .add(reel, { clipPath: "inset(0% 0% 0% 0%)", duration: 1300, ease: EASE_IO }, "-=700")
    .add(reelBar, { opacity: 1, duration: 600 }, "-=500")
    .call(() => scramble(reelCaption, reelCaption.textContent));
}

// Scroll reveals: headings rise word by word, blocks fade up in a stagger
function scrollReveals() {
  const headings = [...document.querySelectorAll("section:not(.hero) h2")];
  const blocks = [...document.querySelectorAll(
    ".section-intro p, .stage, .game-list > *, .job, .about-main > :not(h2), .about-portrait, " +
    ".toolkit, .carousel, .contact-intro, .contact-email, .contact-links, .form"
  )];
  const fromSide = new Set(document.querySelectorAll(".game-list > *"));

  const headingWords = new Map();
  headings.forEach((h) => {
    const { words } = A.splitText(h, { words: true });
    A.utils.set(words, { opacity: 0, y: "0.6em" });
    headingWords.set(h, words);
  });
  blocks.forEach((el) => A.utils.set(el, fromSide.has(el) ? { opacity: 0, x: -21 } : { opacity: 0, y: 34 }));

  const io = new IntersectionObserver((entries) => {
    let i = 0;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      io.unobserve(el);
      if (headingWords.has(el)) {
        A.animate(headingWords.get(el), { opacity: 1, y: 0, duration: 1000, ease: EASE, delay: A.stagger(55) });
      } else {
        A.animate(el, { opacity: 1, x: 0, y: 0, duration: 1000, ease: EASE, delay: i++ * 89 });
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
  headings.concat(blocks).forEach((el) => io.observe(el));
}

// Magnetic buttons: they lean toward the pointer and spring back
function magneticButtons() {
  document.querySelectorAll(".btn, .reel-btn").forEach((el) => {
    const pos = A.createAnimatable(el, { x: 500, y: 500, ease: EASE });
    const limit = (v) => Math.max(-10, Math.min(10, v));
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      pos.x(limit((e.clientX - (r.left + r.width / 2)) * 0.3));
      pos.y(limit((e.clientY - (r.top + r.height / 2)) * 0.3));
    });
    el.addEventListener("pointerleave", () => {
      pos.x(0, 900, EASE_BACK);
      pos.y(0, 900, EASE_BACK);
    });
  });
}

if (!reduceMotion) {
  try {
    A = await import("../vendor/anime.esm.min.js");
    EASE = A.cubicBezier(0.16, 1, 0.3, 1);       // fast out, long settle
    EASE_IO = A.cubicBezier(0.65, 0, 0.35, 1);   // symmetric in-out
    EASE_BACK = A.cubicBezier(0.34, 1.56, 0.64, 1); // slight overshoot
    EASE_TIMER = A.cubicBezier(0.45, 0, 0.55, 1);   // gentle, for the slideshow timer
    heroIntro();
    scrollReveals();
    if (finePointer) magneticButtons();
    carousel.enhance();
  } catch (err) {
    A = null;   // the CSS fallback keeps the page readable
  }
}
