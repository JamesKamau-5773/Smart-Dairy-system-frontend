import { yieldTargetsApi } from '../lib/backendApi';

const STORAGE_NAMESPACE = 'jivu:animal-yield-targets';
const UNSUPPORTED_STATUSES = new Set([405, 501]);

function getScopeStorageKey(tenantId, farmId) {
  return [STORAGE_NAMESPACE, tenantId || 'tenant', farmId || 'farm'].join(':');
}

function readScopedTargets(tenantId, farmId) {
  if (typeof window === 'undefined') {
    return {};
  }

  const raw = window.localStorage.getItem(getScopeStorageKey(tenantId, farmId));

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeScopedTargets(tenantId, farmId, targets) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getScopeStorageKey(tenantId, farmId), JSON.stringify(targets));
}

function persistTarget(tenantId, farmId, target) {
  if (!target?.cowId) {
    return target;
  }

  const storedTargets = readScopedTargets(tenantId, farmId);
  storedTargets[target.cowId] = target;
  writeScopedTargets(tenantId, farmId, storedTargets);
  return target;
}

function getStoredTarget(tenantId, farmId, cowId) {
  if (!cowId) {
    return null;
  }

  return readScopedTargets(tenantId, farmId)[String(cowId)] ?? null;
}

function isUnsupportedEndpointError(error) {
  return UNSUPPORTED_STATUSES.has(error?.response?.status);
}

function isNotFoundError(error) {
  return error?.response?.status === 404;
}

function toYieldTargetSaveError(error) {
  const status = error?.response?.status;
  const backendMessage = error?.response?.data?.message ?? error?.response?.data?.error;

  if (status === 404) {
    return new Error('This cow was not found in your current farm. Confirm the cow exists in Cow Register, then try saving the milk goal again.');
  }

  if (status === 400) {
    return new Error(backendMessage || 'Could not save milk goal because some values are invalid. Check the target liters and try again.');
  }

  return new Error(backendMessage || error?.message || 'Could not save this cow goal.');
}

function toFinitePositiveNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

export function isLactatingStatus(status) {
  return String(status ?? '').trim().toUpperCase() === 'LACTATING';
}

export function normalizeYieldTarget(record = {}, cow = null, source = 'api') {
  const cowId = String(record.cow_id ?? record.cowId ?? cow?.id ?? '').trim();
  const targetLiters = toFinitePositiveNumber(
    record.target_liters ?? record.targetLiters ?? record.daily_target_liters ?? record.target
  );

  if (!cowId || !targetLiters) {
    return null;
  }

  const currentStatus = record.current_status
    ?? record.currentStatus
    ?? cow?.current_status
    ?? cow?.currentStatus
    ?? cow?.status
    ?? '';

  const isActive = record.is_active
    ?? record.isActive
    ?? isLactatingStatus(currentStatus);

  return {
    cowId,
    cowName: cow?.name ?? record.cow_name ?? record.cowName ?? '',
    currentStatus,
    targetLiters,
    isActive: Boolean(isActive),
    updatedAt: record.updated_at ?? record.updatedAt ?? new Date().toISOString(),
    source,
  };
}

export function buildSchedulePayload({
  cows = [],
  targets = [],
  fallbackTargetLiters,
  baselineHerdMealKg,
}) {
  const lactatingCows = cows.filter((cow) => isLactatingStatus(cow.current_status ?? cow.currentStatus ?? cow.status));
  const lactatingCowIds = new Set(lactatingCows.map((cow) => String(cow.id)));
  const activeTargets = targets
    .filter(Boolean)
    .filter((target) => target.isActive && lactatingCowIds.has(String(target.cowId)));

  const aggregateTargetLiters = activeTargets.reduce((sum, target) => sum + target.targetLiters, 0);
  const fallbackLiters = toFinitePositiveNumber(fallbackTargetLiters) ?? 0;
  const resolvedTargetLiters = aggregateTargetLiters > 0 ? aggregateTargetLiters : fallbackLiters;

  return {
    request: {
      target_liters: resolvedTargetLiters,
      baseline_herd_meal_kg: baselineHerdMealKg,
      animal_targets: activeTargets.map((target) => ({
        cow_id: target.cowId,
        target_liters: target.targetLiters,
      })),
      lactating_cow_ids: Array.from(lactatingCowIds),
      target_mode: activeTargets.length > 0 ? 'per_cow' : 'herd_fallback',
    },
    summary: {
      targetLiters: resolvedTargetLiters,
      targetSource: activeTargets.length > 0 ? 'per_cow' : 'herd_fallback',
      activeCowCount: lactatingCows.length,
      targetedCowCount: activeTargets.length,
      untargetedCowCount: Math.max(lactatingCows.length - activeTargets.length, 0),
    },
  };
}

export function summarizeTargets({ cows = [], targets = [] }) {
  const targetsByCowId = new Map(
    targets
      .filter(Boolean)
      .map((target) => [String(target.cowId), target])
  );

  const baseRows = cows.map((cow) => {
    const cowId = String(cow?.id ?? '').trim();
    const currentStatus = cow?.current_status ?? cow?.currentStatus ?? cow?.status ?? 'UNKNOWN';
    const isLactating = isLactatingStatus(currentStatus);
    const target = targetsByCowId.get(cowId) ?? null;

    return {
      cowId,
      cowName: cow?.name ?? cow?.cow_name ?? cowId,
      currentStatus,
      isLactating,
      hasTarget: Boolean(target?.targetLiters),
      isTargetActive: Boolean(target?.isActive),
      targetLiters: target?.targetLiters ?? null,
    };
  });

  const lactatingWithTarget = baseRows.filter((row) => row.isLactating && row.isTargetActive && row.hasTarget);
  const lactatingMissingTarget = baseRows.filter((row) => row.isLactating && !row.hasTarget);
  const inactiveWithTarget = baseRows.filter((row) => !row.isLactating && row.hasTarget);
  const lactatingCount = baseRows.filter((row) => row.isLactating).length;
  const targetedCount = lactatingWithTarget.length;
  const coveragePercent = lactatingCount > 0
    ? Math.round((targetedCount / lactatingCount) * 100)
    : 0;

  const sourceMix = targets.reduce((acc, target) => {
    const source = String(target?.source ?? 'unknown').toLowerCase();
    if (source === 'api') {
      acc.api += 1;
    } else if (source === 'local') {
      acc.local += 1;
    } else {
      acc.unknown += 1;
    }
    return acc;
  }, { api: 0, local: 0, unknown: 0 });

  const updatedTimestamps = targets
    .map((target) => target?.updatedAt)
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  const lastUpdatedAt = updatedTimestamps.length > 0
    ? new Date(Math.max(...updatedTimestamps)).toISOString()
    : null;

  return {
    lactatingWithTarget,
    lactatingMissingTarget,
    inactiveWithTarget,
    totalCows: baseRows.length,
    lactatingCount,
    targetedCount,
    untargetedCount: Math.max(lactatingCount - targetedCount, 0),
    coveragePercent,
    sourceMix,
    lastUpdatedAt,
  };
}

export const animalYieldTargetService = {
  isLactatingStatus,

  async getTarget({ cow, cowId, tenantId, farmId }) {
    const resolvedCowId = String(cow?.id ?? cowId ?? '').trim();

    if (!resolvedCowId) {
      return null;
    }

    try {
      const response = await yieldTargetsApi.get(resolvedCowId);
      const normalizedTarget = normalizeYieldTarget(response, cow, 'api');

      if (normalizedTarget) {
        persistTarget(tenantId, farmId, normalizedTarget);
      }

      return normalizedTarget;
    } catch (error) {
      if (isNotFoundError(error)) {
        return getStoredTarget(tenantId, farmId, resolvedCowId);
      }

      if (!isUnsupportedEndpointError(error)) {
        throw error;
      }

      return getStoredTarget(tenantId, farmId, resolvedCowId);
    }
  },

  async saveTarget({ cow, cowId, targetLiters, tenantId, farmId }) {
    const resolvedCowId = String(cow?.id ?? cowId ?? '').trim();
    const numericTargetLiters = toFinitePositiveNumber(targetLiters);

    if (!resolvedCowId || !numericTargetLiters) {
      throw new Error('A positive yield target is required.');
    }

    const fallbackTarget = normalizeYieldTarget({
      cow_id: resolvedCowId,
      target_liters: numericTargetLiters,
      current_status: cow?.current_status ?? cow?.currentStatus ?? cow?.status ?? '',
      is_active: isLactatingStatus(cow?.current_status ?? cow?.currentStatus ?? cow?.status),
    }, cow, 'local');

    try {
      const response = await yieldTargetsApi.save(resolvedCowId, {
        target_liters: numericTargetLiters,
      });
      const normalizedTarget = normalizeYieldTarget(response ?? fallbackTarget, cow, 'api') ?? fallbackTarget;
      persistTarget(tenantId, farmId, normalizedTarget);
      return normalizedTarget;
    } catch (error) {
      if (isNotFoundError(error)) {
        throw toYieldTargetSaveError(error);
      }

      if (!isUnsupportedEndpointError(error)) {
        throw toYieldTargetSaveError(error);
      }

      persistTarget(tenantId, farmId, fallbackTarget);
      return fallbackTarget;
    }
  },

  async listTargets({ cows = [], tenantId, farmId }) {
    const targets = await Promise.all(
      cows.map((cow) => this.getTarget({ cow, tenantId, farmId }).catch((error) => {
        if (isUnsupportedEndpointError(error)) {
          return null;
        }

        throw error;
      }))
    );

    return {
      targets: targets.filter(Boolean),
    };
  },

};

export default animalYieldTargetService;