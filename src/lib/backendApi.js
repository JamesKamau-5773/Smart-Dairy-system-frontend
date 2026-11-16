import axios from 'axios';
import apiClient, { resolveBackendAssetUrl } from './apiClient';
import { httpClientConfig } from './httpClientConfig';
import { getPermissionSet, getRoleSet, normalizeRole } from './roles';
import { API_CONTRACTS, validateResponse } from './apiContracts';
import { buildCalfMilkFeedPayload, normalizeMilkDisposition } from './milkDisposition';
import { API_BASE_URL, BACKEND_BASE_URL } from './apiBaseUrl';
import { readActiveSession } from './sessionStore';
import { toLoginPayload } from './identifier';

import { normalizeNutritionRequestPayload } from './feedUtils';
import { todayLocalIso } from './localDate';
import { getApiErrorCode, getPlanErrorMessage } from './apiErrors';
import { notifyDemoRefusal } from './demoRefusal';
import { errorsCopy } from '../i18n/errors';
import { getLocale } from '../i18n/locale';
const HEALTH_BASE_URL = BACKEND_BASE_URL;

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

// Demo refusals on auth routes (switching farm, phone verification, profile edits) get the same
// prompt as everywhere else.
authClient.interceptors.response.use((response) => response, (error) => {
  notifyDemoRefusal(error);
  return Promise.reject(error);
});

const healthClient = axios.create({
  baseURL: HEALTH_BASE_URL,
  timeout: 10000,
  ...httpClientConfig,
});

const ALIASABLE_STATUSES = new Set([404, 405, 501]);
const PHOTO_UPLOAD_TIMEOUT_MS = 2 * 60 * 1000;

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

const normalizeSemenInventoryPayload = (payload = {}) => ({
  bull_name: payload.bull_name ?? payload.name ?? '',
  straw_code: payload.straw_code ?? payload.code ?? '',
  breed: payload.breed ?? payload.improves ?? '',
  provider: payload.provider ?? null,
  cost: payload.cost ?? null,
  stock_level: Number(payload.stock_level ?? payload.strawsLeft ?? payload.quantity ?? 0),
  traits_to_improve: payload.traits_to_improve ?? payload.traitsToImprove ?? [],
});

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

// Only a "route not here" answer means another URL might work. With no response (offline,
// timeout) the alias would fail the same way, and on 2G each attempt costs a full timeout.
function canUseAlias(error) {
  return ALIASABLE_STATUSES.has(error?.response?.status);
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

// /auth/me describes the user but doesn't re-issue a token; keep the one the request was made with.
export function withCurrentToken(data, currentToken) {
  const hasToken = Boolean(data?.token ?? data?.access_token ?? data?.accessToken);
  if (!data || typeof data !== 'object' || !currentToken || hasToken) return data;
  return { ...data, token: currentToken };
}

/**
 * `allowCookieSession` accepts a response without a token as long as it names a
 * user: the browser is then authenticated by the HttpOnly cookie alone (Google
 * sign-in). Without it, a missing token is still an error.
 */
export function normalizeSessionUser(payload, { allowCookieSession = false } = {}) {
  const session = toObject(payload);

  if (!session) {
    return null;
  }

  const token = session.token ?? session.access_token ?? session.accessToken ?? payload?.token ?? payload?.access_token ?? payload?.accessToken ?? null;
  const hasToken = Boolean(token && String(token).trim());
  const isCookieSession = !hasToken
    && typeof session === 'object'
    && session.id != null
    && (allowCookieSession || session.cookie_session === true);

  if (typeof session !== 'object' || (!hasToken && !isCookieSession)) {
    throw new Error('Authentication response is missing an access token.');
  }

  if (typeof session !== 'object') {
    return {
      token: token,
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
    requires_password_reset: Boolean(session.requires_password_reset ?? session.requiresPasswordReset),
    cookie_session: isCookieSession,
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
    phoneNumber: record.phoneNumber ?? record.phone_number ?? '',
    userId: record.userId ?? record.user_id ?? null,
    page_access: Array.isArray(record.page_access) ? record.page_access : null,
    accountStatus: String(record.accountStatus ?? record.account_status ?? 'NONE').trim().replace(/\s+/g, '_').toUpperCase(),
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
    // null when the backend didn't say (the switch is then hidden rather than guessed).
    statutoryDeductionsEnabled: booleanOrNull(record.statutoryDeductionsEnabled ?? record.statutory_deductions_enabled),
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
    name: row.name ?? row.staffName ?? row.staff_name ?? '',
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
    // Statutory deductions (KRA PAYE, NSSF, SHIF, Housing Levy), as the backend calculated them.
    daysPaid: numberOrNull(row.daysPaid ?? row.days_paid),
    taxablePay: numberOrNull(row.taxablePay ?? row.taxable_pay),
    paye: numberOrNull(row.paye),
    nssfEmployee: numberOrNull(row.nssfEmployee ?? row.nssf_employee),
    nssfEmployer: numberOrNull(row.nssfEmployer ?? row.nssf_employer),
    shif: numberOrNull(row.shif),
    housingLevyEmployee: numberOrNull(row.housingLevyEmployee ?? row.housing_levy_employee),
    housingLevyEmployer: numberOrNull(row.housingLevyEmployer ?? row.housing_levy_employer),
    totalStatutory: numberOrNull(row.totalStatutoryDeductions ?? row.total_statutory_deductions),
    statutoryRatesVersion: row.statutoryRatesVersion ?? row.statutory_rates_version ?? null,
  };
}

// The backend gives file URLs from its root (`/api/...`); the client's base already ends in /api.
function toApiPath(url) {
  const path = String(url || '');
  return path.startsWith('/api/') ? path.slice(4) : path;
}

function booleanOrNull(value) {
  return typeof value === 'boolean' ? value : null;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizePayrollRun(payload = {}) {
  const envelopeRun = payload?.run && typeof payload.run === 'object' ? payload.run : null;
  const run = envelopeRun
    ? {
        ...envelopeRun,
        lineItems: payload.lineItems ?? payload.line_items ?? envelopeRun.lineItems ?? envelopeRun.line_items,
        summary: payload.summary ?? envelopeRun.summary,
      }
    : payload;
  const lineItems = toArray(run.lineItems ?? run.line_items ?? run.details).map(normalizePayrollRow);
  const backendSummary = run.summary ?? run.payroll_summary ?? run.payrollSummary ?? null;
  const summary = backendSummary
    ? {
        totalBase: Number(backendSummary.totalBase ?? backendSummary.total_base ?? lineItems.reduce((total, row) => total + row.base, 0)),
        totalLeave: Number(backendSummary.totalLeave ?? backendSummary.total_leave ?? backendSummary.total_leave_deductions ?? 0),
        totalGross: Number(backendSummary.totalGross ?? backendSummary.total_gross ?? backendSummary.total_gross_pay ?? 0),
        totalDeductions: Number(backendSummary.totalDeductions ?? backendSummary.total_deductions ?? 0),
        totalNet: Number(backendSummary.totalNet ?? backendSummary.total_net ?? backendSummary.total_net_pay ?? backendSummary.netPay ?? backendSummary.net_pay ?? 0),
      }
    : null;
  const employees = Number(run.employees ?? run.employeeCount ?? run.staffCount ?? run.staff_count ?? backendSummary?.staff_count ?? lineItems.length);
  const totalDisbursed = Number(
    run.totalDisbursed
      ?? run.total_disbursed
      ?? run.totalNetPay
      ?? run.total_net_pay
      ?? summary?.totalNet
      ?? lineItems.reduce((acc, row) => acc + Number(row.net || 0), 0)
  );
  const payrollMonth = run.payrollMonth ?? run.payroll_month;
  const payrollYear = run.payrollYear ?? run.payroll_year;
  const period = run.period
    ?? run.payPeriod
    ?? run.label
    ?? (payrollMonth && payrollYear
      ? new Date(Number(payrollYear), Number(payrollMonth) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
      : '');

  return {
    ...run,
    id: run.id ?? run.runId ?? run.payrollRunId ?? `run_${Date.now()}`,
    message: payload.message ?? run.message ?? null,
    date: run.date ?? run.runDate ?? run.payrollDate ?? run.generatedAt ?? run.generated_at ?? null,
    period,
    status: String(run.status ?? 'DRAFT').toUpperCase(),
    employees,
    totalDisbursed,
    statutoryTotals: {
      paye: numberOrNull(run.totalPaye ?? run.total_paye),
      nssf: numberOrNull(run.totalNssfEmployee ?? run.total_nssf_employee),
      shif: numberOrNull(run.totalShif ?? run.total_shif),
      housingLevy: numberOrNull(run.totalHousingLevyEmployee ?? run.total_housing_levy_employee),
      employerContributions: numberOrNull(run.totalEmployerContributions ?? run.total_employer_contributions),
    },
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
    // Archived items keep their history but are hidden from lists and mixers.
    is_active: item.is_active ?? item.isActive ?? true,
    data_warnings: Array.isArray(item.data_warnings) ? item.data_warnings : [],
  };
}

/**
 * A message for a failed request, chosen by the backend's error `code` first, then the HTTP
 * status. The backend's own `error` text is English, so it is shown only to English readers and
 * only where the code alone says little (validation, conflicts); Kiswahili readers get the
 * translated message for the code or status instead.
 *
 * @param {unknown} error The failed request.
 * @param {string} [fallback] What to say when nothing more specific is known.
 * @returns {string}
 */
export function getApiErrorMessage(error, fallback = errorsCopy.fallback) {
  // Plan, subscription and demo refusals read the same on every page.
  const planMessage = getPlanErrorMessage(error);
  if (planMessage) return planMessage;
  const code = getApiErrorCode(error);
  if (code && errorsCopy.codes[code]) return errorsCopy.codes[code];

  const status = error?.response?.status;
  const responseData = error?.response?.data;
  const explicitMessage = typeof responseData === 'string'
    ? responseData
    : responseData?.message ?? responseData?.error ?? responseData?.detail ?? responseData?.details ?? null;
  const displayMessage = typeof explicitMessage === 'string'
    ? explicitMessage
    : typeof explicitMessage?.message === 'string'
      ? explicitMessage.message
      : null;
  const technicalMessage = /sql|database|constraint|integrity|traceback|exception|stack trace|foreign key|not null|unique key|relation .* does not exist|column .* does not exist|sqlalchemy|sqlite|psycopg|request failed with status code|network error/i;
  // English free text from the server or the app: only for English readers, and only when safe.
  const usableText = (message) => getLocale() === 'en'
    && typeof message === 'string'
    && message.trim().length > 0
    && message.trim().length <= 240
    && !technicalMessage.test(message);

  if (!error?.response) {
    if (error?.isAxiosError || error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED') {
      return errorsCopy.network;
    }
    if (usableText(error?.message)) return error.message;
    return fallback || errorsCopy.generic;
  }

  if (status >= 500) {
    return fallback || errorsCopy.server;
  }

  if ([400, 422].includes(status)) {
    if (usableText(displayMessage)) return displayMessage.trim();
    const fieldDetail = explicitMessage && typeof explicitMessage === 'object'
      ? explicitMessage.message
      : null;
    if (usableText(fieldDetail)) return fieldDetail.trim();
    return errorsCopy.validation;
  }

  if (status === 409) {
    return usableText(displayMessage) ? displayMessage.trim() : errorsCopy.conflict;
  }

  if (status === 401) return errorsCopy.unauthenticated;
  if (status === 403) return errorsCopy.forbidden;
  if (status === 404) return errorsCopy.notFound;
  if (status === 429) return errorsCopy.rateLimited;

  if (usableText(displayMessage)) return displayMessage.trim();
  return fallback || errorsCopy.generic;
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
    date: source.date ?? source.visit_date ?? source.createdAt ?? source.created_at ?? todayLocalIso(),
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

const normalizeMedicalMutationResponse = (response) => {
  const record = toObject(response?.data);
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null;

  const source = record.visit ?? record.record ?? record.data ?? record.result ?? record;
  const recordFields = [
    'id', 'record_id', 'visit_id', 'cow', 'cow_id', 'cowId', 'cow_name', 'cowName',
    'cow_tag', 'cowTag', 'animal_id', 'animalId', 'animal_name', 'animalName',
    'visit_date', 'date', 'reason', 'reason_for_visit', 'diagnosis', 'diagnosis_text',
    'meds', 'medications', 'treatment', 'recommendations', 'follow_up_date',
    'follow_up_status', 'severity', 'vet', 'vet_name',
  ];
  if (!recordFields.some((field) => Object.prototype.hasOwnProperty.call(source ?? {}, field))) return null;

  return normalizeMedicalRecord(record);
};

const mapUiMedicalStatusToBackend = (status) => {
  const normalizedStatus = String(status ?? '').trim().toLowerCase();

  if (normalizedStatus === 'closed') {
    return 'Completed';
  }

  if (normalizedStatus === 'follow-up due') {
    return 'Scheduled';
  }

  if (normalizedStatus === 'under treatment') {
    return 'Not Required';
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
  } else if (backendFollowUpStatus === 'Not Required') {
    request.follow_up_required = false;
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
    photoUrl: resolveBackendAssetUrl(cow.photo_url ?? cow.photoUrl),
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

  // Add new fields for current status, sire name, and dam ID
  if (payload.current_status !== undefined && payload.current_status !== null && payload.current_status !== '') {
    request.current_status = payload.current_status;
  }

  if (payload.sire_name !== undefined && payload.sire_name !== null && payload.sire_name !== '') {
    request.sire_name = payload.sire_name;
  }

  // Ensure dam_id is sent as null or empty string if not selected, not undefined
  // Backend might expect null for optional foreign keys if not provided
  if (payload.dam_id !== undefined) {
    request.dam_id = payload.dam_id === '' ? null : payload.dam_id;
  }

  if (payload.birth_weight_kg !== undefined) {
    request.birth_weight_kg = payload.birth_weight_kg;
  }

  return request;
};

// `includeStock` is for creating an item with its opening stock. Updates leave
// stock out: the backend only changes stock through movements (Restock, Use,
// Stock Count) and rejects a PATCH whose stock differs from what it has stored,
// which a form opened before someone else restocked would otherwise send.
const buildInventoryItemPayload = (payload = {}, { includeStock = true } = {}) => {
  const unit = payload.unit ?? payload.stock?.unit ?? payload.stockUnit ?? '';
  const reorderLevel = Number(payload.reorderLevel ?? payload.minimum_threshold ?? payload.reorder_level ?? payload.threshold ?? 0);
  const sku = String(payload.sku ?? '').trim();
  const request = {
    name: payload.name ?? '',
    category: payload.category ?? '',
    unit,
    reorderLevel,
    minimum_threshold: payload.minimum_threshold ?? reorderLevel,
  };
  // SKU is optional; a blank one is left out rather than stored as "".
  if (sku) request.sku = sku;

  if (includeStock) {
    const currentStock = Number(payload.currentStock ?? payload.current_qty ?? payload.stock?.value ?? payload.stock?.quantity ?? payload.stock?.qty ?? payload.stock ?? payload.quantity ?? 0);
    request.currentStock = currentStock;
    request.current_qty = payload.current_qty ?? currentStock;
  }

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
    ?? todayLocalIso();

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

/** One farm unit helper as the backend stores it: a local unit for a stock item, in kg. */
export const normalizeUnitConversion = (row = {}) => ({
  id: row.id,
  itemId: row.item_id ?? row.itemId ?? null,
  unitName: row.unit_name ?? row.unitName ?? '',
  kgEquivalent: row.kg_equivalent === null || row.kg_equivalent === undefined ? null : Number(row.kg_equivalent),
});

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

const REQUIRED_PASSWORD_RESET_ENDPOINT = '/auth/change-password';

export const authApi = {
  bootstrapStatus() {
    return authClient.get('/auth/bootstrap-status').then((response) => response.data);
  },
  login(credentials) {
    const payload = toLoginPayload(
      credentials?.login ?? credentials?.identifier ?? credentials?.username ?? '',
      credentials?.password,
    );
    if (credentials?.farm_id) payload.farm_id = credentials.farm_id;

    return authClient.post('/auth/login', payload).then((response) => normalizeSessionUser(response.data));
  },
  // The public demo (backend docs/demo-account.md): no body, no credentials; answers with the
  // same session shape as login, including the backend's `is_demo` and `read_only`.
  demo() {
    return authClient.post('/auth/demo').then((response) => normalizeSessionUser(response.data));
  },
  register(payload) {
    const requestBody = {
      farm_name: payload?.farm_name ?? payload?.farmName ?? payload?.full_name ?? payload?.workspace_name ?? '',
      full_name: payload?.full_name ?? payload?.fullName ?? '',
      cooperative_name: payload?.cooperative_name ?? payload?.cooperativeName ?? '',
      phone_number: payload?.phone_number ?? payload?.phoneNumber ?? payload?.phone ?? '',
      email: payload?.email?.trim() ? payload.email.trim().toLowerCase() : undefined,
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
  completeRequiredPasswordReset(payload) {
    return authClient.post(REQUIRED_PASSWORD_RESET_ENDPOINT, {
      password: payload?.password ?? '',
      confirm_password: payload?.confirm_password ?? payload?.confirmPassword ?? '',
    }).then((response) => normalizeSessionUser(response.data));
  },
  switchFarm(farmId) {
    return authClient.post('/auth/switch-farm', { farm_id: farmId }).then((response) => normalizeSessionUser(response.data));
  },
  // A response that names a user is a valid session even without a token: after
  // Google sign-in the HttpOnly cookie is the only credential (contract §5).
  me() {
    return requestWithFallback(authClient, [
      { method: 'get', url: '/auth/me' },
      { method: 'get', url: '/auth/status' },
    ]).then((response) => normalizeSessionUser(
      withCurrentToken(response.data, readActiveSession()?.token),
      { allowCookieSession: true },
    ));
  },
  status() {
    return authClient.get('/auth/status').then((response) => normalizeSessionUser(response.data));
  },

  // Google sign-in is a full-page redirect, not a request (contract §5.1).
  googleStartUrl({ next, intent = 'signin' } = {}) {
    const params = new URLSearchParams({ intent });
    if (next) params.set('next', next);
    return `${API_BASE_URL}/auth/google/start?${params}`;
  },
  googlePendingSignup() {
    return authClient.get('/auth/google/pending-signup').then((response) => response.data);
  },
  googleSignup(payload) {
    return authClient.post('/auth/google/signup', {
      signup_token: payload?.signup_token ?? '',
      farm_name: payload?.farm_name ?? '',
      phone_number: payload?.phone_number ?? '',
      name: payload?.name || undefined,
    }).then((response) => normalizeSessionUser(response.data, { allowCookieSession: true }));
  },

  startPhoneVerification(phoneNumber) {
    const body = phoneNumber ? { phone_number: phoneNumber } : {};
    return authClient.post('/auth/phone/verification', body).then((response) => response.data);
  },
  phoneVerificationStatus(verificationId) {
    return authClient.get(`/auth/phone/verification/${encodeURIComponent(verificationId)}`).then((response) => response.data);
  },

  forgotPasswordOptions() {
    return authClient.get('/auth/password/forgot/options').then((response) => response.data);
  },
  requestPasswordReset({ channel, phone_number: phoneNumber, email }) {
    const body = channel === 'email' ? { channel, email } : { channel, phone_number: phoneNumber };
    return authClient.post('/auth/password/forgot', body).then((response) => response.data);
  },
  validateResetToken(token) {
    return authClient.post('/auth/password/reset/validate', { token }).then((response) => response.data);
  },
  resetPassword({ token, password, confirm_password: confirmPassword }) {
    return authClient.post('/auth/password/reset', { token, password, confirm_password: confirmPassword })
      .then((response) => response.data);
  },

  confirmEmailVerification(token) {
    return authClient.post('/auth/email/verification/confirm', { token }).then((response) => response.data);
  },
};

// Period totals (docs/contracts/period-totals.md). Transport only: every figure is
// computed by the backend and returned as-is; adapters in lib/periodTotals.js map it.
export const ledgerApi = {
  getSummary({ period, anchor, ...filters }) {
    return apiClient.get('/ledger/summary', { params: { period, anchor, ...filters } }).then((response) => toObject(response.data));
  },
  getGroupTotals(filters = {}) {
    // The page names its levels (`levels`); all four when it doesn't.
    return apiClient.get('/ledger/group-totals', { params: { levels: 'year,month,week,day', ...filters } }).then((response) => toObject(response.data));
  },
};

export const productionApi = {
  // Legacy all-time summary (Command Center). The period summary below shares the path
  // but always sends `period`.
  summary() {
    return apiClient.get('/production/summary').then((response) => toObject(response.data));
  },
  getPeriodSummary({ period, anchor, ...filters }) {
    return apiClient.get('/production/summary', { params: { period, anchor, ...filters } }).then((response) => toObject(response.data));
  },
  getGroupTotals(filters = {}) {
    // The page names its levels (`levels`); all four when it doesn't.
    return apiClient.get('/production/group-totals', { params: { levels: 'year,month,week,day', ...filters } }).then((response) => toObject(response.data));
  },
  listYield(filters = {}) {
    const perPage = 100;
    const fetchPage = (page) => apiClient.get('/production/yield', { params: { ...filters, page, per_page: perPage } }).then((response) => response.data);

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
  /**
   * The backend's all-time milk totals for the farm (from the yield list's `summary`):
   * `{ totalRecords, totalLitres }`, each null when the backend didn't send it.
   */
  yieldTotals() {
    return apiClient.get('/production/yield', { params: { page: 1, per_page: 1 } }).then((response) => {
      const summary = response.data?.summary ?? {};
      const numberOrNull = (value) => (value === null || value === undefined || value === '' ? null : Number(value));
      return {
        totalRecords: numberOrNull(summary.total_records),
        totalLitres: numberOrNull(summary.total_volume ?? summary.totalVolume),
      };
    });
  },
  createYield(payload, config = {}) {
    return apiClient.post('/production/yield', buildProductionYieldPayload(payload), config).then((response) => toObject(response.data));
  },
  listMilkDispositions(params = {}) {
    return apiClient.get('/production/milk-dispositions', { params })
      .then((response) => toArray(response.data).map(normalizeMilkDisposition));
  },
  createMilkDisposition(payload) {
    return apiClient.post('/production/milk-dispositions', buildCalfMilkFeedPayload(payload))
      .then((response) => normalizeMilkDisposition(response.data?.disposition ?? response.data));
  },
  getYield(yieldId) {
    return apiClient.get(`/production/yield/${yieldId}`).then((response) => toObject(response.data));
  },
  // Edits one milk record in place (PATCH). Only the fields the backend applies are sent:
  // amount, session and milking date. The cow can't be changed by this endpoint
  // (BACKEND_REQUESTS.md, BR-001).
  updateYield(yieldId, payload = {}, config = {}) {
    const milkingDate = payload.milking_date ?? payload.milkingDate;
    const body = {
      amount: Number(payload.amount ?? payload.volume),
      session: payload.session,
      ...(milkingDate ? { milking_date: milkingDate } : {}),
    };
    return apiClient.patch(`/production/yield/${yieldId}`, body, config).then((response) => toObject(response.data));
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

export const staffOnboardingApi = {
  invite(payload) {
    return apiClient.post('/onboarding/invite', {
      employee_id: payload?.employee_id ?? payload?.employeeId,
      role: payload?.role,
      page_access: payload?.page_access,
    }).then((response) => toObject(response.data));
  },
  provision(payload) {
    return apiClient.post('/onboarding/provision', {
      employee_id: payload?.employee_id ?? payload?.employeeId,
      role: payload?.role,
      page_access: payload?.page_access,
      password: payload?.password,
      requires_password_reset: payload?.requires_password_reset ?? payload?.requiresPasswordReset ?? true,
    }).then((response) => toObject(response.data));
  },
};

export const hrApi = {
  async listStaff() {
    const response = await requestWithFallback(apiClient, staffRoutes().map((url) => ({ method: 'get', url })));
    return toArray(response.data).map(normalizeStaffRecord);
  },
  async createStaff(payload) {
    const apiPayload = {
      ...payload,
      full_name: payload.full_name ?? payload.name,
      phone_number: payload.phone_number ?? payload.phoneNumber,
      hire_date: payload.hire_date ?? payload.hireDate,
      base_salary: payload.base_salary ?? payload.baseSalary,
    };
    const response = await requestWithFallback(apiClient, staffRoutes().map((url) => ({ method: 'post', url, data: apiPayload })));
    return normalizeStaffRecord(toObject(response.data) ?? apiPayload);
  },
  async getStaffingRecommendations() {
    const response = await apiClient.get('/hr/staffing-recommendations');
    return toObject(response.data);
  },
  async getStaff(staffId) {
    const response = await requestWithFallback(apiClient, staffRoutes(staffId).map((url) => ({ method: 'get', url })));
    return normalizeStaffRecord(toObject(response.data) ?? response.data);
  },
  async updateStaff(staffId, payload) {
    const { phoneNumber, ...remainingPayload } = payload;
    const apiPayload = {
      ...remainingPayload,
      ...(phoneNumber !== undefined ? { phone_number: phoneNumber } : {}),
    };
    const response = await apiClient.patch(`/hr/staff/${staffId}`, apiPayload);
    return normalizeStaffRecord(toObject(response.data) ?? apiPayload);
  },
  async updateStaffPageAccess(staffId, pageAccess) {
    const response = await apiClient.patch(`/hr/staff/${staffId}/page-access`, { page_access: pageAccess });
    return toObject(response.data);
  },
  async verifyReturn(staffId, payload) {
    const response = await requestWithFallback(apiClient, verifyRoutes(staffId).map((url) => ({ method: 'post', url, data: payload })));
    return normalizeStaffRecord(toObject(response.data) ?? payload);
  },
  // Advances change the balance on the server, one recorded movement at a time
  // (the backend rejects a loan balance sent through updateStaff).
  // Returns { movement, loan_balance }.
  async issueAdvance(staffId, { amount, date, note } = {}) {
    const response = await apiClient.post(`/hr/staff/${staffId}/advances`, { amount: Number(amount), date, note: note || undefined });
    return toObject(response.data) ?? {};
  },
  async recordAdvanceRepayment(staffId, { amount, date, note } = {}) {
    const response = await apiClient.post(`/hr/staff/${staffId}/advance-repayments`, { amount: Number(amount), date, note: note || undefined });
    return toObject(response.data) ?? {};
  },
  // Former staff: the backend checks the loan balance, disables the login and keeps the history.
  async offboardStaff(staffId, { end_date: endDate, reason, note } = {}) {
    const response = await apiClient.post(`/hr/staff/${staffId}/offboard`, {
      end_date: endDate, offboarding_reason: reason, offboarding_note: note || undefined,
    });
    return normalizeStaffRecord(toObject(response.data) ?? {});
  },
  // Only for records added by mistake; the backend refuses staff with payroll or advance history.
  async deleteStaff(staffId) {
    await apiClient.delete(`/hr/staff/${staffId}`);
  },
  async listPayrollRuns() {
    const response = await requestWithFallback(apiClient, payrollRoutes().map((url) => ({ method: 'get', url })));
    const runs = toArray(response.data).map(normalizePayrollRun);
    return Promise.all(runs.map((run) => hrApi.getPayrollRun(run.id)));
  },
  // One request for the history list and the next period to create (`next_period`).
  async payrollSummary({ limit = 24 } = {}) {
    const response = await apiClient.get('/hr/payroll/runs/summary', { params: { limit } });
    const data = toObject(response.data) ?? {};
    return { nextPeriod: data.next_period ?? null, runs: toArray(data.runs).map(normalizePayrollRun) };
  },
  // A5 PDF built by the backend from the stored line (finalized or paid runs only).
  async downloadPayslip(runId, staffId) {
    const response = await apiClient.get(`/hr/payroll/runs/${encodeURIComponent(runId)}/payslips/${staffId}.pdf`, { responseType: 'blob' });
    return response.data;
  },
  async getPayrollRun(runId) {
    const response = await apiClient.get(`/hr/payroll/runs/${encodeURIComponent(runId)}`);
    return normalizePayrollRun(response.data);
  },
  async runPayroll(payload = {}) {
    const response = await requestWithFallback(apiClient, payrollRoutes().map((url) => ({ method: 'post', url, data: payload })));
    return normalizePayrollRun(response.data);
  },
  async finalizePayrollRun(runId) {
    const response = await apiClient.post(`/hr/payroll/runs/${runId}/finalize`);
    return normalizePayrollRun(response.data);
  },
  // `payment_reference` (e.g. "M-Pesa: QJK1234567") is stored with the run for tracing.
  async payPayrollRun(runId, { payment_reference: paymentReference } = {}) {
    const response = await apiClient.post(`/hr/payroll/runs/${runId}/pay`, paymentReference ? { payment_reference: paymentReference } : {});
    return normalizePayrollRun(response.data);
  },
  async listPayrollRecords() {
    const response = await requestWithFallback(apiClient, ['/hr/payroll-records', '/hr/payroll'].map((url) => ({ method: 'get', url })));
    return toArray(response.data).map(normalizePayrollRun);
  },
};

export const financeApi = {
  listCustomers() {
    return apiClient.get('/finance/customers').then((response) => toArray(response.data));
  },
  createCustomer(payload) {
    return apiClient.post('/finance/customers', payload).then((response) => toObject(response.data));
  },
  getCustomer(id) {
    return apiClient.get(`/finance/customers/${id}`).then((response) => toObject(response.data));
  },
  updateCustomer(id, payload) {
    return apiClient.patch(`/finance/customers/${id}`, payload).then((response) => toObject(response.data));
  },
  recordCustomerPayment(customerId, payload) {
    return apiClient.post(`/finance/customers/${customerId}/payments`, payload).then((response) => toObject(response.data));
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
  async listLedgerEntries(params = {}) {
    const fetchPage = (page) => apiClient.get('/finance/ledger', {
      params: { ...params, page, per_page: params.per_page ?? 100 },
    }).then((response) => response.data);
    const firstPage = await fetchPage(1);
    const pageCount = Number(firstPage?.meta?.pages) || 1;

    if (pageCount === 1) return firstPage;

    const remainingPages = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(index + 2))
    );
    const items = [firstPage, ...remainingPages].flatMap((page) => page?.items ?? []);

    return {
      ...firstPage,
      items,
      meta: {
        ...firstPage.meta,
        page: 1,
        pages: 1,
        per_page: items.length,
        total: Number(firstPage?.meta?.total) || items.length,
      },
    };
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

    return apiClient.post('/finance/ledger', apiPayload).then((response) => toObject(response.data));
  },
  // The server's categories and cost classes, so forms never drift from its rules.
  categories() {
    return apiClient.get('/finance/categories').then((response) => toObject(response.data) ?? {});
  },
  // Voids a posted income or expense entry and posts a linked replacement.
  correctTransaction(transactionId, payload) {
    return apiClient.post(`/finance/transactions/${transactionId}/corrections`, payload)
      .then((response) => response.data);
  },
  // Receipt photos (JPEG, PNG, WebP or PDF) kept with a ledger entry.
  uploadAttachment(transactionId, file, { onProgress } = {}) {
    const body = new FormData();
    body.append('file', file);
    return apiClient.post(`/finance/transactions/${transactionId}/attachments`, body, {
      timeout: PHOTO_UPLOAD_TIMEOUT_MS,
      onUploadProgress: onProgress
        ? (event) => { if (event.total) onProgress(Math.round((event.loaded / event.total) * 100)); }
        : undefined,
    }).then((response) => toObject(response.data));
  },
  // The attachment's `url` from the backend, fetched with the user's login (not a plain <img src>).
  async fetchAttachment(url) {
    const response = await apiClient.get(toApiPath(url), { responseType: 'blob' });
    return response.data;
  },
  getReceipt(receiptId) {
    return apiClient.get(`/finance/receipts/${receiptId}`).then((response) => toObject(response.data));
  },
  downloadReceiptPdf(receiptId) {
    return apiClient.get(`/finance/receipts/${receiptId}/pdf`, { responseType: 'blob' })
      .then((response) => response.data);
  },
  // Daily milk delivery records: the backend is the sole source of truth for
  // billable_liters/amount — it must compute those from liters_delivered minus
  // personal_consumption_liters (the farmer's own, non-billable, use) and the
  // customer's agreed rate. The frontend only submits the raw inputs.
  listDeliveries(params = {}) {
    return apiClient.get('/finance/deliveries', { params }).then((response) => toArray(response.data));
  },
  createDelivery(payload) {
    return apiClient.post('/finance/deliveries', payload).then((response) => toObject(response.data));
  },
  updateDelivery(id, payload) {
    return apiClient.patch(`/finance/deliveries/${id}`, payload).then((response) => toObject(response.data));
  },
  deleteDelivery(id) {
    return apiClient.delete(`/finance/deliveries/${id}`);
  },
  unitCost() {
    return apiClient.get('/unit-cost').then((response) => toObject(response.data));
  },
  statement(token) {
    return apiClient.get(`/statements/${token}`).then((response) => toObject(response.data));
  },
};

export const inventoryApi = {
  listItems({ includeArchived = false } = {}) {
    const params = includeArchived ? { include_archived: true } : undefined;
    return apiClient.get('/inventory/items', { params }).then((response) => toArray(response.data).map(normalizeInventoryItem));
  },
  createItem(payload) {
    return apiClient.post('/inventory/items', buildInventoryItemPayload(payload)).then((response) => normalizeInventoryItem(toObject(response.data) ?? payload));
  },
  updateItem(itemId, payload) {
    return apiClient.patch(`/inventory/items/${itemId}`, buildInventoryItemPayload(payload, { includeStock: false })).then((response) => normalizeInventoryItem(toObject(response.data) ?? payload));
  },
  deleteItem(itemId) {
    return apiClient.delete(`/inventory/items/${itemId}`);
  },
  archiveItem(itemId) {
    return apiClient.post(`/inventory/items/${itemId}/archive`).then((response) => normalizeInventoryItem(toObject(response.data) ?? {}));
  },
  restoreItem(itemId) {
    return apiClient.post(`/inventory/items/${itemId}/restore`).then((response) => normalizeInventoryItem(toObject(response.data) ?? {}));
  },
  // Physical stock count: the server compares it with its own balance and records
  // the gain or loss as a movement. Returns { status: 'matched' | 'reconciled', ... }.
  countStock(itemId, physicalCount) {
    return apiClient.post(`/inventory/items/${itemId}/audit`, { physical_count: Number(physicalCount) })
      .then((response) => toObject(response.data) ?? {});
  },
  // Applies the correction the server computed for one of the item's data warnings.
  applyDataFix(itemId, code) {
    return apiClient.post(`/inventory/items/${itemId}/data-fixes`, { code }).then((response) => normalizeInventoryItem(toObject(response.data) ?? {}));
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
  /**
   * The backend's herd counts for the whole farm (not just the first page of the list):
   * `{ totalCount, milkingCount, dryCount, averageAgeMonths, latestCalved }`, each null when
   * the backend didn't send it.
   */
  summary() {
    return apiClient.get('/herd', { params: { per_page: 1 } }).then((response) => {
      const summary = response.data?.summary ?? {};
      const numberOrNull = (value) => (value === null || value === undefined || value === '' ? null : Number(value));
      return {
        totalCount: numberOrNull(summary.total_count),
        milkingCount: numberOrNull(summary.milking_count),
        dryCount: numberOrNull(summary.dry_count),
        averageAgeMonths: numberOrNull(summary.average_age_months),
        latestCalved: summary.latest_calved ?? null,
      };
    });
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
  uploadPhoto(id, photoFile, { onProgress } = {}) {
    const formData = new FormData();
    formData.append('photo', photoFile);
    return apiClient.post(`/herd/${id}/photo`, formData, {
      // A photo can take well over the default 10 s on 2G/3G.
      timeout: PHOTO_UPLOAD_TIMEOUT_MS,
      onUploadProgress: onProgress
        ? (event) => { if (event.total) onProgress(Math.round((event.loaded / event.total) * 100)); }
        : undefined,
    }).then((response) => normalizeHerdRecord(toObject(response.data) ?? {}));
  },
  deletePhoto(id) {
    return apiClient.delete(`/herd/${id}/photo`)
      .then((response) => normalizeHerdRecord(toObject(response.data) ?? {}));
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
  listHeatObservations(params = {}) {
    return apiClient.get('/v1/breeding/heat-observations', { params }).then((response) => toArray(response.data?.items));
  },
  createHeatObservation(payload) {
    return apiClient.post('/v1/breeding/heat-observations', payload).then((response) => toObject(response.data));
  },
  listLogs() {
    return apiClient.get('/operations/breeding-logs').then((response) => extractBreedingLogsArray(response.data));
  },
  createLog(payload) {
    return apiClient.post('/operations/breeding-logs', payload).then((response) => toObject(response.data));
  },
  updateLog(logId, payload) {
    return apiClient.put(`/operations/breeding-logs/${logId}`, payload).then((response) => toObject(response.data));
  },
  uploadCertificate(logId, certificateFile) {
    const formData = new FormData();
    formData.append('certificate', certificateFile);
    return apiClient.post(`/operations/breeding-logs/${logId}/certificate`, formData).then((response) => toObject(response.data));
  },
  updateLogStatus(logId, status) {
    return requestWithFallback(apiClient, [
      {
        method: 'patch',
        url: `/v1/breeding/insemination/${logId}/outcome`,
        data: { status },
      },
      {
        method: 'put',
        url: `/operations/breeding-logs/${logId}/status`,
        data: { status },
      },
    ]).then((response) => toObject(response.data));
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
      // All four are computed by the backend over the cow's whole history.
      const stats = firstPage.stats ?? {
        average_yield: firstPage.summary?.average_yield ?? firstPage.average_yield ?? firstPage.average ?? null,
        peak_yield: firstPage.summary?.peak_yield ?? firstPage.peak_yield ?? firstPage.peak ?? null,
        total_logged: firstPage.summary?.total_logged ?? firstPage.total_logged ?? firstPage.summary?.total ?? null,
        session_count: firstPage.summary?.session_count ?? firstPage.session_count ?? null,
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
  recordCalving(id, payload) {
    return requestWithFallback(apiClient, [
      {
        method: 'post',
        url: `/animals/${id}/calving`,
        data: payload,
      },
      {
        method: 'post',
        url: `/animals/${id}/events`,
        data: { ...payload, event_type: 'calving' },
      },
    ]).then((response) => toObject(response.data));
  },
  downloadPassportPdf(id) {
    return apiClient.get(`/v1/export/animal/${id}/pdf`, { responseType: 'blob' })
      .then((response) => response.data);
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
    ]).then(normalizeMedicalMutationResponse);
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

      return normalizeMedicalMutationResponse(completionResponse);
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

      return normalizeMedicalMutationResponse(scheduleResponse);
    }

    return normalizeMedicalMutationResponse(response);
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
    ]).then(normalizeMedicalMutationResponse);
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
    ]).then(normalizeMedicalMutationResponse);
  },
};

export const safetyApi = {
  dashboard() {
    return apiClient.get('/safety/dashboard').then((response) => toObject(response.data));
  },
  activeHardlocks() {
    return apiClient.get('/veterinary/hardlocks/active').then((response) => toArray(response.data));
  },
  // The paginated payload (`{ items, meta }`), for the safety board, which shows the total.
  hardlockPage({ perPage = 100 } = {}) {
    return apiClient.get('/veterinary/hardlocks/active', { params: { per_page: perPage } }).then((response) => response.data);
  },
  // Owners lock or release a cow's milk for sale.
  // The clinical blueprint is mounted at /api/clinical. Releasing during a withdrawal
  // needs `overrideReason` (audited); without it the backend answers 409 WITHDRAWAL_ACTIVE.
  setHardlock(cowId, isLocked, { overrideReason } = {}) {
    const body = { is_locked: Boolean(isLocked), ...(overrideReason ? { override_reason: overrideReason } : {}) };
    return apiClient.put(`/clinical/cows/${cowId}/hardlock`, body).then((response) => toObject(response.data));
  },
  // Anyone who can see the board can hold a cow's milk; only the farmer releases it.
  placeHold({ cowId, reason, until, notes }) {
    const body = { cow_id: cowId, reason, ...(until ? { until } : {}), ...(notes ? { notes } : {}) };
    return apiClient.post('/safety/holds', body).then((response) => toObject(response.data));
  },
  // A FAIL puts the milk on hold on the server; a PASS never releases it.
  recordMilkTest({ cowId, testType, result, testedAt, notes }) {
    const body = { cow_id: cowId, test_type: testType, result, ...(testedAt ? { tested_at: testedAt } : {}), ...(notes ? { notes } : {}) };
    return apiClient.post('/safety/milk-tests', body).then((response) => {
      const data = toObject(response.data) ?? {};
      return { test: data.test ?? null, placedOnHold: Boolean(data.placed_on_hold), hold: data.hold ?? null };
    });
  },
  milkTests(cowId) {
    return apiClient.get(`/safety/cows/${cowId}/milk-tests`).then((response) => toArray(response.data?.items ?? response.data));
  },
};

// "06:00:00" → "06:00"; null when the backend sent no time.
const toClockTime = (value) => (typeof value === 'string' && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : null);
const checklistLines = (text) => String(text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);

/**
 * One time block of the farm's daily routine, as the pages use it. The checklist is the
 * manager's text, one action per line (the backend's `notes`, or its `checklist_items`).
 */
export const normalizeRoutinePlan = (plan = {}) => {
  const start = toClockTime(plan.start_time);
  const end = toClockTime(plan.end_time);
  const items = Array.isArray(plan.checklist_items) ? plan.checklist_items : [];
  return {
    id: plan.id,
    title: plan.task_title ?? plan.title ?? '',
    description: plan.task_description ?? '',
    time: start && end ? `${start}–${end}` : (start ?? ''),
    startTime: plan.start_time ?? null,
    endTime: plan.end_time ?? null,
    checklist: plan.notes ?? items.join('\n'),
    displayOrder: plan.display_order ?? null,
    isActive: plan.is_active !== false,
  };
};

/** Normalized plans back into the body POST /routine/plans expects (it replaces the whole plan). */
export const buildRoutinePlansPayload = (plans = []) => plans.map((plan, index) => ({
  task_title: plan.title,
  task_description: plan.description || plan.title,
  start_time: plan.startTime,
  end_time: plan.endTime,
  notes: plan.checklist,
  checklist_items: checklistLines(plan.checklist),
  display_order: plan.displayOrder ?? index,
  is_active: plan.isActive,
}));

export const routineApi = {
  listPlans() {
    return apiClient.get('/routine/plans').then((response) => toArray(response.data).map(normalizeRoutinePlan));
  },
  /** Saves the whole plan (the backend replaces it). Takes normalized plans. */
  savePlans(plans) {
    return apiClient.post('/routine/plans', buildRoutinePlansPayload(plans)).then((response) => toObject(response.data));
  },
};

export const feedApi = {
  calculateSchedule(payload) {
    // This function adapts to the unified backend endpoint which now supports two modes.
    // It determines the correct 'target_mode' based on the payload structure to ensure
    // backward compatibility while enabling the new per-cow planning logic.
    const hasPerCowTargets = Array.isArray(payload.per_cow_targets) && payload.per_cow_targets.length > 0;

    let apiPayload;

    if (hasPerCowTargets) {
      // If per-cow targets are provided, use the modern 'per_cow' mode.
      // This delegates to HerdFeedingPlanService on the backend for a full breakdown.
      apiPayload = {
        ...payload,
        target_mode: 'per_cow',
      };
    } else {
      // For backward compatibility, use the legacy 'herd' mode.
      // This performs a simple herd-level calculation.
      apiPayload = {
        ...payload,
        target_mode: 'herd',
      };
    }
    return apiClient.post('/v1/feed/calculate-schedule', apiPayload).then((response) => toObject(response.data));
  },
};

export const nutritionApi = {
  dashboard() {
    return apiClient.get('/nutrition/dashboard').then((response) => toObject(response.data));
  },
  listFeedingGroupProfiles() {
    return apiClient.get('/v1/nutrition/feeding-groups/profiles')
      .then((response) => Array.isArray(response.data?.profiles) ? response.data.profiles : toArray(response.data));
  },
  updateFeedingGroupProfile(feedingGroup, payload) {
    return apiClient.put(`/v1/nutrition/feeding-groups/profiles/${encodeURIComponent(feedingGroup)}`, payload)
      .then((response) => toObject(response.data));
  },
  getFeedingPlanByGroup(params = {}) {
    return requestWithFallback(apiClient, [
      {
        method: 'get',
        url: '/v1/nutrition/herd/feeding-plan/by-group',
        params,
      },
      {
        method: 'get',
        url: '/v1/herd/feeding-plan/by-group',
        params,
      },
    ])
      .then((response) => toObject(response.data));
  },
  listRecipes() {
    return apiClient.get('/feed/recipes')
      .then((response) => validateResponse(API_CONTRACTS.RECIPES, toArray(response.data), 'RECIPES'));
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
    return apiClient.get('/units/conversions').then((response) => toArray(response.data).map(normalizeUnitConversion));
  },
  /** Saves a unit helper: `{ itemId, unitName, kgEquivalent }` → POST { item_id, unit_name, kg_equivalent }. */
  saveConversion({ itemId, unitName, kgEquivalent }) {
    return apiClient.post('/units/conversions', { item_id: itemId, unit_name: unitName, kg_equivalent: kgEquivalent })
      .then((response) => normalizeUnitConversion(toObject(response.data)));
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
  // Cost-free instructions for the people doing the feeding (page access `feeding`).
  feedingToday() {
    return apiClient.get('/v1/nutrition/feeding/today').then((response) => toObject(response.data));
  },
  suggestedBatchSize(recipeType, days) {
    return apiClient.get('/v1/nutrition/batches/suggested-size', { params: { recipe_type: recipeType, days } })
      .then((response) => toObject(response.data));
  },
  feedCostEfficiency() {
    return apiClient.get('/v1/nutrition/analytics/feed-cost-efficiency')
      .then((response) => validateResponse(API_CONTRACTS.FEED_COST_EFFICIENCY, toObject(response.data), 'FEED_COST_EFFICIENCY'));
  },
  activeBatchRoiTrendWeekly() {
    return apiClient.get('/v1/nutrition/analytics/active-batch-roi-trend-weekly')
      .then((response) => validateResponse(API_CONTRACTS.ROI_TREND_WEEKLY, toArray(response.data), 'ROI_TREND_WEEKLY'));
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
  /**
   * Everything the operations reporting dashboard shows for a date range, as the backend
   * returns it: `{ ledger, milkInventory, dairyEconomics, buyerPerformance: [one per buyer] }`.
   */
  getOperationsDashboard({ startDate, endDate, buyerIds = [], search = '' }) {
    const params = { start_date: startDate, end_date: endDate, ...(search ? { search } : {}) };
    return Promise.all([
      apiClient.get('/finance/ledger', { params }),
      apiClient.get('/reports/milk-inventory', { params }),
      apiClient.get('/reports/dairy-unit-economics', { params }),
      ...buyerIds.map((buyerId) => apiClient.get('/reports/buyer-performance', { params: { ...params, buyer_id: buyerId } })),
    ]).then(([ledger, milkInventory, dairyEconomics, ...buyers]) => ({
      ledger: ledger?.data ?? null,
      milkInventory: milkInventory?.data ?? null,
      dairyEconomics: dairyEconomics?.data ?? null,
      buyerPerformance: buyers.map((response) => response?.data ?? null),
    }));
  },
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
  getDairyUnitEconomics: (params = {}) => {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.marketing_spend_kes != null && params.marketing_spend_kes !== '') query.append('marketing_spend_kes', params.marketing_spend_kes);
    if (params.new_customers_acquired != null && params.new_customers_acquired !== '') query.append('new_customers_acquired', params.new_customers_acquired);
    if (params.customer_lifespan_months != null && params.customer_lifespan_months !== '') query.append('customer_lifespan_months', params.customer_lifespan_months);

    const queryString = query.toString();
    return apiClient.get(`/reports/dairy-unit-economics${queryString ? `?${queryString}` : ''}`).then((res) => res.data);
  },
  getDairyUnitEconomicsByFarm: (params = {}) => {
    const query = new URLSearchParams();
    if (params.start_date) query.append('start_date', params.start_date);
    if (params.end_date) query.append('end_date', params.end_date);
    if (params.marketing_spend_kes != null && params.marketing_spend_kes !== '') query.append('marketing_spend_kes', params.marketing_spend_kes);
    if (params.new_customers_acquired != null && params.new_customers_acquired !== '') query.append('new_customers_acquired', params.new_customers_acquired);
    if (params.customer_lifespan_months != null && params.customer_lifespan_months !== '') query.append('customer_lifespan_months', params.customer_lifespan_months);

    const queryString = query.toString();
    return apiClient.get(`/reports/dairy-unit-economics/by-farm${queryString ? `?${queryString}` : ''}`).then((res) => res.data);
  },
  calculateDairyUnitEconomics: (data) => {
    return apiClient.post('/reports/dairy-unit-economics/calculator', data).then((res) => res.data);
  },
  getAnimalEconomics: (animalId) => {
    return apiClient.get(`/reports/animal-economics/${animalId}`).then((res) => res.data);
  },
};
