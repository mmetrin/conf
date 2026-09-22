# Конференция МТС Ads

## Локальный запуск и тест формы

Нужен Node.js 22 или новее.

```sh
npm ci
cp .env.example .env
```

В `.env` укажите ключ Resend, адрес отправителя и тестового получателя:

```env
EMAIL_API_KEY=...
EMAIL_FROM=onboarding@resend.dev
APP_ORIGIN=http://127.0.0.1:53860
PORT=53860

EMAIL_TEST_MODE=true
EMAIL_TEST_RECIPIENT=ваш-тестовый-адрес@example.com
```

Затем запустите проверки и сервер:

```sh
npm run check
npm start
```

Откройте http://127.0.0.1:53860/mts-ads-portrait-frames-current.html, заполните форму и отправьте её. Письмо должно прийти на адрес из `EMAIL_TEST_RECIPIENT`.

## Перед публикацией

1. Установите `EMAIL_TEST_MODE=false`.
2. Настройте подтверждённый домен и рабочий адрес отправителя в Resend.
3. Укажите публичный адрес сайта в `APP_ORIGIN`.
4. Выполните `npm run check` и отправьте одну тестовую заявку по HTTPS.

Файл `.env` содержит секреты и не должен попадать в Git.
