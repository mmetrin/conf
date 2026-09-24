# Передача МТС Ads разработчикам

## Что передаётся

React 19 сайт с прямой browser-side интеграцией Sendsay Form API и Node.js endpoint `POST /api/register`. `npm run build` создаёт `outputs/mts-ads-portrait-frames-current.html`, fingerprinted JS/CSS и precompressed `.br`/`.gz` text assets; `server/start.mjs` раздаёт сборку и подключает registration handler.

Sendsay — source of truth для контакта и дальнейшей email-коммуникации. Success означает, что Sendsay принял форму; последующая ошибка `/api/register` не отменяет регистрацию. Собственной subscriber database нет. Frontend не знает Resend/SMTP credentials, sender или organizer recipient.

## Архитектура регистрации

```text
src/services/sendsay/sendsayConfig.js       public build config/field mapping
src/services/sendsay/sendsayFormClient.js   Form API payload, timeout, response contract
src/services/registration/registrationSubmission.js normalization, validation, notification isolation
src/components/Registration.jsx             form UI and submit lock
server/register.mjs                         composition/configuration
server/registration/registrationHandler.mjs HTTP orchestration
server/registration/registrationService.mjs registration use-case
server/registration/registrationValidation.mjs server validation/normalization
server/email/emailService.mjs               provider-independent boundary/recipient rules
server/email/registrationEmail.mjs          text-only message builder
server/email/providers/resendEmailProvider.mjs Resend adapter
server/security/*                           IP resolution/HMAC/rate limiter
server/http/*                               bounded body parser/JSON response
server/config/registrationConfig.mjs        server env and constants
shared/registrationValidation.js            shared frontend/backend field rules
server/http/staticFileHandler.mjs           streamed static delivery, cache and compression selection
server/server.mjs                           HTTP routing and server timeout wiring
server/config/serverConfig.mjs              port, bind host, static root and entry document
```

Текущий поток:

```text
Registration UI
→ submitConferenceRegistration
→ POST https://sendsay.ru/form/<ACCOUNT>/<FORM_ID>/
→ при согласии: дождаться POST /api/register → Sendsay import webhook
→ success UI
→ EmailService → ResendEmailProvider → Resend → organizer
```

Form API никогда не вызывается с backend и не требует secret API key. Email передаётся только как `_member_email`. Остальные поля строятся по конфигурации; honeypot в Sendsay не попадает. Resend-specific endpoint, authorization, payload, idempotency header и timeout находятся только в server provider adapter.

Ссылка на политику под формой и одноимённая ссылка в футере открывают общий popup «Согласие на обработку персональных данных». Внешние URL внутри юридического текста продолжают открываться как обычные ссылки.

Чекбокс напоминаний необязательный и включён по умолчанию; посетитель может снять его перед отправкой формы. Регистрация через Form API не зависит от него. При `reminderConsent=true` frontend ждёт ответ backend, а backend отправляет в `SENDSAY_IMPORT_WEBHOOK_URL` JSON с ключами `email`, `name`, `phone`, `company`, `role`, `event_datetime`, `reminder_consent`, `reminder_consent_version`, `reminder_consent_at`, `source`. URL хранится только в server env; в frontend bundle и Git его добавлять нельзя. Владелец Sendsay должен настроить webhook на подтверждённый/доступный для рассылки статус и запуск сценария только для согласившихся контактов.

## Sendsay: полученные данные и что ещё нужно

| Что                            | Значение / статус                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Account code                   | `mtsmarketolog`                                                                                                       |
| Form ID                        | `24`; используется на production, публичный GET Form API подтвердил `state: 1`                                        |
| Test audience list             | `pl58174`                                                                                                             |
| Email field                    | `_member_email`                                                                                                       |
| Фамилия и имя                  | `q1`, required text, max 160                                                                                          |
| Телефон                        | `q2`, required text, max 16                                                                                           |
| Компания                       | `q3`, required text, max 200                                                                                          |
| Должность                      | `q4`, required text, max 200                                                                                          |
| Дата мероприятия               | `q5`, скрытое поле даты; значение `2026-11-19 17:00:00` по московскому времени                                        |
| Event ID                       | не используется                                                                                                       |
| Адрес                          | Арбатская площадь, 14, строение 1, кинотеатр «Художественный»                                                         |
| Test workflow                  | «Конференция МТС Ads — 19.11.2026 — TEST», ID `52`; `https://app.sendsay.ru/automation/workflows/52/overview/summary` |
| Production Form ID             | `24`; отдельная production-копия не создаётся                                                                         |
| Production audience            | выбирается внутри production-формы; название/ID проекту не требуются                                                  |
| Production form active         | да; подтверждено владельцем Sendsay                                                                                   |
| Email logic/templates/schedule | ведутся владельцем Sendsay; не требуются коду формы и могут меняться независимо                                       |

Build-time переменные перечислены в `.env.example`. Локальный `.env` настроен на production Form ID `24` с `SENDSAY_USE_TEST_FORM=false`. Отдельная production-копия формы не требуется.

Нельзя угадывать codes или добавлять API key в frontend. Если обязательная конфигурация отсутствует, клиент прекращает submit до network request. General Sendsay API key, если когда-либо понадобится, должен быть только server-side и выдан саблогину с минимальными правами.

## Sendsay UI checklist

1. Выполнить test registration через сайт и проверить контакт в списке `pl58174`, значения `_member_email`, `q1–q5` и запуск писем без подтверждения со стороны посетителя.
2. Владельцу Sendsay поддерживать test workflow «Конференция МТС Ads — 19.11.2026 — TEST» (ID `52`), шаблоны и расписание; передавать их разработчику формы не требуется.
3. Использовать форму `24` на production и назначить ей нужный список внутри Sendsay; отдельная копия и ID списка разработчику не нужны.
4. Проверить в production-форме поля `_member_email`, `q1–q5`; для `q5` использовать `2026-11-19 17:00:00`.
5. Не требовать от посетителя подтверждать email или переходить по дополнительной ссылке.
6. Оставить форму `24` активной; GET уже подтвердил `state: 1`, required/types и codes.
7. Настроить scenario для формы `24`, который запускается после успешного заполнения формы.
8. Добавить EMAIL 1 после регистрации; затем согласованные reminders через разделения по дате и timers.
9. Перед каждым фиксированным timer поставить условие **Совпадение даты и времени**, чтобы late registration пропускала прошедший момент и не застревала.
10. Включить уведомление организатору о заполнении формы; проверить получателя, sender, subject и шаблоны, затем активировать scenario.
11. Перед production build оставить `SENDSAY_FORM_ID=24`, `SENDSAY_USE_TEST_FORM=false` и пересобрать сайт.
12. Сгенерировать новый Sendsay import webhook для JSON-контракта из README, выбрать подтверждённый статус, список и reminder-сценарий; передать разработчику URL.
13. Установить `SENDSAY_IMPORT_WEBHOOK_URL` только на сервере и проверить: без чекбокса webhook не вызывается, с чекбоксом контакт становится доступен для рассылки и попадает в нужный сценарий.

Текущий success-текст UI соответствует утверждённому flow: заявка сохранена, посетителю не нужно подтверждать email. Ответ Sendsay только с `error/draft/emptyfromemail` считается post-save warning и приводит к success-экрану; остальные ошибки не маскируются.

## Resend после Sendsay

Sendsay отвечает за контакт/participant emails и может отправлять собственное уведомление организатору о заполнении формы. `/api/register` + Resend также остаётся включённым и отправляет внутреннее письмо «Новая регистрация на конференцию». Notification Resend стартует после успеха Sendsay и не влияет на success UI.

Исключение действует только при `EMAIL_TEST_MODE=true`: техническая ошибка Sendsay разрешает server-checked fallback в `/api/register`, и письмо уходит на `EMAIL_TEST_RECIPIENT`. Validation errors Sendsay не обходятся. Production mode отклоняет fallback независимо от client request.

Два organizer notification на одну регистрацию — одно от Sendsay и одно от Resend — согласованы и допустимы.

Вариант A возможен после настройки `notify.email`/шаблона уведомления в Sendsay и production-проверки. Чтобы отключить старый flow:

1. Проверить на test и production form, что Sendsay notification содержит все нужные поля и стабильно доставляется нужным организаторам.
2. Удалить только вызов `notifyOrganizer` из `src/components/Registration.jsx` и затем server registration/email wiring, если endpoint больше нигде не нужен.
3. Удалить Resend server env (`EMAIL_API_KEY`, `EMAIL_FROM`, test recipient) и deployment secrets только после проверки и согласования rollback.
4. Обновить server routing/tests/документацию. Sendsay Form API client и его public config не менять.

Не удалять Resend только потому, что Sendsay Form API уже принимает контакты: это разные обязанности до завершения шага 1.

## Текущая отправка через Resend

Необходимые server-only values:

| Переменная                   | Назначение                                                      |
| ---------------------------- | --------------------------------------------------------------- |
| `EMAIL_API_KEY`              | Секретный Resend API key                                        |
| `EMAIL_FROM`                 | Sender на подтверждённом домене                                 |
| `APP_ORIGIN`                 | Точный origin frontend, HTTPS в production                      |
| `EMAIL_TEST_MODE`            | `false` в production, `true` только для теста                   |
| `EMAIL_TEST_RECIPIENT`       | Обязателен при test mode                                        |
| `TRUST_LOCAL_PROXY`          | `true` только за настроенным доверенным локальным proxy         |
| `SENDSAY_IMPORT_WEBHOOK_URL` | Секретный URL импорта согласившихся контактов в Sendsay         |
| `PORT`                       | Внутренний Node.js port, по умолчанию 53860                     |
| `SERVER_HOST`                | `127.0.0.1` по умолчанию; `0.0.0.0` только если требует хостинг |

Production organizer recipient сейчас `mmetrindesign@gmail.com` и задан server-side в `server/config/registrationConfig.mjs`. Браузеру нельзя разрешать менять `to`, `from` или recipient. При `EMAIL_TEST_MODE=true` используется только `EMAIL_TEST_RECIPIENT`; при `false` — только production recipient.

Локальный `.env` не передаётся через Git. Production secrets устанавливаются в окружении хостинга/процесса или secret store. Не использовать public env prefixes и не инжектировать credentials в frontend build.

## Переход на собственный SMTP

SMTP adapter пока отсутствует. Для миграции:

1. Реализовать `server/email/providers/smtpEmailProvider.mjs` с contract `sendEmail({ from, to, subject, text, idempotencyKey })`.
2. Добавить server-only `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` и нужную sender-конфигурацию.
3. Инициализировать SMTP adapter в `server/register.mjs` и передать его в `createEmailService` вместо Resend adapter.
4. Оставить выбор test/production recipient в `EmailService` и проверить оба режима.
5. После production smoke test удалить Resend adapter/config только если rollback больше не нужен.

Не требуется менять `registrationHandler`, `registrationService`, validation, frontend или `/api/register`. SMTP password нельзя хранить в Git, README, frontend или JS bundle.

## Static delivery and production deployment

Entry document — `outputs/mts-ads-portrait-frames-current.html`, доступный по `/`; SPA routing/service worker нет. `server/http/staticFileHandler.mjs` stream-ит файлы и разрешает только GET/HEAD. Path traversal, malformed URI, directories, dotfiles и прямой доступ к `.br`/`.gz` sidecars не выдаются.

Компрессия выполняется на build: для HTML/CSS/JS/SVG больше 1 KB создаются `.br`/`.gz`; static handler выбирает representation по `Accept-Encoding` и выставляет `Vary`. Runtime Brotli/gzip не используется. WebP/OTF не сжимаются повторно. HTML получает `no-cache`; fingerprinted esbuild JS/CSS — годовой immutable cache; copied non-hashed assets, в том числе `receiver-frames/01.webp`…`30.webp`, — один день без immutable. ETag/Last-Modified позволяют revalidate HTML и stable assets.

Текущая реализация рассчитана на один постоянно работающий Node.js process за HTTPS reverse proxy. По умолчанию сервер слушает `127.0.0.1`; proxy должен завершать TLS, делать HTTP → HTTPS redirect и перезаписывать `X-Real-IP`. Только после этого допустим `TRUST_LOCAL_PROXY=true`. Для платформы, требующей внешний bind, задать `SERVER_HOST=0.0.0.0`; `PORT` должен быть 1–65535 и по умолчанию 53860.

HTTP headers ограничены 10 секундами, complete request — 15 секундами, idle keep-alive — 5 секундами. Streaming static response не имеет отдельного aggressive socket timeout, поэтому медленная отдача assets не обрывается этим configuration. Для масштабного production предпочтительнее CDN/reverse proxy для статики и compression, а Node оставить для `/api/register`; текущая Node static delivery остаётся подходящей для локального и простого single-process deployment.

Rate limiter хранит максимум 10000 HMAC-анонимизированных buckets в памяти process, разрешает пять запросов за 10 минут и сбрасывается при рестарте. Для нескольких replicas, serverless или horizontal scaling нужен shared rate-limit store. Текущий код не предоставляет distributed limiting и не подключает Redis.

Перед production:

- использовать Production Form ID `24`; Account и field codes уже заданы, ID production-списка проект не использует;
- оставить `SENDSAY_USE_TEST_FORM=false`, форма `24` уже подтверждена активной;
- пройти регистрацию и event scenario одним контролируемым production-контактом без подтверждения email;
- установить `EMAIL_TEST_MODE=false`;
- проверить production recipient и `APP_ORIGIN`;
- подтвердить sender/domain у provider;
- проверить отсутствие `.env` и email/SMTP secrets в Git и клиентской сборке;
- выполнить `npm run check`;
- отправить одну production smoke registration по HTTPS;
- проверить доставку, правильный sender/recipient/subject и все пять полей;
- проверить 429 и IP resolution за реальным proxy;
- проверить `/`, hashed JS/CSS, WebP hero, один frame asset и `POST /api/register` через production proxy;
- проверить `Content-Encoding`, `Vary`, cache headers и `HEAD` после production build;
- для нескольких instances сначала подключить shared rate-limit store.

## Безопасность и персональные данные

Сервер проверяет POST/JSON/origin, ограничивает body по declared и actual bytes, применяет honeypot и allowlist, нормализует Unicode, запрещает control characters, повторно валидирует поля и принимает только проверенный idempotency key. Письмо plain text; пользовательские значения не используются в headers. API key, sender, organizer и test recipient читаются только server-side. Ошибки provider не раскрываются клиенту.

Node static handler сейчас не выставляет CSP. Если CSP задаёт reverse proxy/CDN, добавить `'self' https://sendsay.ru` в `connect-src`, не использовать wildcard. Public Sendsay identifiers допустимы в bundle; ни Sendsay General API key, ни Resend key туда попадать не должны.

Не логировать body заявки, raw IP, credentials или provider response с секретами. Не добавлять хранение персональных данных без отдельного требования и согласованной retention policy.

## Поддержка и проверки

`tests/sendsay.test.mjs` покрывает payload/mapping, test Form ID, `_member_email`, honeypot, frontend-validation, API errors, network, timeout, unknown response, missing config и изоляцию organizer notification. `tests/app.test.mjs` проверяет error/success UI и отсутствие параллельных Sendsay requests. `tests/register.test.mjs` покрывает внутренний API, security checks, recipients, rate limiting, Resend adapter и timeout. Реальные Sendsay/Resend запросы в тестах не выполняются.

При изменении полей сначала обновить `shared/registrationValidation.js`, server limits/message builder и тесты. При изменении provider contract обновить оба adapter-level теста до включения нового транспорта в production.
