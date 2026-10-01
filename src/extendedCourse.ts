import type { Lesson } from './learningEngine'
import { runCourseProgram } from './pythonRuntime'
import { lessonObjectives } from './lessonObjectives'
import { courseMaterials } from './courseMaterials'

export type Seed = [id: number, key: string, title: string, goal: string, code: string, hint: string, inputs?: string[][]]

// New lessons continue the original 22-step path. Each reference program is
// executed at load time; a broken task cannot silently enter the curriculum.
export const extendedSeeds: { id: number; tasks: Seed[] }[] = [
  { id: 6, tasks: [
    [23, 'data.club-sign', 'Вывеска клуба', 'Собери из двух частей и напечатай «Клуб Кодик».', 'print("Клуб " + "Кодик")', 'Знак + соединяет две строки.'],
    [24, 'data.ticket-price', 'Три билета', 'Один билет стоит 7 монет. Покажи стоимость трёх билетов вычислением.', 'ticket = 7\nprint(ticket * 3)', 'Сохрани цену и умножь её на количество.'],
    [25, 'data.remaining-tokens', 'Остаток жетонов', 'Было 20 жетонов, потратили 6. Выведи остаток.', 'total = 20\nused = 6\nprint(total - used)', 'Вычти потраченное из общего числа.'],
    [26, 'data.name-greeting', 'Приветствие по имени', 'Сохрани имя Лея и напечатай «Привет, Лея».', 'name = "Лея"\nprint("Привет, " + name)', 'Соедини начало фразы со значением переменной.'],
    [27, 'data.parentheses', 'Скобки меняют ответ', 'Сначала сложи 8 и 4, затем умножь сумму на 3. Выведи результат.', 'print((8 + 4) * 3)', 'Сумма должна оказаться во внутренних скобках.'],
    [28, 'data.average-score', 'Средний балл', 'Баллы за два раунда: 7 и 9. Вычисли и выведи среднее.', 'print((7 + 9) / 2)', 'Сложи два результата и раздели на два.'],
    [29, 'data.even-floor', 'Чётный этаж', 'Проверь вычислением, чётный ли этаж 14. Выведи True или False.', 'print(14 % 2 == 0)', 'Остаток от деления на 2 помогает проверить чётность.'],
    [30, 'data.poster-lines', 'Две строки афиши', 'Напечатай на разных строках «Открыто» и «До 18:00».', 'print("Открыто")\nprint("До 18:00")', 'Каждая команда print создаёт отдельную строку.'],
    [31, 'data.update-points', 'Пополнение счёта', 'На счёте было 5 очков, добавили 4. Измени переменную и покажи новый счёт.', 'points = 5\npoints = points + 4\nprint(points)', 'Переменной можно присвоить новое значение на основе старого.'],
    [32, 'data.enough-coins', 'Достаточно монет?', 'Проверь, хватит ли 12 монет на покупку за 10. Выведи результат сравнения.', 'coins = 12\nprint(coins >= 10)', 'Знак >= означает «больше или равно».'],
    [33, 'data.purchase-total', 'Чек за набор', 'Тетрадь стоит 9 монет. Купили 3. Сохрани цену и количество, выведи итог.', 'price = 9\ncount = 3\nprint(price * count)', 'Итог — цена одной вещи, умноженная на количество.'],
  ] },
  { id: 7, tasks: [
    [34, 'conditions.frost', 'Мороз за окном', 'Температура −3. Если она ниже нуля, покажи «Мороз», иначе «Тепло».', 'temp = -3\nif temp < 0:\n    print("Мороз")\nelse:\n    print("Тепло")', 'Условие проверяет temp < 0.'],
    [35, 'conditions.concert-entry', 'Вход на концерт', 'Возраст 19 лет. Если человеку есть 18, покажи «Можно войти».', 'age = 19\nif age >= 18:\n    print("Можно войти")', 'Порог включён: нужен знак >=.'],
    [36, 'conditions.game-threshold', 'Порог игры', 'Игрок набрал 8 очков. Покажи «Победа» от 10 очков, иначе «Попробуй ещё».', 'score = 8\nif score >= 10:\n    print("Победа")\nelse:\n    print("Попробуй ещё")', 'Нужны обе ветки: если и иначе.'],
    [37, 'conditions.green-light', 'Зелёный свет', 'Цвет сигнала — «зелёный». Покажи «Иди» только для зелёного цвета.', 'color = "зелёный"\nif color == "зелёный":\n    print("Иди")', 'Строки сравнивают знаком ==.'],
    [38, 'conditions.box-size', 'Размер коробки', 'Число 2 означает среднюю коробку: 1 — малая, 2 — средняя, остальные — большая. Выведи размер.', 'size = 2\nif size == 1:\n    print("Малая")\nelif size == 2:\n    print("Средняя")\nelse:\n    print("Большая")', 'После первого if можно проверить второй случай через elif.'],
    [39, 'conditions.odd-ticket', 'Чётный билет', 'Номер билета 17. Выведи «Чётный» или «Нечётный».', 'number = 17\nif number % 2 == 0:\n    print("Чётный")\nelse:\n    print("Нечётный")', 'Чётное число делится на 2 без остатка.'],
    [40, 'conditions.delivery', 'Доставка заказа', 'Заказ на 55 монет. Доставка бесплатна от 50, иначе стоит отдельно. Выведи «Бесплатно» или «Платно».', 'price = 55\nif price >= 50:\n    print("Бесплатно")\nelse:\n    print("Платно")', 'Сравни сумму заказа с порогом 50.'],
    [41, 'conditions.age-and-ticket', 'Возраст и билет', 'Возраст 13, билет куплен (1). Покажи «Проходи», только если выполнены оба условия.', 'age = 13\nticket = 1\nif age >= 12 and ticket == 1:\n    print("Проходи")', 'and объединяет две необходимые проверки.'],
    [42, 'conditions.warm-day', 'Тёплый день', 'Температура 23. До 0 — мороз, до 20 — прохладно, иначе тепло. Покажи подходящее слово.', 'temp = 23\nif temp < 0:\n    print("Мороз")\nelif temp < 20:\n    print("Прохладно")\nelse:\n    print("Тепло")', 'Проверки идут от меньшей температуры к большей.'],
    [43, 'conditions.access-code', 'Код доступа', 'Сохранённый код — «лист». При совпадении покажи «Открыто», иначе «Закрыто».', 'code = "лист"\nif code == "лист":\n    print("Открыто")\nelse:\n    print("Закрыто")', 'Сравни строки через ==.'],
    [44, 'conditions.book-discount', 'Скидка на три книги', 'Купили 3 книги по 8 монет. От трёх книг скидка 4 монеты. Выведи итог.', 'count = 3\nprice = 8\nif count >= 3:\n    print(count * price - 4)\nelse:\n    print(count * price)', 'Рассчитай цену в обеих ветках условия.'],
  ] },
  { id: 8, tasks: [
    [45, 'loops.three-signals', 'Три сигнала', 'Выведи «Готово» три раза с помощью одного цикла.', 'for i in range(3):\n    print("Готово")', 'range(3) задаёт три повторения.'],
    [46, 'loops.countdown', 'Обратный отсчёт', 'Покажи 3, 2, 1 на отдельных строках, используя цикл.', 'for i in range(3, 0, -1):\n    print(i)', 'Отрицательный шаг ведёт счёт назад.'],
    [47, 'loops.even-numbers', 'Чётные номера', 'Покажи 2, 4 и 6 через range с шагом 2.', 'for i in range(2, 8, 2):\n    print(i)', 'Третий аргумент range — шаг.'],
    [48, 'loops.sum-four-days', 'Сумма четырёх дней', 'За дни получили 1, 2, 3 и 4 монеты. Накопи сумму циклом и выведи её.', 'total = 0\nfor i in range(1, 5):\n    total = total + i\nprint(total)', 'Начни с нуля и добавляй номер каждого дня.'],
    [49, 'loops.savings', 'Копилка', 'Каждый из трёх дней откладывали 5 монет. Накопи итог циклом.', 'money = 0\nfor day in range(3):\n    money = money + 5\nprint(money)', 'Добавляй 5 к текущей сумме на каждом шаге.'],
    [50, 'loops.while-count', 'Пока не пять', 'Начни с 1 и выводи числа до 5 включительно с помощью while.', 'n = 1\nwhile n <= 5:\n    print(n)\n    n = n + 1', 'Внутри while число должно меняться.'],
    [51, 'loops.remaining-tickets', 'Остались билеты', 'В кассе 3 билета. Пока билеты есть, показывай остаток и уменьшай его.', 'tickets = 3\nwhile tickets > 0:\n    print(tickets)\n    tickets = tickets - 1', 'После каждого вывода убирай один билет.'],
    [52, 'loops.times-two', 'Таблица двоек', 'Выведи 2, 4, 6, 8 через цикл и умножение.', 'for i in range(1, 5):\n    print(i * 2)', 'Номер шага умножай на два.'],
    [53, 'loops.nested-grid', 'Ячейки сетки', 'Выведи номера ячеек 11, 12, 21, 22 двумя вложенными циклами.', 'for row in range(1, 3):\n    for col in range(1, 3):\n        print(row * 10 + col)', 'Внешний цикл отвечает за десятки, внутренний — за единицы.'],
    [54, 'loops.count-odd', 'Сколько нечётных', 'Посчитай нечётные числа от 1 до 7 и выведи количество.', 'count = 0\nfor i in range(1, 8):\n    if i % 2 != 0:\n        count = count + 1\nprint(count)', 'Если остаток от деления на два не ноль, увеличь счётчик.'],
    [55, 'loops.sum-squares', 'Сумма квадратов', 'Вычисли циклом 1² + 2² + 3² и выведи сумму.', 'total = 0\nfor i in range(1, 4):\n    total = total + i * i\nprint(total)', 'На каждом шаге добавляй i × i.'],
  ] },
  { id: 9, tasks: [
    [56, 'functions.hello-twice', 'Позови дважды', 'Создай функцию hello, которая печатает «Привет», и вызови её дважды.', 'def hello():\n    print("Привет")\nhello()\nhello()', 'Определение только описывает действие; его нужно вызвать.'],
    [57, 'functions.greeting', 'Имя для приветствия', 'Функция greet принимает имя. Вызови её с «Мира» и напечатай «Привет, Мира».', 'def greet(name):\n    print("Привет, " + name)\ngreet("Мира")', 'Параметр name получает значение при вызове.'],
    [58, 'functions.square', 'Квадрат числа', 'Создай square с аргументом n; она возвращает n × n. Покажи square(4).', 'def square(n):\n    return n * n\nprint(square(4))', 'return передаёт вычисленное значение наружу.'],
    [59, 'functions.double', 'Удвой два числа', 'Функция double возвращает удвоенное число. Покажи результаты для 3 и 5.', 'def double(n):\n    return n * 2\nprint(double(3))\nprint(double(5))', 'Одну функцию можно вызвать с разными аргументами.'],
    [60, 'functions.entry', 'Можно войти?', 'Функция can_enter получает возраст и возвращает результат проверки 18+. Покажи ответ для 16.', 'def can_enter(age):\n    return age >= 18\nprint(can_enter(16))', 'Верни True или False из сравнения.'],
    [61, 'functions.perimeter', 'Периметр комнаты', 'Функция perimeter принимает длину 5 и ширину 3. Верни и покажи периметр.', 'def perimeter(a, b):\n    return 2 * (a + b)\nprint(perimeter(5, 3))', 'Периметр прямоугольника — две длины и две ширины.'],
    [62, 'functions.label', 'Ярлык для текста', 'Функция label добавляет перед текстом «>> ». Покажи ярлык для «План».', 'def label(text):\n    return ">> " + text\nprint(label("План"))', 'Строки можно соединять внутри функции.'],
    [63, 'functions.sum-to', 'Сумма до числа', 'Функция sum_to(n) складывает числа от 1 до n. Покажи результат для 4.', 'def sum_to(n):\n    total = 0\n    for i in range(1, n + 1):\n        total = total + i\n    return total\nprint(sum_to(4))', 'Накопи сумму внутри цикла и верни после него.'],
    [64, 'functions.is-even', 'Чётное или нет', 'Функция is_even возвращает True для чётного числа. Проверь 9.', 'def is_even(n):\n    return n % 2 == 0\nprint(is_even(9))', 'Используй остаток от деления на два.'],
    [65, 'functions.discount', 'Скидка в функции', 'Функция final_price уменьшает цену на 3, если товаров хотя бы два. Покажи цену для 2 товаров по 8.', 'def final_price(count, price):\n    total = count * price\n    if count >= 2:\n        return total - 3\n    return total\nprint(final_price(2, 8))', 'Сначала вычисли итог, затем реши, нужна ли скидка.'],
    [66, 'functions.two-greetings', 'Один шаблон, два вызова', 'Функция message(name) печатает «Привет, имя». Поздоровайся с Леей и Мирой.', 'def message(name):\n    print("Привет, " + name)\nmessage("Лея")\nmessage("Мира")', 'Вызови одну функцию два раза с разными именами.'],
  ] },
  { id: 10, tasks: [
    [67, 'lists.first-index', 'Первое имя', 'В списке Лея и Мира. Покажи первое имя по индексу.', 'names = ["Лея", "Мира"]\nprint(names[0])', 'Отсчёт индексов начинается с нуля.'],
    [68, 'lists.last-score', 'Последний балл', 'В списке 3, 5, 8. Покажи последний балл.', 'scores = [3, 5, 8]\nprint(scores[2])', 'У трёх элементов индексы 0, 1, 2.'],
    [69, 'lists.length', 'Сколько книг', 'В списке три книги. Выведи его длину через len.', 'books = ["Код", "Игра", "Мир"]\nprint(len(books))', 'len возвращает число элементов списка.'],
    [70, 'lists.negative-index', 'Последняя карточка', 'Покажи последнюю карточку списка 4, 7, 9 через отрицательный индекс.', 'cards = [4, 7, 9]\nprint(cards[-1])', 'Индекс −1 берёт элемент с конца.'],
    [71, 'lists.iterate-names', 'Имена по очереди', 'Выведи Лея, Мира и Олег по одному имени в строке через цикл по списку.', 'names = ["Лея", "Мира", "Олег"]\nfor name in names:\n    print(name)', 'Цикл может брать сразу значения списка.'],
    [72, 'lists.sum-prices', 'Сумма покупок', 'Цены 4, 6, 3. Сложи их циклом и покажи сумму.', 'prices = [4, 6, 3]\ntotal = 0\nfor price in prices:\n    total = total + price\nprint(total)', 'Начни с нуля и добавляй каждую цену.'],
    [73, 'lists.maximum', 'Лучший результат', 'Баллы 4, 9, 6. Найди максимум циклом без готовой функции max.', 'scores = [4, 9, 6]\nbest = scores[0]\nfor score in scores:\n    if score > best:\n        best = score\nprint(best)', 'Сравнивай каждый балл с лучшим найденным.'],
    [74, 'lists.replace-item', 'Исправь оценку', 'Оценки 3, 2, 5. Замени вторую на 4 и покажи список.', 'grades = [3, 2, 5]\ngrades[1] = 4\nprint(grades)', 'Индекс второй позиции равен 1.'],
    [75, 'lists.count-even', 'Сколько чётных', 'В списке 1, 2, 4, 7, 8 посчитай чётные числа.', 'numbers = [1, 2, 4, 7, 8]\ncount = 0\nfor number in numbers:\n    if number % 2 == 0:\n        count = count + 1\nprint(count)', 'Проверяй каждое значение и увеличивай счётчик.'],
    [76, 'lists.filter-prices', 'Цены выше порога', 'В списке 4, 11, 7, 15 покажи только цены выше 10.', 'prices = [4, 11, 7, 15]\nfor price in prices:\n    if price > 10:\n        print(price)', 'Условие должно находиться внутри цикла.'],
    [77, 'lists.running-total', 'Счёт по дням', 'За три дня собрали 2, 3, 4 жетона. Покажи накопленную сумму после каждого дня.', 'days = [2, 3, 4]\ntotal = 0\nfor amount in days:\n    total = total + amount\n    print(total)', 'Выводи сумму внутри цикла после добавления.'],
    [78, 'lists.basket-total', 'Корзина покупок', 'В корзине цены 5, 8, 2. Покажи количество товаров и общую стоимость.', 'prices = [5, 8, 2]\ntotal = 0\nfor price in prices:\n    total = total + price\nprint(len(prices))\nprint(total)', 'Количество даёт len, итог накопи циклом.'],
  ] },
  { id: 11, tasks: [
    [79, 'input.greeting', 'Поздоровайся с гостем', 'Получи имя через input и напечатай «Привет, имя».', 'name = input()\nprint("Привет, " + name)', 'input возвращает текст; сохрани его в переменной.', [['Мира'], ['Олег']]],
    [80, 'input.next-year', 'Через год', 'Получи возраст числом и покажи, сколько лет будет через год.', 'age = int(input())\nprint(age + 1)', 'input возвращает строку, int превращает её в число.', [['12'], ['20']]],
    [81, 'input.add', 'Сложи два ввода', 'Получи два целых числа и выведи их сумму.', 'a = int(input())\nb = int(input())\nprint(a + b)', 'Преобразуй оба введённых значения.', [['3', '5'], ['10', '2']]],
    [82, 'input.order-price', 'Цена заказа', 'Получи цену и количество, затем выведи стоимость.', 'price = int(input())\ncount = int(input())\nprint(price * count)', 'Стоимость равна цене, умноженной на количество.', [['7', '3'], ['4', '5']]],
    [83, 'input.age-threshold', 'Возрастной порог', 'Получи возраст. Покажи «Можно» от 18 лет, иначе «Рано».', 'age = int(input())\nif age >= 18:\n    print("Можно")\nelse:\n    print("Рано")', 'Сравни число с 18 в условии.', [['16'], ['21']]],
    [84, 'input.password', 'Секретное слово', 'Получи слово. Для «лист» покажи «Открыто», иначе «Закрыто».', 'word = input()\nif word == "лист":\n    print("Открыто")\nelse:\n    print("Закрыто")', 'Сравни строки через ==.', [['лист'], ['камень']]],
    [85, 'input.weather', 'Тёплая погода', 'Получи температуру. От 20 покажи «Тепло», иначе «Прохладно».', 'temp = int(input())\nif temp >= 20:\n    print("Тепло")\nelse:\n    print("Прохладно")', 'Преобразуй ввод в число перед сравнением.', [['24'], ['12']]],
    [86, 'input.repeat-name', 'Повтори имя', 'Получи имя и выведи его трижды через цикл.', 'name = input()\nfor i in range(3):\n    print(name)', 'Имя вводят один раз, затем цикл печатает его трижды.', [['Лея'], ['Мира']]],
    [87, 'input.signal-count', 'Сигнал нужное число раз', 'Получи число n и выведи «Сигнал» ровно n раз.', 'n = int(input())\nfor i in range(n):\n    print("Сигнал")', 'Используй n как границу range.', [['2'], ['4']]],
    [88, 'input.change', 'Сдача в магазине', 'Получи сумму оплаты и цену покупки. Покажи сдачу.', 'paid = int(input())\nprice = int(input())\nprint(paid - price)', 'Вычти цену из оплаты.', [['20', '13'], ['50', '32']]],
    [89, 'input.receipt', 'Мини-чек', 'Получи имя товара, цену и количество. Покажи имя и затем итоговую стоимость.', 'name = input()\nprice = int(input())\ncount = int(input())\nprint(name)\nprint(price * count)', 'Сначала выведи название, затем произведение цены на количество.', [['Книга', '8', '2'], ['Мяч', '5', '3']]],
  ] },
  { id: 12, tasks: [
    [90, 'drawing.first-line', 'Первая линия', 'Нарисуй линию длиной 60 командой forward.', 'forward(60)', 'forward принимает длину движения.'],
    [91, 'drawing.corner', 'Поверни за угол', 'Нарисуй две линии по 40 с поворотом вправо на 90 градусов между ними.', 'forward(40)\nright(90)\nforward(40)', 'После первой линии поверни на прямой угол.'],
    [92, 'drawing.square-loop', 'Квадрат циклом', 'Нарисуй квадрат со стороной 50 одним циклом.', 'for i in range(4):\n    forward(50)\n    right(90)', 'У квадрата четыре одинаковые стороны и поворота.'],
    [93, 'drawing.triangle', 'Треугольник', 'Нарисуй равносторонний треугольник со стороной 50 через цикл.', 'for i in range(3):\n    forward(50)\n    right(120)', 'Внешний поворот треугольника равен 120 градусам.'],
    [94, 'drawing.rectangle', 'Прямоугольник', 'Нарисуй прямоугольник со сторонами 80 и 40.', 'for i in range(2):\n    forward(80)\n    right(90)\n    forward(40)\n    right(90)', 'Пара длинной и короткой сторон повторяется дважды.'],
    [95, 'drawing.hexagon', 'Шестиугольник', 'Нарисуй правильный шестиугольник со стороной 30.', 'for i in range(6):\n    forward(30)\n    right(60)', 'Угол внешнего поворота — 360 / 6.'],
    [96, 'drawing.variable-size', 'Размер в переменной', 'Сохрани размер 70 и нарисуй квадрат, используя эту переменную.', 'size = 70\nfor i in range(4):\n    forward(size)\n    right(90)', 'Перед циклом запомни длину стороны.'],
    [97, 'drawing.stairs', 'Лестница', 'Нарисуй три ступени: вправо 30, поворот, вверх 30 — и так три раза.', 'for i in range(3):\n    forward(30)\n    left(90)\n    forward(30)\n    right(90)', 'Одна ступень состоит из двух отрезков.'],
    [98, 'drawing.square-function', 'Функция рисует квадрат', 'Создай функцию square(size), которая рисует квадрат. Вызови её для стороны 40.', 'def square(size):\n    for i in range(4):\n        forward(size)\n        right(90)\nsquare(40)', 'Внутри функции повтори четыре стороны.'],
    [99, 'drawing.flower', 'Цветок из квадратов', 'Нарисуй четыре квадрата со стороной 30, поворачивая начало каждого на 90 градусов.', 'def square():\n    for i in range(4):\n        forward(30)\n        right(90)\nfor j in range(4):\n    square()\n    right(90)', 'Квадрат возвращает черепашку к началу; затем поверни направление.'],
    [100, 'drawing.star-project', 'Звезда Кодика', 'Итоговый проект: функция рисует пятиконечную звезду из линий по 80. Используй цикл и вызови функцию.', 'def star(size):\n    for i in range(5):\n        forward(size)\n        right(144)\nstar(80)', 'Для звезды после каждого луча поверни на 144 градуса.'],
  ] },
]

const chapterNames: Record<number, { title: string; description: string }> = {
  6: { title: 'Данные в деле', description: 'Строки, вычисления и переменные в маленьких задачах.' },
  7: { title: 'Решения программы', description: 'Условия с несколькими исходами.' },
  8: { title: 'Циклы и накопление', description: 'Повторения, счётчики и суммы.' },
  9: { title: 'Функции с аргументами', description: 'Один шаблон для разных данных.' },
  10: { title: 'Списки', description: 'Храни и обрабатывай несколько значений.' },
  11: { title: 'Ввод и мини-программы', description: 'Программа отвечает на реальные данные пользователя.' },
  12: { title: 'Рисование и проекты', description: 'Собери рисунок из команд, циклов и функций.' },
}

export const extendedChapters = extendedSeeds.map(({ id }) => ({ id, ...chapterNames[id], required: 0 }))

const scaffolds: Record<number, { prefix: string; suffix: string; answer: string; choices: string[] }> = {
  57: { prefix: 'def greet(name):\n    print("Привет, " + name)\n', suffix: '', answer: 'greet("Мира")', choices: ['greet("Мира")', 'greet(name)', 'print("name")'] },
  67: { prefix: 'names = ["Лея", "Мира"]\nprint(names[', suffix: '])', answer: '0', choices: ['0', '1', '2'] },
  79: { prefix: 'name = ', suffix: '\nprint("Привет, " + name)', answer: 'input()', choices: ['input()', 'print()', 'int()'] },
  90: { prefix: '', suffix: '(60)', answer: 'forward', choices: ['forward', 'right', 'left'] },
}
export function buildExtendedLessons(seeds: typeof extendedSeeds): Lesson[] {
  const result = seeds.flatMap(({ id: chapter, tasks }) => tasks.map(([id, key, title, goal, code, hint, scenarios]): Lesson => {
  if (!lessonObjectives[id]) throw new Error(`Missing objectives for stable lesson ${id}`)
  const inputs = scenarios || [[]]
  const reference = runCourseProgram(code, inputs[0])
  if (reference.error || (!reference.output.length && !reference.segments.length)) throw new Error(`Некорректное задание ${id}: ${reference.error || 'нет результата'}`)
  const scaffold = scaffolds[id]
  const material = courseMaterials[chapter]
  return {
    id, key, chapter, title, goal, instruction: `${goal}\n\n${material.explanation}`, kicker: chapterNames[chapter].title,
    mode: scaffold ? 'completion' : 'text', supportLevel: scaffold ? 'guided_code' : 'free_code', difficulty: Math.min(5, Math.max(1, chapter - 5)) as 1 | 2 | 3 | 4 | 5,
    hint, starterHint: hint, progressiveHints: [material.plan, hint, `${hint} Проверь ожидаемый результат${reference.output.length ? `: ${reference.output.join(' → ')}` : ' на рисунке'}.`],
    codeNote: 'Напиши программу сам. Проверка запустит её и сравнит результат с заданием.',
    expectedOutput: reference.output, answer: scaffold?.answer || code, codeAnswer: code,
    ...(scaffold ? { prefix: scaffold.prefix, suffix: scaffold.suffix, choices: scaffold.choices } : {}),
    starter: {}, solution: {}, allowed: [], validate: () => null,
    skills: lessonObjectives[id].skills,
    extended: { inputs, rules: lessonObjectives[id].rules, drawing: chapter === 12 },
    success: chapter === 12 ? 'Рисунок получился. Ты собрал его из команд Python.' : 'Программа дала нужный результат. Попробуй объяснить, почему она работает.'
  }
}))
  if (new Set(result.map(item => item.id)).size !== result.length || new Set(result.map(item => item.key)).size !== result.length) throw new Error('Duplicate lesson identity')
  return result
}
export const extendedLessons = buildExtendedLessons(extendedSeeds)
