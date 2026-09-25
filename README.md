# Конференция МТС Ads

React 19 сайт конференции с интеграцией только с Sendsay. Sendsay сохраняет заявки, управляет списками, сценариями, письмами участникам и уведомлениями организатору.

## Данные мероприятия

- Дата: **19 ноября 2026 года**.
- Время: **17:00 МСК**.
- Значение даты для Sendsay: `2026-11-19 17:00:00`.
- Адрес: **Арбатская площадь, 14, строение 1, кинотеатр «Художественный»**.

Дата, время и адрес подтверждены и не требуют дополнительного согласования.

Подтверждённый production URL сайта: **https://ads.mts.ru/conf**.

## Как работает регистрация

```text
Форма на сайте
→ проверка полей и honeypot
→ чекбокс включён: backend сохраняет заявку через Sendsay webhook
→ чекбокс снят: браузер сохраняет заявку через Sendsay Form API
→ экран успешной регистрации
```

- Чекбокс «Отправьте мне анонс-напоминание о мероприятии» необязательный и включён по умолчанию.
- Если чекбокс включён, заявка отправляется только через backend в import webhook. Form API перед этим не вызывается, поэтому он не создаёт контакт со статусом «Подписка не подтверждена».
- Если чекбокс снят, backend и webhook не вызываются: заявка отправляется напрямую в форму `24` через Form API.
- Посетителю не нужно подтверждать email или переходить по дополнительной ссылке.
- Своей базы участников в проекте нет: данные хранятся в Sendsay.
- Расписание писем и уведомление организатору настраиваются только в Sendsay.

## Конфигурация Sendsay

| Параметр | Значение |
| --- | --- |
| Account code | `mtsmarketolog` |
| Production Form ID | `24` |
| Email | `_member_email` |
| Фамилия и имя | `q1` |
| Телефон | `q2` |
| Компания | `q3` |
| Должность | `q4` |
| Дата мероприятия | `q5` |
| Event ID | не используется |
| Тестовый список | `pl58174` |
| Тестовый сценарий | «Конференция МТС Ads — 19.11.2026 — TEST», ID `52` |

Форма `24` активна (`state: 1`) и используется для заявок без согласия на напоминания. Отдельная production-копия формы и ID production-списка коду не нужны: назначения выполняются внутри Sendsay.

## Webhook напоминаний

`SENDSAY_IMPORT_WEBHOOK_URL` генерирует сотрудница в Sendsay. Это секретная ссылка с ключом, поэтому её нужно помещать только в `.env` сервера или secret store хостинга. В `.env.example` оставляется пустое значение.

Backend отправляет в webhook такой JSON:

```json
{
  "memberemail": "user@example.com",
  "anketa": {
    "event": {
      "fullName": "Имя Фамилия",
      "phone": "+7 999 000-00-00",
      "company": "Компания",
      "jobTitle": "Должность",
      "eventDate": "2026-11-19 17:00:00"
    }
  },
  "reminder_consent": true,
  "reminder_consent_version": "2026-09-24",
  "reminder_consent_at": "2026-09-24T12:00:00.000Z",
  "source": "mts-ads-conference"
}
```

Webhook URL сопоставляет `memberemail` с `member.email`, а вложенные значения `anketa.event.*` — с одноимёнными полями анкеты. Это контракт для заявок с согласием на напоминания. Form API формы `24` принимает `_member_email` и `q1–q5` только при снятом чекбоксе.

Если webhook недоступен, заявка с согласием не считается сохранённой: форма остаётся заполненной и предлагает повторить отправку.

## Переменные окружения

Скопируйте шаблон:

```sh
cp .env.example .env
```

Frontend-переменные встраиваются в сборку:

| Переменная | Значение |
| --- | --- |
| `SENDSAY_ACCOUNT` | `mtsmarketolog` |
| `SENDSAY_FORM_ID` | `24` |
| `SENDSAY_FIELD_NAME` | `q1` |
| `SENDSAY_FIELD_PHONE` | `q2` |
| `SENDSAY_FIELD_COMPANY` | `q3` |
| `SENDSAY_FIELD_ROLE` | `q4` |
| `SENDSAY_FIELD_EVENT_DATETIME` | `q5` |
| `SENDSAY_EVENT_DATETIME` | `2026-11-19 17:00:00` |
| `SENDSAY_USE_TEST_FORM` | `false` для production |
| `PUBLIC_BASE_PATH` | локально `/`; для production URL — `/conf/` |
| `REGISTRATION_API_URL` | локально `http://127.0.0.1:53861/api/register`; за единым reverse proxy — `/api/register` |

Server-only переменные:

| Переменная | Назначение |
| --- | --- |
| `APP_ORIGIN` | origin без пути: локально `http://127.0.0.1:53860`, в production `https://ads.mts.ru` |
| `SENDSAY_IMPORT_WEBHOOK_URL` | секретный Sendsay webhook для согласившихся на напоминания |
| `TRUST_LOCAL_PROXY` | `true` только за настроенным доверенным proxy |
| `SPA_PORT` | порт SPA, по умолчанию `53860` |
| `API_PORT` | порт API, по умолчанию `53861` |
| `SERVER_HOST` | bind address, по умолчанию `127.0.0.1` |

После изменения frontend-переменных выполните новую сборку. `.env` не коммитится.

## Установка, проверка и сборка

Отдельный сборщик не нужен: проект уже использует `scripts/build.mjs` и установленный `esbuild`.

```sh
npm ci
npm test       # тесты без реальных запросов в Sendsay
npm run build  # production-сборка в outputs/
npm run check  # тесты + production-сборка
```

Сборка создаёт HTML, fingerprinted JS/CSS и сжатые `.br`/`.gz` файлы в `outputs/`.

## Локальный запуск

SPA и API запускаются отдельно, в двух терминалах:

```sh
# Терминал 1: API, http://127.0.0.1:53861
npm run server

# Терминал 2: SPA, http://127.0.0.1:53860
npm start
```

Сначала заполните `.env`, затем выполните `npm run build`, потом запустите оба процесса.

## Base URL и статические файлы

`PUBLIC_BASE_PATH` — build-time настройка. `npm run build` записывает её в
`<base href="...">` внутри `outputs/index.html` и
`outputs/mts-ads-portrait-frames-current.html`. Браузер использует этот base URL
для всех относительных ссылок на JS, CSS, шрифты, изображения и favicon.

Значение должно начинаться и заканчиваться `/`:

| Окружение | Адрес сайта | `PUBLIC_BASE_PATH` | Пример URL статики |
| --- | --- | --- | --- |
| Локально | `http://127.0.0.1:53860/` | `/` | `/assets/fact-time.svg` |
| GitHub Pages | `https://mmetrin.github.io/conf/` | `/conf/` | `/conf/assets/fact-time.svg` |
| Production | `https://ads.mts.ru/conf/` | `/conf/` | `/conf/assets/fact-time.svg` |

После изменения `PUBLIC_BASE_PATH` нужна новая сборка: значение в runtime не
переключается.

```sh
# Локальная сборка
PUBLIC_BASE_PATH=/ \
REGISTRATION_API_URL=http://127.0.0.1:53861/api/register \
npm run build

# Сборка для GitHub Pages или production-пути /conf/
PUBLIC_BASE_PATH=/conf/ \
REGISTRATION_API_URL=/api/register \
npm run build
```

Пути к frontend-ресурсам в HTML, JSX и CSS должны оставаться относительными,
например `assets/fact-time.svg`. Путь с начальным `/`, например
`/assets/fact-time.svg`, игнорирует `<base>` и на GitHub Pages ошибочно указывает
на корень `mmetrin.github.io` вместо `/conf/`.

Встроенный Node static server раздаёт содержимое каталога `outputs/` от корня:
запрос `/assets/fact-time.svg` соответствует файлу
`outputs/assets/fact-time.svg`. Сам сервер не удаляет префикс `/conf`, поэтому в
production reverse proxy должен сделать это до передачи запроса Node-серверу:

```nginx
location = /conf {
    return 301 /conf/;
}

location /conf/ {
    proxy_pass http://127.0.0.1:53860/;
}

location /api/register {
    proxy_pass http://127.0.0.1:53861;
}
```

Завершающий `/` в `proxy_pass http://127.0.0.1:53860/;` важен: благодаря ему
запрос `/conf/assets/fact-time.svg` передаётся SPA-серверу как
`/assets/fact-time.svg`.

`PUBLIC_BASE_PATH` не заменяет `APP_ORIGIN` и `REGISTRATION_API_URL`:

- `APP_ORIGIN` содержит только origin без `/conf`, например
  `https://ads.mts.ru`;
- `REGISTRATION_API_URL=/api/register` остаётся корневым API-маршрутом и не
  получает префикс `/conf`;
- GitHub Pages публикует только статику и не запускает Node API, поэтому
  серверный сценарий регистрации через `/api/register` там недоступен.

Проверить результат сборки можно так:

```sh
rg '<base href=' outputs/index.html
curl -I https://mmetrin.github.io/conf/
curl -I https://mmetrin.github.io/conf/assets/fact-time.svg
```

### Серверные логи регистрации

`npm run server` пишет JSON-логи для `POST /api/register` и Sendsay webhook. Все строки одной попытки связаны общим `requestId`. События `api.request.*` показывают результат API, а `sendsay.request.*` и `sendsay.response.*` — результат webhook. Логи содержат HTTP-статус, длительность и безопасный код причины, но не содержат данные участника, API key или webhook URL. Прямой browser-запрос в Sendsay Form API в серверные логи не попадает.

## Deployment

Подтверждённая production-конфигурация для `https://ads.mts.ru/conf`:

```env
APP_ORIGIN=https://ads.mts.ru
PUBLIC_BASE_PATH=/conf/
REGISTRATION_API_URL=/api/register
```

`APP_ORIGIN` не должен содержать `/conf`: HTTP-заголовок `Origin` включает только протокол и домен. `PUBLIC_BASE_PATH` обязательно заканчивается `/` и задаёт базу для JS, CSS, шрифтов и изображений.

1. Установить Node.js 22+ и выполнить `npm ci`.
2. Задать production `APP_ORIGIN` и секретный `SENDSAY_IMPORT_WEBHOOK_URL`.
3. До сборки задать публичные Sendsay-переменные, `PUBLIC_BASE_PATH=/conf/` и `REGISTRATION_API_URL=/api/register`.
4. Выполнить `npm run check`.
5. Запустить `npm run server` и `npm start`.
6. Опубликовать оба процесса через HTTPS/reverse proxy.
7. Направить `/api/register` на API, а `/conf` и `/conf/*` — на SPA с удалением префикса `/conf` перед передачей Node static server. Остальные маршруты домена не перехватывать.

Если CSP задаётся на proxy/CDN, в `connect-src` нужно разрешить `'self'`, `https://sendsay.ru` и отдельный API origin, если он используется.

## Что настроить сотруднице в Sendsay

1. Оставить форму `24` активной для регистраций без согласия на напоминания и назначить ей нужный production-список.
2. Проверить Form API mapping `_member_email`, `q1–q5` и соответствующие поля `anketa.event.*` в Sendsay.
3. Настроить письма и напоминания на дату **19.11.2026, 17:00 МСК**.
4. Настроить уведомление организатору о новой заявке внутри Sendsay.
5. Не включать обязательное подтверждение email участником.
6. Создать import webhook под JSON-контракт выше и передать разработчику только его URL.
7. Настроить webhook так, чтобы контакт становился доступен для рассылки и попадал в сценарий напоминаний только при `reminder_consent=true`.
8. Выполнить одну контролируемую регистрацию и проверить контакт, поля, список, сценарий и письма.

Логика писем, их время и ссылки на шаблоны могут меняться в Sendsay без изменений кода сайта.

Официальная документация: [Form API](https://docs.sendsay.ru/sendsay-api/how-to-use-api-form/), [формы Sendsay](https://docs.sendsay.ru/site/forms/signup-forms/), [сценарий мероприятия](https://docs.sendsay.ru/automations/triggers/workflow-for-event/), [workflow blocks](https://docs.sendsay.ru/automations/automation-with-workflows/workflow-blocks/).

## Проверка после публикации

1. Открыть HTTPS-сайт и проверить отсутствие 404 и ошибок в console.
2. Отправить форму контролируемым контактом.
3. При включённом чекбоксе проверить единственный POST в `/api/register` и отсутствие запроса в Form API.
4. Проверить сохранённый контакт и значения полей `anketa.event.*`.
5. Проверить сценарий, письма участнику и уведомление организатору в Sendsay.
6. Повторить отправку со снятым чекбоксом: должен вызываться Form API с `_member_email`, `q1–q5`, а webhook — нет.

## Основные файлы

| Область | Файл |
| --- | --- |
| UI формы | `src/components/Registration/Registration.jsx` |
| Form API client | `src/services/sendsay/sendsayFormClient.js` |
| Sendsay mapping | `src/services/sendsay/sendsayConfig.js` |
| submit flow | `src/services/registration/registrationSubmission.js` |
| API entry | `server/start-api.mjs`, `server/register.mjs` |
| webhook adapter | `server/sendsay/sendsayImportWebhook.mjs` |
| server validation | `server/registration/*` |
| SPA entry | `server/start-spa.mjs` |
| build | `scripts/build.mjs` |
| tests | `tests/*.test.mjs` |

## Безопасность

- Webhook URL и любые секретные ключи нельзя помещать во frontend-переменные или bundle.
- API принимает только JSON с разрешёнными полями, проверяет `Origin`, размер body, honeypot и rate limit.
- Не логировать данные заявки, raw IP, webhook URL и ответы Sendsay с секретами.
- Для нескольких API instances нужен общий rate-limit store; текущий limiter хранится в памяти процесса.
