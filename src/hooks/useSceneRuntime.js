import { useEffect } from "react";
import { configureFrameHost } from "../animation/frameHost.js";
import { createRuntime } from "../animation/runtime.js";
import { startScene } from "../animation/scene.js";
import { waitForDecodedImage } from "../utils/imageReady.js";
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
    const siteFontsReady = Promise.all([
      document.fonts.load('400 32px "MTS Wide"', "о технологиях будущего"),
      document.fonts.load('500 18px "MTS Wide"', "Принять участие"),
      document.fonts.load(
        '700 44px "MTS Ultra Extended"',
        "Флагманская конференция",
      ),
    ]);
    const pagePreparationTasks = [];
    let abstractController = null,
      abstractLoading = null,
      requestedAbstractOpacity = 0,
      abstractSuspended = false,
      heroVisible = false;
    const prepareAbstractLights = () => {
      if (!heroVisible) return Promise.resolve(null);
      if (abstractController) return Promise.resolve(abstractController);
      if (abstractLoading) return abstractLoading;
      abstractLoading = import("../animation/abstract.js")
        .then(({ startAbstractLights }) => {
          if (scope.disposed) return null;
          abstractController = startAbstractLights(scope);
          abstractController?.setSuspended(abstractSuspended);
          abstractController?.show(requestedAbstractOpacity);
          return abstractController;
        })
        .catch(() => {
          abstractLoading = null;
          return null;
        });
      return abstractLoading;
    };
    const abstractLights = {
      prepare: prepareAbstractLights,
      show(value) {
        requestedAbstractOpacity = value;
        if (abstractController) {
          abstractController.show(value);
          return;
        }
        if (value <= 0.001 || abstractLoading) return;
        prepareAbstractLights();
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
        [
          ...document.querySelectorAll(
            ".scene-logo, .menu-trigger__menu-icon, .lens-loader__image",
          ),
        ].map(waitForDecodedImage),
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
        heroVisible = true;
      },
      { once: true },
    );
    scope.listen(
      window,
      "opening-complete",
      () => {
        // The next screen must not wait for every optional sequence frame.
        window.dispatchEvent(new window.Event("audience-prefetch"));
        window.dispatchEvent(new window.Event("lower-content-request"));
        sceneController.startBackground().then(() => {
          if (!scope.disposed) {
            window.dispatchEvent(
              new window.Event("sequence-background-complete"),
            );
          }
        });
      },
      { once: true },
    );
    scope.listen(window, "audience-prepare", prepareAbstractLights);
    const previewReady = waitForDecodedImage(
      document.querySelector(".projector-front"),
    ).then(() => {
      if (!scope.disposed) root.classList.add("projector-preview");
    });
    const criticalReady = Promise.all([
      previewReady,
      siteFontsReady,
      ...pagePreparationTasks,
    ]);
    const reportLoadingError = () => {
      if (!scope.disposed)
        window.dispatchEvent(new window.Event("opening-error"));
    };
    // Offer recovery on a stalled connection, but never reveal incomplete assets.
    const loadingWatchdog = scope.timeout(reportLoadingError, 30000);
    criticalReady.then(
      () => {
        if (scope.disposed) return;
        scope.clearTimeout(loadingWatchdog);
        window.dispatchEvent(new window.Event("opening-recovered"));
        // Let the browser commit initial layout before starting the opening.
        scope.request(() =>
          scope.request(() => {
            root.classList.add("content-ready");
            window.dispatchEvent(new window.Event("opening-ready"));
          }),
        );
      },
      () => {
        scope.clearTimeout(loadingWatchdog);
        reportLoadingError();
      },
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
