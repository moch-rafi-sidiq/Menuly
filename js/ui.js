/* Menuly — shared UI building blocks: header, buttons, modal, confirm, toast. */
(function () {
  'use strict';

  const Menuly = window.Menuly;
  const U = Menuly.Utils;
  const h = U.h;

  let previousFocus = null;
  let currentOnClose = null;
  let modalInitialized = false;

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
    }
  }

  function button(options) {
    const opts = options || {};
    const variant = opts.variant || 'secondary';
    const size = opts.size ? ` btn-${opts.size}` : '';
    const className = opts.className ? ` ${opts.className}` : '';
    const attrs = Object.assign({}, opts.attrs || {});
    if (opts.form) attrs.form = opts.form;
    if (opts.title) attrs.title = opts.title;
    if (opts.ariaLabel) attrs['aria-label'] = opts.ariaLabel;
    if (opts.disabled) attrs.disabled = true;
    const node = h('button', Object.assign({
      type: opts.type || 'button',
      class: `btn btn-${variant}${size}${className}`,
      onClick: opts.onClick || null
    }, attrs), opts.icon ? U.icon(opts.icon, opts.iconSize || 17) : null);
    if (opts.iconOnly) {
      if (!attrs['aria-label'] && opts.label) node.setAttribute('aria-label', opts.label);
      if (!attrs.title && opts.label) node.setAttribute('title', opts.label);
    } else {
      node.appendChild(h('span', { class: 'btn-label' }, opts.label || ''));
    }
    return node;
  }

  function iconButton(iconName, label, onClick, options) {
    const opts = options || {};
    const node = h('button', {
      type: 'button',
      class: `icon-btn${opts.className ? ` ${opts.className}` : ''}`,
      'aria-label': label,
      title: opts.title === null ? null : (opts.title || label),
      onClick
    }, U.icon(iconName, opts.size || 16));
    return node;
  }

  function linkButton(label, iconName, onClick) {
    return h('button', {
      type: 'button',
      class: 'link-action',
      onClick
    }, label, iconName ? U.icon(iconName, 14) : null);
  }

  function pageHeader(options) {
    const opts = options || {};
    const actions = opts.actions == null ? [] : [].concat(opts.actions);
    const titleBlock = h('div', { class: 'topbar-title' },
      opts.eyebrow ? h('p', { class: 'eyebrow' }, opts.eyebrow) : null,
      h('h1', null, opts.title || ''),
      opts.subtitle ? h('p', { class: 'topbar-subtitle' }, opts.subtitle) : null
    );
    const dateChip = h('span', { class: 'topbar-date' },
      U.icon('calendar-days', 15),
      h('span', null, U.formatLongDate(new Date()))
    );
    const side = h('div', { class: 'topbar-side' }, dateChip);
    if (actions.length) {
      side.appendChild(h('div', { class: 'topbar-actions' }, actions));
    }
    return h('header', { class: 'topbar' },
      h('div', { class: 'topbar-inner' }, titleBlock, side)
    );
  }

  function emptyState(options) {
    const opts = options || {};
    const action = opts.action || (opts.actionLabel ? button({
      label: opts.actionLabel,
      icon: opts.actionIcon || 'plus',
      variant: opts.actionVariant || 'primary',
      size: 'sm',
      onClick: opts.onAction
    }) : null);
    return h('div', { class: `empty-state${opts.compact ? ' compact' : ''}` },
      h('span', { class: `empty-icon${opts.tone ? ` ${opts.tone}` : ''}` }, U.icon(opts.icon || 'inbox', 22)),
      h('h3', { class: 'empty-title' }, opts.title || 'Belum ada data'),
      opts.description ? h('p', { class: 'empty-text' }, opts.description) : null,
      action ? h('div', { class: 'empty-action' }, action) : null
    );
  }

  function initModal() {
    if (modalInitialized) return;
    modalInitialized = true;
    const layer = document.getElementById('modal-layer');
    if (!layer) return;
    layer.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-modal]')) closeModal();
    });
    document.addEventListener('keydown', (event) => {
      if (layer.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable(layer);
      if (!focusable.length) {
        event.preventDefault();
        layer.querySelector('.modal-shell')?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function getFocusable(scope) {
    return Array.from(scope.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((node) => node.offsetParent !== null || node === document.activeElement);
  }

  function openModal(options) {
    initModal();
    const opts = options || {};
    const layer = document.getElementById('modal-layer');
    const shell = document.getElementById('modal-shell');
    if (!layer || !shell) return;
    if (layer.hidden) previousFocus = document.activeElement;
    U.clear(shell);
    shell.className = `modal-shell modal-${opts.size || 'md'}`;

    const closeBtn = h('button', {
      type: 'button',
      class: 'modal-close',
      'aria-label': 'Tutup dialog',
      'data-close-modal': '',
      onClick: null
    }, U.icon('x', 18));

    const heading = h('div', { class: 'modal-heading' },
      opts.icon ? h('span', { class: `modal-icon${opts.iconTone ? ` ${opts.iconTone}` : ''}` }, U.icon(opts.icon, 20)) : null,
      h('div', { class: 'modal-heading-copy' },
        h('h2', { class: 'modal-title', id: 'modal-title' }, opts.title || ''),
        opts.subtitle ? h('p', { class: 'modal-subtitle' }, opts.subtitle) : null
      )
    );

    shell.appendChild(h('div', { class: 'modal-head' }, heading, closeBtn));

    const bodyContent = opts.body || h('div');
    const body = h('div', { class: 'modal-body' });
    body.appendChild(bodyContent);
    if (opts.preventClose) closeBtn.classList.add('is-hidden');
    shell.appendChild(body);

    const footerItems = opts.footer == null ? [] : [].concat(opts.footer).flat();
    if (footerItems.length) {
      shell.appendChild(h('div', { class: 'modal-footer' }, footerItems));
    }

    currentOnClose = typeof opts.onClose === 'function' ? opts.onClose : null;
    layer.hidden = false;
    document.body.classList.add('modal-open');
    refreshIcons();

    window.requestAnimationFrame(() => {
      const preferred = body.querySelector('[autofocus]');
      if (preferred instanceof HTMLElement) {
        preferred.focus();
        return;
      }
      const focusable = getFocusable(shell);
      if (focusable.length) focusable[0].focus();
      else shell.focus();
    });
  }

  function closeModal() {
    const layer = document.getElementById('modal-layer');
    if (!layer || layer.hidden) return;
    layer.hidden = true;
    document.body.classList.remove('modal-open');
    const callback = currentOnClose;
    currentOnClose = null;
    if (callback) callback();
    if (previousFocus instanceof HTMLElement && document.body.contains(previousFocus)) {
      previousFocus.focus();
    }
    previousFocus = null;
    const shell = document.getElementById('modal-shell');
    if (shell) U.clear(shell);
  }

  function confirm(options) {
    const opts = options || {};
    return new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        closeModal();
        resolve(value);
      };

      const body = h('div', { class: 'confirm-body' },
        h('p', { class: 'confirm-message' }, opts.message || 'Apakah Anda yakin?'),
        opts.detail ? h('p', { class: 'confirm-detail' }, opts.detail) : null
      );

      let requirementInput = null;
      let confirmBtn = null;

      if (opts.requireText) {
        requirementInput = h('input', {
          type: 'text',
          class: 'input',
          id: `confirm-${U.uid('input')}`,
          placeholder: opts.requireText,
          autocomplete: 'off',
          spellcheck: 'false',
          autofocus: true
        });
        const field = U.createField(
          opts.requireTextLabel || `Ketik "${opts.requireText}" untuk mengonfirmasi`,
          requirementInput,
          { hint: 'Huruf besar dan kecil harus sama.' }
        );
        body.appendChild(field.wrap);
      }

      const cancelBtn = button({
        label: opts.cancelLabel || 'Batal',
        variant: 'secondary',
        onClick: () => done(false)
      });
      confirmBtn = button({
        label: opts.confirmLabel || 'Hapus',
        variant: opts.tone === 'danger' ? 'danger' : 'primary',
        icon: opts.confirmIcon || null,
        onClick: () => done(true),
        disabled: Boolean(opts.requireText)
      });

      if (requirementInput) {
        requirementInput.addEventListener('input', () => {
          confirmBtn.disabled = requirementInput.value.trim() !== opts.requireText;
        });
      }

      openModal({
        title: opts.title || 'Konfirmasi',
        subtitle: opts.subtitle || null,
        icon: opts.icon || 'alert-triangle',
        iconTone: opts.iconTone || (opts.tone === 'danger' ? 'tone-danger' : 'tone-navy'),
        size: 'sm',
        body,
        footer: [cancelBtn, confirmBtn],
        onClose: () => {
          if (!settled) {
            settled = true;
            resolve(false);
          }
        }
      });

      window.requestAnimationFrame(() => {
        if (requirementInput) requirementInput.focus();
        else cancelBtn.focus();
      });
    });
  }

  function toast(message, type) {
    const region = document.getElementById('toast-region');
    if (!region) return;
    const tone = type || 'success';
    const icons = { success: 'check', error: 'alert-triangle', info: 'info' };
    const node = h('div', { class: `toast toast-${tone}`, role: 'status' },
      h('span', { class: 'toast-icon' }, U.icon(icons[tone] || 'info', 15)),
      h('p', { class: 'toast-message' }, message)
    );
    region.appendChild(node);
    refreshIcons();

    const remove = () => {
      if (!node.isConnected) return;
      node.classList.add('is-leaving');
      window.setTimeout(() => node.remove(), 180);
    };
    const timer = window.setTimeout(remove, 4200);
    node.addEventListener('click', () => {
      window.clearTimeout(timer);
      remove();
    });
    while (region.children.length > 3) region.firstElementChild.remove();
  }

  function init() {
    initModal();
    const loadHandler = () => refreshIcons();
    window.addEventListener('load', loadHandler);
    window.setTimeout(refreshIcons, 500);
  }

  Menuly.UI = {
    refreshIcons,
    button,
    iconButton,
    linkButton,
    pageHeader,
    emptyState,
    openModal,
    closeModal,
    confirm,
    toast,
    init
  };
})();
