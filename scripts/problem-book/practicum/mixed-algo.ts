import { py, type Chapter } from "../tasks";

export const mixedAlgo: Chapter = {
  key: "mixed-algo", title: "Блоки + Python: алгоритмы", mode: "mixed", level: "medium",
  description: "Маленькие алгоритмы из блоков и Python: рекорды, счётчики, флажки и циклы до нужного результата.",
  theory: "Многие задачи решаются одной идеей: завести переменную до цикла и обновлять её внутри. Для наибольшего запоминают первое число и сравнивают с ним следующие. Счётчик начинают с 0 и прибавляют 1, когда условие выполнено. Флажок — переменная со значением True, которую меняют на False, как только найдено нарушение. Цикл «пока» читает числа, пока не встретится условный конец, или повторяет действие, пока не будет достигнута цель.",
  rules: [], learned: ["Находить наибольшее и наименьшее на ходу", "Считать подходящие числа счётчиком", "Повторять действие, пока не достигнута цель", "Проверять всю последовательность флажком"],
  question: ["Что напечатает программа?\nx = 1\nk = 0\nwhile x < 10:\n    x = x * 3\n    k += 1\nprint(k)", ["2", "3", "9"], 1, "x меняется так: 1 → 3 → 9 → 27. При x = 9 условие 9 < 10 ещё верно, поэтому шагов три."],
  tasks: [
    { key: "warmest", title: "Самое тёплое", text: "Термометр показывал температуру n раз за день. Прочитай n (не меньше 2), затем n целых чисел. После каждого числа печатай самую высокую температуру из прочитанных к этому моменту. Температура бывает и ниже нуля.", rules: ["kind:if"], inputs: [["4", "3", "1", "5", "2"], ["3", "-5", "-2", "-8"], ["2", "-9", "-4"], ["5", "-1", "-1", "0", "-3", "4"]], code: py`
      n = int(input())
      m = int(input())
      print(m)
      for i in range(n - 1):
          x = int(input())
          if x > m:
              m = x
          print(m)`, wrong: "n = int(input())\nm = 0\nfor i in range(n):\n    x = int(input())\n    if x > m:\n        m = x\n    print(m)", hint: "Начни рекорд с первого прочитанного числа: при морозе 0 был бы неверным рекордом." },
    { key: "good-marks", title: "Хорошие оценки", text: "Прочитай n, затем n оценок от 2 до 5. Напечатай, сколько среди них хороших — четвёрок и пятёрок.", rules: ["kind:if"], inputs: [["5", "5", "3", "4", "2", "5"], ["3", "2", "3", "4"], ["4", "4", "4", "5", "4"], ["1", "4"]], code: py`
      n = int(input())
      k = 0
      for i in range(n):
          x = int(input())
          if x >= 4:
              k += 1
      print(k)`, wrong: "n = int(input())\nk = 0\nfor i in range(n):\n    x = int(input())\n    if x > 4:\n        k += 1\nprint(k)", hint: "Четвёрка тоже хорошая оценка: подходит всё, что не меньше 4." },
    { key: "piggy", title: "Монеты в копилке", text: "В копилку бросают монеты. Читай достоинства монет по одному, пока не встретится 0. Напечатай две строки: «Монет: N» и «Сумма: S».", rules: ["kind:while"], inputs: [["5", "10", "2", "0"], ["1", "0"], ["2", "2", "0"], ["10", "10", "10", "5", "0"]], code: py`
      k = 0
      s = 0
      x = int(input())
      while x != 0:
          k += 1
          s += x
          x = int(input())
      print("Монет: " + str(k))
      print("Сумма: " + str(s))`, wrong: 'k = 0\ns = 0\nx = int(input())\nwhile x != 0:\n    x = int(input())\n    k += 1\n    s += x\nprint("Монет: " + str(k))\nprint("Сумма: " + str(s))', hint: "Сначала учти прочитанную монету, а потом читай следующую. Ноль — не монета." },
    { key: "bacteria", title: "Бактерии: сколько часов", text: "В пробирке одна бактерия, и каждый час их число удваивается. Прочитай целое число target (не меньше 2) и напечатай, через сколько часов бактерий станет не меньше target.", rules: ["kind:while"], inputs: [["8"], ["10"], ["2"], ["1000"]], code: py`
      target = int(input())
      count = 1
      hours = 0
      while count < target:
          count = count * 2
          hours += 1
      print(hours)`, wrong: "target = int(input())\ncount = 1\nhours = 0\nwhile count <= target:\n    count = count * 2\n    hours += 1\nprint(hours)", hint: "Когда бактерий ровно target, ждать больше не нужно." },
    { key: "even-sum", title: "Сумма чётных", text: "Прочитай n и напечатай сумму всех чётных чисел от 1 до n. Перебирай числа переменной-счётчиком в цикле «пока».", rules: ["kind:while", "kind:if"], inputs: [["10"], ["7"], ["3"], ["2"]], code: py`
      n = int(input())
      s = 0
      i = 1
      while i <= n:
          if i % 2 == 0:
              s += i
          i += 1
      print(s)`, wrong: "n = int(input())\ns = 0\ni = 1\nwhile i < n:\n    if i % 2 == 0:\n        s += i\n    i += 1\nprint(s)", hint: "Само n тоже нужно проверить, если оно чётное." },
    { key: "increasing", title: "Только вверх", text: "Прочитай n (не меньше 2), затем n целых чисел. Напечатай «да», если каждое следующее число строго больше предыдущего, иначе «нет». Чисел не меньше двух.", rules: ["kind:if"], inputs: [["4", "1", "3", "7", "10"], ["3", "5", "5", "6"], ["2", "9", "9"], ["4", "1", "2", "3", "2"], ["3", "9", "4", "1"]], code: py`
      n = int(input())
      prev = int(input())
      ok = True
      for i in range(n - 1):
          x = int(input())
          ok = ok and x > prev
          prev = x
      if ok:
          print("да")
      else:
          print("нет")`, wrong: 'n = int(input())\nprev = int(input())\nok = True\nfor i in range(n - 1):\n    x = int(input())\n    if x < prev:\n        ok = False\n    prev = x\nif ok:\n    print("да")\nelse:\n    print("нет")', hint: "Заведи флажок ok = True и на каждом шаге обновляй его: ok = ok and x > prev. Равные числа — тоже нарушение." },
    { key: "average", title: "Средний балл", text: "Прочитай n, затем n целых баллов. Напечатай их среднее арифметическое (обычным делением, например 4.5 или 4.0).", rules: ["kind:for"], inputs: [["4", "5", "4", "4", "5"], ["2", "3", "4"], ["1", "7"], ["3", "10", "0", "5"]], code: py`
      n = int(input())
      s = 0
      for i in range(n):
          s += int(input())
      print(s / n)`, wrong: "n = int(input())\ns = 0\nfor i in range(n):\n    s = int(input())\nprint(s / n)", hint: "Каждое число нужно прибавить к сумме, а не положить вместо неё." },
    { key: "cheapest", title: "Где дешевле", level: "hard", text: "Мороженое продаётся в n магазинах. Прочитай n (не меньше 2), затем n цен по порядку. Напечатай номер магазина (с 1), где мороженое дешевле всего. Если таких несколько, напечатай самый первый номер.", rules: ["kind:if"], inputs: [["4", "50", "40", "45", "60"], ["3", "30", "30", "20"], ["2", "99", "98"], ["5", "70", "60", "60", "80", "60"]], code: py`
      n = int(input())
      m = int(input())
      best = 1
      number = 1
      for i in range(n - 1):
          number += 1
          x = int(input())
          if x < m:
              m = x
              best = number
      print(best)`, wrong: "n = int(input())\nm = int(input())\nbest = 1\nnumber = 1\nfor i in range(n - 1):\n    number += 1\n    x = int(input())\n    if x <= m:\n        m = x\n        best = number\nprint(best)", hint: "Храни и наименьшую цену, и номер её магазина. При равной цене номер менять не нужно." },
    { key: "guess", title: "Угадай с подсказками", level: "hard", text: "Первый игрок вводит загаданное число, второй — попытки, по одной в строке. На каждую неверную попытку печатай «больше», если загаданное число больше попытки, или «меньше». Когда число угадано, напечатай «Угадано с попытки N», где N — номер верной попытки.", rules: ["kind:while"], inputs: [["7", "5", "9", "7"], ["3", "1", "10", "4", "3"], ["20", "25", "21", "19", "20"], ["50", "49", "51", "50"]], code: py`
      secret = int(input())
      tries = 1
      x = int(input())
      while x != secret:
          if x < secret:
              print("больше")
          else:
              print("меньше")
          tries += 1
          x = int(input())
      print("Угадано с попытки " + str(tries))`, wrong: 'secret = int(input())\ntries = 0\nx = int(input())\nwhile x != secret:\n    if x < secret:\n        print("больше")\n    else:\n        print("меньше")\n    tries += 1\n    x = int(input())\nprint("Угадано с попытки " + str(tries))', hint: "Первая попытка — это уже попытка номер 1, даже если она сразу верная." },
    { key: "factorial", title: "Больше, чем K", level: "hard", text: "Факториал n! — произведение чисел от 1 до n. Прочитай K (от 1 до 10000000000) и напечатай самое маленькое n, для которого n! больше K. Например, для K = 100 ответ 5, потому что 4! = 24, а 5! = 120.", rules: ["kind:while"], inputs: [["100"], ["120"], ["1"], ["10000000000"], ["5"]], code: py`
      k = int(input())
      n = 1
      f = 1
      while f <= k:
          n += 1
          f = f * n
      print(n)`, wrong: "k = int(input())\nn = 1\nf = 1\nwhile f < k:\n    n += 1\n    f = f * n\nprint(n)", hint: "Умножай f на следующее число, пока оно не станет строго больше K. Если n! равен K, этого мало." },
  ],
};
