# Передача проекта МТС Ads

## Назначение

Проект — React 19 сайт конференции с Sendsay как единственной системой приёма заявок и коммуникации. Собственной базы участников нет.

Подтверждённые данные мероприятия:

- 19 ноября 2026 года;
- 17:00 МСК;
- Арбатская площадь, 14, строение 1, кинотеатр «Художественный».

Подтверждённый production URL: **https://ads.mts.ru/conf**.

## Поток регистрации

```text
Registration UI
→ с согласием: POST /api/register → server-only Sendsay import webhook
→ без согласия: browser-only Sendsay Form API
→ success UI
```

Чекбокс напоминаний необязательный и включён по умолчанию. С ним заявка идёт только через webhook, без предварительного вызова Form API и создания неподтверждённого контакта. Без чекбокса `/api/register` не вызывается: браузер отправляет заявку в Form API, где email передаётся как `_member_email`.

Webhook URL содержит секрет и хранится только в server environment. Backend нужен именно для сокрытия URL, проверки запроса и передачи согласия в Sendsay.

## Конфигурация Sendsay

| Что | Значение |
| --- | --- |
| Account | `mtsmarketolog` |
| Production Form ID | `24`, форма активна |
| Email | `_member_email` |
| Имя | Form API `q1` → `anketa.event.fullName` |
| Телефон | Form API `q2` → `anketa.event.phone` |
| Компания | Form API `q3` → `anketa.event.company` |
| Должность | Form API `q4` → `anketa.event.jobTitle` |
| Дата мероприятия | Form API `q5` → `anketa.event.eventDate`, значение `2026-11-19 17:00:00` |
| Event ID | не используется |
| Тестовый список | `pl58174` |
| Тестовый workflow | ID `52` |

Production-список выбирается внутри формы в Sendsay; его ID коду не нужен. Отдельная production-копия формы не требуется.

## Server environment

Обязательные значения:

| Переменная | Назначение |
| --- | --- |
| `APP_ORIGIN` | `https://ads.mts.ru` — только origin, без `/conf` |
| `SENDSAY_IMPORT_WEBHOOK_URL` | секретный URL импорта согласившихся контактов |

Production build-time значения: `PUBLIC_BASE_PATH=/conf/` и `REGISTRATION_API_URL=/api/register`. Дополнительные server values: `TRUST_LOCAL_PROXY`, `SERVER_HOST`, `SPA_PORT`, `API_PORT`. Полный список находится в `.env.example`.

Секретный webhook нельзя коммитить, добавлять в `.env.example` или встраивать в frontend bundle.

## Запуск и сборка

```sh
npm ci
npm run check
```

Процессы запускаются отдельно:

```sh
npm run server  # API, default 127.0.0.1:53861
npm start       # SPA, default 127.0.0.1:53860
```

Отдельный frontend-сборщик не нужен. `scripts/build.mjs` использует `esbuild` и пишет production-файлы в `outputs/`.

API пишет структурированные JSON-логи `api.request.*`, `sendsay.request.*` и `sendsay.response.*` с общим `requestId`. Персональные данные, API key и webhook URL не логируются.

## Deployment

- Итоговая страница публикуется по `https://ads.mts.ru/conf`.
- Перед production build задать `APP_ORIGIN=https://ads.mts.ru`, `PUBLIC_BASE_PATH=/conf/` и `REGISTRATION_API_URL=/api/register`.
- В production оставить `SENDSAY_FORM_ID=24` и `SENDSAY_USE_TEST_FORM=false`.
- Направить `/api/register` на API.
- Направить `/conf` и `/conf/*` на SPA, удаляя префикс `/conf` перед передачей Node static server; остальные страницы `ads.mts.ru` не перехватывать.
- Опубликовать оба процесса через HTTPS.
- Не указывать `/conf` в `APP_ORIGIN`: browser origin равен `https://ads.mts.ru`.
- Если используется отдельный API origin, разрешить его в CSP `connect-src` вместе с `https://sendsay.ru`.

## Что проверить в Sendsay

1. Форма `24` активна и принимает `_member_email`, `q1–q5` для заявок без согласия; webhook принимает `memberemail` и `anketa.event.*` для заявок с согласием.
2. Production-список назначен внутри формы.
3. Подтверждение email участником не требуется.
4. Сценарий писем настроен на 19.11.2026, 17:00 МСК.
5. Уведомление организатору настроено в Sendsay.
6. Import webhook принимает JSON из README и добавляет согласившегося участника в нужный сценарий.
7. Без чекбокса вызывается только Form API; с чекбоксом вызывается только webhook и контакт доступен для рассылки.
8. Выполнена одна production smoke-регистрация.

Ответ Form API только с `error/draft/emptyfromemail` считается предупреждением после сохранения и приводит к success-экрану. Другие ошибки не маскируются.

## Безопасность

API проверяет method, JSON content type, exact Origin, размер body, allowlist полей, honeypot и rate limit. Данные нормализуются и повторно валидируются на сервере. Ошибки Sendsay не раскрывают клиенту внутренние детали.

Не логировать данные заявок, raw IP, webhook URL и ответы провайдера с секретами. При нескольких API replicas требуется общий rate-limit store.

## Основные файлы

```text
src/components/Registration/Registration.jsx
src/services/sendsay/sendsayConfig.js
src/services/sendsay/sendsayFormClient.js
src/services/registration/registrationSubmission.js
server/start-api.mjs
server/start-spa.mjs
server/register.mjs
server/registration/*
server/sendsay/sendsayImportWebhook.mjs
server/security/*
server/http/*
scripts/build.mjs
tests/*.test.mjs
```

## Проверки

`npm run check` запускает тесты и production build. Тесты не выполняют реальные запросы в Sendsay.
