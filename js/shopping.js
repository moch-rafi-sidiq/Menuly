/* Menuly — shopping list: manual items, recipe import, filters, and duplicates. */
(function () {
  'use strict';

  const Menuly = window.Menuly;
  const U = Menuly.Utils;
  const S = Menuly.Storage;
  const UI = Menuly.UI;
  const h = U.h;

  const state = {
    filter: 'all',
    category: 'all',
    query: ''
  };

  function sourceLabel(item) {
    return item.sourceName ? `Dari ${item.sourceName}` : 'Ditambahkan manual';
  }

  function openDeleteDialog(item) {
    UI.confirm({
      title: 'Hapus item belanja?',
      message: `"${item.name}" (${U.formatQuantity(item.amount, item.unit)}) akan dihapus dari daftar belanja.`,
      detail: 'Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Hapus item',
      cancelLabel: 'Batal',
      tone: 'danger',
      icon: 'trash-2'
    }).then((approved) => {
      if (!approved) return;
      S.deleteShoppingItem(item.id);
      UI.toast('Item belanja berhasil dihapus.', 'success');
      Menuly.App.refresh();
    });
  }

  function openClearPurchasedDialog() {
    const purchased = S.getShopping().filter((item) => item.done);
    if (!purchased.length) {
      UI.toast('Tidak ada item yang sudah dibeli untuk dibersihkan.', 'info');
      return;
    }
    UI.confirm({
      title: 'Bersihkan item terbeli?',
      message: `${purchased.length} item yang sudah dibeli akan dihapus dari daftar belanja.`,
      detail: 'Item yang belum dibeli tetap dipertahankan.',
      confirmLabel: 'Hapus item terbeli',
      cancelLabel: 'Batal',
      tone: 'danger',
      icon: 'eraser',
      confirmIcon: 'trash-2'
    }).then((approved) => {
      if (!approved) return;
      const removed = S.deletePurchasedItems();
      UI.toast(`${removed} item berhasil dibersihkan.`, 'success');
      Menuly.App.refresh();
    });
  }

  function openItemForm(item) {
    const editing = Boolean(item && item.id);
    const formId = 'shopping-item-form';
    const nameInput = h('input', {
      type: 'text',
      class: 'input',
      id: 'shop-name',
      maxlength: '120',
      autocomplete: 'off',
      placeholder: 'Contoh: Bawang merah',
      autofocus: true,
      value: editing ? item.name : (item ? item.name : '')
    });
    const nameField = U.createField('Nama bahan', nameInput, { required: true });

    const amountInput = h('input', {
      type: 'text',
      class: 'input',
      id: 'shop-amount',
      maxlength: '30',
      inputmode: 'decimal',
      autocomplete: 'off',
      placeholder: 'Contoh: 250',
      value: editing ? item.amount : (item && item.amount ? item.amount : '')
    });
    const amountField = U.createField('Jumlah', amountInput, { required: true, hint: 'Bisa berupa angka atau teks seperti "secukupnya".' });

    const unitInput = h('input', {
      type: 'text',
      class: 'input',
      id: 'shop-unit',
      maxlength: '30',
      list: 'shopping-unit-options',
      autocomplete: 'off',
      placeholder: 'Contoh: g',
      value: editing ? item.unit : (item && item.unit ? item.unit : '')
    });
    const unitField = U.createField('Satuan', unitInput, { hint: 'Bahan dengan satuan berbeda tidak digabung otomatis.' });

    const categorySelect = h('select', { class: 'input', id: 'shop-category' },
      U.INGREDIENT_CATEGORIES.map((category) => U.option(category.id, category.label, (editing ? item.category : (item && item.category) || 'sayur_buah') === category.id))
    );
    const categoryField = U.createField('Kategori bahan', categorySelect, { required: true });

    const doneInput = h('input', {
      type: 'checkbox',
      checked: editing ? Boolean(item.done) : Boolean(item && item.done)
    });
    const doneLine = h('label', { class: 'check-line' },
      doneInput,
      h('span', { class: 'check-box', 'aria-hidden': 'true' }),
      h('span', null, 'Tandai sebagai sudah dibeli')
    );

    const form = h('form', { id: formId, class: 'form-stack', novalidate: true },
      nameField.wrap,
      h('div', { class: 'form-grid' }, amountField.wrap, unitField.wrap),
      categoryField.wrap,
      h('div', { class: 'form-checkbox-field' }, doneLine),
      h('datalist', { id: 'shopping-unit-options' }, U.UNITS.map((unit) => h('option', { value: unit })))
    );

    const fields = [nameField, amountField, unitField, categoryField];
    fields.forEach((field) => {
      field.control.addEventListener('input', () => U.clearFieldError(field));
      field.control.addEventListener('change', () => U.clearFieldError(field));
    });

    let submitting = false;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (submitting) return;
      fields.forEach(U.clearFieldError);
      const name = nameInput.value.trim();
      const amount = amountInput.value.trim();
      const unit = unitInput.value.trim();
      let valid = true;
      if (!name) {
        U.setFieldError(nameField, 'Nama bahan wajib diisi.');
        nameInput.focus();
        valid = false;
      }
      if (!amount) {
        U.setFieldError(amountField, 'Jumlah bahan wajib diisi.');
        if (valid) amountInput.focus();
        valid = false;
      }
      if (!valid) return;

      const duplicate = S.findShoppingDuplicate(name, unit, editing ? item.id : null);
      if (duplicate) {
        if (editing) {
          U.setFieldError(nameField, 'Bahan dengan nama dan satuan ini sudah ada di daftar belanja.');
          nameInput.focus();
          return;
        }
        const draft = { name, amount, unit, category: categorySelect.value, done: doneInput.checked };
        submitting = true;
        UI.confirm({
          title: 'Bahan sudah ada',
          message: `${duplicate.name} (${U.formatQuantity(duplicate.amount, duplicate.unit)}) sudah ada di daftar belanja.`,
          detail: 'Tambahkan jumlahnya ke item yang sudah ada, atau batal untuk mengubah nama atau satuan.',
          confirmLabel: 'Tambah jumlah',
          cancelLabel: 'Batal',
          icon: 'layers',
          confirmIcon: 'plus',
          tone: 'primary'
        }).then((merge) => {
          if (!merge) {
            openItemForm(draft);
            return;
          }
          S.updateShoppingItem(duplicate.id, {
            amount: U.mergeAmounts(duplicate.amount, amount),
            done: duplicate.done && doneInput.checked,
            updatedAt: new Date().toISOString()
          });
          UI.toast('Jumlah bahan berhasil diperbarui.', 'success');
          Menuly.App.refresh();
        });
        return;
      }

      submitting = true;
      const payload = {
        name,
        amount,
        unit,
        category: categorySelect.value,
        done: doneInput.checked
      };
      if (editing) {
        S.updateShoppingItem(item.id, payload);
        UI.toast('Item belanja berhasil diperbarui.', 'success');
      } else {
        S.addShoppingItem(payload);
        UI.toast('Bahan berhasil ditambahkan ke daftar belanja.', 'success');
      }
      UI.closeModal();
      Menuly.App.refresh();
    });

    const cancelBtn = UI.button({ label: 'Batal', variant: 'secondary', onClick: () => UI.closeModal() });
    const saveBtn = UI.button({
      label: editing ? 'Simpan perubahan' : 'Tambah ke daftar',
      icon: 'check',
      variant: 'primary',
      type: 'submit',
      form: formId
    });

    UI.openModal({
      title: editing ? 'Edit item belanja' : 'Tambah item belanja',
      subtitle: editing ? 'Perbarui detail bahan belanja.' : 'Catat bahan yang perlu dibeli minggu ini.',
      icon: editing ? 'pencil' : 'shopping-basket',
      size: 'md',
      body: form,
      footer: [cancelBtn, saveBtn]
    });
  }

  function openImportModal(options) {
    const opts = options || {};
    const allRecipes = [...S.getRecipes()].sort((a, b) => a.name.localeCompare(b.name, 'id'));
    const recipeMap = new Map(allRecipes.map((recipe) => [recipe.id, recipe]));
    const today = U.todayISO();
    const endDate = U.toISO(U.addDays(today, 6));
    const meals = U.sortMeals(S.getMeals())
      .filter((meal) => meal.date >= today && meal.date <= endDate);

    let activeSource = 'recipes';
    const selectedRecipes = new Set((opts.recipeIds || []).filter((id) => recipeMap.has(id)));
    const selectedMeals = new Set();
    const excludedKeys = new Set();
    const duplicateActions = new Map();
    let lastPreview = [];

    const tabs = h('div', { class: 'segmented source-tabs', role: 'group', 'aria-label': 'Sumber bahan' });
    const recipeTab = h('button', {
      type: 'button',
      class: 'segment-btn active',
      'aria-pressed': 'true'
    }, U.icon('book-open', 14), `Dari resep (${allRecipes.length})`);
    const menuTab = h('button', {
      type: 'button',
      class: 'segment-btn',
      'aria-pressed': 'false'
    }, U.icon('calendar-days', 14), `Dari rencana menu (${meals.length})`);
    tabs.append(recipeTab, menuTab);

    function buildRecipePicker() {
      if (!allRecipes.length) {
        return h('div', { class: 'source-empty' },
          U.icon('book-open', 18),
          h('p', null, 'Belum ada resep tersimpan. Buat resep terlebih dahulu agar bahannya bisa diambil.')
        );
      }
      const list = h('div', { class: 'source-list' });
      allRecipes.forEach((recipe) => {
        const category = U.findRecipeCategory(recipe.category);
        const checkbox = h('input', {
          type: 'checkbox',
          checked: selectedRecipes.has(recipe.id),
          disabled: !recipe.ingredients.length,
          dataset: { recipeId: recipe.id }
        });
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) selectedRecipes.add(recipe.id);
          else selectedRecipes.delete(recipe.id);
          updatePreview();
        });
        list.appendChild(h('label', { class: `source-option${checkbox.disabled ? ' is-disabled' : ''}` },
          checkbox,
          h('span', { class: 'source-option-body' },
            h('span', { class: 'source-name' }, recipe.name),
            h('span', { class: 'source-meta' },
              category ? category.label : 'Resep',
              ` · ${recipe.ingredients.length} bahan`,
              checkbox.disabled ? ' · belum ada bahan' : ''
            )
          ),
          h('span', { class: `ingredient-cat-chip cat-${recipe.category}` }, U.icon(category ? category.icon : 'book-open', 12))
        ));
      });
      return list;
    }

    function buildMenuPicker() {
      if (!meals.length) {
        return h('div', { class: 'source-empty' },
          U.icon('calendar-days', 18),
          h('p', null, 'Belum ada rencana menu untuk 7 hari ke depan.')
        );
      }
      const list = h('div', { class: 'source-list' });
      meals.forEach((meal) => {
        const recipe = meal.recipeId ? recipeMap.get(meal.recipeId) : null;
        const type = U.findMealType(meal.mealType);
        const checkbox = h('input', {
          type: 'checkbox',
          checked: selectedMeals.has(meal.id),
          disabled: !recipe || !recipe.ingredients.length,
          dataset: { mealId: meal.id }
        });
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) selectedMeals.add(meal.id);
          else selectedMeals.delete(meal.id);
          updatePreview();
        });
        list.appendChild(h('label', { class: `source-option${checkbox.disabled ? ' is-disabled' : ''}` },
          checkbox,
          h('span', { class: 'source-option-body' },
            h('span', { class: 'source-name' }, meal.name),
            h('span', { class: 'source-meta' },
              `${U.formatDayShort(meal.date)}, ${U.formatDateCompact(meal.date)} · ${type ? type.label : 'Menu'}`,
              recipe ? ` · ${recipe.ingredients.length} bahan` : ' · resep tidak ditemukan'
            )
          ),
          h('span', { class: `ingredient-cat-chip cat-${meal.mealType}` }, U.icon(type ? type.icon : 'utensils', 12))
        ));
      });
      return list;
    }

    const recipePicker = buildRecipePicker();
    const menuPicker = buildMenuPicker();
    menuPicker.hidden = true;

    const pickerPanel = h('div', { class: 'source-picker' },
      h('div', { class: 'source-picker-head' },
        h('h3', null, 'Pilih sumber bahan'),
        h('p', null, 'Pilih satu atau beberapa resep untuk melihat seluruh bahannya.')
      ),
      recipePicker,
      menuPicker
    );

    const previewHost = h('div', { class: 'preview-host' });
    const body = h('div', { class: 'import-body' },
      h('p', { class: 'modal-lead' }, 'Ambil bahan dari resep atau menu yang sudah direncanakan. Periksa setiap bahan sebelum menambahkannya ke daftar belanja.'),
      tabs,
      pickerPanel,
      previewHost
    );

    const cancelBtn = UI.button({ label: 'Batal', variant: 'secondary', onClick: () => UI.closeModal() });
    const addBtn = UI.button({
      label: 'Pilih bahan',
      icon: 'plus',
      variant: 'primary',
      disabled: true,
      onClick: () => {
        const selected = lastPreview.filter((item) => !excludedKeys.has(item.key));
        if (!selected.length) return;
        let added = 0;
        let merged = 0;
        let skipped = 0;

        selected.forEach((item) => {
          const duplicate = S.findShoppingDuplicate(item.name, item.unit);
          if (duplicate) {
            const action = duplicateActions.get(item.key) || 'merge';
            if (action === 'skip') {
              skipped += 1;
              return;
            }
            const singleRecipeId = item.recipeIds.length === 1 ? Array.from(item.recipeIds)[0] : null;
            S.updateShoppingItem(duplicate.id, {
              amount: U.mergeAmounts(duplicate.amount, item.amount),
              done: false,
              sourceName: duplicate.sourceName || Array.from(item.sourceNames).join(', '),
              sourceRecipeId: duplicate.sourceRecipeId || singleRecipeId
            });
            merged += 1;
            return;
          }
          const sourceRecipeId = item.recipeIds.length === 1 ? Array.from(item.recipeIds)[0] : null;
          S.addShoppingItem({
            name: item.name,
            amount: item.amount,
            unit: item.unit,
            category: item.category,
            done: false,
            sourceRecipeId,
            sourceName: Array.from(item.sourceNames).join(', ')
          });
          added += 1;
        });

        const parts = [];
        if (added) parts.push(`${added} bahan ditambahkan`);
        if (merged) parts.push(`${merged} jumlah bahan diperbarui`);
        if (skipped) parts.push(`${skipped} item dilewati`);
        UI.closeModal();
        if (parts.length) UI.toast(`${parts.join(', ')}.`, 'success');
        else UI.toast('Tidak ada bahan yang ditambahkan.', 'info');
        Menuly.App.refresh();
      }
    });

    function updateFooter() {
      const selected = lastPreview.filter((item) => !excludedKeys.has(item.key));
      addBtn.disabled = selected.length === 0;
      const label = addBtn.querySelector('.btn-label');
      if (label) label.textContent = selected.length ? `Tambahkan ${selected.length} bahan` : 'Pilih bahan';
    }

    function gatherPreview() {
      const items = new Map();
      function addIngredient(ingredient, recipe) {
        if (!ingredient || !ingredient.name) return;
        const key = `${U.normalizeKey(ingredient.name)}|${U.normalizeKey(ingredient.unit)}`;
        let item = items.get(key);
        if (!item) {
          item = {
            key,
            name: ingredient.name,
            amount: String(ingredient.amount || ''),
            unit: ingredient.unit || '',
            category: ingredient.category || 'lainnya',
            sourceNames: new Set(),
            recipeIds: new Set()
          };
          items.set(key, item);
        } else {
          item.amount = U.mergeAmounts(item.amount, ingredient.amount);
        }
        if (recipe) {
          item.sourceNames.add(recipe.name);
          item.recipeIds.add(recipe.id);
        }
      }

      selectedRecipes.forEach((recipeId) => {
        const recipe = recipeMap.get(recipeId);
        if (!recipe) return;
        recipe.ingredients.forEach((ingredient) => addIngredient(ingredient, recipe));
      });
      selectedMeals.forEach((mealId) => {
        const meal = meals.find((entry) => entry.id === mealId);
        const recipe = meal && meal.recipeId ? recipeMap.get(meal.recipeId) : null;
        if (!recipe) return;
        recipe.ingredients.forEach((ingredient) => addIngredient(ingredient, recipe));
      });

      const categoryOrder = new Map(U.INGREDIENT_CATEGORIES.map((category, index) => [category.id, index]));
      return Array.from(items.values()).sort((a, b) => (
        (categoryOrder.get(a.category) ?? 99) - (categoryOrder.get(b.category) ?? 99) ||
        a.name.localeCompare(b.name, 'id')
      ));
    }

    function updatePreview() {
      lastPreview = gatherPreview();
      U.clear(previewHost);
      if (!lastPreview.length) {
        previewHost.appendChild(h('div', { class: 'preview-empty' },
          U.icon('list-plus', 18),
          h('p', null, selectedRecipes.size || selectedMeals.size
            ? 'Sumber yang dipilih belum memiliki bahan.'
            : 'Pilih resep atau menu untuk melihat daftar bahannya.')
        ));
        updateFooter();
        return;
      }

      const selectedCount = lastPreview.filter((item) => !excludedKeys.has(item.key)).length;
      const previewHead = h('div', { class: 'preview-head' },
        h('div', { class: 'preview-title' },
          h('h3', null, 'Bahan yang akan ditambahkan'),
          h('p', null, `${lastPreview.length} bahan ditemukan · ${selectedCount} dipilih`)
        )
      );
      const list = h('div', { class: 'preview-list' });
      lastPreview.forEach((item) => {
        const duplicate = S.findShoppingDuplicate(item.name, item.unit);
        const category = U.findIngredientCategory(item.category);
        const checked = !excludedKeys.has(item.key);
        const checkbox = h('input', {
          type: 'checkbox',
          checked
        });
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) excludedKeys.delete(item.key);
          else excludedKeys.add(item.key);
          updatePreview();
        });
        const row = h('div', { class: `preview-item${checked ? '' : ' is-excluded'}`, dataset: { key: item.key } },
          h('label', { class: 'check-line compact' },
            checkbox,
            h('span', { class: 'check-box', 'aria-hidden': 'true' })
          ),
          h('div', { class: 'preview-main' },
            h('span', { class: 'preview-name' }, item.name),
            h('span', { class: 'preview-meta' },
              h('span', { class: `category-inline cat-${item.category}` },
                U.icon(category ? category.icon : 'package', 11),
                category ? category.label : 'Lainnya'
              ),
              h('span', { class: 'source-note', title: Array.from(item.sourceNames).join(', ') },
                `Dari ${Array.from(item.sourceNames).join(', ')}`
              )
            ),
            duplicate ? h('div', { class: 'duplicate-control' },
              U.icon('alert-circle', 13),
              h('span', null, `Sudah ada (${U.formatQuantity(duplicate.amount, duplicate.unit)})`),
              h('select', {
                class: 'input select-compact',
                'aria-label': `Cara menangani duplikat ${item.name}`,
                value: duplicateActions.get(item.key) || 'merge',
                onChange: (event) => {
                  duplicateActions.set(item.key, event.target.value);
                  updateFooter();
                }
              },
                U.option('merge', 'Tambah jumlah', (duplicateActions.get(item.key) || 'merge') === 'merge'),
                U.option('skip', 'Lewati', duplicateActions.get(item.key) === 'skip')
              )
            ) : null
          ),
          h('span', { class: 'preview-qty' }, U.formatQuantity(item.amount, item.unit))
        );
        list.appendChild(row);
      });

      previewHost.append(previewHead, list);
      updateFooter();
      UI.refreshIcons();
    }

    recipeTab.addEventListener('click', () => {
      if (activeSource === 'recipes') return;
      activeSource = 'recipes';
      selectedMeals.clear();
      menuPicker.hidden = true;
      recipePicker.hidden = false;
      recipeTab.classList.add('active');
      menuTab.classList.remove('active');
      recipeTab.setAttribute('aria-pressed', 'true');
      menuTab.setAttribute('aria-pressed', 'false');
      updatePreview();
    });
    menuTab.addEventListener('click', () => {
      if (activeSource === 'menus') return;
      activeSource = 'menus';
      selectedRecipes.clear();
      recipePicker.hidden = true;
      menuPicker.hidden = false;
      menuTab.classList.add('active');
      recipeTab.classList.remove('active');
      menuTab.setAttribute('aria-pressed', 'true');
      recipeTab.setAttribute('aria-pressed', 'false');
      updatePreview();
    });

    UI.openModal({
      title: 'Ambil bahan ke daftar belanja',
      subtitle: 'Pilih dari resep atau rencana menu',
      icon: 'shopping-basket',
      size: 'lg',
      body,
      footer: [cancelBtn, addBtn]
    });

    updatePreview();
  }

  function render(root) {
    const header = UI.pageHeader({
      eyebrow: 'Menuly · Belanja',
      title: 'Daftar Belanja',
      actions: [
        UI.button({
          label: 'Dari resep',
          icon: 'book-open',
          variant: 'secondary',
          onClick: () => openImportModal()
        }),
        UI.button({
          label: 'Tambah item',
          icon: 'plus',
          variant: 'primary',
          onClick: () => openItemForm()
        })
      ]
    });
    root.appendChild(header);

    const body = h('div', { class: 'page-body page-stack shopping-page' });
    const items = S.getShopping();
    const unbought = items.filter((item) => !item.done);
    const purchased = items.filter((item) => item.done);

    if (!items.length) {
      const emptyActions = h('div', { class: 'empty-action-group' },
        UI.button({
          label: 'Tambah bahan',
          icon: 'plus',
          variant: 'primary',
          size: 'sm',
          onClick: () => openItemForm()
        }),
        UI.button({
          label: 'Ambil dari resep',
          icon: 'book-open',
          variant: 'secondary',
          size: 'sm',
          onClick: () => openImportModal()
        })
      );
      body.appendChild(h('div', { class: 'panel' },
        UI.emptyState({
          icon: 'shopping-basket',
          title: 'Daftar belanja masih kosong',
          description: 'Tambahkan bahan secara manual, atau pilih resep dan masukkan semua bahannya sekaligus.',
          action: emptyActions
        })
      ));
      root.appendChild(body);
      UI.refreshIcons();
      return;
    }

    const progress = items.length ? Math.round((purchased.length / items.length) * 100) : 0;
    const overview = h('section', { class: 'shopping-overview', 'aria-label': 'Ringkasan belanja' },
      h('div', { class: 'shop-stat' },
        h('span', { class: 'shop-stat-label' }, 'Total item'),
        h('strong', { class: 'shop-stat-value' }, String(items.length), h('small', null, 'item'))
      ),
      h('div', { class: 'shop-stat accent-amber' },
        h('span', { class: 'shop-stat-label' }, 'Belum dibeli'),
        h('strong', { class: 'shop-stat-value' }, String(unbought.length), h('small', null, 'item'))
      ),
      h('div', { class: 'shop-stat accent-green' },
        h('span', { class: 'shop-stat-label' }, 'Sudah dibeli'),
        h('strong', { class: 'shop-stat-value' }, String(purchased.length), h('small', null, 'item'))
      ),
      h('div', { class: 'shop-progress-cell' },
        h('div', { class: 'progress-copy' },
          h('span', null, 'Progres belanja'),
          h('strong', null, `${progress}%`)
        ),
        h('div', {
          class: 'progress-track',
          role: 'progressbar',
          'aria-valuemin': '0',
          'aria-valuemax': '100',
          'aria-valuenow': String(progress),
          'aria-label': 'Progres belanja'
        }, h('span', { class: 'progress-fill', style: { width: `${progress}%` } })),
        h('p', { class: 'shop-progress-note' }, purchased.length ? `${purchased.length} item selesai` : 'Belum ada item yang selesai')
      )
    );
    body.appendChild(overview);

    const controls = h('section', { class: 'panel shopping-controls' });
    const segmented = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Filter status belanja' });
    const filterDefs = [
      { id: 'all', label: 'Semua', count: items.length },
      { id: 'pending', label: 'Belum dibeli', count: unbought.length },
      { id: 'done', label: 'Sudah dibeli', count: purchased.length }
    ];
    const filterBtns = [];
    filterDefs.forEach((filter) => {
      const btn = h('button', {
        type: 'button',
        class: `segment-btn${state.filter === filter.id ? ' active' : ''}`,
        'aria-pressed': state.filter === filter.id ? 'true' : 'false',
        dataset: { filter: filter.id }
      },
        filter.label,
        h('span', { class: 'chip-count' }, String(filter.count))
      );
      btn.addEventListener('click', () => {
        if (state.filter === filter.id) return;
        state.filter = filter.id;
        filterBtns.forEach((item) => {
          const active = item.dataset.filter === filter.id;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        renderList();
      });
      filterBtns.push(btn);
      segmented.appendChild(btn);
    });

    const searchInput = h('input', {
      type: 'search',
      class: 'input',
      id: 'shopping-search',
      placeholder: 'Cari bahan...',
      value: state.query,
      autocomplete: 'off',
      'aria-label': 'Cari bahan belanja'
    });
    const search = h('div', { class: 'search-field compact-search' }, U.icon('search', 16), searchInput);
    const categorySelect = h('select', {
      class: 'input category-select',
      'aria-label': 'Filter kategori bahan'
    },
      U.option('all', 'Semua kategori', state.category === 'all'),
      U.INGREDIENT_CATEGORIES.map((category) => U.option(category.id, category.label, state.category === category.id))
    );
    controls.append(segmented, h('div', { class: 'shopping-controls-right' }, search, categorySelect));
    body.appendChild(controls);

    const listPanel = h('section', { class: 'panel shopping-list-panel' });
    const listHead = h('div', { class: 'shop-list-head' },
      h('div', { class: 'title-group' },
        h('h2', { class: 'panel-title' }, 'Bahan belanja'),
        h('p', { class: 'panel-sub' }, `${unbought.length} dari ${items.length} bahan belum dibeli`)
      ),
      h('div', { class: 'panel-actions' },
        UI.button({
          label: 'Bersihkan yang dibeli',
          icon: 'eraser',
          variant: 'ghost',
          size: 'sm',
          disabled: !purchased.length,
          className: 'clear-purchased',
          onClick: openClearPurchasedDialog
        })
      )
    );
    listPanel.appendChild(listHead);
    const listHost = h('div', { class: 'shop-list-host' });
    listPanel.appendChild(listHost);
    body.appendChild(listPanel);

    function resetListFilters() {
      state.filter = 'all';
      state.category = 'all';
      state.query = '';
      Menuly.App.refresh();
    }

    function renderList() {
      U.clear(listHost);
      const query = state.query.trim().toLowerCase();
      const filtered = items.filter((item) => {
        if (state.filter === 'pending' && item.done) return false;
        if (state.filter === 'done' && !item.done) return false;
        if (state.category !== 'all' && item.category !== state.category) return false;
        if (query && !item.name.toLowerCase().includes(query)) return false;
        return true;
      });

      if (!filtered.length) {
        listHost.appendChild(UI.emptyState({
          icon: 'search-x',
          title: 'Tidak ada bahan yang cocok',
          description: 'Ubah kata kunci atau filter untuk menampilkan item lainnya.',
          actionLabel: 'Reset filter',
          actionIcon: 'rotate-ccw',
          actionVariant: 'secondary',
          onAction: resetListFilters,
          compact: true
        }));
        return;
      }

      const groups = new Map();
      U.INGREDIENT_CATEGORIES.forEach((category) => groups.set(category.id, []));
      filtered.forEach((item) => {
        const key = groups.has(item.category) ? item.category : 'lainnya';
        groups.get(key).push(item);
      });

      U.INGREDIENT_CATEGORIES.forEach((category) => {
        const groupItems = groups.get(category.id) || [];
        if (!groupItems.length) return;
        const remaining = groupItems.filter((item) => !item.done).length;
        const group = h('div', { class: 'shop-group' },
          h('div', { class: 'shop-group-head' },
            h('span', { class: 'shop-group-icon' }, U.icon(category.icon, 13)),
            h('span', { class: 'shop-group-title' }, category.label),
            h('span', { class: 'shop-group-count' }, `${remaining}/${groupItems.length} tersisa`)
          )
        );
        groupItems
          .sort((a, b) => Number(a.done) - Number(b.done) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
          .forEach((item) => {
            const checkbox = h('input', {
              type: 'checkbox',
              checked: Boolean(item.done),
              'aria-label': `${item.done ? 'Batalkan status dibeli untuk' : 'Tandai sudah dibeli'} ${item.name}`
            });
            checkbox.addEventListener('change', () => {
              S.toggleShoppingItem(item.id);
              Menuly.App.refresh();
            });
            const row = h('div', { class: `shop-row${item.done ? ' is-done' : ''}`, dataset: { id: item.id } },
              h('label', { class: 'check-line' },
                checkbox,
                h('span', { class: 'check-box', 'aria-hidden': 'true' })
              ),
              h('div', { class: 'shop-info' },
                h('span', { class: 'shop-name' }, item.name),
                h('span', { class: 'shop-source' },
                  U.icon(item.sourceName ? 'book-open' : 'pencil', 10),
                  sourceLabel(item)
                )
              ),
              h('span', { class: 'shop-qty' }, U.formatQuantity(item.amount, item.unit)),
              h('div', { class: 'shop-actions' },
                UI.iconButton('pencil', `Edit ${item.name}`, () => openItemForm(item), { className: 'row-icon-btn', size: 14 }),
                UI.iconButton('trash-2', `Hapus ${item.name}`, () => openDeleteDialog(item), { className: 'row-icon-btn danger', size: 14 })
              )
            );
            group.appendChild(row);
          });
        listHost.appendChild(group);
      });
      UI.refreshIcons();
    }

    searchInput.addEventListener('input', () => {
      state.query = searchInput.value;
      renderList();
    });
    categorySelect.addEventListener('change', () => {
      state.category = categorySelect.value;
      renderList();
    });

    renderList();
    root.appendChild(body);
    UI.refreshIcons();
  }

  Menuly.Shopping = {
    render,
    openItemForm,
    openImportModal
  };
})();
