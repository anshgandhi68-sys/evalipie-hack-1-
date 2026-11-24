"use client";

import { Download, Printer } from "lucide-react";

/** Renders a printable toolbox QR sticker on a canvas and downloads it as PNG. */
export default function StickerButton({ qr, name, trade, trust, id }: { qr: string; name: string; trade: string; trust: number; id: string }) {
  const download = async () => {
    const W = 600;
    const H = 820;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;

    // background + border
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#214BD4";
    roundRect(ctx, 16, 16, W - 32, H - 32, 36);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 30, 130, W - 60, 470, 24);
    ctx.fill();

    // header
    ctx.fillStyle = "#ffffff";
    ctx.font = "300 46px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#D5DC5C";
    ctx.fillText("E V A L I P I E . I N", W / 2, 80);
    ctx.font = "22px system-ui, sans-serif";
    ctx.fillStyle = "rgba(213,220,92,.85)";
    ctx.fillText("Your skill is your ID · आपका हुनर, आपकी पहचान", W / 2, 112);

    // QR
    const img = new Image();
    img.src = qr;
    await new Promise((r) => (img.onload = r));
    ctx.drawImage(img, (W - 420) / 2, 155, 420, 420);

    // footer
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillText(name, W / 2, 660);
    ctx.font = "26px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillText(`${trade} · Trust ${trust}`, W / 2, 702);
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillStyle = "#D5DC5C";
    ctx.fillText("Scan to verify · Cryptographically signed", W / 2, 750);

    const a = document.createElement("a");
    a.download = `evalipie-sticker-${id}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="no-print mt-4 flex justify-center gap-2">
      <button onClick={download} className="flex items-center gap-2 rounded-full bg-[#214BD4] px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-[#1B1D22]">
        <Download className="h-4 w-4" /> Download Toolbox QR Sticker
      </button>
      <button onClick={() => window.print()} title="Print" className="flex items-center rounded-full border border-[rgba(27,29,34,.15)] px-3.5 py-2.5 text-[#1B1D22] hover:bg-[#E9E4D8]">
        <Printer className="h-4 w-4" />
      </button>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
