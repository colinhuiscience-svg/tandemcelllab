import { useEffect, useState } from "react";

import watermark from "@/assets/chui-watermark.jpg.asset.json";

const REVEAL_MS = 1500;
const FADE_MS = 450;

export function LoadingScreen() {
  const [phase, setPhase] = useState<"draw" | "fade" | "done">("draw");
  useEffect(() => {
    const reveal = window.setTimeout(() => setPhase("fade"), REVEAL_MS);
    const done = window.setTimeout(() => setPhase("done"), REVEAL_MS + FADE_MS);
    return () => { window.clearTimeout(reveal); window.clearTimeout(done); };
  }, []);
  if (phase === "done") return null;
  return (
    <div className={`loading-screen${phase === "fade" ? " leaving" : ""}`} role="status" aria-label="Loading Solar Cell Lab">
      <svg className="brushstroke" viewBox="0 0 320 90" aria-hidden="true">
        <path className="brushstroke-path" d="M18 58 C 60 22, 120 74, 168 44 S 268 30, 302 52" fill="none" strokeWidth="14" strokeLinecap="round" />
        <path className="brushstroke-path thin" d="M30 66 C 90 40, 170 70, 290 44" fill="none" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <img className="loading-watermark" src={watermark.url} alt="C. Hui" />
      <p className="loading-label">SOLAR CELL LAB</p>
    </div>
  );
}
