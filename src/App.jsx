import { useEffect, useRef, useState } from "react";
import { Hero } from "./components/Hero/Hero.jsx";
import { StageOverlay } from "./components/StageOverlay/StageOverlay.jsx";
import { useSceneRuntime } from "./hooks/useSceneRuntime.js";

export default function App() {
  useSceneRuntime();
  const [BelowFold, setBelowFold] = useState(null);
  const lowerContentPromise = useRef(null);
  useEffect(() => {
    let disposed = false;
    const request = () => {
      if (BelowFold || lowerContentPromise.current) return;
      lowerContentPromise.current = import("./components/BelowFold/BelowFold.jsx")
        .then((module) => {
          if (!disposed) setBelowFold(() => module.default);
        })
        .catch(() => {
          lowerContentPromise.current = null;
        });
    };
    window.addEventListener("lower-content-request", request);
    window.addEventListener("sequence-background-complete", request);
    window.addEventListener("audience-prepare", request);
    return () => {
      disposed = true;
      window.removeEventListener("lower-content-request", request);
      window.removeEventListener("sequence-background-complete", request);
      window.removeEventListener("audience-prepare", request);
    };
  }, [BelowFold]);
  return (
    <>
      <StageOverlay />
      <main>
        <Hero />
        {BelowFold ? (
          <BelowFold />
        ) : (
          <div className="below-fold-placeholder" aria-hidden="true" />
        )}
      </main>
    </>
  );
}
