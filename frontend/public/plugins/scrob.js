/**
 * Scrob — Lampa plugin for self-hosted media tracking
 * Build: 2026-09-05
 * Source: https://github.com/ellite/scrob
 */
(function () {
    'use strict';

    // Scrob plugin translations
    function addLang() {
      Lampa.Lang.add({
        scrob_title: {
          uk: 'Scrob',
          ru: 'Scrob',
          en: 'Scrob',
          be: 'Scrob'
        },
        scrob_server_url: {
          uk: 'Адреса сервера',
          ru: 'Адрес сервера',
          en: 'Server URL',
          be: 'Адрас сервера'
        },
        scrob_username: {
          uk: 'Логін',
          ru: 'Логин',
          en: 'Username',
          be: 'Лагін'
        },
        scrob_password: {
          uk: 'Пароль',
          ru: 'Пароль',
          en: 'Password',
          be: 'Пароль'
        },
        scrob_api_key: {
          uk: 'API-ключ (опційно)',
          ru: 'API-ключ (опционально)',
          en: 'API key (optional)',
          be: 'API-ключ (опцыянальна)'
        },
        scrob_login: {
          uk: 'Увійти',
          ru: 'Войти',
          en: 'Sign In',
          be: 'Увайсці'
        },
        scrob_logout: {
          uk: 'Вийти',
          ru: 'Выйти',
          en: 'Sign Out',
          be: 'Выйсці'
        },
        scrob_auth_success: {
          uk: 'Авторизація успішна',
          ru: 'Авторизация успешна',
          en: 'Login successful',
          be: 'Аўтарызацыя паспяховая'
        },
        scrob_auth_error: {
          uk: 'Помилка авторизації',
          ru: 'Ошибка авторизации',
          en: 'Login failed',
          be: 'Памылка аўтарызацыі'
        },
        scrob_fill_fields: {
          uk: 'Заповніть адресу сервера, логін та пароль',
          ru: 'Заполните адрес сервера, логин и пароль',
          en: 'Fill in server URL, username and password',
          be: 'Запоўніце адрас сервера, лагін і пароль'
        },
        scrob_2fa_not_supported: {
          uk: 'Увімкнено 2FA — використайте API-ключ або вимкніть 2FA',
          ru: 'Включена 2FA — используйте API-ключ или отключите 2FA',
          en: '2FA is enabled — use an API key or disable 2FA',
          be: 'Уключана 2FA — выкарыстоўвайце API-ключ або адключыце 2FA'
        },
        scrob_me_error: {
          uk: 'Не вдалося отримати дані користувача',
          ru: 'Не удалось получить данные пользователя',
          en: 'Failed to get user data',
          be: 'Не атрымалася атрымаць даныя карыстальніка'
        },
        scrob_profiles: {
          uk: 'Профілі',
          ru: 'Профили',
          en: 'Profiles',
          be: 'Профілі'
        },
        scrob_profiles_empty: {
          uk: 'Неможливо отримати список профілів',
          ru: 'Невозможно получить список профилей',
          en: 'Unable to get profile list',
          be: 'Немагчыма атрымаць спіс профіляў'
        },
        scrob_logout_success: {
          uk: 'Ви вийшли з акаунта Scrob',
          ru: 'Вы вийшли из аккаунта Scrob',
          en: 'Signed out of Scrob',
          be: 'Вы выйшлі з акаўнта Scrob'
        },
        // ─── Sync settings ─────────────────────────────────
        scrob_sync_title: {
          uk: 'Синхронізація списків',
          ru: 'Синхронизация списков',
          en: 'List synchronization',
          be: 'Сінхранізацыя спісаў'
        },
        scrob_sync_enabled: {
          uk: 'Увімкнути синхронізацію',
          ru: 'Включить синхронизацию',
          en: 'Enable synchronization',
          be: 'Уключыць сінхранізацыю'
        },
        scrob_sync_interval: {
          uk: 'Інтервал опитування',
          ru: 'Интервал опроса',
          en: 'Poll interval',
          be: 'Інтэрвал апытання'
        },
        scrob_sync_interval_descr: {
          uk: 'Як часто опитувати сервер для вхідних змін (секунди)',
          ru: 'Как часто опрашивать сервер для входящих изменений (секунды)',
          en: 'How often to poll the server for incoming changes (seconds)',
          be: 'Як часта апытваць сервер для ўваходных змен (секунды)'
        },
        scrob_sync_now: {
          uk: 'Синхронізувати зараз',
          ru: 'Синхронизировать сейчас',
          en: 'Sync now',
          be: 'Сінхранізаваць зараз'
        },
        scrob_sync_started: {
          uk: 'Синхронізацію увімкнено',
          ru: 'Синхронизация включена',
          en: 'Synchronization enabled',
          be: 'Сінхранізацыя ўключана'
        },
        scrob_sync_stopped: {
          uk: 'Синхронізацію зупинено',
          ru: 'Синхронизация остановлена',
          en: 'Synchronization stopped',
          be: 'Сінхранізацыя спынена'
        },
        scrob_sync_status_last: {
          uk: 'Остання синхронізація',
          ru: 'Последняя синхронизация',
          en: 'Last synchronization',
          be: 'Апошняя сінхранізацыя'
        },
        scrob_sync_blocked_cub: {
          uk: 'Синхронізацію заблоковано: активна синхронізація CUB',
          ru: 'Синхронизация заблокирована: активна синхронизация CUB',
          en: 'Sync blocked: CUB synchronization is active',
          be: 'Сінхранізацыя заблакіравана: актыўная сінхранізацыя CUB'
        },
        scrob_sync_conflict_gramsync: {
          uk: 'Увімкнений GramSync — можливі конфлікти',
          ru: 'Включён GramSync — возможны конфликты',
          en: 'GramSync enabled — possible conflicts',
          be: 'Уключаны GramSync — магчымыя канфлікты'
        },
        scrob_sync_paused: {
          uk: 'Синхронізацію зупинено',
          ru: 'Синхронизация приостановлена',
          en: 'Synchronization paused',
          be: 'Сінхранізацыя прыпынена'
        },
        scrob_sync_lost: {
          uk: 'Синхронізація Scrob втратила зв\'язок',
          ru: 'Синхронизация Scrob потеряла связь',
          en: 'Scrob sync lost connection',
          be: 'Сінхранізацыя Scrob страціла сувязь'
        },
        scrob_sync_lists_error: {
          uk: 'Не вдалося отримати списки Scrob',
          ru: 'Не удалось получить списки Scrob',
          en: 'Failed to fetch Scrob lists',
          be: 'Не атрымалася атрымаць спісы Scrob'
        },
        // ─── List mapping (F1.5) ─────────────────────────
        scrob_map_title: {
          uk: 'Мапінг списків',
          ru: 'Маппинг списков',
          en: 'List mapping',
          be: 'Мапінг спісаў'
        },
        scrob_map_select_list: {
          uk: 'Оберіть список Scrob',
          ru: 'Выберите список Scrob',
          en: 'Choose a Scrob list',
          be: 'Аберыце спіс Scrob'
        },
        scrob_map_select_cat: {
          uk: 'Категорія Lampa',
          ru: 'Категория Lampa',
          en: 'Lampa category',
          be: 'Катэгорыя Lampa'
        },
        scrob_map_none: {
          uk: 'Немає списків для мапінгу',
          ru: 'Нет списков для маппинга',
          en: 'No lists available for mapping',
          be: 'Няма спісаў для мапінгу'
        },
        scrob_map_confirm: {
          uk: 'буде об\'єднано з категорією',
          ru: 'будет объединено с категорией',
          en: 'will be merged with category',
          be: 'будзе аб\'яднана з катэгорыяй'
        },
        scrob_map_once: {
          uk: 'Одноразове злиття, далі двобічний синк',
          ru: 'Одноразовое слияние, далее двусторонняя синхронизация',
          en: 'One-time merge, then bidirectional sync',
          be: 'Аднаразовае зліццё, далей двухбаковая сінхранізацыя'
        },
        scrob_map_marks_warn: {
          uk: 'Статусна категорія: елементи з інших статусів буде знято',
          ru: 'Статусная категория: элементы из других статусов будут сняты',
          en: 'Status category: items from other statuses will be removed',
          be: 'Статусная катэгорыя: элементы з іншых статусаў будуць зняты'
        },
        scrob_map_replace: {
          uk: 'замінить поточний мапінг',
          ru: 'заменит текущий маппинг',
          en: 'will replace current mapping',
          be: 'заменіць бягучы мапінг'
        },
        scrob_map_created: {
          uk: 'Мапінг створено, синхронізація виконується',
          ru: 'Маппинг создан, синхронизация выполняется',
          en: 'Mapping created, synchronization in progress',
          be: 'Мапінг створаны, сінхранізацыя выконваецца'
        },
        scrob_map_active: {
          uk: 'Активні мапінги',
          ru: 'Активные маппинги',
          en: 'Active mappings',
          be: 'Актыўныя мапінгі'
        },
        scrob_map_unlink: {
          uk: 'Відв\'язати',
          ru: 'Отвязать',
          en: 'Unlink',
          be: 'Адвязаць'
        },
        scrob_map_unlinked: {
          uk: 'Мапінг видалено',
          ru: 'Маппинг удален',
          en: 'Mapping removed',
          be: 'Мапінг выдалены'
        },
        scrob_map_conflict: {
          uk: 'Цей список уже замаплений',
          ru: 'Этот список уже замаппирован',
          en: 'This list is already mapped',
          be: 'Гэты спіс ужо замаплены'
        },
        scrob_map_broken: {
          uk: 'Мапінг %s: список зник',
          ru: 'Маппинг %s: список исчез',
          en: 'Mapping %s: list deleted',
          be: 'Мапінг %s: спіс знік'
        },
        scrob_map_cancel: {
          uk: 'Скасувати',
          ru: 'Отмена',
          en: 'Cancel',
          be: 'Скасаваць'
        },
        scrob_map_apply: {
          uk: 'Замапити',
          ru: 'Замаппировать',
          en: 'Map',
          be: 'Замапіць'
        },
        // ─── Custom categories (F1.5 extension) ─────────
        scrob_map_create_own: {
          uk: 'Створити власну категорію',
          ru: 'Создать собственную категорию',
          en: 'Create own category',
          be: 'Стварыць уласную катэгорыю'
        },
        scrob_map_own_name: {
          uk: 'Назва категорії',
          ru: 'Название категории',
          en: 'Category name',
          be: 'Назва катэгорыі'
        },
        scrob_map_own_created: {
          uk: 'Категорію створено, імпорт виконується',
          ru: 'Категория создана, импорт выполняется',
          en: 'Category created, importing...',
          be: 'Катэгорыю створана, імпарт выконваецца'
        },
        scrob_map_own_exists: {
          uk: 'Категорія з такою назвою вже існує',
          ru: 'Категория с таким названием уже существует',
          en: 'Category with this name already exists',
          be: 'Катэгорыя з такой назвай ужо існуе'
        },
        scrob_cat_remove_confirm: {
          uk: 'Видалити з категорії?',
          ru: 'Удалить из категории?',
          en: 'Remove from category?',
          be: 'Выдаліць з катэгорыі?'
        },
        scrob_cat_remove: {
          uk: 'Видалити',
          ru: 'Удалить',
          en: 'Remove',
          be: 'Выдаліць'
        },
        scrob_cat_removed: {
          uk: 'Видалено з категорії',
          ru: 'Удалено из категории',
          en: 'Removed from category',
          be: 'Выдалена з катэгорыі'
        }
      });
    }

    function _typeof(o) {
      "@babel/helpers - typeof";

      return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) {
        return typeof o;
      } : function (o) {
        return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
      }, _typeof(o);
    }

    // Storage keys and session helpers for the Scrob plugin.
    // All keys are prefixed with scrob_ so they never collide with CUB account/account_user.

    var KEYS = {
      SERVER_URL: 'scrob_server_url',
      USERNAME: 'scrob_username',
      PASSWORD: 'scrob_password',
      OWN_API_KEY: 'scrob_own_api_key',
      ACCESS_TOKEN: 'scrob_access_token',
      ME: 'scrob_me',
      PROFILES: 'scrob_profiles',
      ACTIVE_PROFILE_ID: 'scrob_active_profile_id',
      ACTIVE_API_KEY: 'scrob_active_api_key',
      SYNC_ENABLED: 'scrob_sync_enabled',
      SYNC_INTERVAL: 'scrob_sync_interval'
    };

    // Keys isolated per profile: backed up on switch, restored for the target.
    var ISOLATED_KEYS = ['favorite', 'online_view', 'online_watched_last', 'online_last_balanser', 'file_view', 'torrents_view', 'torrents_filter_data'];

    // Defaults applied when the target profile has no saved data yet.
    var DEFAULTS = {
      favorite: '{}',
      online_view: '{}',
      online_watched_last: '{}',
      online_last_balanser: '{}',
      file_view: '{}',
      torrents_view: '{}',
      torrents_filter_data: '[]'
    };

    // Backup storage key for one isolated key of one profile.
    function backupKey(userId, key) {
      return 'scrob_backup_' + userId + '_' + key;
    }

    // Default value for an isolated key.
    function defaultValue(key) {
      return DEFAULTS[key] || '{}';
    }

    // Server URL without trailing slash, '' when not set.
    function serverUrl() {
      var url = (Lampa.Storage.get(KEYS.SERVER_URL) || '').trim();
      if (url.slice(-1) === '/') url = url.slice(0, -1);
      return url;
    }
    function getMe() {
      var val = Lampa.Storage.get(KEYS.ME, {});
      return _typeof(val) === 'object' && val !== null ? val : {};
    }
    function getProfiles() {
      var val = Lampa.Storage.get(KEYS.PROFILES, []);
      return Array.isArray(val) ? val : [];
    }

    // Active profile object from cached list, falls back to logged-in user.
    function activeProfile() {
      var id = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID);
      var list = getProfiles();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id == id) return list[i];
      }
      return getMe();
    }
    function hasSession() {
      return !!(Lampa.Storage.get(KEYS.ACCESS_TOKEN) && getMe().id);
    }

    // Clear session keys on logout. Credentials (server/username/password) are kept for re-login.
    function clearSession() {
      [KEYS.OWN_API_KEY, KEYS.ACCESS_TOKEN, KEYS.ME, KEYS.PROFILES, KEYS.ACTIVE_PROFILE_ID, KEYS.ACTIVE_API_KEY].forEach(function (key) {
        Lampa.Storage.set(key, '');
      });
    }

    // Scrob server API wrapper. All requests go through new Lampa.Reguest().
    // Base prefix of every endpoint: {server_url}/api/proxy
    function base() {
      return serverUrl() + '/api/proxy';
    }

    // X-Api-Key header from the user's settings key; empty object when not set
    function apiKeyHeaders() {
      var key = Lampa.Storage.get(KEYS.OWN_API_KEY) || '';
      return key ? {
        'X-Api-Key': key
      } : {};
    }

    // Bearer token header from the user's session; empty object when not set
    function bearerHeaders() {
      var token = Lampa.Storage.get(KEYS.ACCESS_TOKEN) || '';
      return token ? {
        Authorization: 'Bearer ' + token
      } : {};
    }
    function parse$1(data) {
      if (typeof data !== 'string') return data;
      try {
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    }

    // POST /auth/login — form-urlencoded username+password → Token
    // NOTE: login is an unauthenticated endpoint — do NOT send Bearer
    // NOTE: Astro middleware requires X-Api-Key for /api/proxy/* routes
    // OAuth2 Password Flow requires grant_type=password
    function login(username, password, onDone, onFail) {
      var network = new Lampa.Reguest();
      network.timeout(15000);
      var body = 'grant_type=password&username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password);
      network.native(base() + '/auth/login', function (data) {
        network.clear();
        var json = parse$1(data);
        if (json) onDone(json);else onFail();
      }, function (a, c) {
        network.clear();
        onFail(network.errorDecode(a, c));
      }, body, {
        headers: Object.assign({
          'Content-Type': 'application/x-www-form-urlencoded'
        }, apiKeyHeaders())
      });
    }

    // GET /auth/me — Bearer token → User
    function me(token, onDone, onFail) {
      var network = new Lampa.Reguest();
      network.timeout(15000);
      network.native(base() + '/auth/me', function (data) {
        network.clear();
        var json = parse$1(data);
        if (json && json.id) onDone(json);else onFail();
      }, function (a, c) {
        network.clear();
        onFail(network.errorDecode(a, c));
      }, false, {
        headers: Object.assign({
          Authorization: 'Bearer ' + token
        }, apiKeyHeaders())
      });
    }

    // GET /admin/users — Bearer token, admin only → AdminUser[]
    function adminUsers(token, onDone, onFail) {
      var network = new Lampa.Reguest();
      network.timeout(15000);
      network.native(base() + '/admin/users', function (data) {
        network.clear();
        var json = parse$1(data);
        if (Array.isArray(json)) onDone(json);else onFail();
      }, function (a, c) {
        network.clear();
        onFail(network.errorDecode(a, c));
      }, false, {
        headers: Object.assign({
          Authorization: 'Bearer ' + token
        }, apiKeyHeaders())
      });
    }

    // ─── List sync API methods ────────────────────────────────

    // GET /lists — all user lists (without items)
    function getLists(onDone, onFail) {
      var network = new Lampa.Reguest();
      network.timeout(15000);
      network.native(base() + '/lists', function (data) {
        network.clear();
        var json = parse$1(data);

        // Server wraps the array: { lists: [...] } — accept both shapes
        if (Array.isArray(json)) onDone(json);else if (json && Array.isArray(json.lists)) onDone(json.lists);else onFail();
      }, function (a, c) {
        network.clear();
        onFail(network.errorDecode(a, c));
      }, false, {
        headers: apiKeyHeaders()
      });
    }

    // POST /lists — create a new list
    function createList(name, onDone, onFail) {
      var network = new Lampa.Reguest();
      network.timeout(15000);
      network.native(base() + '/lists', function (data) {
        network.clear();
        var json = parse$1(data);
        if (json && json.id) onDone(json);else onFail();
      }, function (a, c) {
        network.clear();
        onFail(network.errorDecode(a, c));
      }, JSON.stringify({
        name: name,
        privacy_level: 'private'
      }), {
        headers: Object.assign({
          'Content-Type': 'application/json'
        }, apiKeyHeaders())
      });
    }

    // GET /lists/{listId} — list detail, items in .items field
    function getListItems(listId, onDone, onFail) {
      var network = new Lampa.Reguest();
      network.timeout(15000);
      network.native(base() + '/lists/' + listId, function (data) {
        network.clear();
        var json = parse$1(data);

        // List detail returns { ..., items: [...] } — unwrap
        if (json && Array.isArray(json.items)) onDone(json.items);else onFail();
      }, function (a, c) {
        network.clear();
        onFail(network.errorDecode(a, c));
      }, false, {
        headers: apiKeyHeaders()
      });
    }

    // POST /lists/{listId}/items — add an item to a list
    function addListItem(listId, tmdbId, mediaType, onDone, onFail) {
      var network = new Lampa.Reguest();
      network.timeout(15000);
      network.native(base() + '/lists/' + listId + '/items', function (data) {
        network.clear();
        var json = parse$1(data);
        if (json) onDone(json);else onFail();
      }, function (a, c) {
        network.clear();
        // Pass HTTP status to onFail so callers can handle 409 (already exists)
        var status = a && a.status;
        onFail(network.errorDecode(a, c), status);
      }, JSON.stringify({
        tmdb_id: tmdbId,
        media_type: mediaType
      }), {
        headers: Object.assign({
          'Content-Type': 'application/json'
        }, apiKeyHeaders())
      });
    }

    // DELETE /lists/{listId}/items/{itemId} — remove an item from a list
    function deleteListItem(listId, itemId, onDone, onFail) {
      var network = new Lampa.Reguest();
      network.timeout(15000);
      network.native(base() + '/lists/' + listId + '/items/' + itemId, function () {
        network.clear();
        onDone();
      }, function (a, c) {
        network.clear();
        onFail(network.errorDecode(a, c));
      }, false, {
        headers: apiKeyHeaders(),
        type: 'DELETE'
      });
    }

    // ─── Admin & history API methods ──────────────────────────

    // GET /admin/settings — socket configuration for the server
    // NOTE: Astro middleware requires X-Api-Key for /api/proxy/* routes
    // NOTE: backend requires Bearer token (OAuth2PasswordBearer)
    function adminSettings(onDone, onFail) {
      var network = new Lampa.Reguest();
      network.timeout(10000);
      network.native(base() + '/admin/settings', function (data) {
        network.clear();
        var json = parse$1(data);
        if (json) onDone(json);else onFail();
      }, function (a, c) {
        network.clear();
        onFail(network.errorDecode(a, c));
      }, false, {
        headers: Object.assign({}, apiKeyHeaders(), bearerHeaders())
      });
    }

    // WebSocket client for real-time Scrob events.
    // Supports external (wss via itty.ws) and internal (ws direct) modes.
    // No external dependencies — native browser WebSocket only.

    var ws = null;
    var socketConfig = null;
    var handlers = {};
    var reconnectAttempts = 0;
    var reconnectTimer = null;

    // Build WebSocket URL based on connection mode.
    // Pattern: wss://itty.ws/c/{namespace}:{channel}?joinKey={join_key}&sendKey={send_key}
    function buildSocketUrl(config) {
      var channel = config.namespace + ':user-' + config.username;
      if (config.mode === 'external') {
        // itty.ws relay — uses joinKey + sendKey (not apiKey)
        var base = config.externalUrl + channel;
        var params = [];
        if (config.joinKey) params.push('joinKey=' + encodeURIComponent(config.joinKey));
        if (config.sendKey) params.push('sendKey=' + encodeURIComponent(config.sendKey));
        return base + (params.length ? '?' + params.join('&') : '');
      }
      if (config.mode === 'internal') {
        // Self-hosted — uses joinKey + sendKey
        var base2 = 'ws://' + config.host + ':' + (config.port || 7332) + '/c/' + channel;
        var params2 = [];
        if (config.joinKey) params2.push('joinKey=' + encodeURIComponent(config.joinKey));
        if (config.sendKey) params2.push('sendKey=' + encodeURIComponent(config.sendKey));
        return base2 + (params2.length ? '?' + params2.join('&') : '');
      }
      return null;
    }

    // Establish WebSocket connection with auto-reconnect.
    function connect(url) {
      if (ws) {
        ws.close();
        ws = null;
      }
      reconnectAttempts = 0;
      reconnectTimer = null;
      try {
        ws = new WebSocket(url);
        ws.onopen = function () {
          reconnectAttempts = 0;
          console.log('ScrobSocket', 'connected');
          emitLifecycle('open');
        };
        ws.onmessage = function (event) {
          handleMessage(event.data);
        };
        ws.onclose = function (event) {
          console.log('ScrobSocket', 'disconnected', event.code);
          emitLifecycle('close');
          scheduleReconnect();
        };
        ws.onerror = function (error) {
          console.error('ScrobSocket', 'error', error);
        };
      } catch (e) {
        console.error('ScrobSocket', 'connection failed', e);
        scheduleReconnect();
      }
    }

    // Exponential backoff reconnect: 1s → 2s → 4s → ... → 30s max.
    function scheduleReconnect() {
      if (reconnectTimer) return;
      var delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      reconnectTimer = setTimeout(function () {
        reconnectTimer = null;
        if (socketConfig) {
          var url = buildSocketUrl(socketConfig);
          if (url) connect(url);
        }
      }, delay);
    }

    // Parse incoming JSON and dispatch to registered handlers.
    function handleMessage(data) {
      try {
        var msg = JSON.parse(data);
        if (msg && msg.type) {
          dispatch(msg.type, msg.payload);
        }
      } catch (e) {
        console.error('ScrobSocket', 'invalid message', e);
      }
    }

    // Call all registered handlers for an event type.
    function dispatch(type, payload) {
      if (handlers[type]) {
        handlers[type].forEach(function (handler) {
          try {
            handler(payload);
          } catch (e) {
            console.error('ScrobSocket', 'handler error', e);
          }
        });
      }
    }

    // Lifecycle hooks: 'open' converges on stale snapshot, 'close' resumes polling.
    // Subscribed by sync.engine via onLifecycle (core socket open → update pattern).
    var lifecycle = {
      open: [],
      close: []
    };
    function emitLifecycle(which) {
      var list = lifecycle[which] || [];
      for (var i = 0; i < list.length; i++) {
        try {
          list[i]();
        } catch (e) {
          console.error('ScrobSocket', 'lifecycle error', e);
        }
      }
    }
    function scrobSocketOnLifecycle(which, handler) {
      if (lifecycle[which] && lifecycle[which].indexOf(handler) === -1) lifecycle[which].push(handler);
    }
    function scrobSocketOffLifecycle(which, handler) {
      if (lifecycle[which]) {
        lifecycle[which] = lifecycle[which].filter(function (h) {
          return h !== handler;
        });
      }
    }

    // ─── Public API ───────────────────────────────────────────

    // Initialize WebSocket connection.
    // config: { mode, namespace, externalUrl, host, port, apiKey, username }
    function scrobSocketInit(config) {
      if (config.mode === 'disabled') {
        console.log('ScrobSocket', 'disabled mode — WebSocket not connected');
        return false;
      }
      var url = buildSocketUrl(config);
      if (!url) return false;
      socketConfig = config;
      connect(url);
      return true;
    }

    // Register event handler.
    function scrobSocketOn(event, handler) {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    }

    // Unregister event handler.
    function scrobSocketOff(event, handler) {
      if (handlers[event]) {
        handlers[event] = handlers[event].filter(function (h) {
          return h !== handler;
        });
      }
    }

    // Return connection state.
    function scrobSocketIsConnected() {
      return ws && ws.readyState === WebSocket.OPEN;
    }

    // Close connection and cleanup.
    function scrobSocketDisconnect() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        ws.close();
        ws = null;
      }
      socketConfig = null;
      handlers = {};
    }

    // Get socket interface object for sync.engine (inbound-only notify).
    // REST is the only write path; the server broadcasts REST writes to all devices.
    function getScrobSocket() {
      return {
        on: scrobSocketOn,
        off: scrobSocketOff,
        isConnected: scrobSocketIsConnected,
        onLifecycle: scrobSocketOnLifecycle,
        offLifecycle: scrobSocketOffLifecycle
      };
    }

    // Scrob sync — socket notification hub.
    // Socket is inbound-only: every event only invalidates state and calls engine.update().
    // No direct writes to Lampa.Storage here (mirrors src/core/socket.js: inbound
    // 'bookmarks' only triggers Account.Bookmarks.update()).

    // Registered update callback from the engine (set via bindUpdate)
    var updateFn = null;

    // Named handlers: stable references so off() actually unregisters (unlike
    // anonymous closures, which silently leak and double-fire after restarts).
    function onItemAdded(payload) {
      requestUpdate('list.item_added');
    }
    function onItemRemoved(payload) {
      requestUpdate('list.item_removed');
    }
    function onListCreated(payload) {
      requestUpdate('list.created');
    }
    function onListUpdated(payload) {
      requestUpdate('list.updated');
    }
    function onListDeleted(payload) {
      requestUpdate('list.deleted');
    }
    function onWatchEvent(payload) {
      requestUpdate('watch_event.created');
    }
    function onPlaybackCompleted(payload) {
      requestUpdate('playback_session.completed');
    }

    // Bind the engine update() entry point. Called once from engine.start().
    function bindUpdate(fn) {
      updateFn = fn;
    }

    // Single notification path: ask the engine to refetch and converge.
    function requestUpdate(reason) {
      if (typeof updateFn === 'function') updateFn(reason || 'socket');
    }

    // ─── Public API ───────────────────────────────────────────

    // Register invalidation handlers on the socket.
    // Every event funnels into requestUpdate — no Storage writes here.
    function registerHandlers(socket) {
      socket.on('list.item_added', onItemAdded);
      socket.on('list.item_removed', onItemRemoved);
      socket.on('list.created', onListCreated);
      socket.on('list.updated', onListUpdated);
      socket.on('list.deleted', onListDeleted);
      socket.on('watch_event.created', onWatchEvent);
      socket.on('playback_session.completed', onPlaybackCompleted);
    }

    // Unregister invalidation handlers from the socket.
    function unregisterHandlers(socket) {
      socket.off('list.item_added', onItemAdded);
      socket.off('list.item_removed', onItemRemoved);
      socket.off('list.created', onListCreated);
      socket.off('list.updated', onListUpdated);
      socket.off('list.deleted', onListDeleted);
      socket.off('watch_event.created', onWatchEvent);
      socket.off('playback_session.completed', onPlaybackCompleted);
    }

    // Scrob sync — category mapping between Lampa favorite keys and Scrob list names.
    // Canonical list names are static English, never translated.
    // Universal rule: any other array key → '[Lampa] ' + Capitalized(key).
    // Excluded from iteration: card, history, viewed.

    // Canonical mapping: Lampa key → Scrob list name
    var CANONICAL = {
      book: '[Lampa] Bookmarks',
      like: '[Lampa] Like',
      wath: '[Lampa] Later',
      scheduled: '[Lampa] Scheduled',
      continued: '[Lampa] To be continued',
      thrown: '[Lampa] Thrown',
      look: '[Lampa] Look'
    };

    // Keys excluded from sync iteration
    var EXCLUDED = {
      card: true,
      history: true,
      viewed: true
    };

    // Mark categories — mutually exclusive statuses (section 13, point 3)
    var MARK_KEYS = ['scheduled', 'continued', 'thrown', 'look', 'viewed'];

    // Capitalize first letter of a string
    function capitalize(str) {
      if (!str) return str;
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Get Scrob list name for a Lampa favorite key.
    // Canonical keys get static names; unknown keys use universal rule.
    // Returns null for excluded keys (card, history, viewed).
    function listNameForKey(key) {
      if (EXCLUDED[key]) return null;
      if (CANONICAL[key]) return CANONICAL[key];
      return '[Lampa] ' + capitalize(key);
    }

    // Get all syncable keys from a favorite object (all array keys except excluded).
    function syncableKeys(favorite) {
      var keys = [];
      for (var k in favorite) {
        if (!EXCLUDED[k] && Array.isArray(favorite[k])) {
          keys.push(k);
        }
      }
      return keys;
    }

    // Detect entity type from a Lampa card object.
    // Returns: 'person' | 'series' | 'movie'
    function detectMediaType(card) {
      if (!card) return 'movie';

      // Person detection (from custom/core/favorite.js:98)
      if (card.profile_path || card.known_for_department || typeof card.gender !== 'undefined') {
        return 'person';
      }

      // Series detection
      if (card.method === 'tv' || card.first_air_date || card.name && !card.title) {
        return 'series';
      }
      return 'movie';
    }

    // Convert Lampa method/type to Scrob media_type.
    // Lampa uses 'tv', Scrob uses 'series'.
    function toScrobType(lampaType) {
      if (lampaType === 'tv') return 'series';
      return lampaType; // 'movie', 'person'
    }

    // Convert Scrob media_type to Lampa method.
    // Scrob uses 'series', Lampa uses 'tv'.
    function toLampaMethod(scrobType) {
      if (scrobType === 'series') return 'tv';
      if (scrobType === 'person') return undefined;
      return 'movie';
    }

    // Build element key for mirror: "media_type:tmdb_id"
    function elementKey(mediaType, tmdbId) {
      return mediaType + ':' + tmdbId;
    }

    // Parse element key back to components
    function parseElementKey(key) {
      var idx = key.indexOf(':');
      if (idx === -1) return {
        mediaType: 'movie',
        tmdbId: key
      };
      return {
        mediaType: key.substring(0, idx),
        tmdbId: key.substring(idx + 1)
      };
    }

    // Build a minimal Lampa card from Scrob media object (section 7).
    // Enough for Lampa to open full-screen and fetch details.
    function cardFromScrobMedia(media) {
      if (!media || !media.tmdb_id) return null;
      var method = toLampaMethod(media.type);
      var card = {
        id: media.tmdb_id,
        method: method,
        title: media.title || '',
        poster_path: media.poster_path || '',
        backdrop_path: media.backdrop_path || '',
        release_date: media.release_date || ''
      };

      // Series: duplicate title into name/original_name for Lampa compatibility
      if (media.type === 'series') {
        card.name = media.title || '';
        card.original_name = media.title || '';
      }
      return card;
    }

    // ─── Unified KeyResolver (single implementation for REST + socket paths) ───
    // map: mapstore mapping object { lampaKey: { list_id, list_name } }
    // mirrorLists: mirror.get().lists ({ name: { list_id } })
    // favorite: parsed favorite object (for custom keys discovered at runtime)

    // Resolve the Lampa key for a Scrob list name.
    // Priority: 1) mapstore reverse lookup by name, 2) canonical names, 3) custom keys.
    function resolveKeyForListName(listName, map, favorite) {
      if (!listName) return null;
      if (map) {
        var mapKeys = Object.keys(map);
        for (var i = 0; i < mapKeys.length; i++) {
          if (map[mapKeys[i]].list_name === listName) return mapKeys[i];
        }
      }
      var canonicals = ['book', 'like', 'wath', 'scheduled', 'continued', 'thrown', 'look'];
      for (var j = 0; j < canonicals.length; j++) {
        if (CANONICAL[canonicals[j]] === listName) return canonicals[j];
      }
      if (favorite) {
        var keys = syncableKeys(favorite);
        for (var k = 0; k < keys.length; k++) {
          if (listNameForKey(keys[k]) === listName) return keys[k];
        }
      }
      return null;
    }

    // Resolve the Scrob list name for a list_id via the mirror index.
    function resolveNameForListId(listId, mirrorLists) {
      if (listId == null || !mirrorLists) return null;
      var names = Object.keys(mirrorLists);
      for (var i = 0; i < names.length; i++) {
        if (mirrorLists[names[i]].list_id == listId) return names[i];
      }
      return null;
    }

    // Resolve the Lampa key for a Scrob list_id.
    // Priority: 1) mapstore reverse lookup by id, 2) mirror name → key.
    function resolveKeyForListId(listId, map, mirrorLists, favorite) {
      if (listId == null) return null;
      if (map) {
        var keys = Object.keys(map);
        for (var i = 0; i < keys.length; i++) {
          if (map[keys[i]].list_id == listId) return keys[i];
        }
      }
      var name = resolveNameForListId(listId, mirrorLists);
      if (name) return resolveKeyForListName(name, map, favorite);
      return null;
    }

    // ─── Unified applicator (single write path with core marks logic) ───
    // All functions mutate the passed favorite object; the caller performs
    // exactly one Lampa.Storage.set('favorite') after the batch.

    // Remove a card from all mark categories except the specified one.
    // Mirrors Favorite.toggle() exclusivity in src/core/favorite.js.
    function removeFromOtherMarks(favorite, cardId, exceptKey) {
      for (var i = 0; i < MARK_KEYS.length; i++) {
        var key = MARK_KEYS[i];
        if (key === exceptKey) continue;
        if (!Array.isArray(favorite[key])) continue;
        var idx = favorite[key].indexOf(cardId);
        if (idx !== -1) favorite[key].splice(idx, 1);
      }
    }

    // Find a card by id in the shared pool.
    function findCardById(cards, id) {
      if (!Array.isArray(cards)) return null;
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].id == id) return cards[i];
      }
      return null;
    }

    // Build the local element set for one category: { "type:tmdb_id": cardId }
    function localElementSet(favorite, lampaKey) {
      var set = {};
      var localIds = lampaKey && Array.isArray(favorite[lampaKey]) ? favorite[lampaKey] : [];
      for (var j = 0; j < localIds.length; j++) {
        var card = findCardById(favorite.card, localIds[j]);
        if (!card || !card.id) continue;
        var idNum = parseInt(card.id, 10);
        if (!idNum) continue;
        set[elementKey(detectMediaType(card), idNum)] = card.id;
      }
      return set;
    }

    // Build the server element set from GET /lists/{id} items.
    function scrobElementSet(scrobItems) {
      var set = {};
      for (var i = 0; i < scrobItems.length; i++) {
        var item = scrobItems[i];
        if (item.media && item.media.tmdb_id) {
          var key = elementKey(toScrobType(item.media.type || 'movie'), item.media.tmdb_id);
          set[key] = {
            itemId: item.id,
            media: item.media
          };
        }
      }
      return set;
    }

    // Apply one remote addition to the favorite object (card pool + category + marks).
    function applyRemoteAdd(favorite, lampaKey, tmdbId, media) {
      if (!tmdbId) return;
      if (!Array.isArray(favorite.card)) favorite.card = [];
      var card = findCardById(favorite.card, tmdbId);
      if (!card) {
        card = media && cardFromScrobMedia(media) || null;
        if (!card) {
          card = {
            id: tmdbId,
            method: 'movie',
            title: String(tmdbId),
            poster_path: ''
          };
        }
        favorite.card.push(card);
      }
      if (lampaKey) {
        if (!Array.isArray(favorite[lampaKey])) favorite[lampaKey] = [];
        if (favorite[lampaKey].indexOf(card.id) === -1) favorite[lampaKey].push(card.id);
        if (MARK_KEYS.indexOf(lampaKey) !== -1) removeFromOtherMarks(favorite, card.id, lampaKey);
      }
    }

    // Apply one remote removal to the favorite object.
    function applyRemoteRemove(favorite, lampaKey, tmdbId) {
      if (!tmdbId || !lampaKey || !Array.isArray(favorite[lampaKey])) return;
      var idx = favorite[lampaKey].indexOf(tmdbId);
      if (idx !== -1) favorite[lampaKey].splice(idx, 1);
    }

    // Scrob sync — mirror storage with Tracker-model staleness.
    // Per-profile mirror: scrob_sync_mirror_{profile_id}
    // Structure: { lists: { "[Lampa] Name": { list_id, items: { "type:tmdb_id": item_id } } },
    //              version, time, updated_at }
    // version/time follow Lampa core Tracker (src/core/tracker.js): bumped on every
    // converged save; profile switch resets them so the next update fetches fresh state.


    // Get the storage key for the active profile's mirror
    function mirrorKey() {
      var pid = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID) || 'default';
      return 'scrob_sync_mirror_' + pid;
    }

    // Get the initial-done flag key for the active profile
    function initialDoneKey() {
      var pid = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID) || 'default';
      return 'scrob_sync_initial_done_' + pid;
    }

    // Default mirror structure
    function emptyMirror() {
      return {
        lists: {},
        version: 0,
        time: 0,
        updated_at: 0
      };
    }

    // Read the mirror from storage
    function get() {
      var raw = Lampa.Storage.get(mirrorKey(), 'none');
      if (raw === 'none' || !raw) return emptyMirror();
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw);
        } catch (e) {
          return emptyMirror();
        }
      }
      return raw;
    }

    // Save the mirror to storage
    function save(mirror) {
      var now = Date.now();
      mirror.time = now;
      mirror.version = (mirror.version || 0) + 1;
      mirror.updated_at = now;
      Lampa.Storage.set(mirrorKey(), mirror);
    }

    // True when the mirror snapshot is older than the given age (ms)
    function isStale(maxAgeMs) {
      var m = get();
      return Date.now() - (m.time || 0) > maxAgeMs;
    }

    // Reset the mirror to empty
    function reset() {
      Lampa.Storage.set(mirrorKey(), emptyMirror());
    }

    // Get a list entry by name (returns undefined if not found)
    function getList(name) {
      var m = get();
      return m.lists[name];
    }

    // Set a list entry by name
    function setList(name, listId) {
      var m = get();
      m.lists[name] = {
        list_id: listId,
        items: m.lists[name] ? m.lists[name].items : {}
      };
      save(m);
    }

    // Get item_id from mirror for a specific list and element key
    function getItemId(listName, elemKey) {
      var list = getList(listName);
      if (!list) return null;
      return list.items[elemKey] || null;
    }

    // Set item_id in mirror for a specific list and element key
    function setItemId(listName, elemKey, itemId) {
      var m = get();
      if (!m.lists[listName]) {
        m.lists[listName] = {
          list_id: null,
          items: {}
        };
      }
      m.lists[listName].items[elemKey] = itemId;
      save(m);
    }

    // Remove item_id from mirror for a specific list and element key
    function removeItemId(listName, elemKey) {
      var m = get();
      if (m.lists[listName] && m.lists[listName].items) {
        delete m.lists[listName].items[elemKey];
        save(m);
      }
    }

    // Check if initial sync has been done for the active profile
    function isInitialDone() {
      return !!Lampa.Storage.get(initialDoneKey());
    }

    // Mark initial sync as done
    function markInitialDone() {
      Lampa.Storage.set(initialDoneKey(), true);
    }

    // Clear initial done flag (for profile switch re-sync)
    function clearInitialDone() {
      Lampa.Storage.set(initialDoneKey(), false);
    }

    // Scrob sync — manual mapping storage.
    // Maps arbitrary Scrob lists to Lampa favorite categories.
    // Storage key: scrob_sync_map_{profile_id}
    // Structure: { "wath": { "list_id": 5, "list_name": "Test" } }


    // Get the storage key for the active profile's mapping
    function mapKey() {
      var pid = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID) || 'default';
      return 'scrob_sync_map_' + pid;
    }

    // Broken mappings storage key
    function brokenKey() {
      var pid = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID) || 'default';
      return 'scrob_sync_broken_' + pid;
    }

    // Parse stored map from storage
    function parseMap(raw) {
      if (!raw || raw === 'none') return {};
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch (e) {
          return {};
        }
      }
      return raw;
    }

    // Parse stored broken array from storage
    function parseBroken(raw) {
      if (!raw || raw === 'none') return [];
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(raw) ? raw : [];
    }

    // Get the full mapping object
    function getMap() {
      return parseMap(Lampa.Storage.get(mapKey(), 'none'));
    }

    // Save the full mapping object
    function saveMap(map) {
      Lampa.Storage.set(mapKey(), map);
    }

    // Set a mapping: lampaKey → { list_id, list_name }
    // Returns true on success, false if list_id already mapped to another category
    function setMapping(lampaKey, listId, listName) {
      var map = getMap();

      // Exclusivity check: list_id must not be mapped to another category
      var keys = Object.keys(map);
      for (var i = 0; i < keys.length; i++) {
        if (keys[i] !== lampaKey && map[keys[i]].list_id == listId) {
          return false;
        }
      }
      map[lampaKey] = {
        list_id: listId,
        list_name: listName
      };
      saveMap(map);

      // Clear broken flag for this key if it was previously broken
      var broken = getBroken();
      var idx = broken.indexOf(lampaKey);
      if (idx !== -1) {
        broken.splice(idx, 1);
        saveBroken(broken);
      }
      return true;
    }

    // Remove a mapping for a lampaKey
    function removeMapping(lampaKey) {
      var map = getMap();
      delete map[lampaKey];
      saveMap(map);
    }

    // Get all mapped list_ids
    function getMappedIds() {
      var map = getMap();
      var ids = [];
      var keys = Object.keys(map);
      for (var i = 0; i < keys.length; i++) {
        ids.push(map[keys[i]].list_id);
      }
      return ids;
    }

    // Get broken mappings array
    function getBroken() {
      return parseBroken(Lampa.Storage.get(brokenKey(), 'none'));
    }

    // Save broken mappings array
    function saveBroken(broken) {
      Lampa.Storage.set(brokenKey(), broken);
    }

    // Mark a mapping as broken (list deleted on server)
    function markBroken(lampaKey) {
      var broken = getBroken();
      if (broken.indexOf(lampaKey) === -1) {
        broken.push(lampaKey);
        saveBroken(broken);
      }
    }

    // Get mapping entry for a lampaKey (returns { list_id, list_name } or undefined)
    function getMapping(lampaKey) {
      var map = getMap();
      return map[lampaKey];
    }

    // Scrob sync engine — single-convergence orchestrator for list synchronization.
    // Model: Lampa core Account.Bookmarks (src/core/account/bookmarks.js).
    // - Outbound: Favorite.listener add/remove + state:changed (custom keys) into one
    //   serial push_queue with 500ms debounce. REST is the only write path.
    // - Socket: inbound-only notify/invalidate hub (handler.js) → update(). Writes never
    //   branch on isSocketActive(): the server already broadcasts REST writes to all devices.
    // - Inbound/polling: one update() entry — fetch all lists, converge each pair
    //   via applyRemoteDiff with the unified KeyResolver/applicator (mapping.js).
    // - Mirror: Tracker-model {version,time} stamp; 409 resolves the real item_id,
    //   deletes always use a resolved item_id. received flag guards echo.


    // ─── State ────────────────────────────────────────────────

    var received = false; // Echo guard: true while engine itself writes favorite
    var outboundTimer = null; // Debounce timer for outbound push (core: 500ms)
    var pushQueue = []; // Serial outbound queue { method, lampaKey, card }
    var pushRunning = false; // Serial guard (core: push_running)
    var updateTimer = null; // Socket/poll invalidate debounce (core: update_timer 500ms)
    var updateRunning = false; // Single-flight update() guard
    var pollTimer = null; // Polling interval timer
    var retryQueue = []; // Failed REST operations for retry
    var retryTimer = null; // Retry interval timer
    var running = false; // Engine active flag
    var profileListener = null; // Profile change listener reference
    var brokenMappings = []; // Keys whose mapped list was deleted on server
    var healing = false; // Self-heal guard: prevent re-entrant missing-key resolution
    var activeSocket = null; // Current WebSocket instance (inbound-only notify)
    var handlersBound = false; // Socket handlers registered flag
    var socketPollBound = null; // Socket open/close hook reference

    // Debounce window for batching outbound changes (ms, core bookmarks.js: 500)
    var DEBOUNCE_MS = 500;
    var RETRY_DELAY = 5000;
    var RETRY_MAX = 3;

    // ─── Conflict detection ───────────────────────────────────

    // Detect conflicts with other sync mechanisms.
    // Returns an array of conflict objects: { type, reason }
    function detectConflicts() {
      var conflicts = [];

      // CUB account with sync enabled (section 9)
      if (Lampa.Account && Lampa.Account.Permit && Lampa.Account.Permit.sync) {
        conflicts.push({
          type: 'cub_sync',
          reason: 'CUB synchronization is enabled — Scrob list sync is blocked'
        });
      }

      // GramSync/GramLink profile active (section 9)
      if (Lampa.Storage.get('gramsync_sync_enabled')) {
        conflicts.push({
          type: 'gramsync',
          reason: 'GramSync is enabled — simultaneous sync may cause data conflicts'
        });
      }
      return conflicts;
    }

    // ─── Socket integration ───────────────────────────────────

    // Provide a WebSocket instance for real-time sync (inbound-only notify).
    function useSocket(socketInstance) {
      // Rebinding: drop handlers from the previous socket before switching.
      if (activeSocket && activeSocket !== socketInstance) unbindSocketHandlers();
      activeSocket = socketInstance;
      if (running) {
        bindSocketHandlers();
        if (isSocketActive()) stopPolling();else startPolling();
      }
    }

    // Check if socket is currently connected and active.
    function isSocketActive() {
      return !!(activeSocket && activeSocket.isConnected && activeSocket.isConnected());
    }

    // ─── Favorite helpers ─────────────────────────────────────

    // Read favorite from storage, normalize from string if needed.
    function readFavorite() {
      var favorite = Lampa.Storage.get('favorite', '{}');
      if (typeof favorite === 'string') {
        try {
          favorite = JSON.parse(favorite);
        } catch (e) {
          favorite = {};
        }
      }
      if (!favorite.card) favorite.card = [];
      return favorite;
    }

    // Single favorite write under the received guard (core Timeline received pattern).
    function writeFavorite(favorite) {
      received = true;
      Lampa.Storage.set('favorite', favorite);
      received = false;
    }

    // ─── Outbound: Favorite.listener + state:changed → serial queue ───
    // Core pattern: Favorite.listener.follow('add,added'/'remove') in bookmarks.js init().

    function onFavoriteAdd(e) {
      if (!running || received) return;
      if (!e || !e.where || !e.card || !e.card.id) return;
      push('add', e.where, e.card);
    }
    function onFavoriteRemove(e) {
      if (!running || received) return;
      if (!e || !e.where || !e.card) return;
      if (e.method && e.method !== 'id') return;
      if (!e.card.id) return;
      push('remove', e.where, e.card);
    }

    // Custom categories bypass core Favorite (see main.js toggleCustomCategory) and
    // only emit state:changed with type=custom key — bridge them into the same queue.
    // Dedupe: core keys already arrived via Favorite.listener; skip if identical op queued.
    function onStateChanged(e) {
      if (!running || received) return;
      if (!e || e.target !== 'favorite' || e.reason !== 'update') return;
      if (!e.type || !e.card || !e.card.id) return;
      if (e.method !== 'add' && e.method !== 'added' && e.method !== 'remove') return;
      var fav = readFavorite();
      if (!Array.isArray(fav[e.type])) return;
      var method = e.method === 'remove' ? 'remove' : 'add';
      for (var i = 0; i < pushQueue.length; i++) {
        if (pushQueue[i].method === method && pushQueue[i].lampaKey === e.type && pushQueue[i].card.id == e.card.id) return;
      }
      push(method, e.type, e.card);
    }
    function push(method, lampaKey, card) {
      pushQueue.push({
        method: method,
        lampaKey: lampaKey,
        card: card
      });
      if (outboundTimer) clearTimeout(outboundTimer);
      outboundTimer = setTimeout(processQueue, DEBOUNCE_MS);
    }

    // Serial outbound drain: one REST write at a time, then mirror + invalidate.
    function processQueue() {
      outboundTimer = null;
      if (pushRunning || pushQueue.length === 0) return;
      pushRunning = true;
      var op = pushQueue.shift();
      writeOne(op, function () {
        pushRunning = false;
        if (pushQueue.length > 0) {
          outboundTimer = setTimeout(processQueue, DEBOUNCE_MS);
        }
      });
    }

    // Resolve list_id for a Lampa key: mapstore first, then mirror by canonical name.
    function resolveListId(lampaKey) {
      var mapping = getMapping(lampaKey);
      if (mapping && mapping.list_id) return {
        listId: mapping.list_id,
        listName: mapping.list_name || listNameForKey(lampaKey)
      };
      var name = listNameForKey(lampaKey);
      if (!name) return null;
      var m = get();
      if (m.lists[name] && m.lists[name].list_id) return {
        listId: m.lists[name].list_id,
        listName: name
      };
      return null;
    }

    // Single REST write. Socket is notify-only: no socketIngest branch here.
    function writeOne(op, done) {
      var target = resolveListId(op.lampaKey);
      if (!target) {
        // Unknown list (e.g. new custom key before self-heal) — defer to update().
        update('self-heal');
        done();
        return;
      }
      var cardId = parseInt(op.card.id, 10);
      if (!cardId) {
        done();
        return;
      }
      var mediaType = detectMediaType(op.card);
      var key = elementKey(mediaType, cardId);
      if (op.method === 'add') {
        addListItem(target.listId, cardId, mediaType, function (response) {
          setItemId(target.listName, key, response && response.id ? response.id : null);
          // Notify other devices; our own state already converged via the queue.
          done();
        }, function (err, status) {
          if (status === 409 || String(err).indexOf('409') !== -1) {
            // Already on server: fetch the real item_id so delete stays possible.
            fetchItemId(target.listId, target.listName, key, done);
            return;
          }
          if (isAuthError(err)) {
            pauseSync('Authentication expired');
            done();
            return;
          }
          enqueueRetry({
            type: 'add',
            listId: target.listId,
            listName: target.listName,
            key: key,
            tmdbId: cardId,
            mediaType: mediaType
          });
          done();
        });
      } else {
        var itemId = getItemId(target.listName, key);
        if (!itemId) {
          // No item_id (409 null-mark or missed ingest): resolve before delete.
          fetchItemId(target.listId, target.listName, key, function (resolved) {
            var rid = getItemId(target.listName, key);
            if (rid) {
              deleteListItem(target.listId, rid, function () {
                removeItemId(target.listName, key);
                done();
              }, function (err) {
                if (isAuthError(err)) {
                  pauseSync('Authentication expired');
                  done();
                  return;
                }
                enqueueRetry({
                  type: 'remove',
                  listId: target.listId,
                  listName: target.listName,
                  key: key,
                  itemId: rid
                });
                done();
              });
            } else {
              // Item is neither on server nor in mirror — converge by dropping the mark.
              removeItemId(target.listName, key);
              done();
            }
          }, true);
          return;
        }
        deleteListItem(target.listId, itemId, function () {
          removeItemId(target.listName, key);
          done();
        }, function (err) {
          if (isAuthError(err)) {
            pauseSync('Authentication expired');
            done();
            return;
          }
          enqueueRetry({
            type: 'remove',
            listId: target.listId,
            listName: target.listName,
            key: key,
            itemId: itemId
          });
          done();
        });
      }
    }

    // Fetch the server item_id for one element key (fixes 409 null-marks).
    // When onlyCheck is set, never creates — just resolves or drops the mark.
    function fetchItemId(listId, listName, key, callback, onlyCheck) {
      getListItems(listId, function (items) {
        var set = scrobElementSet(items);
        if (set[key]) {
          setItemId(listName, key, set[key].itemId);
        } else if (onlyCheck) {
          removeItemId(listName, key);
        } else {
          setItemId(listName, key, null);
        }
        if (callback) callback(set[key] ? set[key].itemId : null);
      }, function () {
        if (!onlyCheck) setItemId(listName, key, null);
        if (callback) callback(null);
      });
    }

    // ─── List resolution ──────────────────────────────────────

    // Resolve all syncable list names against Scrob server.
    // Creates missing lists. Returns map: { listName: listId }
    // Mapped keys use the mapped Scrob list; unmapped keys use [Lampa] lists.
    function resolveLists(callback) {
      getLists(function (serverLists) {
        // Index server lists by name and by id for O(1) lookup
        var byName = {};
        var byId = {};
        for (var i = 0; i < serverLists.length; i++) {
          byName[serverLists[i].name] = serverLists[i];
          byId[serverLists[i].id] = serverLists[i];
        }

        // Read current favorite to get all syncable keys
        var favorite = readFavorite();
        var keys = syncableKeys(favorite);
        var resolved = {};
        var pending = 0;
        brokenMappings = [];
        function done() {
          callback(resolved);
        }
        function checkDone() {
          pending--;
          if (pending <= 0) done();
        }

        // Resolve a canonical [Lampa] key: create list if missing
        function resolveDefaultKey(name) {
          if (byName[name]) {
            resolved[name] = byName[name].id;
            setList(name, byName[name].id);
            checkDone();
          } else {
            pending++;
            createList(name, function (created) {
              resolved[name] = created.id;
              setList(name, created.id);
              checkDone();
            }, function () {
              checkDone();
            });
          }
        }
        if (keys.length === 0) {
          done();
        } else {
          for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            var mapping = getMapping(key);
            if (mapping) {
              // Mapped key: resolve by list_id (fallback by list_name)
              var serverList = byId[mapping.list_id];
              if (!serverList && mapping.list_name) {
                serverList = byName[mapping.list_name];
              }
              if (serverList) {
                resolved[mapping.list_name || listNameForKey(key)] = serverList.id;
                setList(mapping.list_name || listNameForKey(key), serverList.id);
                checkDone();
              } else {
                // List not found on server — mark broken, skip
                brokenMappings.push(key);
                markBroken(key);
                checkDone();
              }
            } else {
              // Unmapped key: use default [Lampa] list
              var name = listNameForKey(key);
              if (name) {
                pending++;
                resolveDefaultKey(name);
              } else {
                checkDone();
              }
            }
          }

          // Also resolve any existing mirror lists (might have been added by other clients)
          var m = get();
          var mirrorNames = Object.keys(m.lists);
          for (var k = 0; k < mirrorNames.length; k++) {
            if (!resolved[mirrorNames[k]]) {
              pending++;
              resolveDefaultKey(mirrorNames[k]);
            }
          }
          if (pending === 0) done();
        }
      }, function () {
        console.warn('ScrobSync', 'getLists failed');
        callback({});
      });
    }

    // Ensure a single list exists on server, merge into mirror, then re-run update.
    // Self-heal completion always triggers a повторний диф (converge), never just fills the mirror.
    function ensureList(name, lampaKey, callback) {
      function afterResolve(listId) {
        mergePair(lampaKey, listId, name, function () {
          update('self-heal');
          if (callback) callback();
        });
      }
      getLists(function (serverLists) {
        var byName = {};
        for (var i = 0; i < serverLists.length; i++) {
          byName[serverLists[i].name] = serverLists[i];
        }
        if (byName[name]) {
          setList(name, byName[name].id);
          afterResolve(byName[name].id);
        } else {
          createList(name, function (created) {
            setList(name, created.id);
            afterResolve(created.id);
          }, callback);
        }
      }, callback);
    }

    // ─── Converge: single update() for inbound WS + polling ───
    // Mirrors Account.Bookmarks.update(): fetch everything, converge every pair,
    // single favorite write, bump the Tracker stamp.

    function update(reason) {
      if (!running || !hasSession()) return;
      if (updateRunning) {
        // Coalesce concurrent invalidations into one trailing run.
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = setTimeout(function () {
          updateTimer = null;
          update(reason);
        }, DEBOUNCE_MS);
        return;
      }
      updateRunning = true;
      getLists(function (serverLists) {
        convergeAll(serverLists, function () {
          updateRunning = false;
        });
      }, function () {
        console.warn('ScrobSync', 'update getLists failed (' + (reason || 'poll') + ')');
        updateRunning = false;
      });
    }

    // Debounced invalidate entry used by the socket hub and the poll timer.
    function invalidate(reason) {
      if (!running || !hasSession()) return;
      if (updateRunning) return;
      if (updateTimer) clearTimeout(updateTimer);
      updateTimer = setTimeout(function () {
        updateTimer = null;
        update(reason || 'invalidate');
      }, DEBOUNCE_MS);
    }
    function convergeAll(serverLists, done) {
      var favorite = readFavorite();
      var map = getMap();
      var m = get();

      // Index server lists by id.
      var byId = {};
      for (var i = 0; i < serverLists.length; i++) {
        if (serverLists[i].id != null) byId[serverLists[i].id] = serverLists[i];
      }

      // Build converge targets: every known pair exactly once.
      // Sources: mirror entries + mapstore mappings + local syncable keys.
      var targets = {}; // listName -> { listId, lampaKey }
      var mirrorNames = Object.keys(m.lists);
      for (var a = 0; a < mirrorNames.length; a++) {
        var entry = m.lists[mirrorNames[a]];
        if (entry && entry.list_id) {
          targets[mirrorNames[a]] = {
            listId: entry.list_id,
            lampaKey: resolveKeyForListId(entry.list_id, map, m.lists, favorite)
          };
        }
      }
      var mapKeys = Object.keys(map);
      for (var b = 0; b < mapKeys.length; b++) {
        var me = map[mapKeys[b]];
        if (me && me.list_id && byId[me.list_id]) {
          var mname = me.list_name || byId[me.list_id].name;
          if (!targets[mname]) targets[mname] = {
            listId: me.list_id,
            lampaKey: mapKeys[b]
          };
        }
      }
      var keys = syncableKeys(favorite);
      for (var c = 0; c < keys.length; c++) {
        var dname = listNameForKey(keys[c]);
        if (dname && !targets[dname] && byId && m.lists[dname]) {
          targets[dname] = {
            listId: m.lists[dname].list_id,
            lampaKey: keys[c]
          };
        }
      }
      var names = Object.keys(targets);
      var changed = false;
      function next(index) {
        if (index >= names.length) {
          if (changed) {
            writeFavorite(favorite);
            save(get());
          } else {
            // Still bump the Tracker stamp: converged-noop is a successful sync.
            save(get());
          }
          // Self-heal pass: brand-new local keys with no server list yet.
          selfHeal(favorite, map, function () {
            done();
          });
          return;
        }
        var listName = names[index];
        var target = targets[listName];
        if (!target.listId || !target.lampaKey) {
          next(index + 1);
          return;
        }
        convergeOneList(listName, target.listId, target.lampaKey, favorite, function (listChanged) {
          if (listChanged) changed = true;
          next(index + 1);
        });
      }
      if (names.length === 0) {
        selfHeal(favorite, map, function () {
          done();
        });
        return;
      }
      next(0);
    }

    // Converge one pair: pull remote→local and push local→remote, REST only.
    function convergeOneList(listName, listId, lampaKey, favorite, callback) {
      getListItems(listId, function (scrobItems) {
        var scrobSet = scrobElementSet(scrobItems);
        var localSet = localElementSet(favorite, lampaKey);
        var mirrorItems = (getList(listName) || {}).items || {};

        // Remote-first: additions and removals relative to the converged mirror.
        var toAddLocal = [];
        for (var sk in scrobSet) {
          if (typeof mirrorItems[sk] === 'undefined' && !localSet[sk]) {
            toAddLocal.push({
              key: sk,
              media: scrobSet[sk].media
            });
          } else if (typeof mirrorItems[sk] === 'undefined' && localSet[sk]) {
            // Both sides added the same item while offline — adopt the server item_id.
            setItemId(listName, sk, scrobSet[sk].itemId);
          }
        }
        var toRemoveLocal = [];
        for (var mk in mirrorItems) {
          if (!scrobSet[mk] && localSet[mk]) {
            // Gone on server but present locally: another device removed it — follow.
            // Our own queued removes carry a real item_id and win on push below.
            var stillQueued = false;
            for (var q = 0; q < pushQueue.length; q++) {
              if (pushQueue[q].lampaKey === lampaKey && pushQueue[q].method === 'remove') {
                var qp = parseElementKey(mk);
                if (String(pushQueue[q].card.id) === String(qp.tmdbId)) {
                  stillQueued = true;
                  break;
                }
              }
            }
            if (!stillQueued) toRemoveLocal.push(mk);
          } else if (!scrobSet[mk] && !localSet[mk]) {
            removeItemId(listName, mk);
          }
        }
        var listChanged = toAddLocal.length > 0 || toRemoveLocal.length > 0;
        for (var ai = 0; ai < toAddLocal.length; ai++) {
          var parsed = parseElementKey(toAddLocal[ai].key);
          applyRemoteAdd(favorite, lampaKey, parseInt(parsed.tmdbId, 10), toAddLocal[ai].media);
          setItemId(listName, toAddLocal[ai].key, scrobSet[toAddLocal[ai].key].itemId);
        }
        for (var ri = 0; ri < toRemoveLocal.length; ri++) {
          var rparsed = parseElementKey(toRemoveLocal[ri]);
          applyRemoteRemove(favorite, lampaKey, parseInt(rparsed.tmdbId, 10));
          removeItemId(listName, toRemoveLocal[ri]);
        }

        // Local-first: push what is local but missing on the server.
        var toPush = [];
        var freshLocal = localElementSet(favorite, lampaKey);
        for (var lk in freshLocal) {
          if (!scrobSet[lk]) toPush.push(lk);
        }
        if (toPush.length === 0) {
          callback(listChanged);
          return;
        }
        if (listChanged) listChanged = true;
        pushRestItems(listId, listName, toPush, 0, function () {
          callback(true);
        });
      }, function () {
        callback(false);
      });
    }

    // Sequential REST push with 150ms pause between writes.
    function pushRestItems(listId, listName, items, index, callback) {
      if (index >= items.length) {
        callback();
        return;
      }
      var parts = parseElementKey(items[index]);
      var tmdbId = parseInt(parts.tmdbId, 10);
      if (!tmdbId) {
        pushRestItems(listId, listName, items, index + 1, callback);
        return;
      }
      addListItem(listId, tmdbId, parts.mediaType, function (response) {
        setItemId(listName, items[index], response && response.id ? response.id : null);
        setTimeout(function () {
          pushRestItems(listId, listName, items, index + 1, callback);
        }, 150);
      }, function (err, status) {
        if (status === 409 || String(err).indexOf('409') !== -1) {
          fetchItemId(listId, listName, items[index], function () {
            setTimeout(function () {
              pushRestItems(listId, listName, items, index + 1, callback);
            }, 150);
          });
          return;
        }
        if (isAuthError(err)) {
          pauseSync('Authentication expired');
          callback();
          return;
        }
        enqueueRetry({
          type: 'add',
          listId: listId,
          listName: listName,
          key: items[index],
          tmdbId: tmdbId,
          mediaType: parts.mediaType
        });
        setTimeout(function () {
          pushRestItems(listId, listName, items, index + 1, callback);
        }, 150);
      });
    }

    // Self-heal: brand-new local keys with no server list yet → ensureList + re-diff.
    function selfHeal(favorite, map, done) {
      if (healing) {
        done();
        return;
      }
      var m = get();
      var missing = [];
      var keys = syncableKeys(favorite);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var mapped = map[key];
        if (mapped) {
          if (mapped.list_id && !m.lists[mapped.list_name]) {
            missing.push({
              key: key,
              name: mapped.list_name,
              listId: mapped.list_id
            });
          }
          continue;
        }
        var name = listNameForKey(key);
        if (name && !m.lists[name]) missing.push({
          key: key,
          name: name,
          listId: null
        });
      }
      if (missing.length === 0) {
        done();
        return;
      }
      healing = true;
      var pending = missing.length;
      function oneDone() {
        pending--;
        if (pending <= 0) {
          healing = false;
          done();
        }
      }
      for (var j = 0; j < missing.length; j++) {
        (function (entry) {
          if (entry.listId) {
            setList(entry.name, entry.listId);
            mergePair(entry.key, entry.listId, entry.name, oneDone);
          } else {
            ensureList(entry.name, entry.key, oneDone);
          }
        })(missing[j]);
      }
    }

    // ─── Initial sync (section 7) ─────────────────────────────

    function initialSync() {
      if (isInitialDone()) return;
      if (!hasSession()) return;
      console.log('ScrobSync', 'initial sync start');
      resolveLists(function (listMap) {
        var listNames = Object.keys(listMap);
        if (listNames.length === 0) {
          // If mirror is empty and this was a forced/first sync — report failure
          var m = get();
          if (Object.keys(m.lists).length === 0) {
            Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_lists_error'));
          } else {
            markInitialDone();
          }
          return;
        }
        // First converge goes through the single update() path.
        markInitialDone();
        update('initial');
      });
    }

    // ─── Retry queue ──────────────────────────────────────────

    function enqueueRetry(op) {
      op.retries = (op.retries || 0) + 1;
      if (op.retries <= RETRY_MAX) {
        retryQueue.push(op);
      } else {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_lost'));
      }
    }
    function processRetryOp(op) {
      if (op.type === 'add') {
        var parts = parseElementKey(op.key);
        var tmdbId = op.tmdbId || parseInt(parts.tmdbId, 10);
        var mediaType = op.mediaType || parts.mediaType;
        if (!tmdbId) return;
        addListItem(op.listId, tmdbId, mediaType, function (response) {
          setItemId(op.listName, op.key, response && response.id ? response.id : null);
        }, function (err, status) {
          if (status === 409 || String(err).indexOf('409') !== -1) {
            fetchItemId(op.listId, op.listName, op.key, null);
            return;
          }
          op.retries = (op.retries || 0) + 1;
          if (op.retries <= RETRY_MAX) retryQueue.push(op);
        });
      } else if (op.type === 'remove') {
        var itemId = op.itemId || getItemId(op.listName, op.key);
        if (!itemId) {
          // Resolve the real item_id first — deletes never use a null mark.
          fetchItemId(op.listId, op.listName, op.key, function (resolved) {
            var rid = resolved || getItemId(op.listName, op.key);
            if (rid) {
              deleteListItem(op.listId, rid, function () {
                removeItemId(op.listName, op.key);
              }, function () {
                op.retries = (op.retries || 0) + 1;
                if (op.retries <= RETRY_MAX) retryQueue.push(op);
              });
            } else {
              removeItemId(op.listName, op.key);
            }
          }, true);
          return;
        }
        deleteListItem(op.listId, itemId, function () {
          removeItemId(op.listName, op.key);
        }, function () {
          op.retries = (op.retries || 0) + 1;
          if (op.retries <= RETRY_MAX) retryQueue.push(op);
        });
      }
    }
    function startRetryLoop() {
      if (retryTimer) return;
      retryTimer = setInterval(function () {
        if (!running || retryQueue.length === 0) return;
        var batch = retryQueue.splice(0, retryQueue.length);
        for (var i = 0; i < batch.length; i++) {
          processRetryOp(batch[i]);
        }
      }, RETRY_DELAY);
    }
    function stopRetryLoop() {
      if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
      retryQueue = [];
    }

    // ─── Inbound polling ────────────────────────

    function getPollInterval() {
      var val = Lampa.Storage.get('scrob_sync_interval', '30');
      return parseInt(val, 10) * 1000 || 30000;
    }
    function startPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(function () {
        if (!running || !hasSession()) return;
        // Socket-active mode invalidates via WS; polling is the fallback path.
        // Both funnel into the same update() — never two parallel writers.
        invalidate('poll');
      }, getPollInterval());
    }
    function stopPolling() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    // ─── Auth error handling ──────────────────────────────────

    function isAuthError(err) {
      if (!err) return false;
      var str = String(err);
      return str.indexOf('401') !== -1 || str.indexOf('403') !== -1;
    }
    function pauseSync(reason) {
      running = false;
      stopPolling();
      stopRetryLoop();
      console.warn('ScrobSync', 'paused:', reason);
      Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_paused') + ': ' + reason);
    }

    // ─── Profile change handling ──────────────────────────────

    function setupProfileListener() {
      var lastProfileId = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID);
      profileListener = function profileListener(e) {
        if (e.name === KEYS.ACTIVE_PROFILE_ID) {
          var newId = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID);
          if (newId !== lastProfileId) {
            lastProfileId = newId;
            // Stop, reset mirror + tracker stamp, re-sync for new profile.
            // Mirrors core: profile_select resets tracker time/version to force a dump.
            stop();
            reset();
            clearInitialDone();
            start();
          }
        }
      };
      Lampa.Storage.listener.follow('change', profileListener);
    }

    // ─── Socket lifecycle ─────────────────────────────────────

    // Socket open converges on a stale tracker snapshot (core socket open → update).
    function onSocketOpen() {
      if (!running) return;
      stopPolling();
      if (isStale(getPollInterval())) update('socket-open');
    }

    // Socket close resumes polling fallback.
    function onSocketClose() {
      if (!running) return;
      startPolling();
    }

    // Register WS invalidate handlers after start (core: socket open → update on stale).
    function bindSocketHandlers() {
      if (!activeSocket || handlersBound) return;
      bindUpdate(invalidate);
      registerHandlers(activeSocket);
      if (activeSocket.onLifecycle) {
        activeSocket.onLifecycle('open', onSocketOpen);
        activeSocket.onLifecycle('close', onSocketClose);
      }
      handlersBound = true;
      // Already-connected socket with a stale tracker snapshot converges immediately.
      if (isSocketActive() && isStale(getPollInterval())) update('socket-open');
    }
    function unbindSocketHandlers() {
      if (activeSocket && handlersBound) {
        unregisterHandlers(activeSocket);
        if (activeSocket.offLifecycle) {
          activeSocket.offLifecycle('open', onSocketOpen);
          activeSocket.offLifecycle('close', onSocketClose);
        }
      }
      handlersBound = false;
      bindUpdate(null);
    }

    // ─── Mapping merge (section 14.3) ─────────────────────────

    // Merge a single pair: union of local category and Scrob list, REST only.
    function mergePair(lampaKey, listId, listName, callback) {
      console.log('ScrobSync', 'merge pair', listName);
      getListItems(listId, function (scrobItems) {
        var favorite = readFavorite();
        var scrobSet = scrobElementSet(scrobItems);
        var localSet = localElementSet(favorite, lampaKey);

        // Push: localSet − scrobSet (REST only).
        var toAdd = [];
        for (var k in localSet) {
          if (!scrobSet[k]) toAdd.push(k);
        }

        // Pull: scrobSet − localSet (unified applicator).
        var toPull = [];
        for (var sk in scrobSet) {
          if (!localSet[sk]) toPull.push({
            key: sk,
            media: scrobSet[sk].media
          });
        }
        pushRestItems(listId, listName, toAdd, 0, function () {
          for (var p = 0; p < toPull.length; p++) {
            var parsed = parseElementKey(toPull[p].key);
            applyRemoteAdd(favorite, lampaKey, parseInt(parsed.tmdbId, 10), toPull[p].media);
            setItemId(listName, toPull[p].key, scrobSet[toPull[p].key].itemId);
          }
          // Adopt server item_ids for keys the push just created (409 or fresh).
          getListItems(listId, function (fresh) {
            var freshSet = scrobElementSet(fresh);
            for (var fk in freshSet) {
              setItemId(listName, fk, freshSet[fk].itemId);
            }
            writeFavorite(favorite);
            if (!getList(listName)) setList(listName, listId);
            save(get());
            callback();
          }, function () {
            writeFavorite(favorite);
            if (!getList(listName)) setList(listName, listId);
            save(get());
            callback();
          });
        });
      }, function () {
        callback();
      });
    }

    // Create a mapping: set mapping, remove orphaned [Lampa] mirror entry, merge pair
    function applyMapping(lampaKey, listId, listName, onDone, onFail) {
      console.log('ScrobSync', 'mapping apply', lampaKey);
      // Exclusivity check
      var success = setMapping(lampaKey, listId, listName);
      if (!success) {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_map_conflict'));
        return;
      }

      // Remove orphaned [Lampa] mirror entry for this key
      var defaultName = listNameForKey(lampaKey);
      if (defaultName) {
        var m = get();
        if (m.lists[defaultName]) {
          delete m.lists[defaultName];
          save(m);
        }
      }

      // Merge the mapped pair
      mergePair(lampaKey, listId, listName, function () {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_map_created'));
        if (onDone) onDone();
      });
    }

    // Remove mapping: delete mapping, remove mirror entry, reset default [Lampa] pair, reconcile
    function removeMappingFlow(lampaKey, onDone) {
      console.log('ScrobSync', 'mapping remove', lampaKey);
      var mapping = getMapping(lampaKey);
      if (!mapping) {
        if (onDone) onDone();
        return;
      }

      // Remove the mapping
      removeMapping(lampaKey);

      // Remove the mapped list's mirror entry
      var m = get();
      var mappedListName = mapping.list_name;
      if (mappedListName && m.lists[mappedListName]) {
        delete m.lists[mappedListName];
      }

      // Reset the default [Lampa] pair's mirror entry to trigger full reconcile
      var defaultName = listNameForKey(lampaKey);
      if (defaultName && m.lists[defaultName]) {
        // Clear items so reconcile does a full diff
        m.lists[defaultName].items = {};
      }
      save(m);

      // Re-resolve the default [Lampa] list and reconcile via the single update() path
      getLists(function (serverLists) {
        var byName = {};
        for (var i = 0; i < serverLists.length; i++) {
          byName[serverLists[i].name] = serverLists[i];
        }
        if (defaultName && byName[defaultName]) {
          setList(defaultName, byName[defaultName].id);
          update('mapping-remove');
        }
        if (onDone) onDone();
      }, function () {
        if (onDone) onDone();
      });
    }

    // ─── Public API ───────────────────────────────────────────

    // Start the sync engine
    function start() {
      if (running) return;
      if (!hasSession()) {
        console.warn('ScrobSync', 'start skipped: no session');
        return;
      }
      if (!Lampa.Storage.get('scrob_sync_enabled')) {
        console.warn('ScrobSync', 'start skipped: sync disabled');
        return;
      }

      // Check for blocking conflicts
      var conflicts = detectConflicts();
      for (var i = 0; i < conflicts.length; i++) {
        if (conflicts[i].type === 'cub_sync') {
          console.warn('ScrobSync', 'start skipped: CUB conflict');
          Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_blocked_cub'));
          return;
        }
      }
      running = true;

      // Outbound: Favorite add/remove + state:changed bridge (custom keys), guarded.
      if (Lampa.Favorite && Lampa.Favorite.listener) {
        if (!Lampa.Favorite.listener.has('add', onFavoriteAdd)) {
          Lampa.Favorite.listener.follow('add,added', onFavoriteAdd);
        }
        if (!Lampa.Favorite.listener.has('remove', onFavoriteRemove)) {
          Lampa.Favorite.listener.follow('remove', onFavoriteRemove);
        }
      }
      if (Lampa.Listener && !socketPollBound) {
        socketPollBound = true;
        Lampa.Listener.follow('state:changed', onStateChanged);
      }

      // Socket handlers register after start; polling stops once WS is live.
      bindSocketHandlers();
      if (isSocketActive()) stopPolling();else startPolling();
      setupProfileListener();
      startRetryLoop();

      // Initial sync if no mirror exists
      var m = get();
      if (Object.keys(m.lists).length === 0) {
        initialSync();
      } else if (isStale(getPollInterval())) {
        update('start-stale');
      }
      console.log('ScrobSync', 'started', {
        mirrorLists: Object.keys(get().lists).length
      });
    }

    // Stop the sync engine
    function stop() {
      running = false;
      console.log('ScrobSync', 'stopped');
      unbindSocketHandlers();
      activeSocket = null;
      if (Lampa.Favorite && Lampa.Favorite.listener) {
        Lampa.Favorite.listener.remove('add', onFavoriteAdd);
        Lampa.Favorite.listener.remove('added', onFavoriteAdd);
        Lampa.Favorite.listener.remove('remove', onFavoriteRemove);
      }
      if (Lampa.Listener && typeof Lampa.Listener.remove === 'function' && socketPollBound) {
        Lampa.Listener.remove('state:changed', onStateChanged);
        socketPollBound = null;
      }
      if (profileListener) {
        Lampa.Storage.listener.remove('change', profileListener);
        profileListener = null;
      }
      if (outboundTimer) {
        clearTimeout(outboundTimer);
        outboundTimer = null;
      }
      if (updateTimer) {
        clearTimeout(updateTimer);
        updateTimer = null;
      }
      updateRunning = false;
      pushRunning = false;
      pushQueue = [];
      stopPolling();
      stopRetryLoop();
    }

    // Force a manual sync (for settings UI "Sync Now" button)
    function forceSync() {
      if (!running) return;
      clearInitialDone();
      initialSync();
    }

    // Get sync status for display
    function getStatus() {
      var m = get();
      var listCount = Object.keys(m.lists).length;
      var itemCount = 0;
      var names = Object.keys(m.lists);
      for (var i = 0; i < names.length; i++) {
        itemCount += Object.keys(m.lists[names[i]].items).length;
      }
      return {
        running: running,
        listCount: listCount,
        itemCount: itemCount,
        lastSync: m.updated_at,
        conflicts: detectConflicts(),
        brokenMappings: brokenMappings.slice()
      };
    }

    // Scrob custom categories registry.
    // Device-local storage: scrob_custom_categories (no profile suffix).
    // Structure: [{ key: 'my_watchlist', title: 'My Watchlist' }]

    var STORAGE_KEY = 'scrob_custom_categories';

    // Parse stored array from storage
    function parse(raw) {
      if (!raw || raw === 'none') return [];
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(raw) ? raw : [];
    }

    // Get all custom categories
    function getAll() {
      return parse(Lampa.Storage.get(STORAGE_KEY, 'none'));
    }

    // Add a custom category (dedup by key)
    function add(key, title) {
      var list = getAll();
      for (var i = 0; i < list.length; i++) {
        if (list[i].key === key) return;
      }
      list.push({
        key: key,
        title: title
      });
      Lampa.Storage.set(STORAGE_KEY, list);
    }

    // Get a single custom category by key
    function getByKey(key) {
      var list = getAll();
      for (var i = 0; i < list.length; i++) {
        if (list[i].key === key) return list[i];
      }
      return null;
    }

    // Profile management: letter avatars and profile switching with per-profile data isolation.

    // Fixed palette for deterministic letter avatar colors.
    var COLORS = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#009688', '#4caf50', '#ff9800'];

    // Deterministic color from username hash (pattern: GramLink sdk/avatars.js avatarColor).
    function avatarColor(name) {
      if (!name) return COLORS[0];
      var hash = 0;
      for (var i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return COLORS[Math.abs(hash) % COLORS.length];
    }

    // Avatar HTML: server image when avatar_url is set, uppercase first letter otherwise.
    // Image URL needs ?api_key= because <img> cannot send headers.
    function avatarHtml(user) {
      var server = serverUrl();
      var ownKey = Lampa.Storage.get(KEYS.OWN_API_KEY) || '';
      if (user && user.avatar_url && server) {
        var sep = user.avatar_url.indexOf('?') >= 0 ? '&' : '?';
        return '<img class="scrob-avatar" src="' + server + '/api/proxy' + user.avatar_url + sep + 'api_key=' + encodeURIComponent(ownKey) + '">';
      }
      var name = user && user.username || '?';
      var letter = name.charAt(0).toUpperCase();
      return '<div class="scrob-avatar scrob-avatar--letter" style="background:' + avatarColor(name) + '">' + letter + '</div>';
    }

    // Soft refresh of the active page (pattern: docs/gramsync/profile_levende.js softRefresh).
    function softRefresh() {
      var activity = Lampa.Activity.active();
      if (activity.page) activity.page = 1;
      Lampa.Activity.replace(activity);
      activity.outdated = false;
    }

    // Switch active profile:
    // 1. backup isolated keys of the current profile
    // 2. restore target profile data or defaults
    // 3. activate target credentials
    // 4. re-read timeline/favorite into UI
    // 5. soft refresh the active page
    function switchProfile(targetId) {
      var currentId = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID);
      var list = getProfiles();
      var target = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id == targetId) target = list[i];
      }
      if (!target || target.id == currentId) return false;

      // 1. Backup isolated keys of the current profile
      if (currentId) {
        ISOLATED_KEYS.forEach(function (key) {
          var value = Lampa.Storage.get(key, 'none');
          if (value != 'none') Lampa.Storage.set(backupKey(currentId, key), value);
        });
      }

      // 2. Restore target profile data or defaults
      ISOLATED_KEYS.forEach(function (key) {
        var saved = Lampa.Storage.get(backupKey(target.id, key), 'none');
        Lampa.Storage.set(key, saved != 'none' ? saved : defaultValue(key));
      });

      // 3. Activate target credentials
      Lampa.Storage.set(KEYS.ACTIVE_PROFILE_ID, target.id);
      Lampa.Storage.set(KEYS.ACTIVE_API_KEY, target.api_key);

      // 4. Re-read data into UI
      Lampa.Timeline.read();
      Lampa.Favorite.read();

      // 5. Soft refresh of the active page
      softRefresh();
      return true;
    }

    /**
     * Scrob custom category viewer component.
     * Pattern: kinobaza/myperson/component.js — Lampa.Maker.make('Category')
     * Reads items from Lampa 'favorite' storage by custom_key.
     */

    function component(object) {
      var comp = Lampa.Maker.make('Category', object);
      comp.use({
        onCreate: function onCreate() {
          // Read custom category items from favorite storage
          var favorite = Lampa.Storage.get('favorite', '{}');
          if (typeof favorite === 'string') {
            try {
              favorite = JSON.parse(favorite);
            } catch (e) {
              favorite = {};
            }
          }
          var ids = Array.isArray(favorite[object.custom_key]) ? favorite[object.custom_key] : [];
          var cards = Array.isArray(favorite.card) ? favorite.card : [];
          var results = [];
          for (var i = 0; i < ids.length; i++) {
            for (var j = 0; j < cards.length; j++) {
              if (cards[j].id == ids[i]) {
                results.push(cards[j]);
                break;
              }
            }
          }
          var json = {
            results: results,
            total_pages: 1,
            page: 1
          };
          if (results.length === 0) {
            this.empty();
          } else {
            this.build(json);
          }
        },
        onInstance: function onInstance(card, element) {
          card.use({
            onlyEnter: function onlyEnter() {
              Lampa.Activity.push({
                url: '',
                title: element.title || element.name,
                component: 'full',
                card: element,
                page: 1
              });
            },
            onLong: function onLong() {
              // Long press: remove from this category
              var enabledCtrl = Lampa.Controller.enabled().name;
              Lampa.Select.show({
                title: Lampa.Lang.translate('scrob_cat_remove_confirm'),
                items: [{
                  title: Lampa.Lang.translate('scrob_cat_remove'),
                  _remove: true
                }, {
                  title: Lampa.Lang.translate('cancel'),
                  cancel: true
                }],
                onSelect: function onSelect(item) {
                  if (!item._remove) {
                    Lampa.Controller.toggle(enabledCtrl);
                    return;
                  }
                  Lampa.Favorite.remove(object.custom_key, element);
                  Lampa.Noty.show(Lampa.Lang.translate('scrob_cat_removed'));
                  Lampa.Activity.replace(object);
                },
                onBack: function onBack() {
                  Lampa.Controller.toggle(enabledCtrl);
                }
              });
            }
          });
        }
      });
      return comp;
    }

    // Scrob — Lampa plugin: login to a self-hosted Scrob server,
    // switch between server users as profiles, isolate watch data per profile.

    // Settings section icon (gradient ids prefixed scrob- to avoid conflicts)
    var ICON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 419 454\"><defs><linearGradient id=\"scrobRingGrad\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"454\"><stop offset=\"0%\" stop-color=\"#5B34D6\"/><stop offset=\"50%\" stop-color=\"#9E3BC1\"/><stop offset=\"100%\" stop-color=\"#C147D8\"/></linearGradient><linearGradient id=\"scrobDotGrad\" gradientUnits=\"objectBoundingBox\" x1=\"0\" y1=\"1\" x2=\"0\" y2=\"0\"><stop offset=\"0%\" stop-color=\"#5B34D6\"/><stop offset=\"100%\" stop-color=\"#C147D8\"/></linearGradient></defs><path d=\"M 394.09 73.88 A 226.5 226.5 0 1 0 332.74 427.26 L 287.64 358.22 A 144.6 144.6 0 1 1 334.56 130.14 Z\" fill=\"url(#scrobRingGrad)\"/><circle cx=\"368.97\" cy=\"347.2\" r=\"48.29\" fill=\"url(#scrobDotGrad)\"/></svg>";
    var settingsListener = null;

    // ─── Header profile button ────────────────────────────────

    function removeHeaderButton() {
      $('.open--scrob-profile').remove();
    }

    // Render avatar button after open--settings (pattern: siaivo birthday.js)
    function renderHeaderButton() {
      removeHeaderButton();
      var btn = $('<div class="head__action selector open--scrob-profile"></div>');
      btn.append(avatarHtml(activeProfile()));
      btn.on('hover:enter', showProfileSelect);
      $('.head .head__actions .open--settings').after(btn);
    }

    // Profile picker (pattern: siaivo/src/core/account/profile.js select())
    function showProfileSelect() {
      var profiles = getProfiles();
      if (!profiles.length) {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_profiles_empty'));
        return;
      }
      var activeId = Lampa.Storage.get(KEYS.ACTIVE_PROFILE_ID);
      var items = profiles.map(function (u) {
        return {
          title: u.username,
          subtitle: u.email || '',
          template: 'selectbox_icon',
          icon: avatarHtml(u),
          selected: u.id == activeId,
          id: u.id
        };
      });
      Lampa.Select.show({
        title: Lampa.Lang.translate('scrob_profiles'),
        items: items,
        onSelect: function onSelect(a) {
          if (switchProfile(a.id)) renderHeaderButton();
        }
      });
    }

    // ─── Login / logout ───────────────────────────────────────

    function refreshSettings() {
      if (typeof Lampa.Settings !== 'undefined' && typeof Lampa.Settings.update === 'function') {
        Lampa.Settings.update();
      }
    }

    // Save session, load profile list, draw header button
    function completeLogin(token, me, username, password) {
      Lampa.Storage.set(KEYS.ACCESS_TOKEN, token);
      Lampa.Storage.set(KEYS.ME, me);
      Lampa.Storage.set(KEYS.OWN_API_KEY, me.api_key || '');
      Lampa.Storage.set(KEYS.ACTIVE_PROFILE_ID, me.id);
      Lampa.Storage.set(KEYS.ACTIVE_API_KEY, me.api_key || '');
      // Store credentials for socket re-authentication
      if (username) Lampa.Storage.set(KEYS.USERNAME, username);
      if (password) Lampa.Storage.set(KEYS.PASSWORD, password);
      var finish = function finish(profiles) {
        Lampa.Storage.set(KEYS.PROFILES, profiles);
        renderHeaderButton();
        refreshCustomMenu();
        refreshSettings();
        Lampa.Noty.show(Lampa.Lang.translate('scrob_auth_success'));

        // Start sync if enabled (lifecycle wiring)
        if (Lampa.Storage.get(KEYS.SYNC_ENABLED)) start();
      };
      if (me.is_admin) {
        // Admin gets all server users as profiles; on failure fall back to own profile only
        adminUsers(token, finish, function () {
          finish([me]);
        });
      } else {
        finish([me]);
      }
    }
    function doLogin() {
      var username = Lampa.Storage.field(KEYS.USERNAME) || '';
      var password = Lampa.Storage.field(KEYS.PASSWORD) || '';
      if (!serverUrl() || !username || !password) {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_fill_fields'));
        return;
      }
      login(username, password, function (token) {
        if (token.requires_2fa) {
          Lampa.Noty.show(Lampa.Lang.translate('scrob_2fa_not_supported'));
          return;
        }
        me(token.access_token, function (me) {
          completeLogin(token.access_token, me, username, password);
        }, function () {
          Lampa.Noty.show(Lampa.Lang.translate('scrob_me_error'));
        });
      }, function () {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_auth_error'));
      });
    }
    function doLogout() {
      // Stop sync before clearing session (lifecycle wiring)
      stop();
      clearSession();
      removeHeaderButton();
      refreshSettings();
      Lampa.Noty.show(Lampa.Lang.translate('scrob_logout_success'));
    }

    // ─── Settings section ─────────────────────────────────────

    // Mark categories — mutually exclusive statuses
    var MARK_CATS = ['scheduled', 'continued', 'thrown', 'look', 'viewed'];

    // Lampa favorite category translation keys (from core)
    var CAT_LABELS = {
      book: 'title_book',
      like: 'title_like',
      wath: 'title_wath',
      scheduled: 'title_scheduled',
      continued: 'title_continued',
      thrown: 'title_thrown',
      look: 'title_look',
      viewed: 'title_viewed'
    };
    function catLabel(key) {
      var translationKey = CAT_LABELS[key];
      if (translationKey) return Lampa.Lang.translate(translationKey);
      // Custom key: capitalize
      return key.charAt(0).toUpperCase() + key.slice(1);
    }

    // Sanitize category name into a storage key
    function sanitizeCategoryKey(name) {
      var key = String(name || '').trim().toLowerCase().replace(/[^\wа-яіїєґё]+/gi, '_') // letters/digits/underscore only
      .replace(/_{2,}/g, '_').replace(/^_+|_+$/g, '').slice(0, 32);
      return key;
    }

    // Menu icon SVG for custom categories (folder/list icon, stroke currentColor)
    var MENU_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';

    // ─── Mapping flow ─────────────────────────────────────────

    function showMappingFlow() {
      if (!hasSession()) {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_fill_fields'));
        return;
      }

      // Fetch all lists from server
      getLists(function (serverLists) {
        // Filter: exclude [Lampa] lists and already-mapped lists
        var mappedIds = getMappedIds();
        var available = [];
        for (var i = 0; i < serverLists.length; i++) {
          var sl = serverLists[i];
          if (!sl.name) continue;
          if (sl.name.indexOf('[Lampa] ') === 0) continue;
          if (mappedIds.indexOf(sl.id) !== -1) continue;
          available.push(sl);
        }
        if (available.length === 0) {
          Lampa.Noty.show(Lampa.Lang.translate('scrob_map_none'));
          return;
        }

        // Select #1: choose Scrob list
        var listItems = available.map(function (sl) {
          return {
            title: sl.name,
            subtitle: (sl.item_count || 0) + ' items',
            id: sl.id,
            list_name: sl.name
          };
        });
        Lampa.Select.show({
          title: Lampa.Lang.translate('scrob_map_select_list'),
          items: listItems,
          onSelect: function onSelect(selectedList) {
            showCategorySelect(selectedList);
          }
        });
      }, function () {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_lists_error'));
      });
    }
    function showCategorySelect(selectedList) {
      // Build category list: standard keys + custom keys from favorite
      var favorite = Lampa.Storage.get('favorite', '{}');
      if (typeof favorite === 'string') {
        try {
          favorite = JSON.parse(favorite);
        } catch (e) {
          favorite = {};
        }
      }
      var standardKeys = ['book', 'like', 'wath', 'scheduled', 'continued', 'thrown', 'look'];
      var existingMap = getMap();
      var catItems = [];

      // First item: create own category
      catItems.push({
        title: Lampa.Lang.translate('scrob_map_create_own'),
        icon: MENU_ICON_SVG,
        _create_own: true
      });

      // Standard categories
      for (var i = 0; i < standardKeys.length; i++) {
        var key = standardKeys[i];
        var label = catLabel(key);
        var mapping = existingMap[key];
        if (mapping) {
          label += ' (' + Lampa.Lang.translate('scrob_map_replace') + ': ' + mapping.list_name + ')';
        }
        catItems.push({
          title: label,
          id: key,
          _isMark: MARK_CATS.indexOf(key) !== -1
        });
      }

      // Custom keys from favorite (not standard, not excluded)
      var excluded = {
        card: true,
        history: true,
        viewed: true
      };
      for (var k in favorite) {
        if (excluded[k] || standardKeys.indexOf(k) !== -1 || !Array.isArray(favorite[k])) continue;
        var customLabel = k.charAt(0).toUpperCase() + k.slice(1);
        var customMapping = existingMap[k];
        if (customMapping) {
          customLabel += ' (' + Lampa.Lang.translate('scrob_map_replace') + ': ' + customMapping.list_name + ')';
        }
        catItems.push({
          title: customLabel,
          id: k,
          _isMark: false
        });
      }
      Lampa.Select.show({
        title: Lampa.Lang.translate('scrob_map_select_cat'),
        items: catItems,
        onSelect: function onSelect(selectedCat) {
          if (selectedCat._create_own) {
            showCreateOwnInput(selectedList);
          } else {
            showConfirmMapping(selectedList, selectedCat);
          }
        }
      });
    }

    // Reserved keys that cannot be used as custom category names
    var RESERVED_KEYS = ['card', 'history', 'viewed', 'persons', 'like', 'wath', 'book', 'look', 'scheduled', 'continued', 'thrown'];

    // Input flow for creating a custom category
    function showCreateOwnInput(selectedList) {
      Lampa.Input.edit({
        title: Lampa.Lang.translate('scrob_map_own_name'),
        value: selectedList.list_name || '',
        free: true,
        nosave: true,
        align: 'center'
      }, function (value) {
        var name = String(value || '').trim();
        var key = sanitizeCategoryKey(name);
        if (!key) {
          Lampa.Noty.show(Lampa.Lang.translate('scrob_map_own_exists'));
          showCreateOwnInput(selectedList);
          return;
        }

        // Check reserved keys
        if (RESERVED_KEYS.indexOf(key) !== -1) {
          Lampa.Noty.show(Lampa.Lang.translate('scrob_map_own_exists'));
          showCreateOwnInput(selectedList);
          return;
        }

        // Check custom registry
        if (getByKey(key)) {
          Lampa.Noty.show(Lampa.Lang.translate('scrob_map_own_exists'));
          showCreateOwnInput(selectedList);
          return;
        }

        // Check existing favorite keys
        var favorite = Lampa.Storage.get('favorite', '{}');
        if (typeof favorite === 'string') {
          try {
            favorite = JSON.parse(favorite);
          } catch (e) {
            favorite = {};
          }
        }
        if (favorite[key] && Array.isArray(favorite[key])) {
          Lampa.Noty.show(Lampa.Lang.translate('scrob_map_own_exists'));
          showCreateOwnInput(selectedList);
          return;
        }

        // Create category in favorite storage
        favorite[key] = [];
        Lampa.Storage.set('favorite', favorite);

        // Register custom category
        add(key, name);

        // Apply mapping: pull items from Scrob list into new category
        applyMapping(key, selectedList.id, selectedList.list_name, function () {
          Lampa.Noty.show(Lampa.Lang.translate('scrob_map_own_created'));
          refreshCustomMenu();
          refreshSettings();
        });
      });
    }
    function showConfirmMapping(selectedList, selectedCat) {
      var html = $('<div>' + '<div style="padding:1em; line-height:1.6">' + '"' + selectedList.list_name + '" ' + Lampa.Lang.translate('scrob_map_confirm') + ' "' + catLabel(selectedCat.id) + '"<br>' + '<span style="opacity:0.6">' + Lampa.Lang.translate('scrob_map_once') + '</span>' + (selectedCat._isMark ? '<br><span style="color:#e8a838">' + Lampa.Lang.translate('scrob_map_marks_warn') + '</span>' : '') + '</div></div>');
      Lampa.Modal.open({
        title: Lampa.Lang.translate('scrob_map_title'),
        html: html,
        size: 'medium',
        buttons: [{
          name: Lampa.Lang.translate('scrob_map_cancel'),
          onSelect: function onSelect() {
            Lampa.Modal.close();
          }
        }, {
          name: Lampa.Lang.translate('scrob_map_apply'),
          onSelect: function onSelect() {
            Lampa.Modal.close();
            applyMapping(selectedCat.id, selectedList.id, selectedList.list_name, function () {
              // Success: refresh settings to update active mappings button
              refreshSettings();
            });
          }
        }]
      });
    }

    // ─── Active mappings management ───────────────────────────

    function showActiveMappings() {
      var map = getMap();
      var keys = Object.keys(map);
      if (keys.length === 0) {
        Lampa.Noty.show(Lampa.Lang.translate('scrob_map_none'));
        return;
      }
      var items = keys.map(function (key) {
        return {
          title: catLabel(key) + ' → ' + map[key].list_name,
          _lampaKey: key,
          _listId: map[key].list_id,
          _listName: map[key].list_name
        };
      });
      Lampa.Select.show({
        title: Lampa.Lang.translate('scrob_map_active'),
        items: items,
        onSelect: function onSelect(selected) {
          showMappingActions(selected);
        }
      });
    }
    function showMappingActions(mappingEntry) {
      Lampa.Select.show({
        title: mappingEntry.title,
        items: [{
          title: Lampa.Lang.translate('scrob_map_unlink'),
          _action: 'unlink'
        }, {
          title: Lampa.Lang.translate('scrob_map_cancel'),
          _action: 'cancel'
        }],
        onSelect: function onSelect(item) {
          if (item._action === 'unlink') {
            removeMappingFlow(mappingEntry._lampaKey, function () {
              Lampa.Noty.show(Lampa.Lang.translate('scrob_map_unlinked'));
              refreshSettings();
            });
          }
          // 'cancel' — just close, Select auto-closes
        }
      });
    }

    // ─── Dynamic custom category menu items ───────────────────

    function refreshCustomMenu() {
      // Remove previous custom menu items
      $('.menu .menu__list .scrob-custom-menu-item').remove();
      var categories = getAll();
      if (!categories.length) return;
      for (var i = 0; i < categories.length; i++) {
        var cat = categories[i];
        var button = $('<li class="menu__item selector scrob-custom-menu-item" data-key="' + cat.key + '">' + '<div class="menu__ico">' + MENU_ICON_SVG + '</div>' + '<div class="menu__text">' + cat.title + '</div>' + '</li>');
        button.on('hover:enter', function (c) {
          return function () {
            Lampa.Activity.push({
              url: '',
              title: c.title,
              component: 'scrob_category',
              custom_key: c.key,
              page: 1
            });
          };
        }(cat));
        $('.menu .menu__list').eq(0).append(button);
      }
    }

    // ─── Bookmarks ContentRows for custom categories ─────────

    function registerBookmarksRows() {
      try {
        Lampa.ContentRows.add({
          name: 'scrob_custom_categories',
          title: Lampa.Lang.translate('scrob_title'),
          index: 90,
          screen: ['bookmarks'],
          call: function call(params, screen) {
            var categories = getAll();
            if (!categories || !categories.length) return;
            var favorite = Lampa.Storage.get('favorite', '{}');
            if (typeof favorite === 'string') {
              try {
                favorite = JSON.parse(favorite);
              } catch (e) {
                favorite = {};
              }
            }
            var cards = Array.isArray(favorite.card) ? favorite.card : [];
            var lines = [];
            for (var i = 0; i < categories.length; i++) {
              var cat = categories[i];
              var ids = Array.isArray(favorite[cat.key]) ? favorite[cat.key] : [];
              var results = [];
              for (var j = 0; j < ids.length; j++) {
                for (var k = 0; k < cards.length; k++) {
                  if (cards[k].id == ids[j]) {
                    var clone = Object.assign({}, cards[k]);
                    clone.params = {
                      emit: {
                        onEnter: function (c) {
                          return function () {
                            Lampa.Activity.push({
                              url: '',
                              title: c.title || c.name,
                              component: 'full',
                              card: c,
                              page: 1
                            });
                          };
                        }(clone),
                        onFocus: function (c) {
                          return function () {
                            Lampa.Background.change(Lampa.Utils.cardImgBackground(c));
                          };
                        }(clone)
                      }
                    };
                    results.push(clone);
                    break;
                  }
                }
              }
              if (results.length === 0) continue;
              lines.push({
                title: cat.title,
                results: results,
                total_pages: 1,
                page: 1,
                params: {
                  module: Lampa.Maker.module('Line').toggle(Lampa.Maker.module('Line').MASK.base, 'Event')
                }
              });
            }
            return lines;
          }
        });
      } catch (e) {
        console.error('Scrob', 'registerBookmarksRows error', e);
      }
    }

    // ─── Direct-storage toggle for custom categories ───
    // Core Favorite.toggle() routes through cloud()/check() which only knows
    // the hardcoded category whitelist, so custom keys never register as present.
    // This helper manages storage directly and emits the same UI event.

    function toggleCustomCategory(key, card) {
      var favorite = Lampa.Storage.get('favorite', '{}');
      if (typeof favorite === 'string') {
        try {
          favorite = JSON.parse(favorite);
        } catch (e) {
          favorite = {};
        }
      }
      var ids = Array.isArray(favorite[key]) ? favorite[key] : [];
      var idx = ids.indexOf(card.id);
      var method;
      if (idx === -1) {
        // Add: insert id at top and ensure card exists in the shared pool
        ids.unshift(card.id);
        favorite[key] = ids;
        var pool = Array.isArray(favorite.card) ? favorite.card : [];
        var exists = false;
        for (var i = 0; i < pool.length; i++) {
          if (pool[i].id == card.id) {
            exists = true;
            break;
          }
        }
        if (!exists && Lampa.Utils.clearCard && Lampa.Arrays.clone) {
          pool.unshift(Lampa.Utils.clearCard(Lampa.Arrays.clone(card)));
          favorite.card = pool;
        }
        method = 'add';
      } else {
        // Remove: splice the id out. KEEP the card in favorite.card —
        // core Favorite.remove() prunes the pool via the whitelist-only check()
        // and would destroy cards that live only in custom categories.
        ids.splice(idx, 1);
        favorite[key] = ids;
        method = 'remove';
      }
      Lampa.Storage.set('favorite', favorite);

      // Notify the UI layer (same event shape the core emits)
      Lampa.Listener.send('state:changed', {
        target: 'favorite',
        reason: 'update',
        method: method,
        type: key,
        card: card
      });
    }

    // ─── Card menu patch for custom categories (v3 Card Module) ───
    // Wraps CardModule.Menu.onCreate to inject custom favorite categories
    // into the long-press card action bar (same pattern as kinobaza/custom-favs.js).

    function patchCardMenu() {
      try {
        var cardModule = Lampa.Maker.map('Card');
        if (!cardModule || !cardModule.Menu || !cardModule.Menu.onCreate) return;
        var categories = getAll();
        if (!categories || !categories.length) return;
        var onMenuCreate = cardModule.Menu.onCreate;
        cardModule.Menu.onCreate = function () {
          var self = this;

          // Find the Favorites entry in menu_list by title
          var favoriteMenuList = this.menu_list.filter(function (menu) {
            return menu.title === Lampa.Lang.translate('settings_input_links');
          })[0];
          if (!favoriteMenuList) {
            onMenuCreate.apply(this, arguments);
            return;
          }
          var originalMenu = favoriteMenuList.menu;
          favoriteMenuList.menu = function () {
            // Build custom category checkbox items
            var newItems = categories.map(function (cat) {
              var favorite = Lampa.Storage.get('favorite', '{}');
              if (typeof favorite === 'string') {
                try {
                  favorite = JSON.parse(favorite);
                } catch (e) {
                  favorite = {};
                }
              }
              var ids = Array.isArray(favorite[cat.key]) ? favorite[cat.key] : [];
              var isChecked = ids.indexOf(self.data.id) !== -1;
              return {
                checkbox: true,
                checked: isChecked ? self.data.id : undefined,
                title: cat.title,
                onCheck: function onCheck(item, elem) {
                  toggleCustomCategory(cat.key, self.data);

                  // Recompute checked state after toggle
                  var fresh = Lampa.Storage.get('favorite', '{}');
                  if (typeof fresh === 'string') {
                    try {
                      fresh = JSON.parse(fresh);
                    } catch (e) {
                      fresh = {};
                    }
                  }
                  var member = Array.isArray(fresh[cat.key]) && fresh[cat.key].indexOf(self.data.id) !== -1;
                  elem.toggleClass('selectbox-item--checked', member);
                }
              };
            });
            var oldMenuItems = originalMenu.apply(favoriteMenuList);
            if (newItems.length) {
              var scrobSeparator = {
                title: Lampa.Lang.translate('scrob_title'),
                separator: true
              };
              // Find the Status separator to insert Scrob section before it
              var statusIdx = -1;
              for (var s = 0; s < oldMenuItems.length; s++) {
                if (oldMenuItems[s] && oldMenuItems[s].separator && oldMenuItems[s].title === Lampa.Lang.translate('settings_cub_status')) {
                  statusIdx = s;
                  break;
                }
              }
              if (statusIdx > -1) {
                var before = oldMenuItems.slice(0, statusIdx);
                var after = oldMenuItems.slice(statusIdx);
                return before.concat(scrobSeparator, newItems, after);
              }
              return oldMenuItems.concat(scrobSeparator, newItems);
            }
            return oldMenuItems;
          };
          onMenuCreate.apply(this, arguments);
        };
      } catch (e) {
        console.error('Scrob', 'patchCardMenu error', e);
      }
    }

    // ─── Full card bookmark button patch for custom categories ──
    // Intercepts the .button--book click on the full card detail page
    // and injects custom category items into the Select popup.
    // This covers path #2 (separate from CardModule.Menu used by line cards).

    function patchFullCardBookmark() {
      try {
        var attachToButton = function attachToButton() {
          if (customAttached) return;
          var btn = document.querySelector('.button--book');
          if (!btn) return;
          var act = Lampa.Activity.active();
          if (!act || act.component !== 'full' || !act.card) return;
          customAttached = true;
          var cardData = act.card;
          if (!cardData || !cardData.id) return;
          $(btn).on('hover:enter.scrob_bookmark', function () {
            setTimeout(function () {
              var $box = $('body > .selectbox');
              if (!$box.length) return;
              var categories = getAll();
              if (!categories || !categories.length) return;
              if ($box.find('.scrob-select-item').length) return;
              var favorite = Lampa.Storage.get('favorite', '{}');
              if (typeof favorite === 'string') {
                try {
                  favorite = JSON.parse(favorite);
                } catch (e) {
                  favorite = {};
                }
              }

              // Find Status separator — could be .settings-param-title or .selectbox-item with that text
              var $insertBefore = $box.find('.settings-param-title').filter(function () {
                return $(this).find('span').text() === Lampa.Lang.translate('settings_cub_status');
              }).first();
              if (!$insertBefore.length) {
                $insertBefore = $box.find('.selectbox-item__title').filter(function () {
                  return $(this).text() === Lampa.Lang.translate('settings_cub_status');
                }).first().closest('.selectbox-item');
              }

              // Build Scrob separator
              if (categories.length) {
                var $separator = $('<div class="settings-param-title"><span>' + Lampa.Lang.translate('scrob_title') + '</span></div>');
                if ($insertBefore.length) $separator.insertBefore($insertBefore);else $separator.appendTo($box.find('.scroll__body'));
              }
              for (var i = 0; i < categories.length; i++) {
                var cat = categories[i];
                var $item = $('<div class="selectbox-item selector scrob-select-item">' + '<div class="selectbox-item__title"></div>' + '<div class="selectbox-item__checkbox"></div>' + '</div>');
                $item.find('.selectbox-item__title').text(cat.title);
                var ids = favorite[cat.key];
                if (Array.isArray(ids) && ids.indexOf(cardData.id) !== -1) {
                  $item.addClass('selectbox-item--checked');
                }
                if ($insertBefore.length) $item.insertBefore($insertBefore);else $item.appendTo($box.find('.scroll__body'));
                $item.on('hover:enter', function (catKey) {
                  return function () {
                    toggleCustomCategory(catKey, cardData);
                    var fresh = Lampa.Storage.get('favorite', '{}');
                    if (typeof fresh === 'string') {
                      try {
                        fresh = JSON.parse(fresh);
                      } catch (e) {
                        fresh = {};
                      }
                    }
                    var member = Array.isArray(fresh[catKey]) && fresh[catKey].indexOf(cardData.id) !== -1;
                    $(this).toggleClass('selectbox-item--checked', member);
                  };
                }(cat.key));
              }
              Lampa.Controller.collectionSet($box.find('.scroll__body'));
              setTimeout(function () {
                var $items = $box.find('.selector');
                if ($items.length) {
                  Lampa.Controller.focus($items.get(0));
                  Navigator.focus($items.get(0));
                }
              }, 10);
            }, 200);
          });
        };
        var customAttached = false;
        Lampa.Listener.follow('activity', function () {
          customAttached = false;
          attachToButton();
          setTimeout(attachToButton, 300);
          setTimeout(attachToButton, 600);
        });
      } catch (e) {
        console.error('Scrob', 'patchFullCardBookmark error', e);
      }
    }

    // ─── Settings section ─────────────────────────────────────

    function initSettings() {
      Lampa.SettingsApi.addComponent({
        component: 'scrob',
        icon: ICON_SVG,
        name: Lampa.Lang.translate('scrob_title'),
        before: 'interface'
      });

      // Server address
      Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: {
          name: KEYS.SERVER_URL,
          type: 'input',
          default: '',
          values: '',
          placeholder: 'https://scrob.example.com'
        },
        field: {
          name: Lampa.Lang.translate('scrob_server_url')
        }
      });

      // Username
      Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: {
          name: KEYS.USERNAME,
          type: 'input',
          default: '',
          values: '',
          placeholder: ''
        },
        field: {
          name: Lampa.Lang.translate('scrob_username')
        }
      });

      // Password
      Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: {
          name: KEYS.PASSWORD,
          type: 'input',
          default: '',
          values: '',
          placeholder: ''
        },
        field: {
          name: Lampa.Lang.translate('scrob_password')
        }
      });

      // Own API key (optional alternative to login for scrobbling)
      Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: {
          name: KEYS.OWN_API_KEY,
          type: 'input',
          default: '',
          values: '',
          placeholder: ''
        },
        field: {
          name: Lampa.Lang.translate('scrob_api_key')
        }
      });

      // Login button
      Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: {
          name: 'scrob_login_btn',
          type: 'button'
        },
        field: {
          name: Lampa.Lang.translate('scrob_login')
        },
        onChange: doLogin
      });

      // Current user static line
      Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: {
          name: 'scrob_user_info',
          type: 'static'
        },
        field: {
          name: ''
        },
        onRender: function onRender(item) {
          item.attr('data-name', 'scrob_user_info');
          var me = getMe();
          if (me.username) {
            item.find('.settings-param__name').text(me.username + (me.email ? ' (' + me.email + ')' : ''));
          }
        }
      });

      // Logout button
      Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: {
          name: 'scrob_logout_btn',
          type: 'button'
        },
        field: {
          name: Lampa.Lang.translate('scrob_logout')
        },
        onChange: doLogout
      });

      // ── Sync nested page button (after logout block) ─────
      Lampa.SettingsApi.addParam({
        component: 'scrob',
        param: {
          name: 'scrob_open_sync',
          type: 'button'
        },
        field: {
          name: Lampa.Lang.translate('scrob_sync_title')
        },
        onChange: function onChange() {
          Lampa.Settings.create('scrob_sync_page', {
            onBack: function onBack() {
              Lampa.Settings.create('scrob');
            }
          });
        }
      });

      // ══════════════════════════════════════════════════════
      //  NESTED PAGE: Sync settings
      // ══════════════════════════════════════════════════════

      // Toggle sync on/off
      Lampa.SettingsApi.addParam({
        component: 'scrob_sync_page',
        param: {
          name: KEYS.SYNC_ENABLED,
          type: 'trigger',
          default: false
        },
        field: {
          name: Lampa.Lang.translate('scrob_sync_enabled')
        },
        onChange: function onChange(value) {
          Lampa.Storage.set(KEYS.SYNC_ENABLED, value);
          if (value) {
            // Check for blocking conflicts before starting
            var conflicts = detectConflicts();
            var blocked = false;
            for (var i = 0; i < conflicts.length; i++) {
              if (conflicts[i].type === 'cub_sync') {
                Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_blocked_cub'));
                Lampa.Storage.set(KEYS.SYNC_ENABLED, false);
                blocked = true;
                break;
              }
            }
            if (!blocked) {
              start();
              Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_started'));
            }
          } else {
            stop();
            Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_stopped'));
          }
        }
      });

      // Poll interval select
      Lampa.SettingsApi.addParam({
        component: 'scrob_sync_page',
        param: {
          name: KEYS.SYNC_INTERVAL,
          type: 'select',
          values: {
            15: '15',
            30: '30',
            60: '60',
            120: '120'
          },
          default: '30'
        },
        field: {
          name: Lampa.Lang.translate('scrob_sync_interval'),
          description: Lampa.Lang.translate('scrob_sync_interval_descr')
        },
        onChange: function onChange(value) {
          Lampa.Storage.set(KEYS.SYNC_INTERVAL, value);
        }
      });

      // Manual sync button
      Lampa.SettingsApi.addParam({
        component: 'scrob_sync_page',
        param: {
          name: 'scrob_sync_force_btn',
          type: 'button'
        },
        field: {
          name: Lampa.Lang.translate('scrob_sync_now')
        },
        onChange: function onChange() {
          if (!Lampa.Storage.get(KEYS.SYNC_ENABLED)) {
            Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_stopped'));
            return;
          }
          forceSync();
          Lampa.Noty.show(Lampa.Lang.translate('scrob_sync_now') + '…');
        }
      });

      // ── List mapping button ─────────────────────────────
      Lampa.SettingsApi.addParam({
        component: 'scrob_sync_page',
        param: {
          name: 'scrob_map_btn',
          type: 'button'
        },
        field: {
          name: Lampa.Lang.translate('scrob_map_title')
        },
        onChange: showMappingFlow
      });

      // Active mappings button (shown/hidden via settingsListener)
      Lampa.SettingsApi.addParam({
        component: 'scrob_sync_page',
        param: {
          name: 'scrob_map_active_btn',
          type: 'button'
        },
        field: {
          name: Lampa.Lang.translate('scrob_map_active')
        },
        onChange: showActiveMappings
      });

      // Status line (static, updated on render)
      Lampa.SettingsApi.addParam({
        component: 'scrob_sync_page',
        param: {
          name: 'scrob_sync_status',
          type: 'static'
        },
        field: {
          name: ''
        },
        onRender: function onRender(item) {
          item.attr('data-name', 'scrob_sync_status');
          var status = getStatus();
          var nameEl = item.find('.settings-param__name');
          if (!status.running) {
            nameEl.text(Lampa.Lang.translate('scrob_sync_stopped'));
            return;
          }

          // Format last sync time
          var timeText = '—';
          if (status.lastSync) {
            var d = new Date(status.lastSync);
            var hh = ('0' + d.getHours()).slice(-2);
            var mm = ('0' + d.getMinutes()).slice(-2);
            timeText = hh + ':' + mm;
          }
          var text = Lampa.Lang.translate('scrob_sync_status_last') + ': ' + timeText + ' • ' + status.listCount + ' ' + Lampa.Lang.translate('scrob_sync_title').toLowerCase() + ' / ' + status.itemCount;

          // Append conflict warnings
          if (status.conflicts && status.conflicts.length > 0) {
            for (var i = 0; i < status.conflicts.length; i++) {
              var c = status.conflicts[i];
              if (c.type === 'cub_sync') {
                text += '\n' + Lampa.Lang.translate('scrob_sync_blocked_cub');
              } else if (c.type === 'gramsync') {
                text += '\n' + Lampa.Lang.translate('scrob_sync_conflict_gramsync');
              }
            }
          }

          // Append broken mapping warnings
          if (status.brokenMappings && status.brokenMappings.length > 0) {
            for (var b = 0; b < status.brokenMappings.length; b++) {
              text += '\n' + Lampa.Lang.translate('scrob_map_broken').replace('%s', status.brokenMappings[b]);
            }
          }
          nameEl.text(text);
        }
      });

      // Show/hide rows depending on authorization state (pattern: kinobaza settings.js)
      settingsListener = function settingsListener(e) {
        if (e.name === 'scrob') {
          var body = e.body.find('.scroll__body > div');
          if (hasSession()) {
            body.find('[data-name="' + KEYS.USERNAME + '"]').remove();
            body.find('[data-name="' + KEYS.PASSWORD + '"]').remove();
            body.find('[data-name="scrob_login_btn"]').remove();
          } else {
            body.find('[data-name="scrob_user_info"]').remove();
            body.find('[data-name="scrob_logout_btn"]').remove();
            body.find('[data-name="scrob_open_sync"]').remove();
          }
        }

        // Hide sync controls if no session
        if (e.name === 'scrob_sync_page' && !hasSession()) {
          e.body.find('.scroll__body > div').html('');
          return;
        }

        // Show/hide active mappings button based on whether mappings exist
        if (e.name === 'scrob_sync_page') {
          var map = getMap();
          var hasMappings = Object.keys(map).length > 0;
          var body2 = e.body.find('.scroll__body > div');
          if (!hasMappings) {
            body2.find('[data-name="scrob_map_active_btn"]').addClass('hide');
          } else {
            body2.find('[data-name="scrob_map_active_btn"]').removeClass('hide');
          }
        }
      };
      Lampa.Settings.listener.follow('open', settingsListener);
    }

    // ─── Lifecycle ────────────────────────────────────────────

    // Fetch socket config from admin settings and initialize WebSocket.
    // Only activates for 'external' or 'internal' modes; otherwise polling remains.
    function initSocket() {
      console.log('Scrob', 'initSocket called');
      var username = Lampa.Storage.get(KEYS.USERNAME);
      var password = Lampa.Storage.get(KEYS.PASSWORD);
      console.log('Scrob', 'credentials:', username ? 'yes' : 'no', password ? 'yes' : 'no');

      // Always re-login first to get a fresh token
      if (!username || !password) {
        console.warn('Scrob', 'no credentials for login — using polling');
        return;
      }
      login(username, password, function (token) {
        if (!token || !token.access_token) {
          console.warn('Scrob', 'login failed — using polling');
          return;
        }

        // Save fresh token
        Lampa.Storage.set(KEYS.ACCESS_TOKEN, token.access_token);
        console.log('Scrob', 'login successful, token saved');

        // Now fetch admin settings with fresh token
        adminSettings(function (settings) {
          console.log('Scrob', 'adminSettings received:', JSON.stringify(settings));
          startSocket(settings);
        }, function (err) {
          console.warn('Scrob', 'adminSettings failed:', err, '- using polling');
        });
      }, function (err) {
        console.warn('Scrob', 'login request failed:', err, '- using polling');
      });
      function startSocket(settings) {
        if (settings.socket_mode === 'external' || settings.socket_mode === 'internal') {
          var me = getMe();
          var config = {
            mode: settings.socket_mode,
            namespace: settings.socket_namespace,
            externalUrl: settings.socket_external_url,
            host: serverUrl(),
            port: settings.socket_internal_port || 7332,
            joinKey: settings.socket_join_key,
            sendKey: settings.socket_send_key,
            username: me ? me.username : ''
          };
          if (scrobSocketInit(config)) {
            useSocket(getScrobSocket());
            console.log('Scrob', 'socket initialized, mode:', settings.socket_mode);
          }
        } else {
          console.log('Scrob', 'socket disabled, using polling');
        }
      }
    }

    // Re-render header button from saved session on startup
    function restoreSession() {
      if (hasSession()) {
        renderHeaderButton();

        // Start sync if enabled (lifecycle wiring)
        if (Lampa.Storage.get(KEYS.SYNC_ENABLED)) start();
      }
    }
    function startPlugin() {
      console.log('Scrob', 'startPlugin called');
      window.scrob_plugin = true;
      Lampa.Manifest.plugins = {
        type: 'other',
        version: '1.0.0',
        name: 'Scrob',
        description: 'Scrob server profiles and watch data isolation',
        component: 'scrob'
      };
      addLang();
      Lampa.Template.add('scrob_style', '<style>/* Scrob plugin styles */\n/* Header profile button avatar */\n.scrob-avatar {\n  width: 1.8em;\n  height: 1.8em;\n  border-radius: 50%;\n  object-fit: cover;\n  display: block;\n}\n\n/* Letter avatar: first letter of username on colored background */\n.scrob-avatar--letter {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #fff;\n  font-weight: 700;\n  font-size: 0.9em;\n  line-height: 1;\n  text-transform: uppercase;\n  user-select: none;\n}\n\n/* Larger avatar inside the profile selectbox list */\n.selectbox-item .scrob-avatar {\n  width: 2.6em;\n  height: 2.6em;\n  font-size: 1em;\n}</style>');
      $('body').append(Lampa.Template.get('scrob_style', {}, true));

      // Nested page template for sync settings
      Lampa.Template.add('settings_scrob_sync_page', '<div></div>');

      // Register custom category viewer component
      Lampa.Component.add('scrob_category', component);
      initSettings();

      // Register bookmarks rows once — displays custom categories on bookmarks screen
      registerBookmarksRows();

      // Inject custom categories into card long-press menu
      patchCardMenu();

      // Inject custom categories into full card bookmark button
      patchFullCardBookmark();
      if (window.appready) {
        restoreSession();
        refreshCustomMenu();
        initSocket();
      } else {
        Lampa.Listener.follow('app', function (e) {
          if (e.type === 'ready') {
            restoreSession();
            refreshCustomMenu();
            initSocket();
          }
        });
      }

      // Clean up socket on app destroy
      Lampa.Listener.follow('app', function (e) {
        if (e.type === 'destroy') scrobSocketDisconnect();
      });
    }
    if (!window.scrob_plugin) startPlugin();

})();
