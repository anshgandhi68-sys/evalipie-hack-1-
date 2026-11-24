"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Job, PublicWorker } from "@/lib/store";

type L = typeof import("leaflet");

const LEVEL_COLOR: Record<string, string> = {
  Beginner: "#f59e0b",
  Skilled: "#38bdf8",
  Expert: "#34d399",
};

const TRADE_EMOJI: Record<string, string> = { electrician: "⚡", plumber: "🔧", mason: "🧱", carpenter: "🪚" };

export default function LiveMap({ workers, jobs }: { workers: PublicWorker[]; jobs: Job[] }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const libRef = useRef<L | null>(null);
  const dataRef = useRef({ workers, jobs });
  dataRef.current = { workers, jobs };
  const focusedJob = useRef<string | null>(null);

  // init once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lib = (await import("leaflet")).default as unknown as L;
      if (cancelled || !el.current || mapRef.current) return;
      libRef.current = lib;
      const map = lib.map(el.current, { zoomControl: true, attributionControl: true }).setView([12.965, 77.62], 12);
      lib
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          className: "osm-dark",
        })
        .addTo(map);
      mapRef.current = map;
      layerRef.current = lib.layerGroup().addTo(map);
      draw();
      setTimeout(() => map.invalidateSize(), 200);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redraw on data change
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workers, jobs]);

  // keep map sized when container changes (tab switches)
  useEffect(() => {
    if (!el.current) return;
    const ro = new ResizeObserver(() => {
      if (!mapRef.current || !el.current || el.current.offsetWidth === 0) return;
      mapRef.current.invalidateSize();
      draw();
    });
    ro.observe(el.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const lib = libRef.current;
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!lib || !layer || !map) return;
    layer.clearLayers();
    const { workers, jobs } = dataRef.current;
    const byId = new Map(workers.map((w) => [w.id, w]));

    // connection lines for live jobs
    const liveJobs = jobs.filter((j) => j.status !== "completed").slice(0, 4);
    liveJobs.forEach((j, idx) => {
      j.matches.slice(0, 3).forEach((m) => {
        const w = byId.get(m.workerId);
        if (!w) return;
        const assigned = j.assignedWorkerId === w.id;
        lib
          .polyline(
            [
              [j.lat, j.lng],
              [w.lat, w.lng],
            ],
            {
              color: assigned ? "#25D366" : "#64748b",
              weight: assigned ? 3 : 1.5,
              dashArray: assigned ? undefined : "4 6",
              opacity: idx === 0 ? 0.9 : 0.45,
            }
          )
          .addTo(layer);
      });
    });

    workers.forEach((w) => {
      if (!w.verified && !w.isDemo) return;
      const color = w.verified ? LEVEL_COLOR[w.level] : "#94a3b8";
      const popup = `<div style="font-family:system-ui;min-width:170px">
        <div style="font-weight:700;font-size:14px">${w.name}${w.isDemo ? " 🟢 LIVE" : ""}</div>
        <div style="color:#475569;font-size:12px">${TRADE_EMOJI[w.trade]} ${w.trade} · ${w.verified ? w.level : "verifying…"} · ${w.area}</div>
        <div style="margin-top:6px;font-size:12px">Trust <b>${w.trustScore}</b> · ${w.jobsCompleted} jobs · ${w.vouches.length} vouches</div>
        <div style="font-size:12px">${w.status === "on_job" ? "🟠 On a job" : "🟢 Available"}</div>
        ${w.verified ? `<a href="/card/${w.id}" target="_blank" style="display:inline-block;margin-top:6px;color:#059669;font-weight:600;font-size:12px">View Skill Card →</a>` : ""}
      </div>`;
      if (w.isDemo) {
        const icon = lib.divIcon({
          className: "",
          html: `<div class="demo-pin"><span>${TRADE_EMOJI[w.trade]}</span></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        lib.marker([w.lat, w.lng], { icon, zIndexOffset: 1000 }).bindPopup(popup).addTo(layer);
      } else {
        lib
          .circleMarker([w.lat, w.lng], {
            radius: 6 + Math.round(w.trustScore / 25),
            color: w.status === "on_job" ? "#f97316" : color,
            weight: 2,
            fillColor: color,
            fillOpacity: w.status === "on_job" ? 0.25 : 0.7,
          })
          .bindPopup(popup)
          .addTo(layer);
      }
    });

    jobs.forEach((j) => {
      const done = j.status === "completed";
      const below = j.fairWage.status === "below" && j.daily_wage < j.fairWage.min;
      const icon = lib.divIcon({
        className: "",
        html: `<div class="job-pin ${done ? "job-done" : ""} ${below ? "job-below" : ""}">${done ? "✓" : "💼"}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      lib
        .marker([j.lat, j.lng], { icon, zIndexOffset: 500 })
        .bindPopup(
          `<div style="font-family:system-ui;min-width:170px"><div style="font-weight:700">${j.employer}</div>
           <div style="font-size:12px;color:#475569">${TRADE_EMOJI[j.trade]} ${j.trade} · ${j.required_level} · ${j.area}</div>
           <div style="font-size:12px;margin-top:4px">₹${j.daily_wage}/day × ${j.duration_days}d · <b>${j.status}</b></div>
           <div style="font-size:12px">Fair range ₹${j.fairWage.min}–₹${j.fairWage.max}</div></div>`
        )
        .addTo(layer);
    });

    // fly to the newest job once
    // (only when the map is visible — a hidden container has zero size and breaks flyTo)
    const newest = jobs[0];
    const visible = !!el.current && el.current.offsetWidth > 0 && el.current.offsetHeight > 0;
    if (newest && visible && focusedJob.current !== newest.id) {
      focusedJob.current = newest.id;
      try {
        map.invalidateSize();
        map.flyTo([newest.lat, newest.lng], 13, { duration: 1.2 });
      } catch {
        /* ignore animation errors */
      }
    }
  }

  return <div ref={el} className="h-full w-full rounded-xl overflow-hidden" />;
}
