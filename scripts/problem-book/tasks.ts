// «Задачник Kodik»: original practice problems in the order of a classic school problem book
// (input/output, arithmetic, integer division, digits, logic, branching, while, for, loops with
// conditions, strings, the Robot, the turtle). Every task fits the teaching interpreter and is
// exported, checked (against CPython where there is text to compare) and installed by
// scripts/export-problem-book.ts → server/b2b/problem-book.json.
// `wrong` is a characteristic mistake (a boundary, / instead of //, a loop that starts at 0): the
// quality gate proves the tests catch it.

/** Strips the first newline and the common indentation, so programs can be written in place. */
const py = (strings: TemplateStringsArray) => {
  const lines = strings.raw.join("").replace(/^\n/, "").replace(/\s+$/, "").split("\n");
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(indent)).join("\n");
};
/** A Robot field written row by row (see src/python/robotWorld.ts: R robot, * to fill, P parking). */
const field = (...rows: string[]) => rows.join("\n");
// A Robot task gives `worlds` (one test per field, checked by "robot"); a turtle task sets `draw`
// (one test per input set, the picture compared with the reference's).
export type Problem = { key: string; title: string; text: string; code: string; inputs?: string[][]; worlds?: string[]; draw?: true; wrong: string; hint: string };
export type Chapter = { key: string; title: string; description: string; theory: string; rules: string[]; question: [string, string[], number, string]; learned: string[]; tasks: Problem[] };

export const chapters: Chapter[] = [
  {
    key: "io", title: "Ввод и вывод", description: "print показывает результат, input получает данные от пользователя.",
    theory: "print(...) выводит значения на экран; несколько значений через запятую печатаются через пробел, sep меняет разделитель. input() читает одну строку — это всегда текст. Строки соединяются знаком +, а умножение на число повторяет строку.",
    rules: [], learned: ["Выводить текст и числа", "Читать строку через input()", "Соединять и повторять строки"],
    question: ["Что напечатает print(\"ко\" * 2 + \"т\")?", ["кокот", "кот кот", "ко2т"], 0, "\"ко\" * 2 — это \"коко\", а + приписывает \"т\"."],
    tasks: [
      { key: "hello", title: "Первое приветствие", text: "Выведи строку «Привет, мир!».", code: py`
        print("Привет, мир!")`, wrong: 'print("Привет мир")', hint: "Текст пишется в кавычках внутри print(...). Запятая и восклицательный знак тоже нужны." },
      { key: "two-lines", title: "Две строки", text: "Выведи слово «Кодик» на первой строке и «учит Python» — на второй.", code: py`
        print("Кодик")
        print("учит Python")`, wrong: 'print("Кодик учит Python")', hint: "Каждый print начинает новую строку." },
      { key: "greet", title: "Привет по имени", text: "Прочитай имя и выведи «Привет, <имя>!». Например, для Мира: «Привет, Мира!».", inputs: [["Мира"], ["Олег"], ["Ян"]], code: py`
        name = input()
        print("Привет, " + name + "!")`, wrong: 'name = input()\nprint("Привет, " + name)', hint: "Соедини три части знаком +: начало фразы, имя и восклицательный знак." },
      { key: "triple", title: "Эхо", text: "Прочитай слово и выведи его три раза через пробел.", inputs: [["эхо"], ["да"], ["Kodik"]], code: py`
        word = input()
        print(word, word, word)`, wrong: "word = input()\nprint(word * 3)", hint: "print(a, b, c) ставит между значениями пробел." },
      { key: "dashes", title: "Через дефис", text: "Выведи числа 7, 8 и 9 через дефис: 7-8-9.", code: py`
        print(7, 8, 9, sep="-")`, wrong: "print(7, 8, 9)", hint: "Разделитель задаёт параметр sep." },
      { key: "sum", title: "Сумма двух чисел", text: "Прочитай два целых числа (каждое на своей строке) и выведи их сумму.", inputs: [["3", "5"], ["10", "-4"], ["0", "0"], ["250", "750"]], code: py`
        a = int(input())
        b = int(input())
        print(a + b)`, wrong: "a = input()\nb = input()\nprint(a + b)", hint: "input() даёт текст. Чтобы сложить числа, преврати их через int()." },
      { key: "neighbours", title: "Соседи числа", text: "Прочитай целое число и выведи предыдущее число на первой строке и следующее — на второй.", inputs: [["5"], ["0"], ["-10"]], code: py`
        n = int(input())
        print(n - 1)
        print(n + 1)`, wrong: "n = int(input())\nprint(n + 1)\nprint(n - 1)", hint: "Сначала то, что меньше, потом то, что больше." },
      { key: "frame", title: "Слово в рамке", text: "Прочитай слово и выведи его в рамке из звёздочек: строка звёздочек, затем *слово*, затем снова звёздочки. Длина рамки равна длине слова плюс 2.", inputs: [["кот"], ["Python"], ["я"]], code: py`
        word = input()
        line = "*" * (len(word) + 2)
        print(line)
        print("*" + word + "*")
        print(line)`, wrong: 'word = input()\nprint("*****")\nprint("*" + word + "*")\nprint("*****")', hint: "len(word) — длина слова. Строку можно повторить умножением: \"*\" * 5." },
    ],
  },
  {
    key: "arith", title: "Арифметика", description: "Python считает: сложение, вычитание, умножение, деление и степень.",
    theory: "Знаки + - * / ** — сложение, вычитание, умножение, деление и степень. Деление / всегда даёт дробное число: 6 / 3 == 2.0. Скобки меняют порядок действий, как в математике.",
    rules: [], learned: ["Записывать формулы в Python", "Понимать, когда получается дробное число", "Расставлять скобки"],
    question: ["Что напечатает print((2 + 3) * 2 ** 2)?", ["20", "100", "14"], 0, "Сначала скобки (5) и степень (4), потом умножение: 5 * 4 = 20."],
    tasks: [
      { key: "rect", title: "Прямоугольник", text: "Прочитай длину и ширину прямоугольника (целые числа). Выведи площадь на первой строке и периметр — на второй.", inputs: [["3", "4"], ["10", "1"], ["7", "7"]], code: py`
        a = int(input())
        b = int(input())
        print(a * b)
        print(2 * (a + b))`, wrong: "a = int(input())\nb = int(input())\nprint(a * b)\nprint(a + b)", hint: "Периметр — сумма всех четырёх сторон." },
      { key: "seconds", title: "Часы в секунды", text: "Прочитай число часов и выведи, сколько это секунд.", inputs: [["1"], ["2"], ["24"]], code: py`
        h = int(input())
        print(h * 3600)`, wrong: "h = int(input())\nprint(h * 60)", hint: "В часе 60 минут, а в минуте 60 секунд." },
      { key: "average", title: "Среднее трёх", text: "Прочитай три целых числа и выведи их среднее арифметическое.", inputs: [["1", "2", "3"], ["4", "5", "9"], ["1", "1", "2"]], code: py`
        a = int(input())
        b = int(input())
        c = int(input())
        print((a + b + c) / 3)`, wrong: "a = int(input())\nb = int(input())\nc = int(input())\nprint(a + b + c / 3)", hint: "Сумму всех трёх чисел нужно взять в скобки, а потом разделить." },
      { key: "fahrenheit", title: "Градусы Фаренгейта", text: "Прочитай температуру в градусах Цельсия и переведи её в градусы Фаренгейта по формуле F = C · 9 / 5 + 32.", inputs: [["0"], ["100"], ["-40"], ["37"]], code: py`
        c = int(input())
        print(c * 9 / 5 + 32)`, wrong: "c = int(input())\nprint(c * 9 / 5)", hint: "Не забудь прибавить 32." },
      { key: "discount", title: "Скидка", text: "Прочитай цену товара и скидку в процентах. Выведи цену со скидкой.", inputs: [["200", "10"], ["999", "50"], ["80", "0"]], code: py`
        price = int(input())
        percent = int(input())
        print(price - price * percent / 100)`, wrong: "price = int(input())\npercent = int(input())\nprint(price * percent / 100)", hint: "Скидка — это price * percent / 100. Её нужно вычесть из цены." },
      { key: "powers", title: "Квадрат и куб", text: "Прочитай целое число и выведи в одной строке его квадрат и куб.", inputs: [["2"], ["5"], ["-3"]], code: py`
        n = int(input())
        print(n ** 2, n ** 3)`, wrong: "n = int(input())\nprint(n * 2, n * 3)", hint: "Степень записывается двумя звёздочками: n ** 2." },
      { key: "cube", title: "Кубик", text: "Прочитай длину ребра куба. Выведи его объём на первой строке и площадь поверхности — на второй.", inputs: [["1"], ["3"], ["10"]], code: py`
        a = int(input())
        print(a ** 3)
        print(6 * a ** 2)`, wrong: "a = int(input())\nprint(a ** 3)\nprint(4 * a ** 2)", hint: "У куба шесть одинаковых квадратных граней." },
      { key: "change", title: "Сдача", text: "Карандаш стоит x рублей. Прочитай x, количество карандашей n и сумму денег m. Выведи сдачу.", inputs: [["15", "4", "100"], ["7", "3", "21"], ["30", "1", "50"]], code: py`
        x = int(input())
        n = int(input())
        m = int(input())
        print(m - x * n)`, wrong: "x = int(input())\nn = int(input())\nm = int(input())\nprint(m - x)", hint: "Сначала посчитай, сколько стоят все карандаши." },
    ],
  },
  {
    key: "ints", title: "Целые числа", description: "Целочисленное деление // и остаток %: делим поровну и узнаём, что осталось.",
    theory: "a // b — сколько раз b целиком помещается в a; a % b — остаток. 17 // 5 == 3, 17 % 5 == 2. Остаток от деления на 10 — последняя цифра числа, деление на 10 нацело её отбрасывает.",
    rules: [], learned: ["Делить нацело через //", "Находить остаток через %", "Переводить минуты и секунды"],
    question: ["Что напечатает print(17 // 5, 17 % 5)?", ["3 2", "3.4 2", "2 3"], 0, "5 помещается в 17 три раза, и остаётся 2."],
    tasks: [
      { key: "candies", title: "Конфеты поровну", text: "Прочитай число конфет и число детей. Выведи, сколько конфет достанется каждому, и сколько останется (на отдельных строках).", inputs: [["17", "5"], ["20", "4"], ["3", "7"]], code: py`
        n = int(input())
        k = int(input())
        print(n // k)
        print(n % k)`, wrong: "n = int(input())\nk = int(input())\nprint(n / k)\nprint(n % k)", hint: "Деление нацело — //, остаток — %." },
      { key: "minutes", title: "Часы и минуты", text: "Прочитай число минут и выведи в одной строке, сколько это полных часов и сколько минут сверх них.", inputs: [["150"], ["59"], ["60"], ["600"]], code: py`
        m = int(input())
        print(m // 60, m % 60)`, wrong: "m = int(input())\nprint(m / 60, m % 60)", hint: "В часе 60 минут. Полные часы — деление нацело." },
      { key: "last-digit", title: "Последняя цифра", text: "Прочитай натуральное число и выведи его последнюю цифру.", inputs: [["123"], ["7"], ["4560"]], code: py`
        n = int(input())
        print(n % 10)`, wrong: "n = int(input())\nprint(n // 10)", hint: "Последняя цифра — остаток от деления на 10." },
      { key: "drop-digit", title: "Без последней цифры", text: "Прочитай натуральное число и выведи его без последней цифры (для однозначного числа получится 0).", inputs: [["123"], ["7"], ["4560"]], code: py`
        n = int(input())
        print(n // 10)`, wrong: "n = int(input())\nprint(n % 10)", hint: "Деление на 10 нацело отбрасывает последнюю цифру." },
      { key: "tens", title: "Цифра десятков", text: "Прочитай натуральное число и выведи цифру его десятков (для однозначного числа — 0).", inputs: [["123"], ["45"], ["7"], ["9081"]], code: py`
        n = int(input())
        print(n // 10 % 10)`, wrong: "n = int(input())\nprint(n // 10)", hint: "Отбрось последнюю цифру, и десятки станут последней цифрой." },
      { key: "buses", title: "Автобусы", text: "В экскурсию едут n учеников, в автобусе k мест. Прочитай n и k и выведи, сколько автобусов нужно.", inputs: [["30", "10"], ["31", "10"], ["1", "40"], ["99", "33"]], code: py`
        n = int(input())
        k = int(input())
        print((n + k - 1) // k)`, wrong: "n = int(input())\nk = int(input())\nprint(n // k)", hint: "Если кто-то не поместился, нужен ещё один автобус. Попробуй прибавить k - 1 перед делением." },
      { key: "clock", title: "Электронные часы", text: "Прочитай, сколько секунд прошло с полуночи, и выведи в одной строке часы и минуты на электронных часах.", inputs: [["3600"], ["3661"], ["86399"], ["59"]], code: py`
        s = int(input())
        print(s // 3600, s % 3600 // 60)`, wrong: "s = int(input())\nprint(s // 3600, s // 60)", hint: "Минуты считаются только из того, что осталось после полных часов." },
      { key: "weekday", title: "День недели", text: "Год начался с понедельника. Прочитай номер дня в году (с 1) и выведи номер дня недели: 1 — понедельник, 7 — воскресенье.", inputs: [["1"], ["7"], ["8"], ["365"]], code: py`
        n = int(input())
        print((n - 1) % 7 + 1)`, wrong: "n = int(input())\nprint(n % 7)", hint: "Для 7-го дня ответ 7, а не 0: сдвинь нумерацию на один перед остатком и верни обратно." },
    ],
  },
  {
    key: "digits", title: "Цифры числа", description: "Разбираем трёхзначное число на цифры и собираем новые числа.",
    theory: "Для трёхзначного числа n: сотни — n // 100, десятки — n // 10 % 10, единицы — n % 10. Число из цифр a, b, c — это a * 100 + b * 10 + c.",
    rules: [], learned: ["Выделять сотни, десятки и единицы", "Собирать число из цифр"],
    question: ["Какая цифра у числа 472 получится из 472 // 10 % 10?", ["4", "7", "2"], 1, "472 // 10 = 47, а 47 % 10 = 7 — это десятки."],
    tasks: [
      { key: "sum", title: "Сумма цифр", text: "Прочитай трёхзначное число и выведи сумму его цифр.", inputs: [["123"], ["909"], ["100"]], code: py`
        n = int(input())
        print(n // 100 + n // 10 % 10 + n % 10)`, wrong: "n = int(input())\nprint(n // 100 + n % 10)", hint: "Найди отдельно сотни, десятки и единицы и сложи их." },
      { key: "product", title: "Произведение цифр", text: "Прочитай трёхзначное число и выведи произведение его цифр.", inputs: [["123"], ["999"], ["105"]], code: py`
        n = int(input())
        print((n // 100) * (n // 10 % 10) * (n % 10))`, wrong: "n = int(input())\nprint((n // 100) * (n % 10))", hint: "Перемножь сотни, десятки и единицы." },
      { key: "first", title: "Первая цифра", text: "Прочитай трёхзначное число и выведи его первую цифру.", inputs: [["472"], ["100"], ["999"]], code: py`
        n = int(input())
        print(n // 100)`, wrong: "n = int(input())\nprint(n % 100)", hint: "В трёхзначном числе первая цифра — это сотни." },
      { key: "reverse", title: "Наоборот", text: "Прочитай трёхзначное число и выведи число, записанное теми же цифрами в обратном порядке (ведущие нули пропадают: 120 → 21).", inputs: [["123"], ["120"], ["505"]], code: py`
        n = int(input())
        a = n // 100
        b = n // 10 % 10
        c = n % 10
        print(c * 100 + b * 10 + a)`, wrong: "n = int(input())\na = n // 100\nb = n // 10 % 10\nc = n % 10\nprint(c, b, a)", hint: "Собери новое число: единицы станут сотнями, а сотни — единицами." },
      { key: "swap", title: "Поменяй две последние", text: "Прочитай трёхзначное число и поменяй местами две его последние цифры: 123 → 132.", inputs: [["123"], ["450"], ["777"]], code: py`
        n = int(input())
        a = n // 100
        b = n // 10 % 10
        c = n % 10
        print(a * 100 + c * 10 + b)`, wrong: "n = int(input())\na = n // 100\nb = n // 10 % 10\nc = n % 10\nprint(c * 100 + b * 10 + a)", hint: "Сотни остаются на месте, меняются только десятки и единицы." },
      { key: "build", title: "Число из цифр", text: "Прочитай три цифры (каждую на своей строке) и выведи трёхзначное число из них в том же порядке.", inputs: [["1", "2", "3"], ["9", "0", "5"], ["4", "4", "0"]], code: py`
        a = int(input())
        b = int(input())
        c = int(input())
        print(a * 100 + b * 10 + c)`, wrong: "a = int(input())\nb = int(input())\nc = int(input())\nprint(a + b + c)", hint: "Первая цифра означает сотни, вторая — десятки." },
    ],
  },
  {
    key: "logic", title: "Логические выражения", description: "Сравнения дают True или False; and, or и not собирают из них сложные условия.",
    theory: "Сравнения == != < > <= >= дают True или False. and — истина, если верны оба условия, or — если верно хотя бы одно, not меняет ответ на противоположный.",
    rules: [], learned: ["Записывать сравнения", "Соединять условия через and и or"],
    question: ["Что напечатает print(5 > 3 and 2 > 4)?", ["True", "False", "5"], 1, "and требует, чтобы оба условия были верны, а 2 > 4 — ложь."],
    tasks: [
      { key: "positive", title: "Положительное?", text: "Прочитай целое число и выведи True, если оно больше нуля, иначе False.", inputs: [["5"], ["0"], ["-3"]], code: py`
        n = int(input())
        print(n > 0)`, wrong: "n = int(input())\nprint(n >= 0)", hint: "Ноль не положительный." },
      { key: "even", title: "Чётное?", text: "Прочитай целое число и выведи True, если оно чётное.", inputs: [["4"], ["7"], ["0"]], code: py`
        n = int(input())
        print(n % 2 == 0)`, wrong: "n = int(input())\nprint(n % 2 == 1)", hint: "Чётное число делится на 2 без остатка." },
      { key: "range", title: "От 10 до 20", text: "Прочитай число и выведи True, если оно не меньше 10 и не больше 20.", inputs: [["15"], ["10"], ["20"], ["21"], ["9"]], code: py`
        n = int(input())
        print(n >= 10 and n <= 20)`, wrong: "n = int(input())\nprint(n > 10 and n < 20)", hint: "Края тоже подходят: 10 и 20 — внутри." },
      { key: "three-five", title: "На 3 или на 5", text: "Прочитай число и выведи True, если оно делится на 3 или на 5.", inputs: [["9"], ["10"], ["15"], ["7"]], code: py`
        n = int(input())
        print(n % 3 == 0 or n % 5 == 0)`, wrong: "n = int(input())\nprint(n % 3 == 0 and n % 5 == 0)", hint: "Достаточно, чтобы выполнилось хотя бы одно условие." },
      { key: "two-digit", title: "Двузначное?", text: "Прочитай натуральное число и выведи True, если оно двузначное.", inputs: [["10"], ["99"], ["9"], ["100"]], code: py`
        n = int(input())
        print(n >= 10 and n <= 99)`, wrong: "n = int(input())\nprint(n >= 10)", hint: "У двузначного числа есть и нижняя, и верхняя граница." },
      { key: "triangle", title: "Треугольник", text: "Прочитай три длины отрезков и выведи True, если из них можно сложить треугольник: каждая сторона меньше суммы двух других.", inputs: [["3", "4", "5"], ["1", "2", "3"], ["10", "1", "1"], ["1", "1", "10"]], code: py`
        a = int(input())
        b = int(input())
        c = int(input())
        print(a + b > c and a + c > b and b + c > a)`, wrong: "a = int(input())\nb = int(input())\nc = int(input())\nprint(a + b > c)", hint: "Проверь все три стороны, а не одну." },
    ],
  },
  {
    key: "branching", title: "Ветвления", description: "if, elif и else: программа выбирает, что делать.",
    theory: "if условие: — команды с отступом выполняются, только если условие верно. elif проверяет следующее условие, else срабатывает, когда ни одно не подошло. Выполняется только одна ветка.",
    rules: ["kind:if"], learned: ["Выбирать действие через if и else", "Проверять несколько вариантов через elif", "Аккуратно выбирать границы"],
    question: ["Что напечатает программа при n = 0?\nif n > 0:\n    print(\"плюс\")\nelif n < 0:\n    print(\"минус\")\nelse:\n    print(\"ноль\")", ["плюс", "минус", "ноль"], 2, "Ни одно из условий не верно, поэтому срабатывает else."],
    tasks: [
      { key: "max2", title: "Большее из двух", text: "Прочитай два целых числа и выведи большее из них.", inputs: [["3", "8"], ["10", "2"], ["5", "5"]], code: py`
        a = int(input())
        b = int(input())
        if a > b:
            print(a)
        else:
            print(b)`, wrong: "a = int(input())\nb = int(input())\nif a > b:\n    print(b)\nelse:\n    print(a)", hint: "Сравни числа и напечатай то, которое больше." },
      { key: "sign", title: "Знак числа", text: "Прочитай целое число и выведи «положительное», «отрицательное» или «ноль».", inputs: [["5"], ["-2"], ["0"]], code: py`
        n = int(input())
        if n > 0:
            print("положительное")
        elif n < 0:
            print("отрицательное")
        else:
            print("ноль")`, wrong: 'n = int(input())\nif n > 0:\n    print("положительное")\nelse:\n    print("отрицательное")', hint: "Здесь три варианта — понадобится elif." },
      { key: "parity", title: "Чётное или нечётное", text: "Прочитай целое число и выведи «чётное» или «нечётное».", inputs: [["4"], ["7"], ["0"]], code: py`
        n = int(input())
        if n % 2 == 0:
            print("чётное")
        else:
            print("нечётное")`, wrong: 'n = int(input())\nif n % 2 == 1:\n    print("чётное")\nelse:\n    print("нечётное")', hint: "Чётное число делится на 2 без остатка." },
      { key: "ticket", title: "Билет в музей", text: "Прочитай возраст и выведи тип билета: до 14 лет — «детский», с 14 до 64 — «взрослый», с 65 — «льготный».", inputs: [["7"], ["13"], ["14"], ["64"], ["65"]], code: py`
        age = int(input())
        if age < 14:
            print("детский")
        elif age < 65:
            print("взрослый")
        else:
            print("льготный")`, wrong: 'age = int(input())\nif age <= 14:\n    print("детский")\nelif age < 65:\n    print("взрослый")\nelse:\n    print("льготный")', hint: "Проверь границы: 14-летнему нужен взрослый билет." },
      { key: "max3", title: "Большее из трёх", text: "Прочитай три целых числа и выведи наибольшее.", inputs: [["1", "2", "3"], ["2", "8", "5"], ["4", "9", "1"], ["3", "1", "7"]], code: py`
        a = int(input())
        b = int(input())
        c = int(input())
        m = a
        if b > m:
            m = b
        if c > m:
            m = c
        print(m)`, wrong: "a = int(input())\nb = int(input())\nc = int(input())\nif a > b:\n    print(a)\nelse:\n    print(b)", hint: "Запомни первое число как наибольшее и сравни с ним остальные по очереди." },
      { key: "grade", title: "Оценка за тест", text: "Прочитай баллы от 0 до 100 и выведи оценку: меньше 50 — 2, от 50 до 69 — 3, от 70 до 84 — 4, от 85 — 5.", inputs: [["30"], ["50"], ["69"], ["70"], ["84"], ["85"], ["100"]], code: py`
        p = int(input())
        if p < 50:
            print(2)
        elif p < 70:
            print(3)
        elif p < 85:
            print(4)
        else:
            print(5)`, wrong: "p = int(input())\nif p < 50:\n    print(2)\nelif p <= 70:\n    print(3)\nelif p < 85:\n    print(4)\nelse:\n    print(5)", hint: "Проверяй границы по порядку снизу вверх." },
      { key: "leap", title: "Високосный год", text: "Прочитай год и выведи «високосный» или «обычный». Год високосный, если делится на 4, но не на 100, — или если делится на 400.", inputs: [["2024"], ["2023"], ["1900"], ["2000"]], code: py`
        y = int(input())
        if (y % 4 == 0 and y % 100 != 0) or y % 400 == 0:
            print("високосный")
        else:
            print("обычный")`, wrong: 'y = int(input())\nif y % 4 == 0:\n    print("високосный")\nelse:\n    print("обычный")', hint: "1900 делится на 4, но високосным не был: проверь и деление на 100." },
      { key: "lucky", title: "Счастливый билет", text: "Прочитай шестизначный номер билета. Билет счастливый, если сумма первых трёх цифр равна сумме последних трёх. Выведи «счастливый» или «обычный».", inputs: [["123321"], ["123456"], ["555555"], ["100001"]], code: py`
        n = int(input())
        first = n // 100000 + n // 10000 % 10 + n // 1000 % 10
        second = n // 100 % 10 + n // 10 % 10 + n % 10
        if first == second:
            print("счастливый")
        else:
            print("обычный")`, wrong: 'n = int(input())\nif n // 1000 == n % 1000:\n    print("счастливый")\nelse:\n    print("обычный")', hint: "Сравнивать нужно не половины номера, а суммы их цифр." },
    ],
  },
  {
    key: "while", title: "Цикл while", description: "while повторяет команды, пока условие верно.",
    theory: "while условие: повторяет тело, пока условие верно. Внутри цикла переменная должна меняться, иначе он не закончится. Так считают суммы, произведения и количество цифр числа.",
    rules: ["kind:while"], learned: ["Повторять действия через while", "Накапливать сумму и произведение", "Разбирать число на цифры в цикле"],
    question: ["Сколько раз напечатается «ура»?\ni = 0\nwhile i < 3:\n    print(\"ура\")\n    i += 1", ["2", "3", "4"], 1, "i принимает значения 0, 1 и 2 — три повторения."],
    tasks: [
      { key: "count", title: "От 1 до n", text: "Прочитай n и выведи числа от 1 до n, каждое на новой строке.", inputs: [["5"], ["1"], ["3"]], code: py`
        n = int(input())
        i = 1
        while i <= n:
            print(i)
            i += 1`, wrong: "n = int(input())\ni = 0\nwhile i < n:\n    print(i)\n    i += 1", hint: "Начни с 1 и остановись, когда i станет больше n." },
      { key: "countdown", title: "Обратный отсчёт", text: "Прочитай n и выведи числа от n до 1, а в конце — «Старт!».", inputs: [["3"], ["1"], ["5"]], code: py`
        n = int(input())
        while n > 0:
            print(n)
            n -= 1
        print("Старт!")`, wrong: 'n = int(input())\nwhile n >= 0:\n    print(n)\n    n -= 1\nprint("Старт!")', hint: "Ноль печатать не нужно." },
      { key: "evens", title: "Чётные до n", text: "Прочитай n и выведи все чётные числа от 2 до n включительно.", inputs: [["10"], ["7"], ["2"]], code: py`
        n = int(input())
        i = 2
        while i <= n:
            print(i)
            i += 2`, wrong: "n = int(input())\ni = 2\nwhile i < n:\n    print(i)\n    i += 2", hint: "n тоже нужно вывести, если оно чётное." },
      { key: "powers", title: "Степени двойки", text: "Прочитай n и выведи все степени двойки (1, 2, 4, 8, …), которые не больше n.", inputs: [["10"], ["1"], ["64"]], code: py`
        n = int(input())
        p = 1
        while p <= n:
            print(p)
            p *= 2`, wrong: "n = int(input())\np = 2\nwhile p <= n:\n    print(p)\n    p *= 2", hint: "Первая степень двойки — 1." },
      { key: "sum", title: "Сумма до n", text: "Прочитай n и выведи сумму чисел от 1 до n.", inputs: [["4"], ["1"], ["100"]], code: py`
        n = int(input())
        s = 0
        i = 1
        while i <= n:
            s += i
            i += 1
        print(s)`, wrong: "n = int(input())\ns = 0\ni = 1\nwhile i < n:\n    s += i\n    i += 1\nprint(s)", hint: "Само n тоже входит в сумму." },
      { key: "factorial", title: "Факториал", text: "Прочитай n (от 1 до 10) и выведи n! — произведение чисел от 1 до n.", inputs: [["5"], ["1"], ["10"]], code: py`
        n = int(input())
        f = 1
        i = 1
        while i <= n:
            f *= i
            i += 1
        print(f)`, wrong: "n = int(input())\nf = 0\ni = 1\nwhile i <= n:\n    f *= i\n    i += 1\nprint(f)", hint: "Произведение начинают с 1, а не с 0." },
      { key: "digits-count", title: "Сколько цифр", text: "Прочитай натуральное число и выведи, сколько в нём цифр.", inputs: [["7"], ["123"], ["100000"]], code: py`
        n = int(input())
        count = 0
        while n > 0:
            n = n // 10
            count += 1
        print(count)`, wrong: "n = int(input())\ncount = 0\nwhile n > 9:\n    n = n // 10\n    count += 1\nprint(count)", hint: "Отбрасывай последнюю цифру, пока число не станет нулём, и считай шаги." },
      { key: "digits-sum", title: "Сумма цифр любого числа", text: "Прочитай натуральное число любой длины и выведи сумму его цифр.", inputs: [["123"], ["9"], ["100500"]], code: py`
        n = int(input())
        s = 0
        while n > 0:
            s += n % 10
            n = n // 10
        print(s)`, wrong: "n = int(input())\ns = 0\nwhile n > 9:\n    s += n % 10\n    n = n // 10\nprint(s)", hint: "Последняя цифра — n % 10; потом отбрось её и повтори." },
    ],
  },
  {
    key: "for", title: "Цикл for", description: "for повторяет действия заранее известное число раз.",
    theory: "for i in range(n): повторяет тело n раз, i = 0, 1, …, n - 1. range(a, b) — числа от a до b - 1, range(a, b, шаг) — с шагом. Так удобно читать n чисел и обрабатывать их по одному.",
    rules: ["kind:for"], learned: ["Повторять действия через for и range", "Читать и обрабатывать n чисел", "Находить наибольшее"],
    question: ["Какие числа даёт range(1, 7, 2)?", ["1 3 5", "1 3 5 7", "2 4 6"], 0, "От 1 с шагом 2, а 7 не входит."],
    tasks: [
      { key: "hello", title: "Много приветов", text: "Прочитай n и выведи слово «Привет» n раз, каждое на новой строке.", inputs: [["3"], ["1"], ["5"]], code: py`
        n = int(input())
        for i in range(n):
            print("Привет")`, wrong: 'n = int(input())\nfor i in range(n - 1):\n    print("Привет")', hint: "range(n) даёт ровно n повторений." },
      { key: "squares", title: "Квадраты", text: "Прочитай n и выведи квадраты чисел от 1 до n, каждый на новой строке.", inputs: [["4"], ["1"], ["6"]], code: py`
        n = int(input())
        for i in range(1, n + 1):
            print(i * i)`, wrong: "n = int(input())\nfor i in range(n):\n    print(i * i)", hint: "range(1, n + 1) — числа от 1 до n." },
      { key: "table", title: "Таблица умножения", text: "Прочитай число n и выведи его таблицу умножения от 1 до 10 в виде «n x i = результат».", inputs: [["7"], ["2"]], code: py`
        n = int(input())
        for i in range(1, 11):
            print(n, "x", i, "=", n * i)`, wrong: 'n = int(input())\nfor i in range(1, 10):\n    print(n, "x", i, "=", n * i)', hint: "Последняя строка — умножение на 10." },
      { key: "sum-n", title: "Сумма n чисел", text: "Сначала прочитай количество чисел n, затем сами n целых чисел. Выведи их сумму.", inputs: [["3", "1", "2", "3"], ["1", "50"], ["4", "-5", "5", "10", "0"]], code: py`
        n = int(input())
        s = 0
        for i in range(n):
            s += int(input())
        print(s)`, wrong: "n = int(input())\ns = 0\nfor i in range(n):\n    s = int(input())\nprint(s)", hint: "Прибавляй каждое число к сумме: s += ..." },
      { key: "max-n", title: "Наибольшее из n", text: "Прочитай n, затем n целых чисел. Выведи наибольшее из них.", inputs: [["3", "4", "9", "2"], ["2", "-7", "-3"], ["4", "-3", "-1", "-8", "-2"]], code: py`
        n = int(input())
        m = int(input())
        for i in range(n - 1):
            x = int(input())
            if x > m:
                m = x
        print(m)`, wrong: "n = int(input())\nm = 0\nfor i in range(n):\n    x = int(input())\n    if x > m:\n        m = x\nprint(m)", hint: "Начни с первого прочитанного числа, а не с 0: числа бывают отрицательными." },
      { key: "positives", title: "Сколько положительных", text: "Прочитай n, затем n целых чисел. Выведи, сколько среди них положительных.", inputs: [["4", "1", "-2", "0", "5"], ["3", "-1", "4", "-1"], ["3", "7", "8", "9"]], code: py`
        n = int(input())
        count = 0
        for i in range(n):
            if int(input()) > 0:
                count += 1
        print(count)`, wrong: "n = int(input())\ncount = 0\nfor i in range(n):\n    if int(input()) >= 0:\n        count += 1\nprint(count)", hint: "Ноль не положительный." },
      { key: "stairs", title: "Лесенка", text: "Прочитай n и выведи лесенку из звёздочек: в первой строке одна звёздочка, во второй две и так далее до n.", inputs: [["3"], ["1"], ["5"]], code: py`
        n = int(input())
        for i in range(1, n + 1):
            print("*" * i)`, wrong: 'n = int(input())\nfor i in range(n):\n    print("*" * i)', hint: "Первая строка должна содержать одну звёздочку, а не ноль." },
      { key: "odd-sum", title: "Сумма нечётных", text: "Прочитай n и выведи сумму всех нечётных чисел от 1 до n.", inputs: [["5"], ["6"], ["1"]], code: py`
        n = int(input())
        s = 0
        for i in range(1, n + 1, 2):
            s += i
        print(s)`, wrong: "n = int(input())\ns = 0\nfor i in range(1, n, 2):\n    s += i\nprint(s)", hint: "Шаг 2 от единицы даёт только нечётные. Конец range не включается." },
    ],
  },
  {
    key: "loops-if", title: "Циклы и условия", description: "Соединяем повторение и выбор: фильтры, счётчики, делители и игры.",
    theory: "Внутри цикла можно проверять условие: печатать только подходящие числа, считать их или искать делители. Цикл while с input() читает данные, пока не встретится условный конец.",
    rules: [], learned: ["Выбирать числа внутри цикла", "Находить делители", "Читать данные до условного конца"],
    question: ["Сколько чисел напечатает программа?\nfor i in range(1, 10):\n    if i % 3 == 0:\n        print(i)", ["2", "3", "9"], 1, "Подходят 3, 6 и 9."],
    tasks: [
      { key: "by3", title: "Кратные трём", text: "Прочитай n и выведи все числа от 1 до n, которые делятся на 3.", inputs: [["10"], ["3"], ["7"]], code: py`
        n = int(input())
        for i in range(1, n + 1):
            if i % 3 == 0:
                print(i)`, wrong: "n = int(input())\nfor i in range(1, n):\n    if i % 3 == 0:\n        print(i)", hint: "n тоже проверь." },
      { key: "evens-count", title: "Сколько чётных", text: "Прочитай n, затем n целых чисел. Выведи, сколько среди них чётных.", inputs: [["4", "1", "2", "3", "4"], ["3", "0", "-2", "5"], ["2", "7", "8"]], code: py`
        n = int(input())
        count = 0
        for i in range(n):
            if int(input()) % 2 == 0:
                count += 1
        print(count)`, wrong: "n = int(input())\ncount = 0\nfor i in range(n):\n    if int(input()) % 2 == 1:\n        count += 1\nprint(count)", hint: "Чётное — остаток от деления на 2 равен нулю." },
      { key: "fizz", title: "Физ-Баз", text: "Прочитай n и выведи числа от 1 до n, но вместо кратных 3 пиши «Физ», вместо кратных 5 — «Баз», а вместо кратных и 3, и 5 — «ФизБаз».", inputs: [["15"], ["5"]], code: py`
        n = int(input())
        for i in range(1, n + 1):
            if i % 15 == 0:
                print("ФизБаз")
            elif i % 3 == 0:
                print("Физ")
            elif i % 5 == 0:
                print("Баз")
            else:
                print(i)`, wrong: 'n = int(input())\nfor i in range(1, n + 1):\n    if i % 3 == 0:\n        print("Физ")\n    elif i % 5 == 0:\n        print("Баз")\n    elif i % 15 == 0:\n        print("ФизБаз")\n    else:\n        print(i)', hint: "Сначала проверяй самый строгий случай — кратность и 3, и 5." },
      { key: "divisors", title: "Делители", text: "Прочитай натуральное число и выведи все его делители по возрастанию, каждый на новой строке.", inputs: [["12"], ["7"], ["1"]], code: py`
        n = int(input())
        for d in range(1, n + 1):
            if n % d == 0:
                print(d)`, wrong: "n = int(input())\nfor d in range(1, n):\n    if n % d == 0:\n        print(d)", hint: "Само число тоже делится на себя." },
      { key: "prime", title: "Простое число", text: "Прочитай число не меньше 2 и выведи «простое», если у него ровно два делителя, иначе «составное».", inputs: [["7"], ["12"], ["2"], ["49"], ["97"]], code: py`
        n = int(input())
        count = 0
        for d in range(1, n + 1):
            if n % d == 0:
                count += 1
        if count == 2:
            print("простое")
        else:
            print("составное")`, wrong: 'n = int(input())\nif n % 2 == 1:\n    print("простое")\nelse:\n    print("составное")', hint: "Посчитай делители в цикле, а потом сравни их количество с двумя." },
      { key: "until-zero", title: "Сумма до нуля", text: "Читай целые числа по одному, пока не встретится 0, и выведи сумму всех прочитанных чисел.", inputs: [["5", "3", "0"], ["2", "0"], ["-1", "10", "4", "0"]], code: py`
        s = 0
        x = int(input())
        while x != 0:
            s += x
            x = int(input())
        print(s)`, wrong: "s = 0\nx = int(input())\nwhile x != 0:\n    x = int(input())\n    s += x\nprint(s)", hint: "Сначала прибавь число, потом читай следующее, иначе первое потеряется." },
      { key: "guess", title: "Угадай число", text: "Загадано число 7. Читай попытки по одной. На каждую неверную выводи «больше» или «меньше» (какое число загадано относительно попытки), на верную — «угадал!» и заканчивай.", inputs: [["5", "9", "7"], ["8", "7"], ["1", "2", "8", "7"]], code: py`
        secret = 7
        guess = int(input())
        while guess != secret:
            if guess < secret:
                print("больше")
            else:
                print("меньше")
            guess = int(input())
        print("угадал!")`, wrong: 'secret = 7\nguess = int(input())\nwhile guess != secret:\n    if guess < secret:\n        print("меньше")\n    else:\n        print("больше")\n    guess = int(input())\nprint("угадал!")', hint: "Если попытка меньше загаданного, загадано число больше." },
      { key: "above-average", title: "Выше среднего", text: "Прочитай n, затем n целых чисел. Выведи по одному те числа, которые больше среднего арифметического, в том же порядке.", inputs: [["4", "1", "2", "3", "10"], ["3", "1", "5", "6"], ["5", "7", "1", "9", "3", "5"]], code: py`
        n = int(input())
        nums = []
        for i in range(n):
            nums.append(int(input()))
        average = sum(nums) / n
        for x in nums:
            if x > average:
                print(x)`, wrong: "n = int(input())\nnums = []\nfor i in range(n):\n    nums.append(int(input()))\naverage = sum(nums) / n\nfor x in nums:\n    if x >= average:\n        print(x)", hint: "Сначала сохрани все числа в список: среднее можно посчитать только после чтения всех." },
    ],
  },
  {
    key: "strings", title: "Строки и индексы", description: "Длина строки, символы по номерам, срезы и склейка.",
    theory: "Строка — это последовательность символов. len(s) — её длина. Символы нумеруются с нуля: s[0] — первый, s[-1] — последний (то же, что s[len(s) - 1]). Срез s[1:4] берёт символы с номерами 1, 2 и 3, а s[::-1] переворачивает строку. Строки соединяются знаком +, str(n) превращает число в строку. Методы строк вроде s.upper() учебный Python не поддерживает: всё делаем индексами, срезами и циклами.",
    rules: [], learned: ["Узнавать длину строки через len", "Брать символы по номеру, в том числе с конца", "Вырезать часть строки срезом"],
    question: ["Что напечатает print(\"кодик\"[1] + \"кодик\"[-1])?", ["ок", "кк", "од"], 0, "\"кодик\"[1] — вторая буква «о», [-1] — последняя «к»."],
    tasks: [
      { key: "len", title: "Длина слова", text: "Прочитай слово и выведи, сколько в нём букв.", inputs: [["кот"], ["Python"], ["я"], ["программирование"]], code: py`
        word = input()
        print(len(word))`, wrong: "word = input()\nprint(len(word) - 1)", hint: "len(word) — число символов. Номер последнего символа на единицу меньше, но спрашивают именно длину." },
      { key: "ends", title: "Первая и последняя", text: "Прочитай слово и выведи через пробел его первую и последнюю буквы.", inputs: [["кот"], ["Python"], ["я"]], code: py`
        word = input()
        print(word[0], word[-1])`, wrong: "word = input()\nprint(word[0], word[len(word)])", hint: "Номера идут с нуля, поэтому последний символ — word[-1] или word[len(word) - 1]." },
      { key: "middle", title: "Средняя буква", text: "Прочитай слово с нечётным числом букв и выведи букву ровно посередине.", inputs: [["кот"], ["радар"], ["я"], ["шоколад"]], code: py`
        word = input()
        print(word[len(word) // 2])`, wrong: "word = input()\nprint(word[len(word) / 2])", hint: "Номер — целое число: дели длину нацело, через //." },
      { key: "inner", title: "Без краёв", text: "Прочитай строку и выведи её без первого и последнего символа. Например, из «[кот]» получится «кот».", inputs: [["[кот]"], ["(скобки)"], ["«ура»"]], code: py`
        s = input()
        print(s[1:-1])`, wrong: "s = input()\nprint(s[1:len(s)])", hint: "Срез s[1:-1] начинается со второго символа и заканчивается перед последним." },
      { key: "initials", title: "Инициалы", text: "Прочитай имя и фамилию (каждое на своей строке) и выведи инициалы с точками через пробел: для «Мира» и «Котова» — «М. К.».", inputs: [["Мира", "Котова"], ["Ян", "Ли"], ["Олег", "Петров"]], code: py`
        name = input()
        surname = input()
        print(name[0] + ". " + surname[0] + ".")`, wrong: "name = input()\nsurname = input()\nprint(name[0], surname[0])", hint: "Склей первую букву имени, точку с пробелом, первую букву фамилии и точку." },
      { key: "reverse", title: "Задом наперёд", text: "Прочитай слово и выведи его задом наперёд.", inputs: [["кот"], ["Python"], ["ракета"]], code: py`
        word = input()
        print(word[::-1])`, wrong: "word = input()\nprint(word[-1])", hint: "Срез с шагом -1 — word[::-1] — идёт от конца к началу." },
      { key: "digits", title: "Сколько цифр", text: "Прочитай натуральное число и выведи, сколько в нём цифр.", inputs: [["7"], ["2025"], ["100000"]], code: py`
        n = int(input())
        print(len(str(n)))`, wrong: "n = int(input())\nprint(len(n))", hint: "У числа нет длины. Преврати его в строку через str(n) и посчитай символы." },
      { key: "palindrome", title: "Перевёртыш", text: "Прочитай слово. Если оно одинаково читается слева направо и справа налево, выведи «да», иначе «нет».", inputs: [["шалаш"], ["кот"], ["абба"], ["абра"]], code: py`
        word = input()
        if word == word[::-1]:
            print("да")
        else:
            print("нет")`, wrong: "word = input()\nif word[0] == word[-1]:\n    print(\"да\")\nelse:\n    print(\"нет\")", hint: "Сравни всё слово с перевёрнутым word[::-1], а не только крайние буквы." },
    ],
  },
  {
    key: "string-loops", title: "Перебор строки", description: "Цикл for проходит по буквам: считаем, переворачиваем и собираем новые строки.",
    theory: "for ch in word: перебирает символы строки по одному. Можно идти и по номерам: for i in range(len(word)): — тогда символ равен word[i]. Чтобы собрать новую строку, начни с пустой res = \"\" и приписывай к ней символы: res = res + ch. Оператор in в условиях и методы строк учебный Python не поддерживает: символы сравнивай через ==.",
    rules: ["kind:for"], learned: ["Перебирать символы строки циклом for", "Считать нужные символы", "Собирать новую строку из старой"],
    question: ["Что напечатает программа?\nres = \"\"\nfor ch in \"кот\":\n    res = ch + res\nprint(res)", ["кот", "ток", "ккоотт"], 1, "Каждая буква приписывается в начало: «к», «ок», «ток»."],
    tasks: [
      { key: "letters", title: "По буквам", text: "Прочитай слово и выведи каждую его букву на отдельной строке.", inputs: [["кот"], ["Python"], ["да"]], code: py`
        word = input()
        for ch in word:
            print(ch)`, wrong: "word = input()\nprint(word)", hint: "for ch in word: — в ch по очереди оказывается каждая буква." },
      { key: "count-a", title: "Сколько букв «а»", text: "Прочитай слово из строчных русских букв и выведи, сколько в нём букв «а».", inputs: [["банан"], ["папа"], ["аааа"], ["арбуз"]], code: py`
        word = input()
        count = 0
        for ch in word:
            if ch == "а":
                count = count + 1
        print(count)`, wrong: "word = input()\ncount = 0\nfor ch in word:\n    if ch == \"а\":\n        print(ch)\n    count = count + 1\nprint(count)", hint: "Счётчик увеличивается только внутри if — следи за отступом." },
      { key: "reverse", title: "Переворот циклом", text: "Прочитай слово и выведи его задом наперёд, собрав новую строку в цикле (без среза [::-1]).", inputs: [["кот"], ["Python"], ["ракета"]], code: py`
        word = input()
        res = ""
        for ch in word:
            res = ch + res
        print(res)`, wrong: "word = input()\nres = \"\"\nfor ch in word:\n    res = res + ch\nprint(res)", hint: "Приписывай очередную букву в начало: res = ch + res." },
      { key: "stars", title: "Через звёздочку", text: "Прочитай слово (не короче двух букв) и выведи его буквы через звёздочку: «кот» → «к*о*т». После последней буквы звёздочки нет.", inputs: [["кот"], ["да"], ["Kodik"]], code: py`
        word = input()
        res = word[0]
        for i in range(1, len(word)):
            res = res + "*" + word[i]
        print(res)`, wrong: "word = input()\nres = \"\"\nfor ch in word:\n    res = res + ch + \"*\"\nprint(res)", hint: "Начни с первой буквы, а дальше перед каждой следующей ставь звёздочку." },
      { key: "digit-sum", title: "Сумма цифр", text: "Прочитай строку из цифр и выведи сумму этих цифр.", inputs: [["2025"], ["999"], ["10"]], code: py`
        s = input()
        total = 0
        for ch in s:
            total = total + int(ch)
        print(total)`, wrong: "s = input()\ntotal = 0\nfor ch in s:\n    total = int(ch)\nprint(total)", hint: "Каждую цифру-символ преврати через int(ch) и прибавь к сумме, а не запиши вместо неё." },
      { key: "even-pos", title: "Через одну", text: "Прочитай слово и выведи его буквы с номерами 0, 2, 4 и так далее одной строкой: «программа» → «пормм».", inputs: [["программа"], ["кот"], ["Kodik"]], code: py`
        word = input()
        res = ""
        for i in range(0, len(word), 2):
            res = res + word[i]
        print(res)`, wrong: "word = input()\nres = \"\"\nfor i in range(1, len(word), 2):\n    res = res + word[i]\nprint(res)", hint: "Номера начинаются с нуля: range(0, len(word), 2)." },
      { key: "underscores", title: "Подчёркивания", text: "Прочитай фразу и выведи её, заменив каждый пробел знаком «_».", inputs: [["привет мир"], ["раз два три"], ["Kodik"]], code: py`
        s = input()
        res = ""
        for ch in s:
            if ch == " ":
                res = res + "_"
            else:
                res = res + ch
        print(res)`, wrong: "s = input()\nres = \"\"\nfor ch in s:\n    if ch != \" \":\n        res = res + ch\nprint(res)", hint: "На месте пробела нужно добавить «_», а не просто пропустить его." },
      { key: "double", title: "Эхо букв", text: "Прочитай слово и повтори каждую букву дважды: «кот» → «ккоотт».", inputs: [["кот"], ["да"], ["Python"]], code: py`
        word = input()
        res = ""
        for ch in word:
            res = res + ch + ch
        print(res)`, wrong: "word = input()\nprint(word + word)", hint: "Удваивать нужно каждую букву по отдельности, внутри цикла." },
    ],
  },
  {
    key: "robot", title: "Робот: первые шаги", description: "Робот ходит по клеточному полю, закрашивает клетки и паркуется.",
    theory: "from pyrob.api import * подключает Робота. move_right(), move_left(), move_up() и move_down() — шаг в сторону; в скобках можно указать число шагов: move_right(3). fill_cell() закрашивает клетку, где стоит Робот. Поле задано в задании: клетки со звёздочкой нужно закрасить, P — парковка, где Робот должен закончить путь. Врезаться в стену нельзя: программа остановится.",
    rules: [], learned: ["Двигать Робота на нужное число клеток", "Закрашивать клетки", "Обходить стены и заканчивать путь на парковке"],
    question: ["Робот стоит в левом верхнем углу поля. Где он окажется после move_right(2) и move_down()?", ["Строка 2, столбец 3", "Строка 3, столбец 2", "Строка 1, столбец 3"], 0, "Два шага вправо — третий столбец, шаг вниз — вторая строка."],
    tasks: [
      { key: "step", title: "Через две клетки", text: "Закрась клетку со звёздочкой: она на две клетки правее Робота.", worlds: [field("R . *")], code: py`
        from pyrob.api import *

        move_right(2)
        fill_cell()`, wrong: "from pyrob.api import *\n\nmove_right()\nfill_cell()", hint: "move_right(2) — два шага вправо, затем fill_cell()." },
      { key: "corner", title: "В угол", text: "Робот в левом верхнем углу поля 3×3. Закрась клетку в правом нижнем углу.", worlds: [field("R . .", ". . .", ". . *")], code: py`
        from pyrob.api import *

        move_down(2)
        move_right(2)
        fill_cell()`, wrong: "from pyrob.api import *\n\nmove_down()\nmove_right(2)\nfill_cell()", hint: "До нижнего ряда два шага вниз, до правого столбца — два шага вправо." },
      { key: "every-other", title: "Через клетку", text: "Закрась три клетки со звёздочками: они идут через одну.", worlds: [field("R * . * . *")], code: py`
        from pyrob.api import *

        move_right()
        fill_cell()
        move_right(2)
        fill_cell()
        move_right(2)
        fill_cell()`, wrong: "from pyrob.api import *\n\nmove_right()\nfill_cell()\nmove_right()\nfill_cell()\nmove_right()\nfill_cell()", hint: "Между закрашенными клетками — одна пустая: от одной звёздочки до другой два шага." },
      { key: "around", title: "Обход стены", text: "Справа от Робота стена. Обойди её снизу и закончи путь на парковке P.", worlds: [field("+-+-+-+", "|R|. P|", "+ + + +", "|. . .|", "+-+-+-+")], code: py`
        from pyrob.api import *

        move_down()
        move_right(2)
        move_up()`, wrong: "from pyrob.api import *\n\nmove_right(2)", hint: "Сначала шаг вниз, под стеной два шага вправо, потом шаг вверх." },
      { key: "square", title: "Квадратик", text: "Закрась квадрат 2×2 из клеток со звёздочками.", worlds: [field("R . . .", ". * * .", ". * * .", ". . . .")], code: py`
        from pyrob.api import *

        move_down()
        move_right()
        fill_cell()
        move_right()
        fill_cell()
        move_down()
        fill_cell()
        move_left()
        fill_cell()`, wrong: "from pyrob.api import *\n\nmove_down()\nmove_right()\nfill_cell()\nmove_right()\nfill_cell()\nmove_down()\nfill_cell()", hint: "Обойди квадрат по кругу и закрась все четыре клетки." },
      { key: "back", title: "Туда и обратно", text: "Робот стоит на парковке. Закрась дальнюю клетку и вернись на парковку.", worlds: [field("Q . . *")], code: py`
        from pyrob.api import *

        move_right(3)
        fill_cell()
        move_left(3)`, wrong: "from pyrob.api import *\n\nmove_right(3)\nfill_cell()", hint: "После закрашивания столько же шагов обратно влево." },
    ],
  },
  {
    key: "robot-while", title: "Робот: цикл while", description: "Датчики стен и цикл while: одна программа проходит поле любой длины.",
    theory: "В каждом тесте поле разной длины, поэтому число шагов заранее неизвестно. Датчики wall_is_on_the_right(), wall_is_on_the_left(), wall_is_above() и wall_is_beneath() отвечают True, если с этой стороны стена; край поля — тоже стена. while not wall_is_on_the_right(): повторяет шаг вправо, пока справа свободно.",
    rules: ["kind:while"], learned: ["Проверять стены датчиками", "Идти до стены циклом while", "Писать программу, которая работает на поле любой длины"],
    question: ["Робот в самой левой клетке коридора из 5 клеток. Сколько шагов он сделает?\nwhile not wall_is_on_the_right():\n    move_right()", ["4", "5", "6"], 0, "Из первой клетки в пятую — четыре шага; в пятой справа стена, и цикл останавливается."],
    tasks: [
      { key: "corridor", title: "Весь коридор", text: "Закрась все клетки коридора, включая ту, где стоит Робот. Длина коридора в тестах разная.", worlds: [field("X * * *"), field("X * * * * * *"), field("X *")], code: py`
        from pyrob.api import *

        fill_cell()
        while not wall_is_on_the_right():
            move_right()
            fill_cell()`, wrong: "from pyrob.api import *\n\nwhile not wall_is_on_the_right():\n    move_right()\n    fill_cell()", hint: "Первую клетку закрась до цикла, остальные — внутри него после шага." },
      { key: "down-back", title: "Вниз и обратно", text: "Робот на парковке наверху колонки. Закрась нижнюю клетку и вернись на парковку.", worlds: [field("Q", ".", ".", "*"), field("Q", "*"), field("Q", ".", ".", ".", ".", "*")], code: py`
        from pyrob.api import *

        while not wall_is_beneath():
            move_down()
        fill_cell()
        while not wall_is_above():
            move_up()`, wrong: "from pyrob.api import *\n\nwhile not wall_is_beneath():\n    move_down()\nfill_cell()", hint: "Второй цикл ведёт Робота вверх, пока сверху не окажется стена." },
      { key: "far-corner", title: "Дальний угол", text: "Робот в левом верхнем углу. Закрась клетку в правом нижнем углу поля. Размеры поля в тестах разные.", worlds: [field("R . .", ". . .", ". . *"), field("R . . . .", ". . . . *"), field("R .", ". .", ". .", ". *")], code: py`
        from pyrob.api import *

        while not wall_is_on_the_right():
            move_right()
        while not wall_is_beneath():
            move_down()
        fill_cell()`, wrong: "from pyrob.api import *\n\nwhile not wall_is_on_the_right():\n    move_right()\nfill_cell()", hint: "Два цикла подряд: сначала до правой стены, потом до нижней." },
      { key: "stairs", title: "Лесенка", text: "Закрась диагональ квадратного поля от Робота до правого нижнего угла. Размер поля в тестах разный.", worlds: [field("X . .", ". * .", ". . *"), field("X . . .", ". * . .", ". . * .", ". . . *"), field("X .", ". *")], code: py`
        from pyrob.api import *

        fill_cell()
        while not wall_is_beneath():
            move_right()
            move_down()
            fill_cell()`, wrong: "from pyrob.api import *\n\nfill_cell()\nwhile not wall_is_beneath():\n    move_down()\n    fill_cell()", hint: "Шаг по диагонали — это шаг вправо и шаг вниз." },
      { key: "exit", title: "Выход из коридора", text: "Над коридором стена с одним проходом. Найди проход и поднимись на парковку P. Проход в тестах в разных местах.", worlds: [
        field("+-+-+-+-+-+", "|. . P . .|", "+-+-+ +-+-+", "|R . . . .|", "+-+-+-+-+-+"),
        field("+-+-+-+-+-+-+", "|. . . . . P|", "+-+-+-+-+-+ +", "|R . . . . .|", "+-+-+-+-+-+-+"),
        field("+-+-+-+", "|. P .|", "+-+ +-+", "|R . .|", "+-+-+-+")], code: py`
        from pyrob.api import *

        while wall_is_above():
            move_right()
        move_up()`, wrong: "from pyrob.api import *\n\nmove_right(2)\nmove_up()", hint: "Иди вправо, пока сверху стена; где её нет — шаг вверх." },
      { key: "left-wall", title: "К левой стене", text: "Робот где-то в коридоре. Дойди до левого края и закрась крайнюю клетку.", worlds: [field("* . R ."), field("* R"), field("* . . . . R")], code: py`
        from pyrob.api import *

        while not wall_is_on_the_left():
            move_left()
        fill_cell()`, wrong: "from pyrob.api import *\n\nwhile not wall_is_on_the_right():\n    move_right()\nfill_cell()", hint: "Нужен датчик wall_is_on_the_left() и шаг move_left()." },
    ],
  },
  {
    key: "robot-if", title: "Робот: условия", description: "Робот проверяет датчики и сам решает, куда идти и какие клетки закрашивать.",
    theory: "if проверяет датчик и выбирает действие. cell_should_be_filled() отвечает True, если клетку нужно закрасить (на поле она со звёздочкой). Вместе с while условие проверяется в каждой клетке пути: пока впереди нет стены — шаг; если клетку нужно закрасить — закрась.",
    rules: ["kind:if"], learned: ["Выбирать направление по датчику стены", "Закрашивать только нужные клетки", "Соединять while и if"],
    question: ["Что делают эти строки?\nif wall_is_beneath():\n    fill_cell()", ["Закрашивают клетку, если снизу стена", "Ведут Робота вниз до стены", "Ставят стену снизу"], 0, "Датчик только проверяет; закрашивает fill_cell(), и только когда условие верно."],
    tasks: [
      { key: "choose", title: "Направо или вниз", text: "Если справа от Робота стена, шагни вниз, иначе — вправо. Закрась клетку, в которую пришёл.", worlds: [field("+-+-+", "|R|.|", "+ + +", "|* .|", "+-+-+"), field("R *", ". ."), field("+-+-+-+", "|R|. .|", "+ + + +", "|* . .|", "+-+-+-+")], code: py`
        from pyrob.api import *

        if wall_is_on_the_right():
            move_down()
        else:
            move_right()
        fill_cell()`, wrong: "from pyrob.api import *\n\nmove_right()\nfill_cell()", hint: "if wall_is_on_the_right(): — шаг вниз, else: — шаг вправо." },
      { key: "marks", title: "Отметки в коридоре", text: "Пройди коридор до правой стены и закрась только клетки со звёздочками.", worlds: [field("R . * . * *"), field("R * * ."), field("R . . . *")], code: py`
        from pyrob.api import *

        while not wall_is_on_the_right():
            move_right()
            if cell_should_be_filled():
                fill_cell()`, wrong: "from pyrob.api import *\n\nwhile not wall_is_on_the_right():\n    move_right()\n    fill_cell()", hint: "После шага спроси cell_should_be_filled() и закрашивай, только если ответ True." },
      { key: "roof", title: "Под крышей", text: "Робот идёт вправо до стены. Закрась каждую клетку, над которой стена (и ту, где Робот стоит в начале, если над ней стена).", worlds: [
        field("+-+-+-+-+-+", "|. . . . .|", "+-+ +-+ + +", "|X . * . .|", "+-+-+-+-+-+"),
        field("+-+-+-+-+", "|. . . .|", "+ + +-+-+", "|R . * *|", "+-+-+-+-+"),
        field("+-+-+-+-+-+-+", "|. . . . . .|", "+-+-+ + + +-+", "|X * . . . *|", "+-+-+-+-+-+-+")], code: py`
        from pyrob.api import *

        if wall_is_above():
            fill_cell()
        while not wall_is_on_the_right():
            move_right()
            if wall_is_above():
                fill_cell()`, wrong: "from pyrob.api import *\n\nwhile not wall_is_on_the_right():\n    move_right()\n    if wall_is_above():\n        fill_cell()", hint: "Начальную клетку проверь отдельно, до цикла." },
      { key: "every-other", title: "Через одну", text: "Закрась клетку Робота и дальше каждую вторую клетку коридора. Длина коридора в тестах разная.", worlds: [field("X . * . *"), field("X . * . * ."), field("X . * . * . *")], code: py`
        from pyrob.api import *

        n = 0
        fill_cell()
        while not wall_is_on_the_right():
            move_right()
            n = n + 1
            if n % 2 == 0:
                fill_cell()`, wrong: "from pyrob.api import *\n\nfill_cell()\nwhile not wall_is_on_the_right():\n    move_right()\n    fill_cell()", hint: "Считай шаги в переменной n и закрашивай, когда n делится на 2." },
      { key: "marks-back", title: "Отметки и возврат", text: "Робот стоит на парковке. Пройди коридор до правой стены, закрась клетки со звёздочками и вернись на парковку.", worlds: [field("Q * . * ."), field("Q . . *"), field("Q * * . . *")], code: py`
        from pyrob.api import *

        while not wall_is_on_the_right():
            move_right()
            if cell_should_be_filled():
                fill_cell()
        while not wall_is_on_the_left():
            move_left()`, wrong: "from pyrob.api import *\n\nwhile not wall_is_on_the_right():\n    move_right()\n    if cell_should_be_filled():\n        fill_cell()", hint: "После первого цикла нужен второй: обратно влево до стены." },
    ],
  },
  {
    key: "turtle", title: "Черепаха: фигуры и циклы", description: "Шаг и поворот в цикле for рисуют многоугольники, звёзды и спирали.",
    theory: "import turtle и t = turtle.Turtle() — черепаха появляется в центре холста и смотрит вправо. t.forward(100) — шаг на 100 точек с линией, t.left(90) и t.right(90) — повороты в градусах. Правильный многоугольник с n сторонами — это n раз шаг и поворот на 360 / n градусов. t.penup() поднимает перо — черепаха идёт без линии, t.pendown() опускает его снова.",
    rules: ["kind:for"], learned: ["Рисовать правильные многоугольники циклом", "Вычислять угол поворота", "Переходить без линии: penup и pendown"],
    question: ["На какой угол поворачивать черепаху, чтобы нарисовать правильный шестиугольник?", ["60°", "120°", "90°"], 0, "Шесть поворотов вместе дают полный оборот: 360 / 6 = 60."],
    tasks: [
      { key: "triangle", title: "Треугольник", text: "Нарисуй правильный треугольник со стороной 100.", draw: true, code: py`
        import turtle

        t = turtle.Turtle()
        for i in range(3):
            t.forward(100)
            t.left(120)`, wrong: "import turtle\n\nt = turtle.Turtle()\nfor i in range(3):\n    t.forward(100)\n    t.left(60)", hint: "Поворачивать нужно на внешний угол: 360 / 3 = 120, а не на угол треугольника 60." },
      { key: "pentagon", title: "Пятиугольник", text: "Нарисуй правильный пятиугольник со стороной 80.", draw: true, code: py`
        import turtle

        t = turtle.Turtle()
        for i in range(5):
            t.forward(80)
            t.left(72)`, wrong: "import turtle\n\nt = turtle.Turtle()\nfor i in range(4):\n    t.forward(80)\n    t.left(72)", hint: "Пять сторон — пять повторений; угол 360 / 5 = 72." },
      { key: "polygon", title: "Любой многоугольник", text: "Прочитай число сторон n и нарисуй правильный n-угольник со стороной 60.", draw: true, inputs: [["3"], ["6"], ["8"]], code: py`
        import turtle

        n = int(input())
        t = turtle.Turtle()
        for i in range(n):
            t.forward(60)
            t.left(360 / n)`, wrong: "import turtle\n\nn = int(input())\nt = turtle.Turtle()\nfor i in range(n):\n    t.forward(60)\n    t.left(180 - 360 / n)", hint: "Угол поворота — 360 / n. Угол самого многоугольника здесь не нужен." },
      { key: "star", title: "Звезда", text: "Нарисуй пятиконечную звезду с лучом 150: пять раз шаг вперёд и поворот направо на 144°.", draw: true, code: py`
        import turtle

        t = turtle.Turtle()
        for i in range(5):
            t.forward(150)
            t.right(144)`, wrong: "import turtle\n\nt = turtle.Turtle()\nfor i in range(5):\n    t.forward(150)\n    t.right(72)", hint: "Поворот на 72° даёт пятиугольник; у звезды угол 144°." },
      { key: "stairs", title: "Лесенка", text: "Нарисуй лесенку из четырёх ступенек: каждая — 30 точек вверх и 30 вправо. Черепаха начинает, глядя вправо.", draw: true, code: py`
        import turtle

        t = turtle.Turtle()
        t.left(90)
        for i in range(4):
            t.forward(30)
            t.right(90)
            t.forward(30)
            t.left(90)`, wrong: "import turtle\n\nt = turtle.Turtle()\nt.left(90)\nfor i in range(3):\n    t.forward(30)\n    t.right(90)\n    t.forward(30)\n    t.left(90)", hint: "Сначала повернись вверх, а в цикле: вверх, поворот направо, вправо, поворот налево." },
      { key: "squares", title: "Три квадрата", text: "Нарисуй в ряд три квадрата со стороной 40 с промежутком 20 между ними. Промежутки — без линий.", draw: true, code: py`
        import turtle

        t = turtle.Turtle()
        for k in range(3):
            for i in range(4):
                t.forward(40)
                t.left(90)
            t.penup()
            t.forward(60)
            t.pendown()`, wrong: "import turtle\n\nt = turtle.Turtle()\nfor k in range(3):\n    for i in range(4):\n        t.forward(40)\n        t.left(90)\n    t.forward(60)", hint: "Перед переходом к следующему квадрату подними перо, после — опусти." },
      { key: "spiral", title: "Квадратная спираль", text: "Нарисуй спираль из 10 отрезков: первый длиной 10, каждый следующий на 10 длиннее; после каждого — поворот налево на 90°.", draw: true, code: py`
        import turtle

        t = turtle.Turtle()
        for i in range(1, 11):
            t.forward(i * 10)
            t.left(90)`, wrong: "import turtle\n\nt = turtle.Turtle()\nfor i in range(1, 11):\n    t.forward(10)\n    t.left(90)", hint: "Длина отрезка зависит от номера шага: i * 10." },
    ],
  },
  {
    key: "turtle-color", title: "Черепаха: цвет и координаты", description: "Цвет, заливка, окружности и точки, переходы по координатам.",
    theory: "t.color(\"red\") меняет цвет линии, t.color(\"red\", \"yellow\") — цвет линии и заливки. Фигура между t.begin_fill() и t.end_fill() заливается. t.goto(x, y) ведёт черепаху в точку: центр холста — (0, 0), ось y направлена вверх. Чтобы перейти без линии, подними перо t.penup(), а потом опусти t.pendown(). t.circle(r) рисует окружность радиуса r; её центр на r выше черепахи, если та смотрит вправо. t.dot(30, \"red\") ставит круглую точку диаметром 30.",
    rules: [], learned: ["Задавать цвет линии и заливки", "Переходить в точку через goto без лишних линий", "Рисовать окружности и точки"],
    question: ["Черепаха смотрит вправо. Где центр окружности после t.goto(0, -50) и t.circle(50)?", ["В точке (0, 0)", "В точке (0, -50)", "В точке (0, -100)"], 0, "Центр на радиус выше черепахи: (0, -50 + 50) = (0, 0)."],
    tasks: [
      { key: "filled-square", title: "Голубой квадрат", text: "Нарисуй квадрат со стороной 100: линия синяя (\"blue\"), заливка голубая (\"lightblue\").", draw: true, code: py`
        import turtle

        t = turtle.Turtle()
        t.color("blue", "lightblue")
        t.begin_fill()
        for i in range(4):
            t.forward(100)
            t.left(90)
        t.end_fill()`, wrong: "import turtle\n\nt = turtle.Turtle()\nt.color(\"blue\", \"lightblue\")\nfor i in range(4):\n    t.forward(100)\n    t.left(90)", hint: "Заливка появляется, только если фигура нарисована между begin_fill() и end_fill()." },
      { key: "segment", title: "Отрезок по точкам", text: "Нарисуй один отрезок от точки (-100, 50) до точки (100, 50). Других линий быть не должно.", draw: true, code: py`
        import turtle

        t = turtle.Turtle()
        t.penup()
        t.goto(-100, 50)
        t.pendown()
        t.goto(100, 50)`, wrong: "import turtle\n\nt = turtle.Turtle()\nt.goto(-100, 50)\nt.goto(100, 50)", hint: "Из центра до начала отрезка черепаха идёт с поднятым пером." },
      { key: "traffic-light", title: "Светофор", text: "Поставь три точки диаметром 40: красную в (0, 60), жёлтую (\"yellow\") в (0, 0) и зелёную в (0, -60).", draw: true, code: py`
        import turtle

        t = turtle.Turtle()
        t.penup()
        t.goto(0, 60)
        t.dot(40, "red")
        t.goto(0, 0)
        t.dot(40, "yellow")
        t.goto(0, -60)
        t.dot(40, "green")`, wrong: "import turtle\n\nt = turtle.Turtle()\nt.penup()\nt.goto(0, 60)\nt.dot(40, \"green\")\nt.goto(0, 0)\nt.dot(40, \"yellow\")\nt.goto(0, -60)\nt.dot(40, \"red\")", hint: "Красный сверху: y = 60 — это выше центра." },
      { key: "snowman", title: "Снеговик", text: "Нарисуй снеговика из трёх окружностей без соединяющих линий: радиус 60 с нижней точкой (0, -150), радиус 40 с нижней точкой (0, -30) и радиус 25 с нижней точкой (0, 50).", draw: true, code: py`
        import turtle

        t = turtle.Turtle()
        t.penup()
        t.goto(0, -150)
        t.pendown()
        t.circle(60)
        t.penup()
        t.goto(0, -30)
        t.pendown()
        t.circle(40)
        t.penup()
        t.goto(0, 50)
        t.pendown()
        t.circle(25)`, wrong: "import turtle\n\nt = turtle.Turtle()\nt.goto(0, -150)\nt.circle(60)\nt.goto(0, -30)\nt.circle(40)\nt.goto(0, 50)\nt.circle(25)", hint: "Перед каждым goto поднимай перо, перед circle — опускай." },
      { key: "house", title: "Домик", text: "Нарисуй домик: квадрат со стороной 100 от центра холста вправо и вверх, а на нём крышу — правильный треугольник со стороной 100.", draw: true, code: py`
        import turtle

        t = turtle.Turtle()
        for i in range(4):
            t.forward(100)
            t.left(90)
        t.penup()
        t.goto(0, 100)
        t.pendown()
        for i in range(3):
            t.forward(100)
            t.left(120)`, wrong: "import turtle\n\nt = turtle.Turtle()\nfor i in range(4):\n    t.forward(100)\n    t.left(90)\nt.penup()\nt.goto(0, 100)\nt.pendown()\nfor i in range(3):\n    t.forward(100)\n    t.right(120)", hint: "Крыша над квадратом: от левого верхнего угла поворачивай налево." },
      { key: "target", title: "Мишень", text: "Прочитай n и нарисуй n окружностей с общим центром в (0, 0) и радиусами 20, 40, 60 и так далее. Переходы — без линий.", draw: true, inputs: [["2"], ["3"], ["5"]], code: py`
        import turtle

        n = int(input())
        t = turtle.Turtle()
        for i in range(n):
            r = 20 * (i + 1)
            t.penup()
            t.goto(0, -r)
            t.pendown()
            t.circle(r)`, wrong: "import turtle\n\nn = int(input())\nt = turtle.Turtle()\nfor i in range(n):\n    r = 20 * (i + 1)\n    t.circle(r)", hint: "Центр окружности на r выше черепахи, поэтому начинать надо из точки (0, -r)." },
    ],
  },
];
