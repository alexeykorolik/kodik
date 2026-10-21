// «Задачник Kodik»: original practice problems in the order of a classic school problem book
// (input/output, arithmetic, integer division, digits, logic, branching, while, for, loops with
// conditions). Every task fits the teaching interpreter and is exported, checked against CPython
// and installed by scripts/export-problem-book.ts → server/b2b/problem-book.json.
// `wrong` is a characteristic mistake (a boundary, / instead of //, a loop that starts at 0): the
// quality gate proves the tests catch it.

/** Strips the first newline and the common indentation, so programs can be written in place. */
const py = (strings: TemplateStringsArray) => {
  const lines = strings.raw.join("").replace(/^\n/, "").replace(/\s+$/, "").split("\n");
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(indent)).join("\n");
};
export type Problem = { key: string; title: string; text: string; code: string; inputs?: string[][]; wrong: string; hint: string };
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
];
