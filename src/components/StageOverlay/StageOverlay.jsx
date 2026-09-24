import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { loaderLensSrc } from "../../loader-lens.js";

const REGISTRATION_SCROLL_TOP_GAP = 120;

export function StageOverlay() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  useLayoutEffect(() => {
    // Replace the HTML shell only after the React loader is in the DOM.
    document.getElementById("bootstrap-loader")?.remove();
  }, []);
  useEffect(() => {
    const failed = () => setLoadingError(true);
    const recovered = () => setLoadingError(false);
    window.addEventListener("opening-error", failed);
    window.addEventListener("opening-recovered", recovered);
    return () => {
      window.removeEventListener("opening-error", failed);
      window.removeEventListener("opening-recovered", recovered);
    };
  }, []);
  const navigateTo = (selector, block = "start") => {
    const navigate = () => {
      const target = document.querySelector(selector);
      if (!target) return false;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const behavior = reduced ? "instant" : "smooth";
      if (selector === "#registration-title") {
        const registration = target.closest("#registration");
        const entryOffset = Number.parseFloat(
          registration?.style.getPropertyValue("--registration-entry-y") || "0",
        );
        window.scrollTo({
          top: Math.max(
            0,
            window.scrollY +
              target.getBoundingClientRect().top -
              (Number.isFinite(entryOffset) ? entryOffset : 0) -
              REGISTRATION_SCROLL_TOP_GAP,
          ),
          behavior,
        });
        target.focus({ preventScroll: true });
      } else {
        target.scrollIntoView({ behavior, block });
      }
      return true;
    };
    if (!navigate()) {
      window.addEventListener("lower-content-ready", navigate, { once: true });
      window.dispatchEvent(new window.Event("lower-content-request"));
    }
    setMenuOpen(false);
  };
  const reloadFromTop = (event) => {
    event.preventDefault();
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    window.location.reload();
  };
  return createPortal(
    <>
      <i id="cursor-dot" aria-hidden="true">
        <span className="cursor-dot__pointer" />
      </i>
      <div className="viewport-top-fade" aria-hidden="true" />
      <nav className="scene-nav" aria-label="Навигация">
        <a
          className="scene-logo-link"
          href="/"
          aria-label="Обновить страницу и перейти наверх"
          onClick={reloadFromTop}
        >
          <img
            src="assets/logos/main-mts.svg"
            className="scene-logo"
            alt="МТС ADS"
            fetchPriority="high"
            decoding="async"
          />
        </a>
        <button
          className={`menu-trigger${menuOpen ? " is-open" : ""}`}
          type="button"
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <img
            className="menu-trigger__menu-icon"
            src="assets/inline-edcfeadab87b.svg"
            width="28"
            height="28"
            alt=""
            fetchPriority="high"
            decoding="async"
          />
          <img
            className="menu-trigger__close-icon"
            src="assets/cross.svg"
            width="28"
            height="28"
            alt=""
            fetchPriority="high"
            decoding="async"
          />
        </button>
      </nav>
      <div
        className={`scene-menu${menuOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Меню"
        aria-hidden={!menuOpen}
        inert={!menuOpen ? true : undefined}
      >
        <button
          className="scene-menu__backdrop"
          aria-label="Закрыть меню"
          onClick={() => setMenuOpen(false)}
        />
        <div className="scene-menu__panel">
          <div className="scene-menu__links">
            <button
              type="button"
              onClick={() => navigateTo(".photo-copy", "center")}
            >
              Для кого конференция
            </button>
            <button
              type="button"
              onClick={() => navigateTo("#programme-title")}
            >
              Программа
            </button>
          </div>
          <div className="scene-menu__details">
            <div className="scene-menu__facts" aria-label="Детали мероприятия">
              <div
                className="site-footer__facts"
                aria-label="Информация о мероприятии"
              >
                <div className="site-footer__facts-row">
                  <span className="site-footer__fact site-footer__fact--online">
                    <img
                      src="assets/fact-online.svg"
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                    />
                    <span>Только офлайн</span>
                  </span>
                  <span className="site-footer__fact site-footer__fact--time">
                    <img
                      src="assets/fact-time.svg"
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                    />
                    <span>19 ноября 17:00</span>
                  </span>
                </div>
                <div className="site-footer__facts-row">
                  <span className="site-footer__fact site-footer__fact--address">
                    <img
                      src="assets/fact-address.svg"
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                    />
                    <span>Арбатская площадь, 14, строение 1</span>
                  </span>
                  <span className="site-footer__fact site-footer__fact--cinema">
                    <img
                      src="assets/fact-cinema.svg"
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                    />
                    <span>Кинотеатр «Художественный»</span>
                  </span>
                </div>
              </div>
            </div>
            <button
              className="conference-register scene-menu__register"
              type="button"
              onClick={() => navigateTo("#registration-title")}
            >
              Принять участие
            </button>
          </div>
        </div>
      </div>
      <div className="projector-final" id="projector-final" aria-hidden="true">
        <img
          src="assets/projector-downward.webp"
          className="projector-render projector-final-render"
          fetchPriority="high"
          loading="eager"
          decoding="async"
          width="1782"
          height="889"
          alt=""
        />
      </div>
      <canvas id="light" aria-hidden="true"></canvas>
      <button
        className="conference-register"
        id="conference-register"
        type="button"
        aria-hidden="true"
        inert={true}
        onClick={() => navigateTo("#registration-title")}
      >
        {"Принять участие"}
      </button>
      <div id="page-loader" role="status" aria-label="Загрузка">
        {loadingError && (
          <button
            className="loader-retry"
            type="button"
            onClick={() => window.location.reload()}
          >
            Не удалось загрузить страницу. Повторить
          </button>
        )}
        <span className="lens-loader" aria-hidden="true">
          <img
            className="lens-loader__image"
            src={loaderLensSrc}
            width="516"
            height="488"
            alt=""
            fetchPriority="high"
            decoding="async"
          />
          <span className="lens-loader__lines"></span>
          <span className="lens-loader__lines lens-loader__lines--inner"></span>
        </span>
      </div>
      <canvas id="cursor-data" aria-hidden="true" />
    </>,
    document.body,
  );
}
