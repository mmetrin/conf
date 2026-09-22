const clamp = (value) => Math.max(0, Math.min(1, value));
const ease = (value) => value * value * (3 - 2 * value);
export function startScrollTransitions(scope, fontsReady, abstractLights) {
  const scene = document.querySelector("#scene"),
    journey = document.querySelector("#journey");
  const programme = document.querySelector("#programme"),
    programmeTitle = programme.querySelector("h2"),
    content = programme.querySelector(".programme__inner"),
    track = programme.querySelector(".programme__track");
  const registration = document.querySelector("#registration"),
    items = [...programme.querySelectorAll(".programme__item")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    written = new WeakMap();
  let metrics = null,
    previousEntryY = 0,
    pending = 0,
    writeFrame = 0,
    abstractLocked = false,
    previousScrollY = window.scrollY;
  function commit(node, key, value) {
    let cache = written.get(node);
    if (!cache) {
      cache = {};
      written.set(node, cache);
    }
    if (cache[key] === value) return;
    cache[key] = value;
    node.style.setProperty(key, value);
  }
  function measure() {
    pending = 0;
    if (scope.disposed) return;
    // All layout reads are performed together, before any of this frame's writes.
    const height = scene.clientHeight,
      remaining = journey.getBoundingClientRect().bottom - height;
    const programmeRect = programme.getBoundingClientRect(),
      programmeTitleRect = programmeTitle.getBoundingClientRect(),
      registrationRect = registration.getBoundingClientRect();
    const progress = clamp(1 - remaining / Math.max(1, height * 0.5)),
      fade = ease(progress);
    const entry = ease(
        clamp((height * 0.9 - programmeRect.top) / Math.max(1, height * 0.5)),
      ),
      entryY = height * 0.16 * (1 - entry);
    const formEntry = ease(
      clamp((height * 0.9 - registrationRect.top) / Math.max(1, height * 0.5)),
    );
    const active =
      programmeRect.top < height + 100 && programmeRect.bottom > -100;
    const titleCenterOffset = programmeTitleRect.top + programmeTitleRect.height / 2 - height / 2;
    const titleCenterDistance = Math.abs(titleCenterOffset);
    const scrollDirection = Math.sign(window.scrollY - previousScrollY);
    previousScrollY = window.scrollY;
    const abstractReveal = ease(
      clamp(1 - titleCenterDistance / Math.max(1, height * 0.42)),
    );
    if (!abstractLocked && active && scrollDirection >= 0 && titleCenterOffset <= 0)
      abstractLocked = true;
    if (abstractLocked && scrollDirection < 0 && titleCenterOffset >= 0)
      abstractLocked = false;
    let focusState = null;
    if (active) {
      const rect = track.getBoundingClientRect(),
        contentRect = content.getBoundingClientRect();
      if (!metrics)
        metrics = items.map((node) => {
          const r = node.getBoundingClientRect();
          return { top: r.top - rect.top, bottom: r.bottom - rect.top };
        });
      const trackTop = rect.top - previousEntryY + entryY,
        contentTop = contentRect.top - previousEntryY + entryY,
        focus = height * 0.48;
      const darkEdge =
        Math.max(0, window.programmeBeam?.y ?? Math.min(80, height * 0.1)) + 8;
      const litEdge = Math.max(
        darkEdge + 60,
        Math.min(height * 0.36, focus - 24),
      );
      focusState = {
        edges: [
          darkEdge,
          darkEdge + (litEdge - darkEdge) * 0.45,
          darkEdge + (litEdge - darkEdge) * 0.75,
          litEdge,
        ].map((v) => (v - contentTop).toFixed(1) + "px"),
        levels: metrics.map((item) => {
          const distance = Math.abs(
            (item.top + item.bottom) / 2 + trackTop - focus,
          );
          return {
            opacity: (
              0.3 +
              0.7 * ease(clamp(1 - distance / (height * 0.3)))
            ).toFixed(3),
            scale: reduced.matches
              ? "1"
              : (
                  0.84 +
                  0.34 * ease(clamp(1 - distance / (height * 0.18)))
                ).toFixed(4),
          };
        }),
      };
    }
    scope.cancel(writeFrame);
    writeFrame = scope.request(() => {
      commit(
        scene,
        "--copy-exit-y",
        (-height * 0.38 * progress).toFixed(2) + "px",
      );
      commit(scene, "--copy-exit-opacity", (1 - fade).toFixed(4));
      commit(scene, "--copy-exit-brightness", (1 - 0.85 * fade).toFixed(4));
      commit(programme, "--programme-entry-y", entryY.toFixed(2) + "px");
      commit(
        programme,
        "--programme-entry-opacity",
        (0.35 + 0.65 * entry).toFixed(4),
      );
      commit(
        programme,
        "--programme-entry-light",
        (0.55 + 0.45 * entry).toFixed(4),
      );
      previousEntryY = entryY;
      scene.classList.toggle("programme-exiting", progress > 0);
      scene.classList.toggle("programme-pinned", remaining <= 0);
      commit(
        registration,
        "--registration-entry-y",
        (height * 0.16 * (1 - formEntry)).toFixed(2) + "px",
      );
      commit(
        registration,
        "--registration-entry-opacity",
        String(0.35 + 0.65 * formEntry),
      );
      document.body.classList.toggle(
        "registration-visible",
        registrationRect.top < height * 0.7 &&
          registrationRect.bottom > height * 0.2,
      );
      if (abstractLights) abstractLights.show(abstractLocked ? 1 : active ? abstractReveal : 0);
      if (focusState) {
        ["dark", "dim", "soft", "lit"].forEach((name, i) =>
          commit(content, "--programme-" + name + "-edge", focusState.edges[i]),
        );
        items.forEach((item, i) => {
          commit(item, "--focus", focusState.levels[i].opacity);
          commit(item, "--programme-scale", focusState.levels[i].scale);
        });
      }
    });
  }
  function schedule() {
    if (!pending) pending = scope.request(measure, "read");
  }
  function invalidate() {
    metrics = null;
    schedule();
  }
  scope.listen(window, "scroll", measure, { passive: true });
  scope.listen(window, "resize", invalidate, { passive: true });
  scope.listen(reduced, "change", schedule);
  const observer = new ResizeObserver(invalidate);
  [journey, programme, registration].forEach((node) => observer.observe(node));
  scope.defer(() => observer.disconnect());
  fontsReady.then(() => {
    if (!scope.disposed) invalidate();
  });
  schedule();
  scope.listen(document.querySelector("#conference-register"), "click", () => {
    registration.scrollIntoView({
      behavior: reduced.matches ? "instant" : "smooth",
      block: "start",
    });
    document
      .querySelector("#registration-title")
      .focus({ preventScroll: true });
  });
  scope.defer(() => {
    delete window.programmeBeam;
    document.body.classList.remove("registration-visible");
  });
}
