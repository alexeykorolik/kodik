import { py, type Chapter } from "../tasks";

export const pyFunctions: Chapter = {
  key: "py-functions", title: "Функции и return", level: "medium",
  description: "Пишем свои функции с параметрами, возвращаем результат через return и вызываем функции из функций.",
  theory: "def имя(a, b): создаёт функцию с параметрами a и b. Команды внутри пишутся с отступом и выполняются только при вызове: имя(3, 5). return возвращает результат туда, откуда функцию вызвали, и сразу заканчивает её работу, поэтому результат можно положить в переменную или передать в другую функцию: max2(max2(a, b), c). Функция, которая отвечает «да или нет», возвращает True или False. Функция может вызывать сама себя — это рекурсия; у неё обязательно должен быть простой случай, где ответ возвращается без нового вызова, иначе вызовы никогда не закончатся.",
  rules: ["kind:function"], learned: ["Писать функции с параметрами", "Возвращать результат через return", "Собирать решение из нескольких функций", "Решать задачи рекурсией"],
  question: ["Что напечатает программа?\ndef f(x):\n    return x * 2\nprint(f(f(3)))", ["6", "12", "9"], 1, "Сначала f(3) возвращает 6, затем f(6) возвращает 12."],
  tasks: [
    { key: "garden", title: "Две грядки", level: "easy", rules: ["kind:return"], text: "Напиши функцию area(a, b), которая возвращает площадь прямоугольника со сторонами a и b. Прочитай длину и ширину первой грядки, затем длину и ширину второй (четыре целых числа, каждое на своей строке) и выведи их общую площадь.", inputs: [["3", "4", "2", "5"], ["10", "1", "1", "10"], ["7", "7", "0", "9"], ["1", "1", "1", "1"]], code: py`
      def area(a, b):
          return a * b

      a1 = int(input())
      b1 = int(input())
      a2 = int(input())
      b2 = int(input())
      print(area(a1, b1) + area(a2, b2))`, wrong: "def area(a, b):\n    return 2 * (a + b)\n\na1 = int(input())\nb1 = int(input())\na2 = int(input())\nb2 = int(input())\nprint(area(a1, b1) + area(a2, b2))", hint: "Площадь — это произведение сторон, а не их сумма. Вызови функцию дважды и сложи результаты." },
    { key: "lesson", title: "Длина урока", level: "easy", rules: ["kind:return"], text: "Напиши функцию minutes(h, m), которая переводит время h часов m минут в минуты от начала суток. Прочитай время начала урока (часы, затем минуты) и время конца (часы, затем минуты) — четыре числа, каждое на своей строке. Конец в тот же день и не раньше начала. Выведи, сколько минут длился урок. Например, с 8:30 до 9:15 — 45 минут.", inputs: [["8", "30", "9", "15"], ["10", "0", "10", "45"], ["13", "50", "15", "5"], ["0", "0", "23", "59"]], code: py`
      def minutes(h, m):
          return h * 60 + m

      h1 = int(input())
      m1 = int(input())
      h2 = int(input())
      m2 = int(input())
      print(minutes(h2, m2) - minutes(h1, m1))`, wrong: "def minutes(h, m):\n    return h * 100 + m\n\nh1 = int(input())\nm1 = int(input())\nh2 = int(input())\nm2 = int(input())\nprint(minutes(h2, m2) - minutes(h1, m1))", hint: "В часе 60 минут, а не 100. Переведи оба момента в минуты и вычти." },
    { key: "distance", title: "Расстояние", level: "easy", rules: ["kind:return"], text: "Напиши функцию my_abs(x), которая возвращает модуль числа (без встроенной abs): для отрицательного числа — число без минуса, иначе само число. Прочитай два целых числа — две точки на числовой прямой — и с помощью my_abs выведи расстояние между ними.", inputs: [["-3", "4"], ["10", "2"], ["5", "5"], ["-7", "-2"]], code: py`
      def my_abs(x):
          if x < 0:
              return -x
          return x

      a = int(input())
      b = int(input())
      print(my_abs(a - b))`, wrong: "def my_abs(x):\n    if x < 0:\n        return -x\n    return x\n\na = int(input())\nb = int(input())\nprint(my_abs(a) - my_abs(b))", hint: "Расстояние — это модуль разности a - b, а не разность модулей." },
    { key: "max4", title: "Лучший из четырёх", level: "easy", rules: ["kind:return"], text: "Напиши функцию max2(a, b), которая возвращает большее из двух чисел (без встроенной max). Прочитай очки четырёх игроков — четыре целых числа, каждое на своей строке — и с помощью max2 выведи лучший результат.", inputs: [["5", "9", "2", "7"], ["1", "2", "3", "4"], ["-5", "-1", "-8", "-3"], ["6", "6", "6", "6"], ["10", "3", "3", "1"]], code: py`
      def max2(a, b):
          if a > b:
              return a
          return b

      a = int(input())
      b = int(input())
      c = int(input())
      d = int(input())
      print(max2(max2(a, b), max2(c, d)))`, wrong: "def max2(a, b):\n    if a < b:\n        return a\n    return b\n\na = int(input())\nb = int(input())\nc = int(input())\nd = int(input())\nprint(max2(max2(a, b), max2(c, d)))", hint: "Найди победителя первой пары и второй пары, а потом сравни победителей тем же max2." },
    { key: "leap-years", title: "Високосные годы", rules: ["kind:return"], text: "Напиши функцию is_leap(y), которая возвращает True, если год високосный: он делится на 4 и не делится на 100, или делится на 400. Прочитай два года a и b (a ≤ b) и выведи, сколько високосных лет от a до b включительно.", inputs: [["2000", "2024"], ["1896", "1904"], ["1900", "1904"], ["1600", "1700"], ["2100", "2104"]], code: py`
      def is_leap(y):
          return y % 4 == 0 and y % 100 != 0 or y % 400 == 0

      a = int(input())
      b = int(input())
      count = 0
      for y in range(a, b + 1):
          if is_leap(y):
              count = count + 1
      print(count)`, wrong: "def is_leap(y):\n    return y % 4 == 0\n\na = int(input())\nb = int(input())\ncount = 0\nfor y in range(a, b + 1):\n    if is_leap(y):\n        count = count + 1\nprint(count)", hint: "Функция может сразу вернуть значение условия. Годы вроде 1900 делятся на 4, но не високосные." },
    { key: "digit-sum", title: "Чья сумма цифр больше", rules: ["kind:return", "kind:while"], text: "Напиши функцию digit_sum(n), которая возвращает сумму цифр натурального числа. Прочитай два натуральных числа и выведи то, у которого сумма цифр больше. Если суммы равны, выведи «Поровну».", inputs: [["19", "30"], ["100", "99"], ["123", "321"], ["7", "41"], ["5000", "41"]], code: py`
      def digit_sum(n):
          s = 0
          while n > 0:
              s = s + n % 10
              n = n // 10
          return s

      a = int(input())
      b = int(input())
      if digit_sum(a) > digit_sum(b):
          print(a)
      elif digit_sum(b) > digit_sum(a):
          print(b)
      else:
          print("Поровну")`, wrong: "def digit_sum(n):\n    s = 0\n    while n > 0:\n        s = s + n % 10\n        n = n // 10\n    return s\n\na = int(input())\nb = int(input())\nif a > b:\n    print(a)\nelif b > a:\n    print(b)\nelse:\n    print(\"Поровну\")", hint: "Сравнивать нужно не сами числа, а значения digit_sum(a) и digit_sum(b)." },
    { key: "primes", title: "Простые через функцию", rules: ["kind:return"], text: "Напиши функцию is_prime(n), которая возвращает True, если n — простое число (у него ровно два делителя: 1 и само n). Прочитай два натуральных числа a и b (a ≤ b) и выведи, сколько простых чисел от a до b включительно.", inputs: [["1", "10"], ["10", "20"], ["2", "2"], ["90", "100"], ["1", "2"]], code: py`
      def is_prime(n):
          if n < 2:
              return False
          d = 2
          while d * d <= n:
              if n % d == 0:
                  return False
              d = d + 1
          return True

      a = int(input())
      b = int(input())
      count = 0
      for n in range(a, b + 1):
          if is_prime(n):
              count = count + 1
      print(count)`, wrong: "def is_prime(n):\n    d = 2\n    while d * d <= n:\n        if n % d == 0:\n            return False\n        d = d + 1\n    return True\n\na = int(input())\nb = int(input())\ncount = 0\nfor n in range(a, b + 1):\n    if is_prime(n):\n        count = count + 1\nprint(count)", hint: "return внутри цикла сразу заканчивает функцию — как только нашёлся делитель. А число 1 простым не бывает." },
    { key: "buses", title: "Снова вместе", rules: ["kind:return", "kind:while"], text: "Два автобуса отходят от остановки одновременно; первый возвращается каждые a минут, второй — каждые b минут. Напиши функцию gcd(a, b) — наибольший общий делитель (алгоритм Евклида) — и с её помощью выведи, через сколько минут автобусы снова впервые встретятся на остановке. Это наименьшее общее кратное: a * b // gcd(a, b).", inputs: [["4", "6"], ["12", "18"], ["5", "7"], ["10", "10"], ["9", "12"]], code: py`
      def gcd(a, b):
          while b != 0:
              a, b = b, a % b
          return a

      a = int(input())
      b = int(input())
      print(a * b // gcd(a, b))`, wrong: "def gcd(a, b):\n    while b != 0:\n        a, b = b, a % b\n    return a\n\na = int(input())\nb = int(input())\nprint(a * b)", hint: "Пока b не ноль, заменяй пару (a, b) на (b, a % b); то, что осталось в a, и есть НОД." },
    { key: "power", title: "Степень рекурсией", rules: ["kind:return"], text: "Напиши рекурсивную функцию power(a, n), которая возвращает a в степени n без ** и без циклов: a⁰ = 1, а aⁿ = a · aⁿ⁻¹. Прочитай целое число a и неотрицательное целое n и выведи power(a, n).", inputs: [["2", "10"], ["3", "4"], ["5", "0"], ["-2", "3"], ["1", "20"]], code: py`
      def power(a, n):
          if n == 0:
              return 1
          return a * power(a, n - 1)

      a = int(input())
      n = int(input())
      print(power(a, n))`, wrong: "def power(a, n):\n    if n == 0:\n        return a\n    return a * power(a, n - 1)\n\na = int(input())\nn = int(input())\nprint(power(a, n))", hint: "Простой случай — n == 0: любое число в нулевой степени равно 1." },
    { key: "fib", title: "Кролики Фибоначчи", level: "hard", rules: ["kind:return"], text: "В числах Фибоначчи первые два равны 1, а каждое следующее — сумма двух предыдущих: 1, 1, 2, 3, 5, 8, … Напиши рекурсивную функцию fib(n), которая возвращает n-е число Фибоначчи. Прочитай n (от 1 до 10) и выведи fib(n).", inputs: [["6"], ["1"], ["2"], ["10"], ["9"]], code: py`
      def fib(n):
          if n <= 2:
              return 1
          return fib(n - 1) + fib(n - 2)

      n = int(input())
      print(fib(n))`, wrong: "def fib(n):\n    if n <= 2:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nn = int(input())\nprint(fib(n))", hint: "Для n = 1 и n = 2 ответ 1 — это простой случай. Остальные числа складываются из fib(n - 1) и fib(n - 2)." },
    { key: "amicable", title: "Дружные числа", level: "hard", rules: ["kind:return"], text: "Два разных числа называют дружными, если сумма делителей каждого (кроме него самого) равна другому числу. Например, 220 и 284: делители 220 без него самого дают в сумме 284, а делители 284 — ровно 220. Напиши функцию div_sum(n) и выведи «Да», если два прочитанных числа дружные, иначе «Нет».", inputs: [["220", "284"], ["12", "16"], ["284", "220"], ["220", "285"], ["10", "12"]], code: py`
      def div_sum(n):
          s = 0
          for d in range(1, n):
              if n % d == 0:
                  s = s + d
          return s

      a = int(input())
      b = int(input())
      if div_sum(a) == b and div_sum(b) == a:
          print("Да")
      else:
          print("Нет")`, wrong: "def div_sum(n):\n    s = 0\n    for d in range(1, n):\n        if n % d == 0:\n            s = s + d\n    return s\n\na = int(input())\nb = int(input())\nif div_sum(a) == b:\n    print(\"Да\")\nelse:\n    print(\"Нет\")", hint: "Проверять нужно в обе стороны: div_sum(a) равно b и div_sum(b) равно a." },
  ],
};
