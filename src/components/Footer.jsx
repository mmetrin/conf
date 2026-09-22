export function Footer() {
  function scrollToProgramme(event) {
    event.preventDefault();
    const target = document.querySelector("#programme-title");
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: reduced ? "instant" : "smooth",
      block: "center",
    });
    target.focus({ preventScroll: true });
  }

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__left">
          <div className="site-footer__nav">
            <img src="assets/logos/main-mts.svg" alt="МТС ADS" />
            <a href="#programme-title" onClick={scrollToProgramme}>
              Программа конференции
            </a>
          </div>
          <p className="site-footer__copyright">
            © 2026 АО «МТС Рекламные технологии» . Все права защищены. 18+
          </p>
        </div>
        <div className="site-footer__facts" aria-label="Информация о мероприятии">
          <div className="site-footer__fact site-footer__fact--schedule">
            <img src="assets/registration/waiting.svg" alt="" aria-hidden="true" />
            <span>Только офлайн</span><i aria-hidden="true" />
            <span>19 ноября</span><i aria-hidden="true" />
            <span>17:00</span>
          </div>
          <div className="site-footer__fact">
            <img src="assets/registration/map-pin.svg" alt="" aria-hidden="true" />
            <span>Арбатская площадь, 14, строение 1</span><i aria-hidden="true" />
            <span>Кинотеатр «Художественный»</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
