import { ApiError, CpebAdminApi } from './api.js';

const config = globalThis.CPEB_ADMIN_CONFIG || {};
const api = new CpebAdminApi(config.apiBaseUrl || 'http://localhost:3000');

const loginView = byId('login-view');
const portalView = byId('portal-view');
const loginForm = byId('login-form');
const loginButton = byId('login-button');
const loginError = byId('login-error');
const logoutButton = byId('logout-button');
const refreshButton = byId('refresh-button');
const accountName = byId('account-name');
const accountRole = byId('account-role');
const statPending = byId('stat-pending');
const statActive = byId('stat-active');
const statAvailable = byId('stat-available');
const portalMessage = byId('portal-message');
const bookingsTable = byId('bookings-table');
const bookingsBody = byId('bookings-body');
const emptyState = byId('empty-state');
const rejectDialog = byId('reject-dialog');
const rejectForm = byId('reject-form');
const rejectReason = byId('reject-reason');
const rejectSummary = byId('reject-booking-summary');
const rejectError = byId('reject-error');
const rejectCancel = byId('reject-cancel');
const rejectConfirm = byId('reject-confirm');

let rejectTarget = null;

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoginError('');
  setBusy(loginButton, true, 'Signing in…');
  const formData = new FormData(loginForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  try {
    const session = await api.login(email, password);
    loginForm.reset();
    accountName.textContent = session.user.fullName || session.user.email;
    accountRole.textContent = humanizeRole(session.user.role);
    loginView.hidden = true;
    portalView.hidden = false;
    await loadPortal();
  } catch (error) {
    setLoginError(messageFor(error));
  } finally {
    setBusy(loginButton, false, 'Sign in');
  }
});

logoutButton.addEventListener('click', () => logout());
refreshButton.addEventListener('click', () => loadPortal());
rejectCancel.addEventListener('click', () => closeRejectDialog());
rejectDialog.addEventListener('cancel', () => closeRejectDialog());

rejectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!rejectTarget) return;
  setRejectError('');
  setBusy(rejectConfirm, true, 'Rejecting…');
  try {
    await api.rejectBooking(rejectTarget.id, rejectReason.value);
    closeRejectDialog();
    showPortalMessage('Booking rejected.', false);
    await loadPortal({ preserveMessage: true });
  } catch (error) {
    if (isAuthFailure(error)) {
      logout('Your session is no longer authorized. Please sign in again.');
      return;
    }
    setRejectError(messageFor(error));
  } finally {
    setBusy(rejectConfirm, false, 'Reject booking');
  }
});

async function loadPortal({ preserveMessage = false } = {}) {
  if (!preserveMessage) hidePortalMessage();
  setBusy(refreshButton, true, 'Refreshing…');
  try {
    const [dashboard, bookings] = await Promise.all([api.dashboard(), api.pendingBookings()]);
    statPending.textContent = safeNumber(dashboard?.bookings?.pending);
    statActive.textContent = safeNumber(dashboard?.bookings?.active);
    statAvailable.textContent = safeNumber(dashboard?.equipment?.available);
    renderBookings(Array.isArray(bookings) ? bookings : []);
  } catch (error) {
    if (isAuthFailure(error)) {
      logout('Your session is no longer authorized. Please sign in again.');
      return;
    }
    showPortalMessage(messageFor(error), true);
  } finally {
    setBusy(refreshButton, false, 'Refresh');
  }
}

function renderBookings(bookings) {
  bookingsBody.replaceChildren();
  const pending = bookings.filter((booking) => booking?.status === 'PENDING');
  bookingsTable.hidden = pending.length === 0;
  emptyState.hidden = pending.length !== 0;

  for (const booking of pending) {
    const row = document.createElement('tr');
    row.append(
      stackCell(
        booking.user?.fullName || 'Unknown user',
        [booking.user?.studentId, booking.user?.email, booking.user?.role].filter(Boolean).join(' · '),
      ),
      stackCell(
        booking.equipment?.name || 'Unknown equipment',
        [booking.equipment?.inventoryTag, booking.equipment?.location].filter(Boolean).join(' · '),
      ),
      stackCell(formatDateTime(booking.startTime), `to ${formatDateTime(booking.endTime)}`),
      textCell(booking.reason || '—'),
      actionCell(booking),
    );
    bookingsBody.append(row);
  }
}

function actionCell(booking) {
  const td = document.createElement('td');
  const wrapper = document.createElement('div');
  wrapper.className = 'actions';

  const approve = document.createElement('button');
  approve.type = 'button';
  approve.className = 'approve';
  approve.textContent = 'Approve';
  approve.addEventListener('click', async () => {
    if (!globalThis.confirm(`Approve booking for ${booking.user?.fullName || 'this requester'}?`)) return;
    setBusy(approve, true, 'Approving…');
    try {
      await api.approveBooking(booking.id);
      showPortalMessage('Booking approved.', false);
      await loadPortal({ preserveMessage: true });
    } catch (error) {
      if (isAuthFailure(error)) {
        logout('Your session is no longer authorized. Please sign in again.');
        return;
      }
      showPortalMessage(messageFor(error), true);
    } finally {
      setBusy(approve, false, 'Approve');
    }
  });

  const reject = document.createElement('button');
  reject.type = 'button';
  reject.className = 'reject';
  reject.textContent = 'Reject';
  reject.addEventListener('click', () => openRejectDialog(booking));

  wrapper.append(approve, reject);
  td.append(wrapper);
  return td;
}

function openRejectDialog(booking) {
  rejectTarget = booking;
  rejectReason.value = '';
  setRejectError('');
  rejectSummary.textContent = `${booking.user?.fullName || 'Requester'} · ${booking.equipment?.name || 'Equipment'}`;
  rejectDialog.showModal();
  rejectReason.focus();
}

function closeRejectDialog() {
  rejectTarget = null;
  rejectReason.value = '';
  setRejectError('');
  if (rejectDialog.open) rejectDialog.close();
}

function logout(message = '') {
  api.clearSession();
  portalView.hidden = true;
  loginView.hidden = false;
  bookingsBody.replaceChildren();
  statPending.textContent = '—';
  statActive.textContent = '—';
  statAvailable.textContent = '—';
  closeRejectDialog();
  if (message) setLoginError(message);
  byId('email').focus();
}

function stackCell(primary, secondary = '') {
  const td = document.createElement('td');
  const wrap = document.createElement('div');
  wrap.className = 'cell-stack';
  const strong = document.createElement('strong');
  strong.textContent = primary;
  wrap.append(strong);
  if (secondary) {
    const small = document.createElement('small');
    small.textContent = secondary;
    wrap.append(small);
  }
  td.append(wrap);
  return td;
}

function textCell(value) {
  const td = document.createElement('td');
  td.textContent = value;
  return td;
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function humanizeRole(value) {
  return String(value || '').toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : '—';
}

function setBusy(button, busy, text) {
  button.disabled = busy;
  button.textContent = text;
}

function setLoginError(message) {
  loginError.textContent = message;
  loginError.hidden = !message;
}

function setRejectError(message) {
  rejectError.textContent = message;
  rejectError.hidden = !message;
}

function showPortalMessage(message, error) {
  portalMessage.textContent = message;
  portalMessage.classList.toggle('is-error', Boolean(error));
  portalMessage.hidden = false;
}

function hidePortalMessage() {
  portalMessage.hidden = true;
  portalMessage.textContent = '';
  portalMessage.classList.remove('is-error');
}

function messageFor(error) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

function isAuthFailure(error) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

function byId(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element;
}
