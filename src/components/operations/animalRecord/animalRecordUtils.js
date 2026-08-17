export function getAvatarLabel(animal) {
  const nameInitial = String(animal?.name ?? '').trim().charAt(0)?.toUpperCase();
  const idInitial = String(animal?.id ?? '').trim().charAt(0)?.toUpperCase();
  return nameInitial || idInitial || 'C';
}
