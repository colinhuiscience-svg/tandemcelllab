import { useEffect, useState } from "react";

import watermark from "@/assets/chui-watermark.png.asset.json";

const WRITE_MS = 2600;
const HOLD_MS = 900;
const FADE_MS = 500;

export function LoadingScreen() {
  const [phase, setPhase] = useState<"write" | "fade" | "done">("write");
  useEffect(() => {
    const fade = window.setTimeout(() => setPhase("fade"), WRITE_MS + HOLD_MS);
    const done = window.setTimeout(() => setPhase("done"), WRITE_MS + HOLD_MS + FADE_MS);
    return () => { window.clearTimeout(fade); window.clearTimeout(done); };
  }, []);
  if (phase === "done") return null;
  return (
    <div className={`loading-screen${phase === "fade" ? " leaving" : ""}`} role="status" aria-label="Loading Solar Cell Lab">
      <div className="signature-write" style={{ "--write-ms": `${WRITE_MS}ms` } as React.CSSProperties}>
        <img src={watermark.url} alt="C. Hui" />
        <span className="signature-pen" aria-hidden="true" />
      </div>
      <p className="loading-label">SOLAR CELL LAB</p>
    </div>
  );
}
