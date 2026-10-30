import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { runCourseProgram } from "../src/pythonExecution";
// Library behaviour checked against the pinned CPython 3.11.9 with real math, random and numpy.
// turtle geometry is compared with CPython's own turtle.TNavigator (the headless part of turtle.py),
// histograms with numpy.histogram. Only these reviewed programs reach CPython; never learner code.
const version = spawnSync("python", ["-I", "-c", "import platform, numpy; print(platform.python_version(), numpy.__version__)"], { encoding: "utf8" });
assert.equal(version.status, 0, version.stderr);
assert.match(version.stdout.trim(), /^3\.11\.9 2\./, "Use the pinned CPython 3.11.9 with NumPy 2.");

const cases = [
  // ---- imports, aliases, namespaces ----
  "import math\nprint(math.sqrt(16), math.pi)",
  "import math as m\nprint(m.floor(-2.5), m.ceil(2.1), m.trunc(-2.7), m.floor(2), m.ceil(3.0))",
  "from math import sqrt, pi as PI\nprint(sqrt(2), PI)",
  "from math import *\nprint(sin(pi / 6), cos(0), tan(pi / 4), degrees(pi), radians(180))",
  "import math, random\nprint(math.e > 2, random.random() < 1)",
  "import math\nprint(math.nosuch)",
  "from math import nosuch",
  "import numpy.nosuch",
  'if __name__ == "__main__":\n    print("main")',
  "def f():\n    import math\n    return math.sqrt(9)\nprint(f())",
  "print(int, float)",
  // ---- math ----
  "import math\nprint(math.pow(2, 10), math.pow(2, 0.5), math.fabs(-3), math.e, math.tau)",
  "import math\nprint(math.asin(1), math.acos(0), math.atan(1), math.atan2(1, -1), math.hypot(3, 4))",
  "import math\nprint(math.log(100, 10), math.log(math.e), math.log2(8), math.log10(1000), math.exp(1))",
  "import math\nprint(math.isqrt(17), math.factorial(10), math.gcd(12, 18), math.isclose(0.1 + 0.2, 0.3))",
  "import math\nprint(math.sqrt(-1))",
  "import math\nprint(math.log(0))",
  "import math\nfor a in [0, 30, 60, 90, 120, 180, 270, 360]:\n    r = math.radians(a)\n    print(a, math.sin(r), math.cos(r))",
  "import math\nprint(math.floor(-0.5), math.ceil(-0.5), math.trunc(9.99), math.sqrt(0.25), math.sqrt(2) ** 2)",
  // ---- builtins ----
  'print(float(3), float("2.5"), float(" -1e3 "), float("inf"), float("nan"), float())',
  'print(float("abc"))',
  "print(abs(-3), abs(-2.5), abs(True), abs(0.0))",
  "print(round(2.5), round(3.5), round(-0.5), round(2.675, 2), round(0.125, 2), round(1234, -2), round(7.0), round(2.5, 0), round(-1.005, 2))",
  "print(round(1.23456, 3), round(10.5), round(11.5), round(0.5), round(1.5), round(-2.5))",
  "print(pow(2, 10), pow(2, -1), pow(2.0, 3), pow(3, 4, 5), pow(-2, 3))",
  'print(min(3, 1, 2), max([4, 9, 2]), min("b", "a"), max(1, 2.5), min([], default=0), max(2, 2.0))',
  "print(max([]))",
  "print(sum([1, 2, 3]), sum([0.1, 0.2]), sum([1, 2], 10), sum(range(5)), sum([1.5, 2], 1))",
  "sum = 0\nfor i in range(3):\n    sum = sum + i\nprint(sum)",
  "print(bool(0), bool([1]), bool(''))",
  // ---- syntax ----
  "x = 5\nx += 2\nx *= 3\nx //= 4\nx -= 1\nx **= 2\nprint(x)\ny = 1\ny /= 4\nprint(y)",
  "a = [1, 2]\na[0] += 5\nprint(a)",
  "a, b = 1, 2\na, b = b, a\nprint(a, b)",
  "q, r = 17 // 5, 17 % 5\nprint(q, r)",
  "a, b = [1, 2, 3]",
  't = (1, 2.0, "a")\nprint(t, t[1], len(t), (5,), (), t[-1])',
  "t = (1, 2)\nt[0] = 3",
  'a = [0, 1, 2, 3, 4, 5]\nprint(a[1:3], a[::2], a[::-1], a[-2:], a[:100], a[4:1], "привет"[1:4], "abc"[::-1])',
  'print(1, 2, sep="-", end="!\\n")\nprint("a", end="")\nprint("b")\nprint(1, 2, sep="")',
  "lst = []\nfor i in range(3):\n    lst.append(i * i)\nlst.insert(0, 9)\nprint(lst, lst.pop(), lst.index(9), lst.count(1))\nlst.sort()\nprint(lst)\nlst.reverse()\nprint(lst)\nlst.extend([7, 8])\nlst.remove(7)\nprint(lst, lst.copy())",
  "a = [3, 1, 2]\na.sort(reverse=True)\nprint(a)",
  "def f(a):\n    return a\nprint(f(a=1))",
  "x = (2 + 3) * 2, 7\nprint(x)",
  // ---- random (CPython's Mersenne Twister) ----
  "import random\nrandom.seed(42)\nprint(random.random(), random.randint(1, 100), random.randrange(10), random.randrange(0, 100, 7), random.uniform(1, 2))",
  'import random\nrandom.seed(2024)\nitems = [1, 2, 3, 4, 5]\nrandom.shuffle(items)\nprint(items, random.choice(items), random.choice("abc"))',
  "from random import *\nseed(0)\nfor i in range(5):\n    print(randint(1, 6), random())",
  "import random\nrandom.seed(10 ** 10)\nprint(random.randint(0, 10 ** 11), random.random())",
  "import random\nrandom.seed(-5)\nprint(random.random())",
  "import random\nrandom.seed(1)\nprint(random.randrange(-10, 10, 3), random.randrange(10, 0, -2), random.randint(-3, 3))",
  "import random\nrandom.seed(7)\nnums = [1.5, 2, 3.0]\nrandom.shuffle(nums)\nprint(nums)",
  "import random\nprint(random.randint(5, 1))",
  "import random\nprint(random.choice([]))",
  "import random as r\nr.seed(3)\na = r.random()\nr.seed(3)\nprint(a == r.random())",
  // ---- time ----
  'import time\ntime.sleep(0.2)\nprint("ok")',
  "import time\ntime.sleep(-1)",
  "from time import sleep\nfor i in range(3, 0, -1):\n    print(i)\n    sleep(0.05)",
  // ---- numpy ----
  "import numpy as np\na = np.array([1, 2, 3])\nprint(a, a * 2, a / 2, a + a, a ** 2, a.sum(), a.mean(), len(a), -a)",
  "import numpy as np\nprint(np.arange(5), np.arange(1, 2, 0.25), np.linspace(0, 1, 7), np.zeros(3), np.ones((2, 2), dtype=int))",
  "import numpy as np\nb = np.arange(10)\nprint(b[2:5], b[::-2], b[b > 5], b[-1], b.shape, b.size, b.ndim)",
  "import numpy as np\nm = np.array([[1, 2], [3, 40]])\nprint(m, m[1, 0], m[:, 1], m.T, m.sum(axis=0), np.mean(m, axis=1))",
  "import numpy as np\nx = np.linspace(0, np.pi, 5)\nprint(np.sin(x), np.round(np.cos(x), 3), np.sqrt(np.array([1, 2, 3])))",
  "import numpy as np\nprint(np.arange(30) * 1.5)",
  "import numpy as np\nprint(np.linspace(-1, 1, 21))",
  "import numpy as np\nprint(np.array([1e-5, 1]), np.array([123456.789, 1.5]), np.array([True, False]), np.array([-1.5, 2]))",
  "import numpy as np\na = np.array([5, 3, 8])\na[0] = 10\na[a < 5] = 0\nprint(a, a.max(), a.argmax(), np.min(a), a.tolist(), [a])",
  "import numpy as np\nprint([np.array([0.5, 1, 1.5])], [np.arange(20) * 1.5])",
  "import numpy as np\nprint(np.array([[1, 2], [3]]))",
  "import numpy as np\nprint(np.array([1, 2]) + np.array([1, 2, 3]))",
  "from numpy import *\nprint(sum(array([1.5, 2])), pi, max(array([1, 5])))",
  "import numpy as np\nfor v in np.array([1.5, 2]):\n    print(v)",
  "import numpy as np\na = np.arange(6).reshape(2, 3)\nprint(a, a.reshape(3, -1), np.cumsum(np.array([1, 2, 3])), np.std(np.array([1, 2, 3, 4])), np.median(np.array([3, 1, 2])))",
  "import numpy as np\nprint(np.array([1, 2]) == 1, np.floor(np.array([1, 2])), np.ceil(np.array([1.5])), np.array([1, 2]).astype(float), np.array([1, 2]).dtype)",
  "import numpy as np\nm = np.zeros((3, 4))\nm[1, 2] = 7\nm[0] = 1\nprint(m, m[1:, 2:])",
  "import numpy as np\nprint(np.array([3, 1, 2]) * np.array([[1], [2]]))",
  "import numpy as np\nprint(np.abs(np.array([-1, 2])), np.exp(np.array([0, 1])), np.log(np.array([1.0, np.e])), abs(np.array([-2.5])))",
  "import numpy as np\nif np.array([1, 2]):\n    print(1)",
  "import numpy as np\nprint(np.arange(0, 1, 0.1), np.array([0.1, 0.25, 100.0]), np.array([1, 10, 100]))",
  "import numpy as np\nprint(np.sqrt(-1.0), np.array([1.0, 0.0]) / 0.0)",
  "import numpy as np\nprint(np.dot(np.array([1, 2]), np.array([3, 4])), np.prod(np.array([1, 2, 3])), np.sort(np.array([3, 1, 2])), np.array([], dtype=float))",
  // ---- turtle geometry (compared with turtle.TNavigator) ----
  "import turtle\nt = turtle.Turtle()\nt.forward(100)\nt.left(90)\nt.forward(50)\nprint(t.pos(), t.xcor(), t.ycor(), t.heading())",
  "from turtle import *\nfor i in range(5):\n    forward(100)\n    right(144)\nprint(position(), heading())",
  "import turtle\nturtle.circle(50)\nprint(turtle.pos(), turtle.heading())\nturtle.circle(30, 90)\nprint(turtle.pos(), turtle.heading())\nturtle.circle(-40, 180, 6)\nprint(turtle.pos(), turtle.heading(), turtle.xcor())",
  "import turtle as t\nt.goto(30, 40)\nprint(t.distance(0, 0), t.towards(0, 0), t.xcor(), t.pos())\nt.setheading(270)\nprint(t.heading())\nt.home()\nprint(t.pos(), t.heading(), t.xcor())",
  "import turtle\nt = turtle.Turtle()\nt.right(45)\nt.forward(10)\nt.setx(5)\nt.sety(-3.5)\nprint(t.pos(), t.heading())\nx, y = t.pos()\nprint(x, y)",
  "import turtle\nt = turtle.Turtle()\nfor i in range(36):\n    t.forward(10)\n    t.left(10)\nprint(t.pos(), t.heading(), t.xcor(), t.ycor())",
  "import turtle\nt = turtle.Turtle()\nt.backward(20)\nt.rt(30)\nt.fd(7.5)\nt.lt(400)\nprint(t.position(), t.heading(), t.distance(t.pos()), t.towards(100, 100))",
  "import turtle\na = turtle.Turtle()\nb = turtle.Turtle()\nb.goto(10, 0)\nprint(a.distance(b), a.towards(b))",
  // ---- matplotlib histograms (compared with numpy.histogram) ----
  "import matplotlib.pyplot as plt\nn, bins, p = plt.hist([1, 2, 2, 3, 3, 3, 10], bins=4)\nprint(n, bins)",
  "import matplotlib.pyplot as plt\nimport numpy as np\nn, b, p = plt.hist(np.array([0.5, 1, 1.5, 2]), bins=[0, 1, 2])\nprint(n, b)",
  "from matplotlib import pyplot as plt\nn, b, p = plt.hist([5, 5, 5])\nprint(n, b)",
];

// CPython side: real modules, a headless turtle built on turtle.TNavigator, and a pyplot whose hist is numpy.histogram.
const reference = String.raw`
import contextlib, io, json, sys, types
import turtle as real_turtle, numpy as np
class HeadlessTurtle(real_turtle.TNavigator):
    pass
for name in ["penup","pendown","pu","pd","up","down","pencolor","fillcolor","color","pensize","width","begin_fill","end_fill","hideturtle","showturtle","ht","st","shape","dot","write","stamp","clear","reset_drawing"]:
    setattr(HeadlessTurtle, name, lambda self, *a, **k: None)
def fresh_turtle():
    module = types.ModuleType("turtle")
    main = HeadlessTurtle()
    for name in dir(HeadlessTurtle):
        if not name.startswith("_"):
            setattr(module, name, getattr(main, name))
    module.Turtle = HeadlessTurtle
    module.done = module.mainloop = lambda *a: None
    return module
def fresh_pyplot():
    plt = types.ModuleType("matplotlib.pyplot")
    def hist(x, bins=10, range=None, **kw):
        n, b = np.histogram(np.asarray(x, dtype=float), bins=bins, range=range)
        return n.astype(float), b, None
    plt.hist = hist
    for name in ["plot","show","title","xlabel","ylabel","grid","legend","bar","scatter","clf","figure"]:
        setattr(plt, name, lambda *a, **k: None)
    package = types.ModuleType("matplotlib")
    package.pyplot = plt
    return package, plt
programs = json.loads(input())
results = []
for source in programs:
    sys.modules["turtle"] = fresh_turtle()
    sys.modules["matplotlib"], sys.modules["matplotlib.pyplot"] = fresh_pyplot()
    output = io.StringIO()
    try:
        with contextlib.redirect_stdout(output):
            exec(source, {"__name__": "__main__"})
        results.append({"output": output.getvalue().splitlines(), "error": False})
    except Exception:
        results.append({"output": output.getvalue().splitlines(), "error": True})
print(json.dumps(results, ensure_ascii=False))
`;
const run = spawnSync("python", ["-I", "-X", "utf8", "-c", reference], { encoding: "utf8", input: JSON.stringify(cases), timeout: 60000 });
assert.equal(run.status, 0, run.stderr);
const expected = JSON.parse(run.stdout);
let failures = 0;
for (const [i, source] of cases.entries()) {
  const actual = runCourseProgram(source);
  try {
    assert.deepEqual({ output: actual.output, error: Boolean(actual.error) }, expected[i]);
  } catch {
    failures++;
    console.error(`✗ ${JSON.stringify(source)}\n  CPython: ${JSON.stringify(expected[i])}\n  Kodik:   ${JSON.stringify({ output: actual.output, error: actual.error })}`);
  }
}
assert.equal(failures, 0, `${failures} library programs differ from CPython`);

// Kodik refuses what it does not provide, with a message instead of a silent difference.
for (const [source, message] of [
  ["import os", /Модуль «os» в Kodik недоступен/],
  ["import matplotlib\nmatplotlib.pyplot.plot([1])", /В модуле «matplotlib» нет «pyplot»/],
  ["import turtle\nturtle.onkey(print, 'Up')", /События мыши, клавиатуры/],
  ["import numpy as np\nnp.random.rand(3)", /numpy.random в Kodik не поддерживается/],
  ["import matplotlib.pyplot as plt\nplt.savefig('a.png')", /не сохраняются в файлы/],
  ["@staticmethod\ndef f():\n    pass", /только @task из pyrob.api/],
  ["import time\ntime.sleep(61)", /больше 60 секунд/],
  ["import turtle\nturtle.color('nosuchcolor')", /неизвестный цвет/],
] as [string, RegExp][]) assert.match(runCourseProgram(source).error ?? "", message, source);
// sin/cos come from the platform's maths library: CPython on Windows and on Linux may differ in the
// 17th significant digit, and so may Kodik. The values agree to 15 significant digits.
const trig = runCourseProgram("import math\nprint(math.sin(math.pi / 4), math.cos(math.pi / 4))").output[0].split(" ").map(Number);
for (const v of trig) assert.ok(Math.abs(v - Math.SQRT1_2) < 1e-15);
console.log(`✓ ${cases.length} library programs (math, random, time, numpy, turtle geometry, histograms, builtins, imports) match CPython 3.11.9.`);
