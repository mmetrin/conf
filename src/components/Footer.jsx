import { useRef, useState } from "react";
import { PersonalDataConsentModal } from "./PersonalDataConsentModal.jsx";
import { AdvertisingConsentModal } from "./Registration.jsx";

export function Footer() {
  const [privacyConsentOpen, setPrivacyConsentOpen] = useState(false);
  const privacyConsentTrigger = useRef(null);
  const [advertisingConsentOpen, setAdvertisingConsentOpen] = useState(false);
  const advertisingConsentTrigger = useRef(null);

  return (
    <>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__left">
            <div className="site-footer__legal-links">
              <button
                ref={privacyConsentTrigger}
                className="site-footer__policy site-footer__legal-link"
                type="button"
                onClick={() => setPrivacyConsentOpen(true)}
              >
                Политика обработки персональных данных
              </button>
              <button
                ref={advertisingConsentTrigger}
                className="site-footer__advertising-consent site-footer__legal-link"
                type="button"
                onClick={() => setAdvertisingConsentOpen(true)}
              >
                Согласие на анонс-рассылку
              </button>
            </div>
            <p className="site-footer__copyright">
              © 2026 АО «МТС Рекламные технологии».{" "}
              <span className="site-footer__rights">
                Все права защищены. 18+
              </span>
            </p>
          </div>
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
      </footer>
      {privacyConsentOpen && (
        <PersonalDataConsentModal
          onClose={() => setPrivacyConsentOpen(false)}
          returnFocusRef={privacyConsentTrigger}
        />
      )}
      {advertisingConsentOpen && (
        <AdvertisingConsentModal
          onClose={() => setAdvertisingConsentOpen(false)}
          returnFocusRef={advertisingConsentTrigger}
        />
      )}
    </>
  );
}
