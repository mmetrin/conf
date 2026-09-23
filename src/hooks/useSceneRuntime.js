import { useEffect } from "react";
import { configureFrameHost } from "../animation/frameHost.js";
import { createRuntime } from "../animation/runtime.js";
import { startScene } from "../animation/scene.js";
export function useSceneRuntime() {
  useEffect(() => {
    const scope = createRuntime(),
      root = document.documentElement;
    scope.defer(configureFrameHost(scope));
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    root.classList.add("opening-locked");
    root.classList.remove(
      "content-ready",
      "projector-preview",
      "loader-finished",
    );
    const siteFontsReady = Promise.allSettled([
      document.fonts.load('400 32px "MTS Wide"', "о технологиях будущего"),
      document.fonts.load('500 18px "MTS Wide"', "Принять участие"),
      document.fonts.load('700 44px "MTS Ultra Extended"', "Флагманская конференция"),
    ]);
    const pagePreparationTasks = [];
    let abstractController = null,
      abstractLoading = null,
      requestedAbstractOpacity = 0,
      abstractSuspended = false;
    const abstractLights = {
      show(value) {
        requestedAbstractOpacity = value;
        if (abstractController) {
          abstractController.show(value);
          return;
        }
        if (value <= 0.001 || abstractLoading) return;
        abstractLoading = import("../animation/abstract.js")
          .then(({ startAbstractLights }) => {
            if (scope.disposed) return;
            abstractController = startAbstractLights(scope);
            abstractController?.setSuspended(abstractSuspended);
            abstractController?.show(requestedAbstractOpacity);
          })
          .catch(() => {
            abstractLoading = null;
          });
      },
      setSuspended(value) {
        abstractSuspended = value;
        abstractController?.setSuspended(value);
      },
    };
    const sceneController = startScene({
      scope,
      siteFontsReady,
      pagePreparationTasks,
      abstractLights,
    });
    pagePreparationTasks.push(
      Promise.all(
        [...document.querySelectorAll(".scene-logo, .menu-trigger img, .lens-loader__image")].map(
          (image) => image.decode().catch(() => {}),
        ),
      ),
    );
    let lowerRuntimeStarted = false;
    scope.listen(window, "lower-content-ready", () => {
      if (lowerRuntimeStarted) return;
      lowerRuntimeStarted = true;
      import("../animation/scroll.js")
        .then(({ startScrollTransitions }) => {
          if (!scope.disposed)
            startScrollTransitions(scope, siteFontsReady, abstractLights);
        })
        .catch(() => {
          lowerRuntimeStarted = false;
        });
    });
    scope.listen(
      window,
      "hero-visible",
      () => {
        sceneController.startBackground().then(() => {
          if (!scope.disposed) {
            window.dispatchEvent(new window.Event("audience-prefetch"));
            window.dispatchEvent(
              new window.Event("sequence-background-complete"),
            );
          }
        });
      },
      { once: true },
    );
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
        const criticalReady = Promise.allSettled([
          previewReady,
          siteFontsReady,
          ...pagePreparationTasks,
        ]);
        Promise.race([criticalReady, delay(15000)]).then(() => {
          if (scope.disposed) return;
          scope.request(() => {
            root.classList.add("content-ready");
            window.dispatchEvent(new window.Event("opening-ready"));
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
