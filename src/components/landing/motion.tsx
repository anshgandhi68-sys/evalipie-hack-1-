"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// One shared requestAnimationFrame loop for every scroll/ambient effect.
// When motion is paused (or prefers-reduced-motion), the loop stops and
// callbacks only run once per scroll/resize so the page stays usable.
// ============================================================
type FrameCb = (t: number) => void;
const callbacks = new Set<FrameCb>();
let rafId = 0;
let running = false;
let paused = false;
const pauseListeners = new Set<(p: boolean) => void>();

function tick(t: number) {
  callbacks.forEach((cb) => cb(t));
  if (running) rafId = requestAnimationFrame(tick);
}
function start() {
  if (running || paused) return;
  running = true;
  rafId = requestAnimationFrame(tick);
}
function stop() {
  running = false;
  cancelAnimationFrame(rafId);
}
function runOnce() {
  if (!running) requestAnimationFrame((t) => callbacks.forEach((cb) => cb(t)));
}

export function isMotionPaused() {
  return paused;
}

export function setMotionPaused(p: boolean) {
  paused = p;
  document.body.classList.toggle("motion-paused", p);
  if (p) {
    stop();
    runOnce();
  } else start();
  pauseListeners.forEach((l) => l(p));
}

/** Register a per-frame callback. The callback is read from a ref, so it can close over fresh values. */
export function useFrame(cb: FrameCb) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const fn: FrameCb = (t) => ref.current(t);
    callbacks.add(fn);
    runOnce();
    return () => {
      callbacks.delete(fn);
    };
  }, []);
}

export function useMotionPaused() {
  const [p, setP] = useState(false);
  useEffect(() => {
    setP(paused);
    pauseListeners.add(setP);
    return () => {
      pauseListeners.delete(setP);
    };
  }, []);
  return p;
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
/** 0 when the element's top hits the viewport top, 1 when its bottom hits the viewport bottom. */
export function sectionProgress(el: Element) {
  const r = el.getBoundingClientRect();
  const span = r.height - window.innerHeight;
  return span <= 0 ? clamp01(-r.top / Math.max(1, r.height)) : clamp01(-r.top / span);
}

// ============================================================
// Global chrome: motion bootstrap, reveal-on-enter, progress bar, nav state
// ============================================================
export function MotionRoot() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setMotionPaused(true);
    else start();

    const onScroll = () => {
      if (!running) runOnce();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // data-reveal → fade up 24px on enter
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.body.classList.remove("motion-paused");
    };
  }, []);

  useFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  });

  return <div ref={bar} className="fixed left-0 top-0 z-[80] h-[2px] w-full origin-left bg-cobalt" style={{ transform: "scaleX(0)" }} aria-hidden />;
}

export function useScrolledPast(px: number) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const on = () => setPast(window.scrollY > px);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [px]);
  return past;
}

// ============================================================
// Pause motion pill
// ============================================================
export function PauseMotionPill() {
  const p = useMotionPaused();
  return (
    <button
      onClick={() => setMotionPaused(!p)}
      className="fixed bottom-5 right-5 z-[70] flex items-center gap-2 rounded-full border border-hair bg-paper/90 px-4 py-2 text-xs font-medium text-ink shadow-[0_8px_30px_-12px_rgba(27,29,34,.35)] backdrop-blur-md transition hover:bg-panel"
      aria-pressed={p}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${p ? "bg-muted" : "bg-cobalt"}`} />
      {p ? "Resume motion" : "Pause motion"}
    </button>
  );
}

// ============================================================
// Particle field — a fixed canvas behind the hero + story.
// Phase 1 (hero, first 120vh): loose cloud → Skill Card outline
//   (frame first, then the avatar/seal arcs, then the QR + text dots).
// Phase 2 (story): particles lock onto the app window's grid, then fade.
// ============================================================
type P = { cx: number; cy: number; ph: number; sp: number; amp: number; g: number; u: number; v: number; gi: number; x: number; y: number };

function sampleCardShape(count: number, rand: () => number): Pick<P, "g" | "u" | "v">[] {
  // Card space: u ∈ [0,1], v ∈ [0,0.62] (credit-card aspect)
  const H = 0.62;
  const out: Pick<P, "g" | "u" | "v">[] = [];
  const nWalls = Math.round(count * 0.42);
  const nArcs = Math.round(count * 0.2);
  const nDots = count - nWalls - nArcs;

  // walls: outer frame + header rule + footer rule
  const segs: [number, number, number, number][] = [
    [0, 0, 1, 0], [1, 0, 1, H], [1, H, 0, H], [0, H, 0, 0],
    [0, 0.1, 1, 0.1], [0, 0.42, 0.62, 0.42], [0.62, 0.1, 0.62, H],
  ];
  const lens = segs.map(([a, b, c, d]) => Math.hypot(c - a, d - b));
  const total = lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < nWalls; i++) {
    let r = rand() * total;
    let k = 0;
    while (r > lens[k]) r -= lens[k++];
    const [a, b, c, d] = segs[k];
    const f = r / lens[k];
    out.push({ g: 0, u: a + (c - a) * f, v: b + (d - b) * f });
  }

  // arcs ("door swings"): avatar circle, verified seal, trust ring (270°)
  const arcs: [number, number, number, number, number][] = [
    [0.13, 0.25, 0.075, 0, Math.PI * 2],
    [0.81, 0.25, 0.1, -Math.PI / 2, Math.PI],
    [0.81, 0.25, 0.06, 0, Math.PI * 2],
  ];
  for (let i = 0; i < nArcs; i++) {
    const [x, y, r, s, e] = arcs[i % arcs.length];
    const th = s + rand() * (e - s);
    out.push({ g: 1, u: x + Math.cos(th) * r, v: y + Math.sin(th) * r });
  }

  // furniture dots: name/trade text lines, rubric ticks, QR modules
  const qrCells: [number, number][] = [];
  const N = 9;
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const finder = (i < 3 && j < 3) || (i < 3 && j > N - 4) || (i > N - 4 && j < 3);
      if (finder || ((i * 7 + j * 13 + i * j) % 3 === 0)) qrCells.push([i, j]);
    }
  const lines: [number, number, number][] = [
    [0.25, 0.2, 0.52], [0.25, 0.28, 0.44], [0.05, 0.5, 0.5], [0.05, 0.56, 0.38],
  ];
  for (let i = 0; i < nDots; i++) {
    const pick = i % 5;
    if (pick < 3) {
      const [ci, cj] = qrCells[Math.floor(rand() * qrCells.length)];
      const cell = 0.03;
      out.push({ g: 2, u: 0.67 + cj * cell + rand() * cell * 0.6, v: 0.36 + ci * cell * 0.85 + rand() * cell * 0.5 });
    } else if (pick === 3) {
      const [x0, y, x1] = lines[Math.floor(rand() * lines.length)];
      out.push({ g: 2, u: x0 + rand() * (x1 - x0), v: y + (rand() - 0.5) * 0.008 });
    } else {
      const k = Math.floor(rand() * 5);
      out.push({ g: 2, u: 0.06 + k * 0.1 + (rand() - 0.5) * 0.02, v: 0.48 + (rand() - 0.5) * 0.02 - 0.12 });
    }
  }
  return out;
}

export function ParticleField({ heroId, targetId, storyId, gridId }: { heroId: string; targetId: string; storyId: string; gridId: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef<{ ps: P[]; w: number; h: number; dpr: number } | null>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const mobile = window.innerWidth < 768;
    const count = mobile ? 900 : 2500;
    const shape = sampleCardShape(count, rand);
    const ps: P[] = shape.map((s, i) => {
      const a = rand() * Math.PI * 2;
      const r = Math.pow(rand(), 0.6);
      return { cx: Math.cos(a) * r, cy: Math.sin(a) * r * 0.8, ph: rand() * 6.28, sp: 0.2 + rand() * 0.5, amp: 6 + rand() * 18, ...s, gi: i, x: 0, y: 0 };
    });
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      state.current = { ps, w: window.innerWidth, h: window.innerHeight, dpr };
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useFrame((t) => {
    const st = state.current;
    const c = canvas.current;
    if (!st || !c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const { ps, w, h, dpr } = st;
    const hero = document.getElementById(heroId);
    let target = document.getElementById(targetId);
    if (!target || target.getBoundingClientRect().width === 0) target = document.getElementById(`${targetId}-mobile`);
    const story = document.getElementById(storyId);
    const grid = document.getElementById(gridId);
    if (!hero || !target || !story || !grid) return;

    const p = clamp01(window.scrollY / (window.innerHeight * 1.2));
    const tr = target.getBoundingClientRect();
    const cardW = tr.width;
    const cardH = cardW * 0.62;
    const ox = tr.left;
    const oy = tr.top + (tr.height - cardH) / 2;
    const cloudCx = tr.left + tr.width / 2;
    const cloudCy = tr.top + tr.height / 2;
    const cloudR = Math.max(w, h) * 0.3;

    // story lock
    const sr = story.getBoundingClientRect();
    const lockIn = easeInOut(clamp01((h - sr.top) / (h * 0.9)));
    const storyP = clamp01(-sr.top / Math.max(1, sr.height - h));
    const fade = 1 - clamp01((storyP - 0.88) / 0.12);
    const gr = grid.getBoundingClientRect();
    const gap = w < 768 ? 18 : 22;
    const cols = Math.max(1, Math.floor(gr.width / gap));
    const rows = Math.max(1, Math.floor(gr.height / gap));
    const gx0 = gr.left + (gr.width - (cols - 1) * gap) / 2;
    const gy0 = gr.top + (gr.height - (rows - 1) * gap) / 2;
    const cells = cols * rows;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (fade <= 0.001 || sr.bottom < 0) return;
    ctx.fillStyle = "#214BD4";
    const time = t / 1000;
    const stag = [0, 0.22, 0.42];
    for (let i = 0; i < ps.length; i++) {
      const q = ps[i];
      const gp = easeInOut(clamp01((p - stag[q.g]) / 0.55));
      const dx = Math.sin(time * q.sp + q.ph) * q.amp * (1 - gp);
      const dy = Math.cos(time * q.sp * 0.8 + q.ph) * q.amp * (1 - gp);
      const cloudX = cloudCx + q.cx * cloudR + dx;
      const cloudY = cloudCy + q.cy * cloudR + dy;
      const tx = ox + q.u * cardW;
      const ty = oy + q.v * cardW;
      let x = cloudX + (tx - cloudX) * gp;
      let y = cloudY + (ty - cloudY) * gp;
      if (lockIn > 0) {
        const cell = (q.gi * 7919) % cells;
        const gx = gx0 + (cell % cols) * gap;
        const gy = gy0 + Math.floor(cell / cols) * gap;
        x += (gx - x) * lockIn;
        y += (gy - y) * lockIn;
      }
      ctx.globalAlpha = (q.g === 0 ? 0.9 : 0.7) * fade * (lockIn > 0.95 ? 0.55 : 1);
      const s = q.g === 0 ? 1.8 : 1.5;
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
  });

  return <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-[1] h-screen w-screen" aria-hidden />;
}

// ============================================================
// ⌘K command palette
// ============================================================
export function CommandPalette({ sampleCardId }: { sampleCardId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const actions = [
    { k: "New Skill Card", hint: "Start onboarding in the demo", run: () => router.push("/studio") },
    { k: "Import voice note", hint: "Speak in Hindi, Kannada, Tamil…", run: () => router.push("/studio") },
    { k: "Post a job", hint: "Employer form + Fair Wage Shield", run: () => router.push("/studio?tab=employer") },
    { k: "View sample Skill Card", hint: "Signed credential + QR", run: () => router.push(`/card/${sampleCardId}`) },
    {
      k: "Share link",
      hint: "Copy this page's URL",
      run: async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setToast("Link copied");
        } catch {
          setToast(window.location.href);
        }
      },
    },
    { k: "Jump to pricing", hint: "Worker · Contractor · Enterprise", run: () => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }) },
    { k: "Toggle motion", hint: "Pause or resume animations", run: () => setMotionPaused(!isMotionPaused()) },
  ];
  const list = actions.filter((a) => (a.k + a.hint).toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    const openEvt = () => setOpen(true);
    window.addEventListener("keydown", on);
    window.addEventListener("open-palette", openEvt);
    return () => {
      window.removeEventListener("keydown", on);
      window.removeEventListener("open-palette", openEvt);
    };
  }, []);
  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => input.current?.focus(), 10);
    }
  }, [open]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const choose = (i: number) => {
    const a = list[i];
    if (!a) return;
    setOpen(false);
    a.run();
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-ink/25 px-4 pt-[16vh] backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-hair bg-paper shadow-[0_40px_80px_-30px_rgba(27,29,34,.5)]" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
            <div className="flex items-center gap-3 border-b border-hair px-4">
              <span className="crumb text-muted">⌘K</span>
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setIdx(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIdx((i) => Math.min(list.length - 1, i + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setIdx((i) => Math.max(0, i - 1));
                  } else if (e.key === "Enter") choose(idx);
                }}
                placeholder="Type a command…"
                className="h-14 flex-1 bg-transparent text-[15px] text-ink placeholder:text-muted focus:outline-none"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {list.map((a, i) => (
                <li key={a.k}>
                  <button
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => choose(i)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${i === idx ? "bg-ink text-paper" : "text-ink"}`}
                  >
                    <span className="font-medium">{a.k}</span>
                    <span className={i === idx ? "text-paper/60" : "text-muted"}>{a.hint}</span>
                  </button>
                </li>
              ))}
              {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matching command</li>}
            </ul>
          </div>
        </div>
      )}
      {toast && <div className="fixed bottom-5 left-1/2 z-[95] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper">{toast}</div>}
    </>
  );
}
