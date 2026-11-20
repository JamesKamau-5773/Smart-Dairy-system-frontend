import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../lib/backendApi';
import { getAccountFlags } from '../../lib/authState';
import { formatDate } from '../../lib/dateFormat';
import { humanizeEnum } from '../../lib/enumLabel';
import { roleName } from '../../lib/roleName';
import { accountCopy as copy } from '../../i18n/account';
import ProfileDetails from '../../components/account/ProfileDetails';
import ProfilePassword from '../../components/account/ProfilePassword';
import AlertBanner from '../../components/ui/AlertBanner';
import { Skeleton } from '../../components/ui';

const initials = (name) => String(name ?? '')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0].toUpperCase())
  .join('') || '?';

function StaffRecord({ staff }) {
  const s = copy.staff;
  const rows = [
    [s.fullName, staff.full_name],
    [s.jobTitle, staff.job_title],
    [s.hireDate, staff.hire_date ? formatDate(staff.hire_date) : null],
    [s.status, staff.status ? humanizeEnum(staff.status) : null],
  ];
  return (
    <section aria-labelledby="profile-staff-title" className="rounded-card border border-ink/10 bg-card">
      <header className="border-b border-ink/10 px-5 py-4">
        <h2 id="profile-staff-title" className="text-section-title text-ink">{s.title}</h2>
        <p className="mt-1 text-body text-ink-muted">{s.hint}</p>
      </header>
      <dl className="divide-y divide-ink/5 px-5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-6 py-3">
            <dt className="text-meta text-ink-muted">{label}</dt>
            <dd className="text-right text-body-strong text-ink">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The signed-in person's own profile: who they are, their details (editable), their staff
 * record if they have one, and their password. Everything shown is GET /auth/me; after a save
 * the account is read again, so the header and this page show what the backend now holds.
 */
export default function ProfilePage() {
  const { currentUser, refreshUser, updateSession } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['my-profile', currentUser?.id ?? null];
  const profileQuery = useQuery({ queryKey, queryFn: () => authApi.me() });
  const profile = profileQuery.data;
  // Demo sessions can't change anything; the backend refuses with DEMO_READ_ONLY anyway.
  const readOnly = currentUser?.read_only === true || currentUser?.is_demo === true;

  const reload = async () => {
    const user = await refreshUser();
    queryClient.setQueryData(queryKey, user);
  };
  const storeNewSession = async (session) => {
    await updateSession(session);
    await reload();
  };

  if (profileQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6" role="status" aria-label={copy.loading}>
        <Skeleton className="h-28 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }
  if (profileQuery.isError || !profile) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <AlertBanner
          type="danger"
          message={copy.loadFailed}
          action={{ label: copy.retry, onClick: () => profileQuery.refetch() }}
        />
      </div>
    );
  }

  const flags = getAccountFlags(profile);
  const role = roleName(profile.role) || profile.role_label;
  const farm = profile.farm_name || profile.tenant_name;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      {readOnly && <AlertBanner type="info" message={copy.demoNotice} />}

      <section aria-label={copy.title} className="flex items-center gap-4 rounded-card border border-ink/10 bg-card px-5 py-5">
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-section-title text-brand">
          {initials(profile.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-section-title text-ink">{profile.name || profile.username}</p>
          <p className="truncate text-body text-ink-muted">{[role, farm].filter(Boolean).join(' · ')}</p>
          {profile.member_since && <p className="text-meta text-ink-muted">{copy.memberSince(formatDate(profile.member_since))}</p>}
        </div>
      </section>

      <ProfileDetails key={profile.id ?? 'me'} profile={profile} readOnly={readOnly} onSaved={reload} />
      {profile.staff_profile && <StaffRecord staff={profile.staff_profile} />}
      <ProfilePassword
        profile={profile}
        hasPassword={flags.has_password !== false}
        readOnly={readOnly}
        onChanged={storeNewSession}
      />
    </div>
  );
}
