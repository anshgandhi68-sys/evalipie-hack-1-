"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, RotateCcw, Send, ShieldCheck, X } from "lucide-react";

const MAX_SECONDS = 30;
const MIN_SECONDS = 3;

type Phase = "starting" | "ready" | "countdown" | "recording" | "review" | "error";

function pickMime() {
  const opts = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/webm", "video/mp4;codecs=avc1,mp4a", "video/mp4"];
  if (typeof MediaRecorder === "undefined") return "";
  return opts.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}

/**
 * In-app live skill video recorder.
 * Shows the liveness code on screen, records up to 30s at a bitrate that keeps
 * clips small enough for serverless request limits, then lets the worker review,
 * retake or send.
 */
export default function LiveRecorder({
  open,
  code,
  task,
  onClose,
  onSend,
}: {
  open: boolean;
  code: string | null;
  task?: string;
  onClose: () => void;
  onSend: (blob: Blob, mime: string, seconds: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState("");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [canFlip, setCanFlip] = useState(false);
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const [review, setReview] = useState<{ url: string; blob: Blob; mime: string; secs: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isUserFacing = useRef(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  };

  // start / restart camera
  const startCamera = useCallback(
    async (mode: "environment" | "user") => {
      stopStream();
      setPhase("starting");
      setError("");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        streamRef.current = stream;
        const settings = stream.getVideoTracks()[0]?.getSettings();
        isUserFacing.current = settings?.facingMode ? settings.facingMode === "user" : true;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          await videoRef.current.play().catch(() => {});
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCanFlip(devices.filter((d) => d.kind === "videoinput").length > 1);
        setPhase("ready");
      } catch (e) {
        const name = (e as DOMException)?.name;
        setError(
          name === "NotAllowedError"
            ? "Camera or microphone permission was blocked. Allow access in the browser's address bar and try again."
            : name === "NotFoundError"
              ? "No camera found on this device."
              : "Couldn't start the camera. Close other apps using it and try again."
        );
        setPhase("error");
      }
    },
    [stopStream]
  );

  useEffect(() => {
    if (!open) return;
    window.speechSynthesis?.cancel(); // never record the bot's own voice
    setReview(null);
    setElapsed(0);
    startCamera(facing);
    return () => {
      clearTick();
      if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      if (review) URL.revokeObjectURL(review.url);
    };
  }, [review]);

  const beginRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const mime = pickMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 650_000, audioBitsPerSecond: 48_000 });
    } catch {
      rec = new MediaRecorder(stream);
    }
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      clearTick();
      const type = (rec.mimeType || mime || "video/webm").split(";")[0];
      const blob = new Blob(chunks.current, { type });
      const secs = Math.max(1, Math.round((performance.now() - startedAt.current) / 1000));
      if (videoRef.current) videoRef.current.srcObject = null;
      stopStream();
      setReview({ url: URL.createObjectURL(blob), blob, mime: type, secs });
      setPhase("review");
    };
    recRef.current = rec;
    rec.start(500);
    startedAt.current = performance.now();
    setElapsed(0);
    setPhase("recording");
    tickRef.current = setInterval(() => {
      const s = (performance.now() - startedAt.current) / 1000;
      setElapsed(s);
      if (s >= MAX_SECONDS && rec.state === "recording") rec.stop();
    }, 100);
  };

  const startCountdown = () => {
    setPhase("countdown");
    setCount(3);
    let n = 3;
    const t = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(t);
        beginRecording();
      } else setCount(n);
    }, 800);
  };

  const stopRecording = () => {
    if (recRef.current && recRef.current.state === "recording") recRef.current.stop();
  };

  const retake = () => {
    if (review) URL.revokeObjectURL(review.url);
    setReview(null);
    startCamera(facing);
  };

  const flip = () => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    startCamera(next);
  };

  const close = () => {
    clearTick();
    if (recRef.current && recRef.current.state === "recording") {
      recRef.current.onstop = null;
      recRef.current.stop();
    }
    stopStream();
    onClose();
  };

  if (!open) return null;
  const digits = (code || "--").split("");
  const pct = Math.min(1, elapsed / MAX_SECONDS);
  const sizeMb = review ? review.blob.size / (1024 * 1024) : 0;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink/55 p-4 backdrop-blur-sm" role="dialog" aria-label="Record live skill video">
      <div className="paper-site w-full max-w-[600px] overflow-hidden rounded-3xl border border-hair font-sans shadow-[0_60px_120px_-40px_rgba(0,0,0,.6)]">
        {/* header */}
        <div className="flex items-start justify-between border-b border-hair px-5 py-4">
          <div>
            <div className="crumb text-[10px] text-muted">Live skill video · liveness checked</div>
            <h3 className="mt-1 text-[22px] font-medium leading-tight text-ink">
              Record your <span className="serif-em text-cobalt">work</span>
            </h3>
            {task && <p className="mt-0.5 text-[13px] text-muted">Task: {task}</p>}
          </div>
          <button onClick={close} className="rounded-full border border-hair p-2 text-ink transition hover:bg-panel" aria-label="Close recorder">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* viewport */}
        <div className="p-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#0d0f13]">
            {phase !== "review" && (
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ transform: isUserFacing.current ? "scaleX(-1)" : undefined }}
              />
            )}
            {phase === "review" && review && <video src={review.url} controls playsInline autoPlay className="h-full w-full bg-black object-contain" />}

            {phase === "starting" && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting camera…
              </div>
            )}

            {phase === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
                <Camera className="h-8 w-8 opacity-70" />
                <p className="max-w-sm text-sm text-white/85">{error}</p>
                <button onClick={() => startCamera(facing)} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink">
                  Try again
                </button>
              </div>
            )}

            {/* liveness code overlay */}
            {(phase === "ready" || phase === "countdown" || phase === "recording") && (
              <div className={`absolute right-3 top-3 rounded-2xl bg-ink/70 px-3 py-2 text-center backdrop-blur ${phase === "recording" && elapsed < 6 ? "ring-2 ring-lime" : ""}`}>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-lime">{phase === "recording" && elapsed < 6 ? "Say it now" : "Say this code"}</div>
                <div className="mt-1 flex justify-center gap-1">
                  {digits.map((d, i) => (
                    <span key={i} className="flex h-9 w-7 items-center justify-center rounded-md bg-cobalt text-xl font-semibold text-lime">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* REC + timer */}
            {phase === "recording" && (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-ink/70 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> REC 0:{String(Math.floor(elapsed)).padStart(2, "0")} / 0:{MAX_SECONDS}
              </div>
            )}

            {/* countdown */}
            {phase === "countdown" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 text-white">
                <div className="text-[72px] font-semibold leading-none">{count}</div>
                <div className="mt-2 text-sm text-white/85">Get ready — say the code first</div>
              </div>
            )}

            {/* progress */}
            {phase === "recording" && (
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/15">
                <div className="h-full bg-lime transition-[width] duration-100" style={{ width: `${pct * 100}%` }} />
              </div>
            )}

            {canFlip && (phase === "ready" || phase === "error") && (
              <button onClick={flip} className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1.5 text-[12px] text-white backdrop-blur hover:bg-ink" aria-label="Switch camera">
                <RefreshCw className="h-3.5 w-3.5" /> Flip
              </button>
            )}
          </div>

          {/* controls */}
          <div className="mt-4 flex items-center justify-between gap-3">
            {phase === "review" && review ? (
              <>
                <div className="text-[12px] text-muted">
                  {review.secs}s · {sizeMb.toFixed(1)} MB
                </div>
                <div className="flex gap-2">
                  <button onClick={retake} className="flex items-center gap-1.5 rounded-full border border-hair px-4 py-2.5 text-[13.5px] font-medium text-ink hover:bg-panel">
                    <RotateCcw className="h-4 w-4" /> Retake
                  </button>
                  <button
                    onClick={() => {
                      onSend(review.blob, review.mime, review.secs);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-cobalt px-5 py-2.5 text-[13.5px] font-medium text-white shadow-[0_10px_24px_-12px_rgba(33,75,212,.9)] hover:bg-ink"
                  >
                    <Send className="h-4 w-4" /> Send for assessment
                  </button>
                </div>
              </>
            ) : (
              <>
                <ul className="space-y-0.5 text-[12px] text-muted">
                  <li>① Say the code out loud at the start</li>
                  <li>② Show your hands, tools and the work</li>
                  <li>③ Keep it under {MAX_SECONDS} seconds</li>
                </ul>
                {phase === "recording" ? (
                  <button
                    onClick={stopRecording}
                    disabled={elapsed < MIN_SECONDS}
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-rose-500/30 bg-rose-500 text-white transition disabled:opacity-60"
                    aria-label="Stop recording"
                  >
                    <span className="h-5 w-5 rounded-[4px] bg-white" />
                  </button>
                ) : (
                  <button
                    onClick={startCountdown}
                    disabled={phase !== "ready"}
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-hair bg-white transition hover:scale-105 disabled:opacity-40"
                    aria-label="Start recording"
                  >
                    <span className="h-11 w-11 rounded-full bg-rose-500" />
                  </button>
                )}
              </>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-cobalt" /> The video is only used for your skill assessment. Your phone number is never shared.
          </div>
        </div>
      </div>
    </div>
  );
}
