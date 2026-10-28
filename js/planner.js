/* Menuly — weekly meal planner. */
(function () {
  'use strict';

  const Menuly = window.Menuly;
  const U = Menuly.Utils;
  const S = Menuly.Storage;
  const UI = Menuly.UI;
  const h = U.h;

  const state = {
    weekStart: null,
    mobileDay: null,
    filter: 'all',
    firstDay: null
  };

  function ensureState() {
    const settings = S.getSettings();
    const today = U.todayISO();
    if (!state.weekStart || state.firstDay !== settings.firstDayOfWeek) {
      const anchor = state.mobileDay || today;
      state.weekStart = U.toISO(U.startOfWeek(U.parseISO(anchor), settings.firstDayOfWeek));
      state.firstDay = settings.firstDayOfWeek;
    }
    const days = U.getWeekDays(state.weekStart, settings.firstDayOfWeek);
    state.weekStart = days[0];
    if (!state.mobileDay || !days.includes(state.mobileDay)) {
      state.mobileDay = days.includes(today) ? today : days[0];
    }
  }

  function focusDate(dateISO) {
    const settings = S.getSettings();
    state.firstDay = settings.firstDayOfWeek;
    state.weekStart = U.toISO(U.startOfWeek(U.parseISO(dateISO), settings.firstDayOfWeek));
    state.mobileDay = dateISO;
  }

  function getWeekDays() {
    const settings = S.getSettings();
    return U.getWeekDays(state.weekStart, settings.firstDayOfWeek);
  }

  function firstAvailableType(dateISO) {
    const meals = S.getMeals();
    const available = U.MEAL_TYPES.find((type) => !meals.some((meal) => meal.date === dateISO && meal.mealType === type.id));
    return available ? available.id : 'sarapan';
  }

  function defaultFormDate() {
    const days = getWeekDays();
    if (days.includes(state.mobileDay)) return state.mobileDay;
    if (days.includes(U.todayISO())) return U.todayISO();
    return days[0];
  }

  function filterLabel() {
    if (state.filter === 'all') return 'Semua waktu makan';
    const type = U.findMealType(state.filter);
    return type ? type.label : 'Semua waktu makan';
  }

  function shiftWeek(offset) {
    const settings = S.getSettings();
    const days = U.getWeekDays(state.weekStart, settings.firstDayOfWeek);
    const selectedIndex = Math.max(0, days.indexOf(state.mobileDay));
    const nextStart = U.addDays(U.parseISO(state.weekStart), offset * 7);
    state.weekStart = U.toISO(nextStart);
    state.mobileDay = U.toISO(U.addDays(nextStart, selectedIndex));
    Menuly.App.refresh();
  }

  function goThisWeek() {
    const settings = S.getSettings();
    state.weekStart = U.toISO(U.startOfWeek(new Date(), settings.firstDayOfWeek));
    state.mobileDay = U.todayISO();
    Menuly.App.refresh();
  }

  function jumpToDate(dateISO) {
    if (!U.isValidISO(dateISO)) return;
    const settings = S.getSettings();
    state.weekStart = U.toISO(U.startOfWeek(U.parseISO(dateISO), settings.firstDayOfWeek));
    state.mobileDay = dateISO;
    Menuly.App.refresh();
  }

  function openDeleteDialog(meal) {
    const type = U.findMealType(meal.mealType);
    const date = U.parseISO(meal.date);
    UI.confirm({
      title: 'Hapus rencana menu?',
      message: `"${meal.name}" pada ${type ? type.label : 'waktu makan'} ${U.formatDayLong(date)}, ${U.formatDateShort(date)} akan dihapus dari rencana.`,
      detail: 'Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Hapus menu',
      cancelLabel: 'Batal',
      tone: 'danger',
      icon: 'trash-2'
    }).then((approved) => {
      if (!approved) return;
      S.deleteMeal(meal.id);
      UI.toast('Rencana menu berhasil dihapus.', 'success');
      Menuly.App.refresh();
    });
  }

  function buildMealCard(meal, recipesById) {
    const type = U.findMealType(meal.mealType);
    const recipe = meal.recipeId ? recipesById.get(meal.recipeId) : null;
    const card = h('article', { class: `meal-card type-${meal.mealType}` },
      h('div', { class: 'meal-card-top' },
        h('span', { class: 'meal-type-label' },
          h('span', { class: `type-dot type-${meal.mealType}` }),
          type ? type.short : 'Menu'
        ),
        h('div', { class: 'meal-card-actions' },
          UI.iconButton('pencil', `Edit ${meal.name}`, () => openMealForm(meal), { className: 'mini-icon-btn', size: 12 }),
          UI.iconButton('trash-2', `Hapus ${meal.name}`, () => openDeleteDialog(meal), { className: 'mini-icon-btn', size: 12 })
        )
      ),
      h('h4', { class: 'meal-name' }, meal.name)
    );

    if (recipe) {
      card.appendChild(h('span', { class: 'meal-recipe-meta' },
        U.icon('book-open', 10),
        `${recipe.cookTime ? `${recipe.cookTime} mnt` : 'Resep'}`
      ));
    }
    if (meal.note) {
      card.appendChild(h('p', { class: 'meal-note', title: meal.note }, meal.note));
    }
    return card;
  }

  function buildWeekStrip(days, mealsByDate) {
    const strip = h('div', { class: 'week-mobile-strip', 'aria-label': 'Pilih hari' });
    days.forEach((dateISO) => {
      const date = U.parseISO(dateISO);
      const count = (mealsByDate.get(dateISO) || []).length;
      const isActive = dateISO === state.mobileDay;
      const btn = h('button', {
        type: 'button',
        class: `week-strip-day${isActive ? ' active' : ''}${dateISO === U.todayISO() ? ' is-today' : ''}`,
        'aria-pressed': isActive ? 'true' : 'false',
        'aria-label': `${U.formatDayLong(date)}, ${U.formatDateShort(date)}, ${count} menu`,
        dataset: { date: dateISO }
      },
        h('span', { class: 'strip-day-name' }, U.formatDayShort(date)),
        h('span', { class: 'strip-day-num' }, String(date.getDate())),
        h('span', { class: `strip-day-dot${count ? ' is-set' : ''}`, 'aria-hidden': 'true' })
      );
      strip.appendChild(btn);
    });
    return strip;
  }

  function buildWeekBoard(days, mealsByDate, recipesById) {
    const board = h('div', { class: 'week-board' });
    days.forEach((dateISO) => {
      const date = U.parseISO(dateISO);
      const allDayMeals = U.sortMeals(mealsByDate.get(dateISO) || []);
      const visibleMeals = allDayMeals.filter((meal) => state.filter === 'all' || meal.mealType === state.filter);
      const isToday = dateISO === U.todayISO();
      const col = h('section', {
        class: `day-col${isToday ? ' is-today' : ''}${dateISO === state.mobileDay ? ' mobile-active' : ''}`,
        dataset: { date: dateISO },
        'aria-label': `${U.formatDayLong(date)}, ${U.formatDateShort(date)}`
      });

      col.appendChild(h('div', { class: 'day-head' },
        h('span', { class: 'day-name' }, U.formatDayShort(date)),
        h('span', { class: 'day-number' }, String(date.getDate())),
        isToday ? h('span', { class: 'day-today-label' }, 'Hari ini') : h('span', { class: 'day-month' }, U.formatDateCompact(date).split(' ')[1])
      ));

      const body = h('div', { class: 'day-body' });
      if (visibleMeals.length) {
        visibleMeals.forEach((meal) => body.appendChild(buildMealCard(meal, recipesById)));
      } else {
        body.appendChild(h('div', { class: 'day-empty' },
          U.icon(allDayMeals.length ? 'filter-x' : 'calendar-plus', 17),
          h('span', null, allDayMeals.length
            ? `Tidak ada menu ${filterLabel().toLowerCase()}`
            : 'Belum ada menu untuk hari ini')
        ));
      }
      col.appendChild(body);

      const allFilled = U.MEAL_TYPES.every((type) => allDayMeals.some((meal) => meal.mealType === type.id));
      const footer = h('div', { class: 'day-footer' });
      if (allFilled) {
        footer.appendChild(h('p', { class: 'day-full' }, U.icon('check', 12), 'Semua slot terisi'));
      } else {
        footer.appendChild(h('button', {
          type: 'button',
          class: 'day-add',
          'aria-label': `Tambah menu untuk ${U.formatDayLong(date)}, ${U.formatDateShort(date)}`,
          onClick: () => openMealForm({ date: dateISO, mealType: firstAvailableType(dateISO) })
        }, U.icon('plus', 13), 'Tambah menu'));
      }
      col.appendChild(footer);
      board.appendChild(col);
    });
    return board;
  }

  function render(root) {
    ensureState();
    const settings = S.getSettings();
    const meals = S.getMeals();
    const recipes = S.getRecipes();
    const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    const days = U.getWeekDays(state.weekStart, settings.firstDayOfWeek);
    const mealsByDate = new Map();
    meals.forEach((meal) => {
      if (!mealsByDate.has(meal.date)) mealsByDate.set(meal.date, []);
      mealsByDate.get(meal.date).push(meal);
    });
    const weekMeals = days.flatMap((dateISO) => mealsByDate.get(dateISO) || []);
    const selectedDateForAdd = days.includes(state.mobileDay) ? state.mobileDay : days[0];

    const header = UI.pageHeader({
      eyebrow: 'Menuly · Perencanaan',
      title: 'Rencana Menu',
      actions: [
        UI.button({
          label: 'Tambah rencana',
          icon: 'plus',
          variant: 'primary',
          onClick: () => openMealForm({
            date: selectedDateForAdd,
            mealType: firstAvailableType(selectedDateForAdd)
          })
        })
      ]
    });
    root.appendChild(header);

    const body = h('div', { class: 'page-body page-stack planner-page' });

    const toolbar = h('section', { class: 'panel planner-toolbar' });
    const weekbar = h('div', { class: 'planner-weekbar' },
      h('div', { class: 'week-nav' },
        UI.iconButton('chevron-left', 'Minggu sebelumnya', () => shiftWeek(-1), { className: 'week-arrow' }),
        h('div', { class: 'week-label' },
          h('span', { class: 'week-label-kicker' }, 'Minggu yang dilihat'),
          h('strong', null, U.formatWeekRange(state.weekStart))
        ),
        UI.iconButton('chevron-right', 'Minggu berikutnya', () => shiftWeek(1), { className: 'week-arrow' })
      ),
      h('div', { class: 'planner-tools' },
        UI.button({
          label: 'Minggu ini',
          icon: 'calendar-check',
          variant: 'secondary',
          size: 'sm',
          onClick: goThisWeek
        }),
        h('label', { class: 'date-jump' },
          U.icon('calendar-days', 14),
          h('span', { class: 'sr-only' }, 'Pilih tanggal untuk membuka minggunya'),
          h('input', {
            type: 'date',
            value: state.mobileDay,
            onChange: (event) => jumpToDate(event.target.value)
          })
        )
      )
    );
    toolbar.appendChild(weekbar);

    const filterbar = h('div', { class: 'planner-filterbar' });
    const chips = h('div', { class: 'filter-chips', 'aria-label': 'Filter waktu makan' });
    const chipButtons = [];
    [{ id: 'all', label: 'Semua' }].concat(U.MEAL_TYPES.map((type) => ({ id: type.id, label: type.label })))
      .forEach((filter) => {
        const count = filter.id === 'all'
          ? weekMeals.length
          : weekMeals.filter((meal) => meal.mealType === filter.id).length;
        const chip = h('button', {
          type: 'button',
          class: `chip${state.filter === filter.id ? ' active' : ''}`,
          'aria-pressed': state.filter === filter.id ? 'true' : 'false'
        },
          filter.label,
          h('span', { class: 'chip-count' }, String(count))
        );
        chip.addEventListener('click', () => {
          if (state.filter === filter.id) return;
          state.filter = filter.id;
          chipButtons.forEach((item) => {
            const active = item.dataset.filter === filter.id;
            item.classList.toggle('active', active);
            item.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
          paintBoard();
          updateSummary();
        });
        chip.dataset.filter = filter.id;
        chipButtons.push(chip);
        chips.appendChild(chip);
      });
    const summary = h('p', { class: 'planner-summary' });
    filterbar.append(chips, summary);
    toolbar.appendChild(filterbar);
    body.appendChild(toolbar);

    const weekPanel = h('section', { class: 'panel week-panel' });
    const boardHost = h('div', { class: 'week-board-host' });
    weekPanel.appendChild(boardHost);
    body.appendChild(weekPanel);

    function updateSummary() {
      const filteredCount = weekMeals.filter((meal) => state.filter === 'all' || meal.mealType === state.filter).length;
      const activeDays = new Set(weekMeals.map((meal) => meal.date)).size;
      const filterText = state.filter === 'all' ? 'menu' : `menu ${filterLabel().toLowerCase()}`;
      summary.textContent = `${filteredCount} ${filterText} · ${activeDays} dari 7 hari terisi`;
    }

    function paintBoard() {
      U.clear(boardHost);
      boardHost.appendChild(buildWeekStrip(days, mealsByDate));
      boardHost.appendChild(buildWeekBoard(days, mealsByDate, recipesById));
      const stripButtons = Array.from(boardHost.querySelectorAll('.week-strip-day'));
      const columns = Array.from(boardHost.querySelectorAll('.day-col'));
      stripButtons.forEach((button) => {
        button.addEventListener('click', () => {
          state.mobileDay = button.dataset.date;
          stripButtons.forEach((item) => {
            const active = item.dataset.date === state.mobileDay;
            item.classList.toggle('active', active);
            item.setAttribute('aria-pressed', active ? 'true' : 'false');
          });
          columns.forEach((col) => {
            col.classList.toggle('mobile-active', col.dataset.date === state.mobileDay);
          });
        });
      });
      UI.refreshIcons();
    }

    paintBoard();
    updateSummary();
    root.appendChild(body);
    UI.refreshIcons();
  }

  function validateForm(values) {
    const errors = {};
    if (!values.name) errors.name = 'Nama makanan wajib diisi.';
    else if (values.name.length > 80) errors.name = 'Nama makanan maksimal 80 karakter.';
    if (!U.isValidISO(values.date)) errors.date = 'Pilih tanggal yang valid.';
    if (!U.findMealType(values.mealType)) errors.mealType = 'Pilih waktu makan.';
    if (values.note.length > 300) errors.note = 'Catatan maksimal 300 karakter.';
    return errors;
  }

  function openConflictModal(existing, pending, editing) {
    const existingType = U.findMealType(existing.mealType);
    const date = U.parseISO(existing.date);
    const body = h('div', { class: 'conflict-body' },
      h('div', { class: 'conflict-card' },
        h('span', { class: `slot-icon type-${existing.mealType}` }, U.icon(existingType ? existingType.icon : 'utensils', 17)),
        h('div', null,
          h('span', { class: 'conflict-kicker' }, `${existingType ? existingType.label : 'Menu'} · ${U.formatDateShort(date)}`),
          h('strong', null, existing.name)
        )
      ),
      h('p', { class: 'confirm-message' },
        `Slot ${existingType ? existingType.label.toLowerCase() : 'ini'} pada ${U.formatDayLong(date)}, ${U.formatDateShort(date)} sudah terisi. Satu slot hanya bisa berisi satu menu.`
      ),
      h('p', { class: 'confirm-detail' },
        'Pilih untuk mengedit menu yang sudah ada atau menggantinya dengan menu baru.'
      )
    );

    const cancel = UI.button({ label: 'Batal', variant: 'secondary', onClick: () => UI.closeModal() });
    const edit = UI.button({
      label: 'Edit menu saat ini',
      variant: 'secondary',
      icon: 'pencil',
      onClick: () => {
        UI.closeModal();
        openMealForm(existing);
      }
    });
    const replace = UI.button({
      label: 'Ganti menu',
      variant: 'danger',
      icon: 'refresh-cw',
      onClick: () => {
        if (editing && editing.id && editing.id !== existing.id) {
          S.deleteMeal(editing.id);
        }
        S.updateMeal(existing.id, pending);
        UI.closeModal();
        UI.toast('Menu pada slot tersebut berhasil diganti.', 'success');
        alignView(pending.date);
        Menuly.App.refresh();
      }
    });

    UI.openModal({
      title: 'Slot sudah terisi',
      subtitle: 'Konflik jadwal menu',
      icon: 'calendar-x-2',
      iconTone: 'tone-amber',
      size: 'sm',
      body,
      footer: [cancel, edit, replace]
    });
  }

  function alignView(dateISO) {
    const settings = S.getSettings();
    state.firstDay = settings.firstDayOfWeek;
    state.weekStart = U.toISO(U.startOfWeek(U.parseISO(dateISO), settings.firstDayOfWeek));
    state.mobileDay = dateISO;
  }

  function openMealForm(options) {
    const opts = options || {};
    const editing = opts.id ? S.getMeals().find((meal) => meal.id === opts.id) || null : null;
    const recipes = [...S.getRecipes()].sort((a, b) => a.name.localeCompare(b.name, 'id'));
    const baseDate = editing ? editing.date : (opts.date || defaultFormDate());
    const baseType = editing ? editing.mealType : (opts.mealType || firstAvailableType(baseDate));
    const initialRecipeId = editing
      ? (recipes.some((recipe) => recipe.id === editing.recipeId) ? editing.recipeId : '')
      : (recipes.some((recipe) => recipe.id === opts.recipeId) ? opts.recipeId : '');
    const initialRecipe = recipes.find((recipe) => recipe.id === initialRecipeId) || null;
    const initialName = editing ? editing.name : (opts.name || (initialRecipe ? initialRecipe.name : ''));

    const nameInput = h('input', {
      type: 'text',
      class: 'input',
      id: 'meal-name',
      maxlength: '80',
      placeholder: 'Contoh: Nasi goreng kampung',
      autocomplete: 'off',
      autofocus: true,
      value: initialName
    });
    const nameField = U.createField('Nama makanan', nameInput, { required: true, hint: 'Nama ini yang akan tampil pada kalender menu.' });

    const dateInput = h('input', {
      type: 'date',
      class: 'input',
      id: 'meal-date',
      value: baseDate
    });
    const dateField = U.createField('Tanggal', dateInput, { required: true });

    const typeSelect = h('select', { class: 'input', id: 'meal-type' },
      U.MEAL_TYPES.map((type) => U.option(type.id, type.label, type.id === baseType))
    );
    const typeField = U.createField('Waktu makan', typeSelect, { required: true });

    const recipeSelect = h('select', { class: 'input', id: 'meal-recipe' },
      U.option('', 'Tanpa resep terkait', !initialRecipeId),
      recipes.map((recipe) => U.option(recipe.id, recipe.name, recipe.id === initialRecipeId))
    );
    const recipeHint = h('p', { class: 'field-hint' });
    const recipeField = U.createField('Resep terkait', recipeSelect, {
      hint: 'Opsional. Menghubungkan menu dengan bahan dan langkah memasak.'
    });
    recipeField.wrap.appendChild(recipeHint);

    const noteInput = h('textarea', {
      class: 'input',
      id: 'meal-note',
      maxlength: '300',
      rows: '3',
      placeholder: 'Contoh: Porsi lebih kecil untuk makan malam.'
    });
    noteInput.value = editing ? editing.note : (opts.note || '');
    const noteField = U.createField('Catatan', noteInput, { hint: 'Maksimal 300 karakter.' });

    function updateRecipeHint() {
      const recipe = recipes.find((item) => item.id === recipeSelect.value);
      if (!recipe) {
        recipeHint.textContent = '';
        return;
      }
      recipeHint.textContent = `${recipe.ingredients.length} bahan · ${recipe.cookTime || 0} menit · ${recipe.servings} porsi`;
      if (!nameInput.value.trim()) nameInput.value = recipe.name;
    }
    recipeSelect.addEventListener('change', updateRecipeHint);
    updateRecipeHint();

    const form = h('form', { id: 'meal-form', class: 'form-stack', novalidate: true },
      nameField.wrap,
      h('div', { class: 'form-grid' }, dateField.wrap, typeField.wrap),
      recipeField.wrap,
      noteField.wrap
    );

    const allFields = [nameField, dateField, typeField, recipeField, noteField];
    allFields.forEach((field) => {
      const clear = () => U.clearFieldError(field);
      field.control.addEventListener('input', clear);
      field.control.addEventListener('change', clear);
    });

    let submitting = false;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (submitting) return;
      allFields.forEach(U.clearFieldError);

      const values = {
        name: nameInput.value.trim(),
        date: dateInput.value,
        mealType: typeSelect.value,
        recipeId: recipeSelect.value || null,
        note: noteInput.value.trim()
      };
      const errors = validateForm(values);
      if (Object.keys(errors).length) {
        const map = { name: nameField, date: dateField, mealType: typeField, note: noteField };
        Object.keys(errors).forEach((key) => {
          if (map[key]) U.setFieldError(map[key], errors[key]);
        });
        const first = Object.keys(errors)[0];
        if (map[first]) U.focusField(map[first]);
        return;
      }

      const existing = S.findMealAtSlot(values.date, values.mealType, editing ? editing.id : null);
      if (existing) {
        openConflictModal(existing, values, editing);
        return;
      }

      submitting = true;
      if (editing) {
        S.updateMeal(editing.id, values);
        UI.toast('Rencana menu berhasil diperbarui.', 'success');
      } else {
        S.addMeal(values);
        UI.toast('Menu berhasil ditambahkan ke rencana.', 'success');
      }
      UI.closeModal();
      alignView(values.date);
      Menuly.App.refresh();
    });

    const cancelBtn = UI.button({ label: 'Batal', variant: 'secondary', onClick: () => UI.closeModal() });
    const saveBtn = UI.button({
      label: editing ? 'Simpan perubahan' : 'Tambah ke rencana',
      icon: 'check',
      variant: 'primary',
      type: 'submit',
      form: 'meal-form'
    });

    UI.openModal({
      title: editing ? 'Edit rencana menu' : 'Tambah rencana menu',
      subtitle: editing ? 'Perbarui detail menu pada jadwal ini.' : 'Isi detail menu untuk tanggal dan waktu makan yang dipilih.',
      icon: editing ? 'pencil' : 'calendar-plus',
      size: 'md',
      body: form,
      footer: [cancelBtn, saveBtn]
    });
  }

  Menuly.Planner = {
    render,
    focusDate,
    openMealForm
  };
})();
