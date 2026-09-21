export const blockOptions = [
  { type: 'text_print', label: 'Напечатать', detail: 'Показать значение', group: 'Вывод' },
  { type: 'text', label: 'Текст', detail: 'Слово или фраза', group: 'Значения' },
  { type: 'math_number', label: 'Число', detail: 'Число для вычислений', group: 'Значения' },
  { type: 'variables_set', label: 'Присвоить', detail: 'Сохранить значение', group: 'Переменные' },
  { type: 'variables_get', label: 'Получить переменную', detail: 'Взять сохранённое значение', group: 'Переменные' },
  { type: 'math_arithmetic', label: 'Вычислить', detail: 'Сложить, вычесть, умножить', group: 'Вычисления' },
  { type: 'logic_compare', label: 'Сравнить', detail: 'Проверить два значения', group: 'Логика' },
  { type: 'controls_if', label: 'Если', detail: 'Выполнить действие при условии', group: 'Логика' },
  { type: 'controls_repeat_ext', label: 'Повторить', detail: 'Повторить команды внутри', group: 'Циклы' },
  { type: 'kodik_define', label: 'Создать функцию', detail: 'Назвать группу команд', group: 'Функции' },
  { type: 'kodik_call', label: 'Вызвать функцию', detail: 'Выполнить названные команды', group: 'Функции' }
]
