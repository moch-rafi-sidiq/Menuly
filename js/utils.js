/* Menuly — shared utilities, constants, and safe DOM helpers. */
(function () {
  'use strict';

  const Menuly = (window.Menuly = window.Menuly || {});

  const MEAL_TYPES = [
    { id: 'sarapan', label: 'Sarapan', short: 'Sarapan', icon: 'sunrise', time: '07.00', color: '#B07920' },
    { id: 'makan_siang', label: 'Makan Siang', short: 'Siang', icon: 'sun', time: '12.30', color: '#2E7D5B' },
    { id: 'makan_malam', label: 'Makan Malam', short: 'Malam', icon: 'moon', time: '18.30', color: '#3A5D86' },
    { id: 'camilan', label: 'Camilan', short: 'Camilan', icon: 'cookie', time: '15.30', color: '#93506C' }
  ];

  const RECIPE_CATEGORIES = [
    { id: 'sarapan', label: 'Sarapan', icon: 'sunrise' },
    { id: 'lauk', label: 'Lauk', icon: 'utensils-crossed' },
    { id: 'sayur', label: 'Sayur', icon: 'salad' },
    { id: 'minuman', label: 'Minuman', icon: 'cup-soda' },
    { id: 'camilan', label: 'Camilan', icon: 'cookie' }
  ];

  const INGREDIENT_CATEGORIES = [
    { id: 'sayur_buah', label: 'Sayur & buah', icon: 'carrot' },
    { id: 'daging_protein', label: 'Daging & protein', icon: 'drumstick' },
    { id: 'bumbu', label: 'Bumbu', icon: 'flask-conical' },
    { id: 'bahan_pokok', label: 'Bahan pokok', icon: 'wheat' },
    { id: 'minuman', label: 'Minuman', icon: 'cup-soda' },
    { id: 'lainnya', label: 'Lainnya', icon: 'package' }
  ];

  const UNITS = [
    'g', 'kg', 'ml', 'liter', 'sdm', 'sdt', 'buah', 'butir', 'ikat', 'batang',
    'siung', 'lembar', 'potong', 'porsi', 'bungkus', 'kaleng', 'botol', 'cm', 'secukupnya'
  ];

  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const DAYS_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function toISO(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function parseISO(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  function isValidISO(value) {
    return Boolean(parseISO(value));
  }

  function todayISO() {
    return toISO(new Date());
  }

  function asDate(value) {
    if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const parsed = parseISO(value);
    if (parsed) return parsed;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function addDays(value, amount) {
    const date = asDate(value);
    date.setDate(date.getDate() + Number(amount || 0));
    return date;
  }

  function startOfWeek(value, firstDay) {
    const date = asDate(value);
    const target = firstDay === 'sunday' ? 0 : 1;
    const diff = (date.getDay() - target + 7) % 7;
    date.setDate(date.getDate() - diff);
    return date;
  }

  function getWeekDays(value, firstDay) {
    const start = startOfWeek(value, firstDay);
    return Array.from({ length: 7 }, (_, index) => toISO(addDays(start, index)));
  }

  function formatLongDate(value) {
    const date = asDate(value);
    const text = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
    return capitalize(text);
  }

  function formatDateShort(value) {
    const date = asDate(value);
    return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
  }

  function formatDateCompact(value) {
    const date = asDate(value);
    return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
  }

  function formatDayShort(value) {
    return DAYS_SHORT[asDate(value).getDay()];
  }

  function formatDayLong(value) {
    return DAYS_LONG[asDate(value).getDay()];
  }

  function formatWeekRange(value) {
    const start = asDate(value);
    const end = addDays(start, 6);
    const startMonth = MONTHS_SHORT[start.getMonth()];
    const endMonth = MONTHS_SHORT[end.getMonth()];
    if (start.getFullYear() !== end.getFullYear()) {
      return `${start.getDate()} ${startMonth} ${start.getFullYear()} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
    }
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
    }
    return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
  }

  function getGreeting(date) {
    const hour = (date ? asDate(date) : new Date()).getHours();
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 19) return 'Selamat sore';
    return 'Selamat malam';
  }

  function capitalize(text) {
    const value = String(text || '');
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function uid(prefix) {
    const time = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix || 'id'}_${time}_${random}`;
  }

  function normalizeKey(value) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function parseAmount(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const raw = String(value == null ? '' : value).trim().replace(',', '.');
    if (!raw) return null;
    const fraction = raw.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (fraction) {
      const denominator = Number(fraction[2]);
      if (!denominator) return null;
      return Number(fraction[1]) / denominator;
    }
    if (!/^\d+(?:\.\d+)?$/.test(raw)) return null;
    return Number(raw);
  }

  function formatNumber(value) {
    const number = typeof value === 'number' ? value : parseAmount(value);
    if (number == null || !Number.isFinite(number)) return String(value == null ? '' : value);
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(number);
  }

  function mergeAmounts(first, second) {
    const a = parseAmount(first);
    const b = parseAmount(second);
    if (a != null && b != null) return formatNumber(a + b);
    const left = String(first == null ? '' : first).trim();
    const right = String(second == null ? '' : second).trim();
    if (!left) return right;
    if (!right) return left;
    if (normalizeKey(left) === normalizeKey(right)) return left;
    return `${left} + ${right}`;
  }

  function formatQuantity(amount, unit) {
    const amountText = String(amount == null ? '' : amount).trim();
    const unitText = String(unit == null ? '' : unit).trim();
    if (!amountText && !unitText) return '—';
    if (!unitText) return amountText;
    if (!amountText) return unitText;
    return `${amountText} ${unitText}`;
  }

  function getInitials(name) {
    const clean = String(name || '').trim();
    if (!clean) return 'M';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  function byId(list, id) {
    return list.find((item) => item && item.id === id) || null;
  }

  function findMealType(id) {
    return MEAL_TYPES.find((type) => type.id === id) || null;
  }

  function findRecipeCategory(id) {
    return RECIPE_CATEGORIES.find((category) => category.id === id) || null;
  }

  function findIngredientCategory(id) {
    return INGREDIENT_CATEGORIES.find((category) => category.id === id) || null;
  }

  function mealTypeIndex(id) {
    const index = MEAL_TYPES.findIndex((type) => type.id === id);
    return index === -1 ? 99 : index;
  }

  function sortMeals(list) {
    return [...list].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return mealTypeIndex(a.mealType) - mealTypeIndex(b.mealType);
    });
  }

  function isToday(value) {
    return value === todayISO();
  }

  function formatMinutes(minutes) {
    const value = Number(minutes);
    if (!Number.isFinite(value) || value <= 0) return '—';
    if (value < 60) return `${value} menit`;
    const hours = Math.floor(value / 60);
    const rest = value % 60;
    return rest ? `${hours} jam ${rest} menit` : `${hours} jam`;
  }

  function icon(name, size, className) {
    const sizeClass = size ? ` icon-${size}` : '';
    const extra = className ? ` ${className}` : '';
    return h('i', {
      'data-lucide': name,
      class: `icon${sizeClass}${extra}`,
      'aria-hidden': 'true'
    });
  }

  function h(tag, props, ...children) {
    const element = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach((key) => {
        const value = props[key];
        if (value == null || value === false) return;
        if (key === 'class') element.className = value;
        else if (key === 'text') element.textContent = String(value);
        else if (key === 'html') element.innerHTML = value;
        else if (key === 'dataset') Object.assign(element.dataset, value);
        else if (key === 'style' && typeof value === 'object') Object.assign(element.style, value);
        else if (key === 'value') element.value = value;
        else if (key === 'checked') element.checked = Boolean(value);
        else if (key === 'selected') element.selected = Boolean(value);
        else if (key.startsWith('on') && typeof value === 'function') {
          element.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (value === true) element.setAttribute(key, '');
        else element.setAttribute(key, value);
      });
    }
    append(element, children);
    return element;
  }

  function append(parent, children) {
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return parent;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function option(value, label, selected) {
    return h('option', { value, selected: Boolean(selected) }, label);
  }

  function selectOptions(items, selected, placeholder) {
    return [
      placeholder ? option('', placeholder, !selected) : null,
      ...items.map((item) => option(item.id, item.label, item.id === selected))
    ];
  }

  function createField(labelText, control, options) {
    const opts = options || {};
    if (!control.id) control.id = uid('field');
    const label = h('label', { class: 'field-label', for: control.id }, labelText);
    if (opts.required) label.appendChild(h('span', { class: 'req', 'aria-hidden': 'true' }, '*'));
    const hint = opts.hint ? h('p', { class: 'field-hint', text: opts.hint }) : null;
    const error = h('p', { class: 'field-error', hidden: true, id: `${control.id}-error` });
    const wrap = h('div', { class: `field${opts.className ? ` ${opts.className}` : ''}` }, label, control, hint, error);
    if (opts.required) control.setAttribute('aria-required', 'true');
    return { wrap, control, error, hint, label };
  }

  function setFieldError(field, message) {
    if (!field) return;
    field.wrap.classList.add('invalid');
    field.control.setAttribute('aria-invalid', 'true');
    field.error.textContent = message;
    field.error.hidden = false;
  }

  function clearFieldError(field) {
    if (!field) return;
    field.wrap.classList.remove('invalid');
    field.control.removeAttribute('aria-invalid');
    field.error.textContent = '';
    field.error.hidden = true;
  }

  function focusField(field) {
    if (field && field.control) field.control.focus();
  }

  function debounce(fn, delay) {
    let timer = null;
    return function debounced(...args) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function downloadBlob(filename, text, type) {
    const blob = new Blob([text], { type: type || 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = h('a', { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  Menuly.Utils = {
    MEAL_TYPES,
    RECIPE_CATEGORIES,
    INGREDIENT_CATEGORIES,
    UNITS,
    pad2,
    toISO,
    parseISO,
    isValidISO,
    todayISO,
    asDate,
    addDays,
    startOfWeek,
    getWeekDays,
    formatLongDate,
    formatDateShort,
    formatDateCompact,
    formatDayShort,
    formatDayLong,
    formatWeekRange,
    getGreeting,
    capitalize,
    uid,
    normalizeKey,
    parseAmount,
    formatNumber,
    mergeAmounts,
    formatQuantity,
    getInitials,
    byId,
    findMealType,
    findRecipeCategory,
    findIngredientCategory,
    mealTypeIndex,
    sortMeals,
    isToday,
    formatMinutes,
    icon,
    h,
    append,
    clear,
    option,
    selectOptions,
    createField,
    setFieldError,
    clearFieldError,
    focusField,
    debounce,
    downloadBlob
  };
})();
