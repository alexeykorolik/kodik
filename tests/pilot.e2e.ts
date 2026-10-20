import { test, expect, type Page } from "@playwright/test";
import {taskFixture} from './helpers/task-fixture.mjs';
const password = "Pilot-browser-reference-321!";
async function call(page: Page, path: string, body?: unknown) {
  if(path==='/tasks'&&body)body=taskFixture(body);
  if(/\/tasks\/[^/]+\/publish$/.test(path)&&(body as any)?.published){const id=path.split('/')[2],task=(await call(page,'/state')).tasks.find((t:any)=>t.id===id);const proof=await call(page,`/tasks/${id}/verify`,{revision:task.revision});expect(proof.status,JSON.stringify(proof)).toBe('approved');body={revision:task.revision,...(body as object)}}
  if(path==='/assignments'&&body)body={request_key:crypto.randomUUID(),...(body as object)};
  const r = await page.request.fetch("/api" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Origin: "http://127.0.0.1:4186", "X-Kodik-Client": "2" },
    data: body,
  });
  const data = await r.json();
  expect(r.status(), JSON.stringify(data)).toBe(200);
  return data;
}
async function school(page: Page) {
  const tag = crypto.randomUUID().slice(0, 8),
    login = `pilot-${tag}`;
  await call(page, "/auth/register", {
    school: `Pilot ${tag}`,
    name: "Teacher",
    login,
    password,
  });
  const course = await call(page, "/courses", { title: "Course" }),
    module = await call(page, "/modules", {
      title: "Module",
      course_id: course.id,
    }),
    lesson = await call(page, "/lessons", {
      title: "Lesson",
      module_id: module.id,
    });
  return { tag, login, course, module, lesson };
}
async function task(page: Page, lesson: string,fields:Record<string,unknown>={}) {
  return call(page, "/tasks", {
    lesson_id: lesson,
    title: "Safe draft",
    description: "",
    goal: "",
    theory: "",
    instruction: "Print 42",
    difficulty: "easy",
    starter: "",
    hints: [],
    check_mode: "output",
    tests: [{ inputs: [], expected: "42", hidden: false }],
    ...fields,
  });
}

test('lost issuance response survives reload; retry, deadline change and explicit repeat keep the intended contexts',async({page})=>{
  const setup=await school(page),material=await task(page,setup.lesson.id),group=await call(page,'/groups',{title:'Reliable class'});
  await call(page,`/tasks/${material.id}/publish`,{published:true});
  await page.goto('/#groups');
  await page.getByRole('button',{name:'Назначить задание',exact:false}).click();
  await page.route('**/api/assignments',async route=>{await route.fetch();await route.abort('failed')},{times:1});
  await page.getByRole('dialog').getByRole('button',{name:'Выдать группе',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  const issued=(await call(page,'/state')).assignments;
  expect(issued).toHaveLength(1);
  await page.reload();
  await page.getByRole('button',{name:'Назначить задание',exact:false}).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('Выдача сохранена');
  await page.getByRole('button',{name:'Проверить результат выдачи',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await call(page,'/state')).assignments.map((a:any)=>a.id)).toEqual([issued[0].id]);
  await page.getByRole('button',{name:'Срок',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Срок (необязательно)').fill('2026-12-15');
  await page.getByRole('dialog').getByRole('button',{name:'Сохранить',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const changed=(await call(page,'/state')).assignments;
  expect(changed).toHaveLength(1);expect(changed[0].id).toBe(issued[0].id);expect(changed[0].due_at).toBe('2026-12-15T00:00:00.000Z');
  await page.getByRole('button',{name:'Назначить повторно',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('отдельное прохождение');
  await page.getByRole('dialog').getByRole('button',{name:'Назначить повторно',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const repeated=(await call(page,'/state')).assignments;
  expect(repeated).toHaveLength(2);expect(repeated[0].group_id).toBe(group.id);expect(new Set(repeated.map((a:any)=>a.id)).size).toBe(2);
});

test('continuation follows the course order when the second lesson was assigned first',async({page})=>{
  const setup=await school(page),lesson2=await call(page,'/lessons',{module_id:setup.module.id,title:'Second lesson'});
  const first=await task(page,setup.lesson.id,{title:'First lesson work'}),second=await task(page,lesson2.id,{title:'Second lesson work'});
  for(const material of [first,second])await call(page,`/tasks/${material.id}/publish`,{published:true});
  const group=await call(page,'/groups',{title:'Ordered class'}),login=`ordered-${setup.tag}`;
  const user=await call(page,'/users',{name:'Learner',login,password,role:'student'});
  await call(page,`/groups/${group.id}/members`,{user_id:user.id});
  const later=await call(page,'/assignments',{group_id:group.id,task_id:second.id});
  const earlier=await call(page,'/assignments',{group_id:group.id,task_id:first.id});
  await call(page,'/auth/logout',{});await page.goto('/');
  await page.getByLabel('Логин',{exact:true}).fill(login);await page.getByLabel('Пароль',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Войти в Kodik',exact:true}).click();
  await page.getByRole('button',{name:/Продолжить обучение/}).click();
  await expect(page).toHaveURL(new RegExp(`#assignment/${earlier.id}$`));
  await expect(page.getByRole('heading',{name:'First lesson work',exact:true})).toBeVisible();
  await page.locator('#python-answer').fill('print(42)');
  await page.getByRole('button',{name:'Проверить решение',exact:true}).click();
  await expect(page.getByText('Отлично! Все тесты пройдены.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Следующее задание →',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`#assignment/${later.id}$`));
});

test('repeat assignment opens a fresh workspace and leaves the previous result intact',async({page,browser})=>{
  const setup=await school(page),material=await task(page,setup.lesson.id),login=`version-student-${setup.tag}`;
  const uid=(await call(page,'/users',{name:'Learner',login,password,role:'student'})).id;
  const group=await call(page,'/groups',{title:'Version group'});
  await call(page,`/groups/${group.id}/members`,{user_id:uid});
  await call(page,`/tasks/${material.id}/publish`,{published:true});
  const first=await call(page,'/assignments',{group_id:group.id,task_id:material.id});
  const learnerContext=await browser.newContext({baseURL:'http://127.0.0.1:4186'}),learner=await learnerContext.newPage();
  try{
    await call(learner,'/auth/login',{login,password});
    await learner.goto(`/#assignment/${first.id}`);
    await learner.locator('#python-answer').fill('print(42)');
    await learner.getByRole('button',{name:'Проверить решение',exact:true}).click();
    await expect(learner.getByText('Отлично! Все тесты пройдены.',{exact:true})).toBeVisible();
    await learner.getByRole('button',{name:'← К моим курсам',exact:true}).click();
    await expect(learner.getByRole('button',{name:/Курс завершён/})).toBeVisible();
    const original=(await call(page,'/state')).tasks.find((t:any)=>t.id===material.id);
    const update=await page.request.put(`/api/tasks/${material.id}`,{headers:{Origin:'http://127.0.0.1:4186','X-Kodik-Client':'2'},data:{...original,title:'New version',starter:'# Fresh assignment\n',reference_solution:'print(43)',tests:[{inputs:[],expected:'43',hidden:false}]}});
    expect(update.status()).toBe(200);
    await call(page,`/tasks/${material.id}/publish`,{published:true,revision:2});
    const second=await call(page,'/assignments',{group_id:group.id,task_id:material.id,repeat_of:first.id});
    await learner.reload();
    await expect(learner.getByText('Пройдено 1 из 2',{exact:true})).toBeVisible();
    await learner.getByRole('button',{name:/Продолжить обучение/}).click();
    await expect(learner).toHaveURL(new RegExp(`assignment/${second.id}$`));
    await expect(learner.locator('#python-answer')).toHaveValue('# Fresh assignment\n');
    await expect(learner.getByText('Version group · Попыток: 0',{exact:true})).toBeVisible();
    await learner.getByRole('button',{name:'Попытки',exact:true}).click();
    await expect(learner.getByText('Пока нет отправленных решений.',{exact:true})).toBeVisible();
    await learner.goto(`/#assignment/${first.id}`);
    await expect(learner.locator('#python-answer')).toHaveValue('print(42)');
    await expect(learner.getByRole('heading',{name:'Safe draft',exact:true})).toBeVisible();
    await expect(learner.getByText('✓ Выполнено',{exact:true})).toBeVisible();
  }finally{await learnerContext.close()}
});

test("teacher leaves an incomplete draft, restores offline work and resolves a second teacher conflict", async ({
  page,
  browser,
}) => {
  const setup = await school(page),
    material = await task(page, setup.lesson.id),
    secondLogin = `peer-${setup.tag}`;
  await call(page, "/users", {
    name: "Peer teacher",
    login: secondLogin,
    password,
    role: "teacher",
  });
  await page.goto(`/#builder/${material.id}`);
  await page.getByRole("button", { name: /Содержимое/ }).click();
  await page.getByLabel("Инструкция для ученика").fill("");
  await page
    .getByLabel("Теория перед заданием")
    .fill("Незаконченная теория преподавателя");
  await page.getByRole("link", { name: "Обзор", exact: true }).click();
  await page.getByRole("link", { name: /^Задания/ }).click();
  await page.getByRole("button", { name: "Safe draft", exact: true }).click();
  await page.getByRole("button", { name: /Содержимое/ }).click();
  await expect(page.getByLabel("Теория перед заданием")).toHaveValue(
    "Незаконченная теория преподавателя",
  );
  await expect(page.getByLabel("Инструкция для ученика")).toHaveValue("");
  await page.context().setOffline(true);
  await page
    .getByLabel("Теория перед заданием")
    .fill("Текст, введённый без соединения");
  await page.getByRole("link", { name: "Обзор", exact: true }).click();
  await page.getByRole("link", { name: /^Задания/ }).click();
  await page.getByRole("button", { name: "Safe draft", exact: true }).click();
  await page.getByRole("button", { name: /Содержимое/ }).click();
  await expect(page.getByLabel("Теория перед заданием")).toHaveValue(
    "Текст, введённый без соединения",
  );
  await page.context().setOffline(false);
  await expect(
    page.getByText("Сохранено на сервере", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.reload();
  await page.getByRole("button", { name: /Содержимое/ }).click();
  await expect(page.getByLabel("Теория перед заданием")).toHaveValue(
    "Текст, введённый без соединения",
  );
  const context = await browser.newContext(),
    peer = await context.newPage();
  try {
    await call(peer, "/auth/login", { login: secondLogin, password });
    await peer.goto(`/#builder/${material.id}`);
    await peer.getByRole("button", { name: /Содержимое/ }).click();
    await page
      .getByLabel("Инструкция для ученика")
      .fill("Правка первого преподавателя");
    await expect(
      page.getByText("Сохранено на сервере", { exact: true }),
    ).toBeVisible();
    await peer
      .getByLabel("Инструкция для ученика")
      .fill("Правка второго преподавателя");
    await expect(
      peer.getByRole("region", { name: "Разрешение конфликта" }),
    ).toBeVisible();
    await expect(
      peer.getByText("Правка первого преподавателя", { exact: false }).first(),
    ).toBeVisible();
    await peer
      .getByRole("button", {
        name: "Применить мою версию с сохранением истории",
      })
      .click();
    await expect(
      peer.getByText("Сохранено на сервере", { exact: true }),
    ).toBeVisible();
    const history = await call(peer, `/tasks/${material.id}/revisions`);
    expect(
      history.items.some(
        (r: any) =>
          r.conflict &&
          r.content.instruction === "Правка второго преподавателя",
      ),
    ).toBeTruthy();
    expect(
      history.items.some(
        (r: any) => r.content.instruction === "Правка первого преподавателя",
      ),
    ).toBeTruthy();
  } finally {
    await context.close();
  }
});

test("student actions remain reachable at school laptop resolutions, long code and a visible runtime error", async ({
  page,
}) => {
  const setup = await school(page),
    material = await task(page, setup.lesson.id),
    studentLogin = `learner-${setup.tag}`;
  const student = await call(page, "/users", {
      name: "Student",
      login: studentLogin,
      password,
      role: "student",
    }),
    group = await call(page, "/groups", { title: "Group" });
  await call(page, `/groups/${group.id}/members`, { user_id: student.id });
  await call(page, `/tasks/${material.id}/publish`, { published: true });
  await call(page, "/assignments", {
    task_id: material.id,
    group_id: group.id,
  });
  await call(page, "/auth/logout", {});
  await page.goto('/');
  await page.getByLabel('Логин',{exact:true}).fill(studentLogin);
  await page.getByLabel('Пароль',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Войти в Kodik',exact:true}).click();
  await page.getByRole('button',{name:/Продолжить обучение/}).click();
  await expect(page).toHaveURL(/#assignment\//);
  await expect(page.locator('.main-content')).toHaveClass(/workspace-page/);
  for (const [width, height] of [
    [1280, 720],
    [1366, 768],
    [1440, 900],
    [1920, 1080],
    [1093, 614],
  ]) {
    await page.setViewportSize({ width, height });
    const check = page.getByRole("button", {
        name: "Проверить решение",
        exact: true,
      }),
      run = page.getByRole("button", { name: "▷ Запустить", exact: true });
    for (const button of [check, run]) {
      await expect(button).toBeVisible();
      const rect = await button.boundingBox();
      expect(rect!.y).toBeGreaterThanOrEqual(0);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(height);
      expect(
        await button.evaluate((element) => {
          const r = element.getBoundingClientRect(),
            hit = document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            );
          return Boolean(hit && element.contains(hit));
        }),
      ).toBeTruthy();
    }
    expect(
      await page
        .locator("#python-answer")
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    ).toBeGreaterThanOrEqual(16);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page
    .locator("#python-answer")
    .fill(Array.from({ length: 180 }, (_, i) => `print(${i})`).join("\n"));
  await page.getByRole("button", { name: "Увеличить шрифт кода" }).click();
  expect(
    await page
      .locator("#python-answer")
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
  ).toBe(17);
  for(const selector of ['.editor-highlight pre','.editor-line-numbers']) {
    expect(await page.locator(selector).evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBe(17);
  }
  await page.locator("#python-answer").fill("print(1 / 0)");
  await page.getByRole("button", { name: "▷ Запустить", exact: true }).click();
  await expect(page.getByText(/Делить на ноль нельзя/)).toBeVisible();
  await page
    .getByRole("button", { name: "Проверить решение", exact: true })
    .click();
  await expect(page.getByText(/Делить на ноль нельзя/)).toBeVisible();
  await page.screenshot({ path: "work/pilot-workspace-1366.png" });
  await page.goto(`/#task/${material.id}`);
  await expect(page.locator('.main-content')).toHaveClass(/workspace-page/);
  expect(await page.locator('#python-answer').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
});
test("session expiry keeps the offline draft with its owner; lost submit response and reload do not duplicate a result", async ({
  page,
  browser,
}) => {
  const setup = await school(page),
    material = await task(page, setup.lesson.id),
    aLogin = `owner-a-${setup.tag}`,
    bLogin = `owner-b-${setup.tag}`;
  const a = await call(page, "/users", {
      name: "Learner A",
      login: aLogin,
      password,
      role: "student",
    }),
    b = await call(page, "/users", {
      name: "Learner B",
      login: bLogin,
      password,
      role: "student",
    }),
    group = await call(page, "/groups", { title: "Shared computers" });
  await call(page, `/groups/${group.id}/members`, { user_id: a.id });
  await call(page, `/groups/${group.id}/members`, { user_id: b.id });
  await call(page, `/tasks/${material.id}/publish`, { published: true });
  await call(page, "/assignments", {
    group_id: group.id,
    task_id: material.id,
  });
  const adminContext = await browser.newContext(),
    adminPage = await adminContext.newPage();
  await call(adminPage, "/auth/login", { login: setup.login, password });
  try {
    await call(page, "/auth/logout", {});
    await call(page, "/auth/login", { login: aLogin, password });
    await page.goto(`/#task/${material.id}`);
    await expect(page.locator('#python-answer')).toBeVisible();
    await page.context().setOffline(true);
    await page
      .locator("#python-answer")
      .fill('print("private offline draft A")');
    await call(adminPage, `/users/${a.id}/password`, {
      password: "Renewed-browser-pass-321!",
    });
    await page.context().setOffline(false);
    await expect(
      page.getByRole("button", { name: "Войти в Kodik", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    async function login(login: string, pass = password) {
      await page.getByLabel("Логин", { exact: true }).fill(login);
      await page.getByLabel("Пароль", { exact: true }).fill(pass);
      await page
        .getByRole("button", { name: "Войти в Kodik", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Продолжить обучение", exact: false })
        .click();
    }
    await login(bLogin);
    await expect(page.locator("#python-answer")).toHaveValue("");
    await page.getByRole("button", { name: "Выйти", exact: true }).click();
    await login(aLogin, "Renewed-browser-pass-321!");
    await expect(page.locator("#python-answer")).toHaveValue(
      'print("private offline draft A")',
    );
    await page.locator("#python-answer").fill("print(42)");
    await expect(
      page.getByText("Сохранено на сервере", { exact: true }),
    ).toBeVisible();
    await page.route(
      "**/api/tasks/*/submissions",
      async (route) => {
        await route.fetch();
        await route.abort("failed");
      },
      { times: 1 },
    );
    await page
      .getByRole("button", { name: "Проверить решение", exact: true })
      .click();
    // The answer was lost after the server accepted it: the result of acceptance is unknown, not refused.
    await expect(page.getByTestId("submission-notice")).toHaveAttribute("data-kind", "unconfirmed");
    await expect(page.getByRole("button", { name: "Отправить то же решение ещё раз", exact: true })).toBeVisible();
    await page.reload();
    await expect(
      page.getByText("Отлично! Все тесты пройдены.", { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    const state = await call(page, "/state");
    expect(state.attempts).toHaveLength(1);
    expect(state.attempts[0].status).toBe("passed");
  } finally {
    await adminContext.close();
  }
});
