# Точка продолжения — новый аудит перед пилотом завершён

## Актуально: 2 октября 2026

Проект `D:/projects/pleducator`. Аудит attachments/0cf2d482-5136-440f-9cc4-3ab5ac944a62/Вставленный текст.txt выполнен в предложенном объёме до пилота. Подробности: `docs/PILOT_READINESS.md`.

Код и GitHub main: `2b0f2cf5dfa18134fb60cbb143db43cf6e98b7c8`. Production `https://kodiknew.vercel.app`, deployment `https://kodiknew-ehczqg0ue-zhoper.vercel.app`, Ready; точный appVersion проверен браузерными событиями. CurriculumVersion прежний `2026-10-01.2`.

- Затемнён muted и мелкий терракотовый текст, подписи нижней навигации 13px. Мобильный дубль «Карта курса» убран, desktop-ссылка сохранена. Будущий вход статичен с «Скоро», имя явно локальное. Фокус редактора зелёный.
- `cloudProgress.ts`: явный allowlist DTO для строки Supabase; имя/сессии/ответы/код/черновики/история ошибок/произвольные новые поля не отправляются. Legacy облачные записи фильтруются при чтении, локальный редактор/история/имя сохраняются, пустое локальное состояние не затирает облачные навыки. Это не удаляет старое содержимое базы при чтении. Следующий upsert заменяет строку безопасным DTO.
- Облачная синхронизация и полноценный вход НЕ включены. Анонимная аналитика остаётся независимой. Текст desktop-уведомления теперь учитывает включение аналитики.
- Сборка и весь smoke успешны, включая 100 заданий и 78×3 формата. 14 локальных UI-сценариев и 13 production UI успешны. Production `calibration` проверяет точный SHA приложения. Снимки в `docs/screenshots/current/` — актуальные, предыдущие файлы исторические.
- GitHub push успешен. Прямой CLI deploy получил `Not authorized`, но GitHub integration уже успешно развернула этот коммит; Ready и лог сборки подтверждены. Не нужно повторять публикацию для исправления CLI.
- Передавать исходники только чистым `git archive HEAD`, без `.env.local`/.vercel/node_modules/dist/.git/логов. Ключи не читать/не выводить. Чистый архив лежит в ignored `artifacts/` и называется по SHA исходников. Не отправлять ZIP рабочей папки.

Крупные изменения курса/runtime/mastery/AI не требовались. После пилота остаются CSS consolidation, старые снимки/шрифт; до публичных growth-метрик server-issued learner identity. Физические iPhone/Safari, Android/Chrome и10настоящих новичков НЕ проверены. Протокол дополнен наблюдением первого выбора помощи и панели редактора. Следующий этап — эти проверки, не новый редизайн без результатов.

Пользователь ранее разрешил GitHub main и Vercel. Голосовой сеанс закончен, capture_screen_context не использовать. Подагенты не запрошены. Новых незавершённых программных изменений по этому аудиту нет.

## Историческая итерация: калибровка перед пилотом

## Актуально: 1 октября 2026

Проект `D:/projects/pleducator`. Новый аудит из attachments/93db4934-2ff1-481f-9d34-0e95f5aadce9/Вставленный текст.txt выполнен в его узком объёме: initial support, stable IDs/keys, curriculum/app version, skill-specific scaffolds. Также закрыт P2 whitespace evidence и подготовлены Support Independence Rate/Transfer Success, чистый архив.

Код:3531851 +15dc1d7 (второй включает define SHA сборки). GitHub main: https://github.com/alexeykorolik/kodik . Production: https://kodiknew.vercel.app — deployment https://kodiknew-dmxg4vxqb-zhoper.vercel.app, Ready, appVersion=`15dc1d7db785fe7a3fe8091342a2646c05b4b768`, curriculumVersion=`2026-10-01.2`. Последующие коммиты меняют только отчёты и проверку точного SHA в тесте; повторного деплоя приложения не требуют.

Выполнено и проверено:

- Новый/слабый навык: guided; developing:tokens; confident+2independent:free. Для известного формата максимум1ступень. Незавершённый черновик/старые4completion и фактический scaffoldSkill переживают reload. Первые22шага сохранены.
-100постоянных lessonKey, явные ID расширенных seed, прежние отрицательные practiceID закреплены. Тесты перестановки/вставки seed и frozen manifest `tests/lesson-identities.json`.
- Пропуск по слабому используемому навыку: input/conversion, assignment/reassignment, comparison, loop, function, list, drawing. Все78×3формата решаемы. Syntax fingerprints игнорируют косметические пробелы и сохраняют строки/отступы/границы токенов.
- Миграция004 реально применена в Supabase. Server events:версии+доверенный lesson_key; старые очереди=legacy. Код/имя/email не уходят. DB:1строка после2одинаковых запросов и ещё одного из следующего релиза, appVersion исходного события сохранена. ServiceREST200, anon select/RPCfalse. SQL обоих отчётов выполнен без ошибок.
- Сборка и весь smoke (включая отдельный новый test:calibration) успешны;16локальных UIсценариев, в том числе полный проход100заданий;14productionUI+повтор4сценариев на окончательном deployment с точным SHA.
- В финальном Vercel только tutor/events. Временный deployment `kodiknew-p3vz2je0h-zhoper.vercel.app` удалён, provisioning endpoint отсутствует. Служебный token/info удаляется локально. Ключи Vercel/Groq/Supabase не читать и не выводить.

Подробности `docs/ADAPTIVE_CALIBRATION.md`. Протокол/пустой CSV/SQL актуализированы. Production QA и автотесты не считаются learner cohort; для пилотного отчёта явно задать реальные даты/выборку участников, исключить QA. Физические iPhone/Safari, Android/Chrome и10новичков НЕ проверены. Следующий этап — они. Не переделывать ещё раз UX/курс до этих наблюдений. Архив исходников — git archive HEAD в ignored `artifacts/`, без .env.local/.vercel/node_modules/dist/logs.

Пользователь ранее разрешил GitHub main и Vercel deployment; не спрашивать повторно разрешение для уже выполненного. Голосовой сеанс завершён; capture_screen_context запрещён вне активного voice. Подагенты не запрошены. Новых незавершённых программных изменений нет.

## Историческая итерация: предыдущий аудит

Проект D:/projects/pleducator. GitHub main https://github.com/alexeykorolik/kodik . Код d6764bc. Production https://kodiknew.vercel.app (Ready, https://kodiknew-h2qs895g0-zhoper.vercel.app).

Пользователь подтвердил ВСЕ программные изменения P0/P1/P2 из аудита. Выполнены: адаптация23–100 guided→tokens→free безBlockly; индивидуальные навыки; AST/effect checker+скрытыепробы; безопасныйadvancedsummaryAI; corrective/review list/input/drawing; теориябезштрафа; progressskillsпервым; anonymouseventsSupabase; durableatomicAIbudget+signedcookie; codehighlight/accessory; cleanupCourse100/README; протокол10новичков/50–100пилота/физическихтелефонов.

Подробности docs/AUDIT_IMPLEMENTATION.md. Протокол docs/PILOT_PROTOCOL.md, пустой docs/pilot-results.csv, агрегаты supabase/pilot_report.sql. Миграция003 выполнена в настоящейSupabase.20конкурентныхclaims:8разрешены,12отклонены; anon не может читатьсобытия/вызыватьlimiter.

Проверены: сборка, весьsmoke, все94UIсценария (91вобщемпрогоне+исправленный100-tasktest+2AIвключённыхотдельно),16productionUI,2настоящихGroqответа while/function,доставка событий избраузера/ackqueue/reload,DBидемпотентность/отсутствиеcode/email/message. Временные4deploymentпровижининга удалены, вproduction2APIфункции. СерверныеVercelключи нельзяскачать,невыводить. ProductionAIквоты8наурок/сутки,30/минIP,80/суткиlearner,200/суткиIP,1000/суткиglobal;clientreloadнесбрасываетлимит.

Текущий программный запрос завершён. Не начинать заново прежние100задач/мобильныйредизайн/Groq/audit. Реальныхновичков и физическихiPhone/Android не проверяли; следующая работа по новымзамечаниям или протоколутестирования. Голосовойсеанс закончился; capture_screen_context не использовать. Подагенты не запрошены.
