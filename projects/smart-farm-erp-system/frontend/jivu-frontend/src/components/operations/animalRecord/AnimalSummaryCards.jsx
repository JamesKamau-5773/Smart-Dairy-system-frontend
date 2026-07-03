import { Skeleton } from '../../ui';
import { calculateDaysInMilk, getAvatarLabel } from './animalRecordUtils';

export default function AnimalSummaryCards({ animal, isLoading }) {
  return (
    <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
      <div className="card-machined flex flex-col items-center justify-center rounded-2xl border border-ink/5 bg-surface p-6 text-center shadow-sm">
        <div className="relative mb-4 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand/10 bg-gradient-to-br from-brand/15 via-accent/10 to-surface text-xl font-black text-brand shadow-sm">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-full" />
          ) : animal.photoUrl ? (
            <img src={animal.photoUrl} alt="Cow Avatar" className="h-full w-full object-cover" />
          ) : (
            getAvatarLabel(animal)
          )}
        </div>
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">Breed & Parents</div>
        <div className="mb-2 text-lg font-black text-brand">
          {isLoading ? <Skeleton className="mx-auto h-6 w-32" /> : animal.breed}
        </div>
        <div className="text-xs font-medium leading-relaxed text-ink-muted">
          {isLoading ? <Skeleton className="mx-auto h-4 w-40" /> : <>Sire: {animal.sire} <br /> Dam: {animal.dam}</>}
        </div>
      </div>

      <div className="card-machined flex flex-col justify-between rounded-2xl border border-ink/5 bg-surface p-6 shadow-sm">
        <div>
          <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-brand">Age & Status</div>
          <div className="mb-4">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Current Age</div>
            <div className="text-xl font-black text-ink-strong">{isLoading ? <Skeleton className="h-6 w-24" /> : animal.age}</div>
          </div>
        </div>
        <div className="border-t border-ink/10 pt-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Milking Status</div>
          <div className="text-sm font-bold text-ink-strong">{isLoading ? <Skeleton className="h-4 w-20" /> : animal.status}</div>
        </div>
      </div>

      <div className="card-machined flex flex-col justify-between rounded-2xl border border-ink/5 bg-surface p-6 shadow-sm">
        <div>
          <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-brand">Milk Yield</div>
          <div className="mb-4">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Days in Milk</div>
            <div className="flex items-baseline gap-2">
              {isLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <span className="text-xl font-black text-ink-strong">{calculateDaysInMilk(animal.lastCalved) ?? 'N/A'}</span>
              )}
              {!isLoading && <span className="text-xs font-bold text-ink-muted">Days</span>}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-ink-muted">Since her last calf</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-ink/10 pt-4">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Yesterday</div>
            <div className="text-lg font-black text-ink-strong">{isLoading ? <Skeleton className="h-5 w-16" /> : animal.yesterdayYield}</div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">7-Day Avg</div>
            <div className="text-lg font-black text-brand">{isLoading ? <Skeleton className="h-5 w-16" /> : animal.sevenDayAvg}</div>
          </div>
        </div>
      </div>

      <div className="card-machined flex flex-col justify-between rounded-2xl border border-ink/5 bg-surface p-6 shadow-sm">
        <div>
          <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-brand">Breeding Status</div>
          <div className="mb-4">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Pregnancy Status</div>
            <div className={`text-xl font-black ${animal.pregnancyStatus === 'Not Pregnant' ? 'text-danger' : 'text-brand'}`}>
              {isLoading ? <Skeleton className="h-6 w-24" /> : animal.pregnancyStatus}
            </div>
            {!isLoading && animal.pregnancyStatus === 'Not Pregnant' && (
              <div className="mt-0.5 text-[11px] font-bold text-danger">Needs AI Session</div>
            )}
          </div>
        </div>
        <div className="border-t border-ink/10 pt-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">Days Since Calving</div>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <Skeleton className="h-4 w-8" />
            ) : (
              <span className="text-sm font-bold text-ink-strong">{animal.daysOpen}</span>
            )}
            {!isLoading && <span className="text-xs font-bold text-ink-muted">Days</span>}
          </div>
        </div>
      </div>
    </div>
  );
}