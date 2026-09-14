import { ApiError, CpebAdminApi } from './api.js';

const config = globalThis.CPEB_ADMIN_CONFIG || {};
const api = new CpebAdminApi(config.apiBaseUrl || 'http://localhost:3000');

const REPORT_TRANSITIONS = Object.freeze({
  OPEN: ['DIAGNOSING'],
  DIAGNOSING: ['WAITING_PARTS', 'READY_FOR_TEST'],
  WAITING_PARTS: ['DIAGNOSING', 'READY_FOR_TEST'],
  READY_FOR_TEST: ['DIAGNOSING', 'RESOLVED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
});
const MAINTENANCE_TRANSITIONS = Object.freeze({
  SCHEDULED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
});

const loginView = byId('ops-login-view');
const opsView = byId('ops-view');
const loginForm = byId('ops-login-form');
const loginButton = byId('ops-login-button');
const loginError = byId('ops-login-error');
const accountName = byId('ops-account-name');
const accountRole = byId('ops-account-role');
const logoutButton = byId('ops-logout');
const refreshButton = byId('ops-refresh');
const message = byId('ops-message');
const reportsStatus = byId('reports-status');
const reportsSearch = byId('reports-search');
const reportsCount = byId('reports-count');
const reportsTable = byId('reports-table');
const reportsBody = byId('reports-body');
const reportsEmpty = byId('reports-empty');
const maintenanceStatus = byId('maintenance-status');
const maintenanceSearch = byId('maintenance-search');
const maintenanceCount = byId('maintenance-count');
const maintenanceTable = byId('maintenance-table');
const maintenanceBody = byId('maintenance-body');
const maintenanceEmpty = byId('maintenance-empty');
const openReportsStat = byId('ops-open-reports');
const activeMaintenanceStat = byId('ops-active-maintenance');
const scheduledMaintenanceStat = byId('ops-scheduled-maintenance');
const maintenanceCreate = byId('maintenance-create');
const maintenanceDialog = byId('maintenance-dialog');
const maintenanceForm = byId('maintenance-form');
const maintenanceEquipment = byId('maintenance-equipment');
const maintenanceTitleInput = byId('maintenance-title-input');
const maintenanceDescription = byId('maintenance-description');
const maintenanceStart = byId('maintenance-start');
const maintenanceEnd = byId('maintenance-end');
const maintenanceFormError = byId('maintenance-form-error');
const maintenanceCancel = byId('maintenance-cancel');
const maintenanceSubmit = byId('maintenance-submit');

let reports = [];
let maintenance = [];
let equipment = [];

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoginError('');
  setBusy(loginButton, true, 'Signing in…');
  const data = new FormData(loginForm);
  try {
    const session = await api.login(String(data.get('email') || '').trim(), String(data.get('password') || ''));
    accountName.textContent = session.user.fullName || session.user.email;
    accountRole.textContent = humanize(session.user.role);
    loginForm.reset();
    loginView.hidden = true;
    opsView.hidden = false;
    await refreshOperations();
  } catch (error) {
    setLoginError(messageFor(error));
  } finally {
    setBusy(loginButton, false, 'Sign in');
  }
});

logoutButton.addEventListener('click', () => logout());
refreshButton.addEventListener('click', () => refreshOperations());
reportsStatus.addEventListener('change', renderReports);
reportsSearch.addEventListener('input', renderReports);
maintenanceStatus.addEventListener('change', renderMaintenance);
maintenanceSearch.addEventListener('input', renderMaintenance);
maintenanceCreate.addEventListener('click', () => openMaintenanceDialog());
maintenanceCancel.addEventListener('click', () => closeMaintenanceDialog());
maintenanceDialog.addEventListener('cancel', () => closeMaintenanceDialog());

maintenanceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMaintenanceFormError('');
  const start = localInputToIso(maintenanceStart.value);
  const end = localInputToIso(maintenanceEnd.value);
  if (!start || !end) {
    setMaintenanceFormError('Valid start and end times are required.');
    return;
  }
  if (new Date(start).getTime() >= new Date(end).getTime()) {
    setMaintenanceFormError('Maintenance must end after it starts.');
    return;
  }

  setBusy(maintenanceSubmit, true, 'Scheduling…');
  try {
    await api.createMaintenance({
      equipmentId: maintenanceEquipment.value,
      title: maintenanceTitleInput.value,
      description: maintenanceDescription.value,
      startTime: start,
      endTime: end,
    });
    closeMaintenanceDialog();
    showMessage('Maintenance scheduled successfully.', false);
    await refreshOperations({ preserveMessage: true });
  } catch (error) {
    if (isAuthFailure(error)) {
      closeMaintenanceDialog();
      logout('Your session is no longer authorized. Please sign in again.');
      return;
    }
    setMaintenanceFormError(messageFor(error));
  } finally {
    setBusy(maintenanceSubmit, false, 'Schedule');
  }
});

async function refreshOperations({ preserveMessage = false } = {}) {
  if (!api.hasSession()) return;
  if (!preserveMessage) hideMessage();
  setBusy(refreshButton, true, 'Refreshing…');
  try {
    const [reportData, maintenanceData, equipmentData] = await Promise.all([
      api.reports(),
      api.maintenance(),
      api.equipment(),
    ]);
    reports = Array.isArray(reportData) ? reportData : [];
    maintenance = Array.isArray(maintenanceData) ? maintenanceData : [];
    equipment = Array.isArray(equipmentData) ? equipmentData : [];
    renderStats();
    renderReports();
    renderMaintenance();
    renderEquipmentOptions();
  } catch (error) {
    if (isAuthFailure(error)) {
      logout('Your session is no longer authorized. Please sign in again.');
      return;
    }
    showMessage(messageFor(error), true);
  } finally {
    setBusy(refreshButton, false, 'Refresh');
  }
}

function renderStats() {
  openReportsStat.textContent = String(reports.filter((item) => item?.status !== 'CLOSED').length);
  activeMaintenanceStat.textContent = String(maintenance.filter((item) => item?.status === 'ACTIVE').length);
  scheduledMaintenanceStat.textContent = String(maintenance.filter((item) => item?.status === 'SCHEDULED').length);
}

function renderReports() {
  reportsBody.replaceChildren();
  const status = reportsStatus.value;
  const query = reportsSearch.value.trim().toLowerCase();
  const filtered = reports.filter((item) => {
    if (status && item?.status !== status) return false;
    if (!query) return true;
    return [
      item?.title,
      item?.description,
      item?.diagnosis,
      item?.equipment?.name,
      item?.equipment?.inventoryTag,
      item?.equipment?.location,
      item?.reporter?.fullName,
      item?.reporter?.email,
      item?.technician?.fullName,
      item?.technician?.email,
      item?.status,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
  });

  reportsCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'report' : 'reports'}`;
  reportsTable.hidden = filtered.length === 0;
  reportsEmpty.hidden = filtered.length !== 0;

  for (const item of filtered) {
    const row = document.createElement('tr');
    row.append(
      detailCell(item?.title || 'Untitled report', item?.description || item?.diagnosis || ''),
      detailCell(item?.equipment?.name || 'Unknown equipment', [item?.equipment?.inventoryTag, item?.equipment?.location].filter(Boolean).join(' · ')),
      detailCell(item?.reporter?.fullName || 'Unknown reporter', item?.technician?.fullName ? `Technician: ${item.technician.fullName}` : 'Unassigned'),
      statusCell(item?.status),
      reportActions(item),
    );
    reportsBody.append(row);
  }
}

function renderMaintenance() {
  maintenanceBody.replaceChildren();
  const status = maintenanceStatus.value;
  const query = maintenanceSearch.value.trim().toLowerCase();
  const filtered = maintenance.filter((item) => {
    if (status && item?.status !== status) return false;
    if (!query) return true;
    return [item?.title, item?.description, item?.equipment?.name, item?.equipment?.inventoryTag, item?.equipment?.location, item?.status]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
  });

  maintenanceCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'}`;
  maintenanceTable.hidden = filtered.length === 0;
  maintenanceEmpty.hidden = filtered.length !== 0;

  for (const item of filtered) {
    const row = document.createElement('tr');
    row.append(
      detailCell(item?.title || 'Maintenance', item?.description || ''),
      detailCell(item?.equipment?.name || 'Unknown equipment', [item?.equipment?.inventoryTag, item?.equipment?.location].filter(Boolean).join(' · ')),
      detailCell(formatDateTime(item?.startTime), `to ${formatDateTime(item?.endTime)}`),
      statusCell(item?.status),
      maintenanceActions(item),
    );
    maintenanceBody.append(row);
  }
}

function renderEquipmentOptions() {
  const previous = maintenanceEquipment.value;
  maintenanceEquipment.replaceChildren();
  const eligible = equipment
    .filter((item) => !['LOST', 'RETIRED'].includes(String(item?.status || '').toUpperCase()))
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

  for (const item of eligible) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = [item?.name, item?.inventoryTag, item?.location].filter(Boolean).join(' · ');
    maintenanceEquipment.append(option);
  }
  if (eligible.some((item) => item.id === previous)) maintenanceEquipment.value = previous;
  maintenanceCreate.disabled = eligible.length === 0;
}

function openMaintenanceDialog() {
  if (maintenanceEquipment.options.length === 0) {
    showMessage('No eligible equipment is available for maintenance scheduling.', true);
    return;
  }
  maintenanceForm.reset();
  renderEquipmentOptions();
  setMaintenanceFormError('');
  const now = new Date();
  now.setSeconds(0, 0);
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  maintenanceStart.value = toLocalInputValue(start);
  maintenanceEnd.value = toLocalInputValue(end);
  maintenanceDialog.showModal();
  maintenanceEquipment.focus();
}

function closeMaintenanceDialog() {
  setMaintenanceFormError('');
  if (maintenanceDialog.open) maintenanceDialog.close();
}

function reportActions(item) {
  const td = document.createElement('td');
  const current = String(item?.status || '').toUpperCase();
  const next = REPORT_TRANSITIONS[current] || [];
  if (next.length === 0) {
    td.append(note('Workflow complete'));
    return td;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'ops-actions';
  const select = createStatusSelect(next, `Next status for ${item?.title || 'report'}`);
  const button = actionButton('Update');
  button.addEventListener('click', async () => {
    const target = select.value;
    if (!target) return;
    let diagnosis = '';
    if (target === 'RESOLVED' && !String(item?.diagnosis || '').trim()) {
      diagnosis = globalThis.prompt('Diagnosis is required before resolving this report:', '') || '';
      if (!diagnosis.trim()) {
        showMessage('A diagnosis is required before resolving a report.', true);
        return;
      }
    }
    if (!globalThis.confirm(`Change report from ${humanize(current)} to ${humanize(target)}?`)) return;
    setBusy(button, true, 'Updating…');
    select.disabled = true;
    try {
      await api.updateReportStatus(item.id, target, diagnosis);
      showMessage(`Report moved to ${humanize(target)}.`, false);
      await refreshOperations({ preserveMessage: true });
    } catch (error) {
      handleActionError(error);
    } finally {
      select.disabled = false;
      setBusy(button, false, 'Update');
    }
  });
  wrapper.append(select, button);
  td.append(wrapper);
  return td;
}

function maintenanceActions(item) {
  const td = document.createElement('td');
  const current = String(item?.status || '').toUpperCase();
  const next = MAINTENANCE_TRANSITIONS[current] || [];
  if (next.length === 0) {
    td.append(note('Workflow complete'));
    return td;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'ops-actions';
  const select = createStatusSelect(next, `Next status for ${item?.title || 'maintenance'}`);
  const button = actionButton('Update');
  button.addEventListener('click', async () => {
    const target = select.value;
    if (!target) return;
    if (!globalThis.confirm(`Change maintenance from ${humanize(current)} to ${humanize(target)}?`)) return;
    setBusy(button, true, 'Updating…');
    select.disabled = true;
    try {
      await api.updateMaintenanceStatus(item.id, target);
      showMessage(`Maintenance moved to ${humanize(target)}.`, false);
      await refreshOperations({ preserveMessage: true });
    } catch (error) {
      handleActionError(error);
    } finally {
      select.disabled = false;
      setBusy(button, false, 'Update');
    }
  });
  wrapper.append(select, button);
  td.append(wrapper);
  return td;
}

function createStatusSelect(values, label) {
  const select = document.createElement('select');
  select.setAttribute('aria-label', label);
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = humanize(value);
    select.append(option);
  }
  return select;
}

function actionButton(text) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.textContent = text;
  return button;
}

function detailCell(primary, secondary = '') {
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

function statusCell(value) {
  const td = document.createElement('td');
  const badge = document.createElement('span');
  const normalized = String(value || 'UNKNOWN').toUpperCase();
  badge.className = 'ops-status';
  badge.dataset.tone = toneFor(normalized);
  badge.textContent = humanize(normalized);
  td.append(badge);
  return td;
}

function toneFor(status) {
  if (['RESOLVED', 'CLOSED', 'COMPLETED'].includes(status)) return 'good';
  if (['CANCELLED'].includes(status)) return 'bad';
  if (['DIAGNOSING', 'READY_FOR_TEST', 'ACTIVE'].includes(status)) return 'active';
  return 'open';
}

function note(text) {
  const span = document.createElement('span');
  span.className = 'ops-note';
  span.textContent = text;
  return span;
}

function localInputToIso(value) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toLocalInputValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function humanize(value) {
  return String(value || '').toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function handleActionError(error) {
  if (isAuthFailure(error)) {
    logout('Your session is no longer authorized. Please sign in again.');
    return;
  }
  showMessage(messageFor(error), true);
}

function logout(text = '') {
  api.clearSession();
  reports = [];
  maintenance = [];
  equipment = [];
  reportsBody.replaceChildren();
  maintenanceBody.replaceChildren();
  maintenanceEquipment.replaceChildren();
  closeMaintenanceDialog();
  opsView.hidden = true;
  loginView.hidden = false;
  hideMessage();
  if (text) setLoginError(text);
  byId('ops-email').focus();
}

function showMessage(text, error) {
  message.textContent = text;
  message.classList.toggle('is-error', Boolean(error));
  message.hidden = false;
}

function hideMessage() {
  message.hidden = true;
  message.textContent = '';
  message.classList.remove('is-error');
}

function setLoginError(text) {
  loginError.textContent = text;
  loginError.hidden = !text;
}

function setMaintenanceFormError(text) {
  maintenanceFormError.textContent = text;
  maintenanceFormError.hidden = !text;
}

function setBusy(button, busy, text) {
  button.disabled = busy;
  button.textContent = text;
}

function messageFor(error) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
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
