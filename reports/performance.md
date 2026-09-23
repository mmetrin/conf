# Технический аудит производительности

## Финальная проверка 23.09.2026

Этот раздел описывает текущую доработку поверх уже изменённого рабочего дерева. Ниже сохранён предыдущий аудит; его цифры и описание fail-safe относятся к прежней версии.

### Найдено и исправлено

- Audience, нижний DOM и разрешение на запуск WebGL зависели от завершения всех 30 кадров. На медленной сети программа могла оставаться без эффекта даже при прокрутке к ней. Теперь audience и нижний модуль запрашиваются после `hero-visible`; WebGL подготавливается по приближению к audience или при запросе показа, независимо от sequence. Первый портрет программы загружается eager после mount нижнего модуля, остальные — lazy.
- Ошибка обязательного ресурса оставляла loader без возможности восстановления. Добавлена кнопка повторной загрузки при ошибке или ожидании более 30 секунд. Это НЕ таймер принудительного открытия: незавершённый первый экран не показывается. Если ресурсы всё же загружаются, сообщение снимается и продолжается прежняя opening-анимация.
- Отказ загрузки шрифта создавал необработанные rejection в подписчиках сцены. Ошибка теперь обрабатывается владельцем critical loading.
- Отклонённый Promise particle-reference навсегда сохранялся в общем кеше. Кеш ошибки сбрасывается, следующая подготовка может повторить запрос. Используется общий decode-helper с поддержкой браузерного отказа decode при уже загруженных пикселях.
- Правый particle-canvas мог снова активироваться после перехода на мобильный breakpoint. Активность теперь проверяет текущий breakpoint, включая завершение async-загрузки; после unmount импорт больше не начинает создание renderer.
- На mobile класс `assets-ready` менял нижний padding формы с 110 px на 0. Итоговое значение теперь задано сразу, загрузка ribbon не меняет геометрию.

### Дополнительная проверка Safari 23.09.2026

Проверена текущая production-сборка на `http://127.0.0.1:53860/` в настоящем Safari 26.5 на macOS 26.5.1 (версия из меню «Разработка»), без изменения кода.

- Desktop: первая загрузка и повторная загрузка, hero-шрифты и canvas-текст, sequence, audience/particle-графика, программа/WebGL, форма и футер; прокрутка вниз и обратно к hero.
- Responsive Design Mode: 375×812, DPR 2; первый экран после resize и reload, мобильное меню, переходы к программе и регистрации, валидация пустой формы без отправки данных.
- Переключение на другую вкладку и возврат: первый экран продолжил отображаться корректно.
- Консоль при desktop-проходе не показала ошибок. В проверенных состояниях не обнаружено пропавших изображений/шрифтов или воспроизводимого отличия верстки, требующего Safari-specific исправления.
- Попытка записи через Safari Timelines не дала пригодного сохранённого trace с метриками кадров. Числа FPS, p95 frame time и утверждение об отсутствии микролагов не приводятся. Нужен отдельный воспроизводимый замер для строгого вывода о плавности.
- Responsive Design Mode использует desktop Safari: физический iPhone/iPad, старые версии Safari и медленная сеть в Safari не проверены. Нельзя переносить этот результат на все iOS-устройства.

### Порядок загрузки

1. Сразу: critical CSS/JS, hero-шрифты, проекторы, UI первого экрана, первый декодированный кадр sequence. Loader ждёт обязательные ресурсы и подготовку canvas-текста.
2. После фактического открытия hero: кадры 2–30 с прежней ограниченной конкурентностью, код нижних секций и подготовка particle-reference. Полная sequence не блокирует остальные экраны.
3. Sequence начинает движение только после готовности кадров; до этого сохраняется первый кадр. Timing, порядок кадров, изображения и эффекты не менялись.
4. Остальные портреты — lazy; ribbon — около формы; WebGL — при приближении/показе программы. Ресурсы следующих секций не добавлены в ожидание loader.

### Проверки

- `npm run check`: 51 тест и production build проходят. Добавлены сценарии незавершённой фоновой sequence и ошибки критического шрифта; сохранён тест ожидания decode второго проектора.
- Автотесты охватывают lifecycle 1600×940, 768×1024, 375×812, resize, прокрутку, reduced motion, cleanup, форму и статические assets.
- В Chrome проверены первый экран, audience, программа, форма и футер. Первому экрану и нижним секциям сделано визуальное сравнение до/после; намеренных изменений обычного визуала нет.
- Текущая сборка: initial JS 263 250 Б, async JS 54 631 Б, CSS 69 926 Б (без сжатия). Не сравнивать напрямую с прежней таблицей: между аудитами в рабочем дереве были другие пользовательские изменения.
- В Chrome дополнительно проверена мобильная эмуляция iPhone XR 414×896 с профилем 3G и hard reload: loader, готовый hero, audience, программа, форма и футер. Ошибок выполнения не замечено. При закрытии мобильного меню Chrome показал существующее предупреждение доступности `aria-hidden` из-за фокуса внутри меню; оно не связано с загрузкой/производительностью и оставлено за рамками этой доработки.
- `npm run images:verify` и `git diff --check` проходят. Растры не перекодировались.
- Lighthouse/FPS и точные CLS/INP не измерялись; автоматический lifecycle-тест не заменяет браузерный performance trace.

---

## Было

- Loader формально ждал только первый кадр, но кадры 2–30 начинали загружаться сразу после него — ещё до показа страницы — и конкурировали за сеть с критическими шрифтами и hero.
- Sequence состояла из 30 PNG 2012×1132 общим объёмом 29,80 МБ. Максимальный декодированный RGBA-кеш на Retina достигал примерно 273,3 МБ.
- Две particle-canvas анимации запускали независимые бесконечные RAF-циклы сразу при mount, включая мобильный breakpoint, где canvas скрыт через `display:none`. Их исходное изображение 1906×1842 весило 1,89 МБ и декодировалось/семплировалось отдельно.
- WebGL программы создавался при первом открытии, хотя изначально был невидим. Programme, registration, footer и их логика входили в critical JS/DOM.
- Декоративный фон формы и крупные портреты программы были физически значительно больше фактического render-size.
- В hot scroll-path оставались layout-read и DOM-write для CSS-переменной, которая не влияла на визуал. После перехода к registration основной canvas-runtime продолжал просыпаться.
- До CSS не было inline-страховки фона. Это оставляло окно для браузерного белого background на холодной загрузке.
- В зависимостях оставался неиспользуемый `three`; в assets — старые неиспользуемые изображения и SVG.

## Изменено

- Sequence переведена на WebP 1440×810, quality 92. Все 30 кадров собраны одним профилем непосредственно из PNG-оригиналов. Кадры декодируются в ограниченный bitmap/canvas-кеш; на устройствах с `deviceMemory <= 4` ширина кеша дополнительно ограничивается 1130 px.
- Реализован явный state machine sequence: отдельно frame 1, отдельно background batch, флаг `ready` только после успешного декодирования всех кадров. Конкурентность — 2, на Save-Data/2G — 1. Между кадрами выполнение уступает main thread.
- При ошибке кадр повторяется один раз; ошибка frame 1 даёт тёмный согласованный fallback, ошибка любого фонового кадра оставляет frame 1 статичным и освобождает частичный кеш. Loader имеет общий 15-секундный fail-safe.
- Background sequence стартует по событию фактического скрытия loader, а не при mount.
- Сборка переведена с одного IIFE на ESM code splitting. Programme/registration/footer, lower scroll-runtime, WebGL и particle-renderer вынесены в async chunks.
- Нижний DOM запрашивается после завершения sequence либо раньше по намерению пользователя/приближению к audience. До этого его место резервирует стабильный placeholder.
- Particle-reference загружается один раз, семплируется один раз и разделяется двумя canvas. Оба canvas обслуживает один общий scheduler; на mobile chunk/asset не запрашиваются. Эффект ставится на паузу вне своей сцены и при hidden/reduced-motion.
- WebGL создаётся только при фактическом входе в программу. Registration ribbon загружается через IntersectionObserver с root margin.
- Все animation callbacks используют общий browser RAF. Сцена и CSS-анимации останавливаются при входе в registration, при hidden/pagehide и вне активной области.
- Удалены бесполезные read/write из scroll-path, лишние CSS-селекторы отсутствующих DOM-узлов и невидимый registration pseudo-layer.
- В HTML добавлены синхронные тёмные background/color-scheme/theme-color; критические preload приведены в соответствие реально используемым hero-шрифтам и изображениям.
- Статический Node-сервер отдаёт HTML/JS/CSS/SVG с Brotli (gzip fallback), `Vary: Accept-Encoding`; хешированные JS/CSS получают immutable cache, HTML — `no-cache`.
- Крупные растровые изображения приведены к фактическому размеру показа: programme portraits 96/192 px WebP с `srcset`, particle-reference 800×773 WebP, downward projector 1200×599 WebP, ribbon 700/1400 px WebP/AVIF.

## Loading

1. HTML сразу задаёт тёмный фон; loader появляется без белого промежуточного кадра.
2. Высокий приоритет получают только CSS, initial JS, три hero-шрифта, два projector-изображения и frame 1.
3. Loader ждёт hero typography/UI/projectors и декодированный frame 1; все необязательные ошибки ограничены fail-safe.
4. Страница показывается, frame 1 остаётся статичным.
5. После скрытия loader кадры 2–30 грузятся с низким приоритетом и bounded concurrency.
6. Только после успешного decode всех 30 кадров sequence начинает проигрываться с прежним timing.
7. После sequence подгружается audience; Programme и всё ниже — async. При быстром scroll/navigation эти chunks повышаются по пользовательскому намерению.
8. WebGL, programme images и registration ribbon активируются только около своих секций.

## Removed

- npm dependency `three` (в исходниках не импортировалась).
- Неиспользуемые `inline-33b8b77cc1e7.svg`, `inline-f0abee9a5e65.svg`, `main-mts-particle.png`, `programme/light-on.png`.
- Исходные production PNG после замены на проверенные WebP: 30 sequence frames, пять programme portraits, particle-reference и registration ribbon.
- CSS для отсутствующих projector/object SVG, `#audience`, `.photo-roles__dot` и всегда прозрачного registration pseudo-layer.
- Два независимых particle RAF-loop и мёртвое scroll-обновление `--registration-scroll-fade`.

## Performance

Статические production-метрики (несжатые, если не указано иное):

| Показатель | До | После | Изменение |
| --- | ---: | ---: | ---: |
| Initial JS | 299 019 Б | 258 861 Б | −13,4% |
| Initial JS gzip | 94 023 Б | 82 132 Б | −12,6% |
| HTML + initial JS + CSS через текущий сервер | 349 943 Б без compression | 88 511 Б Brotli | −74,7% |
| Async JS | 0 Б | 46 501 Б | вынесено из critical path |
| CSS | 49 967 Б | 49 990 Б | ≈0% |
| Оценка ресурсов полностью собранного hero | 2 281 023 Б | 888 426 Б | −61,1% |
| Все `public/assets` | 40 504 171 Б | 5 396 460 Б | −86,7% |
| Sequence network | 29 801 843 Б | 4 757 864 Б | −84,0% |
| Максимальный sequence RGBA-кеш | 273 310 080 Б | 139 968 000 Б | −48,8% |
| Кеш на устройстве ≤4 ГБ | 273 310 080 Б | 86 241 600 Б | −68,5% |
| Кадры, блокирующие loader | 1 | 1 | остальные теперь не конкурируют до показа |
| Particle RAF drivers | 2 | 0 отдельных | общий scheduler |

Canvas microbenchmark (1440×900, render scale 0.8, 15 warmup + 80 frames, с одинаковым readback): median 64,53 → 63,09 мс, p95 66,03 → 64,60 мс. Это CPU-микротест, не браузерный FPS.

32 автоматических теста проходят. Production build проходит. Проверены lifecycle 1600×940, 768×1024, 375×812, hidden/unmount, resize, scroll в обе стороны, reduced motion, форма, декодирование 30 WebP и запрет запуска background sequence до явного сигнала. Контактный лист всех 30 кадров проверен на визуальные скачки; отдельный Chrome smoke-test в текущей сессии недоступен.

LCP, FCP, CLS, INP и TBT не приводятся: в этой сессии не было воспроизводимого Lighthouse-профиля с контролируемым throttling. Подменять их статическими оценками было бы некорректно.

## Remaining risks

- Canvas-луч остаётся дорогим: полный CPU microbenchmark около 63 мс из-за программного readback; браузер использует другой GPU/compositing path, поэтому нужен отдельный Performance trace на целевых Mac/Windows/Android.
- Sequence всё ещё 4,54 MiB и максимум около 140 МБ decoded cache. Это существенно меньше исходного, но остаётся главным сетевым и memory-ресурсом.
- Большой `backdrop-filter: blur(32px)` формы может быть дорогим на слабых GPU, хотя теперь форма и фон появляются только ниже страницы.
- CSS исторически содержит несколько слоёв overrides. Удалены только доказанно недостижимые правила; массовая очистка без visual regression suite была бы рискованной.
- Нужны реальные Lighthouse/Web Vitals cold-cache замеры на Slow 4G/4× CPU и Safari/iOS, а также длинный Memory profile после нескольких проходов страницы.

## Files changed

- `src/animation/receiver.js` — staged loading, retries/timeouts, all-or-nothing activation, bounded decode/cache.
- `src/animation/scene.js`, `frameHost.js`, `scroll.js` — lifecycle, общий RAF, pause below viewport, deferred lower assets.
- `src/animation/particles.js`, `components/ThreeParticleShape.jsx` — lazy shared particle runtime.
- `src/App.jsx`, `components/BelowFold.jsx`, `hooks/useSceneRuntime.js` — progressive DOM/code loading.
- `scripts/build.mjs` — ESM splitting, critical preloads, anti-white-flash HTML.
- `server/start.mjs` — Brotli/gzip и безопасные cache headers для production-статики.
- `src/styles/site.css` — deferred ribbon, stable placeholder, dead CSS removal.
- `public/assets/**` — optimized WebP replacements and removal of obsolete assets.
- `tests/*.test.mjs` — progressive loading and optimized sequence coverage.
