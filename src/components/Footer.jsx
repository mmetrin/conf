export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__left">
          <p className="site-footer__copyright">
            <a
              className="site-footer__policy"
              href="https://stream.ru/docs/personal_info.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              Политика обработки персональных данных
            </a>
          </p>
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
  );
}
