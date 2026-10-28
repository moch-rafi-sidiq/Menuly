/* Menuly — LocalStorage persistence and data validation. */
(function () {
  'use strict';

  const Menuly = window.Menuly;
  const U = Menuly.Utils;

  const KEYS = {
    meals: 'menuly_meals',
    recipes: 'menuly_recipes',
    shopping: 'menuly_shopping',
    settings: 'menuly_settings',
    meta: 'menuly_meta'
  };

  const DEFAULT_SETTINGS = {
    userName: '',
    firstDayOfWeek: 'monday'
  };

  const MEAL_IDS = new Set(U.MEAL_TYPES.map((type) => type.id));
  const RECIPE_CATEGORY_IDS = new Set(U.RECIPE_CATEGORIES.map((category) => category.id));
  const INGREDIENT_CATEGORY_IDS = new Set(U.INGREDIENT_CATEGORIES.map((category) => category.id));

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function text(value, maxLength) {
    return String(value == null ? '' : value).trim().slice(0, maxLength || 10000);
  }

  function normalizeSettings(raw) {
    const settings = isPlainObject(raw) ? raw : {};
    return {
      userName: text(settings.userName, 80),
      firstDayOfWeek: settings.firstDayOfWeek === 'sunday' ? 'sunday' : 'monday'
    };
  }

  function normalizeDateOrNull(value) {
    return U.isValidISO(value) ? value : null;
  }

  function readJSON(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`Menuly: data "${key}" tidak dapat dibaca.`, error);
      return fallback;
    }
  }

  function readArray(key) {
    const data = readJSON(key, []);
    return Array.isArray(data) ? data.filter(isPlainObject) : [];
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Menuly: gagal menyimpan data.', error);
      window.dispatchEvent(new CustomEvent('menuly:storage-error', {
        detail: {
          message: 'Data gagal disimpan. Penyimpanan browser mungkin penuh atau dinonaktifkan.'
        }
      }));
      return false;
    }
  }

  function getMeals() {
    return readArray(KEYS.meals);
  }

  function getRecipes() {
    return readArray(KEYS.recipes);
  }

  function getShopping() {
    return readArray(KEYS.shopping);
  }

  function getSettings() {
    return normalizeSettings(readJSON(KEYS.settings, DEFAULT_SETTINGS));
  }

  function saveMeals(meals) {
    return writeJSON(KEYS.meals, Array.isArray(meals) ? meals : []);
  }

  function saveRecipes(recipes) {
    return writeJSON(KEYS.recipes, Array.isArray(recipes) ? recipes : []);
  }

  function saveShopping(items) {
    return writeJSON(KEYS.shopping, Array.isArray(items) ? items : []);
  }

  function saveSettings(patch) {
    const next = normalizeSettings(Object.assign({}, getSettings(), patch || {}));
    writeJSON(KEYS.settings, next);
    return next;
  }

  function addMeal(data) {
    const meals = getMeals();
    const now = new Date().toISOString();
    const meal = {
      id: U.uid('meal'),
      name: text(data.name, 120),
      date: data.date,
      mealType: data.mealType,
      recipeId: data.recipeId || null,
      note: text(data.note, 500),
      createdAt: now,
      updatedAt: now
    };
    meals.push(meal);
    saveMeals(meals);
    return meal;
  }

  function updateMeal(id, data) {
    const meals = getMeals();
    const index = meals.findIndex((meal) => meal.id === id);
    if (index === -1) return null;
    const current = meals[index];
    const next = Object.assign({}, current, {
      name: data.name !== undefined ? text(data.name, 120) : current.name,
      date: data.date !== undefined ? data.date : current.date,
      mealType: data.mealType !== undefined ? data.mealType : current.mealType,
      recipeId: data.recipeId !== undefined ? (data.recipeId || null) : current.recipeId,
      note: data.note !== undefined ? text(data.note, 500) : current.note,
      updatedAt: new Date().toISOString()
    });
    meals[index] = next;
    saveMeals(meals);
    return next;
  }

  function deleteMeal(id) {
    const meals = getMeals();
    const next = meals.filter((meal) => meal.id !== id);
    if (next.length === meals.length) return false;
    saveMeals(next);
    return true;
  }

  function findMealAtSlot(date, mealType, excludeId) {
    return getMeals().find((meal) => (
      meal.date === date &&
      meal.mealType === mealType &&
      meal.id !== excludeId
    )) || null;
  }

  function addRecipe(data) {
    const recipes = getRecipes();
    const now = new Date().toISOString();
    const recipe = {
      id: U.uid('recipe'),
      name: text(data.name, 120),
      category: data.category,
      ingredients: (data.ingredients || []).map((ingredient) => ({
        id: ingredient.id || U.uid('ing'),
        name: text(ingredient.name, 100),
        amount: text(ingredient.amount, 30),
        unit: text(ingredient.unit, 30),
        category: INGREDIENT_CATEGORY_IDS.has(ingredient.category) ? ingredient.category : 'lainnya'
      })),
      steps: (data.steps || []).map((step) => text(step, 1000)).filter(Boolean),
      cookTime: Math.max(0, Number(data.cookTime) || 0),
      servings: Math.max(1, Number(data.servings) || 1),
      note: text(data.note, 500),
      createdAt: now,
      updatedAt: now
    };
    recipes.push(recipe);
    saveRecipes(recipes);
    return recipe;
  }

  function updateRecipe(id, data) {
    const recipes = getRecipes();
    const index = recipes.findIndex((recipe) => recipe.id === id);
    if (index === -1) return null;
    const current = recipes[index];
    const next = Object.assign({}, current, {
      name: text(data.name, 120),
      category: data.category,
      ingredients: (data.ingredients || []).map((ingredient) => ({
        id: ingredient.id || U.uid('ing'),
        name: text(ingredient.name, 100),
        amount: text(ingredient.amount, 30),
        unit: text(ingredient.unit, 30),
        category: INGREDIENT_CATEGORY_IDS.has(ingredient.category) ? ingredient.category : 'lainnya'
      })),
      steps: (data.steps || []).map((step) => text(step, 1000)).filter(Boolean),
      cookTime: Math.max(0, Number(data.cookTime) || 0),
      servings: Math.max(1, Number(data.servings) || 1),
      note: text(data.note, 500),
      updatedAt: new Date().toISOString()
    });
    recipes[index] = next;
    saveRecipes(recipes);
    return next;
  }

  function deleteRecipe(id) {
    const recipes = getRecipes();
    const nextRecipes = recipes.filter((recipe) => recipe.id !== id);
    if (nextRecipes.length === recipes.length) return false;
    saveRecipes(nextRecipes);

    const meals = getMeals().map((meal) => (
      meal.recipeId === id ? Object.assign({}, meal, { recipeId: null }) : meal
    ));
    saveMeals(meals);

    const shopping = getShopping().map((item) => (
      item.sourceRecipeId === id ? Object.assign({}, item, { sourceRecipeId: null }) : item
    ));
    saveShopping(shopping);
    return true;
  }

  function addShoppingItem(data) {
    const items = getShopping();
    const now = new Date().toISOString();
    const item = {
      id: U.uid('shop'),
      name: text(data.name, 120),
      amount: text(data.amount, 30),
      unit: text(data.unit, 30),
      category: INGREDIENT_CATEGORY_IDS.has(data.category) ? data.category : 'lainnya',
      done: Boolean(data.done),
      sourceRecipeId: data.sourceRecipeId || null,
      sourceName: text(data.sourceName, 180),
      createdAt: now,
      updatedAt: now
    };
    items.push(item);
    saveShopping(items);
    return item;
  }

  function updateShoppingItem(id, data) {
    const items = getShopping();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const current = items[index];
    const next = Object.assign({}, current, {
      name: data.name !== undefined ? text(data.name, 120) : current.name,
      amount: data.amount !== undefined ? text(data.amount, 30) : current.amount,
      unit: data.unit !== undefined ? text(data.unit, 30) : current.unit,
      category: data.category !== undefined
        ? (INGREDIENT_CATEGORY_IDS.has(data.category) ? data.category : 'lainnya')
        : current.category,
      done: data.done !== undefined ? Boolean(data.done) : current.done,
      sourceRecipeId: data.sourceRecipeId !== undefined ? data.sourceRecipeId : current.sourceRecipeId,
      sourceName: data.sourceName !== undefined ? text(data.sourceName, 180) : current.sourceName,
      updatedAt: new Date().toISOString()
    });
    items[index] = next;
    saveShopping(items);
    return next;
  }

  function deleteShoppingItem(id) {
    const items = getShopping();
    const next = items.filter((item) => item.id !== id);
    if (next.length === items.length) return false;
    saveShopping(next);
    return true;
  }

  function toggleShoppingItem(id) {
    const item = getShopping().find((entry) => entry.id === id);
    if (!item) return null;
    return updateShoppingItem(id, { done: !item.done });
  }

  function deletePurchasedItems() {
    const items = getShopping();
    const next = items.filter((item) => !item.done);
    const removed = items.length - next.length;
    if (removed > 0) saveShopping(next);
    return removed;
  }

  function findShoppingDuplicate(name, unit, excludeId) {
    const nameKey = U.normalizeKey(name);
    const unitKey = U.normalizeKey(unit);
    return getShopping().find((item) => (
      item.id !== excludeId &&
      U.normalizeKey(item.name) === nameKey &&
      U.normalizeKey(item.unit) === unitKey
    )) || null;
  }

  function exportBackup() {
    return {
      app: 'Menuly',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        meals: getMeals(),
        recipes: getRecipes(),
        shopping: getShopping(),
        settings: getSettings()
      }
    };
  }

  function makeIdFactory(prefix) {
    const used = new Set();
    return function nextId(candidate) {
      let id = typeof candidate === 'string' ? candidate.trim() : '';
      if (!id || used.has(id)) id = U.uid(prefix);
      let attempt = 0;
      while (used.has(id)) {
        id = U.uid(prefix);
        attempt += 1;
        if (attempt > 20) break;
      }
      used.add(id);
      return id;
    };
  }

  function validateBackup(raw) {
    if (!isPlainObject(raw)) {
      throw new Error('Struktur file tidak dikenali. File harus berisi objek JSON hasil ekspor Menuly.');
    }
    const data = isPlainObject(raw.data) ? raw.data : raw;
    if (!isPlainObject(data)) {
      throw new Error('Struktur file tidak dikenali. Objek "data" tidak ditemukan.');
    }
    if (!Array.isArray(data.meals) || !Array.isArray(data.recipes) || !Array.isArray(data.shopping)) {
      throw new Error('File harus memuat array "meals", "recipes", dan "shopping".');
    }

    const recipeIds = new Set();
    const recipes = data.recipes.map((recipe, index) => {
      const label = `Resep ke-${index + 1}`;
      if (!isPlainObject(recipe)) throw new Error(`${label}: format tidak valid.`);
      const name = text(recipe.name, 120);
      if (!name) throw new Error(`${label}: nama resep wajib diisi.`);
      if (!RECIPE_CATEGORY_IDS.has(recipe.category)) {
        throw new Error(`${label}: kategori resep tidak dikenal.`);
      }
      if (!Array.isArray(recipe.ingredients)) {
        throw new Error(`${label}: daftar bahan harus berupa array.`);
      }
      if (!Array.isArray(recipe.steps)) {
        throw new Error(`${label}: langkah memasak harus berupa array.`);
      }
      const ingredientId = makeIdFactory('ing');
      const ingredients = recipe.ingredients.map((ingredient, ingredientIndex) => {
        if (!isPlainObject(ingredient)) {
          throw new Error(`${label}: bahan ke-${ingredientIndex + 1} tidak valid.`);
        }
        const ingredientName = text(ingredient.name, 100);
        const amount = text(ingredient.amount, 30);
        if (!ingredientName) {
          throw new Error(`${label}: nama bahan ke-${ingredientIndex + 1} wajib diisi.`);
        }
        if (!amount) {
          throw new Error(`${label}: jumlah bahan "${ingredientName}" wajib diisi.`);
        }
        return {
          id: ingredientId(ingredient.id),
          name: ingredientName,
          amount,
          unit: text(ingredient.unit, 30),
          category: INGREDIENT_CATEGORY_IDS.has(ingredient.category) ? ingredient.category : 'lainnya'
        };
      });
      const steps = recipe.steps
        .map((step) => text(step, 1000))
        .filter(Boolean);
      if (!steps.length) throw new Error(`${label}: minimal satu langkah memasak diperlukan.`);
      let id = typeof recipe.id === 'string' ? recipe.id.trim() : '';
      if (!id || recipeIds.has(id)) id = U.uid('recipe');
      recipeIds.add(id);
      return {
        id,
        name,
        category: recipe.category,
        ingredients,
        steps,
        cookTime: Math.max(0, Number(recipe.cookTime) || 0),
        servings: Math.max(1, Number(recipe.servings) || 1),
        note: text(recipe.note, 500),
        createdAt: typeof recipe.createdAt === 'string' ? recipe.createdAt : new Date().toISOString(),
        updatedAt: typeof recipe.updatedAt === 'string' ? recipe.updatedAt : new Date().toISOString()
      };
    });

    const mealIds = new Set();
    const meals = data.meals.map((meal, index) => {
      const label = `Rencana menu ke-${index + 1}`;
      if (!isPlainObject(meal)) throw new Error(`${label}: format tidak valid.`);
      const name = text(meal.name, 120);
      if (!name) throw new Error(`${label}: nama makanan wajib diisi.`);
      if (!U.isValidISO(meal.date)) throw new Error(`${label}: tanggal tidak valid.`);
      if (!MEAL_IDS.has(meal.mealType)) throw new Error(`${label}: waktu makan tidak dikenal.`);
      let id = typeof meal.id === 'string' ? meal.id.trim() : '';
      if (!id || mealIds.has(id)) id = U.uid('meal');
      mealIds.add(id);
      return {
        id,
        name,
        date: meal.date,
        mealType: meal.mealType,
        recipeId: typeof meal.recipeId === 'string' && recipeIds.has(meal.recipeId) ? meal.recipeId : null,
        note: text(meal.note, 500),
        createdAt: typeof meal.createdAt === 'string' ? meal.createdAt : new Date().toISOString(),
        updatedAt: typeof meal.updatedAt === 'string' ? meal.updatedAt : new Date().toISOString()
      };
    });

    const shoppingIds = new Set();
    const shopping = data.shopping.map((item, index) => {
      const label = `Item belanja ke-${index + 1}`;
      if (!isPlainObject(item)) throw new Error(`${label}: format tidak valid.`);
      const name = text(item.name, 120);
      if (!name) throw new Error(`${label}: nama bahan wajib diisi.`);
      let id = typeof item.id === 'string' ? item.id.trim() : '';
      if (!id || shoppingIds.has(id)) id = U.uid('shop');
      shoppingIds.add(id);
      return {
        id,
        name,
        amount: text(item.amount, 30),
        unit: text(item.unit, 30),
        category: INGREDIENT_CATEGORY_IDS.has(item.category) ? item.category : 'lainnya',
        done: Boolean(item.done),
        sourceRecipeId: typeof item.sourceRecipeId === 'string' && recipeIds.has(item.sourceRecipeId)
          ? item.sourceRecipeId
          : null,
        sourceName: text(item.sourceName, 180),
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString()
      };
    });

    const settings = normalizeSettings(data.settings);
    return { meals, recipes, shopping, settings };
  }

  function importBackup(normalized) {
    saveMeals(normalized.meals);
    saveRecipes(normalized.recipes);
    saveShopping(normalized.shopping);
    writeJSON(KEYS.settings, normalizeSettings(normalized.settings));
    writeJSON(KEYS.meta, {
      version: 1,
      importedAt: new Date().toISOString()
    });
  }

  function resetAll() {
    try {
      [KEYS.meals, KEYS.recipes, KEYS.shopping, KEYS.settings].forEach((key) => {
        window.localStorage.removeItem(key);
      });
      writeJSON(KEYS.meta, {
        version: 1,
        resetAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Menuly: gagal menghapus data.', error);
      return false;
    }
  }

  function buildRecipe(seed) {
    const recipe = {
      id: U.uid('recipe'),
      name: seed.name,
      category: seed.category,
      ingredients: seed.ingredients.map((ingredient) => ({
        id: U.uid('ing'),
        name: ingredient[0],
        amount: ingredient[1],
        unit: ingredient[2],
        category: ingredient[3]
      })),
      steps: seed.steps,
      cookTime: seed.cookTime,
      servings: seed.servings,
      note: seed.note || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return recipe;
  }

  function seedData() {
    const recipes = [
      buildRecipe({
        name: 'Nasi Goreng Kampung',
        category: 'sarapan',
        cookTime: 20,
        servings: 2,
        note: 'Gunakan nasi yang sudah didinginkan agar teksturnya tidak lembek.',
        ingredients: [
          ['Nasi putih', '400', 'g', 'bahan_pokok'],
          ['Telur ayam', '2', 'butir', 'daging_protein'],
          ['Bawang merah', '3', 'siung', 'bumbu'],
          ['Bawang putih', '2', 'siung', 'bumbu'],
          ['Daun bawang', '1', 'batang', 'sayur_buah'],
          ['Kecap manis', '2', 'sdm', 'bumbu'],
          ['Minyak goreng', '1', 'sdm', 'bahan_pokok'],
          ['Garam', '0.5', 'sdt', 'bumbu']
        ],
        steps: [
          'Panaskan minyak, lalu tumis bawang merah dan bawang putih hingga harum.',
          'Masukkan telur, orak-arik hingga matang dan tercampur dengan bumbu.',
          'Tambahkan nasi putih, kecap manis, dan garam. Aduk rata dengan api besar.',
          'Masukkan daun bawang, masak sebentar, lalu sajikan hangat.'
        ]
      }),
      buildRecipe({
        name: 'Ayam Kecap Manis',
        category: 'lauk',
        cookTime: 35,
        servings: 3,
        note: 'Diamkan ayam dalam bumbu selama 10 menit sebelum dimasak agar lebih meresap.',
        ingredients: [
          ['Ayam', '500', 'g', 'daging_protein'],
          ['Kecap manis', '4', 'sdm', 'bumbu'],
          ['Bawang merah', '5', 'siung', 'bumbu'],
          ['Bawang putih', '3', 'siung', 'bumbu'],
          ['Jahe', '2', 'cm', 'bumbu'],
          ['Daun salam', '2', 'lembar', 'bumbu'],
          ['Gula merah', '1', 'sdm', 'bumbu'],
          ['Minyak goreng', '2', 'sdm', 'bahan_pokok'],
          ['Air', '200', 'ml', 'lainnya']
        ],
        steps: [
          'Haluskan bawang merah, bawang putih, dan jahe.',
          'Tumis bumbu halus bersama daun salam hingga harum.',
          'Masukkan ayam, masak hingga berubah warna.',
          'Tambahkan kecap manis, gula merah, dan air. Masak dengan api kecil selama 25 menit hingga mengental.',
          'Koreksi rasa, angkat, dan sajikan.'
        ]
      }),
      buildRecipe({
        name: 'Sayur Sop Segar',
        category: 'sayur',
        cookTime: 30,
        servings: 4,
        note: 'Tambahkan seledri di akhir memasak agar aromanya tetap segar.',
        ingredients: [
          ['Wortel', '2', 'buah', 'sayur_buah'],
          ['Kentang', '2', 'buah', 'sayur_buah'],
          ['Kol', '200', 'g', 'sayur_buah'],
          ['Buncis', '100', 'g', 'sayur_buah'],
          ['Seledri', '1', 'batang', 'sayur_buah'],
          ['Bawang putih', '2', 'siung', 'bumbu'],
          ['Bawang merah', '2', 'siung', 'bumbu'],
          ['Kaldu ayam bubuk', '1', 'sdt', 'bumbu'],
          ['Air', '1', 'liter', 'lainnya']
        ],
        steps: [
          'Potong wortel, kentang, kol, dan buncis sesuai selera.',
          'Tumis bawang merah dan bawang putih hingga harum.',
          'Didihkan air, lalu masukkan bumbu tumis dan sayuran yang lebih keras terlebih dahulu.',
          'Masak hingga sayuran empuk, tambahkan kaldu dan seledri.',
          'Koreksi rasa lalu sajikan selagi hangat.'
        ]
      }),
      buildRecipe({
        name: 'Telur Dadar',
        category: 'sarapan',
        cookTime: 10,
        servings: 2,
        note: 'Gunakan api sedang agar telur matang merata tanpa gosong.',
        ingredients: [
          ['Telur ayam', '3', 'butir', 'daging_protein'],
          ['Daun bawang', '1', 'batang', 'sayur_buah'],
          ['Bawang merah', '2', 'siung', 'bumbu'],
          ['Garam', '0.25', 'sdt', 'bumbu'],
          ['Merica bubuk', '0.25', 'sdt', 'bumbu'],
          ['Minyak goreng', '2', 'sdm', 'bahan_pokok']
        ],
        steps: [
          'Kocok telur bersama garam dan merica hingga rata.',
          'Masukkan irisan daun bawang dan bawang merah, aduk sebentar.',
          'Panaskan minyak, tuang adonan telur, masak hingga kedua sisi matang keemasan.'
        ]
      }),
      buildRecipe({
        name: 'Tumis Kangkung',
        category: 'sayur',
        cookTime: 15,
        servings: 3,
        note: 'Masak dengan api besar dan jangan terlalu lama agar kangkung tetap renyah.',
        ingredients: [
          ['Kangkung', '1', 'ikat', 'sayur_buah'],
          ['Bawang putih', '3', 'siung', 'bumbu'],
          ['Bawang merah', '2', 'siung', 'bumbu'],
          ['Cabai merah', '3', 'buah', 'bumbu'],
          ['Saus tiram', '1', 'sdm', 'bumbu'],
          ['Minyak goreng', '1', 'sdm', 'bahan_pokok'],
          ['Garam', '0.5', 'sdt', 'bumbu']
        ],
        steps: [
          'Petik dan cuci bersih kangkung, lalu tiriskan.',
          'Tumis bawang merah, bawang putih, dan cabai hingga harum.',
          'Masukkan kangkung dan saus tiram, aduk cepat dengan api besar.',
          'Tambahkan garam, masak sebentar, lalu angkat dan sajikan.'
        ]
      }),
      buildRecipe({
        name: 'Pisang Goreng Madu',
        category: 'camilan',
        cookTime: 20,
        servings: 3,
        note: 'Pilih pisang kepok yang matang tetapi masih cukup padat.',
        ingredients: [
          ['Pisang kepok', '6', 'buah', 'sayur_buah'],
          ['Tepung terigu', '150', 'g', 'bahan_pokok'],
          ['Gula pasir', '2', 'sdm', 'bahan_pokok'],
          ['Garam', '0.25', 'sdt', 'bumbu'],
          ['Air', '200', 'ml', 'lainnya'],
          ['Minyak goreng', '500', 'ml', 'bahan_pokok'],
          ['Madu', '2', 'sdm', 'bumbu']
        ],
        steps: [
          'Campurkan tepung terigu, gula pasir, garam, dan air hingga menjadi adonan licin.',
          'Kupas pisang, lalu celupkan ke dalam adonan.',
          'Goreng dalam minyak panas hingga kuning keemasan.',
          'Tiriskan, olesi dengan madu, lalu sajikan.'
        ]
      })
    ];

    const today = U.todayISO();
    const recipeId = (index) => recipes[index].id;
    const mealPlan = [
      { offset: -2, type: 'makan_siang', recipe: 0, note: 'Nasi sisa kemarin, cocok untuk makan siang praktis.' },
      { offset: -1, type: 'sarapan', recipe: 3, note: '' },
      { offset: -1, type: 'makan_malam', recipe: 4, note: 'Tambahkan tahu goreng sebagai pelengkap.' },
      { offset: 0, type: 'sarapan', recipe: 0, note: '' },
      { offset: 0, type: 'makan_siang', recipe: 1, note: 'Masak lebih awal agar bumbu meresap.' },
      { offset: 0, type: 'makan_malam', recipe: 2, note: '' },
      { offset: 0, type: 'camilan', recipe: 5, note: 'Untuk teman minum teh sore ini.' },
      { offset: 1, type: 'sarapan', recipe: 3, note: 'Untuk bekal pagi.' },
      { offset: 1, type: 'makan_siang', recipe: 1, note: '' },
      { offset: 1, type: 'makan_malam', recipe: 4, note: '' },
      { offset: 2, type: 'makan_siang', recipe: 2, note: '' },
      { offset: 3, type: 'makan_malam', recipe: 1, note: '' }
    ];
    const meals = mealPlan.map((entry) => {
      const now = new Date().toISOString();
      return {
        id: U.uid('meal'),
        name: recipes[entry.recipe].name,
        date: U.toISO(U.addDays(today, entry.offset)),
        mealType: entry.type,
        recipeId: recipeId(entry.recipe),
        note: entry.note,
        createdAt: now,
        updatedAt: now
      };
    });

    const now = new Date().toISOString();
    const shoppingSeeds = [
      ['Daging ayam', '500', 'g', 'daging_protein', false, 1],
      ['Wortel', '2', 'buah', 'sayur_buah', false, 2],
      ['Kangkung', '1', 'ikat', 'sayur_buah', true, 4],
      ['Bawang merah', '250', 'g', 'bumbu', false, null],
      ['Kecap manis', '1', 'botol', 'bumbu', true, 1],
      ['Telur ayam', '1', 'kg', 'daging_protein', false, null],
      ['Beras', '5', 'kg', 'bahan_pokok', true, null],
      ['Pisang kepok', '6', 'buah', 'sayur_buah', false, 5]
    ];
    const shopping = shoppingSeeds.map((entry) => ({
      id: U.uid('shop'),
      name: entry[0],
      amount: entry[1],
      unit: entry[2],
      category: entry[3],
      done: entry[4],
      sourceRecipeId: entry[5] == null ? null : recipeId(entry[5]),
      sourceName: entry[5] == null ? '' : recipes[entry[5]].name,
      createdAt: now,
      updatedAt: now
    }));

    saveRecipes(recipes);
    saveMeals(meals);
    saveShopping(shopping);
    writeJSON(KEYS.settings, { userName: 'Rina', firstDayOfWeek: 'monday' });
    writeJSON(KEYS.meta, { version: 1, seededAt: now });
  }

  function init() {
    const warnings = [];
    try {
      const hasMeta = window.localStorage.getItem(KEYS.meta) != null;
      const hasExistingData = [KEYS.meals, KEYS.recipes, KEYS.shopping, KEYS.settings]
        .some((key) => window.localStorage.getItem(key) != null);

      if (!hasMeta && !hasExistingData) {
        seedData();
      } else if (!hasMeta) {
        writeJSON(KEYS.meta, { version: 1, detectedAt: new Date().toISOString() });
      }

      [KEYS.meals, KEYS.recipes, KEYS.shopping].forEach((key) => {
        const raw = window.localStorage.getItem(key);
        if (raw == null) return;
        try {
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed)) {
            window.localStorage.setItem(`${key}_corrupt_${Date.now()}`, raw);
            window.localStorage.setItem(key, '[]');
            warnings.push('Salah satu data Menuly rusak dan telah direset. Cadangan data lama disimpan di LocalStorage.');
          }
        } catch (error) {
          window.localStorage.setItem(`${key}_corrupt_${Date.now()}`, raw);
          window.localStorage.setItem(key, '[]');
          warnings.push('Salah satu data Menuly rusak dan telah direset. Cadangan data lama disimpan di LocalStorage.');
        }
      });
    } catch (error) {
      console.error('Menuly: LocalStorage tidak tersedia.', error);
      warnings.push('Penyimpanan lokal tidak dapat diakses. Data tidak akan tersimpan setelah halaman dimuat ulang.');
    }
    return warnings;
  }

  Menuly.Storage = {
    KEYS,
    DEFAULT_SETTINGS,
    init,
    getMeals,
    getRecipes,
    getShopping,
    getSettings,
    saveMeals,
    saveRecipes,
    saveShopping,
    saveSettings,
    addMeal,
    updateMeal,
    deleteMeal,
    findMealAtSlot,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    addShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    toggleShoppingItem,
    deletePurchasedItems,
    findShoppingDuplicate,
    exportBackup,
    validateBackup,
    importBackup,
    resetAll
  };
})();
