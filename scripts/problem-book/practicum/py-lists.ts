import { py, type Chapter } from "../tasks";

export const pyLists: Chapter = {
  key: "py-lists", title: "Списки", level: "medium",
  description: "Список хранит много значений сразу: собираем его из ввода, перебираем, меняем и сортируем.",
  theory: "Список пишут в квадратных скобках: a = [3, 1, 2]. Пустой список — [], а a.append(x) добавляет элемент в конец; так список собирают из ввода: сначала читают количество n, потом n раз делают a.append(int(input())). Элементы нумеруются с нуля, как буквы строки: a[0], a[-1], срезы a[1:3]; элемент можно заменить: a[i] = x. len(a), sum(a), min(a), max(a) работают со списком целиком, for x in a: перебирает элементы. Методы: a.sort() сортирует по возрастанию, a.reverse() переворачивает, a.pop() удаляет и возвращает последний элемент (a.pop(0) — первый), a.insert(i, x) вставляет на место i, a.count(x) считает, сколько раз встречается x, a.index(x) находит номер первого x. print(a) печатает список в квадратных скобках через запятую: [1, 2, 3].",
  rules: ["kind:for"], learned: ["Собирать список из ввода через append", "Обращаться к элементам по номеру и менять их", "Пользоваться методами sort, pop, insert, count", "Сливать и сортировать списки сами"],
  question: ["Что напечатает программа?\na = [5, 2, 8]\na.append(1)\na.sort()\nprint(a[1])", ["2", "5", "1"], 0, "После append список [5, 2, 8, 1], после sort — [1, 2, 5, 8]; элемент с номером 1 — это 2."],
  tasks: [
    { key: "backwards", title: "Обратный порядок", level: "easy", text: "Прочитай число n, а затем n целых чисел, каждое на своей строке. Выведи эти числа в обратном порядке, каждое на своей строке.", inputs: [["4", "1", "2", "3", "4"], ["3", "10", "-5", "7"], ["1", "42"], ["5", "5", "5", "0", "1", "9"]], code: py`
      n = int(input())
      a = []
      for i in range(n):
          a.append(int(input()))
      for i in range(n - 1, -1, -1):
          print(a[i])`, wrong: "n = int(input())\na = []\nfor i in range(n):\n    a.append(int(input()))\nfor i in range(n - 1, 0, -1):\n    print(a[i])", hint: "Номера идут от n - 1 до 0 включительно. Конец range не входит в перебор, поэтому пиши range(n - 1, -1, -1)." },
    { key: "spread", title: "Разброс температур", level: "easy", text: "Прочитай число n, а затем n температур за неделю — целые числа, каждое на своей строке. Выведи разницу между самой высокой и самой низкой температурой.", inputs: [["5", "3", "-2", "7", "0", "4"], ["3", "10", "20", "30"], ["1", "5"], ["4", "-1", "-8", "-3", "-1"]], code: py`
      n = int(input())
      a = []
      for i in range(n):
          a.append(int(input()))
      print(max(a) - min(a))`, wrong: "n = int(input())\na = []\nfor i in range(n):\n    a.append(int(input()))\nprint(a[-1] - a[0])", hint: "Первое и последнее число — не обязательно самые маленькое и большое: для этого есть min(a) и max(a)." },
    { key: "queue", title: "Место в очереди", level: "easy", text: "Прочитай число n, затем n номеров билетов (целые числа, каждое на своей строке), а затем номер x. Если билет x есть в очереди, выведи его место, считая с единицы (если таких несколько — первое). Если его нет, выведи «нет».", inputs: [["5", "12", "7", "30", "7", "4", "7"], ["3", "1", "2", "3", "5"], ["4", "8", "6", "4", "2", "8"], ["1", "9", "9"]], code: py`
      n = int(input())
      a = []
      for i in range(n):
          a.append(int(input()))
      x = int(input())
      if a.count(x) > 0:
          print(a.index(x) + 1)
      else:
          print("нет")`, wrong: "n = int(input())\na = []\nfor i in range(n):\n    a.append(int(input()))\nx = int(input())\nif a.count(x) > 0:\n    print(a.index(x))\nelse:\n    print(\"нет\")", hint: "a.count(x) скажет, есть ли x, а a.index(x) — его номер. Номера в списке начинаются с нуля, а места — с единицы." },
    { key: "silver", title: "Серебро", level: "easy", text: "Прочитай число n (не меньше 2), а затем n результатов спортсменов — целые числа, каждое на своей строке. Выведи второй результат, если расставить их от большего к меньшему (если лучший результат у двоих, то второй равен первому).", inputs: [["5", "40", "75", "62", "18", "70"], ["2", "3", "9"], ["4", "8", "8", "1", "5"], ["3", "-4", "-2", "-9"]], code: py`
      n = int(input())
      a = []
      for i in range(n):
          a.append(int(input()))
      a.sort()
      print(a[-2])`, wrong: "n = int(input())\na = []\nfor i in range(n):\n    a.append(int(input()))\na.sort()\nprint(a[1])", hint: "a.sort() ставит числа по возрастанию, значит самые большие — в конце списка." },
    { key: "warmer", title: "Стало теплее", text: "Прочитай число n, а затем n температур по дням — целые числа, каждое на своей строке. Выведи, сколько раз температура была выше, чем накануне.", inputs: [["5", "1", "3", "2", "5", "6"], ["5", "5", "4", "3", "4", "2"], ["2", "3", "8"], ["4", "0", "0", "1", "1"], ["3", "9", "1", "5"]], code: py`
      n = int(input())
      a = []
      for i in range(n):
          a.append(int(input()))
      count = 0
      for i in range(1, n):
          if a[i] > a[i - 1]:
              count = count + 1
      print(count)`, wrong: "n = int(input())\na = []\nfor i in range(n):\n    a.append(int(input()))\ncount = 0\nfor i in range(n):\n    if a[i] > a[i - 1]:\n        count = count + 1\nprint(count)", hint: "У первого дня нет «накануне»: сравнение начинается с номера 1. Иначе a[-1] сравнит первый день с последним." },
    { key: "pairs", title: "Пары танцоров", text: "Прочитай число n, а затем n целых чисел. Поменяй местами соседей: первый со вторым, третий с четвёртым и так далее. Если чисел нечётное количество, последнее остаётся на месте. Выведи список через print. Например, [1, 2, 3, 4, 5] → [2, 1, 4, 3, 5].", inputs: [["5", "1", "2", "3", "4", "5"], ["4", "10", "20", "30", "40"], ["1", "7"], ["2", "8", "3"]], code: py`
      n = int(input())
      a = []
      for i in range(n):
          a.append(int(input()))
      for i in range(0, n - 1, 2):
          t = a[i]
          a[i] = a[i + 1]
          a[i + 1] = t
      print(a)`, wrong: "n = int(input())\na = []\nfor i in range(n):\n    a.append(int(input()))\nfor i in range(0, n - 1):\n    t = a[i]\n    a[i] = a[i + 1]\n    a[i + 1] = t\nprint(a)", hint: "Иди по номерам 0, 2, 4… с шагом 2 и меняй a[i] и a[i + 1] через временную переменную." },
    { key: "carousel", title: "Карусель", text: "Прочитай число n, а затем n целых чисел. Сдвинь список по кругу на одну позицию вправо: последний элемент становится первым, остальные сдвигаются. Выведи список через print. Например, [1, 2, 3, 4] → [4, 1, 2, 3].", inputs: [["4", "1", "2", "3", "4"], ["3", "7", "8", "9"], ["1", "5"], ["5", "0", "0", "1", "0", "2"]], code: py`
      n = int(input())
      a = []
      for i in range(n):
          a.append(int(input()))
      last = a.pop()
      a.insert(0, last)
      print(a)`, wrong: "n = int(input())\na = []\nfor i in range(n):\n    a.append(int(input()))\nfirst = a.pop(0)\na.append(first)\nprint(a)", hint: "a.pop() снимает последний элемент, а a.insert(0, x) ставит x в самое начало." },
    { key: "piggy-bank", title: "Копилка по дням", text: "Прочитай число n, а затем n сумм, которые ты клал в копилку каждый день. Составь список: сколько денег было в копилке после каждого дня, и выведи его через print. Например, для 5, 3, 10 — [5, 8, 18].", inputs: [["3", "5", "3", "10"], ["4", "1", "1", "1", "1"], ["1", "100"], ["5", "10", "0", "20", "0", "5"]], code: py`
      n = int(input())
      total = 0
      sums = []
      for i in range(n):
          total = total + int(input())
          sums.append(total)
      print(sums)`, wrong: "n = int(input())\ntotal = 0\nsums = []\nfor i in range(n):\n    sums.append(total)\n    total = total + int(input())\nprint(sums)", hint: "Сначала добавь сегодняшнюю сумму к итогу, а потом запиши итог в список." },
    { key: "unique", title: "Без повторов", text: "Прочитай число n, а затем n целых чисел. Выведи через print список, в котором каждое число встречается один раз — в порядке первого появления. Например, [3, 1, 3, 2, 1] → [3, 1, 2].", inputs: [["5", "3", "1", "3", "2", "1"], ["4", "7", "7", "7", "7"], ["3", "1", "2", "3"], ["6", "5", "4", "5", "4", "6", "4"]], code: py`
      n = int(input())
      a = []
      for i in range(n):
          a.append(int(input()))
      res = []
      for x in a:
          if res.count(x) == 0:
              res.append(x)
      print(res)`, wrong: "n = int(input())\na = []\nfor i in range(n):\n    a.append(int(input()))\nres = []\nfor x in a:\n    if a.count(x) == 1:\n        res.append(x)\nprint(res)", hint: "Проверяй, нет ли числа уже в новом списке res, а не сколько раз оно встречается в исходном." },
    { key: "merge", title: "Слияние", level: "hard", text: "Прочитай число n и n чисел первого списка, затем число m и m чисел второго списка. Оба списка уже упорядочены по возрастанию. Слей их в один упорядоченный список, не используя sort, и выведи его через print. Например, [1, 4, 9] и [2, 3, 10] → [1, 2, 3, 4, 9, 10].", inputs: [["3", "1", "4", "9", "3", "2", "3", "10"], ["2", "5", "6", "3", "1", "2", "3"], ["1", "7", "1", "7"], ["4", "1", "2", "3", "4", "1", "10"]], code: py`
      n = int(input())
      a = []
      for k in range(n):
          a.append(int(input()))
      m = int(input())
      b = []
      for k in range(m):
          b.append(int(input()))
      res = []
      i = 0
      j = 0
      while i < n and j < m:
          if a[i] <= b[j]:
              res.append(a[i])
              i = i + 1
          else:
              res.append(b[j])
              j = j + 1
      while i < n:
          res.append(a[i])
          i = i + 1
      while j < m:
          res.append(b[j])
          j = j + 1
      print(res)`, wrong: "n = int(input())\na = []\nfor k in range(n):\n    a.append(int(input()))\nm = int(input())\nb = []\nfor k in range(m):\n    b.append(int(input()))\nres = []\ni = 0\nj = 0\nwhile i < n and j < m:\n    if a[i] <= b[j]:\n        res.append(a[i])\n        i = i + 1\n    else:\n        res.append(b[j])\n        j = j + 1\nprint(res)", hint: "Держи два указателя i и j и каждый раз бери меньший из a[i] и b[j]. Когда один список кончился, допиши хвост другого." },
    { key: "bubble", title: "Пузырёк", level: "hard", rules: ["nested_loop"], text: "Прочитай число n, а затем n целых чисел. Отсортируй их по возрастанию без sort — методом пузырька: проходи по списку и меняй местами соседей, стоящих не по порядку, пока список не станет упорядоченным. Выведи список через print.", inputs: [["5", "4", "1", "5", "2", "3"], ["3", "3", "1", "2"], ["4", "9", "7", "5", "3"], ["2", "8", "1"], ["6", "2", "-1", "2", "0", "-5", "4"]], code: py`
      n = int(input())
      a = []
      for i in range(n):
          a.append(int(input()))
      for i in range(n - 1):
          for j in range(n - 1 - i):
              if a[j] > a[j + 1]:
                  t = a[j]
                  a[j] = a[j + 1]
                  a[j + 1] = t
      print(a)`, wrong: "n = int(input())\na = []\nfor i in range(n):\n    a.append(int(input()))\nfor j in range(n - 1):\n    if a[j] > a[j + 1]:\n        t = a[j]\n        a[j] = a[j + 1]\n        a[j + 1] = t\nprint(a)", hint: "Один проход ставит на место только самое большое число. Повтори проход n - 1 раз во внешнем цикле." },
  ],
};
