import { py, type Chapter } from "../tasks";

export const pyNested: Chapter = {
  key: "py-nested", title: "Вложенные циклы", level: "easy",
  description: "Цикл внутри цикла: рисуем фигуры из символов, строим таблицы и перебираем пары и тройки чисел.",
  theory: "Если один цикл стоит внутри другого, внутренний проходит целиком на каждом шаге внешнего: внешний цикл отвечает за строки, внутренний — за символы в строке. print(x, end=\"\") печатает без перехода на новую строку, а пустой print() после внутреннего цикла заканчивает строку. Чтобы между числами был разделитель, но не в конце строки, печатай его перед каждым элементом, кроме первого: if j > 1: print(\" \", end=\"\"). Границы внутреннего цикла могут зависеть от переменной внешнего: for j in range(1, i + 1) даёт в i-й строке i элементов. Вложенными циклами перебирают и все пары или тройки чисел, проверяя для каждой условие.",
  rules: ["nested_loop"],
  learned: ["Печатать строку по частям через end=\"\"", "Рисовать фигуры и таблицы вложенными циклами", "Перебирать пары и тройки чисел"],
  question: ["Сколько звёздочек напечатает программа?\nfor i in range(3):\n    for j in range(4):\n        print(\"*\", end=\"\")\n    print()", ["12", "7", "4"], 0, "Внутренний цикл печатает 4 звёздочки и повторяется 3 раза: 3 · 4 = 12."],
  tasks: [
    { key: "rect", title: "Прямоугольник из звёзд", text: "Прочитай число строк n и число столбцов m и выведи прямоугольник из звёздочек «*»: n строк по m звёздочек без пробелов.", inputs: [["3", "5"], ["2", "2"], ["5", "3"]], code: py`
      n = int(input())
      m = int(input())
      for i in range(n):
          for j in range(m):
              print("*", end="")
          print()`, wrong: 'n = int(input())\nm = int(input())\nfor i in range(m):\n    for j in range(n):\n        print("*", end="")\n    print()', hint: "Внешний цикл — строки (их n), внутренний — звёздочки в строке (их m). После строки нужен пустой print()." },
    { key: "down-triangle", title: "Треугольник вниз", text: "Прочитай n и выведи треугольник из звёздочек: в первой строке n звёздочек, в следующей на одну меньше и так до одной.", inputs: [["4"], ["2"], ["6"]], code: py`
      n = int(input())
      for i in range(n, 0, -1):
          for j in range(i):
              print("*", end="")
          print()`, wrong: 'n = int(input())\nfor i in range(n, 1, -1):\n    for j in range(i):\n        print("*", end="")\n    print()', hint: "Внешний цикл идёт от n вниз до 1 включительно, а внутренний печатает i звёздочек." },
    { key: "digit-rows", title: "Лесенка из цифр", text: "Прочитай n (от 2 до 9) и выведи лесенку: в первой строке цифра 1 один раз, во второй — цифра 2 два раза, и так до n. Для n = 3:\n1\n22\n333", inputs: [["3"], ["5"], ["9"]], code: py`
      n = int(input())
      for i in range(1, n + 1):
          for j in range(i):
              print(i, end="")
          print()`, wrong: "n = int(input())\nfor i in range(1, n + 1):\n    for j in range(1, i + 1):\n        print(j, end=\"\")\n    print()", hint: "В строке номер i повторяется сама цифра i, а не номер позиции j." },
    { key: "pairs", title: "Все пары", text: "Прочитай n и выведи все пары чисел i и j, для которых 1 ≤ i < j ≤ n, — каждую пару на своей строке через пробел. Сначала пары с i = 1 (по возрастанию j), потом с i = 2 и так далее.", inputs: [["3"], ["4"], ["2"], ["6"]], code: py`
      n = int(input())
      for i in range(1, n + 1):
          for j in range(i + 1, n + 1):
              print(i, j)`, wrong: "n = int(input())\nfor i in range(1, n + 1):\n    for j in range(i, n + 1):\n        print(i, j)", hint: "j должно быть строго больше i, поэтому внутренний цикл начинается с i + 1." },
    { key: "pyramid", title: "Числовая пирамида", level: "medium", text: "Прочитай n и выведи числовую пирамиду из n строк: в строке номер i — числа от 1 до i через пробел (без пробела в конце). Для n = 3:\n1\n1 2\n1 2 3", inputs: [["3"], ["1"], ["5"], ["12"]], code: py`
      n = int(input())
      for i in range(1, n + 1):
          for j in range(1, i + 1):
              if j > 1:
                  print(" ", end="")
              print(j, end="")
          print()`, wrong: 'n = int(input())\nfor i in range(1, n + 1):\n    for j in range(1, i):\n        if j > 1:\n            print(" ", end="")\n        print(j, end="")\n    print()', hint: "Внутренний цикл зависит от номера строки: от 1 до i включительно. Пробел печатай перед каждым числом, кроме первого." },
    { key: "mult-table", title: "Таблица n × n", level: "medium", text: "Прочитай n и выведи таблицу умножения n × n: в строке номер i — произведения i · 1, i · 2, …, i · n, разделённые символом табуляции \"\\t\" (без табуляции в конце строки).", inputs: [["3"], ["5"], ["9"], ["2"]], code: py`
      n = int(input())
      for i in range(1, n + 1):
          for j in range(1, n + 1):
              if j > 1:
                  print("\t", end="")
              print(i * j, end="")
          print()`, wrong: 'n = int(input())\nfor i in range(n):\n    for j in range(n):\n        if j > 0:\n            print("\\t", end="")\n        print(i * j, end="")\n    print()', hint: "Множители идут от 1 до n, а не от 0. Разделитель печатай перед каждым числом, кроме первого в строке." },
    { key: "chess", title: "Шахматная клетка", level: "medium", text: "Прочитай n и m и выведи доску из n строк по m клеток: «#» — тёмная клетка, «.» — светлая. Левая верхняя клетка тёмная, и цвета чередуются и по строкам, и по столбцам. Для n = 2, m = 3:\n#.#\n.#.", inputs: [["2", "3"], ["4", "5"], ["2", "2"], ["6", "3"]], code: py`
      n = int(input())
      m = int(input())
      for i in range(n):
          for j in range(m):
              if (i + j) % 2 == 0:
                  print("#", end="")
              else:
                  print(".", end="")
          print()`, wrong: 'n = int(input())\nm = int(input())\nfor i in range(n):\n    for j in range(m):\n        if j % 2 == 0:\n            print("#", end="")\n        else:\n            print(".", end="")\n    print()', hint: "Цвет клетки зависит и от строки, и от столбца: посмотри на чётность суммы i + j." },
    { key: "frame", title: "Рамка", level: "medium", text: "Прочитай n (n ≥ 2) и выведи квадратную рамку n × n: по краям звёздочки «*», а внутри пробелы. Для n = 4:\n****\n*  *\n*  *\n****", inputs: [["4"], ["2"], ["5"], ["3"]], code: py`
      n = int(input())
      for i in range(n):
          for j in range(n):
              if i == 0 or i == n - 1 or j == 0 or j == n - 1:
                  print("*", end="")
              else:
                  print(" ", end="")
          print()`, wrong: 'n = int(input())\nfor i in range(n):\n    for j in range(n):\n        if i == 0 or i == n or j == 0 or j == n:\n            print("*", end="")\n        else:\n            print(" ", end="")\n    print()', hint: "Клетка лежит на краю, если она в первой или последней строке или столбце. Номера идут от 0 до n - 1." },
    { key: "digit-sum", title: "Сумма цифр s", level: "medium", text: "Прочитай s (от 1 до 18) и выведи по возрастанию все двузначные числа, сумма цифр которых равна s, каждое на новой строке. Перебери цифру десятков и цифру единиц двумя циклами.", inputs: [["5"], ["1"], ["18"], ["10"], ["9"]], code: py`
      s = int(input())
      for a in range(1, 10):
          for b in range(10):
              if a + b == s:
                  print(a * 10 + b)`, wrong: "s = int(input())\nfor a in range(1, 10):\n    for b in range(1, 10):\n        if a + b == s:\n            print(a * 10 + b)", hint: "Десятки — от 1 до 9, а единицы могут быть и нулём: 10, 20, 30 — тоже двузначные." },
    { key: "candies", title: "Конфеты по коробкам", level: "hard", text: "Нужно разложить n одинаковых конфет по трём разным коробкам так, чтобы в каждой была хотя бы одна. Сколько есть способов? Способы, где в коробках 1, 2, 3 и 3, 2, 1 конфеты, считаются разными. Прочитай n (3 ≤ n ≤ 20) и выведи число способов.", inputs: [["3"], ["5"], ["4"], ["20"]], code: py`
      n = int(input())
      count = 0
      for a in range(1, n + 1):
          for b in range(1, n + 1):
              c = n - a - b
              if c >= 1:
                  count += 1
      print(count)`, wrong: "n = int(input())\ncount = 0\nfor a in range(1, n + 1):\n    for b in range(1, n + 1):\n        c = n - a - b\n        if c >= 0:\n            count += 1\nprint(count)", hint: "Перебери, сколько конфет в первой и во второй коробке; в третьей окажется остаток. Проверь, что и там хотя бы одна." },
    { key: "pythagoras", title: "Пифагоровы тройки", level: "hard", text: "Прочитай n (не больше 15) и выведи все тройки натуральных чисел a < b < c ≤ n, для которых a · a + b · b = c · c, — каждую на своей строке через пробел, по возрастанию a, затем b. Если таких троек нет, выведи «нет».", inputs: [["5"], ["13"], ["12"], ["15"]], code: py`
      n = int(input())
      found = False
      for a in range(1, n + 1):
          for b in range(a + 1, n + 1):
              for c in range(b + 1, n + 1):
                  if a * a + b * b == c * c:
                      print(a, b, c)
                      found = True
      if not found:
          print("нет")`, wrong: 'n = int(input())\nfound = False\nfor a in range(1, n + 1):\n    for b in range(a + 1, n + 1):\n        for c in range(b + 1, n):\n            if a * a + b * b == c * c:\n                print(a, b, c)\n                found = True\nif not found:\n    print("нет")', hint: "Три вложенных цикла: b начинается после a, c — после b. Число c может быть равно n." },
  ],
};
