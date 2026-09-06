// Scrob plugin translations
export default function addLang() {
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
            uk: 'API-ключ',
            ru: 'API-ключ',
            en: 'API key',
            be: 'API-ключ'
        },
        scrob_api_key_descr: {
            uk: 'Самодостатній спосіб авторизації: вставте власний ключ і не заповнюйте логін/пароль',
            ru: 'Самодостаточный способ авторизации: вставьте свой ключ и не заполняйте логин/пароль',
            en: 'Standalone sign-in method: paste your own key and skip username/password',
            be: 'Самадастатковы спосаб аўтарызацыі: устаўце ўласны ключ і не запаўняйце лагін/пароль'
        },
        scrob_login: {
            uk: 'Логін і пароль',
            ru: 'Логин и пароль',
            en: 'Username & password',
            be: 'Лагін і пароль'
        },
        scrob_qr_login: {
            uk: 'Через QR-код',
            ru: 'Через QR-код',
            en: 'Via QR code',
            be: 'Праз QR-код'
        },
        scrob_auth_trigger: {
            uk: 'Авторизуватися на сервері',
            ru: 'Авторизоваться на сервере',
            en: 'Sign in to the server',
            be: 'Аўтарызавацца на серверы'
        },
        scrob_auth_choice_title: {
            uk: 'Авторизація Scrob',
            ru: 'Авторизация Scrob',
            en: 'Scrob Sign In',
            be: 'Аўтарызацыя Scrob'
        },
        scrob_auth_status_qr: {
            uk: 'Авторизовано через QR-код',
            ru: 'Авторизован через QR-код',
            en: 'Signed in via QR code',
            be: 'Аўтарызаваны праз QR-код'
        },
        scrob_auth_status_apikey: {
            uk: 'Авторизовано через API-ключ',
            ru: 'Авторизован через API-ключ',
            en: 'Signed in via API key',
            be: 'Аўтарызаваны праз API-ключ'
        },
        scrob_qr_modal_title: {
            uk: 'Вхід через QR-код',
            ru: 'Вход через QR-код',
            en: 'Sign in via QR code',
            be: 'Уваход праз QR-код'
        },
        scrob_qr_hint: {
            uk: 'Відскануйте QR-код телефоном або відкрийте посилання на іншому пристрої й введіть код вручну',
            ru: 'Отсканируйте QR-код телефоном или откройте ссылку на другом устройстве и введите код вручную',
            en: 'Scan the QR code with your phone, or open the link on another device and enter the code manually',
            be: 'Адскануйце QR-код тэлефонам або адкрыйце спасылку на іншай прыладзе і ўвядзіце код уручную'
        },
        scrob_qr_manual_prefix: {
            uk: 'Або вручну на ',
            ru: 'Или вручную на ',
            en: 'Or manually at ',
            be: 'Або ўручную на '
        },
        scrob_qr_manual_suffix: {
            uk: '',
            ru: '',
            en: '',
            be: ''
        },
        scrob_qr_draw_failed: {
            uk: 'Не вдалося намалювати QR — введіть код вручну на іншому пристрої',
            ru: 'Не удалось нарисовать QR — введите код вручную на другом устройстве',
            en: "Couldn't render the QR code — enter the code manually on another device",
            be: 'Не атрымалася намаляваць QR — увядзіце код уручную на іншай прыладзе'
        },
        scrob_noty_qr_gen_failed: {
            uk: 'Не вдалося згенерувати QR-код',
            ru: 'Не удалось сгенерировать QR-код',
            en: 'Failed to generate QR code',
            be: 'Не атрымалася згенераваць QR-код'
        },
        scrob_noty_qr_no_connection: {
            uk: 'Немає зв\'язку із сервером',
            ru: 'Нет связи с сервером',
            en: 'No connection to the server',
            be: 'Няма сувязі з сервером'
        },
        scrob_noty_qr_expired: {
            uk: 'Час дії QR-коду вичерпано, спробуйте ще раз',
            ru: 'Время действия QR-кода истекло, попробуйте снова',
            en: 'The QR code has expired, please try again',
            be: 'Час дзеяння QR-кода вычарпаны, паспрабуйце зноў'
        },
        scrob_noty_qr_denied: {
            uk: 'Авторизацію через QR скасовано або відхилено',
            ru: 'Авторизация через QR отменена или отклонена',
            en: 'QR sign-in was cancelled or denied',
            be: 'Аўтарызацыя праз QR скасавана або адхілена'
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
    })
}
