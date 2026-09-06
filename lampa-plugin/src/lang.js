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
        },

        // ─── First-run wizard (Phase C) ────────────────
        scrob_wizard_title: {
            uk: 'Майстер синхронізації',
            ru: 'Мастер синхронизации',
            en: 'Sync wizard',
            be: 'Майстар сінхранізацыі'
        },
        scrob_wizard_welcome: {
            uk: 'Scrob об’єднає закладки Lampa зі списками сервера. За замовчуванням — об’єднання: нічого не видаляється. Історія, переглянуте та картки не синхронізуються.',
            ru: 'Scrob объединит закладки Lampa со списками сервера. По умолчанию — объединение: ничего не удаляется. История, просмотренное и карточки не синхронизируются.',
            en: 'Scrob will merge your Lampa bookmarks with server lists. Default is union: nothing is deleted. History, viewed and cards are not synced.',
            be: 'Scrob аб’яднае закладкі Lampa са спісамі сервера. Па змаўчанні — аб’яднанне: нічога не выдаляецца. Гісторыя, прагледжанае і карткі не сінхранізуюцца.'
        },
        scrob_wizard_start: {
            uk: 'Почати',
            ru: 'Начать',
            en: 'Start',
            be: 'Пачаць'
        },
        scrob_wizard_loading: {
            uk: 'Збираю списки…',
            ru: 'Собираю списки…',
            en: 'Collecting lists…',
            be: 'Збіраю спісы…'
        },
        scrob_wizard_empty: {
            uk: 'Немає що об’єднувати',
            ru: 'Нечего объединять',
            en: 'Nothing to merge',
            be: 'Няма чаго аб’ядноўваць'
        },
        scrob_wizard_mode: {
            uk: 'Як об’єднати списки?',
            ru: 'Как объединить списки?',
            en: 'How to merge lists?',
            be: 'Як аб’яднаць спісы?'
        },
        scrob_wizard_merge: {
            uk: 'Об’єднати',
            ru: 'Объединить',
            en: 'Merge',
            be: 'Аб’яднаць'
        },
        scrob_wizard_push: {
            uk: 'Тільки відправити',
            ru: 'Только отправить',
            en: 'Push only',
            be: 'Толькі адправіць'
        },
        scrob_wizard_pull: {
            uk: 'Тільки забрати',
            ru: 'Только забрать',
            en: 'Pull only',
            be: 'Толькі забраць'
        },
        scrob_wizard_later: {
            uk: 'Налаштувати потім',
            ru: 'Настроить позже',
            en: 'Set up later',
            be: 'Наладзіць пазней'
        },
        scrob_wizard_keep_lampa: {
            uk: 'Залишити Лампу',
            ru: 'Оставить Lampa',
            en: 'Keep Lampa',
            be: 'Пакінуць Lampa'
        },
        scrob_wizard_keep_scrob: {
            uk: 'Залишити Scrob',
            ru: 'Оставить Scrob',
            en: 'Keep Scrob',
            be: 'Пакінуць Scrob'
        },
        scrob_wizard_custom_title: {
            uk: 'Знайдено власні категорії',
            ru: 'Найдены свои категории',
            en: 'Custom categories found',
            be: 'Знойдзены ўласныя катэгорыі'
        },
        scrob_wizard_custom_import: {
            uk: 'Імпортувати як ключі',
            ru: 'Импортировать как ключи',
            en: 'Import as keys',
            be: 'Імпартаваць як ключы'
        },
        scrob_wizard_custom_skip: {
            uk: 'Пропустити',
            ru: 'Пропустить',
            en: 'Skip',
            be: 'Прапусціць'
        },
        scrob_wizard_confirm: {
            uk: 'Підтвердження',
            ru: 'Подтверждение',
            en: 'Confirm',
            be: 'Пацверджанне'
        },
        scrob_wizard_apply: {
            uk: 'Застосувати',
            ru: 'Применить',
            en: 'Apply',
            be: 'Ужыць'
        },
        scrob_wizard_done: {
            uk: 'Готово, відкат доступний 7 днів',
            ru: 'Готово, откат доступен 7 дней',
            en: 'Done, rollback available for 7 days',
            be: 'Гатова, адкат даступны 7 дзён'
        },
        scrob_wizard_rerun: {
            uk: 'Перезапустити майстер',
            ru: 'Перезапустить мастер',
            en: 'Re-run wizard',
            be: 'Перазапусціць майстар'
        },
        scrob_wizard_rollback: {
            uk: 'Відкотити майстер',
            ru: 'Откатить мастер',
            en: 'Roll back wizard',
            be: 'Адкаціць майстар'
        },
        scrob_wizard_rolledback: {
            uk: 'Закладки відновлено з бекапа',
            ru: 'Закладки восстановлены из бэкапа',
            en: 'Bookmarks restored from backup',
            be: 'Закладкі адноўлены з бэкапа'
        },
        scrob_wizard_no_backup: {
            uk: 'Бекапа немає',
            ru: 'Бэкапа нет',
            en: 'No backup found',
            be: 'Бэкапа няма'
        },
        scrob_wizard_person_warn: {
            uk: 'Увага: картки персон бідні',
            ru: 'Внимание: карточки персон бедные',
            en: 'Note: person cards are sparse',
            be: 'Увага: карткі персон бедныя'
        }
    })
}
