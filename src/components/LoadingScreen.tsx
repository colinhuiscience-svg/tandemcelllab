import { useEffect, useRef, useState } from "react";

import watermark from "@/assets/chui-watermark.png.asset.json";

const WRITE_MS = 2600;
const HOLD_MS = 900;

export function LoadingScreen({ onComplete }: { onComplete?: () => void }) {
  const [phase, setPhase] = useState<"write" | "done">("write");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  useEffect(() => {
    const done = window.setTimeout(() => {
      setPhase("done");
      onCompleteRef.current?.();
    }, WRITE_MS + HOLD_MS);
    return () => window.clearTimeout(done);
  }, []);
  if (phase === "done") return null;
  return (
    <div className="loading-screen" role="status" aria-label="Loading Solar Cell Lab">
      <div className="signature-write">
        <img src={watermark.url} alt="C. Hui" />
      </div>
    </div>
  );
}
