/* Menuly — dashboard summary page. */
(function () {
  'use strict';

  const Menuly = window.Menuly;
  const U = Menuly.Utils;
  const S = Menuly.Storage;
  const UI = Menuly.UI;
  const h = U.h;

  function openTodayMeal(date, mealType) {
    Menuly.Planner.openMealForm({ date, mealType });
  }

  function openRecipeForm() {
    Menuly.Recipes.openRecipeForm(null);
  }

  function statCard(options) {
    return h('article', { class: 'stat-card' },
      h('div', { class: 'stat-head' },
        h('span', { class: `stat-icon ${options.tone || 'tone-navy'}` }, U.icon(options.icon, 18)),
        h('span', { class: 'stat-kicker' }, options.label)
      ),
      h('div', { class: 'stat-value-row' },
        h('strong', { class: 'stat-value' }, String(options.value)),
        options.suffix ? h('span', { class: 'stat-suffix' }, options.suffix) : null
      ),
      h('p', { class: 'stat-meta' }, options.meta)
    );
  }

  function buildTodayPanel(todayMeals, today) {
    const byType = new Map();
    todayMeals.forEach((meal) => byType.set(meal.mealType, meal));
    const recipes = S.getRecipes();
    const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

    const panel = h('section', { class: 'panel dash-today-panel' });
    const head = h('div', { class: 'panel-header' },
      h('div', { class: 'title-group' },
        h('h2', { class: 'panel-title' }, 'Menu hari ini'),
        h('p', { class: 'panel-sub' }, U.formatLongDate(today))
      ),
      h('div', { class: 'panel-actions' },
        UI.linkButton('Kelola', 'arrow-right', () => {
          Menuly.Planner.focusDate(today);
          Menuly.App.go('planner');
        })
      )
    );
    panel.appendChild(head);

    if (!todayMeals.length) {
      const empty = UI.emptyState({
        icon: 'calendar-plus',
        title: 'Hari ini masih lapang',
        description: 'Belum ada menu yang direncanakan. Tambahkan satu menu untuk memulai hari.',
        actionLabel: 'Rencanakan menu',
        actionIcon: 'plus',
        actionVariant: 'primary',
        onAction: () => openTodayMeal(today, 'sarapan')
      });
      panel.appendChild(empty);
      return panel;
    }

    const list = h('div', { class: 'today-list' });
    U.MEAL_TYPES.forEach((type) => {
      const meal = byType.get(type.id) || null;
      const recipe = meal && meal.recipeId ? recipeMap.get(meal.recipeId) : null;
      const meta = meal
        ? (meal.note || (recipe ? `${recipe.ingredients.length} bahan · ${recipe.cookTime} menit` : 'Ditambahkan manual'))
        : 'Belum direncanakan';

      const action = meal
        ? UI.iconButton('pencil', `Edit ${type.label.toLowerCase()}`, () => Menuly.Planner.openMealForm(meal), { size: 15 })
        : h('button', {
          type: 'button',
          class: 'slot-add',
          onClick: () => openTodayMeal(today, type.id)
        }, U.icon('plus', 13), 'Tambah');

      const row = h('div', { class: `today-slot${meal ? ' has-meal' : ' is-empty'}` },
        h('span', { class: `slot-icon type-${type.id}` }, U.icon(type.icon, 17)),
        h('div', { class: 'slot-body' },
          h('span', { class: 'slot-kicker' },
            h('span', { class: `type-dot type-${type.id}` }),
            `${type.label} · ${type.time}`
          ),
          h('span', { class: 'slot-name', title: meal ? meal.name : null }, meal ? meal.name : 'Belum direncanakan'),
          h('span', { class: `slot-meta${meal && meal.note ? ' has-note' : ''}`, title: meta }, meta)
        ),
        h('div', { class: 'slot-action' }, action)
      );
      list.appendChild(row);
    });
    panel.appendChild(list);
    return panel;
  }

  function buildWeekPanel(weekDays, meals, settings) {
    const weekStart = weekDays[0];
    const today = U.todayISO();
    const now = U.parseISO(today);
    const byDate = new Map();
    meals.forEach((meal) => {
      if (!byDate.has(meal.date)) byDate.set(meal.date, []);
      byDate.get(meal.date).push(meal);
    });

    const panel = h('section', { class: 'panel dash-week-panel' });
    panel.appendChild(h('div', { class: 'panel-header' },
      h('div', { class: 'title-group' },
        h('h2', { class: 'panel-title' }, 'Rencana minggu ini'),
        h('p', { class: 'panel-sub' }, U.formatWeekRange(weekStart))
      ),
      h('div', { class: 'panel-actions' },
        UI.linkButton('Kalender', 'arrow-up-right', () => {
          Menuly.Planner.focusDate(today);
          Menuly.App.go('planner');
        })
      )
    ));

    const tiles = h('div', { class: 'week-tiles' });
    weekDays.forEach((dateISO) => {
      const date = U.parseISO(dateISO);
      const dayMeals = byDate.get(dateISO) || [];
      const types = new Set(dayMeals.map((meal) => meal.mealType));
      const tile = h('button', {
        type: 'button',
        class: `week-tile${dateISO === today ? ' is-today' : ''}`,
        title: `${U.formatDayLong(date)}, ${U.formatDateShort(date)} — ${dayMeals.length} menu`,
        'aria-label': `Buka rencana menu ${U.formatDayLong(date)}, ${U.formatDateShort(date)}`,
        onClick: () => {
          Menuly.Planner.focusDate(dateISO);
          Menuly.App.go('planner');
        }
      },
        h('span', { class: 'week-tile-day' }, U.formatDayShort(date)),
        h('span', { class: 'week-tile-date' }, String(date.getDate())),
        h('span', { class: 'week-tile-dots', 'aria-hidden': 'true' },
          U.MEAL_TYPES.map((type) => h('span', { class: `tile-dot${types.has(type.id) ? ` on type-${type.id}` : ''}` }))
        ),
        h('span', { class: 'week-tile-count' }, dayMeals.length ? `${dayMeals.length} menu` : 'Kosong')
      );
      tiles.appendChild(tile);
    });
    panel.appendChild(tiles);

    const upcoming = U.sortMeals(meals.filter((meal) => (
      meal.date >= today && U.parseISO(meal.date) >= now
    ))).slice(0, 3);

    if (upcoming.length) {
      const agenda = h('div', { class: 'week-agenda' },
        h('p', { class: 'agenda-label' }, 'Menu berikutnya')
      );
      upcoming.forEach((meal) => {
        const type = U.findMealType(meal.mealType);
        const date = U.parseISO(meal.date);
        const row = h('button', {
          type: 'button',
          class: 'agenda-row',
          onClick: () => Menuly.Planner.openMealForm(meal)
        },
          h('span', { class: `agenda-dot type-${meal.mealType}` }),
          h('span', { class: 'agenda-copy' },
            h('strong', null, meal.name),
            h('small', null, `${type ? type.label : 'Menu'} · ${U.formatDayShort(date)}, ${U.formatDateCompact(date)}`)
          ),
          U.icon('chevron-right', 14)
        );
        agenda.appendChild(row);
      });
      panel.appendChild(agenda);
    } else {
      panel.appendChild(h('div', { class: 'agenda-empty' },
        U.icon('calendar-check', 15),
        'Tidak ada menu tersisa untuk minggu ini.'
      ));
    }
    return panel;
  }

  function buildShoppingPanel(shopping) {
    const unbought = shopping.filter((item) => !item.done);
    const done = shopping.length - unbought.length;
    const percent = shopping.length ? Math.round((done / shopping.length) * 100) : 0;

    const panel = h('section', { class: 'panel dash-shopping-panel' });
    panel.appendChild(h('div', { class: 'panel-header' },
      h('div', { class: 'title-group' },
        h('h2', { class: 'panel-title' }, 'Daftar belanja'),
        h('p', { class: 'panel-sub' }, unbought.length ? `${unbought.length} bahan masih perlu dibeli` : 'Belanjaan minggu ini')
      ),
      h('div', { class: 'panel-actions' },
        UI.linkButton('Buka', 'arrow-right', () => Menuly.App.go('shopping'))
      )
    ));

    if (!shopping.length) {
      panel.appendChild(UI.emptyState({
        icon: 'shopping-basket',
        title: 'Daftar belanja kosong',
        description: 'Tambahkan bahan sendiri atau ambil langsung dari bahan resep yang sudah disimpan.',
        actionLabel: 'Tambah bahan',
        actionIcon: 'plus',
        actionVariant: 'primary',
        onAction: () => Menuly.Shopping.openItemForm()
      }));
      return panel;
    }

    const progress = h('div', { class: 'shop-preview-progress' },
      h('div', { class: 'progress-copy' },
        h('span', null, `${done} dari ${shopping.length} bahan sudah dibeli`),
        h('strong', null, `${percent}%`)
      ),
      h('div', { class: 'progress-track' },
        h('span', { class: 'progress-fill', style: { width: `${percent}%` } })
      )
    );
    panel.appendChild(progress);

    if (unbought.length) {
      const list = h('div', { class: 'mini-shop-list' });
      unbought.slice(0, 5).forEach((item) => {
        const checkbox = h('input', {
          type: 'checkbox',
          class: 'mini-checkbox',
          'aria-label': `Tandai ${item.name} sudah dibeli`,
          onChange: () => {
            S.toggleShoppingItem(item.id);
            Menuly.App.refresh();
          }
        });
        list.appendChild(h('label', { class: 'mini-shop-row' },
          checkbox,
          h('span', { class: 'mini-shop-name', title: item.name }, item.name),
          h('span', { class: 'mini-shop-qty' }, U.formatQuantity(item.amount, item.unit))
        ));
      });
      panel.appendChild(list);
      if (unbought.length > 5) {
        panel.appendChild(h('p', { class: 'mini-shop-more' }, `+${unbought.length - 5} bahan lainnya`));
      }
      panel.appendChild(h('div', { class: 'panel-footer dash-shopping-footer' },
        UI.button({
          label: 'Kelola daftar belanja',
          icon: 'arrow-right',
          variant: 'secondary',
          size: 'sm',
          onClick: () => Menuly.App.go('shopping')
        })
      ));
    } else {
      panel.appendChild(h('div', { class: 'shopping-done-state' },
        h('span', { class: 'done-icon' }, U.icon('check', 18)),
        h('div', null,
          h('strong', null, 'Semua bahan sudah dibeli'),
          h('p', null, 'Daftar belanja siap dibersihkan.')
        )
      ));
    }
    return panel;
  }

  function buildQuickActions(today) {
    const panel = h('section', { class: 'panel quick-panel' });
    panel.appendChild(h('div', { class: 'panel-header' },
      h('div', { class: 'title-group' },
        h('h2', { class: 'panel-title' }, 'Aksi cepat'),
        h('p', { class: 'panel-sub' }, 'Lanjutkan pekerjaan dapur Anda')
      )
    ));

    const actions = [
      {
        icon: 'calendar-plus',
        tone: 'tone-navy',
        title: 'Tambah rencana menu',
        desc: 'Atur menu hari ini atau minggu ini',
        onClick: () => Menuly.Planner.openMealForm({ date: today, mealType: 'sarapan' })
      },
      {
        icon: 'notebook-pen',
        tone: 'tone-green',
        title: 'Buat resep baru',
        desc: 'Simpan bahan dan cara memasak',
        onClick: openRecipeForm
      },
      {
        icon: 'shopping-basket',
        tone: 'tone-amber',
        title: 'Kelola daftar belanja',
        desc: 'Centang bahan yang sudah dibeli',
        onClick: () => Menuly.App.go('shopping')
      }
    ];

    const list = h('div', { class: 'quick-actions' });
    actions.forEach((action) => {
      list.appendChild(h('button', { type: 'button', class: 'quick-action', onClick: action.onClick },
        h('span', { class: `qa-icon ${action.tone}` }, U.icon(action.icon, 17)),
        h('span', { class: 'qa-copy' },
          h('strong', null, action.title),
          h('small', null, action.desc)
        ),
        U.icon('chevron-right', 15)
      ));
    });
    panel.appendChild(list);
    panel.appendChild(h('div', { class: 'quick-tip' },
      U.icon('lightbulb', 15),
      h('span', null, 'Rencanakan satu minggu sekaligus agar daftar belanja lebih efisien.')
    ));
    return panel;
  }

  function render(root) {
    const settings = S.getSettings();
    const meals = S.getMeals();
    const recipes = S.getRecipes();
    const shopping = S.getShopping();
    const today = U.todayISO();
    const todayMeals = meals.filter((meal) => meal.date === today);
    const weekStart = U.startOfWeek(U.parseISO(today), settings.firstDayOfWeek);
    const weekDays = U.getWeekDays(weekStart, settings.firstDayOfWeek);
    const weekMeals = meals.filter((meal) => weekDays.includes(meal.date));
    const unbought = shopping.filter((item) => !item.done);
    const activeDays = new Set(weekMeals.map((meal) => meal.date)).size;
    const name = settings.userName.trim();
    const greeting = U.getGreeting();

    const header = UI.pageHeader({
      eyebrow: 'Menuly · Ringkasan',
      title: 'Dashboard',
      actions: [
        UI.button({
          label: 'Tambah menu',
          icon: 'plus',
          variant: 'primary',
          onClick: () => Menuly.Planner.openMealForm({ date: today, mealType: 'sarapan' })
        })
      ]
    });
    root.appendChild(header);

    const body = h('div', { class: 'page-body page-stack dashboard-page' });

    const heroSub = todayMeals.length
      ? `${todayMeals.length} menu sudah direncanakan hari ini${unbought.length ? ` dan ${unbought.length} bahan masih menunggu dibeli.` : ', semua bahan sudah siap.'}`
      : 'Belum ada menu untuk hari ini. Yuk susun rencana makan agar hari lebih teratur.';

    const hero = h('section', { class: 'dash-hero' },
      h('div', null,
        h('h2', { class: 'hero-title' },
          name ? `${greeting}, ${name}` : greeting,
          h('span', { class: 'hero-accent' }, '.')
        ),
        h('p', { class: 'hero-sub' }, heroSub)
      ),
      h('span', { class: 'hero-badge' },
        U.icon('sprout', 14),
        activeDays ? `${activeDays} hari terisi minggu ini` : 'Minggu ini masih kosong'
      )
    );
    body.appendChild(hero);

    if (!meals.length && !recipes.length && !shopping.length) {
      const onboarding = h('section', { class: 'onboarding' },
        h('span', { class: 'onboarding-icon' }, U.icon('sparkles', 23)),
        h('div', { class: 'onboarding-copy' },
          h('p', { class: 'onboarding-kicker' }, 'Mulai dari sini'),
          h('h2', null, 'Rencana makan pertama Anda menanti.'),
          h('p', null, 'Simpan resep favorit, susun menu mingguan, lalu biarkan daftar belanja terbentuk otomatis.')
        ),
        h('div', { class: 'onboarding-actions' },
          UI.button({
            label: 'Buat resep pertama',
            icon: 'notebook-pen',
            variant: 'secondary',
            className: 'btn-on-dark',
            onClick: openRecipeForm
          }),
          UI.button({
            label: 'Tambah rencana',
            icon: 'plus',
            variant: 'ghost',
            className: 'btn-outline-light',
            onClick: () => Menuly.Planner.openMealForm({ date: today, mealType: 'sarapan' })
          })
        )
      );
      body.appendChild(onboarding);
    }

    const stats = h('section', { class: 'stats-grid', 'aria-label': 'Ringkasan data' },
      statCard({
        icon: 'utensils',
        tone: 'tone-navy',
        label: 'Menu hari ini',
        value: todayMeals.length,
        suffix: '/ 4',
        meta: todayMeals.length === 4 ? 'Semua waktu makan terisi' : `${4 - todayMeals.length} slot masih kosong`
      }),
      statCard({
        icon: 'book-open',
        tone: 'tone-green',
        label: 'Resep tersimpan',
        value: recipes.length,
        meta: recipes.length ? 'Siap dipakai kapan saja' : 'Belum ada koleksi resep'
      }),
      statCard({
        icon: 'shopping-basket',
        tone: 'tone-amber',
        label: 'Bahan belum dibeli',
        value: unbought.length,
        meta: shopping.length ? `Dari ${shopping.length} item belanja` : 'Daftar belanja masih kosong'
      }),
      statCard({
        icon: 'calendar-days',
        tone: 'tone-blue',
        label: 'Menu minggu ini',
        value: weekMeals.length,
        meta: activeDays ? `${activeDays} hari sudah terisi` : 'Belum ada rencana mingguan'
      })
    );
    body.appendChild(stats);

    const firstGrid = h('div', { class: 'dash-grid' },
      buildTodayPanel(todayMeals, today),
      buildWeekPanel(weekDays, weekMeals, settings)
    );
    body.appendChild(firstGrid);

    const secondGrid = h('div', { class: 'dash-grid' },
      buildShoppingPanel(shopping),
      buildQuickActions(today)
    );
    body.appendChild(secondGrid);

    root.appendChild(body);
    UI.refreshIcons();
  }

  Menuly.Dashboard = { render };
})();
