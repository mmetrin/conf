import { getHeroScale } from "../utils/desktopScale.js";

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
    registrationContent = registration.querySelector(".registration__inner"),
    items = [...programme.querySelectorAll(".programme__item")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    mobile = matchMedia("(max-width: 599px)"),
    written = new WeakMap();
  let metrics = null,
    previousEntryY = 0,
    previousRegistrationEntryY = 0,
    pending = 0,
    writeFrame = 0,
    abstractLocked = false,
    particleTransitionActive = true,
    previousScrollY = window.scrollY;
  function setParticleTransitionActive(active) {
    if (active === particleTransitionActive) return;
    particleTransitionActive = active;
    window.dispatchEvent(
      new window.CustomEvent("audience-transition-active", {
        detail: { active },
      }),
    );
  }
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
    // Mobile sections remain in document flow, without the desktop timeline.
    if (mobile.matches) {
      const height = window.innerHeight;
      const programmeTitleTop = programmeTitle.getBoundingClientRect().top;
      const trackTop = track.getBoundingClientRect().top;
      const focus = height * 0.5;
      if (!metrics)
        metrics = items.map((item) => {
          const rect = item.getBoundingClientRect();
          return { top: rect.top - trackTop, bottom: rect.bottom - trackTop };
        });
      const levels = metrics.map((item) => {
        const distance = Math.abs((item.top + item.bottom) / 2 + trackTop - focus);
        // Match the reference's moving reflection: the active row is fully lit,
        // adjacent rows retain a soft spill, and distant rows settle near dark.
        const sigma = Math.min(170, height * 0.2);
        return Math.exp(-(distance * distance) / (2 * sigma * sigma)).toFixed(3);
      });
      // Reveal only as the heading enters the top 80px, after the audience.
      const smokeReveal = ease(clamp((80 - programmeTitleTop) / 80));
      // The mobile particle portrait is static, but deactivate its controller
      // once the programme approaches so resize/style changes cannot repaint it.
      setParticleTransitionActive(programmeTitleTop > height);
      scope.cancel(writeFrame);
      scene.classList.remove("programme-exiting", "programme-pinned");
      document.body.classList.remove("registration-visible");
      writeFrame = scope.request(() => {
        commit(track, "--programme-line-y", (focus - trackTop).toFixed(1) + "px");
        items.forEach((item, index) => commit(item, "--focus", levels[index]));
        abstractLights?.show(smokeReveal);
      });
      return;
    }
    // All layout reads are performed together, before any of this frame's writes.
    const height = scene.clientHeight,
      heroScale = getHeroScale(scene.clientWidth, height),
      remaining = journey.getBoundingClientRect().bottom - height;
    const programmeRect = programme.getBoundingClientRect(),
      programmeTitleRect = programmeTitle.getBoundingClientRect(),
      registrationRect = registration.getBoundingClientRect();
    const progress = clamp(1 - remaining / Math.max(1, height * 0.5)),
      fade = ease(progress);
    // Freeze both portrait canvases before the programme transition begins.
    // Their last frame remains visible and follows the existing CSS exit, while
    // the main thread is left to the scroll geometry, beam and programme reveal.
    setParticleTransitionActive(progress <= 0.001);
    const entry = ease(
        clamp((height * 0.9 - programmeRect.top) / Math.max(1, height * 0.5)),
      ),
      entryY = height * 0.16 * (1 - entry);
    const formEntry = ease(
        clamp(
          (height * 0.9 - registrationRect.top) /
            Math.max(1, height * 0.5),
        ),
      ),
      formEntryY = height * 0.16 * (1 - formEntry);
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
    // Begin fading only in the top 18% of the viewport; finish above it.
    // Keep this independent of the projector lens so resize cannot move the mask.
    const darkEdge = -height * 0.18,
      litEdge = height * 0.18;
    let focusState = null,
      registrationEdges = null;
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
        focus = height * (mobile.matches ? 0.5 : 0.48);
      focusState = {
        lineY: (focus - trackTop).toFixed(1) + "px",
        edges: [
          darkEdge,
          darkEdge + (litEdge - darkEdge) * 0.45,
          darkEdge + (litEdge - darkEdge) * 0.75,
          litEdge,
        ].map((v) => (v - contentTop).toFixed(1) + "px"),
        levels: metrics.map((item) => {
          const centerOffset = (item.top + item.bottom) / 2 + trackTop - focus;
          const distance = Math.abs(centerOffset);
          // Above the focus line, only the top mask dims outgoing content.
          const entryDistance = Math.max(0, centerOffset);
          return {
            opacity: (
              0.3 +
              0.7 * ease(clamp(1 - entryDistance / (height * 0.3)))
            ).toFixed(3),
            scale: reduced.matches || mobile.matches
              ? "1"
              : (
                  0.84 +
                  0.34 * ease(clamp(1 - distance / (height * 0.18)))
                ).toFixed(4),
          };
        }),
      };
    }
    if (
      registrationRect.top < height + 100 &&
      registrationRect.bottom > -100
    ) {
      const registrationContentRect =
        registrationContent.getBoundingClientRect();
      const contentTop =
        registrationContentRect.top -
        previousRegistrationEntryY +
        formEntryY;
      registrationEdges = [
        darkEdge,
        darkEdge + (litEdge - darkEdge) * 0.45,
        darkEdge + (litEdge - darkEdge) * 0.75,
        litEdge,
      ].map((value) => (value - contentTop).toFixed(1) + "px");
    }
    scope.cancel(writeFrame);
    writeFrame = scope.request(() => {
      commit(
        scene,
        "--copy-exit-y",
        (-height * 0.38 * heroScale * progress).toFixed(2) + "px",
      );
      commit(scene, "--copy-exit-opacity", (1 - fade).toFixed(4));
      commit(programme, "--programme-entry-y", entryY.toFixed(2) + "px");
      commit(
        programme,
        "--programme-entry-opacity",
        (0.35 + 0.65 * entry).toFixed(4),
      );
      previousEntryY = entryY;
      scene.classList.toggle("programme-exiting", progress > 0);
      scene.classList.toggle("programme-pinned", remaining <= 0);
      commit(
        registration,
        "--registration-entry-y",
        formEntryY.toFixed(2) + "px",
      );
      commit(
        registration,
        "--registration-entry-opacity",
        String(0.35 + 0.65 * formEntry),
      );
      previousRegistrationEntryY = formEntryY;
      if (registrationEdges)
        ["dark", "dim", "soft", "lit"].forEach((name, index) =>
          commit(
            registrationContent,
            `--registration-${name}-edge`,
            registrationEdges[index],
          ),
        );
      document.body.classList.toggle(
        "registration-visible",
        registrationRect.top < height * 0.7 &&
          registrationRect.bottom > height * 0.2,
      );
      // The fixed projector and beam remain visible through registration/footer.
      // Scene visibility and page lifecycle own suspension, not section entry.
      if (abstractLights) abstractLights.show(abstractLocked ? 1 : active ? abstractReveal : 0);
      if (focusState) {
        commit(track, "--programme-line-y", focusState.lineY);
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
  scope.listen(window, "scroll", schedule, { passive: true });
  scope.listen(window, "resize", invalidate, { passive: true });
  scope.listen(reduced, "change", schedule);
  scope.listen(mobile, "change", invalidate);
  const observer = new ResizeObserver(invalidate);
  [journey, programme, registration].forEach((node) => observer.observe(node));
  scope.defer(() => observer.disconnect());
  if (typeof IntersectionObserver === "function") {
    const assetObserver = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        registration.classList.add("assets-ready");
        assetObserver.disconnect();
      },
      { rootMargin: "1200px 0px" },
    );
    scope.observe(assetObserver, registration);
  } else registration.classList.add("assets-ready");
  fontsReady.then(() => {
    if (!scope.disposed) invalidate();
  }, () => {}); // Critical loading owns the error/retry UI.
  schedule();
  scope.defer(() => {
    setParticleTransitionActive(true);
    delete window.programmeBeam;
    document.body.classList.remove("registration-visible");
    registration.classList.remove("assets-ready");
  });
}
