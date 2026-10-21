import assert from "node:assert/strict";
import { runCourseProgram } from "../src/pythonExecution";
import { parseCourseProgram } from "../src/pythonRuntime";
import { checkScene, compareDrawing, comparePlots, checkRobot } from "../src/python/sceneCheck";
import { figuresAt, robotAt, turtleAt } from "../src/python/scene";
import { formatWorld, parseWorld } from "../src/python/robotWorld";
import { summarizePython, walkPython, structureError } from "../src/pythonStructure";
import { helpSections } from "../src/b2b/PythonHelp";
let checks = 0;
const ok = (value: unknown, message: string) => { assert.ok(value, message); checks++; };
const eq = (a: unknown, b: unknown, message: string) => { assert.deepEqual(a, b, message); checks++; };
const run = (code: string, inputs: string[] = [], world?: string) => runCourseProgram(code, inputs, world ? { world } : {});

// ---------- turtle scene ----------
{
  const r = run("import turtle\nt = turtle.Turtle()\nt.color('red', 'yellow')\nt.pensize(3)\nt.begin_fill()\nfor i in range(4):\n    t.forward(100)\n    t.left(90)\nt.end_fill()\nt.penup()\nt.goto(0, -50)\nt.dot(20, 'blue')\nt.write('квадрат', align='center')");
  ok(!r.error, `turtle program runs: ${r.error}`);
  const scene = r.scene!.turtle!, final = turtleAt(scene);
  eq(final.items.filter(i => i.kind === "line").length, 4, "four sides, the pen-up move draws nothing");
  ok(final.items.every(i => i.kind !== "line" || i.color === "red" && i.width === 3), "pen colour and width on each line");
  const fill = final.items.find(i => i.kind === "fill");
  ok(fill && fill.kind === "fill" && fill.color === "yellow" && fill.points.length >= 10, "fill polygon with the fill colour");
  ok(scene.items.findIndex(i => i.kind === "fill") < scene.items.findIndex(i => i.kind === "line"), "the fill lies under the outline drawn after begin_fill");
  ok(final.items.some(i => i.kind === "dot" && i.color === "blue" && i.size === 20) && final.items.some(i => i.kind === "text" && i.text === "квадрат"), "dot and write");
  ok(r.scene!.duration > 0, "default speed animates");
  const mid = turtleAt(scene, scene.items.find(i => i.kind === "line")!.t0 + 1);
  ok(mid.items.filter(i => i.kind === "line").length === 1, "replay at an early moment shows only the first line in progress");
  const fast = run("import turtle\nturtle.speed(0)\nturtle.circle(50)");
  eq(fast.scene!.duration, 0, "speed(0) draws instantly");
  eq(turtleAt(fast.scene!.turtle!).items.length, 20, "circle(50) uses CPython's 20 steps");
  const cleared = run("import turtle\nt = turtle.Turtle()\nt.forward(50)\nt.clear()\nt.forward(30)");
  eq(turtleAt(cleared.scene!.turtle!).items.length, 1, "clear() removes earlier drawings of that turtle");
  const tracer = run("import turtle, time\ns = turtle.Screen()\ns.tracer(0)\nt = turtle.Turtle()\nt.forward(50)\ntime.sleep(1)\ns.update()\nt.forward(50)\ntime.sleep(1)");
  const lines = tracer.scene!.turtle!.items.filter(i => i.kind === "line");
  eq(lines.map(l => l.t0), [1000, 2000], "tracer(0): drawings appear at update() or at the end of the program");
  const bg = run("import turtle\nturtle.bgcolor('black')\nturtle.shape('turtle')\nturtle.hideturtle()");
  eq(turtleAt(bg.scene!.turtle!).bg, "black", "bgcolor");
  ok(![...turtleAt(bg.scene!.turtle!).poses.values()][0].visible, "hideturtle");
  const colors = run("import turtle\nturtle.colormode(255)\nturtle.pencolor(255, 128, 0)\nprint(turtle.pencolor())\nturtle.colormode(1.0)\nturtle.pencolor((0, 0.5, 1))\nprint(turtle.pencolor(), turtle.color())");
  eq(colors.output, ["(255.0, 128.0, 0.0)", "(0.0, 0.5019607843137255, 1.0) ((0.0, 0.5019607843137255, 1.0), 'black')"], "colour values come back as CPython reports them");
  ok(/неизвестный цвет/.test(run("import turtle\nturtle.color('purpleish')").error ?? ""), "bad colour is an error");
  ok(/цвета должны быть от 0 до 1.0/.test(run("import turtle\nturtle.pencolor(255, 0, 0)").error ?? ""), "rgb out of the colormode range is an error");
  ok(/слишком далеко/.test(run("import turtle\nturtle.forward(10 ** 7)").error ?? ""), "far away is refused");
  ok(/Слишком много/.test(run("import turtle\nturtle.speed(0)\nfor i in range(30):\n    turtle.circle(50, steps=300)").error ?? ""), "too many lines is refused");
  const legacy = run("forward(50)\nleft(90)\nforward(50)");
  ok(!legacy.scene && legacy.segments.length === 2, "forward() without an import keeps the old course drawing");
}

// ---------- time and output timing ----------
{
  const r = run("import time\nfor i in range(3):\n    print(i)\n    time.sleep(0.5)");
  eq(r.outputTimes, [0, 500, 1000], "printed lines carry the moment they appear");
  ok(!run("print(1)").outputTimes, "programs without pauses have no timeline (old answers unchanged)");
  ok(!run("from pyrob.api import *\nfor i in range(5):\n    for j in range(50):\n        move_right()\n        move_left()\nimport time\ntime.sleep(1)", [], "R .").error, "a long Robot animation does not use up the pause limit");
  ok(/больше 60 секунд/.test(run("import time\nfor i in range(7):\n    time.sleep(10)").error ?? ""), "60 s limit for pauses");
}

// ---------- Robot ----------
{
  const world = "+-+-+-+-+\n|R . . *|\n+ +-+ + +\n|. .|P .|\n+-+-+-+-+";
  const parsed = parseWorld(world);
  eq([parsed.rows, parsed.cols, parsed.start, [...parsed.targets], [...parsed.parking]], [2, 4, [0, 0], ["0:3"], ["1:2"]], "field text: size, robot, target, parking");
  eq([...parsed.walls].sort(), ["h:1:1", "v:1:2"], "walls between cells");
  eq(parseWorld(formatWorld(parsed)), parsed, "field text round trip");
  eq(parseWorld("R . *\n. # P").filled.size, 1, "field without walls");
  for (const bad of ["", "R R", ". . .", "+-+\n|Z|\n+-+", "+-+-+\n|R .|"]) assert.throws(() => parseWorld(bad), bad);
  checks++;
  const solved = run("from pyrob.api import *\nmove_right(3)\nfill_cell()\nmove_down()\nmove_left()\nprint(get_pos(), is_parking_point(), cell_is_filled())", [], world);
  ok(!solved.error && solved.scene!.robot!.result.solved, `Robot solves the field: ${solved.error}`);
  eq(solved.output, ["(1, 2) True False"], "sensors and position");
  const crash = run("from pyrob.api import *\nmove_right()\nmove_down()", [], world);
  ok(/Робот врезался в стену снизу/.test(crash.error ?? "") && robotAt(crash.scene!.robot!).crashed, "a wall stops the program and the scene shows the crash");
  const unfinished = run("from pyrob.api import *\nmove_right(3)", [], world);
  ok(!unfinished.scene!.robot!.result.solved && /Не закрашено/.test(unfinished.scene!.robot!.result.problems.join(" ")), "unfilled target is reported");
  ok(/лишние/.test(run("from pyrob.api import *\nfill_cell()\nmove_right(3)\nfill_cell()\nmove_down()\nmove_left()", [], world).scene!.robot!.result.problems.join(" ")), "extra filled cell is reported");
  ok(/парковке/.test(run("from pyrob.api import *\nmove_right(3)\nfill_cell()", [], world).scene!.robot!.result.problems.join(" ")), "not on parking is reported");
  const sensors = run("from pyrob.api import *\nprint(wall_is_above(), wall_is_beneath(), wall_is_on_the_left(), wall_is_on_the_right())\nmove_right()\nprint(wall_is_beneath(), cell_should_be_filled())", [], world);
  eq(sensors.output, ["True False True False", "True False"], "wall sensors see borders and inner walls");
  const own = run("from pyrob.api import *\nset_field_size(2, 3)\ngoto(1, 1)\nput_wall(right=True)\nset_cell_type(0, 0, CELL_TO_BE_FILLED)\nset_parking_cell(1, 0)\nprint(wall_is_on_the_right(), get_field_size())\nmove_up()\nmove_left()\nfill_cell()\nmove_down()");
  ok(!own.error && own.scene!.robot!.result.solved, `program-made field: ${own.error}`);
  ok(/до первого шага/.test(run("from pyrob.api import *\nmove_right()\nset_field_size(3, 3)").error ?? ""), "setup after moving is refused");
  const tasks = run("from pyrob.api import *\n\n@task(delay=0.05)\ndef task_1():\n    move_right(3)\n    fill_cell()\n    move_down()\n    move_left()\n\nif __name__ == '__main__':\n    run_tasks()", [], world);
  ok(!tasks.error && tasks.scene!.robot!.result.solved && tasks.scene!.robot!.steps[0].t === 50, `@task(delay) and run_tasks: ${tasks.error}`);
  ok(/отметь функцию/.test(run("from pyrob.api import *\nrun_tasks()").error ?? ""), "run_tasks without @task is explained");
  ok(/с ошибкой/.test(run("from pyrob.api import *", [], "R Z").error ?? ""), "broken task field is reported, not ignored");
  const loops = run("from pyrob.api import *\nwhile not wall_is_on_the_right():\n    move_right()", [], "R . . . . . . .");
  eq(robotAt(loops.scene!.robot!).c, 7, "while with a sensor walks to the wall");
  ok(/больше 5000 шагов/.test(run("from pyrob.api import *\nfor i in range(30):\n    for j in range(100):\n        move_right()\n        move_left()", [], "R .").error ?? ""), "step limit");
}

// ---------- plots ----------
{
  const r = run("import numpy as np\nimport matplotlib.pyplot as plt\nx = np.linspace(0, 1, 5)\nplt.plot(x, x ** 2, 'r--o', label='квадрат')\nplt.scatter([0, 1], [1, 0], s=50, color='green')\nplt.title('Т')\nplt.xlabel('x')\nplt.ylabel('y')\nplt.grid(True)\nplt.legend()\nplt.xlim(0, 1)\nplt.show()\nplt.bar(['a', 'b'], [3, 5])\nplt.barh([1, 2], [4, 6])\nplt.show()\nplt.hist([1, 2, 2, 3], bins=3)");
  ok(!r.error, `plot program runs: ${r.error}`);
  const figs = figuresAt(r.scene!.plots!);
  eq(figs.length, 3, "two shown figures and one left open (shown at the end)");
  const [a, b, c] = figs.map(s => s.figure);
  eq([a.title, a.xlabel, a.ylabel, a.grid, a.legend, a.xlim], ["Т", "x", "y", true, true, [0, 1]], "titles, labels, grid, legend, limits");
  const line = a.series[0];
  ok(line.type === "line" && line.color === "#ff0000" && line.linestyle === "--" && line.marker === "o" && line.label === "квадрат" && line.y[4] === 1, "format string and label");
  ok(a.series[1].type === "scatter" && a.series[1].size === 50 && a.series[1].color === "#008000", "scatter");
  ok(b.series[0].type === "bar" && b.series[0].x[1] === "b" && b.series[1].type === "bar" && !!(b.series[1] as { horizontal?: boolean }).horizontal, "bar and barh with categories");
  ok(c.series[0].type === "hist" && c.series[0].counts.join() === "1,2,1", "histogram counts");
  ok(figuresAt(r.scene!.plots!).at(-1)!.auto === true, "a figure without show() is marked as shown at the end");
  const cleared = run("import matplotlib.pyplot as plt\nplt.plot([1, 2])\nplt.clf()\nplt.plot([3, 4])\nplt.show()");
  eq(figuresAt(cleared.scene!.plots!)[0].figure.series.length, 1, "clf clears the figure");
  const anim = run("import matplotlib.pyplot as plt\nfor i in range(3):\n    plt.clf()\n    plt.plot([0, i])\n    plt.pause(0.2)");
  eq(anim.scene!.plots!.map(s => s.t), [0, 200, 400, 600], "pause gives animation frames; the last state is shown at the end");
  eq(figuresAt(anim.scene!.plots!, 250)[0].figure.series[0].type === "line" && (figuresAt(anim.scene!.plots!, 250)[0].figure.series[0] as { y: number[] }).y[1], 1, "frame at a moment of the replay");
  const oo = run("import matplotlib.pyplot as plt\nfig, ax = plt.subplots()\nax.plot([1, 2, 3])\nax.set_title('OO')\nax.grid(True)\nplt.show()");
  ok(!oo.error && figuresAt(oo.scene!.plots!)[0].figure.title === "OO", `subplots and Axes methods: ${oo.error}`);
  for (const [code, message] of [
    ["import matplotlib.pyplot as plt\nplt.plot([1, 2], [1])", /Длины должны совпадать/],
    ["import matplotlib.pyplot as plt\nplt.plot([1], 'zz')", /Непонятная строка формата/],
    ["import matplotlib.pyplot as plt\nplt.plot([1], color='nocolor')", /Неизвестный цвет/],
    ["import matplotlib.pyplot as plt\nplt.subplots(2, 1)", /одну область/],
    ["import matplotlib.pyplot as plt\nplt.plot([1], wobble=2)", /нет аргумента «wobble»/],
    ["import matplotlib.pyplot as plt\nplt.hist([1, 2], bins=0)", /от 1 до 500/],
  ] as [string, RegExp][]) ok(message.test(run(code).error ?? ""), code);
}

// ---------- scene checks used by the grader ----------
{
  const square = "import turtle\nfor i in range(4):\n    turtle.forward(100)\n    turtle.left(90)";
  const expected = run(square).scene;
  const verdict = (code: string, kind = "drawing") => checkScene([kind], run(code).scene, expected);
  ok(verdict("import turtle\nturtle.left(90)\nfor i in range(4):\n    turtle.forward(100)\n    turtle.right(90)").passed, "same square drawn in another order and direction passes");
  ok(verdict("import turtle\nfor i in range(8):\n    turtle.forward(50)\n    if i % 2 == 1:\n        turtle.left(90)").passed, "sides split into halves pass");
  ok(verdict("import turtle\nturtle.speed(1)\nfor i in range(4):\n    turtle.forward(100.3)\n    turtle.left(90)").passed, "sub-pixel difference passes");
  ok(/не хватает/.test(verdict("import turtle\nfor i in range(3):\n    turtle.forward(100)\n    turtle.left(90)").message), "missing side fails");
  ok(/лишние/.test(verdict(square + "\nturtle.goto(100, 100)").message), "extra line fails");
  ok(verdict("import turtle\nturtle.color('red')\nfor i in range(4):\n    turtle.forward(100)\n    turtle.left(90)").passed, "a reference in the default black accepts any pen colour");
  const redSquare = run("import turtle\nturtle.color('red')\nfor i in range(4):\n    turtle.forward(100)\n    turtle.left(90)").scene;
  ok(/цвет/.test(checkScene(["drawing"], run("import turtle\nturtle.color('blue')\nfor i in range(4):\n    turtle.forward(100)\n    turtle.left(90)").scene, redSquare).message), "a colour chosen by the reference is required and named");
  ok(/ничего не нарисовала/.test(verdict("print(1)").message), "no drawing");
  ok(/Подключи turtle/.test(compareDrawing(undefined, expected?.turtle).message), "no turtle scene");
  const filled = run("import turtle\nturtle.fillcolor('blue')\nturtle.begin_fill()\nturtle.circle(40)\nturtle.end_fill()").scene;
  ok(!checkScene(["drawing"], run("import turtle\nturtle.circle(40)").scene, filled).passed, "missing fill fails");
  ok(/Подключи команды/.test(checkRobot(undefined).message), "robot check without pyrob");
  const plotRef = run("import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [1, 4, 9], label='y')\nplt.title('T')\nplt.grid(True)\nplt.legend()\nplt.show()").scene;
  const plot = (code: string) => comparePlots(run(code).scene?.plots, plotRef?.plots);
  ok(plot("import numpy as np\nimport matplotlib.pyplot as plt\nx = np.array([1, 2, 3])\nplt.plot(x, x * x, label='y')\nplt.title('T')\nplt.grid()\nplt.legend()\nplt.show()").passed, "same plot from numpy passes");
  ok(/заголовок/.test(plot("import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [1, 4, 9], label='y')\nplt.grid(True)\nplt.legend()").message), "missing title fails");
  ok(/точка 3/.test(plot("import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [1, 4, 8], label='y')\nplt.title('T')\nplt.grid(True)\nplt.legend()").message), "wrong value fails with the point");
  ok(/ожидается линия/.test(plot("import matplotlib.pyplot as plt\nplt.bar([1, 2, 3], [1, 4, 9], label='y')\nplt.title('T')\nplt.grid(True)\nplt.legend()").message), "other chart type fails");
  ok(/сетку/.test(plot("import matplotlib.pyplot as plt\nplt.plot([1, 2, 3], [1, 4, 9], label='y')\nplt.title('T')\nplt.legend()").message), "missing grid fails");
  ok(/не построила/.test(plot("print(1)").message), "no plot");
  ok(checkScene(["output"], undefined, undefined).passed, "text-only checks ignore scenes");
}

// ---------- isolation between runs, evidence, parse trees ----------
{
  const a = run("import random\nprint(random.random())"), b = run("import random\nprint(random.random())");
  ok(a.output[0] !== b.output[0], "unseeded random differs between runs");
  const t1 = run("import turtle\nturtle.forward(10)\nprint(turtle.pos())"), t2 = run("import turtle\nprint(turtle.pos())");
  eq([t1.output, t2.output], [["(10.00,0.00)"], ["(0.00,0.00)"]], "a new run starts with a fresh turtle");
  const p = run("import matplotlib.pyplot as plt\nplt.plot([1])"), q = run("import matplotlib.pyplot as plt\nplt.show()");
  ok(p.scene!.plots!.length === 1 && !q.scene?.plots?.length, "figures do not leak into the next run");
  const old = "n = int(input())\nfor i in range(n):\n    print(i)";
  eq(JSON.stringify(parseCourseProgram(old)), '[{"kind":"assign","name":"n","value":{"kind":"call","name":"int","args":[{"kind":"call","name":"input","args":[]}]}},{"kind":"for","name":"i","iterable":{"kind":"call","name":"range","args":[{"kind":"name","name":"n"}]},"body":[{"kind":"expression","value":{"kind":"call","name":"print","args":[{"kind":"name","name":"i"}]}}]}]', "old programs keep exactly their parse tree (evidence keys, start/solution comparison)");
  const loop = "import turtle\nfor i in range(4):\n    turtle.forward(100)\n    turtle.left(90)", program = parseCourseProgram(loop), result = run(loop);
  ok(!structureError(program, result, ["kind:for"]), "a loop that draws counts as a used loop");
  ok(!!structureError(parseCourseProgram("import turtle\nfor i in range(4):\n    x = i\nturtle.forward(100)"), run("import turtle\nfor i in range(4):\n    x = i\nturtle.forward(100)"), ["kind:for"]), "a loop that does not affect the drawing does not count");
  ok(walkPython(program).some(n => n.kind === "attribute"), "walk reaches library calls");
  ok(summarizePython(program).length > 0 && !summarizePython(program).includes("turtle"), "summary keeps public vocabulary only");
  ok(/долго/.test(run("import math\nwhile True:\n    pass").error ?? ""), "library programs still stop at the operation limit");
  ok(!run("import math\ns = 0\nfor i in range(1000):\n    s += math.sqrt(i)\nprint(round(s, 3))").error, "a library program has room for 1000 iterations");
}

// ---------- every help example runs ----------
let examples = 0;
for (const section of helpSections) for (const example of section.examples) {
  const r = run(example.code, ["4"]);
  ok(!r.error, `help example «${example.title}» runs: ${r.error}`);
  if (/turtle|pyrob|matplotlib/.test(example.code)) ok(!!r.scene, `help example «${example.title}» shows a scene`);
  examples++;
}
ok(examples >= 14, "help has examples for every library");
console.log(`✓ ${checks} scene checks: turtle, Robot, plots, time, grading comparisons, run isolation, evidence and ${examples} help examples.`);
