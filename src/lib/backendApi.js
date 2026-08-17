import axios from 'axios';
import apiClient from './apiClient';
import { httpClientConfig } from './httpClientConfig';
import { getPermissionSet, getRoleSet, normalizeRole } from './roles';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
import { normalizeNutritionRequestPayload } from './feedUtils';
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
  // Only unwrap `session` when it's the auth session object, not resource fields like a milking `session` string (e.g. "morning").
  if (value.session && typeof value.session === 'object') return value.session;
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
  const lineItems = toArray(run.lineItems ?? run.line_items ?? run.details).map(normalizePayrollRow);
  const backendSummary = run.summary ?? run.payroll_summary ?? run.payrollSummary ?? null;
  const summary = backendSummary
    ? {
        totalBase: Number(backendSummary.totalBase ?? backendSummary.total_base ?? 0),
        totalLeave: Number(backendSummary.totalLeave ?? backendSummary.total_leave ?? 0),
        totalGross: Number(backendSummary.totalGross ?? backendSummary.total_gross ?? 0),
        totalDeductions: Number(backendSummary.totalDeductions ?? backendSummary.total_deductions ?? 0),
        totalNet: Number(backendSummary.totalNet ?? backendSummary.total_net ?? backendSummary.netPay ?? backendSummary.net_pay ?? 0),
      }
    : null;
  const employees = Number(run.employees ?? run.employeeCount ?? lineItems.length);
  const totalDisbursed = Number(
    run.totalDisbursed
      ?? run.total_disbursed
      ?? summary?.totalNet
      ?? lineItems.reduce((acc, row) => acc + Number(row.net || 0), 0)
  );

  return {
    ...run,
    id: run.id ?? run.runId ?? run.payrollRunId ?? `run_${Date.now()}`,
    date: run.date ?? run.runDate ?? run.payrollDate ?? null,
    period: run.period ?? run.payPeriod ?? run.label ?? '',
    employees,
    totalDisbursed,
    summary,
    lineItems,
    details: lineItems,
  };
}

export function normalizeInventoryItem(item = {}) {
  const stockValue = item.currentStock ?? item.current_qty ?? item.stock?.value ?? item.stock ?? item.quantity ?? item.qty ?? 0;
  const stockUnit = item.unit ?? item.stock?.unit ?? item.stockUnit ?? 'units';
  const reorderLevel = Number(item.reorderLevel ?? item.minimum_threshold ?? item.reorder_level ?? item.threshold ?? 0);
  const currentStock = Number(stockValue);

  return {
    ...item,
    id: item.id ?? item.item_id ?? item.itemId ?? item.sku ?? null,
    name: item.name ?? item.item_name ?? '',
    sku: item.sku ?? item.code ?? item.item_code ?? '',
    category: item.category ?? item.group ?? 'Uncategorized',
    unit: stockUnit,
    currentStock,
    current_qty: item.current_qty ?? currentStock,
    stock: {
      value: currentStock,
      unit: stockUnit,
    },
    reorderLevel,
    minimum_threshold: item.minimum_threshold ?? reorderLevel,
  };
}

export function getApiErrorMessage(error, fallback = 'Request failed. Please try again.') {
  const status = error?.response?.status;
  const responseData = error?.response?.data;
  const explicitMessage = typeof responseData === 'string'
    ? responseData
    : responseData?.message ?? responseData?.error ?? responseData?.detail ?? responseData?.details ?? null;

  if (explicitMessage) {
    return explicitMessage;
  }

  if (status === 409) {
    return 'This record already exists for the current tenant.';
  }

  if (status === 400) {
    return 'The submitted data is invalid.';
  }

  return error?.message ?? fallback;
}

export function normalizeMedicalRecord(record = {}) {
  const source = record.visit ?? record.record ?? record.data ?? record.result ?? record;

  const normalizedCow = source.cow_name
    ?? source.cowName
    ?? source.animal_name
    ?? source.animalName
    ?? source.livestock_name
    ?? source.cow?.name
    ?? source.animal?.name
    ?? source.livestock?.name
    ?? source.cow
    ?? source.cowTag
    ?? source.cow_tag
    ?? source.cow_id
    ?? source.animalId
    ?? source.animal_id
    ?? '';

  const medications = source.meds ?? source.medications ?? source.treatment ?? '';
  const normalizedMeds = Array.isArray(medications)
    ? medications.filter(Boolean).join(', ')
    : medications;

  const backendFollowUpStatus = source.follow_up_status ?? source.followUpStatus ?? null;
  const normalizedStatus = (backendFollowUpStatus === 'Completed' ? 'Closed' : null)
    ?? (backendFollowUpStatus === 'Scheduled' ? 'Follow-up Due' : null)
    ?? source.status
    ?? 'Under Treatment';

  const normalizedReason = source.reason
    ?? source.reason_for_visit
    ?? source.symptoms
    ?? source.symptom
    ?? source.signs
    ?? source.signsOfSickness
    ?? source.signs_of_sickness
    ?? source.clinicalSigns
    ?? source.clinical_signs
    ?? source.complaint
    ?? source.observations
    ?? '';

  return {
    ...source,
    id: source.id ?? source.record_id ?? source.visit_id ?? null,
    date: source.date ?? source.visit_date ?? source.createdAt ?? source.created_at ?? new Date().toISOString().split('T')[0],
    cow: String(normalizedCow).trim(),
    reason: String(normalizedReason ?? '').trim(),
    diagnosis: source.diagnosis ?? source.diagnosis_text ?? '',
    meds: String(normalizedMeds ?? '').trim(),
    recommendations: source.recommendations ?? source.notes ?? '',
    status: normalizedStatus,
    severity: source.severity ?? 'Medium',
    vet: source.vet ?? source.vet_name ?? source.createdBy ?? source.remarks ?? '',
    followUp: source.followUp ?? source.follow_up ?? source.follow_up_date ?? null,
    createdAt: source.createdAt ?? source.created_at ?? null,
    updatedAt: source.updatedAt ?? source.updated_at ?? source.createdAt ?? source.created_at ?? null,
    updatedBy: source.updatedBy ?? source.updated_by ?? source.remarks ?? null,
  };
}

const mapUiMedicalStatusToBackend = (status) => {
  const normalizedStatus = String(status ?? '').trim().toLowerCase();

  if (normalizedStatus === 'closed') {
    return 'Completed';
  }

  if (normalizedStatus === 'follow-up due') {
    return 'Scheduled';
  }

  return null;
};

const buildMedicalRecordPayload = (payload = {}) => {
  const normalizedCowId = payload.cow_id ?? payload.cowId ?? payload.animal_id ?? payload.animalId ?? payload.cow;
  const medicationSource = payload.medications ?? payload.meds ?? payload.treatment ?? [];
  const medications = Array.isArray(medicationSource)
    ? medicationSource.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)
    : String(medicationSource ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const backendFollowUpStatus = payload.follow_up_status
    ?? payload.followUpStatus
    ?? mapUiMedicalStatusToBackend(payload.status);

  const request = {
    ...payload,
    visit_date: payload.visit_date ?? payload.date,
    reason_for_visit: payload.reason_for_visit ?? payload.reason ?? payload.symptoms,
    medications,
    follow_up_date: payload.follow_up_date ?? payload.followUp,
    follow_up_status: backendFollowUpStatus,
  };

  if (normalizedCowId !== undefined && normalizedCowId !== null && normalizedCowId !== '') {
    request.cow_id = normalizedCowId;
    request.animal_id = normalizedCowId;
  }

  if (backendFollowUpStatus === 'Completed') {
    request.follow_up_required = false;
    request.follow_up_completed_at = payload.follow_up_completed_at ?? payload.followUpCompletedAt ?? new Date().toISOString();
  } else if (backendFollowUpStatus === 'Scheduled') {
    request.follow_up_required = true;
  }

  if (!request.remarks && payload.updatedBy) {
    request.remarks = `Updated by ${payload.updatedBy}`;
  }

  return request;
};

const staffRoutes = (staffId) => (staffId
  ? [`/hr/staff/${staffId}`, `/hr/employees/${staffId}`]
  : ['/hr/staff', '/hr/employees']);

const verifyRoutes = (staffId) => [`/hr/staff/${staffId}/verify-return`, `/hr/employees/${staffId}/verify-return`];

const payrollRoutes = () => ['/hr/payroll/runs', '/hr/payroll-records', '/hr/payroll'];

const normalizeHerdRecord = (cow = {}) => {
  const tagNumber = cow.tag_number ?? cow.tagNumber ?? cow.tag ?? cow.id ?? cow.ear_tag ?? '';
  const dateOfBirth = cow.date_of_birth ?? cow.dateOfBirth ?? cow.dob ?? null;
  const breedStatus = cow.breed_status ?? cow.breed ?? 'Foundation';
  const currentStatus = cow.current_status ?? cow.currentStatus ?? cow.status ?? cow.lactation_status ?? 'Unknown';

  return {
    ...cow,
    id: cow.id ?? tagNumber ?? null,
    tag: cow.tag ?? tagNumber ?? null,
    tagNumber,
    tag_number: tagNumber,
    name: cow.name ?? '',
    dob: cow.dob ?? dateOfBirth,
    dateOfBirth,
    date_of_birth: dateOfBirth,
    breed: cow.breed ?? breedStatus,
    breed_status: breedStatus,
    current_status: currentStatus,
    currentStatus,
  };
};

const buildHerdPayload = (payload = {}) => {
  const tagNumber = payload.tag_number ?? payload.tagNumber ?? payload.tag ?? payload.id ?? payload.ear_tag ?? '';
  const dateOfBirth = payload.date_of_birth ?? payload.dateOfBirth ?? payload.dob ?? null;
  const request = {
    tag_number: tagNumber,
    date_of_birth: dateOfBirth,
  };

  if (payload.name !== undefined) {
    request.name = payload.name;
  }

  const breedStatus = payload.breed_status ?? payload.breed;
  if (breedStatus !== undefined && breedStatus !== null && breedStatus !== '') {
    request.breed_status = breedStatus;
  }

  return request;
};

const buildInventoryItemPayload = (payload = {}) => {
  const unit = payload.unit ?? payload.stock?.unit ?? payload.stockUnit ?? '';
  const currentStock = Number(payload.currentStock ?? payload.current_qty ?? payload.stock?.value ?? payload.stock?.quantity ?? payload.stock?.qty ?? payload.stock ?? payload.quantity ?? 0);
  const reorderLevel = Number(payload.reorderLevel ?? payload.minimum_threshold ?? payload.reorder_level ?? payload.threshold ?? 0);
  const request = {
    name: payload.name ?? '',
    category: payload.category ?? '',
    unit,
    sku: payload.sku ?? '',
    currentStock,
    current_qty: payload.current_qty ?? currentStock,
    reorderLevel,
    minimum_threshold: payload.minimum_threshold ?? reorderLevel,
  };

  const nutritionFieldNames = {
    energy_mj_per_kg: 'energyMjPerKg',
    protein_grams_per_kg: 'proteinGramsPerKg',
    fiber_grams_per_kg: 'fiberGramsPerKg',
    cost_per_kg: 'costPerKg',
  };

  Object.entries(nutritionFieldNames).forEach(([apiField, formField]) => {
    // Edit forms use camelCase state while existing API records retain the
    // original snake_case value. Prefer the current form value when present.
    const value = payload[formField] ?? payload[apiField];
    if (value !== undefined && value !== null && value !== '') {
      request[apiField] = Number(value);
    }
  });

  return request;
};

const normalizeInventoryMovementPayload = (payload = {}) => {
  const quantity = Number(payload.quantity ?? payload.amount ?? payload.qty ?? 0);

  return {
    ...payload,
    item_id: payload.item_id ?? payload.itemId ?? payload.inventory_item_id ?? payload.inventoryItemId,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    transaction_type: payload.transaction_type ?? payload.transactionType ?? 'IN',
    movement_type: payload.movement_type ?? payload.movementType ?? 'restock',
    reference_note: payload.reference_note ?? payload.referenceNote ?? '',
  };
};

export const buildProductionYieldPayload = (payload = {}) => {
  const cowId = payload.cow_id ?? payload.cowId ?? payload.cow ?? payload.animal_id ?? payload.animalId ?? '';
  const amount = Number(payload.amount ?? payload.volume ?? payload.liters ?? 0);
  const session = payload.session ?? payload.milkingSession ?? 'morning';
  const milkingDate = payload.milking_date
    ?? payload.milkingDate
    ?? payload.date
    ?? payload.dateOfMilking
    ?? new Date().toISOString().slice(0, 10);

  return {
    cow_id: cowId,
    amount,
    session,
    milking_date: milkingDate,
    milkingDate,
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

// Utility function to extract an array of breeding logs from various API response structures
export const extractBreedingLogsArray = (data) => {
  if (Array.isArray(data)) {
    return data;
  }
  // Common patterns for API responses that contain an array
  if (data && typeof data === 'object') {
    if (Array.isArray(data.items)) {
      return data.items;
    }
    if (Array.isArray(data.data)) {
      return data.data;
    }
    if (Array.isArray(data.logs)) { // Specific to breeding logs if the backend nests them under 'logs'
      return data.logs;
    }
  }
  console.warn('extractBreedingLogsArray received non-array or unexpected data structure:', data);
  return [];
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
    const perPage = 100;
    const fetchPage = (page) => apiClient.get('/production/yield', { params: { page, per_page: perPage } }).then((response) => response.data);

    return fetchPage(1).then(async (firstPage) => {
      const items = toArray(firstPage);
      const totalPages = firstPage?.meta?.pages ?? 1;

      if (totalPages <= 1) {
        return items;
      }

      const remainingPageNumbers = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
      const remainingPages = await Promise.all(remainingPageNumbers.map(fetchPage));

      return items.concat(...remainingPages.map(toArray));
    });
  },
  createYield(payload, config = {}) {
    return apiClient.post('/production/yield', buildProductionYieldPayload(payload), config).then((response) => toObject(response.data));
  },
  getYield(yieldId) {
    return apiClient.get(`/production/yield/${yieldId}`).then((response) => toObject(response.data));
  },
  deleteYield(yieldId) {
    return apiClient.delete(`/production/yield/${yieldId}`);
  },
  verifyYield(yieldId) {
    return apiClient.patch(`/production/yield/${yieldId}/verify`).then((response) => toObject(response.data));
  },
  listMilkDropAlerts() {
    return requestWithFallback(apiClient, [
      {
        method: 'get',
        url: '/production/milk-drop-alerts',
      },
      {
        method: 'get',
        url: '/operations/api/production/milk-drop-alerts',
      },
    ]).then((response) => toArray(response.data));
  },
  investigateMilkDropAlert(alertId, payload) {
    return requestWithFallback(apiClient, [
      {
        method: 'post',
        url: `/production/milk-drop-alerts/${alertId}/investigate`,
        data: payload,
      },
      {
        method: 'post',
        url: `/operations/api/production/milk-drop-alerts/${alertId}/investigate`,
        data: payload,
      },
    ]).then((response) => toObject(response.data));
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
  listCustomers() {
    return apiClient.get('/customers').then((response) => toArray(response.data));
  },
  createCustomer(payload) {
    return apiClient.post('/customers', payload).then((response) => toObject(response.data));
  },
  getCustomer(id) {
    return apiClient.get(`/customers/${id}`).then((response) => toObject(response.data));
  },
  updateCustomer(id, payload) {
    return apiClient.patch(`/customers/${id}`, payload).then((response) => toObject(response.data));
  },
  deleteCustomer(id) {
    return apiClient.delete(`/customers/${id}`);
  },
  listBuyers() {
    return apiClient.get('/buyers').then((response) => toArray(response.data));
  },
  getBuyerProfile(buyerId) {
    return apiClient.get(`/buyers/${buyerId}`).then((response) => toObject(response.data));
  },
  createBuyer(payload) {
    return apiClient.post('/buyers', payload).then((response) => toObject(response.data));
  },
  listLedgerEntries(params = {}) {
    // The backend returns a structured object { items, meta, summary }.
    // We return the whole object so the UI can access both the transaction
    // list (`items`) and the financial summary (`summary`).
    return apiClient.get('/ledger', { params }).then((response) => response.data);
  },
  createLedgerEntry(payload) {
    // The backend expects `transaction_type` as 'Revenue' or 'Expense', but older
    // form components may send `type` as 'income' or 'expense'. This adapter
    // normalizes the payload before sending. It also handles aliases for other fields.
    const { type, stream, notes, description, note, reference, reference_code, ...rest } = payload;
    const transaction_type = type === 'income' ? 'Revenue' : type === 'expense' ? 'Expense' : type;
    const apiPayload = {
      ...rest,
      transaction_type,
      // The backend requires 'category', but some UI components send 'stream'.
      category: stream ?? payload.category,
      // The backend requires 'description', but some UI components may send 'note' or 'notes'.
      description: description ?? notes ?? note,
      // The backend requires 'reference_code', but some UI components may send 'reference'.
      reference_code: reference_code ?? reference,
    };

    return apiClient.post('/ledger', apiPayload).then((response) => toObject(response.data));
  },
  // Daily milk delivery records: the backend is the sole source of truth for
  // billable_liters/amount — it must compute those from liters_delivered minus
  // personal_consumption_liters (the farmer's own, non-billable, use) and the
  // customer's agreed rate. The frontend only submits the raw inputs.
  listDeliveries(params = {}) {
    return apiClient.get('/deliveries', { params }).then((response) => toArray(response.data));
  },
  createDelivery(payload) {
    return apiClient.post('/deliveries', payload).then((response) => toObject(response.data));
  },
  updateDelivery(id, payload) {
    return apiClient.patch(`/deliveries/${id}`, payload).then((response) => toObject(response.data));
  },
  deleteDelivery(id) {
    return apiClient.delete(`/deliveries/${id}`);
  },
  unitCost() {
    return apiClient.get('/unit-cost').then((response) => toObject(response.data));
  },
  statement(token) {
    return apiClient.get(`/statements/${token}`).then((response) => toObject(response.data));
  },
};

export const inventoryApi = {
  listItems() {
    return apiClient.get('/inventory/items').then((response) => toArray(response.data).map(normalizeInventoryItem));
  },
  createItem(payload) {
    return apiClient.post('/inventory/items', buildInventoryItemPayload(payload)).then((response) => normalizeInventoryItem(toObject(response.data) ?? payload));
  },
  updateItem(itemId, payload) {
    return apiClient.patch(`/inventory/items/${itemId}`, buildInventoryItemPayload(payload)).then((response) => normalizeInventoryItem(toObject(response.data) ?? payload));
  },
  deleteItem(itemId) {
    return apiClient.delete(`/inventory/items/${itemId}`);
  },
  listMovements() {
    return apiClient.get('/inventory/movements').then((response) => toArray(response.data));
  },
  createMovement(payload) {
    return apiClient.post('/inventory/movements', normalizeInventoryMovementPayload(payload)).then((response) => toObject(response.data));
  },
  listStock() {
    return apiClient.get('/inventory/stock').then((response) => toArray(response.data).map(normalizeInventoryItem));
  },
  deduct(payload) {
    return apiClient.post('/v1/inventory/deduct', payload).then((response) => toObject(response.data));
  },
  getQuickRestockItems: async () => {
    // This endpoint is designed to return a small, optimized list of
    // items that are at or below their reorder level.
    const response = await apiClient.get('/api/v1/inventory/insights/quick-restock');
    // The backend returns { items: [...] }, so we extract the array here
    return response.data.items;
  },
};

export const herdApi = {
  list(params = {}) {
    return apiClient.get('/herd', {
      params: {
        per_page: 200,
        ...params,
      },
    }).then((response) => toArray(response.data).map(normalizeHerdRecord));
  },
  get(id) {
    return apiClient.get(`/herd/${id}`).then((response) => normalizeHerdRecord(toObject(response.data) ?? {}));
  },
  create(payload) {
    return apiClient.post('/herd', buildHerdPayload(payload)).then((response) => normalizeHerdRecord(toObject(response.data) ?? payload));
  },
  update(id, payload) {
    return apiClient.patch(`/herd/${id}`, buildHerdPayload(payload)).then((response) => normalizeHerdRecord(toObject(response.data) ?? payload));
  },
  delete(id) {
    return apiClient.delete(`/herd/${id}`);
  },
  geneticProgress() {
    return apiClient.get('/herd/genetic-progress').then((response) => toArray(response.data));
  },
  listYieldTargets() {
    return apiClient.get('/v1/herd/yield-targets').then((response) => toObject(response.data));
  },
  calculateFeedingPlanFromTargets(params = {}) {
    return apiClient.get('/v1/herd/feeding-plan/from-targets', { params }).then((response) => toObject(response.data));
  },
  calculateCustomFeedingPlan(payload) {
    return apiClient.post('/v1/herd/feeding-plan/custom', payload).then((response) => toObject(response.data));
  },
};

export const breedingApi = {
  listLogs() {
    return apiClient.get('/operations/breeding-logs').then((response) => extractBreedingLogsArray(response.data));
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
    return apiClient.post('/operations/semen-inventory', normalizeSemenInventoryPayload(payload)).then((response) => toObject(response.data));
  },
  updateSemenInventory(itemId, payload) {
    return requestWithFallback(apiClient, [
      {
        method: 'patch',
        url: `/operations/semen-inventory/${itemId}`,
        data: normalizeSemenInventoryPayload(payload),
      },
      {
        method: 'put',
        url: `/operations/semen-inventory/${itemId}`,
        data: normalizeSemenInventoryPayload(payload),
      },
    ]).then((response) => toObject(response.data));
  },
  deleteSemenInventory(itemId) {
    return apiClient.delete(`/operations/semen-inventory/${itemId}`);
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
    // This route is paginated (default per_page=20) just like /production/yield — a cow with
    // more than 20 logged sessions had its oldest entries silently dropped from page 1. Fetch
    // every page and concatenate so the full history is always returned.
    const perPage = 100;
    const fetchPage = (page) => apiClient.get(`/animals/${id}/milk-history`, { params: { page, per_page: perPage } }).then((response) => response.data);

    return fetchPage(1).then(async (firstPage) => {
      if (!firstPage || Array.isArray(firstPage)) {
        return { sessions: toArray(firstPage), stats: null, animal: null };
      }

      const firstPageSessions = Array.isArray(firstPage.sessions) ? firstPage.sessions : toArray(firstPage);
      const totalPages = firstPage?.meta?.pages ?? 1;

      let sessions = firstPageSessions;
      if (totalPages > 1) {
        const remainingPageNumbers = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);
        const remainingPages = await Promise.all(remainingPageNumbers.map(fetchPage));
        const remainingSessions = remainingPages.map((page) => (Array.isArray(page?.sessions) ? page.sessions : toArray(page)));
        sessions = firstPageSessions.concat(...remainingSessions);
      }

      // Backend nests stats under `summary` or exposes them at the top level depending on route version.
      const stats = firstPage.stats ?? {
        average_yield: firstPage.summary?.average_yield ?? firstPage.average_yield ?? firstPage.average ?? null,
        peak_yield: firstPage.summary?.peak_yield ?? firstPage.peak_yield ?? firstPage.peak ?? null,
      };
      // Resolving this route already accepts the ear tag, unlike GET /animals/<id> which needs the internal id.
      return { sessions, stats, animal: firstPage.animal ?? null };
    });
  },
  listEvents(id, params = {}) {
    return apiClient.get(`/animals/${id}/events`, { params }).then((response) => toObject(response.data));
  },
  createEvent(id, payload) {
    return apiClient.post(`/animals/${id}/events`, payload).then((response) => toObject(response.data));
  },
};

export const yieldTargetsApi = {
  get(cowId) {
    return requestWithFallback(apiClient, [
      {
        method: 'get',
        url: `/v1/animals/${cowId}/yield-target`,
      },
      {
        method: 'get',
        url: `/animals/${cowId}/yield-target`,
      },
    ]).then((response) => toObject(response.data));
  },
  save(cowId, payload) {
    const request = {
      target_liters: Number(payload?.target_liters ?? payload?.targetLiters ?? 0),
    };

    return requestWithFallback(apiClient, [
      {
        method: 'post',
        url: `/v1/animals/${cowId}/yield-target`,
        data: request,
      },
      {
        method: 'post',
        url: `/animals/${cowId}/yield-target`,
        data: request,
      },
    ]).then((response) => toObject(response.data));
  },
  update(cowId, payload) {
    const request = {
      target_liters: payload?.target_liters ?? payload?.targetLiters,
      base_herd_feed_kg: payload?.base_herd_feed_kg ?? payload?.baseHerdFeedKg,
      times_to_feed_daily: payload?.times_to_feed_daily ?? payload?.timesToFeedDaily,
    };

    // Remove undefined keys so we only send what's being updated for PATCH
    Object.keys(request).forEach(key => request[key] === undefined && delete request[key]);

    return requestWithFallback(apiClient, [
      {
        method: 'patch',
        url: `/v1/animals/${cowId}/yield-target`,
        data: request,
      },
    ]).then((response) => toObject(response.data));
  },
  deactivate(cowId) {
    return apiClient.delete(`/v1/animals/${cowId}/yield-target`)
      .then((response) => toObject(response.data));
  },
};

export const medicalApi = {
  listRecords() {
    return requestWithFallback(apiClient, [
      {
        method: 'get',
        url: '/clinical/vet-visits',
      },
      {
        method: 'get',
        url: '/medical/records',
      },
    ]).then((response) => toArray(response.data).map(normalizeMedicalRecord));
  },
  createRecord(payload) {
    const requestPayload = buildMedicalRecordPayload(payload);

    return requestWithFallback(apiClient, [
      {
        method: 'post',
        url: '/clinical/vet-visits',
        data: requestPayload,
      },
      {
        method: 'post',
        url: '/medical/records',
        data: requestPayload,
      },
    ]).then((response) => normalizeMedicalRecord(toObject(response.data) ?? requestPayload));
  },
  async updateRecord(recordId, payload) {
    const requestPayload = buildMedicalRecordPayload(payload);
    const response = await requestWithFallback(apiClient, [
      {
        method: 'put',
        url: `/clinical/vet-visits/${recordId}`,
        data: requestPayload,
      },
      {
        method: 'put',
        url: `/medical/records/${recordId}`,
        data: requestPayload,
      },
    ]);

    const normalizedPayloadStatus = String(payload?.status ?? '').trim().toLowerCase();

    if (normalizedPayloadStatus === 'closed') {
      const completionResponse = await requestWithFallback(apiClient, [
        {
          method: 'put',
          url: `/clinical/vet-visits/${recordId}/follow-up/complete`,
          data: {},
        },
        {
          method: 'put',
          url: `/medical/records/${recordId}/follow-up/complete`,
          data: {},
        },
      ]);

      return normalizeMedicalRecord(toObject(completionResponse.data) ?? { ...requestPayload, id: recordId, follow_up_status: 'Completed' });
    }

    if (normalizedPayloadStatus === 'follow-up due') {
      const schedulePayload = {
        follow_up_date: requestPayload.follow_up_date,
      };

      const scheduleResponse = await requestWithFallback(apiClient, [
        {
          method: 'put',
          url: `/clinical/vet-visits/${recordId}/follow-up/schedule`,
          data: schedulePayload,
        },
        {
          method: 'put',
          url: `/medical/records/${recordId}/follow-up/schedule`,
          data: schedulePayload,
        },
      ]);

      return normalizeMedicalRecord(toObject(scheduleResponse.data) ?? { ...requestPayload, id: recordId, follow_up_status: 'Scheduled' });
    }

    return normalizeMedicalRecord(toObject(response.data) ?? { ...requestPayload, id: recordId });
  },
  listPendingFollowUps() {
    return requestWithFallback(apiClient, [
      {
        method: 'get',
        url: '/clinical/vet-visits/follow-ups/pending',
      },
      {
        method: 'get',
        url: '/medical/records/follow-ups/pending',
      },
    ]).then((response) => toArray(response.data).map(normalizeMedicalRecord));
  },
  scheduleFollowUp(visitId, payload) {
    return requestWithFallback(apiClient, [
      {
        method: 'put',
        url: `/clinical/vet-visits/${visitId}/follow-up/schedule`,
        data: payload,
      },
      {
        method: 'put',
        url: `/medical/records/${visitId}/follow-up/schedule`,
        data: payload,
      },
    ]).then((response) => normalizeMedicalRecord(toObject(response.data) ?? payload));
  },
  completeFollowUp(visitId, payload = {}) {
    return requestWithFallback(apiClient, [
      {
        method: 'put',
        url: `/clinical/vet-visits/${visitId}/follow-up/complete`,
        data: payload,
      },
      {
        method: 'put',
        url: `/medical/records/${visitId}/follow-up/complete`,
        data: payload,
      },
    ]).then((response) => normalizeMedicalRecord(toObject(response.data) ?? payload));
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
  listMixerIngredients(recipeType) {
    const params = {
      recipe_type: recipeType,
      mixer_type: recipeType,
      mixerType: recipeType,
    };

    return requestWithFallback(apiClient, [
      {
        method: 'get',
        url: `/v1/nutrition/mixers/${recipeType}/ingredients`,
      },
      {
        method: 'get',
        url: '/v1/nutrition/mixers/ingredients',
        params,
      },
      {
        method: 'get',
        url: '/v1/nutrition/recipes/ingredients',
        params,
      },
    ]).then((response) => toArray(response.data));
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
  calculateNutrition(payload) {
    const data = normalizeNutritionRequestPayload(payload, 'ingredients');

    return requestWithFallback(apiClient, [
      {
        method: 'post',
        url: '/v1/nutrition/recipes/calculate-nutrition',
        data,
      },
      {
        method: 'post',
        url: '/v1/recipes/calculate-nutrition',
        data,
      },
      {
        method: 'post',
        url: '/recipes/calculate-nutrition',
        data,
      },
      {
        method: 'post',
        url: '/v1/feed-formulation/recipes/calculate-nutrition',
        data,
      },
    ]).then((response) => toObject(response.data));
  },
  formulateRecipe(payload) {
    const data = normalizeNutritionRequestPayload(payload, 'ingredients', {
      forceZeroPercentages: true,
    });

    return requestWithFallback(apiClient, [
      {
        method: 'post',
        url: '/v1/nutrition/recipes/formulate',
        data,
      },
      {
        method: 'post',
        url: '/v1/recipes/formulate',
        data,
      },
      {
        method: 'post',
        url: '/recipes/formulate',
        data,
      },
      {
        method: 'post',
        url: '/v1/feed-formulation/recipes/formulate',
        data,
      },
    ]).then((response) => toObject(response.data));
  },
  autoSaveRecipe(payload) {
    const data = normalizeNutritionRequestPayload(payload, 'adjusted_ingredients');

    return requestWithFallback(apiClient, [
      {
        method: 'post',
        url: '/v1/nutrition/recipes/auto-save',
        data,
      },
      {
        method: 'post',
        url: '/v1/recipes/auto-save',
        data,
      },
      {
        method: 'post',
        url: '/recipes/auto-save',
        data,
      },
      {
        method: 'post',
        url: '/v1/feed-formulation/recipes/auto-save',
        data,
      },
    ]).then((response) => toObject(response.data));
  },
  suggestedMix(params = {}) {
    return requestWithFallback(apiClient, [
      {
        method: 'get',
        url: '/v1/nutrition/feed-formulation/suggested-mix',
        params,
      },
      {
        method: 'get',
        url: '/v1/feed-formulation/suggested-mix',
        params,
      },
      {
        method: 'get',
        url: '/feed-formulation/suggested-mix',
        params,
      },
      {
        method: 'get',
        url: '/v1/recipes/suggested-mix',
        params,
      },
    ]).then((response) => toObject(response.data));
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

export const reportsApi = {
  getMilkInventory: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) {
      params.append('start_date', startDate);
    }
    if (endDate) {
      params.append('end_date', endDate);
    }
    return apiClient.get(`/reports/milk-inventory?${params.toString()}`).then((res) => res.data);
  },
};
