import { test, expect, type Page } from "@playwright/test";
test("School → teacher → constructor → group → student → persisted result", async ({
  page,
  browser,
}) => {
  const suffix = Date.now().toString(36),
    teacher = `teacher-${suffix}`,
    student = `student-${suffix}`,
    password = "Kodik-Test-Strong-123!";
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.screenshot({ path: "work/b2b-auth.png", fullPage: true });
  await page
    .getByRole("button", { name: "Открываете школу? Создать пространство" })
    .click();
  await page.getByLabel("Название школы").fill("Академия будущего");
  await page.getByLabel("Ваше имя").fill("Алексей");
  await page.getByLabel("Логин", { exact: true }).fill(`admin-${suffix}`);
  await page.getByLabel("Пароль", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Создать школу", exact: true })
    .click();
  await page.getByRole("button", { name: "Я сохранил код" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Да, код сохранён" }).click();
  await expect(
    page.getByRole("heading", { name: "Привет, Алексей!" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Участники", exact: true }).click();
  async function addUser(name: string, login: string, role: string) {
    await page.getByRole("button", { name: "Добавить участника" }).click();
    const modal = page.getByRole("dialog");
    await modal.getByLabel("Имя или псевдоним").fill(name);
    await modal.getByLabel("Логин", { exact: true }).fill(login);
    await modal.getByLabel("Пароль", { exact: true }).fill(password);
    await modal.getByLabel("Роль", { exact: true }).selectOption(role);
    await modal.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(modal).toHaveCount(0);
  }
  await addUser("Анна", teacher, "teacher");

  async function login(p: Page, login: string) {
    await p.getByLabel("Логин", { exact: true }).fill(login);
    await p.getByLabel("Пароль", { exact: true }).fill(password);
    await p.getByRole("button", { name: "Войти в Kodik" }).click();
  }
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await login(page, teacher);
  await page.getByRole("link", { name: "Участники", exact: true }).click();
  await addUser("Миша", student, "student");
  await page.getByRole("link", { name: "Курсы", exact: true }).click();
  await page.getByRole("button", { name: "Создать курс", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Название", { exact: true })
    .fill("Python: первые открытия");
  await page
    .getByRole("dialog")
    .getByLabel("О курсе")
    .fill("Учимся превращать идеи в работающий код.");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сохранить", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Модуль", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Название", { exact: true })
    .fill("Знакомство с Python");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сохранить", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Урок", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Название", { exact: true })
    .fill("Первая программа");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сохранить", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Задание", exact: true }).click();
  await page
    .getByLabel("Название задания", { exact: true })
    .fill("Привет, мир!");
  await page
    .getByLabel("Учебная цель")
    .fill("Научиться выводить текст с помощью print.");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page
    .getByLabel("Теория перед заданием")
    .fill(
      "Команда print выводит текст в консоль. Строки записывают в кавычках.",
    );
  await page
    .getByLabel("Инструкция для ученика")
    .fill("Выведи строку Привет, мир! с помощью команды print.");
  await page
    .getByLabel("Подсказки")
    .fill("Используй команду print.\nПоставь текст в кавычки.");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.locator("#python-answer").fill("# Твоя первая программа\n");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ожидаемый вывод", exact: true })
    .fill("Привет, мир!");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.locator("#python-answer").fill('print("Привет, мир!")');
  await page.getByRole("button", { name: "Проверить пример решения" }).click();
  await expect(page.getByText("Отлично! Все проверки пройдены.")).toBeVisible();
  await page.screenshot({ path: "work/b2b-builder.png", fullPage: true });
  await page.getByRole("button", { name: "К конструктору задания", exact: false }).click();
  await page.getByLabel('Эталонное решение · только преподавателю',{exact:true}).fill('print("Привет, мир!")');
  await page.getByRole('button',{name:'Добавить неправильный пример',exact:true}).click();
  await page.getByLabel('Неправильный пример 1',{exact:true}).fill('print("Привет")');
  await page.getByRole('button',{name:'Проверить эталон и неправильные примеры',exact:true}).click();
  await expect(page.getByText('Текущая ревизия подтверждена.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/^6.*Публикация/}).click();
  await page
    .getByRole("button", { name: "Сохранить и опубликовать", exact: true })
    .click();
  await expect(
    page.getByText("Изменения сохраняются в черновик.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByRole('button',{name:'Сохранить черновик',exact:true})).toBeEnabled();
  await page.getByRole("link", { name: "Учебные группы", exact: true }).click();
  await page.getByRole("button", { name: "Создать группу" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Название", { exact: true })
    .fill("Python · Старт");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сохранить", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Добавить ученика", exact: false })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Ученик", { exact: true })
    .selectOption({ label: "Миша" });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Сохранить", exact: true })
    .click();
  await page.getByRole("tab", { name: "Программа и задания" }).click();
  await page
    .getByRole("button", { name: "Назначить задание", exact: false })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Опубликованное задание")
    .selectOption({ label: "Привет, мир!" });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Выдать группе", exact: true })
    .click();
  await page.getByRole("link", { name: "Обзор", exact: true }).click();
  await page.screenshot({ path: "work/b2b-overview.png", fullPage: true });
  const teacherContext = await browser.newContext();
  const teacherViewer = await teacherContext.newPage();
  await teacherViewer.goto("/");
  await login(teacherViewer, teacher);
  await teacherViewer
    .getByRole("link", { name: "Результаты", exact: true })
    .click();
  await expect(
    teacherViewer.getByRole("button", { name: "Открыть решение", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await login(page, student);
  await page
    .getByRole("button", { name: "Продолжить обучение", exact: false })
    .click();
  await page.locator("#python-answer").fill('print("Привет, мир!")');
  await expect(
    page.getByText("✓ Сохранено", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Проверить решение", exact: false })
    .click();
  await expect(page.getByText("Отлично! Все проверки пройдены.")).toBeVisible();
  await page.screenshot({ path: "work/b2b-workspace.png", fullPage: true });
  await expect(
    teacherViewer.getByRole("button", { name: "Открыть решение", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await teacherContext.close();
  await page.reload();
  await expect(page.locator("#python-answer")).toHaveValue(
    'print("Привет, мир!")',
  );
  await expect(page.getByRole("button", { name: "Попытки · 1", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await login(page, teacher);

  await page.getByRole("link", { name: "Результаты", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "1 / 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Открыть решение", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator("pre")).toHaveText(
    'print("Привет, мир!")',
  );
  expect(errors).toEqual([]);
});
