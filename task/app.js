(function () {
  "use strict";

  const STORAGE_KEY = "digitalPlannerV1";
  const HABIT_ROWS = 10;
  const TODO_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const TRACKER_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const monthPickerEl = document.getElementById("monthPicker");
  const weekLabelEl = document.getElementById("weekLabel");
  const weekInputEl = document.getElementById("weekInput");
  const todoGridEl = document.getElementById("todoGrid");
  const habitBodyEl = document.getElementById("habitBody");
  const noteAreaEl = document.getElementById("noteArea");

  /** @type {{ weekMondayISO: string, habitNames: string[], weekInput: string }} */
  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return defaultState();
      return normalizeState(parsed);
    } catch {
      return defaultState();
    }
  }

  function defaultState() {
    const monday = getMondayOfDate(new Date());
    return {
      weekMondayISO: toISODate(monday),
      habitNames: Array.from({ length: HABIT_ROWS }, () => ""),
      weekInput: "",
    };
  }

  function normalizeState(parsed) {
    const base = defaultState();
    const mondayISO =
      typeof parsed.weekMondayISO === "string" && parsed.weekMondayISO
        ? parsed.weekMondayISO
        : base.weekMondayISO;
    let habitNames = Array.isArray(parsed.habitNames)
      ? parsed.habitNames.map(String).slice(0, HABIT_ROWS)
      : [];
    while (habitNames.length < HABIT_ROWS) habitNames.push("");
    habitNames = habitNames.slice(0, HABIT_ROWS);
    return {
      weekMondayISO: mondayISO,
      habitNames,
      weekInput: typeof parsed.weekInput === "string" ? parsed.weekInput : "",
    };
  }

  function saveState() {
    const bundle = readBundle();
    Object.assign(bundle, state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  }

  function getMondayOfDate(d) {
    const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function toISODate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function parseISODate(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function addDays(d, n) {
    const x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }

  function getISOWeekInfo(d) {
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
    return { year: target.getUTCFullYear(), week: weekNo };
  }

  /** Whole calendar days between two local dates (DST-safe). */
  function calendarDaysBetween(a, b) {
    const t1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const t2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((t2 - t1) / 86400000);
  }

  /** Monday of the week that contains the first day of the month. */
  function firstMondayOfMonthGrid(year, month) {
    return getMondayOfDate(new Date(year, month, 1));
  }

  /** How many Monday-based rows the month needs (usually 4–6). */
  function weeksInCalendarMonth(year, month) {
    const firstMonday = firstMondayOfMonthGrid(year, month);
    const lastDay = new Date(year, month + 1, 0);
    lastDay.setHours(0, 0, 0, 0);
    const diff = calendarDaysBetween(firstMonday, lastDay);
    return Math.floor(diff / 7) + 1;
  }

  /** 1-based week index within the calendar month for this Monday. */
  function getWeekOfMonth(monday) {
    const y = monday.getFullYear();
    const m = monday.getMonth();
    const firstMonday = firstMondayOfMonthGrid(y, m);
    const diff = calendarDaysBetween(firstMonday, monday);
    return Math.floor(diff / 7) + 1;
  }

  function weekIdFromMonday(monday) {
    const { year, week } = getISOWeekInfo(monday);
    return `${year}-W${String(week).padStart(2, "0")}`;
  }

  function getWeekData() {
    const monday = parseISODate(state.weekMondayISO);
    const weekId = weekIdFromMonday(monday);
    const y = monday.getFullYear();
    const m = monday.getMonth();
    const weekNumber = getWeekOfMonth(monday);
    const maxGoWeek = Math.min(5, weeksInCalendarMonth(y, m));
    return { monday, weekId, weekNumber, maxGoWeek };
  }

  function readBundle() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeBundle(extra) {
    const bundle = { ...readBundle(), ...state, ...extra };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  }

  function getTodosForWeek(weekId) {
    const bundle = readBundle();
    const todos = bundle.todosByWeek && typeof bundle.todosByWeek === "object" ? bundle.todosByWeek : {};
    const weekTodos = todos[weekId] && typeof todos[weekId] === "object" ? todos[weekId] : {};
    const out = {};
    TODO_DAYS.forEach((day) => {
      const arr = weekTodos[day];
      out[day] = Array.isArray(arr) ? arr.map(String) : [];
    });
    return out;
  }

  function setTodosForWeek(weekId, todosByDay) {
    const bundle = readBundle();
    const todos = bundle.todosByWeek && typeof bundle.todosByWeek === "object" ? { ...bundle.todosByWeek } : {};
    todos[weekId] = { ...todosByDay };
    bundle.todosByWeek = todos;
    Object.assign(bundle, state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  }

  function getChecksForWeek(weekId) {
    const bundle = readBundle();
    const checks = bundle.habitChecksByWeek && typeof bundle.habitChecksByWeek === "object"
      ? bundle.habitChecksByWeek
      : {};
    return checks[weekId] && typeof checks[weekId] === "object" ? { ...checks[weekId] } : {};
  }

  function setCheck(weekId, key, checked) {
    const bundle = readBundle();
    const all = bundle.habitChecksByWeek && typeof bundle.habitChecksByWeek === "object"
      ? { ...bundle.habitChecksByWeek }
      : {};
    const weekMap = { ...getChecksForWeek(weekId) };
    if (checked) weekMap[key] = true;
    else delete weekMap[key];
    all[weekId] = weekMap;
    bundle.habitChecksByWeek = all;
    Object.assign(bundle, state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  }

  function getNoteForWeek(weekId) {
    const bundle = readBundle();
    const notes = bundle.notesByWeek && typeof bundle.notesByWeek === "object" ? bundle.notesByWeek : {};
    return typeof notes[weekId] === "string" ? notes[weekId] : "";
  }

  function setNoteForWeek(weekId, text) {
    const bundle = readBundle();
    const notes = bundle.notesByWeek && typeof bundle.notesByWeek === "object" ? { ...bundle.notesByWeek } : {};
    notes[weekId] = text;
    bundle.notesByWeek = notes;
    Object.assign(bundle, state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  }

  function persistHabitNames() {
    writeBundle({ habitNames: state.habitNames });
  }

  function renderHeader() {
    const { weekNumber, maxGoWeek, monday } = getWeekData();
    const y = monday.getFullYear();
    const mo = monday.getMonth() + 1;
    monthPickerEl.value = `${y}-${String(mo).padStart(2, "0")}`;
    weekLabelEl.textContent = String(weekNumber).padStart(2, "0");
    weekInputEl.value = state.weekInput;
    weekInputEl.min = "1";
    weekInputEl.max = String(maxGoWeek);
    weekInputEl.setAttribute("title", `Jump to week of this month (1–${maxGoWeek})`);
  }

  function renderTodos() {
    const { weekId } = getWeekData();
    const todos = getTodosForWeek(weekId);
    todoGridEl.innerHTML = "";
    TODO_DAYS.forEach((day) => {
      const card = document.createElement("article");
      card.className = "glass-card";
      const title = document.createElement("div");
      title.className = "card-day";
      title.textContent = day;
      const form = document.createElement("form");
      form.className = "todo-form";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Add task…";
      input.setAttribute("aria-label", `New task for ${day}`);
      const addBtn = document.createElement("button");
      addBtn.type = "submit";
      addBtn.textContent = "+";
      const list = document.createElement("ul");
      list.className = "todo-list";

      function redrawList() {
        list.innerHTML = "";
        const current = getTodosForWeek(weekId)[day] || [];
        current.forEach((text, idx) => {
          const li = document.createElement("li");
          const span = document.createElement("span");
          span.textContent = text;
          const del = document.createElement("button");
          del.type = "button";
          del.setAttribute("aria-label", "Remove task");
          del.textContent = "×";
          del.addEventListener("click", () => {
            const next = getTodosForWeek(weekId);
            next[day] = next[day].filter((_, i) => i !== idx);
            setTodosForWeek(weekId, next);
            redrawList();
          });
          li.append(span, del);
          list.appendChild(li);
        });
      }

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        const next = getTodosForWeek(weekId);
        next[day] = [...(next[day] || []), text];
        setTodosForWeek(weekId, next);
        input.value = "";
        redrawList();
      });

      redrawList();
      form.append(input, addBtn);
      card.append(title, form, list);
      todoGridEl.appendChild(card);
    });
  }

  function renderHabits() {
    const { weekId } = getWeekData();
    const checks = getChecksForWeek(weekId);
    habitBodyEl.innerHTML = "";
    for (let r = 0; r < HABIT_ROWS; r++) {
      const tr = document.createElement("tr");
      const nameTd = document.createElement("td");
      nameTd.className = "habit-table__habits-col";
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "habit-name";
      nameInput.value = state.habitNames[r] || "";
      nameInput.setAttribute("aria-label", `Habit ${r + 1} name`);
      nameInput.addEventListener("input", () => {
        state.habitNames[r] = nameInput.value;
        persistHabitNames();
      });
      nameTd.appendChild(nameInput);
      tr.appendChild(nameTd);

      for (let c = 0; c < TRACKER_DAYS.length; c++) {
        const td = document.createElement("td");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "habit-check";
        const key = `${r}-${c}`;
        cb.checked = !!checks[key];
        cb.setAttribute("aria-label", `Habit ${r + 1} ${TRACKER_DAYS[c]}`);
        cb.addEventListener("change", () => {
          setCheck(weekId, key, cb.checked);
        });
        td.appendChild(cb);
        tr.appendChild(td);
      }
      habitBodyEl.appendChild(tr);
    }
  }

  function renderNote() {
    const { weekId } = getWeekData();
    noteAreaEl.value = getNoteForWeek(weekId);
  }

  function renderAll() {
    state = normalizeState(state);
    renderHeader();
    renderTodos();
    renderHabits();
    renderNote();
  }

  function flushNote() {
    const { weekId } = getWeekData();
    setNoteForWeek(weekId, noteAreaEl.value);
  }

  document.getElementById("prevWeek").addEventListener("click", () => {
    flushNote();
    const monday = addDays(parseISODate(state.weekMondayISO), -7);
    state.weekMondayISO = toISODate(monday);
    saveState();
    renderAll();
  });

  document.getElementById("nextWeek").addEventListener("click", () => {
    flushNote();
    const monday = addDays(parseISODate(state.weekMondayISO), 7);
    state.weekMondayISO = toISODate(monday);
    saveState();
    renderAll();
  });

  document.getElementById("goWeek").addEventListener("click", () => {
    const raw = weekInputEl.value.trim();
    state.weekInput = raw;
    const n = parseInt(raw, 10);
    const anchor = parseISODate(state.weekMondayISO);
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const maxGo = Math.min(5, weeksInCalendarMonth(y, m));
    if (!Number.isFinite(n) || n < 1 || n > maxGo) {
      saveState();
      weekInputEl.focus();
      return;
    }
    flushNote();
    const firstMonday = firstMondayOfMonthGrid(y, m);
    const target = addDays(firstMonday, (n - 1) * 7);
    state.weekMondayISO = toISODate(target);
    saveState();
    renderAll();
  });

  weekInputEl.addEventListener("input", () => {
    state.weekInput = weekInputEl.value;
    saveState();
  });

  monthPickerEl.addEventListener("change", () => {
    const v = monthPickerEl.value;
    if (!v || !/^\d{4}-\d{2}$/.test(v)) return;
    const [ys, ms] = v.split("-");
    const y = parseInt(ys, 10);
    const m = parseInt(ms, 10) - 1;
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 0 || m > 11) return;
    flushNote();
    const cur = parseISODate(state.weekMondayISO);
    const w = getWeekOfMonth(cur);
    const maxW = weeksInCalendarMonth(y, m);
    const wClamped = Math.min(Math.max(1, w), maxW);
    const firstMonday = firstMondayOfMonthGrid(y, m);
    state.weekMondayISO = toISODate(addDays(firstMonday, (wClamped - 1) * 7));
    saveState();
    renderAll();
  });

  noteAreaEl.addEventListener("input", () => {
    const { weekId } = getWeekData();
    setNoteForWeek(weekId, noteAreaEl.value);
  });

  saveState();
  renderAll();
})();
