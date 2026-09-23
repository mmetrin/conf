import { useState } from "react";
import { createPortal } from "react-dom";
export function StageOverlay() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigateTo = (selector) => {
    const navigate = () => {
      const target = document.querySelector(selector);
      if (!target) return false;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({
        behavior: reduced ? "instant" : "smooth",
        block: "start",
      });
      if (selector === "#registration")
        document
          .querySelector("#registration-title")
          ?.focus({ preventScroll: true });
      return true;
    };
    if (!navigate()) {
      window.addEventListener("lower-content-ready", navigate, { once: true });
      window.dispatchEvent(new window.Event("lower-content-request"));
    }
    setMenuOpen(false);
  };
  return createPortal(
    <>
      <i id="cursor-dot" aria-hidden="true" />
      <nav className="scene-nav" aria-label="Навигация">
        <img
          src="assets/logos/main-mts.svg"
          className="scene-logo"
          alt="МТС ADS"
          fetchPriority="high"
          decoding="async"
        />
        <button
          className="menu-trigger"
          type="button"
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <img
            src="assets/inline-edcfeadab87b.svg"
            width="28"
            height="28"
            alt=""
            fetchPriority="high"
            decoding="async"
          />
        </button>
      </nav>
      {menuOpen && (
        <div className="scene-menu" role="dialog" aria-modal="true" aria-label="Меню">
          <button className="scene-menu__backdrop" aria-label="Закрыть меню" onClick={() => setMenuOpen(false)} />
          <div className="scene-menu__panel">
            <div className="scene-menu__links">
              <button type="button" onClick={() => navigateTo("#photo-title")}>Для кого конференция</button>
              <button type="button" onClick={() => navigateTo("#programme-title")}>Программа</button>
              <button className="scene-menu__cta" type="button" onClick={() => navigateTo("#registration")}>Принять участие</button>
            </div>
            <div className="scene-menu__facts" aria-label="Детали мероприятия">
              <span><img src="assets/fact-address.svg" alt="" />Арбатская площадь, 14, строение 1</span>
              <span><img src="assets/fact-cinema.svg" alt="" />Кинотеатр «Художественный»</span>
              <span><img src="assets/fact-online.svg" alt="" />Только офлайн</span>
              <span><img src="assets/fact-time.svg" alt="" />19 ноября 17:00</span>
            </div>
          </div>
        </div>
      )}
      <div className="projector-final" id="projector-final" aria-hidden="true">
        <img
          src="assets/projector-downward.webp"
          className="projector-render projector-final-render"
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
        onClick={() => navigateTo("#registration")}
      >
        {"Принять участие"}
      </button>
      <div id="page-loader" role="status" aria-label="Загрузка">
        <span className="lens-loader" aria-hidden="true">
          <img
            className="lens-loader__image"
            src="assets/inline-9537aceeaf6a.webp"
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
