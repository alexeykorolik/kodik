import { randomBytes,randomUUID } from "node:crypto";
import { createApp } from "../server/b2b/app.mjs";
const { server } = createApp({ secure: false });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`,
  tag = Date.now().toString(36),
  password = randomBytes(14).toString("base64url");
let cookie = "";
async function call(path, body) {
  if(path==='/assignments'&&body)body={request_key:randomUUID(),...body};
  const r = await fetch(origin + "/api" + path, {
    method: "POST",
    headers: {
      Origin: origin,
      "X-Kodik-Client": "2",
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
  if (r.headers.get("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  const data = await r.json();
  if (!r.ok) throw Error(data.error);
  return data;
}
try {
  const admin = `demo-admin-${tag}`,
    teacher = `demo-teacher-${tag}`,
    student = `demo-student-${tag}`;
  const registration = await call("/auth/register", {
    school: "Kodik · Демонстрационная школа",
    name: "Алексей",
    login: admin,
    password,
  });
  await call("/users", {
    name: "Анна",
    login: teacher,
    password,
    role: "teacher",
  });
  const learner = await call("/users", {
    name: "Миша",
    login: student,
    password,
    role: "student",
  });
  const course = await call("/courses", {
    title: "Python: первые открытия",
    description:
      "От первого print до собственных программ. Знакомимся с Python через практику.",
  });
  const module = await call("/modules", {
    course_id: course.id,
    title: "Первые строки кода",
  });
  const group = await call("/groups", { title: "Python · Старт" });
  await call(`/groups/${group.id}/members`, { user_id: learner.id });
  for (const spec of [
    {
      title: "Привет, мир!",
      lesson: "Первая программа",
      goal: "Научиться выводить текст с помощью print.",
      instruction: "Выведи строку Привет, мир! с помощью команды print.",
      theory:
        "Команда print выводит текст в консоль. Строки записываются в кавычках.",
      starter: "# Твоя первая программа\n",
      hints: ["Используй print.", "Не забудь кавычки вокруг строки."],
      tests: [{ inputs: [], expected: "Привет, мир!", hidden: false }],
      reference_solution:'print("Привет, мир!")',wrong_solutions:['print("Привет")'],
    },
    {
      title: "Удвоим число",
      lesson: "Ввод и вычисления",
      goal: "Прочитать число и выполнить вычисление.",
      instruction:
        "Прочитай целое число через input и выведи число, умноженное на 2.",
      theory:
        "input() получает текст. int(input()) превращает его в целое число.",
      starter: "number = int(input())\n",
      hints: ["Умножение записывается знаком *."],
      reference_solution:'n = int(input())\nprint(n * 2)',wrong_solutions:['print(10)'],
      tests: [
        { inputs: ["5"], expected: "10", hidden: false },
        { inputs: ["12"], expected: "24", hidden: true },
      ],
    },
    {
      title: "Моя программа",
      lesson: "Творческая практика",
      goal: "Применить новые знания.",
      instruction:
        "Придумай программу, которая задаёт вопрос и отвечает на него. Преподаватель проверит решение.",
      theory: "Объедини переменные, input и print в одной программе.",
      starter: "# Придумай свою программу\n",
      hints: ["Сохрани ответ пользователя в переменной."],
      tests: [],
      check_mode: "manual",
      manual_criteria:'Программа получает ответ пользователя и выводит понятное сообщение с ним. Нет ошибки выполнения; выполнено условие творческой работы.',
    },
  ]) {
    const lesson = await call("/lessons", {
      module_id: module.id,
      title: spec.lesson,
    });
    const task = await call("/tasks", {
      ...spec,
      lesson_id: lesson.id,
      description: "Практика для начинающих",
      difficulty: "easy",
      check_mode: spec.check_mode || "tests",
    });
    const verification=await call(`/tasks/${task.id}/verify`,{revision:1});
    if(verification.status!=='approved')throw new Error('Демонстрационное задание не прошло проверку качества.');
    await call(`/tasks/${task.id}/publish`, { published: true,revision:1 });
    await call("/assignments", { group_id: group.id, task_id: task.id });
  }
  console.log(
    `Демонстрационная школа создана. Это реальные записи в базе, без фиктивных результатов.\nАдминистратор: ${admin}\nПреподаватель: ${teacher}\nУченик: ${student}\nПароль для этих трёх демонстрационных аккаунтов: ${password}\nКод восстановления администратора: ${registration.recovery}\nСохраните данные локально. Не добавляйте их в Git.`,
  );
} finally {
  await new Promise((r) => server.close(r));
}
