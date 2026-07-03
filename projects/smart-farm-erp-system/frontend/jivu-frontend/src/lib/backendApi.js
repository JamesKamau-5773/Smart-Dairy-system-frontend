import axios from 'axios';
import apiClient from './apiClient';
import { httpClientConfig } from './httpClientConfig';
import { getPermissionSet, getRoleSet, normalizeRole } from './roles';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const HEALTH_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  ...httpClientConfig,
});

authClient.interceptors.request.use((config) => {
  const sessionStr = sessionStorage.getItem('jivu_user');

  if (sessionStr) {
    const session = JSON.parse(sessionStr);

    if (session?.token) {
      config.headers['Authorization'] = `Bearer ${session.token}`;
    }

    const scopedTenantId = session?.tenant_id ?? session?.cooperative_id;
    if (scopedTenantId) {
      config.headers['X-Tenant-ID'] = scopedTenantId;
    }

    if (session?.farm_id) {
      config.headers['X-Farm-ID'] = session.farm_id;
    }
  }

  return config;
}, (error) => Promise.reject(error));

const healthClient = axios.create({
  baseURL: HEALTH_BASE_URL,
  timeout: 10000,
  ...httpClientConfig,
});

const ALIASABLE_STATUSES = new Set([404, 405, 501]);

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.records)) return value.records;
  if (Array.isArray(value?.runs)) return value.runs;
  if (Array.isArray(value?.payrollRuns)) return value.payrollRuns;
  if (Array.isArray(value?.employees)) return value.employees;
  if (Array.isArray(value?.staff)) return value.staff;

  return [];
};

const toObject = (value) => {
  if (!value) {
    return null;
  }

  if (value.data && !Array.isArray(value.data)) return value.data;
  if (value.user) return value.user;
  if (value.session) return value.session;
  if (value.record) return value.record;
  if (value.run) return value.run;

  return value;
};

function canUseAlias(error) {
  const status = error?.response?.status;
  return !status || ALIASABLE_STATUSES.has(status);
}

async function requestWithFallback(client, requests) {
  let lastError = null;

  for (const request of requests) {
    try {
      return await client.request(request);
    } catch (error) {
      lastError = error;

      if (!canUseAlias(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

const parseCsvList = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

export function normalizeSessionUser(payload) {
  const session = toObject(payload);

  if (!session) {
    return null;
  }

  if (typeof session !== 'object') {
    return {
      token: payload?.access_token ?? payload?.accessToken ?? payload?.token ?? null,
      raw: payload,
    };
  }

  const tenantId = session.tenant_id ?? session.tenantId ?? session.cooperative_id ?? session.cooperativeId ?? null;
  const tenantName = session.tenant_name ?? session.tenantName ?? session.cooperative_name ?? session.cooperativeName ?? null;
  const cooperativeId = session.cooperative_id ?? session.cooperativeId ?? session.tenant_id ?? session.tenantId ?? null;
  const cooperativeName = session.cooperative_name ?? session.cooperativeName ?? session.tenant_name ?? session.tenantName ?? null;
  const roleSet = getRoleSet(session);
  const permissionSet = getPermissionSet(session);
  const organizationRole = session.organization_role
    ?? session.organizational_role
    ?? session.org_role
    ?? normalizeRole(session);
  const operationalRole = session.operational_role
    ?? session.farm_role
    ?? roleSet.find((role) => !['SUPER_ADMIN', 'ADMIN', 'FARM_ADMIN'].includes(role))
    ?? null;

  return {
    ...session,
    role: normalizeRole(session),
    role_set: roleSet,
    permission_set: permissionSet,
    organization_role: organizationRole,
    operational_role: operationalRole,
    farm_role: session.farm_role ?? operationalRole,
    token: session.token ?? session.access_token ?? session.accessToken ?? payload?.token ?? payload?.access_token ?? payload?.accessToken ?? null,
    tenant_id: tenantId,
    tenant_name: tenantName,
    cooperative_id: cooperativeId,
    cooperative_name: cooperativeName,
    tenant_type: session.tenant_type ?? session.tenantType ?? 'single',
    farm_id: session.farm_id ?? session.farmId ?? null,
    farm_name: session.farm_name ?? session.farmName ?? null,
    available_farms: session.available_farms ?? session.availableFarms ?? [],
  };
}

export function normalizeTenantProfile(payload, fallback = {}) {
  const profile = toObject(payload) ?? {};
  const tenantId = profile.tenant_id ?? profile.tenantId ?? profile.cooperative_id ?? profile.cooperativeId ?? fallback.tenant_id ?? fallback.cooperative_id ?? null;
  const tenantName = profile.tenant_name ?? profile.tenantName ?? profile.cooperative_name ?? profile.cooperativeName ?? fallback.tenant_name ?? fallback.cooperative_name ?? null;

  const mergedRoleSource = { ...fallback, ...profile };
  const roleSet = getRoleSet(mergedRoleSource);
  const permissionSet = getPermissionSet(mergedRoleSource);

  return {
    ...fallback,
    ...profile,
    role: normalizeRole(profile.role ? profile : fallback),
    role_set: roleSet,
    permission_set: permissionSet,
    organization_role: profile.organization_role ?? profile.organizational_role ?? profile.org_role ?? fallback.organization_role ?? fallback.organizational_role ?? normalizeRole(mergedRoleSource),
    operational_role: profile.operational_role ?? profile.farm_role ?? fallback.operational_role ?? fallback.farm_role ?? roleSet.find((role) => !['SUPER_ADMIN', 'ADMIN', 'FARM_ADMIN'].includes(role)) ?? null,
    farm_role: profile.farm_role ?? profile.operational_role ?? fallback.farm_role ?? fallback.operational_role ?? null,
    tenant_id: tenantId,
    cooperative_id: profile.cooperative_id ?? profile.cooperativeId ?? tenantId,
    tenant_name: tenantName,
    cooperative_name: profile.cooperative_name ?? profile.cooperativeName ?? tenantName,
    tenant_type: profile.tenant_type ?? profile.tenantType ?? fallback.tenant_type ?? 'single',
    farm_id: profile.farm_id ?? profile.farmId ?? fallback.farm_id ?? null,
    farm_name: profile.farm_name ?? profile.farmName ?? fallback.farm_name ?? null,
    available_farms: profile.available_farms ?? profile.availableFarms ?? fallback.available_farms ?? [],
  };
}

export function normalizeStaffRecord(record = {}) {
  return {
    ...record,
    id: record.id ?? record.staffId ?? record.employee_id ?? record.employeeId ?? null,
    name: record.name ?? '',
    role: record.role ?? '',
    status: record.status ?? 'ACTIVE',
    baseSalary: Number(record.baseSalary ?? record.base_salary ?? record.salary ?? 0),
    loanBalance: Number(record.loanBalance ?? record.loan_balance ?? 0),
    monthlyDeduction: Number(record.monthlyDeduction ?? record.monthly_deduction ?? 0),
    leaveType: record.leaveType ?? record.leave_type ?? '',
    leaveStartDate: record.leaveStartDate ?? record.leave_start_date ?? null,
    leaveEndDate: record.leaveEndDate ?? record.expectedReturnDate ?? record.leave_end_date ?? null,
    actualReturnDate: record.actualReturnDate ?? record.actual_return_date ?? null,
    unpaidLeaveDaysThisMonth: Number(record.unpaidLeaveDaysThisMonth ?? record.unpaid_leave_days_this_month ?? 0),
    medicalCertifications: parseCsvList(record.medicalCertifications ?? record.medical_certifications),
    medicalNotes: record.medicalNotes ?? record.medical_notes ?? '',
    returnVerifiedAt: record.returnVerifiedAt ?? record.return_verified_at ?? null,
    returnVerificationDecision: record.returnVerificationDecision ?? record.return_verification_decision ?? null,
    returnVerificationNote: record.returnVerificationNote ?? record.return_verification_note ?? '',
  };
}

export function normalizePayrollRow(row = {}) {
  const leaveDeduction = Number(row.leaveDeduction ?? row.leave_deduction ?? 0);
  const advanceDeduction = Number(row.advanceDeduction ?? row.advance_deduction ?? row.deductions ?? 0);
  const base = Number(row.base ?? row.baseSalary ?? row.base_salary ?? 0);
  const grossPay = Number(row.grossPay ?? row.gross_pay ?? Math.max(0, base - leaveDeduction));

  return {
    ...row,
    staffId: row.staffId ?? row.staff_id ?? row.id ?? null,
    name: row.name ?? '',
    role: row.role ?? '',
    base,
    approvedLeaveDays: Number(row.approvedLeaveDays ?? row.approved_leave_days ?? 0),
    overduePenaltyDays: Number(row.overduePenaltyDays ?? row.overdue_penalty_days ?? 0),
    leaveAdjustmentDays: Number(row.leaveAdjustmentDays ?? row.leave_adjustment_days ?? 0),
    leaveDeduction,
    grossPay,
    advanceDeduction,
    deductions: Number(row.deductions ?? leaveDeduction + advanceDeduction),
    net: Number(row.net ?? row.netPay ?? row.net_pay ?? Math.max(0, grossPay - advanceDeduction)),
    status: row.status ?? 'PENDING',
  };
}

export function normalizePayrollRun(run = {}) {
  const details = toArray(run.details).map(normalizePayrollRow);

  return {
    ...run,
    id: run.id ?? run.runId ?? run.payrollRunId ?? `run_${Date.now()}`,
    date: run.date ?? run.runDate ?? run.payrollDate ?? null,
    period: run.period ?? run.payPeriod ?? run.label ?? '',
    employees: Number(run.employees ?? run.employeeCount ?? details.length),
    totalDisbursed: Number(run.totalDisbursed ?? run.total_disbursed ?? details.reduce((acc, row) => acc + Number(row.net || 0), 0)),
    details,
  };
}

export function normalizeInventoryItem(item = {}) {
  const stockValue = item.stock?.value ?? item.stock ?? item.currentStock ?? item.quantity ?? item.qty ?? 0;
  const stockUnit = item.stock?.unit ?? item.stockUnit ?? item.unit ?? 'units';

  return {
    ...item,
    id: item.id ?? item.item_id ?? item.itemId ?? item.sku ?? null,
    name: item.name ?? item.item_name ?? '',
    sku: item.sku ?? item.code ?? item.item_code ?? '',
    category: item.category ?? item.group ?? 'Uncategorized',
    stock: {
      value: Number(stockValue),
      unit: stockUnit,
    },
    reorderLevel: Number(item.reorderLevel ?? item.reorder_level ?? item.threshold ?? 0),
  };
}

export function normalizeMedicalRecord(record = {}) {
  return {
    ...record,
    id: record.id ?? record.record_id ?? record.visit_id ?? null,
    date: record.date ?? record.visit_date ?? record.createdAt ?? record.created_at ?? new Date().toISOString().split('T')[0],
    cow: record.cow ?? record.cowTag ?? record.cow_tag ?? record.animal_name ?? record.animalId ?? '',
    reason: record.reason ?? record.symptoms ?? record.complaint ?? '',
    diagnosis: record.diagnosis ?? record.diagnosis_text ?? '',
    meds: record.meds ?? record.medications ?? record.treatment ?? '',
    recommendations: record.recommendations ?? record.notes ?? '',
    status: record.status ?? 'Under Treatment',
    severity: record.severity ?? 'Medium',
    vet: record.vet ?? record.vet_name ?? record.createdBy ?? '',
    followUp: record.followUp ?? record.follow_up ?? record.follow_up_date ?? null,
    createdAt: record.createdAt ?? record.created_at ?? null,
    updatedAt: record.updatedAt ?? record.updated_at ?? null,
    updatedBy: record.updatedBy ?? record.updated_by ?? null,
  };
}

const staffRoutes = (staffId) => (staffId
  ? [`/hr/staff/${staffId}`, `/hr/employees/${staffId}`]
  : ['/hr/staff', '/hr/employees']);

const verifyRoutes = (staffId) => [`/hr/staff/${staffId}/verify-return`, `/hr/employees/${staffId}/verify-return`];

const payrollRoutes = () => ['/hr/payroll/runs', '/hr/payroll-records', '/hr/payroll'];

const normalizeHerdPayload = (payload = {}) => ({
  ...payload,
  id: payload.id ?? payload.tag_number ?? payload.ear_tag ?? '',
  tag_number: payload.tag_number ?? payload.id ?? payload.ear_tag ?? '',
  dob: payload.dob ?? payload.date_of_birth ?? payload.dateOfBirth ?? null,
  date_of_birth: payload.date_of_birth ?? payload.dob ?? payload.dateOfBirth ?? null,
});

const normalizeInventoryPayload = (payload = {}) => {
  const unit = payload.unit ?? payload.stock?.unit ?? payload.stockUnit ?? '';

  return {
    ...payload,
    unit,
    stock: {
      ...(payload.stock ?? {}),
      value: Number(payload.stock?.value ?? payload.stock?.quantity ?? payload.stock?.qty ?? payload.stock ?? payload.quantity ?? 0),
      unit,
    },
  };
};

const normalizeRecipePayload = (payload = {}) => ({
  ...payload,
  recipeType: payload.recipeType ?? payload.recipe_type ?? '',
  recipe_type: payload.recipe_type ?? payload.recipeType ?? '',
  ingredients: Array.isArray(payload.ingredients) ? payload.ingredients : [],
});

const normalizeConversionPayload = (payload = {}) => {
  const context = payload.context ?? payload.material ?? '';
  const unitName = payload.unitName ?? payload.localUnit ?? payload.unit_name ?? '';
  const factor = Number(payload.factor ?? payload.ratio ?? 0);
  const baseUnit = payload.baseUnit ?? payload.base_unit ?? 'kg';

  return {
    ...payload,
    context,
    material: payload.material ?? context,
    unitName,
    unit_name: payload.unit_name ?? unitName,
    localUnit: payload.localUnit ?? unitName,
    factor,
    ratio: payload.ratio ?? factor,
    baseUnit,
    base_unit: payload.base_unit ?? baseUnit,
  };
};

export const authApi = {
  login(credentials) {
    const payload = {
      username: credentials?.username ?? credentials?.identifier ?? '',
      password: credentials?.password ?? '',
    };

    return authClient.post('/auth/login', payload).then((response) => normalizeSessionUser(response.data));
  },
  register(payload) {
    const requestBody = {
      farm_name: payload?.farm_name ?? payload?.farmName ?? payload?.full_name ?? payload?.workspace_name ?? '',
      full_name: payload?.full_name ?? payload?.fullName ?? '',
      cooperative_name: payload?.cooperative_name ?? payload?.cooperativeName ?? '',
      phone_number: payload?.phone_number ?? payload?.phoneNumber ?? payload?.phone ?? '',
      password: payload?.password ?? '',
      role: payload?.role ?? payload?.account_role ?? payload?.accountRole ?? undefined,
      organization_role: payload?.organization_role ?? payload?.organizationRole ?? undefined,
      tenant_type: payload?.tenant_type ?? payload?.tenantType ?? undefined,
      bootstrap_key: payload?.bootstrap_key ?? payload?.bootstrapKey ?? undefined,
      bootstrap_code: payload?.bootstrap_code ?? payload?.bootstrapCode ?? undefined,
    };

    return authClient.post('/auth/register', requestBody).then((response) => normalizeSessionUser(response.data));
  },
  logout() {
    return authClient.post('/auth/logout');
  },
  claimAccount(payload) {
    return authClient.post('/auth/claim-account', payload).then((response) => normalizeSessionUser(response.data));
  },
  switchFarm(farmId) {
    return authClient.post('/auth/switch-farm', { farm_id: farmId }).then((response) => normalizeSessionUser(response.data));
  },
  me() {
    return requestWithFallback(authClient, [
      { method: 'get', url: '/auth/me' },
      { method: 'get', url: '/auth/status' },
    ]).then((response) => normalizeSessionUser(response.data));
  },
  status() {
    return authClient.get('/auth/status').then((response) => normalizeSessionUser(response.data));
  },
};

export const productionApi = {
  summary() {
    return apiClient.get('/production/summary').then((response) => toObject(response.data));
  },
  listYield() {
    return apiClient.get('/production/yield').then((response) => toArray(response.data));
  },
  createYield(payload, config = {}) {
    return apiClient.post('/production/yield', payload, config).then((response) => toObject(response.data));
  },
  updateYield(yieldId, payload, config = {}) {
    return apiClient.patch(`/production/yield/${yieldId}`, payload, config).then((response) => toObject(response.data));
  },
  getYield(yieldId) {
    return apiClient.get(`/production/yield/${yieldId}`).then((response) => toObject(response.data));
  },
  deleteYield(yieldId) {
    return apiClient.delete(`/production/yield/${yieldId}`);
  },
  listMilkDropAlerts() {
    return apiClient.get('/operations/api/production/milk-drop-alerts').then((response) => toArray(response.data));
  },
  investigateMilkDropAlert(alertId, payload) {
    return apiClient.post(`/operations/api/production/milk-drop-alerts/${alertId}/investigate`, payload).then((response) => toObject(response.data));
  },
};

export const tenantApi = {
  profile() {
    return apiClient.get('/tenant/profile').then((response) => normalizeTenantProfile(response.data));
  },
};

export const onboardingApi = {
  createCooperative(payload) {
    return apiClient.post('/tenant/cooperatives', payload).then((response) => toObject(response.data));
  },

  createFirstAdmin(cooperativeId, payload) {
    return requestWithFallback(apiClient, [
      {
        method: 'post',
        url: `/tenant/cooperatives/${cooperativeId}/admins`,
        data: payload,
      },
      {
        method: 'post',
        url: `/tenant/cooperatives/${cooperativeId}/invites`,
        data: {
          ...payload,
          role: payload?.role ?? 'COOP_ADMIN',
        },
      },
    ]).then((response) => toObject(response.data));
  },

  inviteMember(payload) {
    return requestWithFallback(apiClient, [
      {
        method: 'post',
        url: '/tenant/members/invite',
        data: payload,
      },
      {
        method: 'post',
        url: '/tenant/invites',
        data: payload,
      },
    ]).then((response) => toObject(response.data));
  },

  importMembersCsv(file, extraPayload = {}) {
    const formData = new FormData();
    formData.append('file', file);

    Object.entries(extraPayload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, value);
      }
    });

    return requestWithFallback(apiClient, [
      {
        method: 'post',
        url: '/tenant/members/import',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      },
      {
        method: 'post',
        url: '/tenant/members/import-csv',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    ]).then((response) => toObject(response.data));
  },
};

export const hrApi = {
  async listStaff() {
    const response = await requestWithFallback(apiClient, staffRoutes().map((url) => ({ method: 'get', url })));
    return toArray(response.data).map(normalizeStaffRecord);
  },
  async createStaff(payload) {
    const response = await requestWithFallback(apiClient, staffRoutes().map((url) => ({ method: 'post', url, data: payload })));
    return normalizeStaffRecord(toObject(response.data) ?? payload);
  },
  async getStaff(staffId) {
    const response = await requestWithFallback(apiClient, staffRoutes(staffId).map((url) => ({ method: 'get', url })));
    return normalizeStaffRecord(toObject(response.data) ?? response.data);
  },
  async updateStaff(staffId, payload) {
    const response = await apiClient.patch(`/hr/staff/${staffId}`, payload);
    return normalizeStaffRecord(toObject(response.data) ?? payload);
  },
  async verifyReturn(staffId, payload) {
    const response = await requestWithFallback(apiClient, verifyRoutes(staffId).map((url) => ({ method: 'post', url, data: payload })));
    return normalizeStaffRecord(toObject(response.data) ?? payload);
  },
  async listPayrollRuns() {
    const response = await requestWithFallback(apiClient, payrollRoutes().map((url) => ({ method: 'get', url })));
    return toArray(response.data).map(normalizePayrollRun);
  },
  async runPayroll(payload = {}) {
    const response = await requestWithFallback(apiClient, payrollRoutes().map((url) => ({ method: 'post', url, data: payload })));
    const run = toObject(response.data) ?? response.data;
    return normalizePayrollRun(run);
  },
  async listPayrollRecords() {
    const response = await requestWithFallback(apiClient, ['/hr/payroll-records', '/hr/payroll'].map((url) => ({ method: 'get', url })));
    return toArray(response.data).map(normalizePayrollRun);
  },
};

export const financeApi = {
  customers() {
    return apiClient.get('/finance/customers').then((response) => toArray(response.data));
  },
  createCustomer(payload) {
    return apiClient.post('/finance/customers', payload).then((response) => toObject(response.data));
  },
  getCustomer(id) {
    return apiClient.get(`/finance/customers/${id}`).then((response) => toObject(response.data));
  },
  listBuyers() {
    return apiClient.get('/finance/buyers').then((response) => toArray(response.data));
  },
  getBuyerProfile(buyerId) {
    return apiClient.get(`/finance/buyers/${buyerId}`).then((response) => toObject(response.data));
  },
  createBuyer(payload) {
    return apiClient.post('/finance/buyers', payload).then((response) => toObject(response.data));
  },
  listLedger() {
    return apiClient.get('/finance/ledger').then((response) => toArray(response.data));
  },
  createLedgerEntry(payload) {
    return apiClient.post('/finance/ledger', payload).then((response) => toObject(response.data));
  },
  unitCost() {
    return apiClient.get('/finance/unit-cost').then((response) => toObject(response.data));
  },
  statement(token) {
    return apiClient.get(`/finance/statements/${token}`).then((response) => toObject(response.data));
  },
};

export const inventoryApi = {
  listItems() {
    return apiClient.get('/inventory/items').then((response) => toArray(response.data).map(normalizeInventoryItem));
  },
  createItem(payload) {
    return apiClient.post('/inventory/items', normalizeInventoryPayload(payload)).then((response) => normalizeInventoryItem(toObject(response.data) ?? payload));
  },
  updateItem(itemId, payload) {
    return apiClient.patch(`/inventory/items/${itemId}`, normalizeInventoryPayload(payload)).then((response) => normalizeInventoryItem(toObject(response.data) ?? payload));
  },
  deleteItem(itemId) {
    return apiClient.delete(`/inventory/items/${itemId}`);
  },
  listMovements() {
    return apiClient.get('/inventory/movements').then((response) => toArray(response.data));
  },
  createMovement(payload) {
    return apiClient.post('/inventory/movements', payload).then((response) => toObject(response.data));
  },
  listStock() {
    return apiClient.get('/inventory/stock').then((response) => toArray(response.data).map(normalizeInventoryItem));
  },
  deduct(payload) {
    return apiClient.post('/v1/inventory/deduct', payload).then((response) => toObject(response.data));
  },
};

export const herdApi = {
  list() {
    return apiClient.get('/herd').then((response) => toArray(response.data));
  },
  get(id) {
    return apiClient.get(`/herd/${id}`).then((response) => toObject(response.data));
  },
  create(payload) {
    return apiClient.post('/herd', normalizeHerdPayload(payload)).then((response) => toObject(response.data));
  },
  update(id, payload) {
    return apiClient.patch(`/herd/${id}`, normalizeHerdPayload(payload)).then((response) => toObject(response.data));
  },
  delete(id) {
    return apiClient.delete(`/herd/${id}`);
  },
};

export const breedingApi = {
  listLogs() {
    return apiClient.get('/operations/breeding-logs').then((response) => toArray(response.data));
  },
  createLog(payload) {
    return apiClient.post('/operations/breeding-logs', payload).then((response) => toObject(response.data));
  },
  updateLogStatus(logId, status) {
    return apiClient.put(`/operations/breeding-logs/${logId}/status`, { status }).then((response) => toObject(response.data));
  },
  listSemenInventory() {
    return apiClient.get('/operations/semen-inventory').then((response) => toArray(response.data));
  },
  createSemenInventory(payload) {
    return apiClient.post('/operations/semen-inventory', payload).then((response) => toObject(response.data));
  },
  breedingPerformance() {
    return apiClient.get('/operations/breeding/performance').then((response) => toObject(response.data));
  },
};

export const animalsApi = {
  get(id) {
    return apiClient.get(`/animals/${id}`).then((response) => toObject(response.data));
  },
  update(id, payload) {
    return apiClient.patch(`/animals/${id}`, payload).then((response) => toObject(response.data));
  },
  milkHistory(id) {
    return apiClient.get(`/animals/${id}/milk-history`).then((response) => toArray(response.data));
  },
  listEvents(id, params = {}) {
    return requestWithFallback(apiClient, [
      {
        method: 'get',
        url: `/animals/${id}/events`,
        params,
      },
      {
        method: 'get',
        url: `/operations/api/animals/${id}/events`,
        params,
      },
    ]).then((response) => toObject(response.data));
  },
  createEvent(id, payload) {
    return requestWithFallback(apiClient, [
      {
        method: 'post',
        url: `/animals/${id}/events`,
        data: payload,
      },
      {
        method: 'post',
        url: `/operations/api/animals/${id}/events`,
        data: payload,
      },
    ]).then((response) => toObject(response.data));
  },
};

export const medicalApi = {
  listRecords() {
    return apiClient.get('/clinical/vet-visits').then((response) => toArray(response.data).map(normalizeMedicalRecord));
  },
  createRecord(payload) {
    return apiClient.post('/clinical/vet-visits', payload).then((response) => normalizeMedicalRecord(toObject(response.data) ?? payload));
  },
  listPendingFollowUps() {
    return apiClient.get('/clinical/vet-visits/follow-ups/pending').then((response) => toArray(response.data).map(normalizeMedicalRecord));
  },
  scheduleFollowUp(visitId, payload) {
    return apiClient.put(`/clinical/vet-visits/${visitId}/follow-up/schedule`, payload).then((response) => normalizeMedicalRecord(toObject(response.data) ?? payload));
  },
  completeFollowUp(visitId, payload = {}) {
    return apiClient.put(`/clinical/vet-visits/${visitId}/follow-up/complete`, payload).then((response) => normalizeMedicalRecord(toObject(response.data) ?? payload));
  },
};

export const safetyApi = {
  dashboard() {
    return apiClient.get('/safety/dashboard').then((response) => toObject(response.data));
  },
  activeHardlocks() {
    return apiClient.get('/veterinary/hardlocks/active').then((response) => toArray(response.data));
  },
};

export const routineApi = {
  listPlans() {
    return apiClient.get('/routine/plans').then((response) => toArray(response.data));
  },
  savePlans(payload) {
    return apiClient.post('/routine/plans', payload).then((response) => toObject(response.data));
  },
};

export const feedApi = {
  calculateSchedule(payload) {
    return apiClient.post('/v1/feed/calculate-schedule', payload).then((response) => toObject(response.data));
  },
};

export const nutritionApi = {
  dashboard() {
    return apiClient.get('/nutrition/dashboard').then((response) => toObject(response.data));
  },
  listRecipes() {
    return apiClient.get('/feed/recipes').then((response) => toArray(response.data));
  },
  createRecipe(payload) {
    return apiClient.post('/feed/recipes', normalizeRecipePayload(payload)).then((response) => toObject(response.data));
  },
  updateRecipe(recipeId, payload) {
    return apiClient.patch(`/feed/recipes/${recipeId}`, normalizeRecipePayload(payload)).then((response) => toObject(response.data));
  },
  deleteRecipe(recipeId) {
    return apiClient.delete(`/feed/recipes/${recipeId}`);
  },
  formulate(payload) {
    return apiClient.post('/feed/formulate', payload).then((response) => toObject(response.data));
  },
  listConversions() {
    return apiClient.get('/units/conversions').then((response) => toArray(response.data));
  },
  saveConversion(payload) {
    return apiClient.post('/units/conversions', normalizeConversionPayload(payload)).then((response) => toObject(response.data));
  },
  feedCosting() {
    return apiClient.get('/feed/costing').then((response) => toObject(response.data));
  },
  createBatch(payload) {
    return apiClient.post('/v1/nutrition/batches', payload).then((response) => toObject(response.data));
  },
  createConsumptionEvent(batchId, payload) {
    return apiClient.post(`/v1/nutrition/batches/${batchId}/consumption-events`, payload).then((response) => toObject(response.data));
  },
  feedCostEfficiency() {
    return apiClient.get('/v1/nutrition/analytics/feed-cost-efficiency').then((response) => toObject(response.data));
  },
  activeBatchRoiTrendWeekly() {
    return apiClient.get('/v1/nutrition/analytics/active-batch-roi-trend-weekly').then((response) => toArray(response.data));
  },
};

export const exportApi = {
  animalPdf(animalId) {
    return apiClient.get(`/v1/export/animal/${animalId}/pdf`).then((response) => response.data);
  },
};

export const healthApi = {
  status() {
    return healthClient.get('/health').then((response) => toObject(response.data));
  },
};
