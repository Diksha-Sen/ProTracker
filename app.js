const STORAGE_KEY = "protracker-data-v1";

const state = {
  tasks: [],
  habits: [],
  goals: [],
  notes: "",
  monthOffset: 0,
  wellbeingLogs: [],
  settings: {
    focusMinutes: 25,
    breakMinutes: 5,
  },
};

const ui = {
  taskInput: document.getElementById("task-input"),
  taskPriority: document.getElementById("task-priority"),
  addTask: document.getElementById("add-task"),
  taskList: document.getElementById("task-list"),
  taskStats: document.getElementById("task-stats"),

  habitInput: document.getElementById("habit-input"),
  addHabit: document.getElementById("add-habit"),
  habitList: document.getElementById("habit-list"),

  goalInput: document.getElementById("goal-input"),
  goalDeadline: document.getElementById("goal-deadline"),
  addGoal: document.getElementById("add-goal"),
  goalList: document.getElementById("goal-list"),

  notes: document.getElementById("notes"),
  notesStatus: document.getElementById("notes-status"),

  monthLabel: document.getElementById("month-label"),
  calendar: document.getElementById("calendar"),
  prevMonth: document.getElementById("prev-month"),
  nextMonth: document.getElementById("next-month"),

  timerDisplay: document.getElementById("timer-display"),
  timerPhase: document.getElementById("timer-phase"),
  startTimer: document.getElementById("start-timer"),
  pauseTimer: document.getElementById("pause-timer"),
  resetTimer: document.getElementById("reset-timer"),
  focusMinutes: document.getElementById("focus-minutes"),
  breakMinutes: document.getElementById("break-minutes"),

  mood: document.getElementById("mood"),
  energy: document.getElementById("energy"),
  journal: document.getElementById("journal"),
  saveWellbeing: document.getElementById("save-wellbeing"),
  checkinHistory: document.getElementById("checkin-history"),

  analyticsList: document.getElementById("analytics-list"),

  exportData: document.getElementById("export-data"),
  importData: document.getElementById("import-data"),
  resetData: document.getElementById("reset-data"),
  listItemTemplate: document.getElementById("list-item-template"),
};

const timer = {
  isRunning: false,
  phase: "focus",
  remainingSeconds: 25 * 60,
  intervalId: null,
};

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed);
  } catch {
    console.warn("Could not parse saved state");
  }
}

function createItem(contentNode, buttons = []) {
  const fragment = ui.listItemTemplate.content.cloneNode(true);
  fragment.querySelector(".content").append(contentNode);
  const actions = fragment.querySelector(".actions");
  buttons.forEach((button) => actions.append(button));
  return fragment;
}

function actionButton(text, click, cssClass = "secondary") {
  const button = document.createElement("button");
  button.textContent = text;
  button.className = cssClass;
  button.addEventListener("click", click);
  return button;
}

function renderTasks() {
  ui.taskList.innerHTML = "";
  let completed = 0;

  state.tasks.forEach((task) => {
    if (task.completed) completed += 1;
    const container = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = task.text;
    if (task.completed) title.classList.add("completed");

    const badges = document.createElement("div");
    badges.className = "badges";
    badges.innerHTML = `<span class="badge ${task.priority}">${task.priority.toUpperCase()}</span><span class="badge">${new Date(task.createdAt).toLocaleDateString()}</span>`;

    container.append(title, badges);

    const toggleButton = actionButton(task.completed ? "Undo" : "Done", () => {
      task.completed = !task.completed;
      save();
      renderAll();
    });

    const deleteButton = actionButton("Delete", () => {
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
      save();
      renderAll();
    }, "danger");

    ui.taskList.append(createItem(container, [toggleButton, deleteButton]));
  });

  ui.taskStats.textContent = `${completed}/${state.tasks.length} completed`;
}

function renderHabits() {
  ui.habitList.innerHTML = "";
  const today = new Date().toISOString().slice(0, 10);

  state.habits.forEach((habit) => {
    const container = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = habit.name;

    const doneToday = habit.log.includes(today);
    const streak = computeStreak(habit.log);

    const badges = document.createElement("div");
    badges.className = "badges";
    badges.innerHTML = `<span class="badge">${doneToday ? "Done today" : "Pending"}</span><span class="badge">🔥 ${streak} day streak</span>`;

    container.append(title, badges);

    const markButton = actionButton(doneToday ? "Unmark" : "Mark", () => {
      if (doneToday) {
        habit.log = habit.log.filter((d) => d !== today);
      } else {
        habit.log.push(today);
      }
      save();
      renderAll();
    });

    const deleteButton = actionButton("Delete", () => {
      state.habits = state.habits.filter((h) => h.id !== habit.id);
      save();
      renderAll();
    }, "danger");

    ui.habitList.append(createItem(container, [markButton, deleteButton]));
  });
}

function computeStreak(logDates) {
  const set = new Set(logDates);
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function renderGoals() {
  ui.goalList.innerHTML = "";
  state.goals
    .slice()
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .forEach((goal) => {
      const container = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = goal.text;

      const due = document.createElement("span");
      due.className = "badge";
      due.textContent = goal.deadline ? `Due ${goal.deadline}` : "No deadline";

      container.append(title, due);

      const completeButton = actionButton(goal.completed ? "Reopen" : "Complete", () => {
        goal.completed = !goal.completed;
        save();
        renderAll();
      });

      const deleteButton = actionButton("Delete", () => {
        state.goals = state.goals.filter((g) => g.id !== goal.id);
        save();
        renderAll();
      }, "danger");

      if (goal.completed) title.classList.add("completed");

      ui.goalList.append(createItem(container, [completeButton, deleteButton]));
    });
}

function renderCalendar() {
  ui.calendar.innerHTML = "";
  const base = new Date();
  base.setMonth(base.getMonth() + state.monthOffset, 1);

  ui.monthLabel.textContent = base.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const firstDayIndex = new Date(base.getFullYear(), base.getMonth(), 1).getDay();
  const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i += 1) {
    const empty = document.createElement("div");
    ui.calendar.append(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const tile = document.createElement("div");
    tile.className = "day";
    const dateStr = new Date(base.getFullYear(), base.getMonth(), day).toISOString().slice(0, 10);

    const date = document.createElement("div");
    date.className = "date";
    date.textContent = day;
    tile.append(date);

    if (dateStr === new Date().toISOString().slice(0, 10)) {
      tile.classList.add("today");
    }

    const hasDoneHabit = state.habits.some((habit) => habit.log.includes(dateStr));
    const hasTask = state.tasks.some((task) => task.createdAt.slice(0, 10) === dateStr);

    if (hasDoneHabit || hasTask) {
      const dot = document.createElement("div");
      dot.className = "dot";
      tile.append(dot);
    }

    ui.calendar.append(tile);
  }
}

function renderWellbeing() {
  ui.checkinHistory.innerHTML = "";

  state.wellbeingLogs
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)
    .forEach((log) => {
      const container = document.createElement("div");
      container.innerHTML = `<strong>${log.date}</strong><div class="badges"><span class="badge">${log.mood}</span><span class="badge">Energy ${log.energy}/10</span></div><small>${log.journal}</small>`;

      const deleteButton = actionButton("Delete", () => {
        state.wellbeingLogs = state.wellbeingLogs.filter((item) => item.id !== log.id);
        save();
        renderAll();
      }, "danger");

      ui.checkinHistory.append(createItem(container, [deleteButton]));
    });
}

function renderAnalytics() {
  const totalTasks = state.tasks.length;
  const completeTasks = state.tasks.filter((task) => task.completed).length;
  const totalHabits = state.habits.length;
  const doneHabitsToday = state.habits.filter((habit) => habit.log.includes(new Date().toISOString().slice(0, 10))).length;
  const totalGoals = state.goals.length;
  const completeGoals = state.goals.filter((goal) => goal.completed).length;

  const items = [
    `Tasks complete: ${completeTasks}/${totalTasks}`,
    `Habits checked today: ${doneHabitsToday}/${totalHabits}`,
    `Goals complete: ${completeGoals}/${totalGoals}`,
    `Wellbeing check-ins: ${state.wellbeingLogs.length}`,
    `Notes length: ${state.notes.length} characters`,
  ];

  ui.analyticsList.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    ui.analyticsList.append(li);
  });
}

function renderNotes() {
  ui.notes.value = state.notes;
}

function renderAll() {
  renderTasks();
  renderHabits();
  renderGoals();
  renderCalendar();
  renderWellbeing();
  renderAnalytics();
  renderNotes();
}

function addTask() {
  const text = ui.taskInput.value.trim();
  if (!text) return;

  state.tasks.unshift({
    id: uid("task"),
    text,
    priority: ui.taskPriority.value,
    completed: false,
    createdAt: new Date().toISOString(),
  });

  ui.taskInput.value = "";
  save();
  renderAll();
}

function addHabit() {
  const name = ui.habitInput.value.trim();
  if (!name) return;

  state.habits.push({
    id: uid("habit"),
    name,
    log: [],
  });

  ui.habitInput.value = "";
  save();
  renderAll();
}

function addGoal() {
  const text = ui.goalInput.value.trim();
  if (!text) return;

  state.goals.push({
    id: uid("goal"),
    text,
    deadline: ui.goalDeadline.value,
    completed: false,
  });

  ui.goalInput.value = "";
  ui.goalDeadline.value = "";
  save();
  renderAll();
}

function setupNotesAutosave() {
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

function updateTimerDisplay() {
  const mins = String(Math.floor(timer.remainingSeconds / 60)).padStart(2, "0");
  const secs = String(timer.remainingSeconds % 60).padStart(2, "0");
  ui.timerDisplay.textContent = `${mins}:${secs}`;
}

function setTimerFromSettings() {
  const mins = timer.phase === "focus" ? Number(state.settings.focusMinutes) : Number(state.settings.breakMinutes);
  timer.remainingSeconds = mins * 60;
  updateTimerDisplay();
}

function startTimer() {
  if (timer.isRunning) return;
  timer.isRunning = true;

  timer.intervalId = setInterval(() => {
    timer.remainingSeconds -= 1;
    if (timer.remainingSeconds <= 0) {
      timer.phase = timer.phase === "focus" ? "break" : "focus";
      ui.timerPhase.textContent = timer.phase === "focus" ? "Focus session" : "Break session";
      setTimerFromSettings();
    }
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  timer.isRunning = false;
  clearInterval(timer.intervalId);
}

function resetTimer() {
  pauseTimer();
  timer.phase = "focus";
  ui.timerPhase.textContent = "Ready for focus session";
  state.settings.focusMinutes = Math.min(90, Math.max(5, Number(ui.focusMinutes.value) || 25));
  state.settings.breakMinutes = Math.min(30, Math.max(3, Number(ui.breakMinutes.value) || 5));
  save();
  setTimerFromSettings();
}

function saveWellbeingCheckin() {
  state.wellbeingLogs.push({
    id: uid("checkin"),
    date: new Date().toISOString().slice(0, 10),
    mood: ui.mood.value,
    energy: Number(ui.energy.value),
    journal: ui.journal.value.trim(),
  });

  ui.journal.value = "";
  save();
  renderAll();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `protracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
      resetTimer();
    } catch {
      alert("Invalid backup file");
    }
  };
  reader.readAsText(file);
}

function resetData() {
  const sure = confirm("Reset all ProTracker data?");
  if (!sure) return;

  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

function bindEvents() {
  ui.addTask.addEventListener("click", addTask);
  ui.taskInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addTask();
  });

  ui.addHabit.addEventListener("click", addHabit);
  ui.habitInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addHabit();
  });

  ui.addGoal.addEventListener("click", addGoal);
  ui.goalInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addGoal();
  });

  ui.prevMonth.addEventListener("click", () => {
    state.monthOffset -= 1;
    renderCalendar();
  });

  ui.nextMonth.addEventListener("click", () => {
    state.monthOffset += 1;
    renderCalendar();
  });

  ui.startTimer.addEventListener("click", startTimer);
  ui.pauseTimer.addEventListener("click", pauseTimer);
  ui.resetTimer.addEventListener("click", resetTimer);

  ui.focusMinutes.addEventListener("change", resetTimer);
  ui.breakMinutes.addEventListener("change", resetTimer);

  ui.saveWellbeing.addEventListener("click", saveWellbeingCheckin);
  ui.exportData.addEventListener("click", exportData);
  ui.importData.addEventListener("change", importData);
  ui.resetData.addEventListener("click", resetData);
}

function init() {
  load();
  bindEvents();
  setupNotesAutosave();

  ui.focusMinutes.value = state.settings.focusMinutes;
  ui.breakMinutes.value = state.settings.breakMinutes;

  resetTimer();
  renderAll();
}

init();
