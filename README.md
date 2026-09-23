# Конференция МТС Ads

Production-handoff для React 19 сайта конференции. Проект уже содержит frontend, Node.js server, прямую интеграцию с Sendsay Form API и внутреннее уведомление организатора через Resend.

## Что уже готово

✅ Уже реализовано и не требует повторной разработки:

- React-форма с полями `name`, `email`, `phone`, `company`, `role`;
- frontend- и server-side validation, нормализация и honeypot;
- блокировка параллельных submit, loading/error/success states и network timeout;
- browser-side Sendsay Form API client, mapping полей и механизм выбора отдельного test Form ID;
- Double Opt-In-совместимый flow без `form.transfer` и программной активации контакта;
- Node.js server и `POST /api/register`;
- rate limiting, проверка Origin, bounded JSON body и idempotency для Resend;
- provider abstraction и готовый Resend adapter для уведомления организатора;
- static file serving, Brotli/gzip sidecars, cache headers и security headers;
- production build, asset pipeline и автоматические тесты.

Разработчику не нужно писать новый fetch, React-интеграцию, backend регистрации, scheduler, cron или reminder-логику. Перед production нужно только указать реальные значения, подготовить сущности в Sendsay, собрать проект и развернуть готовый Node server.

## Подтверждённые данные мероприятия

- Дата: **19 ноября 2026 года**.
- Время: **17:00 МСК**.
- Значение для Sendsay datetime: `2026-11-19 17:00:00`.
- Адрес: **Арбатская площадь, 14, строение 1, кинотеатр «Художественный»**.

Эти данные окончательные: дополнительно согласовывать их перед production не нужно. Адрес следует использовать в шаблонах писем Sendsay без повторного запроса подтверждения.

## Что заменить перед production

Таблица содержит только значения, которые ещё нужно заполнить или подтвердить. Defaults, которые обычно менять не нужно, описаны отдельно в Environment.

| Значение                 | Сейчас                                     | Что указать или сделать                                                                                                                | Где                                    |
| ------------------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `APP_ORIGIN`             | в шаблоне `http://127.0.0.1:53860`         | точный public origin, например `https://conference.example.ru`, без пути и завершающего `/`                                            | server env / `.env`                    |
| `EMAIL_API_KEY`          | `not set` в `.env.example`                 | server secret — API key рабочего аккаунта Resend                                                                                       | secret store или server env            |
| `EMAIL_FROM`             | `not set` в `.env.example`                 | sender на подтверждённом в Resend домене                                                                                               | server env / `.env`                    |
| organizer recipient      | hardcoded в `PRODUCTION_ORGANIZER_ADDRESS` | подтвердить текущего получателя или заменить константу на согласованный production recipient                                           | `server/config/registrationConfig.mjs` |
| `SENDSAY_ACCOUNT`        | `not set` в `.env.example`                 | code аккаунта из URL/настроек Sendsay или Form API URL                                                                                 | public build env / `.env`              |
| `SENDSAY_FORM_ID`        | `not set` в `.env.example`                 | ID активной production-формы конференции                                                                                               | public build env / `.env`              |
| четыре `SENDSAY_FIELD_*` | `not set` в `.env.example`                 | реальные `fields[].name` для имени, телефона, компании и должности                                                                     | public build env / `.env`              |
| event datetime pair      | field code `not set`; дата подтверждена    | создать скрытое datetime-поле, указать его code в `SENDSAY_FIELD_EVENT_DATETIME`, а в `SENDSAY_EVENT_DATETIME` — `2026-11-19 17:00:00` | public build env / `.env`              |
| event ID pair            | `not set` в `.env.example`                 | `SENDSAY_FIELD_EVENT_ID` и `SENDSAY_EVENT_ID`; только если реальный event ID используется                                              | public build env / `.env`              |
| `SENDSAY_TEST_FORM_ID`   | `not set` в `.env.example`                 | ID отдельной тестовой формы/списка для smoke test                                                                                      | public build env / `.env`              |
| privacy-policy URL       | текущая ссылка MTS в форме                 | подтвердить актуальность юридической ссылки                                                                                            | `src/components/Registration.jsx`      |

Значения `example.test`, `example.com` и тестовые email внутри `tests/` — только fixtures; в production bundle и конфигурацию они не попадают. Внутренние строки `http://localhost` в URL parser также не являются deployment placeholders и менять их не нужно.

## Environment

### PUBLIC / FRONTEND SAFE

Эти значения встраиваются в browser bundle во время `npm run build`. Они не являются secrets. После любого изменения нужна новая сборка.

| Variable                       | Required               | Что указать                                               | Secret | Где используется              |
| ------------------------------ | ---------------------- | --------------------------------------------------------- | ------ | ----------------------------- |
| `SENDSAY_ACCOUNT`              | да                     | code production-аккаунта Sendsay                          | нет    | Form API URL                  |
| `SENDSAY_FORM_ID`              | да для production      | ID активной production-формы                              | нет    | Form API URL                  |
| `SENDSAY_FIELD_NAME`           | да                     | field code имени                                          | нет    | Sendsay payload               |
| `SENDSAY_FIELD_PHONE`          | да                     | field code телефона                                       | нет    | Sendsay payload               |
| `SENDSAY_FIELD_COMPANY`        | да                     | field code компании                                       | нет    | Sendsay payload               |
| `SENDSAY_FIELD_ROLE`           | да                     | field code должности                                      | нет    | Sendsay payload               |
| `SENDSAY_FIELD_EVENT_DATETIME` | условно                | code скрытого datetime-поля; задавать вместе со значением | нет    | Sendsay payload               |
| `SENDSAY_EVENT_DATETIME`       | да вместе с field code | `2026-11-19 17:00:00` — подтверждённое московское время   | нет    | Sendsay payload               |
| `SENDSAY_FIELD_EVENT_ID`       | условно                | code скрытого event ID; задавать вместе со значением      | нет    | Sendsay payload               |
| `SENDSAY_EVENT_ID`             | условно                | согласованный event identifier                            | нет    | Sendsay payload               |
| `SENDSAY_TEST_FORM_ID`         | только для smoke test  | ID отдельной тестовой формы                               | нет    | Form API URL в test build     |
| `SENDSAY_USE_TEST_FORM`        | нет, default `false`   | `true` только для test build                              | нет    | выбор test/production Form ID |

Build читает `.env`, если файл существует, и environment процесса. `scripts/build.mjs` переносит в bundle только перечисленный allowlist; server secrets туда не копируются.

### SERVER SECRET / SERVER-ONLY

| Variable               | Required                   | Что указать                                                      | Secret              | Где используется                |
| ---------------------- | -------------------------- | ---------------------------------------------------------------- | ------------------- | ------------------------------- |
| `EMAIL_API_KEY`        | да при текущем Resend flow | Resend API key                                                   | **да**              | только `ResendEmailProvider`    |
| `EMAIL_FROM`           | да                         | подтверждённый sender, например `Events <events@your-domain.ru>` | нет, но server-only | только `EmailService`           |
| `APP_ORIGIN`           | да                         | точный HTTPS origin опубликованного сайта                        | нет, server-only    | Origin check `/api/register`    |
| `EMAIL_TEST_MODE`      | нет, default `false`       | `false` в production                                             | нет, server-only    | выбор organizer/test recipient  |
| `EMAIL_TEST_RECIPIENT` | только если test mode      | тестовый адрес                                                   | нет, server-only    | test notification recipient     |
| `TRUST_LOCAL_PROXY`    | нет, default `false`       | `true` только для описанной выше proxy-схемы                     | нет, server-only    | client IP resolution/rate limit |
| `PORT`                 | нет, default `53860`       | port hosting platform, если она его задаёт                       | нет, server-only    | Node listener                   |
| `SERVER_HOST`          | нет, default `127.0.0.1`   | bind address согласно типу hosting                               | нет, server-only    | Node listener                   |

`.env` не коммитится. В production предпочтительно задавать `EMAIL_API_KEY` через secret store/environment hosting-платформы. `npm start` читает `.env`, если он существует, но также работает только с environment variables платформы.

## Sendsay

### Уже сделано

Интеграционный код полностью реализован:

```text
Custom form
→ frontend validation + honeypot
→ POST https://sendsay.ru/form/<ACCOUNT>/<FORM_ID>/
→ success только после документированного ответа Sendsay
→ best-effort /api/register для organizer notification
```

- Fetch находится в `src/services/sendsay/sendsayFormClient.js`, а не в React component.
- Mapping находится в `src/services/sendsay/sendsayConfig.js`.
- Email передаётся официальным параметром `_member_email`.
- Неизвестный ответ, `errors`, HTTP/network error и timeout не считаются успехом.
- При ошибке поля формы не очищаются; повторный submit разрешён.
- Form API вызывается из браузера и не использует API key.
- General Sendsay API не используется; нельзя добавлять его API key в frontend env или bundle.
- Test Form ID выбирается отдельным флагом; unit tests не обращаются к Sendsay.

Дополнительная разработка интеграционного слоя не требуется.

### Нужно заменить

Заполнить публичные переменные из таблицы Environment. Account/Form ID и codes берутся из существующей или новой формы через:

```http
GET https://sendsay.ru/form/<ACCOUNT>/<FORM_ID>/
Accept: application/json
```

Проверить `obj.state: 1`, затем сопоставить:

| Поле сайта | Sendsay                                      |
| ---------- | -------------------------------------------- |
| `email`    | `_member_email` — уже реализовано, не менять |
| `name`     | `SENDSAY_FIELD_NAME`                         |
| `phone`    | `SENDSAY_FIELD_PHONE`                        |
| `company`  | `SENDSAY_FIELD_COMPANY`                      |
| `role`     | `SENDSAY_FIELD_ROLE`                         |

Без Account, production Form ID и четырёх field codes frontend безопасно остановится до network request и покажет контролируемую ошибку.

### Что проверить или настроить в Sendsay UI

Состояние внешнего аккаунта из repository определить нельзя. Выполнить только отсутствующие пункты:

1. В **Сайт → Формы** создать или выбрать форму-дубль конференции.
2. Проверить, что её аудитория — правильный отдельный список мероприятия.
3. Проверить наличие полей email, имя, телефон, компания и должность.
4. Добавить скрытое поле «Дата мероприятия» типа «Дата и время» с точностью до минут. Production-значение: `2026-11-19 17:00:00` по московскому времени.
5. Настроить Double Opt-In письмо со ссылкой `[% confirm_url %]`; не использовать `form.transfer`.
6. Активировать форму и получить реальные Account/Form ID/field codes.
7. Создать отдельную test form/list, указать её ID и собрать сайт с `SENDSAY_USE_TEST_FORM=true`.
8. Отправить регистрацию через UI и проверить контакт, все поля и DOI-письмо.
9. В **Автоматизации → Сценарии** выбрать старт **Подтверждение формы** для production-формы.
10. Добавить EMAIL 1 сразу после подтверждения, затем согласованные reminders. Перед каждым фиксированным timer использовать условие по дате, чтобы late registrations пропускали уже прошедшие моменты.
11. Включить в Sendsay уведомление организатору о заполнении формы и настроить получателя/шаблон этого уведомления.
12. Вернуть `SENDSAY_USE_TEST_FORM=false` перед production build.

Расписание писем не реализуется на сайте: оно целиком настраивается в Sendsay Automations. Текущий success-текст UI не менялся; перед запуском рекомендуется согласовать DOI-формулировку «Регистрация отправлена. Проверьте почту и подтвердите адрес».

Официальные инструкции: [Form API](https://docs.sendsay.ru/sendsay-api/how-to-use-api-form/), [формы и DOI](https://docs.sendsay.ru/site/forms/signup-forms/), [сценарий мероприятия](https://docs.sendsay.ru/automations/triggers/workflow-for-event/), [workflow blocks](https://docs.sendsay.ru/automations/automation-with-workflows/workflow-blocks/).

## Email notification / Resend

### Уже сделано

После успешного Sendsay submit браузер вызывает `/api/register`. Server повторно валидирует payload и через `RegistrationService → EmailService → ResendEmailProvider` отправляет plain-text письмо «Новая регистрация на конференцию» организатору.

Ошибка Resend не отменяет уже сохранённую Sendsay-регистрацию и не заставляет участника отправлять форму повторно. Rate limiting, idempotency, timeout и test-recipient routing уже реализованы.

При `EMAIL_TEST_MODE=true` техническая недоступность или отсутствие конфигурации Sendsay включает локальный fallback: браузер отправляет заявку напрямую в `/api/register`, а Resend доставляет её только на `EMAIL_TEST_RECIPIENT`. Ошибки email и полей формы не обходятся. При `EMAIL_TEST_MODE=false` server отклоняет fallback.

### Нужно заменить

1. Задать `EMAIL_API_KEY` в server secret store.
2. Задать `EMAIL_FROM` с подтверждённого в Resend домена.
3. Подтвердить `PRODUCTION_ORGANIZER_ADDRESS` в `server/config/registrationConfig.mjs`; заменить только если текущий адрес не является production recipient.
4. Оставить `EMAIL_TEST_MODE=false` в production.

Уведомление организатору разрешено включить и в Sendsay. Текущий `/api/register` с Resend при этом остаётся включённым, поэтому организатор может получить два уведомления на одну регистрацию: одно от Sendsay и одно от Resend. Для текущего проекта это допустимо. Если позже понадобится только одно письмо, один из каналов следует отключить отдельным изменением.

## Server и deployment

### Уже сделано

Node server готов: он раздаёт `outputs`, маршрутизирует `/api/register`, выбирает precompressed assets, выставляет cache/security headers и настраивает HTTP timeouts. Новый сервер писать не нужно.

Отдельного `/health` endpoint нет. Для health check используйте `GET /`: ожидаются `200` и HTML entry document.

Для static delivery, compression, cache и HTTP timeouts дополнительная настройка не требуется.

### Нужно заменить

- Обязательно заменить template `APP_ORIGIN` на точный production origin.
- `PORT` и `SERVER_HOST` менять только если этого требует hosting; иначе defaults можно оставить.
- `TRUST_LOCAL_PROXY=false` менять только для описанной ниже доверенной proxy-схемы.
- Node static server сейчас не выставляет CSP. Если CSP добавляет hosting/CDN/proxy, разрешить Form API через `connect-src 'self' https://sendsay.ru`.

### Нужно сделать на hosting

1. Установить Node.js 22+ и зависимости:

   ```sh
   npm ci
   ```

2. Задать environment/secret values из таблицы выше. Это нужно сделать до build, потому что Sendsay public config встраивается в browser bundle.
3. Выполнить проверенный production build:

   ```sh
   npm run check
   ```

   `npm run check` запускает все тесты, затем `npm run build`. Build создаёт `outputs/mts-ads-portrait-frames-current.html`, fingerprinted JS/CSS и `.br`/`.gz` sidecars.

4. Запустить:

   ```sh
   npm start
   ```

5. Опубликовать Node port и включить HTTPS:
   - на PaaS/container hosting использовать выданный `PORT`, обычно `SERVER_HOST=0.0.0.0`; отдельный reverse proxy не обязателен, если HTTPS и routing предоставляет платформа;
   - на VM с same-host reverse proxy можно оставить `SERVER_HOST=127.0.0.1`, проксировать public domain на `53860` и завершать TLS на proxy.
6. Если CSP задаёт hosting/CDN/proxy, применить указанную выше директиву; не использовать `connect-src *`.
7. Проверить `GET /`, static assets, browser registration и `/api/register` через итоговый HTTPS domain.

`APP_ORIGIN` должен точно совпадать с browser origin. При несовпадении server отклонит внутреннее notification; уже принятая Sendsay регистрация останется успешной, а пользователь не будет вынужден отправлять её повторно.

## Проверка после deployment

1. Открыть итоговый HTTPS URL и проверить загрузку страницы без 404/console errors.
2. Убедиться, что `GET /` возвращает `200`.
3. Сначала использовать отдельную test form/list Sendsay.
4. Отправить форму один раз и убедиться, что кнопка блокируется на время запроса.
5. Проверить в browser Network прямой POST на `https://sendsay.ru/form/.../` и последующий same-origin POST `/api/register`.
6. Проверить контакт и mapping пяти полей в Sendsay.
7. Перейти по DOI-ссылке и убедиться, что запускается сценарий «Подтверждение формы».
8. Проверить внутреннее письмо организатору через Resend.
9. Пересобрать с `SENDSAY_USE_TEST_FORM=false` и выполнить одну согласованную production-регистрацию.

## Основные файлы

| Область                       | Файл                                                                      |
| ----------------------------- | ------------------------------------------------------------------------- |
| UI формы                      | `src/components/Registration.jsx`                                         |
| shared validation             | `shared/registrationValidation.js`                                        |
| Sendsay public config/mapping | `src/services/sendsay/sendsayConfig.js`                                   |
| Sendsay Form API client       | `src/services/sendsay/sendsayFormClient.js`                               |
| submit orchestration          | `src/services/registration/registrationSubmission.js`                     |
| Node composition              | `server/start.mjs`, `server/register.mjs`                                 |
| server registration           | `server/registration/*`                                                   |
| Resend adapter                | `server/email/providers/resendEmailProvider.mjs`                          |
| server env/defaults           | `server/config/*`                                                         |
| static delivery               | `server/http/staticFileHandler.mjs`                                       |
| build/public config injection | `scripts/build.mjs`                                                       |
| tests                         | `tests/sendsay.test.mjs`, `tests/register.test.mjs`, `tests/app.test.mjs` |

## Локальная разработка и служебные команды

```sh
cp .env.example .env
npm ci
npm test       # tests без реальных Sendsay/Resend requests
npm run build  # production frontend build
npm run check  # tests + build
npm start      # http://127.0.0.1:53860 по default
```

Image derivatives уже существуют. Пересобирать их для обычного deployment не нужно:

```sh
npm run images:verify    # проверить текущие derivatives
npm run images:optimize  # обновить derivatives после изменения originals
npm run images:sequence  # явно пересобрать все 30 кадров
```

## Production checklist

- [ ] Подтвердить только organizer recipient; дата, время и адрес мероприятия уже окончательно зафиксированы.
- [ ] Создать/проверить production и test forms/lists в Sendsay.
- [ ] Получить Account, Form ID и реальные field codes.
- [ ] Указать `SENDSAY_EVENT_DATETIME=2026-11-19 17:00:00` вместе с code скрытого datetime-поля.
- [ ] Настроить DOI-письмо, шаблоны, сценарий «Подтверждение формы» и organizer notification в Sendsay.
- [ ] Задать production `APP_ORIGIN`, Sendsay public config, `EMAIL_FROM` и server secrets.
- [ ] Оставить `EMAIL_TEST_MODE=false` и `SENDSAY_USE_TEST_FORM=false` для production build.
- [ ] Выбрать подходящие `SERVER_HOST`/`PORT` для hosting.
- [ ] Выполнить `npm ci` и `npm run check`.
- [ ] Запустить `npm start`, опубликовать port и включить HTTPS.
- [ ] Проверить `GET /` и загрузку static assets.
- [ ] Выполнить test-form регистрацию, проверить mapping, DOI, automation и оба organizer notification — Sendsay и Resend.
- [ ] Пересобрать production mode и выполнить одну согласованную production-регистрацию.
