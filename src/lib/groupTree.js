import { GROUP_LEVELS } from './periodTotals';
import { formatDayLabel } from './dateFormat';

// Builds the date-group tree (Year → Month → [Week →] Day; the page picks the levels)
// from keys only: group totals from the API (looked up by key) and each record's
// `bucket`. Nothing is added up; a group with no API totals simply has `totals: null`.

const byKeyDesc = (left, right) => (left.key < right.key ? 1 : left.key > right.key ? -1 : 0);

export function buildGroupTree(records, getBucket, groups, levels = GROUP_LEVELS) {
  const nodes = new Map();
  const ensure = (level, key, parent) => {
    if (!key) return null;
    let node = nodes.get(key);
    if (!node) {
      const api = groups?.get(key);
      node = {
        level: api?.level ?? level,
        key,
        label: api?.label ?? null,
        parent: parent ?? null,
        totals: api?.totals ?? null,
        children: [],
        records: [],
      };
      nodes.set(key, node);
    } else if (!node.parent && parent) {
      node.parent = parent;
    }
    return node;
  };

  // An API parent on a level this page doesn't show (e.g. a week) is ignored; the
  // records' buckets supply the parent instead.
  const shownParent = (group) => {
    const parent = group.parent ? groups.get(group.parent) : null;
    return parent && levels.includes(parent.level) ? group.parent : null;
  };
  groups?.forEach((group) => {
    if (levels.includes(group.level)) ensure(group.level, group.key, shownParent(group));
  });

  const ungrouped = [];
  records.forEach((record) => {
    const bucket = getBucket(record);
    if (!bucket || levels.some((level) => !bucket[level])) {
      ungrouped.push(record);
      return;
    }
    let parent = null;
    let node = null;
    levels.forEach((level) => {
      node = ensure(level, bucket[level], parent);
      parent = bucket[level];
    });
    node.records.push(record);
  });

  const roots = [];
  nodes.forEach((node) => {
    const parent = node.parent ? nodes.get(node.parent) : null;
    if (parent && levels.indexOf(parent.level) < levels.indexOf(node.level)) parent.children.push(node);
    else roots.push(node);
  });
  nodes.forEach((node) => node.children.sort(byKeyDesc));
  roots.sort(byKeyDesc);

  return { roots, nodes, ungrouped };
}

/** A group's own label: day groups as "Tue 03 Nov"; others as the API names them. */
export function groupLabel(node) {
  if (node.level === 'day') return formatDayLabel(node.key) ?? node.label ?? node.key;
  return node.label ?? node.key;
}

/**
 * Display nodes: every level keeps its own header (Year → Month → Day, always).
 * `labelOf` names a group (default `groupLabel`); a page's config may pass its own.
 */
export function expandAll(roots, labelOf = groupLabel) {
  const toDisplay = (node) => ({ ...node, keys: [node.key], label: labelOf(node), children: node.children.map(toDisplay) });
  return roots.map(toDisplay);
}

/** Keys of a node and all its ancestors. */
export function ancestorKeys(nodes, key) {
  const keys = [];
  let node = nodes.get(key);
  while (node && !keys.includes(node.key)) {
    keys.push(node.key);
    node = node.parent ? nodes.get(node.parent) : null;
  }
  return keys;
}

/**
 * Open by default: today's day and its parents. If today has no group, the current
 * year and month (when present) and their newest groups below.
 */
export function defaultOpenKeys(tree, today) {
  if (tree.nodes.has(today)) return new Set(ancestorKeys(tree.nodes, today));
  const preferred = [today.slice(0, 4), today.slice(0, 7)];
  const open = new Set();
  let level = tree.roots;
  for (let depth = 0; depth < GROUP_LEVELS.length && level.length > 0; depth += 1) {
    const node = level.find((candidate) => candidate.key === preferred[depth]) ?? level[0];
    open.add(node.key);
    level = node.children;
  }
  return open;
}
