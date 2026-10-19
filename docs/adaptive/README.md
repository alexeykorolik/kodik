# Kodik B2B — адаптивное обучение: Blockly → Python

Этапы 0 (исследование) и 1 (технический прототип) ТЗ «Adaptive Learning Engine». Серверная модель и продуктовые экраны **не менялись**. Полномасштабная реализация начинается после согласования схемы и UX.

**Вердикт PoC: продолжать.**
- Блоки переводятся в учебный Python и проверяются существующим `grade()` по тестам задания и учебным правилам. 108 автоматических проверок; 7 программ совпали с CPython.
- Подмена Python клиентом не работает.

| Документ | Содержание |
|---|---|
| [BLOCKLY_B2B_AUDIT.md](BLOCKLY_B2B_AUDIT.md) | Как устроен Blockly в B2C, что переиспользуем и почему не всю цепочку B2C: из 22 блоковых решений B2C в B2B-интерпретаторе запускаются только 17 |
| [BLOCKLY_PYTHON_COMPATIBILITY.md](BLOCKLY_PYTHON_COMPATIBILITY.md) | 21 блок ↔ Python, отказы с причинами, анализ эталона, лимиты |
| [ADAPTIVE_LEARNING_ARCHITECTURE.md](ADAPTIVE_LEARNING_ARCHITECTURE.md) | Одно задание — несколько представлений; доверенная трансляция в процессе-исполнителе; порядок этапов помощи |
| [ADAPTIVE_TASK_SCHEMA.md](ADAPTIVE_TASK_SCHEMA.md) | `learning_config`, режим и блоки в попытке, черновики, политика режимов, версии, миграция 11 |
| [ADAPTIVE_UX_SPEC.md](ADAPTIVE_UX_SPEC.md) | «Путь обучения» в конструкторе, среда ученика в трёх режимах, тексты рекомендаций |
| [ADAPTIVE_RULES.md](ADAPTIVE_RULES.md) | Прозрачные правила рекомендаций, ручное управление, модель «навык × режим» |
| [ADAPTIVE_IMPLEMENTATION_PLAN.md](ADAPTIVE_IMPLEMENTATION_PLAN.md) | Этапы 2–6, условия перехода, риски, регрессия |
| [ADAPTIVE_TEST_REPORT.md](ADAPTIVE_TEST_REPORT.md) | Автоматические, технические и запланированные исследования — раздельно |

Код PoC:
- `src/adaptive/` — транслятор, блоки ввода, анализ эталона, технический интерфейс;
- `tests/adaptive-blockly.poc.ts` — автотест;
- `adaptive-poc.html` — страница технического интерфейса.

Запуск:

```bash
npm run build:runner
```

```bash
node ./node_modules/tsx/dist/cli.mjs tests/adaptive-blockly.poc.ts
```

Технический интерфейс: `npm run dev`, затем `/adaptive-poc.html`. Скриншоты — [../design/screenshots/adaptive/](../design/screenshots/adaptive).
