function clean(value) {
  return String(value ?? '').trim();
}

export function normalizeCowIdentity(cow = {}) {
  return {
    recordId: clean(cow.recordId ?? cow.record_id ?? cow.id ?? cow.cow_id ?? cow.cowId ?? cow.animal_id ?? cow.animalId),
    earTag: clean(cow.earTag ?? cow.ear_tag ?? cow.tag_number ?? cow.tagNumber ?? cow.cow_tag ?? cow.cowTag ?? cow.tag),
    name: clean(cow.name ?? cow.cow_name ?? cow.cowName ?? cow.animal_name ?? cow.animalName),
  };
}

export function resolveCowIdentityFromHerd(cow = {}, herd = []) {
  const identity = normalizeCowIdentity(cow);
  const identifiers = [identity.recordId, identity.earTag]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  const matchedCow = herd.find((candidate) => {
    const candidateIdentity = normalizeCowIdentity(candidate);
    return [candidateIdentity.recordId, candidateIdentity.earTag]
      .filter(Boolean)
      .some((value) => identifiers.includes(value.toLowerCase()));
  });
  const matchedIdentity = normalizeCowIdentity(matchedCow);

  return {
    recordId: identity.recordId || matchedIdentity.recordId,
    earTag: identity.earTag || matchedIdentity.earTag,
    name: identity.name || matchedIdentity.name,
  };
}

export function formatCowIdentity(cow = {}, fallback = 'Unknown cow') {
  const { name, earTag } = normalizeCowIdentity(cow);

  if (name && earTag) return `${name} · ${earTag}`;
  if (name) return name;
  if (earTag) return earTag;
  return fallback;
}