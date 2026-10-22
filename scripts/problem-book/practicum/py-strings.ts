import { py, type Chapter } from "../tasks";

export const pyStrings: Chapter = {
  key: "py-strings", title: "Строки: алгоритмы", level: "medium",
  description: "Срезы, перебор букв и сборка новых строк: решаем задачи посложнее над словами и фразами.",
  theory: "len(s) — длина строки. Символы нумеруются с нуля, а отрицательные номера считают с конца: s[-1] — последний символ. Срез s[a:b] берёт символы с номерами от a до b - 1, s[-3:] — три последних. for ch in s: перебирает буквы, а for i in range(len(s)): — их номера, тогда можно сравнить s[i] с соседом s[i - 1]. Новую строку собирают из пустой: res = res + ch. Символы можно сравнивать: ch >= \"0\" and ch <= \"9\" — это цифра. Методов строк и оператора in в учебном Python нет: всё делаем циклами, флагами и сравнениями.",
  rules: [], learned: ["Брать конец строки отрицательными номерами и срезами", "Проверять строку флагом", "Сравнивать соседние символы", "Сжимать и шифровать строки"],
  question: ["Что напечатает программа?\ns = \"школа\"\nprint(s[-1] + s[1:3])", ["ако", "аш", "алко"], 0, "s[-1] — последняя буква «а», срез s[1:3] — символы с номерами 1 и 2, то есть «ко»."],
  tasks: [
    { key: "ending", title: "Окончание", level: "easy", text: "Прочитай слово длиной не меньше трёх букв и выведи три его последние буквы. Например, для «программа» — «мма».", inputs: [["программа"], ["котик"], ["дом"], ["Python"]], code: py`
      word = input()
      print(word[-3:])`, wrong: "word = input()\nprint(word[-3:-1])", hint: "Срез с отрицательным началом и без конца: word[-3:] идёт до самого последнего символа." },
    { key: "swap-ends", title: "Обмен краями", level: "easy", text: "Прочитай слово длиной не меньше двух букв и поменяй местами его первую и последнюю буквы. Например, «кошка» → «акшок».", inputs: [["кошка"], ["мир"], ["да"], ["зебра"]], code: py`
      word = input()
      print(word[-1] + word[1:-1] + word[0])`, wrong: "word = input()\nprint(word[-1] + word[1:] + word[0])", hint: "Середина слова — это срез word[1:-1]: без первой и без последней буквы." },
    { key: "words", title: "Сколько слов", level: "easy", text: "Прочитай фразу: слова в ней разделены ровно одним пробелом, в начале и в конце пробелов нет. Выведи, сколько в ней слов.", inputs: [["мама мыла раму"], ["привет мир"], ["раз два три четыре пять"], ["я и ты"]], code: py`
      s = input()
      count = 1
      for ch in s:
          if ch == " ":
              count = count + 1
      print(count)`, wrong: "s = input()\ncount = 0\nfor ch in s:\n    if ch == \" \":\n        count = count + 1\nprint(count)", hint: "Пробелов на один меньше, чем слов. С чего должен начинаться счётчик?" },
    { key: "binary", title: "Двоичная строка", level: "easy", rules: ["kind:for"], text: "Прочитай строку. Если она состоит только из символов 0 и 1, выведи «Да», иначе выведи «Нет».", inputs: [["101101"], ["1021"], ["0"], ["a1"], ["11a1"]], code: py`
      s = input()
      good = 0
      for ch in s:
          if ch == "0" or ch == "1":
              good = good + 1
      if good == len(s):
          print("Да")
      else:
          print("Нет")`, wrong: "s = input()\ngood = 0\nfor ch in s:\n    if ch == \"0\" or ch == \"1\":\n        good = good + 1\nif good > 0:\n    print(\"Да\")\nelse:\n    print(\"Нет\")", hint: "Посчитай подходящие символы. Ответ «Да», только если подходят все — их столько же, сколько символов в строке." },
    { key: "phone", title: "Только цифры", rules: ["kind:for"], text: "Прочитай номер телефона, записанный со скобками, пробелами и дефисами, и выведи только его цифры подряд. Например, «8 (900) 123-45-67» → «89001234567».", inputs: [["8 (900) 123-45-67"], ["+7 912 000-10-20"], ["(495) 1-2-3"], ["112"]], code: py`
      s = input()
      res = ""
      for ch in s:
          if ch >= "0" and ch <= "9":
              res = res + ch
      print(res)`, wrong: "s = input()\nres = \"\"\nfor ch in s:\n    if ch > \"0\" and ch <= \"9\":\n        res = res + ch\nprint(res)", hint: "Цифры идут подряд от \"0\" до \"9\", поэтому символ — цифра, если он не меньше \"0\" и не больше \"9\"." },
    { key: "vowels", title: "Гласные", rules: ["kind:for"], text: "Прочитай слово из строчных русских букв и выведи, сколько в нём гласных. Гласные: а, е, ё, и, о, у, ы, э, ю, я.", inputs: [["молоко"], ["ёжик"], ["стол"], ["аист"], ["подъезд"]], code: py`
      word = input()
      vowels = "аеёиоуыэюя"
      count = 0
      for ch in word:
          for v in vowels:
              if ch == v:
                  count = count + 1
      print(count)`, wrong: "word = input()\nvowels = \"аеиоуыэюя\"\ncount = 0\nfor ch in word:\n    for v in vowels:\n        if ch == v:\n            count = count + 1\nprint(count)", hint: "Сложи все гласные в одну строку и для каждой буквы слова пройди по ней вторым циклом. Не забудь букву «ё»." },
    { key: "first-pos", title: "Где буква", text: "Прочитай слово, а на второй строке — одну букву. Выведи номер первого места, где эта буква встречается в слове, считая буквы с единицы. Если буквы в слове нет, выведи 0.", inputs: [["колокол", "о"], ["банан", "н"], ["кот", "ы"], ["ааа", "а"], ["радуга", "а"]], code: py`
      word = input()
      letter = input()
      i = 0
      while i < len(word) and word[i] != letter:
          i = i + 1
      if i == len(word):
          print(0)
      else:
          print(i + 1)`, wrong: "word = input()\nletter = input()\ni = 0\nwhile i < len(word) and word[i] != letter:\n    i = i + 1\nprint(i + 1)", hint: "Шагай по номерам циклом while, пока не дошёл до конца и буква не та. Если дошёл до конца, буквы в слове нет." },
    { key: "longest-run", title: "Самый длинный повтор", rules: ["kind:for"], text: "Прочитай непустую строку и выведи длину самого длинного куска из одинаковых символов, стоящих подряд. Например, для «ааббббв» ответ 4.", inputs: [["ааббббв"], ["абввв"], ["коот"], ["zzzz"], ["ааббаааа"]], code: py`
      s = input()
      best = 1
      cur = 1
      for i in range(1, len(s)):
          if s[i] == s[i - 1]:
              cur = cur + 1
          else:
              cur = 1
          if cur > best:
              best = cur
      print(best)`, wrong: "s = input()\nbest = 1\ncur = 1\nfor i in range(1, len(s)):\n    if s[i] == s[i - 1]:\n        cur = cur + 1\n    else:\n        if cur > best:\n            best = cur\n        cur = 1\nprint(best)", hint: "Сравнивай каждый символ с предыдущим. Рекорд обновляй на каждом шаге, иначе повтор в самом конце строки потеряется." },
    { key: "caesar", title: "Шифр Цезаря", level: "hard", rules: ["kind:for"], text: "Прочитай слово из строчных русских букв, а затем целое число k от 0 до 32. Замени каждую букву на ту, что стоит в алфавите «абвгдеёжзийклмнопрстуфхцчшщъыьэюя» на k позиций дальше; после «я» алфавит начинается снова с «а». Например, «кот» при k = 1 → «лпу».", inputs: [["кот", "1"], ["яблоко", "1"], ["шифр", "0"], ["эхо", "5"], ["абв", "32"]], code: py`
      abc = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя"
      word = input()
      k = int(input())
      res = ""
      for ch in word:
          i = 0
          while abc[i] != ch:
              i = i + 1
          res = res + abc[(i + k) % 33]
      print(res)`, wrong: "abc = \"абвгдеёжзийклмнопрстуфхцчшщъыьэюя\"\nword = input()\nk = int(input())\nres = \"\"\nfor ch in word:\n    i = 0\n    while abc[i] != ch:\n        i = i + 1\n    res = res + abc[i + k]\nprint(res)", hint: "Найди номер буквы в алфавите циклом. В алфавите 33 буквы: остаток % 33 возвращает слишком большой номер в начало." },
    { key: "compress", title: "Сжатие", level: "hard", text: "Прочитай непустую строку и сожми её: каждый кусок из одинаковых символов подряд замени на символ и длину куска. Например, «ааабббв» → «а3б3в1», а «кот» → «к1о1т1».", inputs: [["ааабббв"], ["кот"], ["zzzzz"], ["ааббаа"], ["я"]], code: py`
      s = input()
      res = ""
      count = 1
      for i in range(1, len(s)):
          if s[i] == s[i - 1]:
              count = count + 1
          else:
              res = res + s[i - 1] + str(count)
              count = 1
      res = res + s[-1] + str(count)
      print(res)`, wrong: "s = input()\nres = \"\"\ncount = 1\nfor i in range(1, len(s)):\n    if s[i] == s[i - 1]:\n        count = count + 1\n    else:\n        res = res + s[i - 1] + str(count)\n        count = 1\nprint(res)", hint: "Кусок записывается, когда символ сменился. Последний кусок никто не сменит — допиши его после цикла." },
    { key: "brackets", title: "Скобки", level: "hard", text: "Прочитай строку из круглых скобок. Выведи «Да», если скобки расставлены правильно (каждой открывающей соответствует закрывающая после неё), иначе выведи «Нет». Например, «(()())» — правильно, а «())(» — нет.", inputs: [["(()())"], ["())("], ["(("], [")("], ["()"]], code: py`
      s = input()
      depth = 0
      ok = True
      for ch in s:
          if ch == "(":
              depth = depth + 1
          else:
              depth = depth - 1
          if depth < 0:
              ok = False
      if ok and depth == 0:
          print("Да")
      else:
          print("Нет")`, wrong: "s = input()\ndepth = 0\nfor ch in s:\n    if ch == \"(\":\n        depth = depth + 1\n    else:\n        depth = depth - 1\nif depth == 0:\n    print(\"Да\")\nelse:\n    print(\"Нет\")", hint: "Считай, сколько скобок сейчас открыто. Если в какой-то момент закрытых стало больше, чем открытых, ответ уже «Нет»." },
  ],
};
