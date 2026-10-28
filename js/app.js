/* Menuly — application shell, navigation, and route rendering. */
(function () {
  'use strict';

  const Menuly = window.Menuly;
  const UI = Menuly.UI;
  const U = Menuly.Utils;
  const h = U.h;

  const ROUTES = ['dashboard', 'planner', 'recipes', 'shopping', 'settings'];
  const TITLES = {
    dashboard: 'Dashboard',
    planner: 'Rencana Menu',
    recipes: 'Resep',
    shopping: 'Daftar Belanja',
    settings: 'Pengaturan'
  };
  let pendingAfterRoute = null;

  function getRoute() {
    const raw = String(window.location.hash || '').replace(/^#\/?/, '').split('?')[0].trim();
    return ROUTES.includes(raw) ? raw : 'dashboard';
  }

  function targetNode(route) {
    const map = {
      dashboard: Menuly.Dashboard,
      planner: Menuly.Planner,
      recipes: Menuly.Recipes,
      shopping: Menuly.Shopping,
      settings: Menuly.Settings
    };
    return map[route];
  }

  function updateNav() {
    const route = getRoute();
    document.querySelectorAll('[data-route]').forEach((link) => {
      const active = link.dataset.route === route;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function updateShell() {
    const settings = Menuly.Storage.getSettings();
    const name = settings.userName.trim() || 'Pengguna Menuly';
    document.querySelectorAll('[data-user-name]').forEach((node) => {
      node.textContent = name;
    });
    document.querySelectorAll('[data-user-initials]').forEach((node) => {
      node.textContent = U.getInitials(settings.userName);
    });
    const remaining = Menuly.Storage.getShopping().filter((item) => !item.done).length;
    document.querySelectorAll('[data-shopping-badge]').forEach((node) => {
      node.textContent = String(remaining);
      node.hidden = remaining === 0;
    });
    document.querySelectorAll('[data-mobile-badge]').forEach((node) => {
      node.hidden = remaining === 0;
    });
    updateNav();
  }

  function renderError(root, error) {
    console.error('Menuly: halaman gagal dirender.', error);
    const panel = h('div', { class: 'panel error-panel' },
      h('span', { class: 'empty-icon tone-danger' }, U.icon('triangle-alert', 22)),
      h('h2', null, 'Terjadi kesalahan saat membuka halaman'),
      h('p', null, 'Muat ulang halaman untuk melanjutkan. Data Anda tetap tersimpan di browser.'),
      h('button', {
        type: 'button',
        class: 'btn btn-primary',
        onClick: () => window.location.reload()
      }, U.icon('rotate-ccw', 16), h('span', { class: 'btn-label' }, 'Muat ulang'))
    );
    root.appendChild(h('div', { class: 'page-body' }, panel));
  }

  function render(options) {
    const opts = options || {};
    const root = document.getElementById('app-root');
    if (!root) return;
    const route = getRoute();
    const scrollPosition = window.scrollY;
    U.clear(root);
    document.title = `${TITLES[route]} · Menuly`;

    const page = targetNode(route);
    try {
      if (!page || typeof page.render !== 'function') throw new Error('Halaman tidak tersedia.');
      page.render(root);
      updateShell();
      UI.refreshIcons();
    } catch (error) {
      renderError(root, error);
    }

    if (opts.preserveScroll) {
      window.scrollTo(0, scrollPosition);
    } else {
      window.scrollTo(0, 0);
    }
  }

  function refresh() {
    render({ preserveScroll: true });
  }

  function go(route, after) {
    const target = ROUTES.includes(route) ? route : 'dashboard';
    UI.closeModal();
    if (getRoute() === target) {
      render();
      if (typeof after === 'function') {
        window.requestAnimationFrame(() => after());
      }
      return;
    }
    pendingAfterRoute = typeof after === 'function' ? after : null;
    window.location.hash = target;
  }

  function handleHashChange() {
    UI.closeModal();
    render();
    const callback = pendingAfterRoute;
    pendingAfterRoute = null;
    if (typeof callback === 'function') {
      window.requestAnimationFrame(() => callback());
    }
  }

  function bindNavigation() {
    document.querySelectorAll('a[data-route]').forEach((link) => {
      link.addEventListener('click', (event) => {
        if (link.dataset.route !== getRoute()) return;
        event.preventDefault();
        UI.closeModal();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function init() {
    const warnings = Menuly.Storage.init();
    UI.init();
    bindNavigation();

    if (!window.location.hash || !ROUTES.includes(String(window.location.hash).replace(/^#\/?/, ''))) {
      try {
        window.history.replaceState(null, '', '#dashboard');
      } catch (error) {
        window.location.hash = 'dashboard';
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('storage', (event) => {
      if (event.key && !Object.values(Menuly.Storage.KEYS).includes(event.key)) return;
      updateShell();
      render({ preserveScroll: true });
      UI.toast('Data diperbarui dari tab lain.', 'info');
    });
    window.addEventListener('menuly:storage-error', (event) => {
      const message = event.detail && event.detail.message
        ? event.detail.message
        : 'Data gagal disimpan ke penyimpanan browser.';
      UI.toast(message, 'error');
    });

    render();
    updateShell();

    warnings.forEach((warning) => {
      console.warn('Menuly:', warning);
    });
    if (warnings.length) {
      window.setTimeout(() => UI.toast(warnings[0], 'error'), 400);
    }
  }

  Menuly.App = {
    init,
    render,
    refresh,
    go,
    getRoute,
    updateShell
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
