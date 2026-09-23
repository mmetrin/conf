import { useEffect, useRef } from "react";

export function ThreeParticleShape({ side = "right", seedOffset = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const desktop = matchMedia("(min-width: 600px)");
    let disposed = false,
      controller = null,
      loading = null,
      active = false,
      prefetched = false;

    function load() {
      if (disposed || loading || controller || !desktop.matches) return;
      loading = import("../animation/particles.js")
        .then(async ({ startParticleShape }) => {
          const next = await startParticleShape(canvas, { side, seedOffset });
          if (disposed) {
            next.dispose();
            return;
          }
          controller = next;
          controller.setActive(active);
        })
        .catch(() => {
          loading = null;
        });
    }
    function prefetch() {
      prefetched = true;
      load();
    }
    function prepare() {
      active = true;
      load();
      controller?.setActive(true);
    }
    function activity(event) {
      active = !!event.detail?.active;
      if (active) load();
      controller?.setActive(active);
    }
    function mediaChange() {
      if (!desktop.matches) controller?.setActive(false);
      else if (active || prefetched) load();
    }

    window.addEventListener("audience-prefetch", prefetch);
    window.addEventListener("audience-prepare", prepare);
    window.addEventListener("audience-active", activity);
    desktop.addEventListener("change", mediaChange);
    return () => {
      disposed = true;
      window.removeEventListener("audience-prefetch", prefetch);
      window.removeEventListener("audience-prepare", prepare);
      window.removeEventListener("audience-active", activity);
      desktop.removeEventListener("change", mediaChange);
      controller?.dispose();
    };
  }, [seedOffset, side]);

  return (
    <canvas
      ref={canvasRef}
      className={`three-particle-shape three-particle-shape--${side}`}
      aria-hidden="true"
    />
  );
}
