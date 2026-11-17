import CowPhoto from '../../ui/CowPhoto';
import { Skeleton } from '../../ui';
import { getAvatarLabel } from './animalRecordUtils';
import { formatDate } from '../../../lib/dateFormat';
import { formatAge } from '../../../lib/herdUtils';
import { herdCopy, herdStatusLabel, pregnancyLabel } from '../../../i18n/herd';

export default function AnimalSummaryCards({ animal, isLoading }) {
  const copy = herdCopy.record.summary;
  const displayAnimal = animal ?? {};
  const pregnancyStatus = displayAnimal.pregnancyStatus ?? 'Unknown';
  const ageLabel = displayAnimal.age ?? (displayAnimal.ageMonths !== undefined && displayAnimal.ageMonths !== null
    ? formatAge(Number(displayAnimal.ageMonths))
    : copy.notApplicable);
  const birthDate = displayAnimal.dateOfBirth ?? displayAnimal.date_of_birth ?? displayAnimal.dob;
  const birthDateLabel = formatDate(birthDate, copy.notRecorded);

  return (
    <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
      <div className="card-machined flex flex-col items-center justify-center rounded-2xl border border-ink/5 bg-surface p-6 text-center ">
        <div className="relative mb-4 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand/10 bg-gradient-to-br from-brand/15 via-accent/10 to-surface text-body-strong text-brand ">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-full" />
          ) : (
            <CowPhoto src={displayAnimal.photoUrl} alt={copy.avatarAlt} size={64} fallback={getAvatarLabel(displayAnimal)} />
          )}
        </div>
        <div className="mb-1 text-label text-ink-muted">{copy.breedParents}</div>
        <div className="mb-2 text-body-strong text-brand">
          {isLoading ? <Skeleton className="mx-auto h-6 w-32" /> : displayAnimal.breed}
        </div>
        <div className="text-meta text-ink-muted">
          {isLoading ? <Skeleton className="mx-auto h-4 w-40" /> : <>{copy.sire}: {displayAnimal.sire} <br /> {copy.dam}: {displayAnimal.dam} <br /> {copy.birthWeight}: {displayAnimal.birthWeightKg ?? copy.notRecorded}{displayAnimal.birthWeightKg !== null && displayAnimal.birthWeightKg !== undefined ? ' kg' : ''}</>}
        </div>
      </div>

      <div className="card-machined flex flex-col justify-between rounded-2xl border border-ink/5 bg-surface p-6 ">
        <div>
          <div className="mb-4 text-label text-brand">{copy.ageStatus}</div>
          <div className="mb-4">
            <div className="mb-1 text-label text-ink-muted">{copy.currentAge}</div>
            <div className="text-stat-value text-ink-strong">{isLoading ? <Skeleton className="h-6 w-24" /> : ageLabel}</div>
          </div>
          <div className="mb-4">
            <div className="mb-1 text-label text-ink-muted">{copy.dateOfBirth}</div>
            <div className="text-body-strong text-ink-strong">{isLoading ? <Skeleton className="h-4 w-28" /> : birthDateLabel}</div>
          </div>
        </div>
        <div className="border-t border-ink/10 pt-4">
          <div className="mb-1 text-label text-ink-muted">{copy.milkingStatus}</div>
          <div className="text-body-strong text-ink-strong">{isLoading ? <Skeleton className="h-4 w-20" /> : herdStatusLabel(displayAnimal.status)}</div>
        </div>
      </div>

      <div className="card-machined flex flex-col justify-between rounded-2xl border border-ink/5 bg-surface p-6 ">
        <div>
          <div className="mb-4 text-label text-brand">{copy.milkYield}</div>
          <div className="mb-4">
            <div className="mb-1 text-label text-ink-muted">{copy.daysInMilk}</div>
            <div className="flex items-baseline gap-2">
              {isLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <span className="text-stat-value text-ink-strong">{displayAnimal.daysInMilk ?? copy.notRecorded}</span>
              )}
              {!isLoading && displayAnimal.daysInMilk !== null && displayAnimal.daysInMilk !== undefined && (
                <span className="text-meta text-ink-muted">{copy.days}</span>
              )}
            </div>
            <div className="mt-0.5 text-meta text-ink-muted">{copy.sinceLastCalf}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-ink/10 pt-4">
          <div>
            <div className="mb-1 text-label text-ink-muted">{copy.yesterday}</div>
            <div className="text-stat-value text-ink-strong">{isLoading ? <Skeleton className="h-5 w-16" /> : displayAnimal.yesterdayYield}</div>
          </div>
          <div>
            <div className="mb-1 text-label text-ink-muted">{copy.sevenDayAvg}</div>
            <div className="text-stat-value text-brand">{isLoading ? <Skeleton className="h-5 w-16" /> : displayAnimal.sevenDayAvg}</div>
          </div>
        </div>
      </div>

      <div className="card-machined flex flex-col justify-between rounded-2xl border border-ink/5 bg-surface p-6 ">
        <div>
          <div className="mb-4 text-label text-brand">{copy.breedingStatus}</div>
          <div className="mb-4">
            <div className="mb-1 text-label text-ink-muted">{copy.pregnancyStatus}</div>
            <div className={`text-stat-value ${pregnancyStatus === 'Not Pregnant' ? 'text-danger' : 'text-brand'}`}>
              {isLoading ? <Skeleton className="h-6 w-24" /> : pregnancyLabel(pregnancyStatus)}
            </div>
            {!isLoading && pregnancyStatus === 'Not Pregnant' && (
              <div className="mt-0.5 text-meta text-danger">{copy.needsAi}</div>
            )}
          </div>
        </div>
        <div className="border-t border-ink/10 pt-4">
          <div className="mb-1 text-label text-ink-muted">{copy.daysSinceCalving}</div>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <Skeleton className="h-4 w-8" />
            ) : (
              <span className="text-body-strong text-ink-strong">{displayAnimal.daysOpen ?? copy.notApplicable}</span>
            )}
            {!isLoading && <span className="text-meta text-ink-muted">{copy.days}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
