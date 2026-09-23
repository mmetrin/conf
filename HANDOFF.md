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
→ success UI
→ best-effort POST /api/register
→ EmailService → ResendEmailProvider → Resend → organizer
```

Form API никогда не вызывается с backend и не требует secret API key. Email передаётся только как `_member_email`. Остальные поля строятся по конфигурации; honeypot в Sendsay не попадает. Resend-specific endpoint, authorization, payload, idempotency header и timeout находятся только в server provider adapter.

## Sendsay: что нужно получить и где настроить

Следующему разработчику/владельцу аккаунта нужны реальные значения из Sendsay:

| Что                                        | Где взять/проверить                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Account code                               | URL/настройки аккаунта Sendsay                                            |
| Form ID                                    | **Сайт → Формы**, форма-дубль конференции                                 |
| codes имени, телефона, компании, должности | `fields[].name` ответа `GET https://sendsay.ru/form/<ACCOUNT>/<FORM_ID>/` |
| обязательность и типы                      | `fields[].required` и `fields[].type` того же ответа                      |
| event datetime field code                  | code скрытого поля типа «Дата и время», если используется                 |
| event datetime value                       | подтверждённое московское время `2026-11-19 17:00:00`                     |
| event venue                                | Арбатская площадь, 14, строение 1, кинотеатр «Художественный»             |
| event ID field/value                       | только если реально создано и нужно                                       |
| audience list                              | шаг «Аудитория» формы                                                     |
| confirmation template                      | шаг «Письмо подтверждения формы»                                          |
| automation                                 | **Автоматизации → Сценарии**, сценарий конкретной формы                   |
| email templates                            | **Контент** и блоки отправки сценария                                     |

Build-time переменные перечислены в `.env.example`: `SENDSAY_ACCOUNT`, `SENDSAY_FORM_ID`, `SENDSAY_FIELD_NAME`, `SENDSAY_FIELD_PHONE`, `SENDSAY_FIELD_COMPANY`, `SENDSAY_FIELD_ROLE`; optional пары для event datetime/event ID; `SENDSAY_TEST_FORM_ID` и `SENDSAY_USE_TEST_FORM`. После изменения нужна новая `npm run build`.

Нельзя угадывать codes или добавлять API key в frontend. Если обязательная конфигурация отсутствует, клиент прекращает submit до network request. General Sendsay API key, если когда-либо понадобится, должен быть только server-side и выдан саблогину с минимальными правами.

## Sendsay UI checklist

1. Создать форму-дубль с полями текущей формы: имя, email, телефон, компания, должность.
2. Назначить отдельный список аудитории конференции.
3. Создать и добавить скрытое поле «Дата мероприятия» типа «Дата и время» с точностью до минут; передавать подтверждённое значение `2026-11-19 17:00:00` по московскому времени.
4. Настроить DOI-письмо со ссылкой `[% confirm_url %]`; не использовать `form.transfer` для обхода подтверждения.
5. Активировать форму и проверить через GET её `state`, fields, required/types и реальные codes.
6. Создать отдельную test form/list, собрать с `SENDSAY_USE_TEST_FORM=true`, выполнить smoke test, затем вернуть `false` и пересобрать production.
7. Создать scenario со стартом **Подтверждение формы** для конкретной формы.
8. Добавить EMAIL 1 сразу после подтверждения; затем согласованные reminders через разделения по дате и timers.
9. Перед каждым фиксированным timer поставить условие **Совпадение даты и времени**, чтобы late registration пропускала прошедший момент и не застревала.
10. Проверить sender, subject и шаблоны в разделе **Контент**, затем активировать scenario.

Текущий success-текст UI оставлен как утверждённый. Для точного DOI flow рекомендуется отдельно согласовать текст «Регистрация отправлена. Проверьте почту и подтвердите адрес».

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

| Переменная             | Назначение                                                      |
| ---------------------- | --------------------------------------------------------------- |
| `EMAIL_API_KEY`        | Секретный Resend API key                                        |
| `EMAIL_FROM`           | Sender на подтверждённом домене                                 |
| `APP_ORIGIN`           | Точный origin frontend, HTTPS в production                      |
| `EMAIL_TEST_MODE`      | `false` в production, `true` только для теста                   |
| `EMAIL_TEST_RECIPIENT` | Обязателен при test mode                                        |
| `TRUST_LOCAL_PROXY`    | `true` только за настроенным доверенным локальным proxy         |
| `PORT`                 | Внутренний Node.js port, по умолчанию 53860                     |
| `SERVER_HOST`          | `127.0.0.1` по умолчанию; `0.0.0.0` только если требует хостинг |

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

- задать Account, production Form ID и реальные field codes до `npm run build`;
- установить `SENDSAY_USE_TEST_FORM=false`, проверить active form и audience list;
- пройти DOI и event scenario одним контролируемым production-контактом;
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
