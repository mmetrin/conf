# Конференция МТС Ads

Production-handoff для React 19 сайта конференции. Проект содержит frontend, Node.js server, интеграцию с Sendsay Form API, server-side Sendsay webhook для подписки на напоминания и внутреннее уведомление организатора через Resend.

## Что уже готово

✅ Уже реализовано и не требует повторной разработки:

- React-форма с полями `name`, `email`, `phone`, `company`, `role`;
- frontend- и server-side validation, нормализация и honeypot;
- блокировка параллельных submit, loading/error/success states и network timeout;
- browser-side Sendsay Form API client, mapping полей и механизм выбора отдельного test Form ID;
- необязательный чекбокс анонс-напоминаний и popup с полным текстом рекламного согласия;
- popup «Согласие на обработку персональных данных» из формы и футера;
- server-only adapter для импорта согласившихся участников через Sendsay webhook;
- success flow без обязательного подтверждения email посетителем;
- Node.js server и `POST /api/register`;
- rate limiting, проверка Origin, bounded JSON body и idempotency для Resend;
- provider abstraction и готовый Resend adapter для уведомления организатора;
- static file serving, Brotli/gzip sidecars, cache headers и security headers;
- production build, asset pipeline и автоматические тесты.

Разработчику не нужно писать новый fetch, React-интеграцию, backend регистрации, scheduler, cron или reminder-логику. Перед production нужно получить от владельца Sendsay новый webhook URL, вставить его в server env, проверить mapping, собрать проект и развернуть готовый Node server.

## Подтверждённые данные мероприятия

- Дата: **19 ноября 2026 года**.
- Время: **17:00 МСК**.
- Значение для Sendsay datetime: `2026-11-19 17:00:00`.
- Адрес: **Арбатская площадь, 14, строение 1, кинотеатр «Художественный»**.

Эти данные окончательные: дополнительно согласовывать их перед production не нужно. Адрес следует использовать в шаблонах писем Sendsay без повторного запроса подтверждения.

## Полученная конфигурация Sendsay

| Параметр                                | Значение                                           | Статус                                                                               |
| --------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Account code                            | `mtsmarketolog`                                    | получен                                                                              |
| Form ID                                 | `24`                                               | используется на production; публичный GET Form API подтвердил `state: 1`             |
| Test list                               | `pl58174`                                          | получен от владельца Sendsay                                                         |
| Email                                   | `_member_email`                                    | подтверждено Form API                                                                |
| Фамилия и имя                           | `q1`                                               | required, text, max 160                                                              |
| Телефон                                 | `q2`                                               | required, text, max 16                                                               |
| Компания                                | `q3`                                               | required, text, max 200                                                              |
| Должность                               | `q4`                                               | required, text, max 200                                                              |
| Дата мероприятия                        | `q5`                                               | скрытое date field, точность до минут                                                |
| Event ID                                | не используется                                    | дополнительное поле не требуется                                                     |
| Test workflow                           | «Конференция МТС Ads — 19.11.2026 — TEST», ID `52` | [открыть в Sendsay](https://app.sendsay.ru/automation/workflows/52/overview/summary) |
| Production Form ID                      | `24`                                               | отдельная production-копия не создаётся                                              |
| Production list                         | ID не требуется проекту                            | список выбирается внутри production-формы в Sendsay                                  |
| Production form active                  | да                                                 | подтверждено владельцем Sendsay                                                      |
| Логика писем, время и ссылки на шаблоны | намеренно не передаются в проект                   | настраиваются и могут меняться в Sendsay; на техническую отправку формы не влияют    |

Локальный `.env` использует production Form ID `24` и `SENDSAY_USE_TEST_FORM=false`. Отдельная production-копия формы не требуется.

## Что заменить перед production

Таблица содержит только значения, которые ещё нужно заполнить или подтвердить. Defaults, которые обычно менять не нужно, описаны отдельно в Environment.

| Значение                       | Сейчас                                     | Что указать или сделать                                                                                      | Где                                           |
| ------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `APP_ORIGIN`                   | в шаблоне `http://127.0.0.1:53860`         | точный public origin, например `https://conference.example.ru`, без пути и завершающего `/`                  | server env / `.env`                           |
| `EMAIL_API_KEY`                | `not set` в `.env.example`                 | server secret — API key рабочего аккаунта Resend                                                             | secret store или server env                   |
| `EMAIL_FROM`                   | `not set` в `.env.example`                 | sender на подтверждённом в Resend домене                                                                     | server env / `.env`                           |
| `SENDSAY_IMPORT_WEBHOOK_URL`   | пусто                                      | новый server-only webhook для импорта контактов, согласившихся на напоминания                                | secret store или server env                   |
| organizer recipient            | hardcoded в `PRODUCTION_ORGANIZER_ADDRESS` | подтвердить текущего получателя или заменить константу на согласованный production recipient                 | `server/config/registrationConfig.mjs`        |
| `SENDSAY_FORM_ID`              | `24`                                       | активная форма конференции                                                                                   | public build env / `.env`                     |
| production list                | не является параметром проекта             | владелец Sendsay выбирает нужный список внутри production-формы; передавать разработчику его ID не требуется | Sendsay UI                                    |
| production form active         | подтверждено владельцем                    | Form ID `24` уже проверен через GET Form API: `state: 1`                                                     | Sendsay UI / Form API                         |
| email logic/templates/schedule | ведутся владельцем Sendsay                 | не требуются для кода формы; проверяются владельцем Sendsay непосредственно в automation                     | Sendsay UI                                    |
| personal-data consent          | текст и ссылки получены                    | дополнительное подтверждение для текущей версии не требуется                                                 | `src/components/ConsentModal/PersonalDataConsentModal.jsx` |

Значения `example.test`, `example.com` и тестовые email внутри `tests/` — только fixtures; в production bundle и конфигурацию они не попадают. Внутренние строки `http://localhost` в URL parser также не являются deployment placeholders и менять их не нужно.

## Environment

### PUBLIC / FRONTEND SAFE

Эти значения встраиваются в browser bundle во время `npm run build`. Они не являются secrets. После любого изменения нужна новая сборка.

| Variable                       | Required               | Что указать                                                  | Secret | Где используется              |
| ------------------------------ | ---------------------- | ------------------------------------------------------------ | ------ | ----------------------------- |
| `SENDSAY_ACCOUNT`              | уже задан              | `mtsmarketolog`                                              | нет    | Form API URL                  |
| `SENDSAY_FORM_ID`              | уже задан              | `24` — активная production-форма                             | нет    | Form API URL                  |
| `SENDSAY_FIELD_NAME`           | уже задан              | `q1`                                                         | нет    | Sendsay payload               |
| `SENDSAY_FIELD_PHONE`          | уже задан              | `q2`                                                         | нет    | Sendsay payload               |
| `SENDSAY_FIELD_COMPANY`        | уже задан              | `q3`                                                         | нет    | Sendsay payload               |
| `SENDSAY_FIELD_ROLE`           | уже задан              | `q4`                                                         | нет    | Sendsay payload               |
| `SENDSAY_FIELD_EVENT_DATETIME` | уже задан              | `q5`                                                         | нет    | Sendsay payload               |
| `SENDSAY_EVENT_DATETIME`       | да вместе с field code | `2026-11-19 17:00:00` — подтверждённое московское время      | нет    | Sendsay payload               |
| `SENDSAY_FIELD_EVENT_ID`       | условно                | code скрытого event ID; задавать вместе со значением         | нет    | Sendsay payload               |
| `SENDSAY_EVENT_ID`             | условно                | согласованный event identifier                               | нет    | Sendsay payload               |
| `SENDSAY_TEST_FORM_ID`         | нет                    | оставить пустым; отдельная test-форма сейчас не используется | нет    | Form API URL в test build     |
| `SENDSAY_USE_TEST_FORM`        | нет, default `false`   | `true` только для test build                                 | нет    | выбор test/production Form ID |

Build читает `.env`, если файл существует, и environment процесса. `scripts/build.mjs` переносит в bundle только перечисленный allowlist; server secrets туда не копируются.

### SERVER SECRET / SERVER-ONLY

| Variable                     | Required                   | Что указать                                                      | Secret              | Где используется                |
| ---------------------------- | -------------------------- | ---------------------------------------------------------------- | ------------------- | ------------------------------- |
| `EMAIL_API_KEY`              | да при текущем Resend flow | Resend API key                                                   | **да**              | только `ResendEmailProvider`    |
| `EMAIL_FROM`                 | да                         | подтверждённый sender, например `Events <events@your-domain.ru>` | нет, но server-only | только `EmailService`           |
| `APP_ORIGIN`                 | да                         | точный HTTPS origin опубликованного сайта                        | нет, server-only    | Origin check `/api/register`    |
| `EMAIL_TEST_MODE`            | нет, default `false`       | `false` в production                                             | нет, server-only    | выбор organizer/test recipient  |
| `EMAIL_TEST_RECIPIENT`       | только если test mode      | тестовый адрес                                                   | нет, server-only    | test notification recipient     |
| `TRUST_LOCAL_PROXY`          | нет, default `false`       | `true` только для описанной выше proxy-схемы                     | нет, server-only    | client IP resolution/rate limit |
| `SENDSAY_IMPORT_WEBHOOK_URL` | для отправки напоминаний   | новый HTTPS URL вида `https://be.sendsay.ru/backend/api/...`     | **да**              | импорт согласившихся контактов  |
| `PORT`                       | нет, default `53860`       | port hosting platform, если она его задаёт                       | нет, server-only    | Node listener                   |
| `SERVER_HOST`                | нет, default `127.0.0.1`   | bind address согласно типу hosting                               | нет, server-only    | Node listener                   |

`.env` не коммитится. В production предпочтительно задавать `EMAIL_API_KEY` через secret store/environment hosting-платформы. `npm start` читает `.env`, если он существует, но также работает только с environment variables платформы.

## Sendsay

### Уже сделано

Интеграционный код полностью реализован:

```text
Custom form
→ frontend validation + honeypot
→ POST https://sendsay.ru/form/<ACCOUNT>/<FORM_ID>/
→ документированный ответ Sendsay Form API
→ если чекбокс отмечен: дождаться /api/register → server-side Sendsay import webhook
→ success UI
→ organizer notification через Resend (не задерживает success без чекбокса)
```

- Fetch находится в `src/services/sendsay/sendsayFormClient.js`, а не в React component.
- Mapping находится в `src/services/sendsay/sendsayConfig.js`.
- Email передаётся официальным параметром `_member_email`.
- Неизвестный ответ, `errors`, HTTP/network error и timeout не считаются успехом.
- При ошибке поля формы не очищаются; повторный submit разрешён.
- Form API вызывается из браузера и не использует API key.
- Webhook URL и любые Sendsay credentials нельзя добавлять во frontend env или bundle.
- Test Form ID выбирается отдельным флагом; unit tests не обращаются к Sendsay.

Интеграционный слой готов; до получения URL `SENDSAY_IMPORT_WEBHOOK_URL` остаётся пустым.

### Webhook для анонс-напоминаний

Чекбокс «Отправьте мне анонс-напоминание о мероприятии» необязательный и по умолчанию включён; посетитель может снять его перед отправкой формы. Регистрация сохраняется через Form API независимо от него. При отмеченном чекбоксе backend отправляет в webhook следующий JSON и ждёт успешный ответ перед показом success-экрана:

```json
{
  "email": "user@example.com",
  "name": "Имя Фамилия",
  "phone": "+7 999 000-00-00",
  "company": "Компания",
  "role": "Должность",
  "event_datetime": "2026-11-19 17:00:00",
  "reminder_consent": true,
  "reminder_consent_version": "2026-09-24",
  "reminder_consent_at": "2026-09-24T12:00:00.000Z",
  "source": "mts-ads-conference"
}
```

Владелец Sendsay должен сгенерировать новый webhook под эти ключи, настроить импорт контакта со статусом, разрешающим отправку без отдельного double opt-in, выбрать список/сценарий напоминаний и подтвердить mapping. Не использовать старую ссылку с Tilda. URL считается секретом: вставить его только в `SENDSAY_IMPORT_WEBHOOK_URL` на сервере, затем перезапустить Node process. Если чекбокс не отмечен, webhook не вызывается.

Для универсальной JSON-ссылки используется формат `https://be.sendsay.ru/backend/api/<API-КЛЮЧ>/member.set/...`; не добавлять параметр `newbie.confirm`, иначе контакт получит статус «Не подтверждён». При изменении юридического текста нужно изменить `REMINDER_CONSENT_VERSION` в `server/sendsay/sendsayImportWebhook.mjs`.

### Нужно заменить

Форма `24` выбрана для production, заполнена в конфигурации и проверена через публичный GET Form API. `SENDSAY_USE_TEST_FORM=false`; отдельный Form ID получать не нужно.

Production-форму следует проверить через:

```http
GET https://sendsay.ru/form/<ACCOUNT>/<FORM_ID>/
Accept: application/json
```

Проверить `obj.state: 1` и убедиться, что mapping совпадает с уже полученными codes:

| Поле сайта     | Sendsay                                      |
| -------------- | -------------------------------------------- |
| `email`        | `_member_email` — уже реализовано, не менять |
| `name`         | `q1` / `SENDSAY_FIELD_NAME`                  |
| `phone`        | `q2` / `SENDSAY_FIELD_PHONE`                 |
| `company`      | `q3` / `SENDSAY_FIELD_COMPANY`               |
| `role`         | `q4` / `SENDSAY_FIELD_ROLE`                  |
| event datetime | `q5` / `SENDSAY_FIELD_EVENT_DATETIME`        |

Production build использует форму `24`. При отсутствии `SENDSAY_FORM_ID` клиент безопасно остановится до network request и покажет контролируемую ошибку.

### Что проверить или настроить в Sendsay UI

Форма `24`, поля `q1–q5`, список `pl58174` и workflow `52` уже получены. Логика писем, время отправки и ссылки на шаблоны остаются на стороне владельца Sendsay и не блокируют работоспособность формы. Оставшиеся пункты:

1. До публичного запуска выполнить одну регистрацию контролируемым контактом через форму `24` и проверить список `pl58174`, значения `_member_email`, `q1–q5` и запуск писем без подтверждения со стороны посетителя.
2. Владельцу Sendsay самостоятельно поддерживать test workflow «Конференция МТС Ads — 19.11.2026 — TEST» (ID `52`), его шаблоны и расписание; передавать эти данные разработчику формы не требуется.
3. Использовать форму `24` на production и назначить ей нужный список внутри Sendsay; отдельную копию и ID списка разработчику не передавать.
4. Проверить в production-форме те же поля `_member_email`, `q1–q5`; для `q5` передавать `2026-11-19 17:00:00` по московскому времени.
5. Не требовать от посетителя подтверждать email или переходить по дополнительной ссылке.
6. Оставить форму `24` активной; её `state: 1` уже проверен через Form API.
7. Владельцу Sendsay поддерживать сценарий для формы `24`, который запускается после успешного заполнения формы; его название не влияет на код сайта.
8. Добавить EMAIL 1 после регистрации, затем согласованные reminders. Перед каждым фиксированным timer использовать условие по дате, чтобы late registrations пропускали уже прошедшие моменты.
9. Включить в Sendsay уведомление организатору о заполнении формы и настроить получателя/шаблон этого уведомления.
10. Оставить `SENDSAY_FORM_ID=24` и `SENDSAY_USE_TEST_FORM=false`, затем выполнить production build.
11. Сгенерировать новый import webhook по JSON-контракту выше, выбрать в Sendsay подтверждённый/доступный для рассылки статус, список и сценарий; передать разработчику только URL.
12. Убедиться, что сценарий напоминаний запускается только для контактов из webhook-ветки с `reminder_consent=true`, а не для всех заявок формы `24`.

Расписание писем не реализуется на сайте: оно целиком настраивается в Sendsay Automations. Посетитель не должен подтверждать email. Если Sendsay возвращает только `error/draft/emptyfromemail`, заявка уже сохранена, поэтому сайт показывает success-экран; любые другие ошибки продолжают считаться ошибками регистрации.

Официальные инструкции: [Form API](https://docs.sendsay.ru/sendsay-api/how-to-use-api-form/), [формы Sendsay](https://docs.sendsay.ru/site/forms/signup-forms/), [сценарий мероприятия](https://docs.sendsay.ru/automations/triggers/workflow-for-event/), [workflow blocks](https://docs.sendsay.ru/automations/automation-with-workflows/workflow-blocks/).

## Email-уведомление организатору

Resend выбран как **временный тестовый email-провайдер**. Это не SMTP и не часть рассылок участникам в Sendsay: через Resend отправляется только внутреннее уведомление организатору о новой регистрации.

Для production доступны два варианта:

- оставить Resend и задать `EMAIL_API_KEY` и `EMAIL_FROM`;
- заменить Resend на корпоративный SMTP МТС. Для этого разработчику нужно добавить SMTP-адаптер в `server/email/providers/` и подключить его вместо `ResendEmailProvider`. Frontend, форму Sendsay и `/api/register` менять не требуется.

SMTP МТС сейчас в код не подключён: потребуются адрес сервера, порт, логин, пароль, режим TLS и адрес отправителя. Эти данные должны храниться только в server secret store.

### Уже сделано

После успешного Sendsay submit браузер вызывает `/api/register`. Server повторно валидирует payload и через `RegistrationService → EmailService → ResendEmailProvider` отправляет plain-text письмо «Новая регистрация на конференцию» организатору.

Ошибка Resend не отменяет уже сохранённую Sendsay-регистрацию и не заставляет участника отправлять форму повторно. Rate limiting, idempotency, timeout и test-recipient routing уже реализованы.

При `EMAIL_TEST_MODE=true` техническая недоступность или отсутствие конфигурации Sendsay включает локальный fallback: браузер отправляет заявку напрямую в `/api/register`, а Resend доставляет её только на `EMAIL_TEST_RECIPIENT`. Ошибки email и полей формы не обходятся. При `EMAIL_TEST_MODE=false` server отклоняет fallback.

### Если остаётся Resend

1. Задать `EMAIL_API_KEY` в server secret store.
2. Задать `EMAIL_FROM` с подтверждённого в Resend домена.
3. Подтвердить `PRODUCTION_ORGANIZER_ADDRESS` в `server/config/registrationConfig.mjs`; заменить только если текущий адрес не является production recipient.
4. Оставить `EMAIL_TEST_MODE=false` в production.

Уведомление организатору разрешено включить и в Sendsay. Текущий `/api/register` с Resend при этом остаётся включённым, поэтому организатор может получить два уведомления на одну регистрацию: одно от Sendsay и одно от Resend. Для текущего проекта это допустимо. Если позже понадобится только одно письмо, один из каналов следует отключить отдельным изменением.

## Сборка проекта

Отдельный сборщик или отдельный frontend-проект **не нужен**. В репозитории уже есть `scripts/build.mjs`, который использует установленный `esbuild`, собирает React/CSS, добавляет public-конфигурацию Sendsay и создаёт готовые файлы в `outputs/`.

```sh
npm ci          # установить зависимости
npm run check   # запустить тесты и затем сборку
npm start       # запустить готовый Node server
```

Переменные Sendsay нужно задать до `npm run check`, потому что они встраиваются в browser bundle. Отдельно устанавливать esbuild, Webpack или Vite не требуется — все зависимости устанавливает `npm ci`.

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

   `npm run check` запускает все тесты, затем встроенную сборку. Она создаёт `outputs/mts-ads-portrait-frames-current.html`, fingerprinted JS/CSS и `.br`/`.gz` sidecars.

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
3. До публичного запуска использовать контролируемый контакт в форме `24`.
4. Отправить форму один раз и убедиться, что кнопка блокируется на время запроса.
5. Проверить в browser Network прямой POST на `https://sendsay.ru/form/.../` и последующий same-origin POST `/api/register`.
6. Проверить контакт и mapping пяти полей в Sendsay.
7. Убедиться, что сценарий Sendsay и напоминания запускаются после заполнения формы без действий со стороны посетителя.
8. Проверить внутреннее письмо организатору через Resend.
9. Убедиться, что сборка создана с `SENDSAY_USE_TEST_FORM=false`, и выполнить одну согласованную production-регистрацию.

## Основные файлы

| Область                       | Файл                                                                      |
| ----------------------------- | ------------------------------------------------------------------------- |
| UI формы                      | `src/components/Registration/Registration.jsx`                            |
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
- [ ] Выполнить контролируемую регистрацию через форму `24` и проверить список `pl58174` и workflow `52` без подтверждения email посетителем.
- [x] Использовать Form ID `24` на production; список участников владелец Sendsay назначает внутри формы, его ID проекту не нужен.
- [x] Указать `SENDSAY_EVENT_DATETIME=2026-11-19 17:00:00` вместе с code `q5` скрытого datetime-поля.
- [ ] Владельцу Sendsay настроить письма, расписание и organizer notification без обязательного подтверждения email посетителем; ссылки и внутреннюю логику не требуется передавать разработчику формы.
- [ ] Задать production `APP_ORIGIN`, Sendsay public config и настройки выбранного email-транспорта: Resend либо SMTP МТС.
- [ ] Оставить `EMAIL_TEST_MODE=false` и `SENDSAY_USE_TEST_FORM=false` для production build.
- [ ] Выбрать подходящие `SERVER_HOST`/`PORT` для hosting.
- [ ] Выполнить `npm ci` и `npm run check`.
- [ ] Запустить `npm start`, опубликовать port и включить HTTPS.
- [ ] Проверить `GET /` и загрузку static assets.
- [ ] Выполнить контролируемую регистрацию через форму `24`, проверить mapping, automation, письма и оба organizer notification — Sendsay и Resend.
- [ ] Пересобрать production mode и выполнить одну согласованную production-регистрацию.
