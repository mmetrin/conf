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
      transitionActive = true,
      prefetched = false;

    const enabled = () => desktop.matches;

    function load() {
      if (disposed || loading || controller || !enabled()) return;
      canvas.classList.add("is-requested");
      loading = import("../animation/particles.js")
        .then(async ({ startParticleShape }) => {
          if (disposed) return;
          const next = await startParticleShape(canvas, { side, seedOffset });
          if (disposed) {
            next.dispose();
            return;
          }
          controller = next;
          canvas.classList.add("is-animated");
          controller.setActive(active && transitionActive && enabled());
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
      controller?.setActive(transitionActive && enabled());
    }
    function activity(event) {
      active = !!event.detail?.active;
      if (active) load();
      controller?.setActive(active && transitionActive && enabled());
    }
    function transitionActivity(event) {
      transitionActive = event.detail?.active !== false;
      controller?.setActive(active && transitionActive && enabled());
    }
    function mediaChange() {
      if (!enabled()) controller?.setActive(false);
      else if (active || prefetched) {
        load();
        controller?.setActive(active && transitionActive);
      }
    }

    window.addEventListener("audience-prefetch", prefetch);
    window.addEventListener("audience-prepare", prepare);
    window.addEventListener("audience-active", activity);
    window.addEventListener("audience-transition-active", transitionActivity);
    desktop.addEventListener("change", mediaChange);
    return () => {
      disposed = true;
      window.removeEventListener("audience-prefetch", prefetch);
      window.removeEventListener("audience-prepare", prepare);
      window.removeEventListener("audience-active", activity);
      window.removeEventListener("audience-transition-active", transitionActivity);
      desktop.removeEventListener("change", mediaChange);
      controller?.dispose();
    };
  }, [seedOffset, side]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`three-particle-shape three-particle-shape--${side}`}
        aria-hidden="true"
      />
      {side === "left" && (
        <div className="three-particle-mobile-frames" aria-hidden="true">
          <span className="three-particle-mobile-frame three-particle-mobile-frame--one">
            <i>signal.vector</i>
          </span>
          <span className="three-particle-mobile-frame three-particle-mobile-frame--two">
            <i>data.field</i>
          </span>
          <span className="three-particle-mobile-frame three-particle-mobile-frame--three">
            <i>node.scan</i>
          </span>
        </div>
      )}
    </>
  );
}
