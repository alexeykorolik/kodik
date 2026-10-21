// Help page for the learning Python of Kodik: how to connect the libraries, what each one offers,
// runnable examples (they run in the browser with the same interpreter as the checker) and the exact limits.
import { ExampleRunner } from './LessonRun'

type Example = { title: string; code: string; note?: string }
type Section = { id: string; title: string; intro: string; items: [string, string][]; examples: Example[]; limits?: string[] }

export const helpSections: Section[] = [
  {
    id: 'imports', title: 'Как подключать библиотеки', intro: 'Библиотеки подключаются обычным импортом Python в начале программы. Каждый запуск начинается заново: черепаха, поле Робота, графики и случайные числа не переходят из прошлого запуска.',
    items: [
      ['import math', 'весь модуль; функции вызываются через точку: math.sqrt(2)'],
      ['import numpy as np', 'короткое имя (псевдоним): np.array([1, 2])'],
      ['from math import sqrt, pi as PI', 'выборочный импорт с псевдонимом'],
      ['from pyrob.api import *', 'все имена модуля сразу'],
      ['import matplotlib.pyplot as plt', 'вложенный модуль; import matplotlib без .pyplot pyplot не подключает — как в Python'],
      ['math, random, time, turtle, numpy, matplotlib.pyplot, pyrob.api', 'полный список доступных модулей'],
    ],
    examples: [{ title: 'Три способа подключить math', code: 'import math\nfrom math import sqrt\nimport math as m\n\nprint(math.sqrt(16), sqrt(16), m.sqrt(16))\nprint(math.pi)' }],
  },
  {
    id: 'builtins', title: 'Встроенные функции', intro: 'Работают без импорта.',
    items: [
      ['print(a, b, sep=" ", end="\\n")', 'вывод; sep — разделитель, end — окончание строки'],
      ['input(), int(x), str(x), float(x), bool(x)', 'ввод и преобразования; float("2.5"), float("inf")'],
      ['len(x), range(a, b, шаг)', 'длина списка, строки, кортежа, массива; диапазон'],
      ['abs(x), round(x), round(x, n), pow(a, b), pow(a, b, m)', 'round округляет «до чётного», как Python: round(2.5) == 2'],
      ['min(...), max(...), sum(список, начало)', 'min(3, 1, 2), max([4, 9]), min([], default=0), sum([1, 2], 10)'],
      ['список.append(x), extend, insert, pop, remove, index, count, sort, reverse, copy, clear', 'методы списков'],
      ['a, b = b, a;  x += 1;  t = (1, 2);  s[1:3], s[::-1]', 'множественное присваивание, +=, -=, *=, /=, //=, %=, **=, кортежи, срезы'],
      ['f(x=1)', 'именованные аргументы и у своих функций'],
    ],
    examples: [{ title: 'Округление и списки', code: 'nums = [3.7, -1.2, 8, 2.5]\nnums.append(4.5)\nprint(round(2.5), round(3.5), round(2.675, 2))\nprint(min(nums), max(nums), sum(nums))\nprint(abs(-7), pow(2, 10), float("1.5") * 2)\nprint(nums[1:3], nums[::-1])' }],
  },
  {
    id: 'turtle', title: 'turtle — черепаха', intro: 'Черепаха рисует на холсте 800×600 с началом координат в центре. 0° — вправо, углы растут против часовой стрелки. Рисунок появляется под программой с анимацией: её можно остановить, показать сразу или повторить.',
    items: [
      ['forward(d), backward(d), left(a), right(a)', 'шаг и поворот; сокращения fd, bk, back, lt, rt'],
      ['goto(x, y), setx(x), sety(y), setheading(a), home()', 'координаты и направление; setpos, setposition, seth'],
      ['position(), xcor(), ycor(), heading(), distance(x, y), towards(x, y)', 'где черепаха; pos() печатается как (100.00,0.00)'],
      ['penup(), pendown(), isdown(), pensize(w)', 'перо; pu, up, pd, down, width'],
      ['color("red"), color("red", "yellow"), pencolor(...), fillcolor(...)', 'цвета: имя, "#ff8800" или (r, g, b); colormode(255) — числа 0–255'],
      ['circle(r), circle(r, угол), circle(r, steps=6), dot(size, color)', 'окружности, дуги, многоугольники и точки'],
      ['begin_fill(), end_fill(), filling()', 'заливка фигуры цветом fillcolor'],
      ['shape("turtle"), shapesize(2), hideturtle(), showturtle(), stamp()', 'вид исполнителя: classic, arrow, turtle, circle, square, triangle, blank'],
      ['write("текст", align="center", font=("Arial", 16, "normal"))', 'надпись в точке черепахи'],
      ['speed(0…10), clear(), reset(), Turtle()', 'скорость анимации (0 — без анимации), очистка, новые черепахи'],
      ['Screen(), bgcolor(c), title(t), setup(w, h), setworldcoordinates(...)', 'экран: фон, заголовок, размер, свои координаты'],
      ['tracer(0), update(), clearscreen(), done(), mainloop()', 'кадры анимации: при tracer(0) рисунок появляется по update()'],
    ],
    examples: [
      { title: 'Звезда', code: 'import turtle\n\nt = turtle.Turtle()\nt.color("gold", "orange")\nt.begin_fill()\nfor i in range(5):\n    t.forward(150)\n    t.right(144)\nt.end_fill()\nprint(t.pos(), t.heading())' },
      { title: 'Круги разных цветов', code: 'from turtle import *\n\nspeed(0)\ncolors = ["red", "orange", "gold", "green", "blue", "purple"]\nfor i in range(6):\n    pencolor(colors[i])\n    pensize(3)\n    circle(40 + i * 15)\n    left(60)\nhideturtle()' },
      { title: 'Анимация: кадры через tracer и sleep', code: 'import turtle, time\n\nscreen = turtle.Screen()\nscreen.tracer(0)\nt = turtle.Turtle()\nt.shape("turtle")\nfor step in range(12):\n    t.clear()\n    t.penup()\n    t.goto(-200 + step * 35, 0)\n    t.pendown()\n    t.dot(30, "tomato")\n    screen.update()\n    time.sleep(0.15)' },
    ],
    limits: ['Нет событий мыши и клавиатуры (onkey, onclick, ontimer, listen), textinput и numinput: программа выполняется целиком, затем показывается анимация.', 'Только режим "standard"; нет undo, clone, begin_poly, register_shape и картинок фона.', 'write(move=True) не сдвигает черепаху; размер шрифта — до 200.', 'До 8000 линий и фигур, 16000 шагов анимации и 50 черепах за запуск.'],
  },
  {
    id: 'robot', title: 'pyrob.api — Робот', intro: 'Робот ходит по клеточному полю со стенами. Поле задаёт задание (его видно на вкладке «Задание»); без задания — пустое поле 6×8 с Роботом в левом верхнем углу. Строки и столбцы считаются с нуля сверху и слева. Робот, врезавшийся в стену, останавливает программу.',
    items: [
      ['move_left(n=1), move_right(n=1), move_up(n=1), move_down(n=1)', 'движение на n клеток'],
      ['wall_is_on_the_left(), wall_is_on_the_right(), wall_is_above(), wall_is_beneath()', 'датчики стен: True или False'],
      ['fill_cell(), cell_is_filled(), cell_should_be_filled(), is_parking_point()', 'закрашивание и состояние клетки'],
      ['get_pos(), get_field_size()', 'положение (строка, столбец) и размер поля'],
      ['set_field_size(r, c), goto(r, c), put_wall(left=, right=, top=, bottom=)', 'своё поле — только до первого шага Робота'],
      ['set_cell_type(r, c, CELL_TO_BE_FILLED), set_parking_cell(r, c)', 'клетки «закрасить» (CELL_EMPTY, CELL_FILLED) и парковка'],
      ['@task, @task(delay=0.1), run_tasks()', 'как в pyrob: отмеченная функция выполняется по run_tasks(); delay — пауза шага в секундах'],
    ],
    examples: [
      { title: 'Своё поле и путь до стены', code: 'from pyrob.api import *\n\nset_field_size(3, 6)\nset_cell_type(1, 5, CELL_TO_BE_FILLED)\ngoto(1, 0)\n\nwhile not wall_is_on_the_right():\n    move_right()\nfill_cell()\nprint(get_pos(), cell_is_filled())' },
      { title: 'Стиль pyrob: @task и run_tasks', code: 'from pyrob.api import *\n\n@task(delay=0.1)\ndef task_1():\n    for i in range(3):\n        move_down()\n        fill_cell()\n\nif __name__ == "__main__":\n    run_tasks()' },
    ],
    limits: ['Поле — до 20×20 клеток, до 5000 шагов Робота.', 'Регистры pyrob (mov, ax, bx) не поддерживаются.', 'Проверка «Робот выполнил поле»: закрашены все клетки «*», нет лишних закрашенных, Робот на парковке P (если она есть), без столкновений.'],
  },
  {
    id: 'math', title: 'math — математика', intro: 'Функции возвращают дробные числа (float), кроме ceil, floor, trunc, isqrt, factorial и gcd.',
    items: [
      ['sqrt(x), isqrt(n), pow(x, y), exp(x)', 'корни и степени'],
      ['fabs(x), ceil(x), floor(x), trunc(x)', 'модуль, округление вверх и вниз, отбрасывание дробной части'],
      ['sin, cos, tan, asin, acos, atan, atan2(y, x), hypot(x, y)', 'тригонометрия, углы — в радианах'],
      ['degrees(x), radians(x)', 'перевод радиан в градусы и обратно'],
      ['log(x), log(x, base), log2(x), log10(x)', 'логарифмы'],
      ['factorial(n), gcd(a, b), isclose(a, b)', 'целочисленные и сравнение дробных'],
      ['pi, e, tau, inf, nan', 'константы'],
    ],
    examples: [{ title: 'Треугольник', code: 'import math\n\na, b = 3, 4\nc = math.hypot(a, b)\nangle = math.degrees(math.atan2(b, a))\nprint(c, round(angle, 2))\nprint(math.ceil(2.1), math.floor(-2.5), math.trunc(-2.7))\nprint(math.sin(math.radians(30)), math.pi)' }],
    limits: ['Ошибки как в Python: math.sqrt(-1) и math.log(0) — «math domain error».', 'sin, cos и другие функции берутся из математической библиотеки устройства: последняя (17-я) значащая цифра может отличаться от Python на конкретном компьютере — сравнивайте округлённые значения.'],
  },
  {
    id: 'random', title: 'random — случайные числа', intro: 'Тот же генератор, что в CPython: после random.seed(n) числа совпадают с Python 3.11 на любом компьютере. Без seed каждый запуск даёт новые числа.',
    items: [
      ['randint(a, b), randrange(stop), randrange(a, b, шаг)', 'случайное целое (b в randint входит)'],
      ['random(), uniform(a, b)', 'дробное число от 0 до 1 или от a до b'],
      ['choice(последовательность), shuffle(список)', 'случайный элемент и перемешивание на месте'],
      ['seed(целое), seed()', 'повторяемая последовательность; без аргумента — новая'],
    ],
    examples: [{ title: 'Повторяемые броски', code: 'import random\n\nrandom.seed(42)\nfor i in range(3):\n    print(random.randint(1, 6), round(random.random(), 3))\ncards = ["A", "K", "Q", "J"]\nrandom.shuffle(cards)\nprint(cards, random.choice(cards))' }],
    limits: ['seed принимает целые числа; строки в seed, sample, choices, gauss не поддерживаются.'],
  },
  {
    id: 'time', title: 'time — паузы', intro: 'time.sleep(секунды) — пауза в анимации: вывод, рисунок, Робот и графики появляются с этими паузами. Страница при этом не зависает, анимацию можно остановить.',
    items: [
      ['sleep(s)', 'пауза; паузы time.sleep и plt.pause вместе — до 60 секунд за запуск'],
      ['time(), monotonic(), perf_counter()', 'время с учётом пауз программы'],
    ],
    examples: [{ title: 'Обратный отсчёт', code: 'import time\n\nfor i in range(5, 0, -1):\n    print(i)\n    time.sleep(0.5)\nprint("Старт!")' }],
    limits: ['Программа сначала выполняется целиком, затем воспроизводится по времени: sleep не ждёт действий пользователя.'],
  },
  {
    id: 'numpy', title: 'numpy — массивы', intro: 'Массивы целых, дробных и логических чисел любой размерности. Печать — как в NumPy 2: [1 2 3], [0.5 1.  1.5].',
    items: [
      ['array(список), zeros(n), ones((r, c)), full(n, v), arange(a, b, шаг), linspace(a, b, n)', 'создание массивов и последовательностей; dtype=int или float'],
      ['a[i], a[-1], a[1:4], a[::2], m[1, 2], m[:, 0], a[a > 5]', 'индексы, срезы, двумерные индексы и маски'],
      ['a + b, a * 2, a / 2, a ** 2, a // 3, a % 2, a > 1', 'поэлементные действия и сравнения, в том числе массив и число'],
      ['sqrt, sin, cos, tan, exp, log, log10, abs, floor, ceil, round, degrees, radians', 'математика над каждым элементом'],
      ['sum, mean, min, max, prod, std, median, argmin, argmax, cumsum, sort, dot', 'итоги; sum(m, axis=0) — по столбцам'],
      ['a.shape, a.size, a.ndim, a.dtype, a.T, a.reshape(2, 3), a.tolist(), a.astype(float)', 'свойства и методы массива'],
      ['pi, e, inf, nan', 'константы'],
    ],
    examples: [{ title: 'Таблица значений функции', code: 'import numpy as np\n\nx = np.linspace(0, 2, 5)\ny = x ** 2 - 1\nprint(x)\nprint(y)\nprint(y[y > 0], y.max(), y.argmax())\nm = np.arange(6).reshape(2, 3)\nprint(m)\nprint(m.sum(axis=0), m[:, 1])' }],
    limits: ['Элементы numpy (np.sum, a[0]) — обычные числа Python: в списке печатается [1.5], а не [np.float64(1.5)].', 'Нет numpy.random, строковых массивов и операторов & | ~ для масок.', 'Массив — до 10 000 элементов.'],
  },
  {
    id: 'pyplot', title: 'matplotlib.pyplot — графики', intro: 'Графики появляются под программой. plt.show() показывает и закрывает рисунок, plt.pause(s) показывает текущий кадр и ждёт — так делается анимация графика.',
    items: [
      ['plot(y), plot(x, y), plot(x, y, "r--o"), plot(x, y, color=, linestyle=, marker=, linewidth=, label=)', 'линии'],
      ['scatter(x, y, s=, color=, marker=), bar(x, h), barh(y, w), hist(data, bins=, range=)', 'точки, столбцы и гистограммы; hist возвращает (n, bins, …)'],
      ['title(t), xlabel(t), ylabel(t), grid(True), legend(), xlim(a, b), ylim(a, b), axis([…])', 'оформление'],
      ['show(), pause(s), figure(), clf(), cla(), close()', 'показ и очистка'],
      ['fig, ax = plt.subplots(); ax.plot(...); ax.set_title(...)', 'объектный стиль с одной областью графика'],
    ],
    examples: [
      { title: 'Две функции с легендой', code: 'import numpy as np\nimport matplotlib.pyplot as plt\n\nx = np.linspace(-3, 3, 61)\nplt.plot(x, x ** 2, label="x²")\nplt.plot(x, 2 * x + 1, "r--", label="2x + 1")\nplt.title("Графики функций")\nplt.xlabel("x")\nplt.ylabel("y")\nplt.grid(True)\nplt.legend()\nplt.show()' },
      { title: 'Столбцы и гистограмма', code: 'import random\nimport matplotlib.pyplot as plt\n\nplt.bar(["пн", "вт", "ср"], [5, 8, 3], color="teal")\nplt.title("Задачи за неделю")\nplt.show()\n\nrandom.seed(1)\ndata = []\nfor i in range(200):\n    data.append(random.randint(1, 6) + random.randint(1, 6))\nplt.hist(data, bins=11, edgecolor="black")\nplt.title("Сумма двух кубиков")\nplt.show()' },
      { title: 'Анимация графика', code: 'import matplotlib.pyplot as plt\n\nxs, ys = [], []\nfor x in range(10):\n    xs.append(x)\n    ys.append(x * x)\n    plt.clf()\n    plt.plot(xs, ys, "o-")\n    plt.xlim(0, 9)\n    plt.ylim(0, 81)\n    plt.pause(0.3)\nplt.show()' },
    ],
    limits: ['Одна область графика на рисунок: subplots(2, 1) и составные столбики (bottom=) не поддерживаются.', 'В scatter один цвет для всех точек; xticks/yticks задаются автоматически.', 'savefig недоступен; до 20 000 точек, 20 открытых рисунков и 300 кадров pause/show.', 'Рисунок без plt.show() тоже показывается в конце, с подписью — в обычном Python для этого нужен show().'],
  },
]

const general = [
  'Не поддерживаются: классы, lambda, генераторы списков, словари и множества, f-строки, методы строк, операторы in и is, break и continue, try/except, with, global, вложенные функции, значения параметров по умолчанию, *args, присваивание свойствам через точку.',
  'Лимиты запуска: 10 000 операций (50 000, если подключена библиотека), до 500 строк и 100 000 символов вывода, списки — до 1000 элементов, целые числа в арифметике — до 10¹² по модулю.',
  'Программа выполняется целиком, затем результат воспроизводится: input() берёт строки из поля ввода, события клавиатуры и мыши недоступны.',
  'Без импорта команды forward, left и right рисуют простую линию в старых уроках курса; для рисунков с цветом, заливкой и анимацией подключите turtle.',
]

export function PythonHelp() {
  return <article className="python-help">
    <header className="page-heading"><div><div className="eyebrow">СПРАВКА</div><h1>Python в Kodik: библиотеки и примеры</h1><p>Примеры запускаются прямо здесь тем же интерпретатором, который проверяет задания.</p></div></header>
    <nav className="panel help-contents" aria-label="Разделы справки"><ol>{helpSections.map(s => <li key={s.id}><a href={`#python-help/${s.id}`} onClick={e => { e.preventDefault(); document.getElementById(`help-${s.id}`)?.scrollIntoView({ block: 'start' }) }}>{s.title}</a></li>)}<li><a href="#python-help/limits" onClick={e => { e.preventDefault(); document.getElementById('help-limits')?.scrollIntoView({ block: 'start' }) }}>Общие ограничения</a></li><li><a href="#python-help/checks" onClick={e => { e.preventDefault(); document.getElementById('help-checks')?.scrollIntoView({ block: 'start' }) }}>Как проверяются задания</a></li></ol></nav>
    {helpSections.map(s => <section className="panel help-section" id={`help-${s.id}`} key={s.id} aria-labelledby={`help-${s.id}-title`}>
      <h2 id={`help-${s.id}-title`}>{s.title}</h2>
      <p>{s.intro}</p>
      <table className="help-table"><tbody>{s.items.map(([code, text]) => <tr key={code}><th scope="row"><code>{code}</code></th><td>{text}</td></tr>)}</tbody></table>
      {s.examples.map(example => <div className="help-example" key={example.title}><h3>{example.title}</h3><pre className="lesson-code">{example.code}</pre><ExampleRunner code={example.code} /></div>)}
      {s.limits && <><h3>Ограничения</h3><ul>{s.limits.map(l => <li key={l}>{l}</li>)}</ul></>}
    </section>)}
    <section className="panel help-section" id="help-limits"><h2>Общие ограничения</h2><ul>{general.map(l => <li key={l}>{l}</li>)}</ul></section>
    <section className="panel help-section" id="help-checks"><h2>Как проверяются задания</h2>
      <p>Преподаватель выбирает для каждого теста, что проверять:</p>
      <ul>
        <li><b>Текст вывода</b> — то, что напечатала программа, совпадает с ожидаемым (как раньше).</li>
        <li><b>Рисунок черепахи</b> — итоговый рисунок совпадает с рисунком эталона: те же линии, заливки, точки, надписи и фон; цвета — если эталон их задаёт (чёрный по умолчанию не сравнивается). Порядок рисования и мелкие отличия в доли пикселя не важны.</li>
        <li><b>Робот выполнил поле</b> — все клетки «*» закрашены, лишних нет, Робот закончил на парковке и ни разу не врезался.</li>
        <li><b>Графики</b> — те же виды графиков и данные, а также заголовки, подписи осей, сетка, легенда и границы, если они есть у эталона.</li>
      </ul>
      <p>Скрытые тесты не показывают подробностей. В открытых тестах при ошибке ученик видит, что отличается, и картинку «Должно получиться».</p>
    </section>
  </article>
}
