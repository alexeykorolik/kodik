# Kodik для Android

Android-оболочка существующего React/Vite приложения через Capacitor 8.5.2. ID: `app.kodik.mobile`, имя: `Kodik`, версия: `0.1.0` / versionCode 1. Курс, checker, mastery и адаптация общие с web.

## Разработка

Нужны Node.js 22+, JDK 21, Android SDK Platform 36 и platform-tools. На этом ноутбуке установлены Build Tools 35.0.0 (выбранные AGP для сборки) и 36.0.0. Для IDE — Android Studio 2025.2.1 или новее. [Требования Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup), [Android SDK](https://developer.android.com/studio).

```powershell
npm install
npm run build:android
npx cap sync android
npx cap open android
```

Обычный `npm run build` сохраняет web-сборку. Его также можно использовать перед `cap sync`, но для APK с AI/аналитикой и внешним API нужна именно `build:android`. `npm run android:sync` объединяет Android build и sync. После изменений frontend обязательно повторять sync: приложение не скачивает новый интерфейс с Vercel.

В Android Studio открыть папку `android/`, выбрать установленный JDK 21 и SDK 36, дождаться Gradle sync. На этом ноутбуке инструменты сборки подготовлены без установки IDE; запуск Android Studio здесь отдельно не проверен.

ID указан в `capacitor.config.ts`. До первой публикации его можно изменить, одновременно переименовав namespace/applicationId в `android/app/build.gradle` и пакет `MainActivity.java`. После распространения APK смена ID создаёт отдельное приложение с отдельным storage.

## Сборка APK

Задать `JAVA_HOME` и `ANDROID_HOME` для своей установки. На текущем ноутбуке скрипт также умеет находить локальные инструменты по ignored `artifacts/android-toolchain/paths.json`.

```powershell
npm run android:debug
```

Исходный результат: `android/app/build/outputs/apk/debug/app-debug.apk`. Копия для передачи: `artifacts/android/Kodik-debug.apk`. Debug подписан стандартным локальным debug-ключом Android, не предназначен для Google Play. Он не содержит server keys.

```powershell
# После подключения телефона с USB debugging:
adb devices
adb install -r artifacts/android/Kodik-debug.apk
adb shell am start -n app.kodik.mobile/.MainActivity
```

Без USB передать APK на телефон и разрешить установку из выбранного источника. Прогресс web-браузера автоматически в APK не переносится: у приложения свой origin/storage.

## Release

```powershell
npm run android:release
# Для будущего Play Store, после подготовки подписания:
# cd android
# .\gradlew.bat :app:bundleRelease
```

Без production signing credentials получается `artifacts/android/Kodik-release-unsigned.apk`. Это неподписанный результат сборки, устанавливать его нельзя. Для распространения release понадобятся собственный upload keystore, безопасное внешнее хранение паролей, Gradle signingConfig и подписанный APK/AAB. Ключи, `.jks`/`.keystore`, `local.properties`, кеши и результаты сборки игнорируются Git. Никаких production ключей эта итерация не создаёт.

Для Google Play отдельно нужны финальный applicationId/versionCode, signing/Play App Signing, AAB, политика конфиденциальности и сведения об использовании данных, окончательная иконка и испытания на устройствах. Публикация в Google Play не выполняется.

## Интерфейс и сервер

Frontend и локальный шрифт находятся в `assets/public` внутри APK, копируются из `dist`. В Capacitor нет `server.url`; запуск идёт с локального `https://localhost`, а не с production-сайта. Интернет для открытия экрана не нужен. Backend не входит в APK.

`src/api.ts` — единый источник адресов: browser `/api`, Android `https://kodiknew.vercel.app/api`. Публичные Android-флаги находятся в `vite.android.config.ts`; `.env.local` не загружается. AI идёт App → Vercel → Groq, а события — App → Vercel → Supabase. Нет клиентского Groq/service-role/Vercel credential.

На Android для этих двух API используется встроенный `CapacitorHttp`: он поддерживает cookie, выданный сервером для квот. Cookie не переносится в localStorage и не подменяется клиентским UUID. Abort возвращает существующий fallback; физический native запрос ограничен connect/read timeout. На web остаётся fetch с прежним поведением.

Сервер разрешает существующий web origin и ровно `https://localhost`. CORS не использует `*`. Проверки Origin не заменяют аутентификацию; серверные квоты и очистка payload остаются прежними. В APK нет HTTP/cleartext/mixed-content исключений.

При потере сети frontend и локальные уроки продолжают работать. AI использует подготовленную помощь; события сохраняются в существующей очереди и отправляются после восстановления сети. Схема событий и curriculumVersion не меняются; appVersion — SHA сборки. Собственный app storage сохраняет имя/черновики/историю/оценки; полноценный вход и cloud sync не добавлены.

## Android integration

- Back: клавиатура Kodik/Blockly dropdown → открытый dialog → полный workspace → Lesson к Course → другие разделы к Home → Home сворачивает приложение стандартным способом. Системная IME сначала обрабатывается Android; её поведение требует проверки на телефоне.
- Светлые системные панели с тёмными значками, короткий splash и временная адаптивная иконка существующего знака «к.».
- Native insets Capacitor и Android `viewport-fit=contain` размещают WebView внутри системных областей. Web viewport не меняется. Открытие IME — `adjustResize`, без принудительных размеров клавиатуры.
- Внешние HTTPS-ссылки открываются системным браузером через AppLauncher. Локальные routes остаются внутри приложения.
- Orientation не блокирована: portrait удобен для первого запуска; landscape не имеет отдельного учебного режима.

## Проверка на настоящем телефоне — обязательный следующий этап

Пользователь сообщил, что сейчас телефона нет, и попросил подготовить APK для проверки позже. Реальная установка и touch/IME проверки не считаются выполненными по результатам браузерной эмуляции.

1. Установить APK, открыть Home/Course/Lesson/Progress/Account.
2. Blockly: добавить, drag/drop/scroll, горизонтальное движение, long press, dropdown, своё поле ввода, bottom sheet, fullscreen и Back из него.
3. Решить урок, проверить результат и следующий урок, открыть Python preview.
4. В текстовом упражнении проверить клавиатуру Android, каретку/выделение, прокрутку, подсветку, Tab/скобки/двоеточие/кавычки и позицию после вставки.
5. Открыть/закрыть IME, проверить активную строку и CTA, вырез камеры/gesture bar; portrait/landscape.
6. Подсказка и настоящий AI: нормальный ответ, timeout, отказ сервера, quota/fallback, без сети.
7. События с Android доходят до API, содержат версии/ID/lesson key, без кода/имени/email. Не выдавать QA-события за пользователей пилота.
8. Частичное решение/имя/звёзды/навык: закрыть, force stop, снова открыть и проверить local progress/draft.
9. Отключить сеть до запуска: Home и локальные упражнения открываются; после возврата сети очередь отправляется.

Браузерные размеры 360×800, 393×873, 412×915 и Android-эмулятор не заменяют проверку на физическом телефоне.

## Результаты сборки и проверок — 2 октября 2026

Исходники APK: `ab98a4fe8bd50563ac73b31598efaf1f629e519d`, curriculumVersion `2026-10-01.2`. Последующие коммиты отчётов не меняют содержимое этих APK.

| Артефакт | Размер | SHA-256 |
| --- | --- | --- |
| `artifacts/android/Kodik-debug.apk` | 4 500 728 байт | `11636421973219230e0bdc0a6365b050cabeea6000826e385a8f5630d91f5abf` |
| `artifacts/android/Kodik-release-unsigned.apk` | 3 475 753 байта | `919324879bbbd230f695e1a494a300fc5bf557cdad2a59351c390ff0d1c0b1b49` |

- Gradle `:app:assembleDebug` и `:app:assembleRelease` завершились успешно. Debug-подпись проверена `apksigner`; release оставлен неподписанным.
- Метаданные APK: `app.kodik.mobile`, versionCode 1, minSdk 24, targetSdk 36, стартовая `MainActivity`.
- Проверено содержимое debug APK: frontend и локальный Nunito внутри, нет `server.url`, cleartext исключений, `.env`, keystore и серверных API-файлов. В frontend нет server-key имён или значений, похожих на Groq/OpenAI/service-role credentials. Отчёт: `artifacts/android/apk-audit.json`.
- Полный `npm run test:smoke` успешен: 100 заданий, 78×3 формата, runtime, checker, adaptation, privacy/events/AI/cloud и Android integration. Web build успешен.
- 10 локальных UI-сценариев компоновки и курса, 3 Android viewport-сценария и 1 браузерная симуляция Android Back успешны. Это не результаты native touch.
- Production: девять отдельных UI-сценариев успешны; после обновления deployment три проверки калибровки повторены с точным appVersion `ab98a4f…`. Deployment `https://kodiknew-ns31xg6va-zhoper.vercel.app` — Ready, alias `https://kodiknew.vercel.app`.
- Настоящие production OPTIONS для tutor/events с Origin `https://localhost`: 200, разрешён ровно этот Origin.

### Android-эмулятор

Debug APK установлен и проверен в Android API 36 Google APIs x86_64 / Pixel 7, с настоящим Capacitor bridge. Это Android WebView, а не браузерная подмена платформы. Нажатия выполнялись средствами Android по координатам элементов; снимки получены из Android.

- Home/Course/Progress/Account/Lesson открываются; локальное имя сохраняется. Portrait WebView 412×839, системные панели находятся вне рабочей области.
- Добавлены и соединены print + текст, введено «Привет!» собственной клавиатурой, первое задание принято checker. Android Back закрывает клавиатуру Kodik, окно выбора блоков и полный workspace; проверен путь Lesson → Course → Home → launcher.
- В Python открыта системная IME: viewport уменьшается до 412×527. Редактор, панель символов и CTA видимы. Скобки, кавычки, двоеточие, Tab вставляются в текущую позицию; каретка остаётся внутри парных символов.
- AI concept из APK: native HTTPS POST → Vercel → Groq, 200, ответ принят клиентским validator, событие `ai_hint_generated`. Native events API вернул 200 и принятые ID, очередь очистилась. Origin `https://localhost`; payload API содержит только предусмотренные поля.
- После Home/background (2 секунды), затем force stop и повторного старта, локальный progress JSON сохранился целиком: имя, Blockly draft, Python draft, история ошибки, оценка, mastery и support session. Немедленное убийство процесса без фонового lifecycle в отдельной пробе потеряло последнее изменение; такую crash durability эта оболочка не гарантирует.
- Холодный запуск в airplane mode открывает Home и сохранённое упражнение; AI показывает подготовленную помощь.
- После восстановления сети очередь событий получила подтверждение сервера и очистилась. Полный успешный отчёт: `artifacts/android/native-qa.json`.

Артефакты проверки находятся локально в `artifacts/android/`: `native-home.png`, `native-blockly-result.png`, `native-python-ime.png`, `native-offline.png`; результаты не считаются участниками пилота. Drag/drop, long press, выделение большого текста, произвольные модели телефонов, gesture navigation и landscape остаются в списке проверки на физическом устройстве. Android Studio на этом ноутбуке не запускалась.
