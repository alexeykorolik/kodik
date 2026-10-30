import { field, py, type Chapter } from "../tasks";

export const robotFunc: Chapter = {
  key: "robot-func", title: "Робот: функции и циклы", level: "medium",
  description: "Собираем из команд Робота свои команды-функции и проходим поля любого размера вложенными циклами.",
  theory: "def fill_row(): создаёт новую команду: строки с отступом под ней выполняются каждый раз, когда в программе написано fill_row(). Так длинное действие пишут один раз, а вызывают много. Внутри функции можно использовать while, if и датчики: wall_is_on_the_right(), wall_is_beneath(), cell_should_be_filled() и другие. Цикл внутри цикла (или вызов функции с циклом внутри while) проходит поле по рядам: внутренний цикл идёт вдоль ряда, внешний переводит Робота на следующий ряд, пока снизу не стена. Размеры полей в тестах разные, поэтому число шагов считай датчиками, а не заранее.",
  rules: [], learned: ["Создавать свои команды через def", "Проходить ряд до стены и возвращаться", "Обходить всё поле ряд за рядом вложенными циклами", "Выбирать действие по датчикам в каждой клетке"],
  question: ["Сколько клеток закрасит Робот в коридоре из 4 клеток, начиная с левой?\ndef go():\n    while not wall_is_on_the_right():\n        move_right()\n        fill_cell()\n\ngo()\ngo()", ["3", "6", "4"], 0, "Первый вызов закрашивает три клетки правее Робота. При втором вызове справа уже стена, и цикл не выполняется ни разу."],
  tasks: [
    { key: "two-rows", title: "Две полосы", level: "easy", rules: ["kind:function", "kind:while"], text: "Поле из двух рядов, все клетки нужно закрасить. Напиши команду fill_row(), которая закрашивает клетку Робота и все клетки правее до стены, и вызови её для каждого ряда. Ширина поля в тестах разная.", worlds: [field("X * *", "* * *"), field("X * * * *", "* * * * *"), field("X *", "* *")], code: py`
      from pyrob.api import *

      def fill_row():
          fill_cell()
          while not wall_is_on_the_right():
              move_right()
              fill_cell()

      fill_row()
      move_down()
      while not wall_is_on_the_left():
          move_left()
      fill_row()`, wrong: "from pyrob.api import *\n\ndef fill_row():\n    fill_cell()\n    while not wall_is_on_the_right():\n        move_right()\n        fill_cell()\n\nfill_row()\nmove_down()\nfill_row()", hint: "После первого ряда Робот стоит у правой стены: перед вторым вызовом верни его к левой." },
    { key: "column-back", title: "Колодец", level: "easy", rules: ["kind:while"], text: "Робот стоит на парковке над колодцем. Закрась все клетки колодца под ним и вернись на парковку. Глубина колодца в тестах разная.", worlds: [field("Q", "*", "*"), field("Q", "*", "*", "*", "*"), field("Q", "*")], code: py`
      from pyrob.api import *

      while not wall_is_beneath():
          move_down()
          fill_cell()
      while not wall_is_above():
          move_up()`, wrong: "from pyrob.api import *\n\nwhile not wall_is_beneath():\n    move_down()\n    fill_cell()", hint: "Второй цикл поднимает Робота, пока сверху не окажется стена." },
    { key: "corners", title: "Четыре угла", level: "easy", rules: ["kind:while"], text: "Робот в левом верхнем углу прямоугольного поля. Закрась четыре угловые клетки поля. Размеры поля в тестах разные.", worlds: [field("X . *", ". . .", "* . *"), field("X . . . *", "* . . . *"), field("X . . *", ". . . .", ". . . .", "* . . *")], code: py`
      from pyrob.api import *

      fill_cell()
      while not wall_is_on_the_right():
          move_right()
      fill_cell()
      while not wall_is_beneath():
          move_down()
      fill_cell()
      while not wall_is_on_the_left():
          move_left()
      fill_cell()`, wrong: "from pyrob.api import *\n\nfill_cell()\nwhile not wall_is_on_the_right():\n    move_right()\nfill_cell()\nwhile not wall_is_beneath():\n    move_down()\nwhile not wall_is_on_the_left():\n    move_left()\nfill_cell()", hint: "В каждом углу — fill_cell(), а между углами — цикл до следующей стены." },
    { key: "gate", title: "Калитка", level: "easy", rules: ["kind:while"], text: "Справа от Робота забор с одной калиткой. Спускайся вниз, пока справа забор, пройди в калитку и спустись до парковки P в правом нижнем углу. Калитка в тестах в разных местах.", worlds: [
      field("+-+-+", "|R|.|", "+ + +", "|. .|", "+ + +", "|.|P|", "+-+-+"),
      field("+-+-+", "|R|.|", "+ + +", "|.|.|", "+ + +", "|.|.|", "+ + +", "|. .|", "+ + +", "|.|P|", "+-+-+"),
      field("+-+-+", "|R|.|", "+ + +", "|.|.|", "+ + +", "|. P|", "+-+-+")], code: py`
      from pyrob.api import *

      while wall_is_on_the_right():
          move_down()
      move_right()
      while not wall_is_beneath():
          move_down()`, wrong: "from pyrob.api import *\n\nwhile wall_is_on_the_right():\n    move_down()\nmove_right()", hint: "После калитки нужен ещё один цикл — вниз до стены." },
    { key: "frame", title: "Рамка Робота", rules: ["kind:while"], text: "Робот в левом верхнем углу. Закрась все клетки вдоль стен поля — получится рамка. Размеры поля в тестах разные.", worlds: [field("X * *", "* . *", "* * *"), field("X * * * *", "* . . . *", "* . . . *", "* * * * *"), field("X * * *", "* * * *")], code: py`
      from pyrob.api import *

      fill_cell()
      while not wall_is_on_the_right():
          move_right()
          fill_cell()
      while not wall_is_beneath():
          move_down()
          fill_cell()
      while not wall_is_on_the_left():
          move_left()
          fill_cell()
      while not wall_is_above():
          move_up()
          fill_cell()`, wrong: "from pyrob.api import *\n\nfill_cell()\nwhile not wall_is_on_the_right():\n    move_right()\n    fill_cell()\nwhile not wall_is_beneath():\n    move_down()\n    fill_cell()\nwhile not wall_is_on_the_left():\n    move_left()\n    fill_cell()", hint: "У рамки четыре стороны — четыре цикла: вправо, вниз, влево и вверх." },
    { key: "rectangle", title: "Всё поле", rules: ["kind:function", "kind:while"], text: "Закрась все клетки прямоугольного поля. Робот в левом верхнем углу; число рядов и их длина в тестах разные. Сделай команды fill_row() — закрасить ряд до правой стены — и back() — вернуться к левой стене.", worlds: [field("X * *", "* * *", "* * *"), field("X * * * *", "* * * * *"), field("X *", "* *", "* *", "* *")], code: py`
      from pyrob.api import *

      def fill_row():
          fill_cell()
          while not wall_is_on_the_right():
              move_right()
              fill_cell()

      def back():
          while not wall_is_on_the_left():
              move_left()

      fill_row()
      while not wall_is_beneath():
          back()
          move_down()
          fill_row()`, wrong: "from pyrob.api import *\n\ndef fill_row():\n    fill_cell()\n    while not wall_is_on_the_right():\n        move_right()\n        fill_cell()\n\nfill_row()\nwhile not wall_is_beneath():\n    move_down()\n    fill_row()", hint: "Цикл по рядам: пока снизу не стена — вернись влево, спустись и закрась следующий ряд." },
    { key: "stripes", title: "Полоски", rules: ["kind:function", "kind:while", "kind:if"], text: "Закрась ряд, где стоит Робот, и дальше каждый второй ряд поля: первый, третий, пятый… Робот в левом верхнем углу. Число рядов в тестах бывает и чётным, и нечётным.", worlds: [field("X * *", ". . .", "* * *"), field("X * * *", ". . . .", "* * * *", ". . . ."), field("X *", ". .", "* *", ". .", "* *")], code: py`
      from pyrob.api import *

      def fill_row():
          fill_cell()
          while not wall_is_on_the_right():
              move_right()
              fill_cell()

      def back():
          while not wall_is_on_the_left():
              move_left()

      fill_row()
      back()
      while not wall_is_beneath():
          move_down()
          if not wall_is_beneath():
              move_down()
              fill_row()
              back()`, wrong: "from pyrob.api import *\n\ndef fill_row():\n    fill_cell()\n    while not wall_is_on_the_right():\n        move_right()\n        fill_cell()\n\ndef back():\n    while not wall_is_on_the_left():\n        move_left()\n\nfill_row()\nback()\nwhile not wall_is_beneath():\n    move_down()\n    move_down()\n    fill_row()\n    back()", hint: "Пропустив ряд, проверь снова, есть ли под Роботом место: при чётном числе рядов второго шага вниз уже нет." },
    { key: "staircase", title: "Лестница", rules: ["nested_loop", "kind:while"], text: "Робот у подножия лестницы в левом нижнем углу. Поднимайся: иди вправо, пока не упрёшься в стенку ступеньки, затем шаг вверх. Так до верхнего ряда, а там дойди до парковки P в правом верхнем углу. Ступеньки в тестах разные.", worlds: [
      field("+-+-+-+-+-+", "|. . . . P|", "+ + + + + +", "|. . . .|.|", "+ + + + + +", "|R .|. . .|", "+-+-+-+-+-+"),
      field("+-+-+-+", "|. . P|", "+ + + +", "|R .|.|", "+-+-+-+"),
      field("+-+-+-+-+-+-+", "|. . . . . P|", "+ + + + + + +", "|. . . .|. .|", "+ + + + + + +", "|. . .|. . .|", "+ + + + + + +", "|R|. . . . .|", "+-+-+-+-+-+-+")], code: py`
      from pyrob.api import *

      while not wall_is_above():
          while not wall_is_on_the_right():
              move_right()
          move_up()
      while not wall_is_on_the_right():
          move_right()`, wrong: "from pyrob.api import *\n\nwhile not wall_is_above():\n    while not wall_is_on_the_right():\n        move_right()\n    move_up()", hint: "Внутренний цикл ведёт вдоль ступеньки, внешний поднимает выше. После лестницы остаётся пройти верхний ряд до конца." },
    { key: "hurdles", title: "Барьеры", rules: ["kind:function", "kind:while", "kind:if"], text: "Робот едет по нижнему ряду к гаражу P — над гаражом крыша (стена сверху), и прямо перед гаражом барьеров нет. На пути стоят барьеры — стенки справа от Робота. Напиши команду jump(): вверх, вправо, вниз — и перепрыгивай ею каждый барьер. Барьеры в тестах в разных местах.", worlds: [
      field("+-+-+-+-+-+", "|. . . . .|", "+ + + + +-+", "|R .|. . P|", "+-+-+-+-+-+"),
      field("+-+-+-+-+-+-+-+", "|. . . . . . .|", "+ + + + + + +-+", "|R|. . .|. . P|", "+-+-+-+-+-+-+-+"),
      field("+-+-+-+-+", "|. . . .|", "+ + + +-+", "|R .|. P|", "+-+-+-+-+")], code: py`
      from pyrob.api import *

      def jump():
          move_up()
          move_right()
          move_down()

      while not wall_is_above():
          if wall_is_on_the_right():
              jump()
          else:
              move_right()`, wrong: "from pyrob.api import *\n\ndef jump():\n    move_up()\n    move_right()\n\nwhile not wall_is_above():\n    if wall_is_on_the_right():\n        jump()\n    else:\n        move_right()", hint: "После прыжка Робот должен вернуться в нижний ряд, иначе он не доедет до гаража." },
    { key: "triangle", title: "Треугольник из клеток", level: "hard", rules: ["kind:function", "kind:while"], text: "Поле квадратное, Робот в левом верхнем углу. Закрась треугольник: в первом ряду одну клетку, во втором — две, в третьем — три и так до нижнего ряда. Напиши функцию row(k), которая закрашивает k клеток вправо от Робота и возвращает его к началу ряда. Размер поля в тестах разный.", worlds: [field("X .", "* *"), field("X . .", "* * .", "* * *"), field("X . . . .", "* * . . .", "* * * . .", "* * * * .", "* * * * *")], code: py`
      from pyrob.api import *

      def row(k):
          fill_cell()
          for i in range(k - 1):
              move_right()
              fill_cell()
          move_left(k - 1)

      k = 1
      row(k)
      while not wall_is_beneath():
          move_down()
          k += 1
          row(k)`, wrong: "from pyrob.api import *\n\ndef row(k):\n    fill_cell()\n    for i in range(k):\n        move_right()\n        fill_cell()\n    move_left(k)\n\nk = 1\nrow(k)\nwhile not wall_is_beneath():\n    move_down()\n    k += 1\n    row(k)", hint: "Первая клетка ряда закрашивается до цикла, поэтому шагов вправо на один меньше, чем клеток." },
    { key: "snake", title: "Змейка", level: "hard", rules: ["kind:function", "kind:while", "kind:if"], text: "Обойди всё поле змейкой — первый ряд слева направо, второй справа налево и так далее — и закрась только клетки со звёздочками (включая клетки в начале каждого ряда). Робот в левом верхнем углу; размеры поля и отметки в тестах разные.", worlds: [field("X . * .", ". * . *", "* . . *"), field("R * . . *", "* . * . ."), field("R . .", ". . *", "* . .", ". * .")], code: py`
      from pyrob.api import *

      def mark():
          if cell_should_be_filled():
              fill_cell()

      def go_right():
          mark()
          while not wall_is_on_the_right():
              move_right()
              mark()

      def go_left():
          mark()
          while not wall_is_on_the_left():
              move_left()
              mark()

      go_right()
      while not wall_is_beneath():
          move_down()
          if wall_is_on_the_right():
              go_left()
          else:
              go_right()`, wrong: "from pyrob.api import *\n\ndef mark():\n    if cell_should_be_filled():\n        fill_cell()\n\ndef go_right():\n    while not wall_is_on_the_right():\n        move_right()\n        mark()\n\ndef go_left():\n    while not wall_is_on_the_left():\n        move_left()\n        mark()\n\ngo_right()\nwhile not wall_is_beneath():\n    move_down()\n    if wall_is_on_the_right():\n        go_left()\n    else:\n        go_right()", hint: "Направление следующего ряда подскажет датчик: если справа стена, Робот пришёл справа и идёт влево. Не забудь проверить первую клетку ряда." },
  ],
};
