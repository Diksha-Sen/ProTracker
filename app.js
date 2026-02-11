const KEY = "protracker-v2";

const state = {
  todos: [],
  routines: [],
  sleep: [],
  mood: [],
  goals: [],
  projects: [],
  planner: {
    monthly: [],
    weekly: [],
    yearly: [],
  },
  plannerView: "monthly",
  media: [],
  notes: "",
  monthOffset: 0,
};

const ui = {
  exportData: document.getElementById("export-data"),
  importData: document.getElementById("import-data"),
  resetData: document.getElementById("reset-data"),

  todoInput: document.getElementById("todo-input"),
  todoPriority: document.getElementById("todo-priority"),
  addTodo: document.getElementById("add-todo"),
  todoList: document.getElementById("todo-list"),
  todoStats: document.getElementById("todo-stats"),

  routineType: document.getElementById("routine-type"),
  routineName: document.getElementById("routine-name"),
  routineFrequency: document.getElementById("routine-frequency"),
  addRoutine: document.getElementById("add-routine"),
  routineList: document.getElementById("routine-list"),

  sleepHours: document.getElementById("sleep-hours"),
  sleepQuality: document.getElementById("sleep-quality"),
  saveSleep: document.getElementById("save-sleep"),
  sleepList: document.getElementById("sleep-list"),

  mood: document.getElementById("mood"),
  anxiety: document.getElementById("anxiety"),
  saveMood: document.getElementById("save-mood"),
  moodList: document.getElementById("mood-list"),

  goalInput: document.getElementById("goal-input"),
  goalDeadline: document.getElementById("goal-deadline"),
  addGoal: document.getElementById("add-goal"),
  goalList: document.getElementById("goal-list"),

  projectInput: document.getElementById("project-input"),
  addProject: document.getElementById("add-project"),
  projectList: document.getElementById("project-list"),

  plannerInput: document.getElementById("planner-input"),
  addPlanItem: document.getElementById("add-plan-item"),
  plannerList: document.getElementById("planner-list"),
  plannerTabs: Array.from(document.querySelectorAll(".tab")),

  mediaType: document.getElementById("media-type"),
  mediaTitle: document.getElementById("media-title"),
  mediaRating: document.getElementById("media-rating"),
  addMedia: document.getElementById("add-media"),
  mediaList: document.getElementById("media-list"),

  prevMonth: document.getElementById("prev-month"),
  nextMonth: document.getElementById("next-month"),
  monthLabel: document.getElementById("month-label"),
  calendar: document.getElementById("calendar"),

  notes: document.getElementById("notes"),
  notesStatus: document.getElementById("notes-status"),

  analytics: document.getElementById("analytics"),
  itemTemplate: document.getElementById("item-template"),
};

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed);
  } catch {
    console.warn("Invalid storage data");
  }
}

function makeButton(text, onClick, cls = "secondary") {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.className = cls;
  btn.addEventListener("click", onClick);
  return btn;
}

function makeItem(contentNode, buttons = []) {
  const fragment = ui.itemTemplate.content.cloneNode(true);
  fragment.querySelector(".content").append(contentNode);
  const actions = fragment.querySelector(".actions");
  buttons.forEach((button) => actions.append(button));
  return fragment;
}

function ratingStars(value) {
  const full = "★".repeat(Math.max(0, Math.min(5, value)));
  const empty = "☆".repeat(5 - Math.max(0, Math.min(5, value)));
  return `${full}${empty}`;
}

function routineBadge(daysLeft) {
  if (daysLeft <= 0) return `<span class="badge danger">Due now</span>`;
  if (daysLeft <= 1) return `<span class="badge warn">Due tomorrow</span>`;
  return `<span class="badge good">${daysLeft} days left</span>`;
}

function calcDaysLeft(lastDone, frequencyDays) {
  const last = new Date(lastDone);
  const next = new Date(last);
  next.setDate(next.getDate() + Number(frequencyDays));
  const diff = Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

function renderTodos() {
  ui.todoList.innerHTML = "";
  let doneCount = 0;

  state.todos.forEach((todo) => {
    if (todo.done) doneCount += 1;

    const box = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = todo.text;
    if (todo.done) title.classList.add("done");

    const badges = document.createElement("div");
    badges.className = "badges";
    badges.innerHTML = `<span class="badge">${todo.priority.toUpperCase()}</span><span class="badge">${todo.date}</span>`;

    box.append(title, badges);

    const doneButton = makeButton(todo.done ? "Undo" : "Done", () => {
      todo.done = !todo.done;
      save();
      renderAll();
    });

    const deleteButton = makeButton("Delete", () => {
      state.todos = state.todos.filter((item) => item.id !== todo.id);
      save();
      renderAll();
    }, "danger");

    ui.todoList.append(makeItem(box, [doneButton, deleteButton]));
  });

  ui.todoStats.textContent = `${doneCount}/${state.todos.length} completed`;
}

function renderRoutines() {
  ui.routineList.innerHTML = "";

  state.routines.forEach((routine) => {
    const daysLeft = calcDaysLeft(routine.lastDone, routine.frequencyDays);
    const box = document.createElement("div");

    box.innerHTML = `<strong>${routine.name}</strong><div class="badges"><span class="badge">${routine.type}</span><span class="badge">Every ${routine.frequencyDays} day(s)</span><span class="badge">Last: ${routine.lastDone}</span>${routineBadge(daysLeft)}</div>`;

    const doneButton = makeButton("Mark Today", () => {
      routine.lastDone = today();
      save();
      renderAll();
    });

    const deleteButton = makeButton("Delete", () => {
      state.routines = state.routines.filter((item) => item.id !== routine.id);
      save();
      renderAll();
    }, "danger");

    ui.routineList.append(makeItem(box, [doneButton, deleteButton]));
  });
}

function renderSleep() {
  ui.sleepList.innerHTML = "";
  state.sleep
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 7)
    .forEach((entry) => {
      const box = document.createElement("div");
      box.innerHTML = `<strong>${entry.date}</strong><div class="badges"><span class="badge">${entry.hours}h</span><span class="badge">Quality ${entry.quality}/10</span></div>`;

      const deleteButton = makeButton("Delete", () => {
        state.sleep = state.sleep.filter((item) => item.id !== entry.id);
        save();
        renderAll();
      }, "danger");

      ui.sleepList.append(makeItem(box, [deleteButton]));
    });
}

function renderMood() {
  ui.moodList.innerHTML = "";
  state.mood
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 7)
    .forEach((entry) => {
      const box = document.createElement("div");
      box.innerHTML = `<strong>${entry.date}</strong><div class="badges"><span class="badge">Mood: ${entry.mood}</span><span class="badge">Anxiety ${entry.anxiety}/10</span></div>`;

      const deleteButton = makeButton("Delete", () => {
        state.mood = state.mood.filter((item) => item.id !== entry.id);
        save();
        renderAll();
      }, "danger");

      ui.moodList.append(makeItem(box, [deleteButton]));
    });
}

function renderGoals() {
  ui.goalList.innerHTML = "";
  state.goals
    .slice()
    .sort((a, b) => new Date(a.deadline || "2100-01-01") - new Date(b.deadline || "2100-01-01"))
    .forEach((goal) => {
      const box = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = goal.text;
      if (goal.done) title.classList.add("done");
      const badges = document.createElement("div");
      badges.className = "badges";
      badges.innerHTML = `<span class="badge">${goal.deadline || "No deadline"}</span>`;
      box.append(title, badges);

      const doneButton = makeButton(goal.done ? "Reopen" : "Done", () => {
        goal.done = !goal.done;
        save();
        renderAll();
      });

      const deleteButton = makeButton("Delete", () => {
        state.goals = state.goals.filter((item) => item.id !== goal.id);
        save();
        renderAll();
      }, "danger");

      ui.goalList.append(makeItem(box, [doneButton, deleteButton]));
    });
}

function renderProjects() {
  ui.projectList.innerHTML = "";
  state.projects.forEach((project) => {
    const box = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = project.name;
    if (project.done) title.classList.add("done");
    box.append(title);

    const doneButton = makeButton(project.done ? "Reopen" : "Done", () => {
      project.done = !project.done;
      save();
      renderAll();
    });

    const deleteButton = makeButton("Delete", () => {
      state.projects = state.projects.filter((item) => item.id !== project.id);
      save();
      renderAll();
    }, "danger");

    ui.projectList.append(makeItem(box, [doneButton, deleteButton]));
  });
}

function renderPlanner() {
  ui.plannerList.innerHTML = "";
  ui.plannerTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.plan === state.plannerView);
  });

  state.planner[state.plannerView].forEach((item) => {
    const box = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.text;
    if (item.done) title.classList.add("done");
    box.append(title);

    const doneButton = makeButton(item.done ? "Undo" : "Done", () => {
      item.done = !item.done;
      save();
      renderAll();
    });

    const deleteButton = makeButton("Delete", () => {
      state.planner[state.plannerView] = state.planner[state.plannerView].filter((plan) => plan.id !== item.id);
      save();
      renderAll();
    }, "danger");

    ui.plannerList.append(makeItem(box, [doneButton, deleteButton]));
  });
}

function renderMedia() {
  ui.mediaList.innerHTML = "";
  state.media
    .slice()
    .sort((a, b) => b.rating - a.rating || new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((item) => {
      const box = document.createElement("div");
      box.innerHTML = `<strong>${item.title}</strong><div class="badges"><span class="badge">${item.type}</span><span class="badge">${ratingStars(item.rating)}</span></div>`;

      const deleteButton = makeButton("Delete", () => {
        state.media = state.media.filter((entry) => entry.id !== item.id);
        save();
        renderAll();
      }, "danger");

      ui.mediaList.append(makeItem(box, [deleteButton]));
    });
}

function renderCalendar() {
  ui.calendar.innerHTML = "";
  const date = new Date();
  date.setMonth(date.getMonth() + state.monthOffset, 1);

  ui.monthLabel.textContent = date.toLocaleString(undefined, { month: "long", year: "numeric" });

  const first = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  for (let i = 0; i < first; i += 1) ui.calendar.append(document.createElement("div"));

  for (let day = 1; day <= count; day += 1) {
    const tile = document.createElement("div");
    tile.className = "day";
    const dateStr = new Date(date.getFullYear(), date.getMonth(), day).toISOString().slice(0, 10);
    tile.innerHTML = `<div>${day}</div>`;

    if (dateStr === today()) tile.classList.add("today");

    const hasActivity =
      state.todos.some((todo) => todo.date === dateStr) ||
      state.sleep.some((entry) => entry.date === dateStr) ||
      state.mood.some((entry) => entry.date === dateStr);

    if (hasActivity) {
      const dot = document.createElement("div");
      dot.className = "dot";
      tile.append(dot);
    }

    ui.calendar.append(tile);
  }
}

function renderAnalytics() {
  const doneTodos = state.todos.filter((todo) => todo.done).length;
  const dueRoutines = state.routines.filter((routine) => calcDaysLeft(routine.lastDone, routine.frequencyDays) <= 0).length;
  const doneGoals = state.goals.filter((goal) => goal.done).length;
  const doneProjects = state.projects.filter((project) => project.done).length;
  const avgSleep = state.sleep.length
    ? (state.sleep.reduce((sum, item) => sum + Number(item.hours), 0) / state.sleep.length).toFixed(1)
    : "0.0";

  const items = [
    `To-do completion: ${doneTodos}/${state.todos.length}`,
    `Routines currently due: ${dueRoutines}`,
    `Goals complete: ${doneGoals}/${state.goals.length}`,
    `Projects complete: ${doneProjects}/${state.projects.length}`,
    `Average sleep: ${avgSleep}h`,
    `Media logs: ${state.media.length}`,
    `Notes size: ${state.notes.length} characters`,
  ];

  ui.analytics.innerHTML = "";
  items.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    ui.analytics.append(li);
  });
}

function renderNotes() {
  ui.notes.value = state.notes;
}

function renderAll() {
  renderTodos();
  renderRoutines();
  renderSleep();
  renderMood();
  renderGoals();
  renderProjects();
  renderPlanner();
  renderMedia();
  renderCalendar();
  renderAnalytics();
  renderNotes();
}

function addTodo() {
  const text = ui.todoInput.value.trim();
  if (!text) return;

  state.todos.unshift({
    id: id("todo"),
    text,
    priority: ui.todoPriority.value,
    done: false,
    date: today(),
  });

  ui.todoInput.value = "";
  save();
  renderAll();
}

function addRoutine() {
  const name = ui.routineName.value.trim();
  const frequencyDays = Math.max(1, Number(ui.routineFrequency.value) || 1);
  if (!name) return;

  state.routines.push({
    id: id("routine"),
    type: ui.routineType.value,
    name,
    frequencyDays,
    lastDone: today(),
  });

  ui.routineName.value = "";
  ui.routineFrequency.value = "1";
  save();
  renderAll();
}

function addSleep() {
  const hours = Number(ui.sleepHours.value);
  const quality = Number(ui.sleepQuality.value);
  if (!hours || !quality) return;

  state.sleep.push({
    id: id("sleep"),
    date: today(),
    hours,
    quality,
  });

  ui.sleepHours.value = "";
  ui.sleepQuality.value = "";
  save();
  renderAll();
}

function addMood() {
  const anxiety = Number(ui.anxiety.value);
  if (!anxiety) return;

  state.mood.push({
    id: id("mood"),
    date: today(),
    mood: ui.mood.value,
    anxiety,
  });

  ui.anxiety.value = "";
  save();
  renderAll();
}

function addGoal() {
  const text = ui.goalInput.value.trim();
  if (!text) return;

  state.goals.push({
    id: id("goal"),
    text,
    deadline: ui.goalDeadline.value,
    done: false,
  });

  ui.goalInput.value = "";
  ui.goalDeadline.value = "";
  save();
  renderAll();
}

function addProject() {
  const name = ui.projectInput.value.trim();
  if (!name) return;

  state.projects.push({
    id: id("project"),
    name,
    done: false,
  });

  ui.projectInput.value = "";
  save();
  renderAll();
}

function addPlanItem() {
  const text = ui.plannerInput.value.trim();
  if (!text) return;

  state.planner[state.plannerView].push({
    id: id("planner"),
    text,
    done: false,
  });

  ui.plannerInput.value = "";
  save();
  renderAll();
}

function addMedia() {
  const title = ui.mediaTitle.value.trim();
  const rating = Math.max(1, Math.min(5, Number(ui.mediaRating.value) || 0));
  if (!title || !rating) return;

  state.media.push({
    id: id("media"),
    type: ui.mediaType.value,
    title,
    rating,
    createdAt: new Date().toISOString(),
  });

  ui.mediaTitle.value = "";
  ui.mediaRating.value = "";
  save();
  renderAll();
}

function setupNotes() {
  let timeout;
  ui.notes.addEventListener("input", () => {
    ui.notesStatus.textContent = "Saving...";
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      state.notes = ui.notes.value;
      save();
      ui.notesStatus.textContent = "Autosaved";
      renderAnalytics();
    }, 300);
  });
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `protracker-${today()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importData(event) {
  const [file] = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      Object.assign(state, parsed);
      save();
      renderAll();
    } catch {
      alert("Invalid backup file");
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm("Reset all data?")) return;
  localStorage.removeItem(KEY);
  window.location.reload();
}

function bindEvents() {
  ui.addTodo.addEventListener("click", addTodo);
  ui.todoInput.addEventListener("keydown", (event) => event.key === "Enter" && addTodo());

  ui.addRoutine.addEventListener("click", addRoutine);
  ui.routineName.addEventListener("keydown", (event) => event.key === "Enter" && addRoutine());

  ui.saveSleep.addEventListener("click", addSleep);
  ui.saveMood.addEventListener("click", addMood);

  ui.addGoal.addEventListener("click", addGoal);
  ui.goalInput.addEventListener("keydown", (event) => event.key === "Enter" && addGoal());

  ui.addProject.addEventListener("click", addProject);
  ui.projectInput.addEventListener("keydown", (event) => event.key === "Enter" && addProject());

  ui.addPlanItem.addEventListener("click", addPlanItem);
  ui.plannerInput.addEventListener("keydown", (event) => event.key === "Enter" && addPlanItem());

  ui.plannerTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      state.plannerView = tab.dataset.plan;
      save();
      renderPlanner();
    });
  });

  ui.addMedia.addEventListener("click", addMedia);
  ui.mediaTitle.addEventListener("keydown", (event) => event.key === "Enter" && addMedia());

  ui.prevMonth.addEventListener("click", () => {
    state.monthOffset -= 1;
    renderCalendar();
  });

  ui.nextMonth.addEventListener("click", () => {
    state.monthOffset += 1;
    renderCalendar();
  });

  ui.exportData.addEventListener("click", exportData);
  ui.importData.addEventListener("change", importData);
  ui.resetData.addEventListener("click", resetData);
}

function init() {
  load();
  bindEvents();
  setupNotes();
  renderAll();
}

init();
