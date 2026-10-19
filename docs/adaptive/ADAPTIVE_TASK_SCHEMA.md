# Схема адаптивного задания, версии и миграции

**Статус всего документа: План.** Миграции не выполнялись. Схема согласуется с владельцем до изменения серверной модели (ТЗ, этап 0). Текущая версия схемы БД — 10 (`schema_migrations`).

## 1. Что уже есть и переиспользуется — Есть

| Таблица / поле | Роль в адаптивной модели |
|---|---|
| `tasks` | Единственная сущность задания. Режимы не создают копий |
| `tasks.reference_solution`, `tests`, `wrong_solutions`, `learning_rules`, `check_mode` | Общие для всех режимов |
| `task_versions.snapshot` | Полный JSON строки задания при публикации. **Новое поле задания попадает в снимок автоматически** |
| `task_verifications` | Проверка качества по Python. Остаётся обязательной |
| `assignments.version_id` | Выданная версия неизменна |
| `attempts(code, status, result, snapshot, version_id, assignment_id)` | Попытка уже привязана к версии и снимку |
| `submission_jobs` | Долговечная очередь проверок |
| `assignment_drafts(user, assignment, code, revision)` + история конфликтов | Черновик Python |

## 2. Новые данные — минимально необходимые

Каждое поле ниже нужно для конкретного сценария. Остальное отложено.

### 2.1 `tasks.learning_config TEXT NOT NULL DEFAULT '{}'`

```jsonc
{
  "version": 1,
  "skills": ["input", "variables", "arithmetic", "output"], // подтверждены преподавателем
  "modes": ["blocks", "mixed", "python"],                    // разрешённые; [] или нет поля = только python
  "palette": ["kodik_input_int", "variables_set", "variables_get", "math_arithmetic", "math_number", "text_print"],
  "starter_blocks": null,                                    // JSON Blockly или null — пустое поле
  "translator": "blocks-py/0.1"                              // фиксируется при публикации
}
```

| Сценарий | Зачем поле |
|---|---|
| Разрешить режимы задания | `modes` |
| Палитра блоков | `palette` — сервер проверяет ею каждую блоковую попытку |
| Стартовое состояние | `starter_blocks` — не готовое решение, валидируется транслятором как программа |
| Навыки для прогресса | `skills` |
| Воспроизводимость | `translator` — старая версия задания проверяется тем же транслятором, что и при выдаче |

Валидация при сохранении:
- `modes` ⊆ {blocks, mixed, python}, `python` всегда разрешён;
- `palette` ⊆ `BLOCKS`;
- блоковые режимы допустимы, только если `analyzeReference(reference).blocklyCompatible` и палитра покрывает блоки эталона.

Иначе ошибка: «Для режима блоков не хватает блоков: …».

**Проверка качества.** Отпечаток ревизии (`task-quality.mjs: fingerprint`) расширяется полем `learning_config`: изменение палитры требует новой проверки. Дополнительный шаг проверки — эталон собирается из палитры. Это проверяется анализом совместимости, а не сборкой блоков.

### 2.2 Попытка и очередь

```sql
ALTER TABLE attempts ADD COLUMN mode TEXT NOT NULL DEFAULT 'python' CHECK(mode IN ('python','blocks','mixed','guided','assembly'));
ALTER TABLE attempts ADD COLUMN source TEXT;            -- JSON блоков (для blocks/mixed); NULL для python
ALTER TABLE attempts ADD COLUMN translator TEXT;        -- 'blocks-py/0.1'; NULL для python
ALTER TABLE submission_jobs ADD COLUMN mode TEXT NOT NULL DEFAULT 'python';
ALTER TABLE submission_jobs ADD COLUMN source TEXT;
```

`attempts.code` для блоковой попытки — **Python, сгенерированный сервером**, а не присланный клиентом. Поэтому существующие отчёты, панель решения и экспорт работают без изменений. Старые попытки получают `mode='python'`: это правда о том, как они были сделаны.

### 2.3 Черновики по режимам

```sql
CREATE TABLE assignment_block_drafts(
  user_id TEXT NOT NULL REFERENCES users(id),
  assignment_id TEXT NOT NULL REFERENCES assignments(id),
  workspace TEXT NOT NULL,              -- JSON Blockly, ≤ 100 000 символов, валидируется транслятором
  format INTEGER NOT NULL DEFAULT 1,    -- версия формата хранения
  revision INTEGER NOT NULL DEFAULT 1,  -- тот же протокол конфликтов, что у assignment_drafts
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id, assignment_id));
```

| Что | Где хранится | Переносится ли между режимами |
|---|---|---|
| Блоки | `assignment_block_drafts` — общий для `blocks` и `mixed` | Да, между `blocks` и `mixed`: это одно поле |
| Python | `assignment_drafts` | **Нет.** Код из блоков не копируется в Python-черновик: это обход самостоятельной проверки. В `mixed` ученик видит код рядом и может его прочитать |
| Последний режим ученика | `assignment_block_drafts` не нужен; хранится в клиенте (`localStorage`) | — |

### 2.4 Политика режимов в назначении

```sql
ALTER TABLE assignments ADD COLUMN mode_policy TEXT NOT NULL DEFAULT '{}';
-- {"start":"blocks","switching":"free"|"teacher"|"locked","recommendations":true}
CREATE TABLE student_mode_overrides(
  assignment_id TEXT NOT NULL REFERENCES assignments(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  modes TEXT NOT NULL,                  -- подмножество modes версии
  actor_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY(assignment_id, user_id));
```

Политика живёт в назначении: одно задание можно выдать 7А с блоков, а 8Б — сразу в Python. Сервер проверяет, что режим попытки разрешён:
`mode ∈ modes версии ∩ (override ученика || policy группы)`.

### 2.5 История переходов и рекомендаций — План, этап 5

```sql
CREATE TABLE mode_events(id TEXT PRIMARY KEY, org_id TEXT NOT NULL, user_id TEXT NOT NULL, assignment_id TEXT,
  kind TEXT NOT NULL CHECK(kind IN ('recommended','accepted','declined','switched','teacher_set')),
  from_mode TEXT, to_mode TEXT, skill TEXT, reason TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);
```

Нужна для двух вещей: «почему рекомендован переход» для преподавателя и проверка правил на реальных данных. Без событий кликов и времени.

### 2.6 Освоение навыков — без таблицы в первой версии

Считается запросом по `attempts JOIN task_versions` (навыки из снимка). Материализованная таблица — только если появится проблема производительности (Отложено).

## 3. Версионирование

| Изменение | Что происходит |
|---|---|
| Палитра, режимы, стартовые блоки, навыки | Новая ревизия черновика → нужна новая проверка качества → новая версия при публикации. Выданная версия не меняется |
| Тесты, эталон | Как сейчас |
| Политика режимов группы | Меняется в назначении сразу, с аудитом. Задание не трогает |
| Новая версия транслятора | Старые версии заданий проверяются тем транслятором, который записан в их снимке. Бандл исполнителя содержит все поддерживаемые версии или отказывает с `checker_error`, не молча |
| Старые попытки | Не пересчитываются |

## 4. Ученический DTO

Из `learning_config` ученику отдаются только `modes` (с учётом политики), `palette` и `starter_blocks`. Навыки и эталон не отдаются. Вывод и проверка через `safeTask` — по аналогии с существующим вырезанием `reference_solution` и скрытых тестов. Тест PoC доказывает только UI-часть: эталон не показывается в зеркале. DTO — задача этапа 2.

## 5. Миграция 11 — порядок

1. Резервная копия и `verify-backup.mjs` (как для миграций 6–10).
2. Добавить столбцы с умолчаниями. Существующие задания и попытки остаются «Python» без изменений.
3. Создать новые таблицы.
4. `test:pilot` + проверка восстановления 10 → 11.
5. Откат — восстановление из резервной копии шага 1: сервер отказывается работать со схемой новее своей, понижения версии нет.
