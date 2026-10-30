# Kodik B2B — редизайн десктопа

Пакет на согласование: этапы A–C ТЗ, дополнение о бренд-ките и продуктовое ревью. Продуктовый код в `src/` не менялся. Прототип — материал для согласования, а не готовый продукт.

## С чего начать дизайнеру и владельцу

1. [screenshots/](screenshots) — 19 состояний в 1440 × 900.
2. [DESIGN_REVIEW_FIXES.md](DESIGN_REVIEW_FIXES.md) — что найдено и что исправлено.
3. [PRODUCT_DECISIONS.md](PRODUCT_DECISIONS.md) — открытые вопросы, на которые нужен ответ владельца.
4. [prototype/index.html](prototype/index.html) — кликабельный прототип.

## Документы

| Документ | Содержание |
|---|---|
| [UX_AUDIT.md](UX_AUDIT.md) | Аудит текущего B2B и бренд-кита, что оставить и что изменить |
| [COMPETITOR_UX_RESEARCH.md](COMPETITOR_UX_RESEARCH.md) | CodeHS, Codio, Stepik, CodeCombat, Moodle + CodeRunner, JetBrains Academy |
| [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md) | Роли, навигация, экраны и маршруты, онбординг, состояния |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Палитра с контрастом, шрифты, две плотности, ширина и масштаб, компоненты, доступность |
| [ENGINE_CAPABILITIES.md](ENGINE_CAPABILITIES.md) | Что реально умеет движок: Python-конструкции, типы заданий, проверка, Blockly, чего нет |
| [USER_FLOWS.md](USER_FLOWS.md) | Пути преподавателя, ученика и администратора: сейчас и предлагается, клики, потери контекста |
| [PRODUCT_DECISIONS.md](PRODUCT_DECISIONS.md) | PD-01…PD-19: конструктор, версии, результаты, перевод и архив, интерпретатор |
| [DESIGN_REVIEW_FIXES.md](DESIGN_REVIEW_FIXES.md) | Все проблемы: приоритет, причина, решение, статус |
| [PILOT_READINESS_CHECKLIST.md](PILOT_READINESS_CHECKLIST.md) | Проверка перед первым уроком на 15–30 учеников |
| [UI_IMPLEMENTATION_PLAN.md](UI_IMPLEMENTATION_PLAN.md) | До пилота / желательно / до коммерции / масштабирование, этапы и проверки |
| [UX_TEST_REPORT.md](UX_TEST_REPORT.md) | Проведённые автоматические проверки и запланированные исследования с людьми |
| [prototype/tokens.css](prototype/tokens.css) | Токены (в `index.html` встроена копия) |
| [assets/](assets) | Wordmark и знак K. из Brand Kit 2026, векторы без перенабора |

Локальный просмотр: `python -m http.server 4190` в этой папке, затем `http://127.0.0.1:4190/prototype/`. Можно открыть `prototype/index.html` и напрямую.
