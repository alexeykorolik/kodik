import { py, type Chapter } from "../tasks";

export const turtlePatterns: Chapter = {
  key: "turtle-patterns", title: "Черепаха: узоры", level: "medium",
  description: "Функции с параметрами и вложенные циклы превращают одну фигуру в цветы, звёзды, заборы и сетки.",
  theory: "def square(size): создаёт команду с параметром: square(40) рисует квадрат со стороной 40, square(100) — со стороной 100. Внутри функции работает та же черепаха t. Узор — это фигура, повторённая в цикле: между повторениями черепаху поворачивают или переносят. Цикл внутри цикла рисует ряды и сетки: внешний перебирает ряды, внутренний — фигуры в ряду. Чтобы перейти к новому месту без линии, используй t.penup(), t.goto(x, y) и t.pendown(). Если фигура не должна сдвигать черепаху, верни её в исходное положение: после полного обхода многоугольника она и так стоит там, откуда начала.",
  rules: [], learned: ["Писать функции рисования с параметрами", "Строить узоры из повторённых и повёрнутых фигур", "Рисовать ряды и сетки вложенными циклами", "Вычислять углы для многоугольников и звёзд"],
  question: ["Черепаха 36 раз рисует квадрат и после каждого поворачивает налево на один и тот же угол. Каким должен быть угол, чтобы квадраты разошлись по полному кругу?", ["10°", "36°", "90°"], 0, "36 поворотов вместе дают 360°, значит каждый — 360 / 36 = 10°."],
  tasks: [
    { key: "square-func", title: "Три квадрата из угла", level: "easy", rules: ["kind:function", "kind:for"], text: "Напиши функцию square(size), которая рисует квадрат со стороной size, и нарисуй ею три квадрата из одной точки: со сторонами 40, 80 и 120.", draw: true, code: py`
      import turtle

      t = turtle.Turtle()

      def square(size):
          for i in range(4):
              t.forward(size)
              t.left(90)

      square(40)
      square(80)
      square(120)`, wrong: "import turtle\n\nt = turtle.Turtle()\n\ndef square(size):\n    for i in range(4):\n        t.forward(40)\n        t.left(90)\n\nsquare(40)\nsquare(80)\nsquare(120)", hint: "Внутри функции длина шага — это параметр size, а не конкретное число." },
    { key: "flower", title: "Цветок из квадратов", level: "easy", rules: ["nested_loop"], text: "Нарисуй цветок: 36 квадратов со стороной 80 из одной точки, после каждого квадрата поворот налево на 10°.", draw: true, code: py`
      import turtle

      t = turtle.Turtle()
      for k in range(36):
          for i in range(4):
              t.forward(80)
              t.left(90)
          t.left(10)`, wrong: "import turtle\n\nt = turtle.Turtle()\nfor k in range(36):\n    for i in range(4):\n        t.forward(80)\n        t.left(90)\n    t.left(5)", hint: "36 поворотов должны сложиться в полный круг 360°." },
    { key: "star-n", title: "Звезда с n лучами", level: "easy", rules: ["kind:for"], text: "Прочитай нечётное число n и нарисуй звезду с n лучами: n раз шаг вперёд на 150 и поворот направо на 180 − 180 / n градусов.", draw: true, inputs: [["5"], ["7"], ["9"], ["11"]], code: py`
      import turtle

      n = int(input())
      t = turtle.Turtle()
      for i in range(n):
          t.forward(150)
          t.right(180 - 180 / n)`, wrong: "import turtle\n\nn = int(input())\nt = turtle.Turtle()\nfor i in range(n):\n    t.forward(150)\n    t.right(360 / n)", hint: "Поворот на 360 / n рисует многоугольник, а у звезды угол острее: 180 − 180 / n." },
    { key: "spiral-angle", title: "Спираль с углом", level: "easy", rules: ["kind:for"], text: "Прочитай угол a. Нарисуй спираль из 40 отрезков: первый длиной 5, каждый следующий на 5 длиннее, после каждого — поворот налево на a градусов.", draw: true, inputs: [["90"], ["120"], ["89"], ["60"]], code: py`
      import turtle

      a = int(input())
      t = turtle.Turtle()
      for i in range(1, 41):
          t.forward(i * 5)
          t.left(a)`, wrong: "import turtle\n\na = int(input())\nt = turtle.Turtle()\nfor i in range(1, 41):\n    t.forward(5)\n    t.left(a)", hint: "Длина отрезка растёт вместе с номером шага: i * 5." },
    { key: "polygons", title: "Семейство многоугольников", rules: ["kind:function", "nested_loop"], text: "Напиши функцию polygon(n, side), которая рисует правильный n-угольник со стороной side. Нарисуй ею из одной точки многоугольники с числом сторон от 3 до 8 включительно, сторона у всех 50.", draw: true, code: py`
      import turtle

      t = turtle.Turtle()

      def polygon(n, side):
          for i in range(n):
              t.forward(side)
              t.left(360 / n)

      for n in range(3, 9):
          polygon(n, 50)`, wrong: "import turtle\n\nt = turtle.Turtle()\n\ndef polygon(n, side):\n    for i in range(n):\n        t.forward(side)\n        t.left(360 / n)\n\nfor n in range(3, 8):\n    polygon(n, 50)", hint: "range(3, 9) перебирает 3, 4, …, 8: правая граница в range не входит." },
    { key: "growing-row", title: "Растущие квадраты", rules: ["kind:function", "kind:for"], text: "Прочитай n и нарисуй в ряд n квадратов со сторонами 20, 40, 60 и так далее. Все квадраты стоят на одной линии, между соседними — промежуток 10 без линии. Первый начинается в центре холста.", draw: true, inputs: [["3"], ["4"], ["1"], ["5"]], code: py`
      import turtle

      t = turtle.Turtle()

      def square(size):
          for i in range(4):
              t.forward(size)
              t.left(90)

      n = int(input())
      for k in range(1, n + 1):
          square(20 * k)
          t.penup()
          t.forward(20 * k + 10)
          t.pendown()`, wrong: "import turtle\n\nt = turtle.Turtle()\n\ndef square(size):\n    for i in range(4):\n        t.forward(size)\n        t.left(90)\n\nn = int(input())\nfor k in range(1, n + 1):\n    square(20 * k)\n    t.penup()\n    t.forward(30)\n    t.pendown()", hint: "Сдвиг до следующего квадрата — сторона текущего плюс промежуток 10." },
    { key: "fence", title: "Забор черепахи", rules: ["kind:function", "kind:for"], text: "Прочитай n и нарисуй забор из n досок. Доска — прямоугольник шириной 20 и высотой 80, нарисованный от левого нижнего угла. Доски стоят в ряд с промежутком 10, промежутки — без линий. Нарисуй доску функцией plank().", draw: true, inputs: [["5"], ["8"], ["1"], ["3"]], code: py`
      import turtle

      t = turtle.Turtle()

      def plank():
          for i in range(2):
              t.forward(20)
              t.left(90)
              t.forward(80)
              t.left(90)

      n = int(input())
      for k in range(n):
          plank()
          t.penup()
          t.forward(30)
          t.pendown()`, wrong: "import turtle\n\nt = turtle.Turtle()\n\ndef plank():\n    for i in range(2):\n        t.forward(80)\n        t.left(90)\n        t.forward(20)\n        t.left(90)\n\nn = int(input())\nfor k in range(n):\n    plank()\n    t.penup()\n    t.forward(30)\n    t.pendown()", hint: "Черепаха смотрит вправо, поэтому сначала идёт ширина 20, а после поворота — высота 80." },
    { key: "chess-row", title: "Шахматный ряд", rules: ["kind:function", "kind:for", "kind:if"], text: "Нарисуй ряд из 8 квадратов со стороной 30 вплотную друг к другу. Первый, третий, пятый и седьмой квадраты залей чёрным (\"black\"), остальные оставь пустыми. Первый начинается в центре холста.", draw: true, code: py`
      import turtle

      t = turtle.Turtle()
      t.color("black", "black")

      def square():
          for i in range(4):
              t.forward(30)
              t.left(90)

      for k in range(8):
          if k % 2 == 0:
              t.begin_fill()
              square()
              t.end_fill()
          else:
              square()
          t.forward(30)`, wrong: "import turtle\n\nt = turtle.Turtle()\nt.color(\"black\", \"black\")\n\ndef square():\n    for i in range(4):\n        t.forward(30)\n        t.left(90)\n\nfor k in range(8):\n    if k % 2 == 1:\n        t.begin_fill()\n        square()\n        t.end_fill()\n    else:\n        square()\n    t.forward(30)", hint: "Номера в range начинаются с 0: первый квадрат — это k = 0, а чётные k — нечётные по счёту квадраты." },
    { key: "concentric", title: "Квадраты в квадрате", rules: ["kind:function", "kind:for"], text: "Прочитай n и нарисуй n квадратов с общим центром в (0, 0) и сторонами 40, 80, 120 и так далее. Квадрат со стороной s начинай из его левого нижнего угла (−s / 2, −s / 2). Переходы — без линий.", draw: true, inputs: [["3"], ["5"], ["1"], ["4"]], code: py`
      import turtle

      t = turtle.Turtle()

      def square(s):
          t.penup()
          t.goto(-s / 2, -s / 2)
          t.pendown()
          for i in range(4):
              t.forward(s)
              t.left(90)

      n = int(input())
      for k in range(1, n + 1):
          square(40 * k)`, wrong: "import turtle\n\nt = turtle.Turtle()\n\ndef square(s):\n    for i in range(4):\n        t.forward(s)\n        t.left(90)\n\nn = int(input())\nfor k in range(1, n + 1):\n    square(40 * k)", hint: "Чем больше квадрат, тем дальше от центра его угол: сначала перейди в (−s / 2, −s / 2)." },
    { key: "snowflake", title: "Снежинка", level: "hard", rules: ["kind:function", "kind:for"], text: "Нарисуй снежинку из 6 лучей, расходящихся из центра через 60°. Луч: вперёд на 60; веточка влево — поворот налево на 45°, вперёд 20, назад 20, поворот направо на 45°; такая же веточка вправо; дальше вперёд на 40 и назад на 100, в центр. Нарисуй луч функцией ray().", draw: true, code: py`
      import turtle

      t = turtle.Turtle()

      def ray():
          t.forward(60)
          t.left(45)
          t.forward(20)
          t.back(20)
          t.right(45)
          t.right(45)
          t.forward(20)
          t.back(20)
          t.left(45)
          t.forward(40)
          t.back(100)

      for i in range(6):
          ray()
          t.left(60)`, wrong: "import turtle\n\nt = turtle.Turtle()\n\ndef ray():\n    t.forward(60)\n    t.left(45)\n    t.forward(20)\n    t.back(20)\n    t.right(45)\n    t.right(45)\n    t.forward(20)\n    t.back(20)\n    t.left(45)\n    t.forward(40)\n\nfor i in range(6):\n    ray()\n    t.left(60)", hint: "Каждый луч должен заканчиваться в центре: после него черепаха возвращается назад на всю длину луча, 60 + 40." },
    { key: "grid", title: "Сетка", level: "hard", rules: ["kind:function", "nested_loop"], text: "Прочитай n и нарисуй сетку n × n из квадратов со стороной 20. Левый нижний угол сетки — в (0, 0): квадрат в ряду i и столбце j (считая с нуля) начинается в точке (20·j, 20·i). Переходы — без линий.", draw: true, inputs: [["3"], ["5"], ["1"], ["2"]], code: py`
      import turtle

      t = turtle.Turtle()

      def cell(x, y):
          t.penup()
          t.goto(x, y)
          t.pendown()
          for k in range(4):
              t.forward(20)
              t.left(90)

      n = int(input())
      for i in range(n):
          for j in range(n):
              cell(20 * j, 20 * i)`, wrong: "import turtle\n\nt = turtle.Turtle()\n\ndef cell(x, y):\n    t.penup()\n    t.goto(x, y)\n    t.pendown()\n    for k in range(4):\n        t.forward(20)\n        t.left(90)\n\nn = int(input())\nfor i in range(n):\n    for j in range(n):\n        cell(20 * j, 0)", hint: "Номер ряда i задаёт высоту: y = 20 · i, иначе все ряды лягут друг на друга." },
  ],
};
