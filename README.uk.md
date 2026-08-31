<div align="center">
  <img src="frontend/public/scrob.png" alt="Scrob Logo" width="120" />
  <h1>Scrob</h1>
  <p>Open-source, self-hosted media tracking - your personal Letterboxd + Trakt.</p>

  [**English**](README.md) | [**Українська**](README.uk.md)

  [![GitHub Stars](https://img.shields.io/github/stars/lampame/scrob?style=flat-square)](https://github.com/lampame/scrob/stargazers)
  [![Docker Pulls](https://img.shields.io/docker/pulls/lampame/scrob?style=flat-square)](https://hub.docker.com/r/lampame/scrob)
  [![GitHub Contributors](https://img.shields.io/github/contributors/lampame/scrob?style=flat-square)](https://github.com/lampame/scrob/graphs/contributors)
  [![GitHub Sponsors](https://img.shields.io/github/sponsors/ellite?style=flat-square)](https://github.com/sponsors/ellite)
  [![Latest Release](https://img.shields.io/github/v/release/lampame/scrob?style=flat-square)](https://github.com/lampame/scrob/releases/latest)
  [![Build](https://github.com/lampame/scrob/actions/workflows/fork-release.yml/badge.svg?branch=main)](https://github.com/lampame/scrob/actions/workflows/fork-release.yml)
</div>

---

> ⚠️ **Дисклеймер форку**
>
> Це **community fork** оригінального репозиторію [ellite/scrob](https://github.com/ellite/scrob). Він розвивається паралельно з upstream-проєктом, але з іншим фокусом та напрямком.
>
> **Чому цей форк існує:** Були зроблені спроби внести зміни в оригінальний репозиторій, але автор upstream не вийшов на зв'язок для співпраці. Замість того, щоб зупинити роботу, було створено цей форк для відкритого розвитку.
>
> **Чим цей форк відрізняється:**
> - Зміни рухаються **конкретними практичними потребами**, а не централізованим роадмапом
> - Розробка **з використанням ШІ** — код створюється спільно з інструментами штучного інтелекту
> - Проєкт **модульний за дизайном** — будь-хто може взяти окремі компоненти (WebSocket API, конфігурацію DB pool, редизайн scrobble-сесій тощо) та адаптувати їх для власних потреб
> - **Контрибуції вітаються** — чи хочете ви взяти фічу, запропонувати покращення, чи приєднатися до процесу розробки
>
> Цей форк **автоматично синхронізується** з upstream-релізами, тож ви отримуєте краще з двох світів: стабільність upstream + покращення, специфічні для форку.

---

Scrob синхронізує ваші бібліотеки з **Jellyfin**, **Plex**, **Emby**, **Nuvio**, **ARVIO** та **Stremio**, відстежує історію переглядів, рейтинги та особисті списки, і може відправляти активність назад до підключених провайдерів — все це через чистий, подібний до застосунку веб-інтерфейс, який встановлюється як PWA на будь-який пристрій.

## Зміст

- [Можливості](#можливості)
- [Скріншоти](#скріншоти)
- [Початок роботи](#початок-роботи)
  - [Docker Compose](#docker-compose)
  - [Omnibus (один контейнер)](#omnibus-один-контейнер)
  - [Docker Run](#docker-run)
  - [Перше налаштування](#перше-налаштування)
  - [Оновлення](#оновлення)
- [Конфігурація](#конфігурація)
  - [Метадані TheTVDB](#метадані-thetvdb)
- [Синхронізація з ARVIO Cloud](#синхронізація-з-arvio-cloud)
- [Синхронізація з Nuvio Cloud](#синхронізація-з-nuvio-cloud)
  - [Підключення Nuvio](#підключення-nuvio)
  - [Напрямки синхронізації](#напрямки-синхронізації)
  - [Розклад та обмеження](#розклад-та-обмеження)
- [Синхронізація з Trakt](#синхронізація-з-trakt)
- [Імпорт з Yamtrack / Floppy](#імпорт-з-yamtrack--floppy)
- [Синхронізація з Stremio](#синхронізація-з-stremio)
  - [Підключення Stremio](#підключення-stremio)
  - [Напрямки синхронізації Stremio](#напрямки-синхронізації-stremio)
  - [Розклад, повна ресинхронізація та обмеження](#розклад-повна-ресинхронізація-та-обмеження)
- [Синхронізація з Simkl](#синхронізація-з-simkl)
- [Синхронізація з MDBList](#синхронізація-з-mdblist)
- [Webhooks](#webhooks-реальний-час-scrobbling)
  - [Jellyfin](#jellyfin)
  - [Plex](#plex)
  - [Emby](#emby)
  - [Kodi](#kodi)
- [OIDC / Single Sign-On](#oidc--single-sign-on)
- [Конфігурація WebSocket (Socket)](#конфігурація-websocket-socket)
  - [Документація Socket API](docs/socket-api.md)
- [Валідація Email та SMTP](#валідація-email--smtp)
- [Контрибуція](#контрибуція)
- [Контриб'ютори](#контрибтори)
- [Розробка](#розробка)
- [Ліцензія](#ліцензія)

## Можливості

- **Мульти-синхронізація**: Імпорт бібліотек, статусу переглядів та прогресу відтворення з Jellyfin, Plex, Emby, Nuvio та Stremio.
- **Синхронізація провайдерів**: Підтримка членства в колекціях, статусу переглядів та прогресу відтворення синхронізованими між медіасерверами, Nuvio та Stremio. Підтримка кількох екземплярів серверів та профілів Nuvio.
- **Scrobbling у реальному часі**: Webhooks від Jellyfin, Plex, Emby та Kodi оновлюють статус перегляду під час відтворення — без ручної синхронізації.
- **Ручний scrobble**: Запуск сесії перегляду прямо зі сторінки будь-якого фільму або епізоду. Пауза, продовження, зупинка або позначення як переглянуте — прогрес сесії відображається наживо на головному екрані.
- **Інтеграція з Trakt**: Синхронізація історії переглядів, рейтингів та списків з Trakt та автоматична відправка активності Scrob назад до Trakt. Для підключення в реальному часі потрібна підписка Trakt VIP (недавнє обмеження з боку Trakt) — всі інші все ще можуть імпортувати через експорт даних Trakt, без VIP. Див. [Синхронізація з Trakt](#синхронізація-з-trakt).
- **Інтеграція з Simkl**: Синхронізація історії переглядів та рейтингів з Simkl та автоматична відправка активності Scrob назад до Simkl.
- **Інтеграція з MDBList**: Отримання історії переглядів, рейтингів та списків перегляду з MDBList та опціональна відправка змін Scrob назад за допомогою API-ключа MDBList.
- **Інтеграція з Bingebase**: Відправка історії переглядів та live-scrobbles до вашого акаунту Bingebase через особистий Webhook URL.
- **Історія переглядів та рейтинги**: Відстеження кожного переглянутого фільму та епізоду, включаючи кілька переглядів з індивідуальними мітками часу. Ручне логування переглядів з датою або видалення окремих записів — все через кнопку перегляду на будь-якій сторінці фільму або епізоду. Рейтинги за 10-бальною шкалою з опціональними відгуками.
- **Рейтинги сезонів**: Оцінка окремих сезонів окремо від загального рейтингу шоу.
- **Повторні перегляди**: Запуск повторного перегляду будь-якого шоу, і Scrob відстежує прогрес для цього циклу окремо, не зачіпаючи оригінальну історію переглядів.
- **Особисті списки**: Створення та курирування списків фільмів та шоу. Позначення їх публічними для поширення з іншими користувачами того ж екземпляра.
- **Коментарі**: Залишення коментарів до фільмів, шоу, сезонів та епізодів.
- **Соціальне**: Підписки на інших користувачів та перегляд їхньої активності.
- **Розклад релізів**: На сторінках фільмів відображається повний розклад релізів — театральний, цифровий та фізичний — з TMDB.
- **Інтеграція з TMDB**: Багаті метадані для кожного тайтлу — постери, бекдропи, актори, знімальна група, трейлери, колекції тощо.
- **Мова метаданих**: Налаштування переважної мови відображення для кожного профілю — назви, описи та назви епізодів відображаються перекладеними, де доступно, незалежно від мови решти інтерфейсу.
- **Пошук**: Пошук у TMDB по фільмах, шоу, людях та колекціях, об'єднаний з даними вашої локальної бібліотеки.
- **Вибір фільму / Вибір шоу**: Отримання підказки, що подивитися далі, з вашої бібліотеки або стрімінгових сервісів на основі ваших уподобань.
- **Тренди та Сьогодні в ефірі**: Щоденні трендові фільми та шоу з TMDB, плюс епізоди, що виходять сьогодні, відфільтровані за вашою колекцією.
- **Календар епізодів**: 15-денний розклад епізодів для шоу, що ви зібрали або дивитеся.
- **Продовжити перегляд та Наступне**: Картки на дашборді, що показують елементи в процесі та наступний епізод для перегляду в кожному серіалі.
- **Статистика**: Сторінка статистики для кожного користувача — час переглядів, графіки активності, розбивка рейтингів та найбільш переглянуті люди/мережі — з фільтрацією за весь час, рік, місяць, тиждень або період.
- **Відстеження сезонів та епізодів**: Детальний перегляд сезонів зі статусом перегляду та прогресом для кожного епізоду.
- **Сторінки акторів та знімальної групи**: Повна фільмографія для будь-якої людини, пов'язана з вашою бібліотекою.
- **Інтеграція з Radarr та Sonarr**: Додавання фільмів та шоу до Radarr/Sonarr прямо з інтерфейсу Scrob.
- **Автоматизація Plex watchlist**: Автоматична відправка елементів з вашого Plex watchlist (та watchlist обраних друзів) до Radarr або Sonarr.
- **Двофакторна автентифікація**: 2FA на основі TOTP з резервними кодами, керується зі сторінки налаштувань.
- **OIDC / SSO**: Автентифікація з будь-яким провайдером OpenID Connect (Authelia, Authentik, Keycloak тощо).
- **Перегляд без акаунту (опціонально)**: Публічні профілі та списки за замовчуванням потребують акаунт для перегляду. Адміністратор може увімкнути **Дозволити перегляд без акаунту** в адмін-панелі, щоб відвідувачі могли переглядати без реєстрації.
- **Progressive Web App**: Встановлення Scrob на будь-який пристрій — Android, iOS або десктоп — для відчуття нативного застосунку.
- **Один контейнер**: Frontend та backend постачаються як один образ на одному порту. Жодних окремих сервісів для керування.
- **Документація API**: Повна інтерактивна документація OpenAPI на `/docs` (Swagger UI) та `/redoc` (ReDoc), корисна, якщо ви пишете скрипти для Scrob.
- **WebSocket API** (фіча форку): Двосторонній зв'язок у реальному часі для зовнішніх клієнтів, скриптів та автоматизації. Див. [Документація Socket API](docs/socket-api.md).
- **Конфігурований DB pool** (фіча форку): Налаштування лімітів з'єднань через змінні оточення для керованих провайдерів PostgreSQL (Aiven, Neon тощо).

## Скріншоти

<img src="docs/screenshots/scrobss.png" alt="Scrob" width="800">

<details>
<summary>Переглянути більше скріншотів</summary>

**Дашборд**
<img src="docs/screenshots/scrob-dashboard-dark.png" alt="Dashboard" width="800" />

**Дослідження**
<img src="docs/screenshots/scrob-explore-light.png" alt="Explore" width="800" />

**Фільм**
<img src="docs/screenshots/scrob-movie-light.png" alt="Movie" width="800" />

**Шоу**
<img src="docs/screenshots/scrob-show-dark.png" alt="Show" width="800" />

**Сезон**
<img src="docs/screenshots/scrob-season-dark.png" alt="Season" width="800" />

**Епізод**
<img src="docs/screenshots/scrob-episode-dark.png" alt="Episode" width="800" />

**Пошук**
<img src="docs/screenshots/scrob-search-light.png" alt="Search" width="800" />

**Історія (мобільний)**
<img src="docs/screenshots/scrob-history-dark-mobile.png" alt="History mobile" width="800" />

**Списки (мобільний)**
<img src="docs/screenshots/scrob-lists-light-mobile.png" alt="Lists mobile" width="800" />

**Налаштування**
<img src="docs/screenshots/scrob-settings-dark.png" alt="Settings" width="800" />


</details>

## Початок роботи

### Передумови

- [Docker](https://docs.docker.com/get-docker/) та [Docker Compose](https://docs.docker.com/compose/install/)
- [TMDB Read Access Token](https://www.themoviedb.org/settings/api) (безкоштовний) — використовується для метаданих, пошуку та зображень

### Docker Compose

> Обрози розміщені на **Docker Hub** (`lampame/scrob`). Доступно також дзеркало на GHCR (`ghcr.io/lampame/scrob`), якщо віддаєте перевагу.

1. Завантажте compose-файл:

```bash
curl -o docker-compose.yaml https://raw.githubusercontent.com/lampame/scrob/main/docker-compose.yaml
```

2. Відредагуйте `docker-compose.yaml` та замініть обов'язкові значення:

```yaml
services:
  scrob-db:
    container_name: scrob-db
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: scrob
      POSTGRES_PASSWORD: changeme        # ← змініть це
      POSTGRES_DB: scrob
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U scrob -d scrob"]
      interval: 5s
      timeout: 5s
      retries: 10

  scrob:
    container_name: scrob
    image: lampame/scrob:latest
    restart: unless-stopped
    depends_on:
      scrob-db:
        condition: service_healthy
    ports:
      - "7330:7330"
    environment:
      DATABASE_URL: postgresql+asyncpg://scrob:changeme@scrob-db:5432/scrob   # ← відповідно до пароля вище
      SECRET_KEY: changeme               # ← згенеруйте: openssl rand -hex 32
      TZ: UTC
    volumes:
      - scrob_data:/app/backend/data

volumes:
  db_data:
  scrob_data:
```

3. Запустіть:

```bash
docker compose up -d
```

### Omnibus (один контейнер)

Образ omnibus включає PostgreSQL всередині контейнера — не потрібен окремий сервіс бази даних. Це найпростіший спосіб почати, особливо на платформах як Unraid або Portainer, де керування кількома контейнерами незручне.

> **Теги образів:** `lampame/scrob:latest-omnibus` / `ghcr.io/lampame/scrob:latest-omnibus`

1. Завантажте omnibus compose-файл:

```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/lampame/scrob/main/docker-compose.omnibus.yml
```

2. Відредагуйте його та встановіть `SECRET_KEY`:

```yaml
SECRET_KEY: changeme   # ← згенеруйте: openssl rand -hex 32
```

3. Запустіть:

```bash
docker compose up -d
```

Все — жодного контейнера бази даних, жодного `DATABASE_URL` для налаштування. PostgreSQL ініціалізується автоматично при першому запуску та зберігається в томі `scrob_db`.

**Перехід на зовнішню базу даних пізніше:** встановіть `DATABASE_URL` в оточенні, і вбудований PostgreSQL буде повністю пропущений. Образ omnibus поводиться ідентично до стандартного образу, коли надано `DATABASE_URL`.

> **Примітка:** Версія вбудованого PostgreSQL прив'язана до базової OS образу (Debian Bookworm постачає PostgreSQL 15). Великі оновлення версії вбудованої бази даних потребують ручної міграції даних. Якщо ви плануєте керувати версією бази даних незалежно, використовуйте стандартну установку з двома контейнерами.

### Docker Run

**Стандартний образ** (потрібен окремий контейнер PostgreSQL):

```bash
# Створіть окрему мережу
docker network create scrob-net

# Запустіть базу даних
docker run -d \
  --name scrob-db \
  --network scrob-net \
  --restart unless-stopped \
  -e POSTGRES_USER=scrob \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=scrob \
  -v scrob_db:/var/lib/postgresql/data \
  postgres:16-alpine

# Запустіть Scrob
docker run -d \
  --name scrob \
  --network scrob-net \
  --restart unless-stopped \
  -p 7330:7330 \
  -e DATABASE_URL="postgresql+asyncpg://scrob:changeme@scrob-db:5432/scrob" \
  -e SECRET_KEY="$(openssl rand -hex 32)" \
  -e TZ=UTC \
  -v scrob_data:/app/backend/data \
  lampame/scrob:latest
```

**Образ Omnibus** (PostgreSQL включено — не потрібен окремий контейнер):

```bash
docker run -d \
  --name scrob \
  --restart unless-stopped \
  -p 7330:7330 \
  -e SECRET_KEY="$(openssl rand -hex 32)" \
  -e TZ=UTC \
  -v scrob_data:/app/backend/data \
  -v scrob_db:/app/postgres/data \
  lampame/scrob:latest-omnibus
```

### Перше налаштування

1. Відкрийте `http://localhost:7330` та створіть акаунт.
2. Перейдіть до **Налаштування → Загальне**, щоб додати ваш TMDB Read Access Token, потім відкрийте **Підключення → Медіаплеєри**, щоб підключити Jellyfin, Plex, Emby, Nuvio або Stremio.
3. Виберіть, які бібліотеки та напрямки синхронізації увімкнути, потім запустіть першу синхронізацію.

Для Nuvio увійдіть та виберіть один з повернутих профілів. Для Stremio виберіть **Підключити Stremio**, потім авторизуйте згенерований Link-код або QR-код у вашому акаунті Stremio. Див. [Синхронізація з Nuvio Cloud](#синхронізація-з-nuvio-cloud) та [Синхронізація з Stremio](#синхронізація-з-stremio) для поведінки та обмежень, специфічних для провайдерів.

### Оновлення

```bash
docker compose pull && docker compose up -d
```

Міграції бази даних запускаються автоматично при старті — жодних ручних кроків не потрібно.

## Конфігурація

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `SECRET_KEY` | - | **Обов'язково.** Ключ для підпису JWT. Згенеруйте з `openssl rand -hex 32`. |
| `DATABASE_URL` | - | **Обов'язково** (стандартний образ). Рядок з'єднання PostgreSQL (`postgresql+asyncpg://...`). Опціонально на образі omnibus — якщо опущено, використовується вбудована база даних. |
| `ENABLE_REGISTRATIONS` | `false` | Дозволити новим користувачам реєструватися. Перший користувач завжди може зареєструватися незалежно від цього налаштування. |
| `REGISTRATION_MAX_ALLOWED_USERS` | `0` | Максимальна кількість зареєстрованих користувачів. `0` = необмежено. |
| `TZ` | `UTC` | Часова зона контейнера (напр. `Europe/Kyiv`). |
| `PUID` | `1000` | ID користувача для запуску процесу. |
| `PGID` | `1000` | ID групи для запуску процесу. |
| `BACKEND_PORT` | `7331` | Внутрішній порт, до якого прив'язується backend. Змінюйте лише якщо `7331` конфліктує на bare metal. |
| `OIDC_ENABLED` | `false` | Увімкнути вхід через OIDC. |
| `OIDC_DISABLE_PASSWORD_LOGIN` | `false` | Примусовий вхід лише через OIDC (вимикає ім'я користувача/пароль). |

### Конфігурація WebSocket (Socket)

Опціональний зв'язок у реальному часі через WebSocket. За замовчуванням вимкнено.

Усі налаштування socket керуються в адмін-панелі (**Налаштування → WebSocket**) та набувають чинності без перезапуску контейнера. Єдина змінна оточення — внутрішній порт сервера (інфраструктура, як `BACKEND_PORT`):

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `SOCKET_INTERNAL_PORT` | `7332` | Порт для внутрішнього сервера socket (лише внутрішній режим). Змінюйте лише якщо 7332 конфліктує. |

**Режими:**
- **`disabled`** — без функціональності WebSocket (за замовчуванням).
- **`internal`** — запускає WebSocket сервер всередині контейнера; клієнти підключаються напряму.
- **`external`** — підключається до публічного релею `itty.ws` як клієнт; потребує ключів від ittysockets.com.

Налаштуйте режим, namespace, ключі та URL в адмін-панелі.

**Зовнішні клієнти** (скрипти, автоматизація, інші екземпляри Scrob) можуть підключатися до WebSocket API для подій у реальному часі. Див. [Документація Socket API](docs/socket-api.md) для протоколу, типів подій та прикладів клієнтів на [Python](examples/socket_client.py) та [Node.js](examples/socket_client.js).

### Зворотний проксі

Scrob слухає порт `7330`. Розмістіть зворотний проксі (Caddy, Nginx, Traefik) попереду для HTTPS — потрібно для підказки встановлення PWA на адресах, відмінних від localhost.

```
# Caddyfile
scrob.yourdomain.com {
    reverse_proxy localhost:7330
}
```

### Зовнішній PostgreSQL

Видаліть сервіс `scrob-db` та встановіть `DATABASE_URL` до вашого існуючого екземпляра:

```yaml
DATABASE_URL: postgresql+asyncpg://user:password@your-db-host:5432/scrob
```

### Пул з'єднань бази даних

За замовчуванням Scrob може відкривати до `pool_size` (20) + `max_overflow` (10) = **30** з'єднань PostgreSQL на екземпляр. Це нормально для вбудованого Postgres, але керовані провайдери обмежують з'єднання набагато нижче та зазвичай не надають власного пулінгу:

- **Aiven free tier**: `max_connections = 20`, без PgBouncer/пулінгу.
- **Neon free tier** та інші низькорівневі керовані Postgres мають подібні обмеження.

Коли стеля застосунку перевищує ліміт провайдера, ви отримаєте помилки `FATAL: sorry, too many clients already` / `remaining connection slots are reserved` під навантаженням.

Усі п'ять змінних налаштувань нижче **опціональні**. Якщо не встановлено, Scrob зберігає поточні значення за замовчуванням, тож існуючі розгортання не змінюються.

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `DB_POOL_SIZE` | `20` | SQLAlchemy `pool_size` (мін `1`). |
| `DB_MAX_OVERFLOW` | `10` | SQLAlchemy `max_overflow` (мін `0`). |
| `DB_POOL_TIMEOUT` | `30` | Секунди очікування вільного з'єднання перед помилкою (мін `0`). |
| `DB_POOL_RECYCLE` | `1800` | Перезапуск з'єднань після цієї кількості секунд (мін `0`). |
| `DB_POOL_PRE_PING` | `true` | Перевірка життєздатності перед видачею з'єднання. |

#### Рекомендовані значення для Aiven free tier

З `max_connections = 20`, встановіть стелю, що залишає місце для міграцій, ad-hoc запитів та власних накладних витрат Aiven:

```yaml
DB_POOL_SIZE: "10"
DB_MAX_OVERFLOW: "5"   # стеля = 15, ~5 з'єднань в резерві
```

#### Горизонтальне масштабування

Загальна кількість з'єднань ≈ `replicas × (pool_size + max_overflow)` + ~5 резерв. Якщо ви запускаєте кілька реплік, розділіть пул на екземпляр — напр. 2 репліки → `~8` кожна (`DB_POOL_SIZE=8`, `DB_MAX_OVERFLOW=0`) зберігає комбіновану стелю біля 16–21.

#### Aiven SSL

Aiven потребує TLS. Додайте `?ssl=require` до `DATABASE_URL` (asyncpg приймає це):

```yaml
DATABASE_URL: postgresql+asyncpg://user:password@your-aiven-host:5432/scrob?ssl=require
```

## Синхронізація з ARVIO Cloud

Scrob підтримує синхронізацію з **ARVIO Cloud** (`https://auth.arvio.tv/.netlify/functions`), імпортуючи переглянуті фільми, переглянуті епізоди та прогрес продовження перегляду для кожного профілю.

### Підключення ARVIO

1. Перейдіть до **Підключення → Медіаплеєри** та виберіть **ARVIO**.
2. Увійдіть з вашим email та паролем ARVIO Cloud (або введіть існуючий refresh token ARVIO напряму).
3. Виберіть профіль ARVIO для синхронізації.

### Конфігурація

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `ARVIO_APP_ANON_KEY` | *(Офіційний вбудований ключ)* | Публічний anon API-ключ для `auth.arvio.tv`. Офіційний ключ вбудований за замовчуванням. |

### Захист перевірки ключа в CI

GitHub Actions workflow (`.github/workflows/docker-x64.yml`) автоматично перевіряє вбудований `ARVIO_APP_ANON_KEY` проти `auth.arvio.tv` під час кожної збірки контейнера, гарантуючи, що збірки негайно зазнають невдачі з помилкою GitHub workflow, якщо публічний ключ коли-небудь буде змінений.
