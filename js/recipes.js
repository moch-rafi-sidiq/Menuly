/* Menuly — recipe collection: search, filter, detail, and form. */
(function () {
  'use strict';

  const Menuly = window.Menuly;
  const U = Menuly.Utils;
  const S = Menuly.Storage;
  const UI = Menuly.UI;
  const h = U.h;

  const state = {
    query: '',
    category: 'all',
    sort: 'name'
  };

  function categoryTone(categoryId) {
    const map = {
      sarapan: 'tone-amber',
      lauk: 'tone-rust',
      sayur: 'tone-green',
      minuman: 'tone-blue',
      camilan: 'tone-plum'
    };
    return map[categoryId] || 'tone-navy';
  }

  function resetFilters() {
    state.query = '';
    state.category = 'all';
    state.sort = 'name';
    Menuly.App.refresh();
  }

  function openDeleteDialog(recipe) {
    UI.confirm({
      title: 'Hapus resep?',
      message: `Resep "${recipe.name}" beserta bahan dan langkah memasaknya akan dihapus dari koleksi.`,
      detail: 'Rencana menu yang sudah memakai resep ini tetap tersimpan sebagai menu mandiri.',
      confirmLabel: 'Hapus resep',
      cancelLabel: 'Batal',
      tone: 'danger',
      icon: 'trash-2'
    }).then((approved) => {
      if (!approved) return;
      S.deleteRecipe(recipe.id);
      UI.toast('Resep berhasil dihapus.', 'success');
      Menuly.App.refresh();
    });
  }

  function buildRecipeCard(recipe) {
    const category = U.findRecipeCategory(recipe.category);
    const previewIngredients = recipe.ingredients.slice(0, 3);
    const extraCount = Math.max(0, recipe.ingredients.length - previewIngredients.length);
    const note = recipe.note || `${recipe.steps.length} langkah memasak`;

    return h('article', { class: 'recipe-card', dataset: { cat: recipe.category } },
      h('div', { class: 'recipe-card-top' },
        h('span', { class: 'recipe-cat' },
          h('span', { class: `recipe-cat-icon ${categoryTone(recipe.category)}` }, U.icon(category ? category.icon : 'book-open', 14)),
          h('span', null, category ? category.label : 'Resep')
        ),
        h('div', { class: 'recipe-actions' },
          UI.iconButton('pencil', `Edit resep ${recipe.name}`, () => openRecipeForm(recipe), { className: 'recipe-action', size: 14 }),
          UI.iconButton('trash-2', `Hapus resep ${recipe.name}`, () => openDeleteDialog(recipe), { className: 'recipe-action danger', size: 14 })
        )
      ),
      h('div', { class: 'recipe-card-body' },
        h('h3', { class: 'recipe-title' }, recipe.name),
        h('p', { class: 'recipe-desc' }, note),
        h('div', { class: 'recipe-ingredients' },
          previewIngredients.map((ingredient) => h('span', { class: 'ingredient-pill', title: U.formatQuantity(ingredient.amount, ingredient.unit) }, ingredient.name)),
          extraCount ? h('span', { class: 'ingredient-pill more' }, `+${extraCount}`) : null
        )
      ),
      h('div', { class: 'recipe-footer' },
        h('div', { class: 'recipe-meta' },
          h('span', null, U.icon('clock-3', 12), `${recipe.cookTime} mnt`),
          h('span', null, U.icon('users', 12), `${recipe.servings} porsi`)
        ),
        UI.linkButton('Lihat resep', 'arrow-right', () => openRecipeDetail(recipe))
      )
    );
  }

  function openRecipeDetail(recipe) {
    const category = U.findRecipeCategory(recipe.category);
    const ingredientCount = recipe.ingredients.length;
    const body = h('div', { class: 'recipe-detail' });

    body.appendChild(h('div', { class: 'detail-meta-grid' },
      h('div', { class: 'detail-meta-item' },
        h('span', { class: 'detail-meta-icon' }, U.icon('clock-3', 16)),
        h('div', null, h('span', null, 'Waktu memasak'), h('strong', null, U.formatMinutes(recipe.cookTime)))
      ),
      h('div', { class: 'detail-meta-item' },
        h('span', { class: 'detail-meta-icon' }, U.icon('users', 16)),
        h('div', null, h('span', null, 'Porsi'), h('strong', null, `${recipe.servings} porsi`))
      ),
      h('div', { class: 'detail-meta-item' },
        h('span', { class: 'detail-meta-icon' }, U.icon('list-checks', 16)),
        h('div', null, h('span', null, 'Bahan'), h('strong', null, `${ingredientCount} bahan`))
      )
    ));

    if (recipe.note) {
      body.appendChild(h('div', { class: 'recipe-note-callout' },
        U.icon('quote', 15),
        h('p', null, recipe.note)
      ));
    }

    const ingredientsSection = h('section', { class: 'detail-section' },
      h('div', { class: 'detail-section-head' },
        h('h3', null, 'Bahan-bahan'),
        h('span', null, `${ingredientCount} bahan`)
      )
    );
    if (ingredientCount) {
      const list = h('ul', { class: 'detail-ingredients' });
      recipe.ingredients.forEach((ingredient) => {
        const ingredientCategory = U.findIngredientCategory(ingredient.category);
        list.appendChild(h('li', { class: 'detail-ingredient' },
          h('span', { class: `ingredient-cat-icon ${ingredient.category || 'lainnya'}`, title: ingredientCategory ? ingredientCategory.label : 'Lainnya' },
            U.icon(ingredientCategory ? ingredientCategory.icon : 'package', 13)
          ),
          h('span', { class: 'detail-ingredient-name' }, ingredient.name),
          h('span', { class: 'detail-ingredient-qty' }, U.formatQuantity(ingredient.amount, ingredient.unit))
        ));
      });
      ingredientsSection.appendChild(list);
    } else {
      ingredientsSection.appendChild(h('p', { class: 'detail-empty' }, 'Belum ada bahan yang dicatat.'));
    }
    body.appendChild(ingredientsSection);

    const stepsSection = h('section', { class: 'detail-section' },
      h('div', { class: 'detail-section-head' },
        h('h3', null, 'Cara membuat'),
        h('span', null, `${recipe.steps.length} langkah`)
      )
    );
    if (recipe.steps.length) {
      const steps = h('ol', { class: 'detail-steps' });
      recipe.steps.forEach((step, index) => {
        steps.appendChild(h('li', null,
          h('span', { class: 'detail-step-number' }, U.pad2(index + 1)),
          h('p', null, step)
        ));
      });
      stepsSection.appendChild(steps);
    } else {
      stepsSection.appendChild(h('p', { class: 'detail-empty' }, 'Belum ada langkah memasak.'));
    }
    body.appendChild(stepsSection);

    const closeBtn = UI.button({
      label: 'Tutup',
      variant: 'ghost',
      onClick: () => UI.closeModal()
    });
    const shoppingBtn = UI.button({
      label: 'Tambah ke belanja',
      icon: 'shopping-basket',
      variant: 'secondary',
      onClick: () => {
        UI.closeModal();
        Menuly.App.go('shopping', () => Menuly.Shopping.openImportModal({ recipeIds: [recipe.id] }));
      }
    });
    const planBtn = UI.button({
      label: 'Gunakan di rencana',
      icon: 'calendar-plus',
      variant: 'primary',
      onClick: () => {
        UI.closeModal();
        const today = U.todayISO();
        Menuly.Planner.focusDate(today);
        Menuly.App.go('planner', () => Menuly.Planner.openMealForm({ recipeId: recipe.id, date: today }));
      }
    });

    UI.openModal({
      title: recipe.name,
      subtitle: `${category ? category.label : 'Resep'} · ${recipe.servings} porsi`,
      icon: category ? category.icon : 'book-open',
      iconTone: categoryTone(recipe.category),
      size: 'lg',
      body,
      footer: [closeBtn, shoppingBtn, planBtn]
    });
  }

  function createIngredientRow(ingredient, onRemove) {
    const data = ingredient || {};
    const name = h('input', {
      type: 'text',
      class: 'input ing-name',
      placeholder: 'Nama bahan',
      maxlength: '100',
      autocomplete: 'off',
      'aria-label': 'Nama bahan',
      value: data.name || ''
    });
    const amount = h('input', {
      type: 'text',
      class: 'input ing-amount',
      placeholder: 'Jumlah',
      inputmode: 'decimal',
      maxlength: '30',
      autocomplete: 'off',
      'aria-label': 'Jumlah bahan',
      value: data.amount || ''
    });
    const unit = h('input', {
      type: 'text',
      class: 'input ing-unit',
      placeholder: 'Satuan',
      list: 'unit-options',
      maxlength: '30',
      autocomplete: 'off',
      'aria-label': 'Satuan bahan',
      value: data.unit || ''
    });
    const category = h('select', {
      class: 'input ing-cat',
      'aria-label': 'Kategori bahan'
    }, U.INGREDIENT_CATEGORIES.map((item) => U.option(item.id, item.label, (data.category || 'bahan_pokok') === item.id)));
    const remove = h('button', {
      type: 'button',
      class: 'row-remove',
      'aria-label': 'Hapus bahan ini',
      title: 'Hapus bahan'
    }, U.icon('x', 14));
    const row = h('div', { class: 'ingredient-row', dataset: { id: data.id || '' } }, name, amount, unit, category, remove);
    remove.addEventListener('click', () => {
      row.remove();
      if (onRemove) onRemove();
    });
    return { row, name, amount, unit, category };
  }

  function createStepRow(text, onRemove) {
    const textarea = h('textarea', {
      class: 'input step-input',
      rows: '2',
      maxlength: '1000',
      placeholder: 'Tuliskan langkah memasak...',
      'aria-label': 'Langkah memasak'
    });
    textarea.value = text || '';
    const number = h('span', { class: 'step-number' }, '01');
    const remove = h('button', {
      type: 'button',
      class: 'row-remove step-remove',
      'aria-label': 'Hapus langkah ini',
      title: 'Hapus langkah'
    }, U.icon('x', 14));
    const row = h('div', { class: 'step-row' }, number, textarea, remove);
    remove.addEventListener('click', () => {
      row.remove();
      if (onRemove) onRemove();
    });
    return { row, textarea, number };
  }

  function openRecipeForm(recipe) {
    const editing = Boolean(recipe);
    const formId = 'recipe-form';
    const nameInput = h('input', {
      type: 'text',
      class: 'input',
      id: 'recipe-name',
      maxlength: '80',
      autocomplete: 'off',
      placeholder: 'Contoh: Ayam kecap manis',
      autofocus: true,
      value: editing ? recipe.name : ''
    });
    const nameField = U.createField('Nama resep', nameInput, { required: true });

    const categorySelect = h('select', { class: 'input', id: 'recipe-category' },
      U.RECIPE_CATEGORIES.map((category) => U.option(category.id, category.label, editing ? recipe.category === category.id : category.id === 'sarapan'))
    );
    const categoryField = U.createField('Kategori', categorySelect, { required: true });

    const cookTimeInput = h('input', {
      type: 'number',
      class: 'input',
      id: 'recipe-time',
      min: '1',
      max: '600',
      step: '1',
      inputmode: 'numeric',
      value: editing ? String(recipe.cookTime || '') : ''
    });
    const timeField = U.createField('Waktu memasak (menit)', cookTimeInput, { required: true });

    const servingsInput = h('input', {
      type: 'number',
      class: 'input',
      id: 'recipe-servings',
      min: '1',
      max: '50',
      step: '1',
      inputmode: 'numeric',
      value: editing ? String(recipe.servings || '') : ''
    });
    const servingsField = U.createField('Jumlah porsi', servingsInput, { required: true });

    const noteInput = h('textarea', {
      class: 'input',
      id: 'recipe-note',
      rows: '3',
      maxlength: '500',
      placeholder: 'Tips atau catatan tambahan untuk resep ini (opsional)'
    });
    noteInput.value = editing ? recipe.note : '';
    const noteField = U.createField('Catatan', noteInput, { hint: 'Maksimal 500 karakter.' });

    const ingredientList = h('div', { class: 'ingredient-list', id: 'ingredient-list' });
    const ingredientError = h('p', { class: 'group-error', hidden: true });
    const stepList = h('div', { class: 'step-list', id: 'step-list' });
    const stepError = h('p', { class: 'group-error', hidden: true });

    function updateIngredientNumbers() {
      // Keeps the accessible labels in sync after rows are added or removed.
      Array.from(ingredientList.querySelectorAll('.ingredient-row')).forEach((row, index) => {
        row.querySelector('.ing-name')?.setAttribute('aria-label', `Nama bahan ${index + 1}`);
        row.querySelector('.ing-amount')?.setAttribute('aria-label', `Jumlah bahan ${index + 1}`);
        row.querySelector('.ing-unit')?.setAttribute('aria-label', `Satuan bahan ${index + 1}`);
        row.querySelector('.ing-cat')?.setAttribute('aria-label', `Kategori bahan ${index + 1}`);
      });
    }

    function updateStepNumbers() {
      Array.from(stepList.querySelectorAll('.step-row')).forEach((row, index) => {
        row.querySelector('.step-number').textContent = U.pad2(index + 1);
        row.querySelector('textarea')?.setAttribute('aria-label', `Langkah memasak ${index + 1}`);
      });
    }

    function addIngredientRow(ingredient, shouldFocus) {
      const rowData = createIngredientRow(ingredient, updateIngredientNumbers);
      ingredientList.appendChild(rowData.row);
      updateIngredientNumbers();
      ingredientError.hidden = true;
      if (shouldFocus) rowData.name.focus();
      return rowData;
    }

    function addStepRow(text, shouldFocus) {
      const rowData = createStepRow(text, updateStepNumbers);
      stepList.appendChild(rowData.row);
      updateStepNumbers();
      stepError.hidden = true;
      if (shouldFocus) rowData.textarea.focus();
      return rowData;
    }

    if (editing && recipe.ingredients.length) {
      recipe.ingredients.forEach((ingredient) => addIngredientRow(ingredient, false));
    } else {
      addIngredientRow(null, false);
    }
    if (editing && recipe.steps.length) {
      recipe.steps.forEach((step) => addStepRow(step, false));
    } else {
      addStepRow('', false);
    }

    const addIngredientBtn = UI.button({
      label: 'Tambah bahan',
      icon: 'plus',
      variant: 'secondary',
      size: 'sm',
      onClick: () => addIngredientRow(null, true)
    });
    const addStepBtn = UI.button({
      label: 'Tambah langkah',
      icon: 'plus',
      variant: 'secondary',
      size: 'sm',
      onClick: () => addStepRow('', true)
    });

    const ingredientSection = h('section', { class: 'dynamic-section' },
      h('div', { class: 'dynamic-head' },
        h('div', { class: 'dynamic-title' },
          h('h3', null, 'Bahan-bahan'),
          h('p', null, 'Lengkapi jumlah dan satuan agar mudah masuk daftar belanja.')
        ),
        addIngredientBtn
      ),
      h('div', { class: 'ingredient-columns', 'aria-hidden': 'true' },
        h('span', null, 'Nama bahan'),
        h('span', null, 'Jumlah'),
        h('span', null, 'Satuan'),
        h('span', null, 'Kategori'),
        h('span', null, '')
      ),
      ingredientList,
      ingredientError
    );

    const stepSection = h('section', { class: 'dynamic-section' },
      h('div', { class: 'dynamic-head' },
        h('div', { class: 'dynamic-title' },
          h('h3', null, 'Cara membuat'),
          h('p', null, 'Tulis langkah memasak sesuai urutan.')
        ),
        addStepBtn
      ),
      stepList,
      stepError
    );

    const unitOptions = h('datalist', { id: 'unit-options' },
      U.UNITS.map((unit) => h('option', { value: unit }))
    );

    const form = h('form', { id: formId, class: 'form-stack', novalidate: true },
      nameField.wrap,
      h('div', { class: 'form-grid three' }, categoryField.wrap, timeField.wrap, servingsField.wrap),
      ingredientSection,
      stepSection,
      noteField.wrap,
      unitOptions
    );

    const topFields = [nameField, categoryField, timeField, servingsField, noteField];
    topFields.forEach((field) => {
      field.control.addEventListener('input', () => U.clearFieldError(field));
      field.control.addEventListener('change', () => U.clearFieldError(field));
    });

    let submitting = false;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (submitting) return;
      topFields.forEach(U.clearFieldError);
      ingredientError.hidden = true;
      stepError.hidden = true;
      ingredientList.querySelectorAll('.ingredient-row').forEach((row) => row.classList.remove('invalid'));
      stepList.querySelectorAll('.step-row').forEach((row) => row.classList.remove('invalid'));
      let firstInvalid = null;
      let valid = true;

      const name = nameInput.value.trim();
      if (!name) {
        U.setFieldError(nameField, 'Nama resep wajib diisi.');
        firstInvalid = firstInvalid || nameInput;
        valid = false;
      }
      if (!U.findRecipeCategory(categorySelect.value)) {
        U.setFieldError(categoryField, 'Pilih kategori resep.');
        firstInvalid = firstInvalid || categorySelect;
        valid = false;
      }
      const cookTime = Number(cookTimeInput.value);
      if (!Number.isFinite(cookTime) || cookTime < 1 || cookTime > 600) {
        U.setFieldError(timeField, 'Isi waktu memasak antara 1 sampai 600 menit.');
        firstInvalid = firstInvalid || cookTimeInput;
        valid = false;
      }
      const servings = Number(servingsInput.value);
      if (!Number.isFinite(servings) || servings < 1 || servings > 50) {
        U.setFieldError(servingsField, 'Isi jumlah porsi antara 1 sampai 50.');
        firstInvalid = firstInvalid || servingsInput;
        valid = false;
      }
      if (noteInput.value.length > 500) {
        U.setFieldError(noteField, 'Catatan maksimal 500 karakter.');
        firstInvalid = firstInvalid || noteInput;
        valid = false;
      }

      const ingredients = [];
      const ingredientRows = Array.from(ingredientList.querySelectorAll('.ingredient-row'));
      let hasAnyIngredientInput = false;
      let hasIncompleteIngredient = false;
      for (const row of ingredientRows) {
        const ingredientName = row.querySelector('.ing-name').value.trim();
        const amount = row.querySelector('.ing-amount').value.trim();
        const unit = row.querySelector('.ing-unit').value.trim();
        const category = row.querySelector('.ing-cat').value;
        if (!ingredientName && !amount && !unit) continue;
        hasAnyIngredientInput = true;
        if (!ingredientName || !amount) {
          row.classList.add('invalid');
          hasIncompleteIngredient = true;
          valid = false;
          firstInvalid = firstInvalid || row.querySelector(!ingredientName ? '.ing-name' : '.ing-amount');
          continue;
        }
        const id = row.dataset.id || undefined;
        ingredients.push({ id, name: ingredientName, amount, unit, category });
      }
      if (!ingredientRows.length || !hasAnyIngredientInput) {
        ingredientError.textContent = 'Tambahkan minimal satu bahan lengkap.';
        ingredientError.hidden = false;
        valid = false;
        firstInvalid = firstInvalid || ingredientList.querySelector('.ing-name') || addIngredientBtn;
      } else if (hasIncompleteIngredient) {
        ingredientError.textContent = 'Lengkapi nama dan jumlah bahan yang ditandai.';
        ingredientError.hidden = false;
        valid = false;
      }

      const steps = Array.from(stepList.querySelectorAll('.step-input'))
        .map((textarea) => textarea.value.trim())
        .filter(Boolean);
      if (!steps.length) {
        stepError.textContent = 'Tambahkan minimal satu langkah memasak.';
        stepError.hidden = false;
        valid = false;
        firstInvalid = firstInvalid || stepList.querySelector('.step-input') || addStepBtn;
      }

      if (!valid) {
        if (firstInvalid instanceof HTMLElement) firstInvalid.focus();
        return;
      }

      const payload = {
        name,
        category: categorySelect.value,
        cookTime,
        servings,
        note: noteInput.value.trim(),
        ingredients,
        steps
      };

      submitting = true;
      if (editing) {
        S.updateRecipe(recipe.id, payload);
        UI.toast('Resep berhasil diperbarui.', 'success');
      } else {
        S.addRecipe(payload);
        state.query = '';
        state.category = 'all';
        state.sort = 'name';
        UI.toast('Resep baru berhasil disimpan.', 'success');
      }
      UI.closeModal();
      Menuly.App.refresh();
    });

    const cancelBtn = UI.button({ label: 'Batal', variant: 'secondary', onClick: () => UI.closeModal() });
    const saveBtn = UI.button({
      label: editing ? 'Simpan perubahan' : 'Simpan resep',
      icon: 'check',
      variant: 'primary',
      type: 'submit',
      form: formId
    });

    UI.openModal({
      title: editing ? 'Edit resep' : 'Resep baru',
      subtitle: editing ? 'Perbarui bahan, langkah, dan detail resep.' : 'Simpan bahan dan cara memasak agar mudah dipakai lagi.',
      icon: editing ? 'pencil' : 'notebook-pen',
      size: 'lg',
      body: form,
      footer: [cancelBtn, saveBtn]
    });
  }

  function render(root) {
    const recipes = S.getRecipes();
    const header = UI.pageHeader({
      eyebrow: 'Menuly · Koleksi',
      title: 'Resep',
      actions: [
        UI.button({
          label: 'Resep baru',
          icon: 'plus',
          variant: 'primary',
          onClick: () => openRecipeForm(null)
        })
      ]
    });
    root.appendChild(header);

    const body = h('div', { class: 'page-body page-stack recipes-page' });

    const searchInput = h('input', {
      type: 'search',
      class: 'input',
      id: 'recipe-search',
      placeholder: 'Cari nama resep...',
      autocomplete: 'off',
      value: state.query,
      'aria-label': 'Cari resep berdasarkan nama'
    });
    const search = h('div', { class: 'search-field' },
      U.icon('search', 16),
      searchInput
    );

    const sortSelect = h('select', {
      class: 'input',
      id: 'recipe-sort',
      'aria-label': 'Urutkan resep'
    },
      U.option('name', 'Nama A–Z', state.sort === 'name'),
      U.option('time', 'Waktu tercepat', state.sort === 'time'),
      U.option('newest', 'Terbaru', state.sort === 'newest')
    );

    const toolbar = h('section', { class: 'panel recipes-toolbar-panel' },
      h('div', { class: 'recipes-toolbar' },
        search,
        h('div', { class: 'recipes-toolbar-right' },
          h('label', { class: 'sort-label', for: 'recipe-sort' }, U.icon('arrow-up-down', 14), 'Urutkan'),
          sortSelect
        )
      )
    );

    const countAll = new Map();
    recipes.forEach((recipe) => countAll.set(recipe.category, (countAll.get(recipe.category) || 0) + 1));
    const filterRow = h('div', { class: 'recipe-filter-row' });
    const chipHost = h('div', { class: 'filter-chips' });
    const chipButtons = [];
    const filterDefs = [{ id: 'all', label: 'Semua', count: recipes.length }].concat(
      U.RECIPE_CATEGORIES.map((category) => ({ id: category.id, label: category.label, count: countAll.get(category.id) || 0 }))
    );
    filterDefs.forEach((def) => {
      const chip = h('button', {
        type: 'button',
        class: `chip${state.category === def.id ? ' active' : ''}`,
        'aria-pressed': state.category === def.id ? 'true' : 'false',
        dataset: { category: def.id }
      },
        def.label,
        h('span', { class: 'chip-count' }, String(def.count))
      );
      chip.addEventListener('click', () => {
        if (state.category === def.id) return;
        state.category = def.id;
        chipButtons.forEach((button) => {
          const active = button.dataset.category === def.id;
          button.classList.toggle('active', active);
          button.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        renderGrid();
      });
      chipButtons.push(chip);
      chipHost.appendChild(chip);
    });
    const resultCount = h('p', { class: 'result-count' });
    filterRow.append(chipHost, resultCount);
    toolbar.appendChild(filterRow);
    body.appendChild(toolbar);

    const gridHost = h('div', { class: 'recipe-grid' });
    body.appendChild(gridHost);

    function filteredRecipes() {
      const query = state.query.trim().toLowerCase();
      let list = recipes.filter((recipe) => {
        const matchesQuery = !query || recipe.name.toLowerCase().includes(query);
        const matchesCategory = state.category === 'all' || recipe.category === state.category;
        return matchesQuery && matchesCategory;
      });
      list = [...list];
      if (state.sort === 'time') list.sort((a, b) => a.cookTime - b.cookTime || a.name.localeCompare(b.name, 'id'));
      else if (state.sort === 'newest') list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      else list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
      return list;
    }

    function renderGrid() {
      U.clear(gridHost);
      const list = filteredRecipes();
      resultCount.textContent = recipes.length
        ? `${list.length} dari ${recipes.length} resep ditampilkan`
        : 'Belum ada resep';
      if (!recipes.length) {
        gridHost.classList.add('is-empty');
        gridHost.appendChild(h('div', { class: 'panel' },
          UI.emptyState({
            icon: 'book-open',
            title: 'Koleksi resep Anda masih kosong',
            description: 'Simpan resep favorit lengkap dengan bahan, takaran, dan langkah memasaknya.',
            actionLabel: 'Buat resep pertama',
            actionIcon: 'plus',
            onAction: () => openRecipeForm(null)
          })
        ));
        return;
      }
      if (!list.length) {
        gridHost.classList.add('is-empty');
        gridHost.appendChild(h('div', { class: 'panel' },
          UI.emptyState({
            icon: 'search-x',
            title: 'Resep tidak ditemukan',
            description: 'Coba kata kunci lain atau tampilkan semua kategori resep.',
            actionLabel: 'Reset filter',
            actionIcon: 'rotate-ccw',
            actionVariant: 'secondary',
            onAction: resetFilters
          })
        ));
        return;
      }
      gridHost.classList.remove('is-empty');
      list.forEach((recipe) => gridHost.appendChild(buildRecipeCard(recipe)));
      UI.refreshIcons();
    }

    searchInput.addEventListener('input', () => {
      state.query = searchInput.value;
      renderGrid();
    });
    sortSelect.addEventListener('change', () => {
      state.sort = sortSelect.value;
      renderGrid();
    });

    renderGrid();
    root.appendChild(body);
    UI.refreshIcons();
  }

  Menuly.Recipes = {
    render,
    openRecipeForm,
    openRecipeDetail
  };
})();
