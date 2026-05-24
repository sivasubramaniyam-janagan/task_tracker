(function () {
  "use strict";

  const STORAGE_KEY = "digitalPlannerV1";
  const HABIT_ROWS = 10;
  const TODO_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const TRACKER_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  /** Remap column index when upgrading from Sun-first to Mon-first layout. */
  const SUN_FIRST_COL_TO_MON_FIRST = [6, 0, 1, 2, 3, 4, 5];

  const monthPickerEl = document.getElementById("monthPicker");
  const weekLabelEl = document.getElementById("weekLabel");
  const weekInputEl = document.getElementById("weekInput");
  const todoGridEl = document.getElementById("todoGrid");
  const habitBodyEl = document.getElementById("habitBody");
  const noteAreaEl = document.getElementById("noteArea");
  
  const settingsModal = document.getElementById("settingsModal");
  const openSettingsBtn = document.getElementById("openSettings");
  const closeSettingsBtn = document.getElementById("closeSettings");
  const openMoreBtn = document.getElementById("openMoreBtn");
  const moreModal = document.getElementById("moreModal");
  const closeMoreBtn = document.getElementById("closeMoreBtn");
  const resetSettingsBtn = document.getElementById("resetSettings");
  const exportDataBtn = document.getElementById("exportDataBtn");
  const importDataBtn = document.getElementById("importDataBtn");
  const importFileInput = document.getElementById("importFileInput");
  const settingCardColor = document.getElementById("settingCardColor");
  const settingFontColor = document.getElementById("settingFontColor");
  const settingBtnBg = document.getElementById("settingBtnBg");
  const settingBtnText = document.getElementById("settingBtnText");
  const settingBgDesktop = document.getElementById("settingBgDesktop");
  const settingBgMobile = document.getElementById("settingBgMobile");
  const settingHabitBg = document.getElementById("settingHabitBg");
  const settingHabitFont = document.getElementById("settingHabitFont");
  const settingCardTransparency = document.getElementById("settingCardTransparency");
  const settingCardTransparencyValue = document.getElementById("settingCardTransparencyValue");
  const settingGlassTransparency = document.getElementById("settingGlassTransparency");
  const settingGlassTransparencyValue = document.getElementById("settingGlassTransparencyValue");
  const settingBtnTransparency = document.getElementById("settingBtnTransparency");
  const settingBtnTransparencyValue = document.getElementById("settingBtnTransparencyValue");
  const settingNoteTransparency = document.getElementById("settingNoteTransparency");
  const settingNoteTransparencyValue = document.getElementById("settingNoteTransparencyValue");
  
  const mediaView = document.getElementById("mediaView");
  const mediaViewTitle = document.getElementById("mediaViewTitle");
  const closeMediaBtn = document.getElementById("closeMediaBtn");
  const openGamesBtn = document.getElementById("openGamesBtn");
  const openMoviesBtn = document.getElementById("openMoviesBtn");
  const openBooksBtn = document.getElementById("openBooksBtn");
  const customInterestsGrid = document.getElementById("customInterestsGrid");
  const addInterestBtn = document.getElementById("addInterestBtn");
  const mediaGrid = document.getElementById("mediaGrid");
  const addMediaBtn = document.getElementById("addMediaBtn");
  
  // Media Settings Elements
  const mediaSettingsModal = document.getElementById("mediaSettingsModal");
  const openMediaSettingsBtn = document.getElementById("openMediaSettingsBtn");
  const closeMediaSettingsBtn = document.getElementById("closeMediaSettingsBtn");
  const mediaCardBgColor = document.getElementById("mediaCardBgColor");
  const mediaCardBgOpacity = document.getElementById("mediaCardBgOpacity");
  const mediaCardBgOpacityValue = document.getElementById("mediaCardBgOpacityValue");
  const mediaHeaderBgColor = document.getElementById("mediaHeaderBgColor");
  const mediaHeaderTextColor = document.getElementById("mediaHeaderTextColor");
  const mediaCardTextColor = document.getElementById("mediaCardTextColor");
  const mediaCardBorderColor = document.getElementById("mediaCardBorderColor");
  const mediaCardBorderWidth = document.getElementById("mediaCardBorderWidth");
  const mediaCardBorderRadius = document.getElementById("mediaCardBorderRadius");
  const mediaCardShadow = document.getElementById("mediaCardShadow");
  const mediaCardShadowValue = document.getElementById("mediaCardShadowValue");
  const resetMediaSettingsBtn = document.getElementById("resetMediaSettings");

  /** @type {{ weekMondayISO: string, habitNames: string[], weekInput: string, settings: any, games: any[], movies: any[], books: any[], customCategories: {id: string, title: string}[] }} */
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
      settings: {},
      customCategories: []
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
      settings: typeof parsed.settings === "object" && parsed.settings ? parsed.settings : {},
      mediaSettings: typeof parsed.mediaSettings === "object" && parsed.mediaSettings ? parsed.mediaSettings : {},
      games: Array.isArray(parsed.games) ? parsed.games : [
        { id: "1", title: "Witcher 3", rating: 4, status: "Completed" },
        { id: "2", title: "RDR", rating: 5, status: "Completed" },
        { id: "3", title: "SHOOTER", rating: 3, status: "Completed" }
      ],
      movies: Array.isArray(parsed.movies) ? parsed.movies : [
        { id: "m1", title: "Inception", rating: 5, status: "Completed" }
      ],
      books: Array.isArray(parsed.books) ? parsed.books : [
        { id: "b1", title: "Dune", rating: 4, status: "Playing" }
      ],
      customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : []
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
      if (!parsed || typeof parsed !== "object") return {};
      migrateHabitChecksToMonFirst(parsed);
      return parsed;
    } catch {
      return {};
    }
  }

  function migrateHabitChecksToMonFirst(bundle) {
    if (bundle.habitChecksMonFirst) return;
    const legacy = bundle.habitChecksByWeek;
    if (legacy && typeof legacy === "object") {
      const next = {};
      Object.keys(legacy).forEach((weekId) => {
        const map = legacy[weekId];
        if (!map || typeof map !== "object") return;
        const out = {};
        Object.keys(map).forEach((key) => {
          const parts = key.split("-");
          if (parts.length !== 2) return;
          const r = parseInt(parts[0], 10);
          const oldC = parseInt(parts[1], 10);
          if (!Number.isFinite(r) || !Number.isFinite(oldC) || oldC < 0 || oldC > 6) return;
          out[`${r}-${SUN_FIRST_COL_TO_MON_FIRST[oldC]}`] = map[key];
        });
        next[weekId] = out;
      });
      bundle.habitChecksByWeek = next;
    }
    bundle.habitChecksMonFirst = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  }

  function writeBundle(extra) {
    const bundle = { ...readBundle(), ...state, ...extra };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
  }

  function normalizeTask(item) {
    if (item && typeof item === "object" && item.text != null) {
      return { text: String(item.text), done: !!item.done };
    }
    if (typeof item === "string") {
      return { text: item, done: false };
    }
    return { text: "", done: false };
  }

  function getTodosForWeek(weekId) {
    const bundle = readBundle();
    const todos = bundle.todosByWeek && typeof bundle.todosByWeek === "object" ? bundle.todosByWeek : {};
    const weekTodos = todos[weekId] && typeof todos[weekId] === "object" ? todos[weekId] : {};
    const out = {};
    TODO_DAYS.forEach((day) => {
      const arr = weekTodos[day];
      out[day] = Array.isArray(arr)
        ? arr.map(normalizeTask).filter((t) => t.text.length > 0)
        : [];
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
        current.forEach((task, idx) => {
          const li = document.createElement("li");
          li.className = "todo-item";

          const inner = document.createElement("div");
          inner.className = "todo-item__inner";
          if (task.done) inner.classList.add("todo-item__inner--done");

          const span = document.createElement("span");
          span.className = "todo-item__text";
          if (task.done) span.classList.add("todo-item__text--done");
          span.textContent = task.text;

          const actions = document.createElement("div");
          actions.className = "todo-item__actions";

          const doneBtn = document.createElement("button");
          doneBtn.type = "button";
          doneBtn.className = "todo-item__done";
          doneBtn.textContent = "✔️";
          doneBtn.setAttribute(
            "aria-label",
            task.done ? "Mark task as not done" : "Mark task as done"
          );
          if (task.done) doneBtn.classList.add("todo-item__done--active");
          doneBtn.addEventListener("click", () => {
            const next = getTodosForWeek(weekId);
            const t = next[day][idx];
            next[day][idx] = { ...t, done: !t.done };
            setTodosForWeek(weekId, next);
            redrawList();
          });

          const del = document.createElement("button");
          del.type = "button";
          del.className = "todo-item__remove";
          del.setAttribute("aria-label", "Remove task");
          del.textContent = "×";
          del.addEventListener("click", () => {
            const next = getTodosForWeek(weekId);
            next[day] = next[day].filter((_, i) => i !== idx);
            setTodosForWeek(weekId, next);
            redrawList();
          });

          actions.append(doneBtn, del);
          inner.append(span, actions);
          li.appendChild(inner);
          list.appendChild(li);
        });
      }

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        const next = getTodosForWeek(weekId);
        next[day] = [...(next[day] || []), { text, done: false }];
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

  function syncHabitNamesFromBundle() {
    const bundle = readBundle();
    if (!Array.isArray(bundle.habitNames)) return;
    const names = bundle.habitNames.map(String).slice(0, HABIT_ROWS);
    while (names.length < HABIT_ROWS) names.push("");
    state.habitNames = names.slice(0, HABIT_ROWS);
  }

  function renderHabits() {
    syncHabitNamesFromBundle();
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
    syncHabitNamesFromBundle();
    applySettings();
    renderHeader();
    renderTodos();
    renderHabits();
    renderNote();
  }

  function applySettings() {
    const s = state.settings || {};
    const root = document.documentElement;
    
    if (s.cardColor) root.style.setProperty("--glass-bg", s.cardColor);
    else root.style.removeProperty("--glass-bg");
    
    if (s.fontColor) {
      root.style.setProperty("--ink", s.fontColor);
      root.style.setProperty("--title", s.fontColor);
      root.style.setProperty("--header-text", s.fontColor);
    } else {
      root.style.removeProperty("--ink");
      root.style.removeProperty("--title");
      root.style.removeProperty("--header-text");
    }
    
    if (s.btnBg) root.style.setProperty("--btn-nav-bg", s.btnBg);
    else root.style.removeProperty("--btn-nav-bg");
    
    if (s.btnText) root.style.setProperty("--btn-nav-text", s.btnText);
    else root.style.removeProperty("--btn-nav-text");
    
    if (s.bgDesktop) root.style.setProperty("--bg-img-desktop", `url(${s.bgDesktop})`);
    else root.style.removeProperty("--bg-img-desktop");
    
    if (s.bgMobile) root.style.setProperty("--bg-img-mobile", `url(${s.bgMobile})`);
    else root.style.removeProperty("--bg-img-mobile");
    
    if (s.habitBg) root.style.setProperty("--habit-bg", s.habitBg);
    else root.style.removeProperty("--habit-bg");
    
    if (s.habitFont) root.style.setProperty("--habit-font-color", s.habitFont);
    else root.style.removeProperty("--habit-font-color");
    
    if (s.cardColor) settingCardColor.value = s.cardColor;
    if (s.fontColor) settingFontColor.value = s.fontColor;
    if (s.btnBg) settingBtnBg.value = s.btnBg;
    if (s.btnText) settingBtnText.value = s.btnText;
    if (s.habitBg) settingHabitBg.value = s.habitBg;
    if (s.habitFont) settingHabitFont.value = s.habitFont;

    // Apply transparency settings
    const cardTransparency = s.cardTransparency !== undefined ? s.cardTransparency / 100 : 1;
    const glassTransparency = s.glassTransparency !== undefined ? s.glassTransparency / 100 : 1;
    const btnTransparency = s.btnTransparency !== undefined ? s.btnTransparency / 100 : 1;
    const noteTransparency = s.noteTransparency !== undefined ? s.noteTransparency / 100 : 1;

    // Apply to glass cards
    document.querySelectorAll(".glass-card").forEach(el => {
      el.style.opacity = cardTransparency;
    });

    // Apply to glass surfaces
    document.querySelectorAll(".glass-surface").forEach(el => {
      el.style.opacity = glassTransparency;
    });

    // Apply to buttons
    document.querySelectorAll(".btn").forEach(el => {
      el.style.opacity = btnTransparency;
    });

    // Apply to note area
    if (noteAreaEl) {
      noteAreaEl.style.opacity = noteTransparency;
    }

    // Update slider values in UI
    if (s.cardTransparency !== undefined) {
      settingCardTransparency.value = s.cardTransparency;
      settingCardTransparencyValue.textContent = s.cardTransparency + "%";
    }
    if (s.glassTransparency !== undefined) {
      settingGlassTransparency.value = s.glassTransparency;
      settingGlassTransparencyValue.textContent = s.glassTransparency + "%";
    }
    if (s.btnTransparency !== undefined) {
      settingBtnTransparency.value = s.btnTransparency;
      settingBtnTransparencyValue.textContent = s.btnTransparency + "%";
    }
    if (s.noteTransparency !== undefined) {
      settingNoteTransparency.value = s.noteTransparency;
      settingNoteTransparencyValue.textContent = s.noteTransparency + "%";
    }
  }

  function processImageFile(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
         const canvas = document.createElement("canvas");
         let width = img.width;
         let height = img.height;
         const max = 1920;
         if (width > max || height > max) {
            if (width > height) {
              height = Math.round((height * max) / width);
              width = max;
            } else {
              width = Math.round((width * max) / height);
              height = max;
            }
         }
         canvas.width = width;
         canvas.height = height;
         const ctx = canvas.getContext("2d");
         ctx.drawImage(img, 0, 0, width, height);
         callback(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function flushNote() {
    const { weekId } = getWeekData();
    setNoteForWeek(weekId, noteAreaEl.value);
  }

  // --- Custom Interests Logic ---
  function renderInterestCards() {
    if (!customInterestsGrid) return;
    customInterestsGrid.innerHTML = "";

    state.customCategories.forEach((cat, index) => {
      const card = document.createElement("div");
      card.className = "glass-card interest-card";

      const delBtn = document.createElement("div");
      delBtn.className = "interest-card__delete";
      delBtn.textContent = "×";
      delBtn.title = "Delete Category";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // prevent opening the view
        if (confirm(`Delete the entire "${cat.title}" category?`)) {
          state.customCategories.splice(index, 1);
          delete state[cat.id]; // remove its data
          saveState();
          renderInterestCards();
        }
      });

      const title = document.createElement("h3");
      title.textContent = cat.title;

      card.appendChild(delBtn);
      card.appendChild(title);

      card.addEventListener("click", () => {
        openMediaView(cat.id, cat.title);
      });

      customInterestsGrid.appendChild(card);
    });
  }

  if (addInterestBtn) {
    addInterestBtn.addEventListener("click", () => {
      const title = prompt("Enter a new interest category name:");
      if (title && title.trim()) {
        const newId = "custom_" + Date.now().toString();
        state.customCategories.push({ id: newId, title: title.trim() });
        state[newId] = []; // initialize empty array for this category
        saveState();
        renderInterestCards();
      }
    });
  }

  // --- Media Logic ---
  let draggedMediaIndex = null;
  let currentMediaType = null; // 'games', 'movies', or 'books'

  function renderMedia() {
    if (!currentMediaType) return;

    // Remove all current media cards (keep the add button)
    const existingCards = mediaGrid.querySelectorAll(".media-card:not(.media-card--add)");
    existingCards.forEach(c => c.remove());

    const items = state[currentMediaType] || [];

    items.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "media-card";
      card.draggable = true;
      card.dataset.index = index;

      const delBtn = document.createElement("div");
      delBtn.className = "media-card__delete";
      delBtn.textContent = "X";
      delBtn.title = "Delete item";
      delBtn.addEventListener("click", () => {
        if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
          state[currentMediaType].splice(index, 1);
          saveState();
          renderMedia();
        }
      });

      const title = document.createElement("h3");
      title.className = "media-card__title";
      title.textContent = item.title;

      card.append(delBtn, title);

      if (currentMediaType === "games") {
        const rank = document.createElement("div");
        rank.className = "media-card__rank";
        rank.textContent = String(index + 1).padStart(2, '0');
        card.append(rank);
      } else {
        title.style.gridColumn = "2 / -1";
      }

      const ratingsRow = document.createElement("div");
      ratingsRow.className = "media-card__row";
      const ratingsLabel = document.createElement("span");
      ratingsLabel.className = "media-card__label";
      ratingsLabel.textContent = "Ratings";
      
      const stars = document.createElement("div");
      stars.className = "media-card__stars";
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement("span");
        star.className = "media-card__star";
        star.innerHTML = "★";
        if (i <= item.rating) star.classList.add("active");
        
        star.addEventListener("click", () => {
          if (item.rating === i) {
            item.rating = 0; // Click same star to clear
          } else {
            item.rating = i;
          }
          saveState();
          renderMedia();
        });
        stars.appendChild(star);
      }
      ratingsRow.append(ratingsLabel, stars);
      card.append(ratingsRow);

      if (currentMediaType === "games") {
        const stateRow = document.createElement("div");
        stateRow.className = "media-card__row";
        const stateLabel = document.createElement("span");
        stateLabel.className = "media-card__label";
        stateLabel.textContent = "State";

        const selectWrap = document.createElement("div");
        selectWrap.className = "media-card__state-wrap";
        const select = document.createElement("select");
        select.className = "media-card__state-select";
        const options = ["Completed", "On pause", "Playing", "Wishlisted"];
        options.forEach(opt => {
          const option = document.createElement("option");
          option.value = opt;
          option.textContent = opt;
          if (item.status === opt) option.selected = true;
          select.appendChild(option);
        });
        
        select.addEventListener("change", (e) => {
          item.status = e.target.value;
          saveState();
        });

        selectWrap.appendChild(select);
        stateRow.append(stateLabel, selectWrap);
        card.append(stateRow);
      } else {
        const descWrap = document.createElement("div");
        descWrap.className = "media-card__desc-wrap";
        
        const textarea = document.createElement("textarea");
        textarea.className = "media-card__desc";
        textarea.placeholder = "Add a description or review...";
        textarea.value = item.description || "";
        
        textarea.addEventListener("input", (e) => {
          item.description = e.target.value;
          saveState();
        });
        
        descWrap.appendChild(textarea);
        card.append(descWrap);
      }

      // Drag events
      card.addEventListener("dragstart", (e) => {
        draggedMediaIndex = index;
        setTimeout(() => card.classList.add("dragging"), 0);
        e.dataTransfer.effectAllowed = "move";
      });

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging");
        const cards = mediaGrid.querySelectorAll(".media-card");
        cards.forEach(c => c.classList.remove("drag-over"));
        draggedMediaIndex = null;
      });

      card.addEventListener("dragover", (e) => {
        e.preventDefault(); // allow drop
        e.dataTransfer.dropEffect = "move";
        card.classList.add("drag-over");
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });

      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over");
        if (draggedMediaIndex === null || draggedMediaIndex === index) return;
        
        // Reorder array
        const draggedItem = state[currentMediaType].splice(draggedMediaIndex, 1)[0];
        state[currentMediaType].splice(index, 0, draggedItem);
        saveState();
        renderMedia();
      });

      mediaGrid.insertBefore(card, addMediaBtn);
    });
  }

  function openMediaView(type, title) {
    currentMediaType = type;
    mediaViewTitle.textContent = title;
    moreModal.classList.remove("active");
    renderMedia();
    applyMediaSettings();
    mediaView.classList.add("active");
  }

  if (openGamesBtn) openGamesBtn.addEventListener("click", () => openMediaView('games', 'My Games'));
  if (openMoviesBtn) openMoviesBtn.addEventListener("click", () => openMediaView('movies', 'My Movies'));
  if (openBooksBtn) openBooksBtn.addEventListener("click", () => openMediaView('books', 'My Books'));

  if (closeMediaBtn) {
    closeMediaBtn.addEventListener("click", () => {
      mediaView.classList.remove("active");
    });
  }

  if (addMediaBtn) {
    addMediaBtn.addEventListener("click", () => {
      if (!currentMediaType) return;
      const title = prompt(`Enter ${currentMediaType.slice(0, -1)} title:`);
      if (title && title.trim()) {
        state[currentMediaType].push({
          id: Date.now().toString(),
          title: title.trim(),
          rating: 0,
          status: "Wishlisted"
        });
        saveState();
        renderMedia();
      }
    });
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

  // Settings Event Listeners
  openSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("active");
  });
  
  closeSettingsBtn.addEventListener("click", () => {
    settingsModal.classList.remove("active");
  });

  // Close when clicking outside panel
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove("active");
    }
  });

  if (openMoreBtn) {
    openMoreBtn.addEventListener("click", () => {
      renderInterestCards();
      moreModal.classList.add("active");
    });
  }

  closeMoreBtn.addEventListener("click", () => {
    moreModal.classList.remove("active");
  });

  moreModal.addEventListener("click", (e) => {
    if (e.target === moreModal) {
      moreModal.classList.remove("active");
    }
  });

  settingCardColor.addEventListener("input", (e) => {
    state.settings = state.settings || {};
    state.settings.cardColor = e.target.value;
    applySettings();
    saveState();
  });
  
  settingFontColor.addEventListener("input", (e) => {
    state.settings = state.settings || {};
    state.settings.fontColor = e.target.value;
    applySettings();
    saveState();
  });

  settingBtnBg.addEventListener("input", (e) => {
    state.settings = state.settings || {};
    state.settings.btnBg = e.target.value;
    applySettings();
    saveState();
  });

  settingBtnText.addEventListener("input", (e) => {
    state.settings = state.settings || {};
    state.settings.btnText = e.target.value;
    applySettings();
    saveState();
  });
  
  settingBgDesktop.addEventListener("change", (e) => {
    processImageFile(e.target.files[0], (dataUrl) => {
      state.settings = state.settings || {};
      state.settings.bgDesktop = dataUrl;
      applySettings();
      try {
        saveState();
      } catch(err) {
        alert("Image is too large to save! Try a smaller image.");
        state.settings.bgDesktop = "";
        applySettings();
        saveState();
      }
    });
  });

  settingBgMobile.addEventListener("change", (e) => {
    processImageFile(e.target.files[0], (dataUrl) => {
      state.settings = state.settings || {};
      state.settings.bgMobile = dataUrl;
      applySettings();
      try {
        saveState();
      } catch(err) {
        alert("Image is too large to save! Try a smaller image.");
        state.settings.bgMobile = "";
        applySettings();
        saveState();
      }
    });
  });

  settingHabitBg.addEventListener("input", (e) => {
    state.settings = state.settings || {};
    state.settings.habitBg = e.target.value;
    applySettings();
    saveState();
  });

  settingHabitFont.addEventListener("input", (e) => {
    state.settings = state.settings || {};
    state.settings.habitFont = e.target.value;
    applySettings();
    saveState();
  });

  settingCardTransparency.addEventListener("input", (e) => {
    state.settings = state.settings || {};
    state.settings.cardTransparency = parseInt(e.target.value);
    settingCardTransparencyValue.textContent = e.target.value + "%";
    applySettings();
    saveState();
  });

  settingGlassTransparency.addEventListener("input", (e) => {
    state.settings = state.settings || {};
    state.settings.glassTransparency = parseInt(e.target.value);
    settingGlassTransparencyValue.textContent = e.target.value + "%";
    applySettings();
    saveState();
  });

  settingBtnTransparency.addEventListener("input", (e) => {
    state.settings = state.settings || {};
    state.settings.btnTransparency = parseInt(e.target.value);
    settingBtnTransparencyValue.textContent = e.target.value + "%";
    applySettings();
    saveState();
  });

  settingNoteTransparency.addEventListener("input", (e) => {
    state.settings = state.settings || {};
    state.settings.noteTransparency = parseInt(e.target.value);
    settingNoteTransparencyValue.textContent = e.target.value + "%";
    applySettings();
    saveState();
  });

  resetSettingsBtn.addEventListener("click", () => {
    state.settings = {};
    settingCardColor.value = "#ffffff";
    settingFontColor.value = "#0a0a0f";
    settingBtnBg.value = "#ffffff";
    settingBtnText.value = "#101620";
    settingBgDesktop.value = "";
    settingBgMobile.value = "";
    settingHabitBg.value = "#ffffff";
    settingHabitFont.value = "#0a0a0f";
    settingCardTransparency.value = "100";
    settingCardTransparencyValue.textContent = "100%";
    settingGlassTransparency.value = "100";
    settingGlassTransparencyValue.textContent = "100%";
    settingBtnTransparency.value = "100";
    settingBtnTransparencyValue.textContent = "100%";
    settingNoteTransparency.value = "100";
    settingNoteTransparencyValue.textContent = "100%";
    applySettings();
    saveState();
  });

  // Export Data
  exportDataBtn.addEventListener("click", () => {
    const dataToExport = { ...state };
    // Remove background images
    if (dataToExport.settings) {
      delete dataToExport.settings.bgDesktop;
      delete dataToExport.settings.bgMobile;
    }
    
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `planner-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert("Data exported successfully!");
  });

  // Import Data
  importDataBtn.addEventListener("click", () => {
    importFileInput.click();
  });

  importFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        // Validate and merge data
        if (importedData.weekMondayISO) state.weekMondayISO = importedData.weekMondayISO;
        if (importedData.habitNames) state.habitNames = importedData.habitNames;
        if (importedData.weekInput !== undefined) state.weekInput = importedData.weekInput;
        if (importedData.settings) state.settings = importedData.settings;
        if (importedData.mediaSettings) state.mediaSettings = importedData.mediaSettings;
        if (importedData.games) state.games = importedData.games;
        if (importedData.movies) state.movies = importedData.movies;
        if (importedData.books) state.books = importedData.books;
        if (importedData.customCategories) state.customCategories = importedData.customCategories;
        
        saveState();
        applySettings();
        renderAll();
        
        alert("Data imported successfully! Refresh the page to see all changes.");
      } catch (error) {
        alert("Error importing data: Invalid file format. Please make sure the file is a valid JSON export.");
        console.error(error);
      }
    };
    reader.readAsText(file);
    importFileInput.value = "";
  });

  // ===== Media Settings Event Listeners =====
  if (openMediaSettingsBtn) {
    openMediaSettingsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isActive = mediaSettingsModal.classList.contains("active");
      if (isActive) {
        mediaSettingsModal.classList.remove("active");
      } else {
        loadMediaSettingsUI();
        mediaSettingsModal.classList.add("active");
      }
    });
  }

  if (closeMediaSettingsBtn) {
    closeMediaSettingsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      mediaSettingsModal.classList.remove("active");
    });
  }

  // Close when clicking outside panel
  mediaSettingsModal.addEventListener("click", (e) => {
    if (e.target === mediaSettingsModal) {
      mediaSettingsModal.classList.remove("active");
    }
  });

  // Media settings inputs
  mediaCardBgColor.addEventListener("input", (e) => {
    state.mediaSettings = state.mediaSettings || {};
    state.mediaSettings.cardBgColor = e.target.value;
    applyMediaSettings();
    saveState();
  });

  mediaCardBgOpacity.addEventListener("input", (e) => {
    state.mediaSettings = state.mediaSettings || {};
    state.mediaSettings.cardBgOpacity = parseInt(e.target.value);
    mediaCardBgOpacityValue.textContent = e.target.value + "%";
    applyMediaSettings();
    saveState();
  });

  mediaHeaderBgColor.addEventListener("input", (e) => {
    state.mediaSettings = state.mediaSettings || {};
    state.mediaSettings.headerBgColor = e.target.value;
    applyMediaSettings();
    saveState();
  });

  mediaHeaderTextColor.addEventListener("input", (e) => {
    state.mediaSettings = state.mediaSettings || {};
    state.mediaSettings.headerTextColor = e.target.value;
    applyMediaSettings();
    saveState();
  });

  mediaCardTextColor.addEventListener("input", (e) => {
    state.mediaSettings = state.mediaSettings || {};
    state.mediaSettings.cardTextColor = e.target.value;
    applyMediaSettings();
    saveState();
  });

  mediaCardBorderColor.addEventListener("input", (e) => {
    state.mediaSettings = state.mediaSettings || {};
    state.mediaSettings.cardBorderColor = e.target.value;
    applyMediaSettings();
    saveState();
  });

  mediaCardBorderWidth.addEventListener("input", (e) => {
    state.mediaSettings = state.mediaSettings || {};
    state.mediaSettings.cardBorderWidth = parseInt(e.target.value);
    applyMediaSettings();
    saveState();
  });

  mediaCardBorderRadius.addEventListener("input", (e) => {
    state.mediaSettings = state.mediaSettings || {};
    state.mediaSettings.cardBorderRadius = parseInt(e.target.value);
    applyMediaSettings();
    saveState();
  });

  mediaCardShadow.addEventListener("input", (e) => {
    state.mediaSettings = state.mediaSettings || {};
    state.mediaSettings.cardShadow = parseInt(e.target.value);
    mediaCardShadowValue.textContent = e.target.value + "%";
    applyMediaSettings();
    saveState();
  });

  resetMediaSettingsBtn.addEventListener("click", () => {
    state.mediaSettings = {};
    mediaCardBgColor.value = "#242424";
    mediaCardBgOpacity.value = "100";
    mediaCardBgOpacityValue.textContent = "100%";
    mediaHeaderBgColor.value = "#000000";
    mediaHeaderTextColor.value = "#ffffff";
    mediaCardTextColor.value = "#ffffff";
    mediaCardBorderColor.value = "#404040";
    mediaCardBorderWidth.value = "2";
    mediaCardBorderRadius.value = "28";
    mediaCardShadow.value = "80";
    mediaCardShadowValue.textContent = "80%";
    applyMediaSettings();
    saveState();
  });

  function loadMediaSettingsUI() {
    const ms = state.mediaSettings || {};
    mediaCardBgColor.value = ms.cardBgColor || "#242424";
    mediaCardBgOpacity.value = ms.cardBgOpacity !== undefined ? ms.cardBgOpacity : 100;
    mediaCardBgOpacityValue.textContent = (ms.cardBgOpacity !== undefined ? ms.cardBgOpacity : 100) + "%";
    mediaHeaderBgColor.value = ms.headerBgColor || "#000000";
    mediaHeaderTextColor.value = ms.headerTextColor || "#ffffff";
    mediaCardTextColor.value = ms.cardTextColor || "#ffffff";
    mediaCardBorderColor.value = ms.cardBorderColor || "#404040";
    mediaCardBorderWidth.value = ms.cardBorderWidth !== undefined ? ms.cardBorderWidth : 2;
    mediaCardBorderRadius.value = ms.cardBorderRadius !== undefined ? ms.cardBorderRadius : 28;
    mediaCardShadow.value = ms.cardShadow !== undefined ? ms.cardShadow : 80;
    mediaCardShadowValue.textContent = (ms.cardShadow !== undefined ? ms.cardShadow : 80) + "%";
  }

  function applyMediaSettings() {
    const ms = state.mediaSettings || {};
    const mediaView = document.getElementById("mediaView");
    const viewHeader = mediaView ? mediaView.querySelector(".view-header") : null;
    const viewTitle = mediaView ? mediaView.querySelector(".view-title") : null;
    const mediaCards = mediaView ? mediaView.querySelectorAll(".media-card:not(.media-card--add)") : [];
    const addBtn = mediaView ? mediaView.querySelector(".media-card--add") : null;

    // Apply header styling
    if (viewHeader) {
      viewHeader.style.backgroundColor = ms.headerBgColor || "#000000";
    }

    if (viewTitle) {
      viewTitle.style.color = ms.headerTextColor || "#ffffff";
    }

    // Apply card styling
    const opacity = (ms.cardBgOpacity !== undefined ? ms.cardBgOpacity : 100) / 100;
    const bgColor = ms.cardBgColor || "#242424";
    const bgColorRgb = hexToRgb(bgColor);
    const bgWithOpacity = `rgba(${bgColorRgb.r}, ${bgColorRgb.g}, ${bgColorRgb.b}, ${opacity})`;

    const shadowIntensity = (ms.cardShadow !== undefined ? ms.cardShadow : 80) / 100;
    const shadowColor = `rgba(0, 0, 0, ${0.2 * shadowIntensity})`;
    const shadowDarkColor = `rgba(0, 0, 0, ${0.3 * shadowIntensity})`;

    mediaCards.forEach(card => {
      card.style.backgroundColor = bgWithOpacity;
      card.style.color = ms.cardTextColor || "#ffffff";
      card.style.borderColor = ms.cardBorderColor || "#404040";
      card.style.borderWidth = (ms.cardBorderWidth !== undefined ? ms.cardBorderWidth : 2) + "px";
      card.style.borderRadius = (ms.cardBorderRadius !== undefined ? ms.cardBorderRadius : 28) + "px";
      card.style.boxShadow = `0 8px 24px ${shadowDarkColor}, 0 2px 8px ${shadowColor}`;

      // Update text colors in card
      const title = card.querySelector(".media-card__title");
      if (title) title.style.color = ms.cardTextColor || "#ffffff";

      const labels = card.querySelectorAll(".media-card__label");
      labels.forEach(label => {
        label.style.color = ms.cardTextColor || "#ffffff";
      });

      const rank = card.querySelector(".media-card__rank");
      if (rank) rank.style.color = ms.cardTextColor || "#aaaaaa";
    });

    // Apply to add button
    if (addBtn) {
      addBtn.style.backgroundColor = bgWithOpacity;
      addBtn.style.color = ms.cardTextColor || "#ffffff";
      addBtn.style.borderColor = ms.cardBorderColor || "#404040";
      addBtn.style.borderWidth = (ms.cardBorderWidth !== undefined ? ms.cardBorderWidth : 2) + "px";
      addBtn.style.borderRadius = (ms.cardBorderRadius !== undefined ? ms.cardBorderRadius : 28) + "px";
      addBtn.style.boxShadow = `0 8px 24px ${shadowDarkColor}, 0 2px 8px ${shadowColor}`;
      const h3 = addBtn.querySelector("h3");
      if (h3) h3.style.color = ms.cardTextColor || "#ffffff";
    }
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 36, g: 36, b: 36 };
  }

  // Load media settings on initial page load
  applyMediaSettings();

  saveState();
  renderAll();
})();
