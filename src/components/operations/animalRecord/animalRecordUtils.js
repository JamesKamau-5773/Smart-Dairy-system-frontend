export function getAvatarLabel(animal) {
  const nameInitial = animal?.name?.trim()?.charAt(0)?.toUpperCase();
  const idInitial = animal?.id?.trim()?.charAt(0)?.toUpperCase();
  return nameInitial || idInitial || 'C';
}

export function calculateDaysInMilk(lastCalved) {
  if (!lastCalved) return null;

  const calvingDate = new Date(lastCalved);
  if (Number.isNaN(calvingDate.getTime())) return null;

  const elapsedDays = Math.floor((Date.now() - calvingDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, elapsedDays);
}