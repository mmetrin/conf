import { useLayoutEffect, useRef, useState } from "react";
import { formatPhone } from "../utils/phone.js";
import { registrationFields, validateField } from "../utils/validation.js";
import { ConsentModal } from "./ConsentModal.jsx";
import { PersonalDataConsentModal } from "./PersonalDataConsentModal.jsx";
import {
  canUseTestModeFallback,
  notifyOrganizer,
  submitConferenceRegistration,
} from "../services/registration/registrationSubmission.js";
import { SendsayFormError } from "../services/sendsay/sendsayFormClient.js";

export function AdvertisingConsentModal({ onClose, returnFocusRef }) {
  return (
    <ConsentModal
      title="Согласие на рекламное взаимодействие"
      titleId="advertising-consent-title"
      onClose={onClose}
      returnFocusRef={returnFocusRef}
    >
      <p>
        Я даю ООО «МТС Рекламные технологии» (далее – Оператор) (Юридический
        адрес: 115432, Москва, Проектируемый проезд 4062, д. 6, стр. 2,
        комн. 22, ОГРН 1097746431903, ИНН 7705893691) настоящее согласие
        (далее – Согласие) на следующих условиях:
      </p>
      <ol>
        <li>
          Реклама отправляется в целях совершенствования и развития Оператором
          деятельности в части, касающейся предложения и продвижения собственной
          продукции и бренда и/или продукции и бренда третьих лиц, указанных
          в п. 3 Согласия, на рынке путем осуществления маркетинговых
          коммуникаций (рекламного взаимодействия), в том числе путем
          направления персональных предложений и рекламных сообщений, а также
          путем демонстрации (в т.ч. в сети Интернет) персонализированной
          и (или) неперсонализированной рекламы.
        </li>
        <li>
          Для рекламного взаимодействия могут использоваться также результаты
          сопоставления(сравнения) и объединения (связывания) данных между
          собой, например, с файлами cookies.
        </li>
        <li>
          Оператор вправе для достижения цели привлекать[1] третьих лиц
          к рекламному взаимодействию, к которым могут относиться поставщики
          услуг по осуществлению информационного и маркетингового взаимодействия
          (в т.ч. с помощью Интернет-ресурсов и средств связи) и организации,
          входящие в группу компаний, включая, но не ограничиваясь:
          <ul>
            <li>
              ООО «ЯНДЕКС» (Юридический адрес: 119021, г. Москва, ул. Льва
              Толстого, д.16; ИНН: 7736207543, КПП: 770401001,
              ОГРН 1027700229193);
            </li>
            <li>
              ООО «ВК» (Юридический адрес: 125167, г. Москва, вн.тер.г.
              Муниципальный Округ Хорошевский, пр-кт Ленинградский, д. 39,
              стр. 79; ИНН: 7743001840, КПП: 771401001, ОГРН 1027739850962);
            </li>
            <li>
              ООО «РА «Индекс 20» (Юридический адрес: 117105, г. Москва,
              ш. Варшавское, д. 9, стр. 1, пом. Б часть комнаты № 38);
            </li>
            <li>
              ООО «МТС АДС ВИДЕО» (Юридический адрес: 115432, г. Москва, проезд
              Проектируемый 4062-й, д. 6, стр. 2, БЦ «Порт Плаза»,
              ОГРН 5157746165660, ИНН 7706431241)
            </li>
          </ul>
        </li>
        <li>
          Сообщения могут направляться мне по указанным мной контактным данным
          посредством электронной почты, sms-рассылки по сетям электросвязи,
          в том числе посредством использования телефонной, подвижной
          радиотелефонной связи, сообщений в социальных сетях и мессенджерах.
        </li>
        <li>
          Согласие действует с даты его предоставления до истечения 10 лет или
          до предоставления отзыва Согласия, если предусмотренная цель не будет
          достигнута ранее или в случае утраты необходимости в достижении цели.
        </li>
        <li>
          Мне понятно, что отказ от дачи Согласия, а равно отзыв Согласия
          создаст негативные последствия в отношении меня, затронув мои права
          и законные интересы иным образом, так как без дачи Согласия не может
          быть достигнута цель, указанная в п. 1 Согласия. В случае отзыва
          Согласия Оператор вправе продолжить обработку персональных данных при
          наличии оснований, указанных в п. 2 - 11 ч. 1 ч. 6 ФЗ РФ
          «О персональных данных» от 27.07.2006 N 152-ФЗ.
        </li>
        <li>
          Отказ от получения рекламных сообщений может быть реализован также
          путем перехода по ссылке «Отписаться от рассылки»;
        </li>
        <li>
          Мне понятно, что дополнительная информация об обработке персональных
          данных ООО «МТС Рекламные технологии» в рамках рекламного
          взаимодействия содержится в Политике в отношении обработки
          персональных данных ООО «МТС Рекламные технологии», которая размещена
          по адресу:{" "}
          <a
            href="https://stream.ru/docs/personal_info.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://stream.ru/docs/personal_info.pdf
          </a>
        </li>
      </ol>
      <p className="consent-modal__footnote">
        <em>
          [1] При условии соблюдение конфиденциальности, требований
          законодательства и исполнения обозначенных целей. В случае
          неисполнения третьими лицами данных условий они будут нести
          ответственность на основании своих договорных обязательств перед
          Оператором и (или) в соответствии с положениями применимого
          законодательства.
        </em>
      </p>
    </ConsentModal>
  );
}

export function RegistrationField({
  field,
  value,
  error,
  onChange,
  onBlur,
  disabled = false,
  readOnly = false,
  loading = false,
}) {
  const id = "registration-" + field.name;
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null),
    caret = useRef(null);
  useLayoutEffect(() => {
    if (caret.current !== null && inputRef.current) {
      inputRef.current.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  });
  function phoneChange(event) {
    if (field.name !== "phone") return onChange(event);
    const input = event.target;
    const raw = input.value;
    const position = input.selectionStart ?? raw.length;
    const formatted = formatPhone(raw);
    const digitsBefore = raw.slice(0, position).replace(/\D/g, "").length;
    let next = 3,
      count = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) count++;
      if (count >= digitsBefore) {
        next = Math.max(3, i + 1);
        break;
      }
    }
    if (position === raw.length) next = formatted.length;
    caret.current = next;
    onChange({ target: { value: formatted } });
    input.value = formatted;
    input.setSelectionRange(next, next);
  }
  function inputChange(event) {
    if (field.name === "phone") return phoneChange(event);
    if (field.name === "email") {
      const input = event.target;
      const sanitized = input.value.replace(/[^A-Za-z0-9@._%+-]/g, "");
      if (sanitized !== input.value) input.value = sanitized;
      return onChange({ target: { value: sanitized } });
    }
    onChange(event);
  }
  return (
    <div
      className={
        "registration-field" +
        (field.full ? " registration-field--full" : "") +
        (value && !(field.name === "phone" && value.trim() === "+7")
          ? " is-filled"
          : "") +
        (error ? " is-invalid" : "") +
        (loading ? " is-skeleton" : "")
      }
      inert={loading}
      aria-busy={loading || undefined}
    >
      <div className="registration-field__control">
        <label htmlFor={id}>{field.label}</label>
        <input
          ref={inputRef}
          inputMode={
            field.name === "phone"
              ? "numeric"
              : field.name === "email"
                ? "email"
                : undefined
          }
          id={id}
          name={field.name}
          type={field.type}
          autoComplete={field.autoComplete}
          minLength={field.minLength}
          placeholder={focused ? field.placeholder || field.label : field.label}
          required
          value={value}
          disabled={disabled}
          readOnly={readOnly}
          onChange={inputChange}
          onKeyDown={(event) => {
            if (
              field.name !== "phone" ||
              readOnly ||
              !["Backspace", "Delete"].includes(event.key)
            )
              return;
            const input = event.currentTarget,
              start = input.selectionStart,
              end = input.selectionEnd;
            if (start !== end) return;
            if (event.key === "Backspace" && start <= 3) {
              event.preventDefault();
              return;
            }
            const offset = event.key === "Backspace" ? start - 1 : start;
            if (/[ -]/.test(value[offset] || "")) {
              event.preventDefault();
              let index = offset;
              const direction = event.key === "Backspace" ? -1 : 1;
              while (
                index >= 3 &&
                index < value.length &&
                /[ -]/.test(value[index])
              )
                index += direction;
              if (index < 3 || index >= value.length) return;
              input.value = value.slice(0, index) + value.slice(index + 1);
              input.setSelectionRange(index, index);
              phoneChange({ target: input });
            }
          }}
          onFocus={() => {
            setFocused(true);
            if (field.name === "phone" && !value)
              onChange({ target: { value: "+7 " } });
          }}
          onBlur={(event) => {
            setFocused(false);
            if (field.name === "phone" && value.trim() === "+7")
              onChange({ target: { value: "" } });
            onBlur(event);
          }}
          aria-invalid={!!error}
          aria-describedby={id + "-error"}
        />
        {field.name === "phone" && focused && value.trim() === "+7" && (
          <span className="registration-field__phone-hint" aria-hidden="true">
            913 123-45-67
          </span>
        )}
      </div>
      <p
        className="registration-field__error"
        id={id + "-error"}
        hidden={!error}
      >
        {error}
      </p>
    </div>
  );
}
export function Registration() {
  const [values, setValues] = useState(() =>
    Object.fromEntries(registrationFields.map((f) => [f.name, ""])),
  );
  const [submitted, setSubmitted] = useState(false);
  const [reminderConsent, setReminderConsent] = useState(true);
  const [consentOpen, setConsentOpen] = useState(false);
  const consentTrigger = useRef(null);
  const [privacyConsentOpen, setPrivacyConsentOpen] = useState(false);
  const privacyConsentTrigger = useRef(null);
  const [sending, setSending] = useState(false);
  const submitting = useRef(false);
  const attempt = useRef(null);
  const [errors, setErrors] = useState({}),
    [status, setStatus] = useState("");
  const touched = useRef(new Set()),
    form = useRef(null);
  function change(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setStatus("");
    if (touched.current.has(name))
      setErrors((current) => ({
        ...current,
        [name]: validateField(
          name,
          value,
          form.current?.elements.namedItem(name).validity,
        ),
      }));
  }
  function blur(name) {
    touched.current.add(name);
    setErrors((current) => ({
      ...current,
      [name]: validateField(
        name,
        values[name],
        form.current?.elements.namedItem(name).validity,
      ),
    }));
  }
  function finishSubmission(fields, organizerAlreadyNotified = false) {
    setSubmitted(true);
    setValues(
      Object.fromEntries(registrationFields.map((field) => [field.name, ""])),
    );
    setReminderConsent(false);
    if (!organizerAlreadyNotified)
      void notifyOrganizer(fields, attempt.current.key, { reminderConsent });
    attempt.current = null;
  }
  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    const next = {};
    // Read the actual controls too, so browser autofill is included even without an input event.
    const entered = Object.fromEntries(
      registrationFields.map((field) => [
        field.name,
        form.current.elements.namedItem(field.name).value,
      ]),
    );
    setValues(entered);
    for (const field of registrationFields) {
      touched.current.add(field.name);
      next[field.name] = validateField(
        field.name,
        entered[field.name],
        form.current.elements.namedItem(field.name).validity,
      );
    }
    setErrors(next);
    const first = registrationFields.find((field) => next[field.name]);
    if (first) {
      setStatus("");
      form.current.elements.namedItem(first.name).focus();
      return;
    }
    const formData = Object.fromEntries(new FormData(form.current));
    const honeypot =
      typeof formData.website === "string" ? formData.website : "";
    const signature = JSON.stringify({
      ...entered,
      website: honeypot,
      reminderConsent,
    });
    if (!attempt.current || attempt.current.signature !== signature)
      attempt.current = { signature, key: crypto.randomUUID() };
    submitting.current = true;
    setSending(true);
    setStatus("");
    try {
      if (
        location.protocol !== "https:" &&
        !["127.0.0.1", "localhost"].includes(location.hostname)
      )
        throw new Error();
      const result = await submitConferenceRegistration({
        fields: entered,
        honeypot,
      });
      if (!result.ok) {
        if (result.kind === "validation") setErrors(result.fieldErrors);
        return;
      }
      if (reminderConsent) {
        const reminderSaved = await notifyOrganizer(
          result.fields,
          attempt.current.key,
          { reminderConsent: true },
        );
        if (!reminderSaved) {
          setStatus(
            "Регистрация сохранена, но подключить напоминания не удалось. Попробуйте ещё раз позже.",
          );
          return;
        }
        finishSubmission(result.fields, true);
        return;
      }
      finishSubmission(result.fields);
    } catch (error) {
      if (canUseTestModeFallback(error)) {
        const fallbackSent = await notifyOrganizer(
          entered,
          attempt.current.key,
          { sendsayFallback: true, reminderConsent },
        );
        if (fallbackSent) {
          finishSubmission(entered, true);
          return;
        }
      }
      if (error instanceof SendsayFormError && error.kind === "invalid_email") {
        setErrors((current) => ({
          ...current,
          email: "Проверьте адрес почты",
        }));
        form.current?.elements.namedItem("email")?.focus();
        setStatus("");
      } else if (
        error instanceof SendsayFormError &&
        error.kind === "configuration"
      ) {
        setStatus("Регистрация временно недоступна. Попробуйте ещё раз позже.");
      } else if (
        error instanceof SendsayFormError &&
        error.kind === "form_error"
      ) {
        setStatus("Проверьте введённые данные и попробуйте ещё раз.");
      } else {
        setStatus(
          "Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.",
        );
      }
    } finally {
      submitting.current = false;
      setSending(false);
    }
  }
  return (
    <section
      className="registration"
      id="registration"
      aria-labelledby="registration-title"
    >
      <div className="registration__ribbon" aria-hidden="true" />
      <div className="registration__inner">
        <h2 id="registration-title" tabIndex={-1}>
          До встречи
          <br />
          в «Художественном»
        </h2>
        {submitted ? (
          <div
            className="registration__form registration__success"
            role="status"
            aria-live="polite"
          >
            <div className="registration__success-heading">
              <div className="registration__success-check">
                <img
                  src="assets/registration/check.svg"
                  width="32"
                  height="32"
                  alt=""
                />
              </div>
              <h3>
                Вы зарегистрированы
                <br />
                на конференцию МТС ADS
              </h3>
            </div>
            <div className="registration__success-details">
              <p>Отправим вам адрес и дату на почту</p>
              <div
                className="registration__success-facts"
                aria-label="Детали мероприятия"
              >
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
            </div>
          </div>
        ) : (
          <form
            className="registration__form"
            id="registration-form"
            ref={form}
            noValidate
            onSubmit={submit}
            aria-busy={sending}
          >
            <h3>Участие по предварительной регистрации</h3>
            <div className="registration__honeypot" aria-hidden="true">
              <label>
                Website
                <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <div className="registration__fields">
              {registrationFields.map((field) => (
                <RegistrationField
                  key={field.name}
                  field={field}
                  readOnly={sending}
                  value={values[field.name]}
                  error={errors[field.name]}
                  onChange={(event) => change(field.name, event.target.value)}
                  onBlur={() => blur(field.name)}
                />
              ))}
            </div>
            <button
              className="registration__submit"
              type="submit"
              disabled={sending}
            >
              {sending ? "Отправляем…" : "Принять участие"}
            </button>
            <div className="registration__consents">
              <p className="registration__policy">
                Продолжая, я соглашаюсь{" "}
                <a
                  ref={privacyConsentTrigger}
                  href="#personal-data-consent-title"
                  aria-haspopup="dialog"
                  onClick={(event) => {
                    event.preventDefault();
                    setPrivacyConsentOpen(true);
                  }}
                >
                  с Политикой обработки персональных данных
                </a>
              </p>
              <div className="registration__reminder-consent">
                <input
                  id="registration-reminder-consent"
                  name="reminderConsent"
                  type="checkbox"
                  checked={reminderConsent}
                  disabled={sending}
                  aria-labelledby="registration-reminder-label registration-reminder-link"
                  onChange={(event) => setReminderConsent(event.target.checked)}
                />
                <div>
                  <label
                    id="registration-reminder-label"
                    htmlFor="registration-reminder-consent"
                  >
                    Отправьте мне{" "}
                  </label>
                  <button
                    ref={consentTrigger}
                    id="registration-reminder-link"
                    type="button"
                    onClick={() => setConsentOpen(true)}
                  >
                    анонс-напоминание о мероприятии
                  </button>
                </div>
              </div>
            </div>
            <p
              className="registration__status"
              role="status"
              aria-live="polite"
              hidden={!status}
            >
              {status}
            </p>
          </form>
        )}
      </div>
      {consentOpen && (
        <AdvertisingConsentModal
          onClose={() => setConsentOpen(false)}
          returnFocusRef={consentTrigger}
        />
      )}
      {privacyConsentOpen && (
        <PersonalDataConsentModal
          onClose={() => setPrivacyConsentOpen(false)}
          returnFocusRef={privacyConsentTrigger}
        />
      )}
    </section>
  );
}
