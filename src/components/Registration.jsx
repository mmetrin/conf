import { useState, useRef, useLayoutEffect } from "react";
import { formatPhone } from "../utils/phone.js";
import { registrationFields, validateField } from "../utils/validation.js";
import {
  canUseTestModeFallback,
  notifyOrganizer,
  submitConferenceRegistration,
} from "../services/registration/registrationSubmission.js";
import { SendsayFormError } from "../services/sendsay/sendsayFormClient.js";
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
          inputMode={field.name === "phone" ? "tel" : undefined}
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
          onChange={phoneChange}
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
    if (!organizerAlreadyNotified)
      void notifyOrganizer(fields, attempt.current.key);
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
    const signature = JSON.stringify({ ...entered, website: honeypot });
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
      finishSubmission(result.fields);
    } catch (error) {
      if (canUseTestModeFallback(error)) {
        const fallbackSent = await notifyOrganizer(
          entered,
          attempt.current.key,
          { sendsayFallback: true },
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
        setStatus("Проверьте введённые данные и попробуйте ещё раз.");
      } else {
        setStatus(
          "Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.",
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
                на конференцию МТС ADS
              </h3>
            </div>
            <div className="registration__success-details">
              <p>Отправим вам адрес и дату на почту</p>
              <div
                className="registration__success-facts"
                aria-label="Детали мероприятия"
              >
                <div className="registration__success-facts-row">
                  <span className="registration__success-fact">
                    <img
                      src="assets/fact-address.svg"
                      alt=""
                      aria-hidden="true"
                    />
                    <span>Арбатская площадь, 14, строение 1</span>
                  </span>
                  <span className="registration__success-fact">
                    <img
                      src="assets/fact-cinema.svg"
                      alt=""
                      aria-hidden="true"
                    />
                    <span>Кинотеатр «Художественный»</span>
                  </span>
                </div>
                <div className="registration__success-facts-row">
                  <span className="registration__success-fact">
                    <img
                      src="assets/fact-online.svg"
                      alt=""
                      aria-hidden="true"
                    />
                    <span>Только офлайн</span>
                  </span>
                  <span className="registration__success-fact">
                    <img src="assets/fact-time.svg" alt="" aria-hidden="true" />
                    <span>19 ноября 17:00</span>
                  </span>
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
            <p className="registration__policy">
              Продолжая, вы соглашаетесь с&nbsp;
              <a
                href="https://marketolog.mts.ru/cabinet/assets/docs/soglasie_na_obrabotku.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                Политикой обработки персональных данных
              </a>
            </p>
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
    </section>
  );
}
