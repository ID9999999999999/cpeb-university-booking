import { ApiError, CpebAdminApi } from './api.js';

const config = globalThis.CPEB_ADMIN_CONFIG || {};
const api = new CpebAdminApi(config.apiBaseUrl || 'http://localhost:3000');
const SAFE_EQUIPMENT_STATUSES = Object.freeze(['AVAILABLE', 'RESERVED', 'LOST', 'RETIRED']);
const WORKFLOW_EQUIPMENT_STATUSES = new Set(['CHECKED_OUT', 'UNDER_MAINTENANCE']);

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
const historySearch = byId('history-search');
const historyStatus = byId('history-status');
const historyClear = byId('history-clear');
const historyCount = byId('history-count');
const historyTable = byId('history-table');
const historyBody = byId('history-body');
const historyEmpty = byId('history-empty');
const equipmentSearch = byId('equipment-search');
const equipmentCategory = byId('equipment-category');
const equipmentStatus = byId('equipment-status');
const equipmentClear = byId('equipment-clear');
const equipmentCount = byId('equipment-count');
const equipmentTable = byId('equipment-table');
const equipmentBody = byId('equipment-body');
const equipmentEmpty = byId('equipment-empty');
const rejectDialog = byId('reject-dialog');
const rejectForm = byId('reject-form');
const rejectReason = byId('reject-reason');
const rejectSummary = byId('reject-booking-summary');
const rejectError = byId('reject-error');
const rejectCancel = byId('reject-cancel');
const rejectConfirm = byId('reject-confirm');

let rejectTarget = null;
let equipmentSearchTimer = null;
let equipmentRequestId = 0;
let bookingHistoryRequestId = 0;
let cachedBookingHistory = [];
let currentRole = null;

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
    currentRole = session.user.role;
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

historySearch.addEventListener('input', () => renderBookingHistory(cachedBookingHistory));
historyStatus.addEventListener('change', () => loadBookingHistory());
historyClear.addEventListener('click', () => {
  historySearch.value = '';
  historyStatus.value = '';
  historySearch.focus();
  loadBookingHistory();
});

equipmentSearch.addEventListener('input', () => {
  globalThis.clearTimeout(equipmentSearchTimer);
  equipmentSearchTimer = globalThis.setTimeout(() => loadEquipment(), 300);
});
equipmentCategory.addEventListener('change', () => loadEquipment());
equipmentStatus.addEventListener('change', () => loadEquipment());
equipmentClear.addEventListener('click', () => {
  equipmentSearch.value = '';
  equipmentCategory.value = '';
  equipmentStatus.value = '';
  equipmentSearch.focus();
  loadEquipment();
});

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
    await Promise.all([
      loadBookingHistory({ preserveMessage: true }),
      loadEquipment({ preserveMessage: true }),
    ]);
  } catch (error) {
    if (isAuthFailure(error)) {
      logout('Your session is no longer authorized. Please sign in again.');
      return;
    }
    showPortalMessage(messageFor(error), true);
  } finally {
    setBusy(refreshButton, false, 'Refresh all');
  }
}

async function loadBookingHistory({ preserveMessage = false } = {}) {
  if (!api.hasSession()) return;
  if (!preserveMessage) hidePortalMessage();
  const requestId = ++bookingHistoryRequestId;
  historyTable.setAttribute('aria-busy', 'true');
  historyCount.textContent = 'Loading…';

  try {
    const bookings = await api.bookings(historyStatus.value);
    if (requestId !== bookingHistoryRequestId) return;
    cachedBookingHistory = Array.isArray(bookings) ? bookings : [];
    renderBookingHistory(cachedBookingHistory);
  } catch (error) {
    if (requestId !== bookingHistoryRequestId) return;
    if (isAuthFailure(error)) {
      logout('Your session is no longer authorized. Please sign in again.');
      return;
    }
    cachedBookingHistory = [];
    historyBody.replaceChildren();
    historyTable.hidden = true;
    historyEmpty.hidden = false;
    historyEmpty.textContent = 'Booking history could not be loaded.';
    historyCount.textContent = '— bookings';
    showPortalMessage(messageFor(error), true);
  } finally {
    if (requestId === bookingHistoryRequestId) historyTable.removeAttribute('aria-busy');
  }
}

async function loadEquipment({ preserveMessage = false } = {}) {
  if (!api.hasSession()) return;
  if (!preserveMessage) hidePortalMessage();
  const requestId = ++equipmentRequestId;
  equipmentTable.setAttribute('aria-busy', 'true');
  equipmentCount.textContent = 'Loading…';

  try {
    const equipment = await api.equipment({
      q: equipmentSearch.value,
      category: equipmentCategory.value,
      status: equipmentStatus.value,
    });
    if (requestId !== equipmentRequestId) return;
    renderEquipment(Array.isArray(equipment) ? equipment : []);
  } catch (error) {
    if (requestId !== equipmentRequestId) return;
    if (isAuthFailure(error)) {
      logout('Your session is no longer authorized. Please sign in again.');
      return;
    }
    equipmentBody.replaceChildren();
    equipmentTable.hidden = true;
    equipmentEmpty.hidden = false;
    equipmentEmpty.textContent = 'Equipment inventory could not be loaded.';
    equipmentCount.textContent = '— resources';
    showPortalMessage(messageFor(error), true);
  } finally {
    if (requestId === equipmentRequestId) equipmentTable.removeAttribute('aria-busy');
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

function renderBookingHistory(bookings) {
  const search = historySearch.value.trim().toLowerCase();
  const filtered = bookings
    .filter((booking) => {
      if (!search) return true;
      return [
        booking?.user?.fullName,
        booking?.user?.studentId,
        booking?.user?.email,
        booking?.equipment?.name,
        booking?.equipment?.inventoryTag,
        booking?.equipment?.location,
        booking?.reason,
        booking?.status,
      ].some((value) => String(value || '').toLowerCase().includes(search));
    })
    .slice()
    .sort((a, b) => safeDateMillis(b?.startTime) - safeDateMillis(a?.startTime));

  historyBody.replaceChildren();
  historyTable.hidden = filtered.length === 0;
  historyEmpty.hidden = filtered.length !== 0;
  historyEmpty.textContent = 'No bookings match these filters.';
  historyCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'booking' : 'bookings'}`;

  for (const booking of filtered) {
    const statusCell = document.createElement('td');
    statusCell.append(statusBadge(booking?.status));
    const row = document.createElement('tr');
    row.append(
      stackCell(
        booking?.user?.fullName || 'Unknown user',
        [booking?.user?.studentId, booking?.user?.email].filter(Boolean).join(' · '),
      ),
      stackCell(
        booking?.equipment?.name || 'Unknown equipment',
        booking?.equipment?.inventoryTag || '',
      ),
      stackCell(formatDateTime(booking?.startTime), `to ${formatDateTime(booking?.endTime)}`),
      statusCell,
      textCell(booking?.reason || '—'),
    );
    historyBody.append(row);
  }
}

function renderEquipment(equipment) {
  equipmentBody.replaceChildren();
  equipmentTable.hidden = equipment.length === 0;
  equipmentEmpty.hidden = equipment.length !== 0;
  equipmentEmpty.textContent = 'No equipment matches these filters.';
  equipmentCount.textContent = `${equipment.length} ${equipment.length === 1 ? 'resource' : 'resources'}`;

  for (const item of equipment) {
    const row = document.createElement('tr');
    const statusCell = document.createElement('td');
    statusCell.append(statusBadge(item?.status));
    row.append(
      stackCell(item?.name || 'Unnamed resource', item?.inventoryTag || 'No inventory tag'),
      textCell(humanizeRole(item?.category || 'Unknown')),
      textCell(item?.location || 'University campus'),
      statusCell,
      equipmentActionCell(item),
    );
    equipmentBody.append(row);
  }
}

function equipmentActionCell(item) {
  const td = document.createElement('td');
  const status = String(item?.status || '').toUpperCase();

  if (currentRole !== 'ADMIN') {
    const note = document.createElement('span');
    note.className = 'read-only-note';
    note.textContent = 'Read only';
    td.append(note);
    return td;
  }

  if (WORKFLOW_EQUIPMENT_STATUSES.has(status)) {
    const note = document.createElement('span');
    note.className = 'workflow-note';
    note.textContent = 'Managed by workflow';
    td.append(note);
    return td;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'equipment-actions';
  const select = document.createElement('select');
  select.className = 'compact-select';
  select.setAttribute('aria-label', `New status for ${item?.name || 'equipment'}`);

  for (const value of SAFE_EQUIPMENT_STATUSES) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = humanizeRole(value);
    select.append(option);
  }
  if (SAFE_EQUIPMENT_STATUSES.includes(status)) select.value = status;

  const update = document.createElement('button');
  update.type = 'button';
  update.className = 'secondary compact-button';
  update.textContent = 'Update';
  update.disabled = select.value === status;
  select.addEventListener('change', () => {
    update.disabled = select.value === status;
  });

  update.addEventListener('click', async () => {
    const targetStatus = select.value;
    if (!targetStatus || targetStatus === status) return;
    const resourceName = item?.name || 'this resource';
    if (!globalThis.confirm(`Change ${resourceName} from ${humanizeRole(status)} to ${humanizeRole(targetStatus)}?`)) return;

    setBusy(update, true, 'Updating…');
    select.disabled = true;
    try {
      await api.updateEquipmentStatus(item.id, targetStatus);
      showPortalMessage(`${resourceName} is now ${humanizeRole(targetStatus)}.`, false);
      await loadPortal({ preserveMessage: true });
    } catch (error) {
      if (isAuthFailure(error)) {
        logout('Your session is no longer authorized. Please sign in again.');
        return;
      }
      showPortalMessage(messageFor(error), true);
    } finally {
      select.disabled = false;
      setBusy(update, false, 'Update');
    }
  });

  wrapper.append(select, update);
  td.append(wrapper);
  return td;
}

function statusBadge(value) {
  const normalized = String(value || 'UNKNOWN').toUpperCase();
  const badge = document.createElement('span');
  badge.className = `status-badge status-${normalized.toLowerCase().replaceAll('_', '-')}`;
  badge.textContent = humanizeRole(normalized);
  return badge;
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
  currentRole = null;
  globalThis.clearTimeout(equipmentSearchTimer);
  equipmentRequestId += 1;
  bookingHistoryRequestId += 1;
  cachedBookingHistory = [];
  portalView.hidden = true;
  loginView.hidden = false;
  bookingsBody.replaceChildren();
  historyBody.replaceChildren();
  equipmentBody.replaceChildren();
  bookingsTable.hidden = true;
  historyTable.hidden = true;
  equipmentTable.hidden = true;
  historyEmpty.hidden = true;
  equipmentEmpty.hidden = true;
  historyCount.textContent = '— bookings';
  equipmentCount.textContent = '— resources';
  historySearch.value = '';
  historyStatus.value = '';
  equipmentSearch.value = '';
  equipmentCategory.value = '';
  equipmentStatus.value = '';
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

function safeDateMillis(value) {
  const date = new Date(value || 0);
  const millis = date.getTime();
  return Number.isFinite(millis) ? millis : 0;
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
