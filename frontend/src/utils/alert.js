import Swal from 'sweetalert2';

/**
 * One place for every SweetAlert in EcoTrack, so popups look and behave the same everywhere.
 *
 *   toast.success('Saved')                    small corner notification
 *   success / error / warning / info          centred popups
 *   confirm / confirmDelete / confirmDiscard  resolve to true | false
 *   withLoading(promise, 'Saving...')         spinner popup while something runs
 */

// Key used to show the "heads up" popup only once per login session (see Dashboard + AuthContext).
export const DASH_ALERT_KEY = 'ecotrack:dashboard-alert';

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Bootstrap-styled buttons so popups match the rest of the app.
const BASE_CLASSES = {
  popup: 'eco-swal',
  title: 'eco-swal-title',
  confirmButton: 'btn btn-success px-4',
  cancelButton: 'btn btn-light px-4',
  denyButton: 'btn btn-outline-danger px-4',
  actions: 'eco-swal-actions',
};

function fire({ customClass, ...options } = {}) {
  return Swal.fire({
    buttonsStyling: false,
    heightAuto: false,
    reverseButtons: true,
    ...options,
    customClass: { ...BASE_CLASSES, ...customClass },
  });
}

/* ------------------------------ toasts ------------------------------ */
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3200,
  timerProgressBar: true,
  customClass: { popup: 'eco-swal-toast' },
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer);
    el.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export const toast = {
  success: (title) => Toast.fire({ icon: 'success', title }),
  error: (title) => Toast.fire({ icon: 'error', title, timer: 4500 }),
  warning: (title) => Toast.fire({ icon: 'warning', title, timer: 4500 }),
  info: (title) => Toast.fire({ icon: 'info', title }),
};

/* ------------------------------ popups ------------------------------ */
export const success = (title, text, opts) => fire({ icon: 'success', title, text, ...opts });
export const error = (title, text, opts) => fire({ icon: 'error', title, text, ...opts });
export const warning = (title, text, opts) => fire({ icon: 'warning', title, text, ...opts });
export const info = (title, text, opts) => fire({ icon: 'info', title, text, ...opts });

/** Error popup with a bullet list (used for Laravel validation errors). */
export const errorList = (title, messages) =>
  fire({
    icon: 'error',
    title,
    html: `<ul class="eco-swal-list">${messages.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>`,
  });

/* ---------------------------- confirmations ---------------------------- */
export async function confirm({
  title = 'Are you sure?', text, html, icon = 'question',
  confirmText = 'Yes', cancelText = 'Cancel', danger = false,
}) {
  const res = await fire({
    title, text, html, icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    focusCancel: danger,
    customClass: danger ? { confirmButton: 'btn btn-danger px-4' } : undefined,
  });
  return res.isConfirmed;
}

export const confirmDelete = (what, name) =>
  confirm({
    title: `Delete this ${what}?`,
    html: name
      ? `<b>${escapeHtml(name)}</b> will be permanently removed. This cannot be undone.`
      : 'This cannot be undone.',
    icon: 'warning',
    confirmText: 'Yes, delete it',
    danger: true,
  });

export const confirmDiscard = () =>
  confirm({
    title: 'Discard changes?',
    text: 'You have unsaved changes that will be lost.',
    icon: 'warning',
    confirmText: 'Discard',
    cancelText: 'Keep editing',
    danger: true,
  });

export const confirmLogout = () =>
  confirm({
    title: 'Log out?',
    text: 'You will need to sign in again to continue.',
    confirmText: 'Log out',
  });

/* ------------------------------ loading ------------------------------ */
export const loading = (title = 'Please wait...', text) =>
  fire({
    title, text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading(),
  });

export const closeAlert = () => Swal.close();

/**
 * Runs a promise (or a function returning one) and shows a spinner popup if it takes longer
 * than `delay` ms, so quick requests don't flash a popup. Always closes the spinner afterwards.
 */
export async function withLoading(task, title = 'Saving...', delay = 300) {
  let opened = false;
  const timer = setTimeout(() => { opened = true; loading(title); }, delay);
  try {
    return await (typeof task === 'function' ? task() : task);
  } finally {
    clearTimeout(timer);
    if (opened) Swal.close();
  }
}

export default Swal;
