import { useEffect } from "react";
import { createRuntime } from "../animation/runtime.js";
import { startScene } from "../animation/scene.js";
import { startAbstractLights } from "../animation/abstract.js";
import { startScrollTransitions } from "../animation/scroll.js";
export function useSceneRuntime() {
  useEffect(() => {
    const scope = createRuntime(),
      root = document.documentElement;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    root.classList.add("opening-locked");
    root.classList.remove(
      "content-ready",
      "projector-preview",
      "loader-finished",
    );
    const siteFontsReady = Promise.allSettled([
      document.fonts.load('500 64px "MTS Wide"', "Флагманская конференция"),
      document.fonts.load('700 44px "MTS Ultra Extended"', "Флагманская конференция"),
      document.fonts.load('400 26px "MTS Text"', "Только офлайн"),
    ]);
    const pagePreparationTasks = [];
    const abstractLights = startAbstractLights(scope);
    if (abstractLights) abstractLights.show(0);
    startScene({ scope, siteFontsReady, pagePreparationTasks, abstractLights });
    startScrollTransitions(scope, siteFontsReady, abstractLights);
    const delay = (ms) => new Promise((resolve) => scope.timeout(resolve, ms));
    scope.request(() =>
      scope.request(() => {
        const previewReady = Promise.all([
          delay(500),
          document
            .querySelector(".projector-front")
            .decode()
            .catch(() => {}),
        ]).then(() => {
          if (!scope.disposed) root.classList.add("projector-preview");
        });
        Promise.allSettled([
          delay(1100),
          previewReady,
          siteFontsReady,
          ...pagePreparationTasks,
        ]).then(() => {
          if (scope.disposed) return;
          scope.request(() => {
            root.classList.add("content-ready");
            window.dispatchEvent(new Event("opening-ready"));
          });
        });
      }),
    );
    return () => {
      scope.dispose();
      root.classList.remove(
        "opening-locked",
        "content-ready",
        "projector-preview",
        "loader-finished",
      );
    };
  }, []);
}
