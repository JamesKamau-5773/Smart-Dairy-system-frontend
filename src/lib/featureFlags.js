/**
 * Switches for user-visible features that may need turning off without a code change.
 * Each reads a Vite env variable at build time ("false" or "0" turns it off); unset uses the
 * default here.
 *
 * | Flag              | Env variable                    | Default | What it controls |
 * |-------------------|---------------------------------|---------|------------------|
 * | planIndicators    | VITE_FEATURE_PLAN_INDICATORS    | on      | Demo banner, locked-feature cards |
 */
const FLAGS = {
  planIndicators: { env: 'VITE_FEATURE_PLAN_INDICATORS', default: true },
};

/**
 * @param {keyof typeof FLAGS} name
 * @param {Record<string, string|undefined>} [env] For tests; defaults to import.meta.env.
 * @returns {boolean}
 */
export function isFeatureEnabled(name, env = import.meta.env ?? {}) {
  const flag = FLAGS[name];
  if (!flag) return false;
  const raw = env[flag.env];
  if (raw === undefined || raw === '') return flag.default;
  return !['false', '0', 'off'].includes(String(raw).trim().toLowerCase());
}
