import { createRoot } from "react-dom/client";
import App from "./App.jsx";
const stylesheet = document.getElementById("site-styles");
const mount = () => {
  if (stylesheet) stylesheet.media = "all";
  createRoot(document.getElementById("root")).render(<App />);
};
const reportStyleError = () => {
  const message = document.getElementById("bootstrap-error");
  if (!message) return;
  message.hidden = false;
  message.textContent = "Не удалось загрузить оформление страницы.";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Повторить";
  retry.addEventListener("click", () => window.location.reload());
  message.append(retry);
};
// The HTML loader can paint before CSS/JS; the scene still needs its real layout.
if (stylesheet?.dataset.failed) reportStyleError();
else if (!stylesheet || stylesheet.sheet) mount();
else {
  stylesheet.addEventListener("load", mount, { once: true });
  stylesheet.addEventListener("error", reportStyleError, { once: true });
}
