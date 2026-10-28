/* Menuly — settings, backup/restore, and data reset. */
(function () {
  'use strict';

  const Menuly = window.Menuly;
  const U = Menuly.Utils;
  const S = Menuly.Storage;
  const UI = Menuly.UI;
  const h = U.h;

  function exportData() {
    try {
      const backup = S.exportBackup();
      const json = JSON.stringify(backup, null, 2);
      U.downloadBlob(`menuly-backup-${U.todayISO()}.json`, json, 'application/json');
      UI.toast('Cadangan data berhasil diunduh.', 'success');
    } catch (error) {
      console.error('Menuly: ekspor gagal.', error);
      UI.toast('Gagal membuat file cadangan. Coba lagi.', 'error');
    }
  }

  function showImportError(message) {
    const body = h('div', { class: 'import-error-body' },
      h('p', { class: 'confirm-message' }, message),
      h('p', { class: 'confirm-detail' }, 'Data yang sudah ada tidak diubah. Pastikan file JSON berasal dari fitur ekspor Menuly.')
    );
    UI.openModal({
      title: 'Impor gagal',
      subtitle: 'File tidak dapat digunakan',
      icon: 'file-warning',
      iconTone: 'tone-danger',
      size: 'sm',
      body,
      footer: [UI.button({ label: 'Tutup', variant: 'secondary', onClick: () => UI.closeModal() })]
    });
  }

  function processImportFile(file, input) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      showImportError('Ukuran file melebihi 4 MB. Gunakan file cadangan Menuly yang lebih kecil.');
      input.value = '';
      return;
    }
    file.text()
      .then((text) => {
        let raw;
        try {
          raw = JSON.parse(text);
        } catch (error) {
          throw new Error('File bukan JSON yang valid. Periksa kembali file cadangan yang dipilih.');
        }
        const normalized = S.validateBackup(raw);
        const counts = {
          meals: normalized.meals.length,
          recipes: normalized.recipes.length,
          shopping: normalized.shopping.length
        };
        return UI.confirm({
          title: 'Impor data dari file?',
          message: 'Seluruh data saat ini akan diganti dengan data dari file cadangan.',
          detail: `File berisi ${counts.meals} rencana menu, ${counts.recipes} resep, dan ${counts.shopping} item belanja.`,
          confirmLabel: 'Impor data',
          cancelLabel: 'Batal',
          icon: 'upload',
          iconTone: 'tone-navy',
          confirmIcon: 'check',
          tone: 'primary'
        }).then((approved) => {
          if (!approved) return;
          S.importBackup(normalized);
          Menuly.App.updateShell();
          Menuly.App.refresh();
          UI.toast('Data berhasil diimpor dari cadangan.', 'success');
        });
      })
      .catch((error) => {
        showImportError(error && error.message ? error.message : 'Terjadi kesalahan saat membaca file.');
      })
      .finally(() => {
        input.value = '';
      });
  }

  function openResetDialog() {
    UI.confirm({
      title: 'Hapus semua data?',
      message: 'Seluruh rencana menu, resep, daftar belanja, dan pengaturan akan dihapus permanen dari browser ini.',
      detail: 'Tindakan ini tidak dapat dibatalkan. Ekspor data terlebih dahulu jika Anda ingin menyimpan cadangan.',
      confirmLabel: 'Hapus semua data',
      cancelLabel: 'Batal',
      tone: 'danger',
      icon: 'alert-triangle',
      confirmIcon: 'trash-2',
      requireText: 'HAPUS',
      requireTextLabel: 'Ketik HAPUS untuk mengonfirmasi'
    }).then((approved) => {
      if (!approved) return;
      const success = S.resetAll();
      if (!success) {
        UI.toast('Data gagal dihapus. Coba lagi.', 'error');
        return;
      }
      Menuly.App.updateShell();
      Menuly.App.go('dashboard');
      UI.toast('Semua data Menuly telah dihapus.', 'success');
    });
  }

  function render(root) {
    const settings = S.getSettings();
    const meals = S.getMeals();
    const recipes = S.getRecipes();
    const shopping = S.getShopping();
    const header = UI.pageHeader({
      eyebrow: 'Menuly · Preferensi',
      title: 'Pengaturan',
      actions: [
        UI.button({
          label: 'Ekspor data',
          icon: 'download',
          variant: 'secondary',
          onClick: exportData
        })
      ]
    });
    root.appendChild(header);

    const body = h('div', { class: 'page-body page-stack settings-page' });
    const layout = h('div', { class: 'settings-layout' });
    const main = h('div', { class: 'settings-main' });
    const side = h('aside', { class: 'settings-side' });

    const avatarPreview = h('span', { class: 'settings-avatar' }, U.getInitials(settings.userName));
    const nameInput = h('input', {
      type: 'text',
      class: 'input',
      id: 'settings-name',
      maxlength: '80',
      autocomplete: 'name',
      placeholder: 'Contoh: Rina',
      value: settings.userName
    });
    const nameField = U.createField('Nama pengguna', nameInput, {
      hint: 'Opsional. Nama ini dipakai untuk sapaan di dashboard.'
    });
    nameInput.addEventListener('input', () => {
      avatarPreview.textContent = U.getInitials(nameInput.value);
    });

    const mondayRadio = h('input', {
      type: 'radio',
      name: 'first-day',
      value: 'monday',
      checked: settings.firstDayOfWeek !== 'sunday'
    });
    const sundayRadio = h('input', {
      type: 'radio',
      name: 'first-day',
      value: 'sunday',
      checked: settings.firstDayOfWeek === 'sunday'
    });
    const firstDayGroup = h('fieldset', { class: 'preference-fieldset' },
      h('legend', { class: 'field-label' }, 'Hari pertama dalam minggu'),
      h('div', { class: 'preference-options' },
        h('label', { class: 'preference-card' },
          mondayRadio,
          h('span', { class: 'preference-icon' }, U.icon('calendar-days', 17)),
          h('span', { class: 'preference-copy' },
            h('strong', null, 'Senin'),
            h('small', null, 'Senin sampai Minggu')
          ),
          h('span', { class: 'preference-check', 'aria-hidden': 'true' })
        ),
        h('label', { class: 'preference-card' },
          sundayRadio,
          h('span', { class: 'preference-icon' }, U.icon('calendar-range', 17)),
          h('span', { class: 'preference-copy' },
            h('strong', null, 'Minggu'),
            h('small', null, 'Minggu sampai Sabtu')
          ),
          h('span', { class: 'preference-check', 'aria-hidden': 'true' })
        )
      ),
      h('p', { class: 'field-hint' }, 'Pilihan ini memengaruhi susunan kalender rencana menu.')
    );

    const profileForm = h('form', { class: 'settings-form', novalidate: true },
      h('div', { class: 'profile-row' },
        avatarPreview,
        h('div', { class: 'profile-copy' },
          nameField.wrap,
          h('p', { class: 'profile-note' }, 'Data profil hanya disimpan di perangkat ini.')
        )
      ),
      firstDayGroup,
      h('div', { class: 'settings-form-actions' },
        UI.button({
          label: 'Simpan perubahan',
          icon: 'check',
          variant: 'primary',
          type: 'submit'
        })
      )
    );

    profileForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const firstDay = profileForm.querySelector('input[name="first-day"]:checked')?.value || 'monday';
      S.saveSettings({
        userName: nameInput.value.trim(),
        firstDayOfWeek: firstDay
      });
      Menuly.App.updateShell();
      UI.toast('Pengaturan berhasil disimpan.', 'success');
    });

    const profilePanel = h('section', { class: 'panel settings-panel' },
      h('div', { class: 'panel-header' },
        h('div', { class: 'title-group' },
          h('h2', { class: 'panel-title' }, 'Profil & preferensi'),
          h('p', { class: 'panel-sub' }, 'Sesuaikan sapaan dan tampilan kalender Anda')
        ),
        h('span', { class: 'panel-header-icon' }, U.icon('user-round-cog', 17))
      ),
      h('div', { class: 'settings-panel-body' }, profileForm)
    );
    main.appendChild(profilePanel);

    const fileInput = h('input', {
      type: 'file',
      accept: '.json,application/json',
      hidden: true
    });
    fileInput.addEventListener('change', () => processImportFile(fileInput.files && fileInput.files[0], fileInput));

    const dataPanel = h('section', { class: 'panel settings-panel' },
      h('div', { class: 'panel-header' },
        h('div', { class: 'title-group' },
          h('h2', { class: 'panel-title' }, 'Cadangan & pemulihan'),
          h('p', { class: 'panel-sub' }, 'Simpan salinan data atau pulihkan dari file JSON')
        ),
        h('span', { class: 'panel-header-icon' }, U.icon('database-backup', 17))
      ),
      h('div', { class: 'settings-panel-body' },
        h('div', { class: 'data-summary' },
          h('div', { class: 'data-summary-item' }, h('strong', null, String(meals.length)), h('span', null, 'Rencana menu')),
          h('div', { class: 'data-summary-item' }, h('strong', null, String(recipes.length)), h('span', null, 'Resep')),
          h('div', { class: 'data-summary-item' }, h('strong', null, String(shopping.length)), h('span', null, 'Item belanja'))
        ),
        h('div', { class: 'data-actions' },
          h('div', { class: 'data-action-row' },
            h('span', { class: 'data-action-icon' }, U.icon('download', 17)),
            h('div', { class: 'data-action-copy' },
              h('strong', null, 'Ekspor data'),
              h('p', null, 'Unduh semua data Menuly dalam satu file JSON.')
            ),
            UI.button({
              label: 'Ekspor',
              icon: 'download',
              variant: 'secondary',
              size: 'sm',
              onClick: exportData
            })
          ),
          h('div', { class: 'data-action-row' },
            h('span', { class: 'data-action-icon' }, U.icon('upload', 17)),
            h('div', { class: 'data-action-copy' },
              h('strong', null, 'Impor data'),
              h('p', null, 'Pulihkan rencana, resep, belanja, dan pengaturan dari cadangan.')
            ),
            UI.button({
              label: 'Impor',
              icon: 'upload',
              variant: 'secondary',
              size: 'sm',
              onClick: () => fileInput.click()
            })
          )
        ),
        fileInput
      )
    );
    main.appendChild(dataPanel);

    const dangerPanel = h('section', { class: 'panel danger-zone' },
      h('div', { class: 'danger-copy' },
        h('span', { class: 'danger-icon' }, U.icon('triangle-alert', 18)),
        h('div', null,
          h('h2', null, 'Hapus semua data'),
          h('p', null, 'Menghapus seluruh rencana menu, resep, daftar belanja, dan pengaturan dari perangkat ini.')
        )
      ),
      UI.button({
        label: 'Hapus semua data',
        icon: 'trash-2',
        variant: 'danger',
        size: 'sm',
        onClick: openResetDialog
      })
    );
    main.appendChild(dangerPanel);
    layout.appendChild(main);

    const aboutPanel = h('section', { class: 'panel about-panel' },
      h('div', { class: 'about-brand' },
        h('span', { class: 'brand-mark small', 'aria-hidden': 'true' }, 'M'),
        h('div', null, h('strong', null, 'Menuly'), h('span', null, 'Meal planner'))
      ),
      h('p', { class: 'about-text' }, 'Rencanakan menu harian dan mingguan, simpan resep, lalu susun daftar belanja yang lebih teratur.'),
      h('ul', { class: 'about-list' },
        h('li', null, U.icon('shield-check', 14), 'Tanpa login dan tanpa server'),
        h('li', null, U.icon('hard-drive', 14), 'Tersimpan di LocalStorage'),
        h('li', null, U.icon('download', 14), 'Cadangan data kapan saja')
      ),
      h('span', { class: 'about-version' }, 'Versi 1.0.0')
    );
    side.appendChild(aboutPanel);

    const localPanel = h('section', { class: 'panel local-panel' },
      h('span', { class: 'local-icon' }, U.icon('shield-check', 19)),
      h('h2', null, 'Data tetap milik Anda'),
      h('p', null, 'Menuly tidak mengirim data ke mana pun. Semua data tersimpan di browser ini, jadi lakukan ekspor cadangan secara berkala.'),
      h('div', { class: 'local-status' },
        h('span', { class: 'status-dot', 'aria-hidden': 'true' }),
        'Penyimpanan lokal aktif'
      )
    );
    side.appendChild(localPanel);
    layout.appendChild(side);

    body.appendChild(layout);
    root.appendChild(body);
    UI.refreshIcons();
  }

  Menuly.Settings = { render };
})();
