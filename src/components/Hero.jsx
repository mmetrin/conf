import { createPortal } from "react-dom";
import { ThreeParticleShape } from "./ThreeParticleShape.jsx";
export function Hero() {
  return (
    <section
      className="journey"
      id="journey"
      aria-label="Интерактивная световая сцена. Прокручивайте страницу или используйте ползунок."
    >
      <div className="scene" id="scene">
        <canvas id="invitation-particles" aria-hidden="true"></canvas>
        <div className="projector" id="projector" aria-hidden="true">
          <img
            src="assets/projector-realistic.webp"
            className="projector-render projector-front"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            width="1777"
            height="885"
            alt=""
          />
          <img
            src="assets/projector-realistic.webp"
            className="projector-lamp-glass"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            width="1777"
            height="885"
            alt=""
            aria-hidden="true"
          />
          <span className="projector-lamp" aria-hidden="true"></span>
        </div>
        <div
          className="object"
          role="img"
          aria-label="Светящийся куб данных под лучом проектора"
        >
          <canvas
            className="receiver-picture"
            role="img"
            aria-label="Куб данных со светящимися элементами"
          ></canvas>
          <canvas className="floor-signals" aria-hidden="true"></canvas>
        </div>
        <div className="vignette"></div>
        <section className="photo-copy" aria-labelledby="photo-title">
          <ThreeParticleShape side="left" seedOffset={731} />
          <ThreeParticleShape side="right" />
          <div className="photo-copy__mobile-symbols" aria-hidden="true">
            <span>01</span>
            <span>{"λ"}</span>
            <span>{"<>"}</span>
            <span>{"{}"}</span>
            <span>{"Σ"}</span>
            <span>{"/+"}</span>
          </div>
          <div className="photo-copy__content">
            <h2 className="photo-title" id="photo-title" aria-hidden="true">
              {"Мероприятие"}
              <br aria-hidden="true" />
              {"для тех, кто задаёт"}
              <br aria-hidden="true" />
              {"направление рынку"}
            </h2>
            <p
              className="photo-subtitle"
              id="photo-subtitle"
              aria-hidden="true"
            >
              {
                "На одной площадке встретятся лидеры брендов и агентств — те, кто принимает решения и формирует новые подходы к работе с рекламой"
              }
            </p>
            <div className="photo-roles" id="photo-roles" aria-hidden="true">
              <div className="photo-roles__row">
                <span className="photo-roles__item">
                  <img
                    className="photo-roles__icon"
                    src="assets/roles-marketing.svg"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <span>{"Директора по маркетингу"}</span>
                </span>
                <span className="photo-roles__item">
                  <img
                    className="photo-roles__icon"
                    src="assets/roles-agencies.svg"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <span>{"Топы рекламных агенств"}</span>
                </span>
              </div>
              <div className="photo-roles__row">
                <span className="photo-roles__item">
                  <img
                    className="photo-roles__icon"
                    src="assets/roles-c-level.svg"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <span>{"C-level и senior-стратеги"}</span>
                </span>
                <span className="photo-roles__item">
                  <img
                    className="photo-roles__icon"
                    src="assets/roles-digital.svg"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <span>{"Digital Directors"}</span>
                </span>
              </div>
            </div>
          </div>
        </section>
        <div
          className="photo-dimmer"
          id="photo-dimmer"
          aria-hidden="true"
        ></div>
        {createPortal(
          <>
            <canvas id="abstract-lights" aria-hidden="true"></canvas>
            <canvas id="abstract-data" aria-hidden="true"></canvas>
          </>,
          document.body,
        )}
        <div className="intro-accessible" aria-hidden="true"></div>
      </div>
    </section>
  );
}
