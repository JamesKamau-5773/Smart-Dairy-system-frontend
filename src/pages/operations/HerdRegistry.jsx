import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Calendar, ChevronDown, Filter, Scale, ShieldCheck } from 'lucide-react';
import { Skeleton } from '../../components/ui';
import Modal from '../../components/ui/Modal';
import AlertBanner from '../../components/ui/AlertBanner';

const INITIAL_HERD = [
  { id: 'C-101', name: 'Luna', breed: 'Friesian', ageMonths: 38, status: 'Milking', lastCalved: '2025-03-02', milk: '26.5 L/day' },
  { id: 'C-102', name: 'Asha', breed: 'Ayrshire', ageMonths: 52, status: 'Dry', lastCalved: '2025-12-14', milk: '0.0 L/day' },
  { id: 'C-103', name: 'Nia', breed: 'Jersey', ageMonths: 29, status: 'Milking', lastCalved: '2025-04-18', milk: '21.8 L/day' },
  { id: 'C-104', name: 'Daisy', breed: 'Friesian', ageMonths: 46, status: 'Milking', lastCalved: '2025-02-10', milk: '24.1 L/day' },
  { id: 'C-105', name: 'Bella', breed: 'Friesian', ageMonths: 61, status: 'Dry', lastCalved: '2025-12-01', milk: '0.0 L/day' },
  { id: 'C-106', name: 'Mimi', breed: 'Ayrshire', ageMonths: 33, status: 'Milking', lastCalved: '2025-05-22', milk: '22.7 L/day' },
  { id: 'C-107', name: 'Zuri', breed: 'Jersey', ageMonths: 24, status: 'Milking', lastCalved: '2025-06-09', milk: '19.6 L/day' },
];

function formatAge(ageMonths) {
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  return `${years}y ${months}m`;
}

function statusTone(status) {
  if (status === 'Milking') return 'bg-accent/20 text-brand-dark border-accent/30';
  if (status === 'Dry') return 'bg-ink/10 text-ink-muted border-ink/15';
  if (status === 'Calf') return 'bg-accent/10 text-accent-dark border-accent/20';
  if (status === 'Heifer') return 'bg-surface-raised text-ink border-ink/10';
  if (status === 'Cow') return 'bg-accent/20 text-brand-dark border-accent/30';
  return 'bg-surface-raised text-ink border-ink/10';
}

export default function HerdRegistry() {
  const [sortBy, setSortBy] = useState('age');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading] = useState(false);
  const [herdState, setHerdState] = useState(INITIAL_HERD);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCow, setNewCow] = useState({ id: '', name: '', breed: '', dob: '', hasCalved: false });
  const [successMessage, setSuccessMessage] = useState('');

  const visibleHerd = herdState
    .filter((cow) => statusFilter === 'All' || cow.status === statusFilter)
    .slice()
    .sort((a, b) => {
      if (sortBy === 'breed') return a.breed.localeCompare(b.breed) || a.id.localeCompare(b.id);
      if (sortBy === 'status') return a.status.localeCompare(b.status) || a.id.localeCompare(b.id);
      return a.ageMonths - b.ageMonths;
    });

  return (
    <div className="animate-reveal space-y-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 border-b border-ink/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/10 bg-brand/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
            <BookOpen size={12} /> Herd List
          </div>
          <h2 className="m-0 font-sans text-3xl font-bold tracking-tight text-brand">
            My <span className="text-ink-muted">Herd</span>
          </h2>
          <p className="mt-2 font-mono text-xs text-ink-muted">A complete list of all animals in your boma and their current status.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
          <div className="card-machined bg-surface/80 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Total Animals</div>
            <div className="text-2xl font-black text-ink-strong">{isLoading ? <Skeleton className="h-6 w-16" /> : '7'}</div>
          </div>
          <div className="card-machined bg-surface/80 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Milking</div>
            <div className="text-2xl font-black text-ink-strong">{isLoading ? <Skeleton className="h-6 w-16" /> : '5'}</div>
          </div>
          <div className="card-machined bg-surface/80 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Dry</div>
            <div className="text-2xl font-black text-ink-strong">{isLoading ? <Skeleton className="h-6 w-16" /> : '2'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setIsAddOpen(true)} className="btn-command flex items-center gap-2">
            + Add Animal
          </button>
        </div>
      </div>

      {/* ── LIST & CONTROLS ── */}
      <div className="card-machined bg-surface/80 p-6">
        <div className="mb-6 flex flex-col gap-4 border-b border-ink/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-ink-strong font-bold text-sm">
            <Filter size={18} className="text-ink-strong" /> <span className="leading-none">Organize List</span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-2 rounded-lg border border-ink/20 bg-surface/95 px-3 py-2">
              <Scale size={16} className="text-ink-strong" />
              <label className="text-xs font-bold uppercase tracking-wider text-ink-strong" htmlFor="herd-sort">
                Sort by
              </label>
              <select
                id="herd-sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent text-sm font-semibold text-ink-strong outline-none"
              >
                <option value="age">Age</option>
                <option value="breed">Breed</option>
                <option value="status">Current Status</option>
              </select>
              <ChevronDown size={14} className="text-ink-strong" />
            </div>

            <div className="flex flex-wrap gap-2">
              {['All', 'Milking', 'Dry'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatusFilter(option)}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                    statusFilter === option
                      ? 'border-brand bg-brand text-surface'
                      : 'border-ink/10 bg-surface-raised text-ink-muted hover:border-brand/20 hover:text-brand'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card-machined overflow-hidden bg-surface/80">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-raised border-b border-ink/10">
                <th className="p-4 text-sm font-extrabold uppercase tracking-wider text-ink-strong">Ear Tag</th>
                <th className="p-4 text-sm font-extrabold uppercase tracking-wider text-ink-strong">Name</th>
                <th className="p-4 text-sm font-extrabold uppercase tracking-wider text-ink-strong">Breed</th>
                <th className="p-4 text-sm font-extrabold uppercase tracking-wider text-ink-strong">Age</th>
                <th className="p-4 text-sm font-extrabold uppercase tracking-wider text-ink-strong">Current Status</th>
                <th className="p-4 text-sm font-extrabold uppercase tracking-wider text-ink-strong text-right">Cow Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 bg-transparent">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="transition-colors">
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4 text-right"><Skeleton className="h-4 w-28 mx-auto" /></td>
                  </tr>
                ))
              ) : (
                visibleHerd.map((cow) => (
                  <tr key={cow.id} className="transition-colors hover:bg-surface-raised">
                    <td className="p-4">
                      <Link to={`/operations/animal/${cow.id}`} className="font-sans font-black text-brand hover:underline">
                        {cow.id}
                      </Link>
                    </td>
                    <td className="p-4 text-sm font-semibold text-ink">{cow.name}</td>
                    <td className="p-4 text-sm text-ink-muted">{cow.breed}</td>
                    <td className="p-4 text-sm text-ink-muted">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-ink-muted" />
                        {formatAge(cow.ageMonths)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(cow.status)}`}>
                        <ShieldCheck size={12} /> {cow.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link to={`/operations/animal/${cow.id}`} className="btn-command inline-flex items-center gap-2 text-xs">
                        View Record
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-ink-muted">
          Showing {visibleHerd.length} of {herdState.length} animals.
        </div>
      </div>

      {successMessage && (
        <div className="fixed top-4 right-4 z-50 w-[min(92vw,430px)]">
          <AlertBanner type="success" title="Herd Updated" message={successMessage} autoDismiss={2400} onDismiss={() => setSuccessMessage('')} />
        </div>
      )}

      {/* ── ADD COW MODAL ── */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Animal">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            let ageMonths = 0;
            if (newCow.dob) {
              const dob = new Date(newCow.dob);
              const now = new Date();
              const years = now.getFullYear() - dob.getFullYear();
              const months = now.getMonth() - dob.getMonth();
              ageMonths = years * 12 + months;
            }

            let status = 'Cow';
            if (newCow.hasCalved) status = 'Cow';
            else if (ageMonths < 6) status = 'Calf';
            else if (ageMonths >= 6 && ageMonths <= 15) status = 'Heifer';
            else status = 'Cow';

            const cow = {
              id: newCow.id || `C-${Math.floor(Math.random() * 900) + 100}`,
              name: newCow.name || '',
              breed: newCow.breed || 'Unknown',
              ageMonths,
              status,
              lastCalved: newCow.hasCalved ? newCow.dob : null,
              milk: '0.0 L/day',
            };

            setHerdState((prev) => [cow, ...prev]);
            setSuccessMessage(`Added ${cow.id} — ${cow.name || 'Unnamed'}`);
            setNewCow({ id: '', name: '', breed: '', dob: '', hasCalved: false });
            setIsAddOpen(false);
          }}
        >
          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">Ear Tag Number</label>
            <input className="input-machined w-full" value={newCow.id} onChange={(e) => setNewCow({ ...newCow, id: e.target.value })} placeholder="e.g. C-108" required />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">Name</label>
            <input className="input-machined w-full" value={newCow.name} onChange={(e) => setNewCow({ ...newCow, name: e.target.value })} placeholder="Optional" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">Breed</label>
            <input className="input-machined w-full" value={newCow.breed} onChange={(e) => setNewCow({ ...newCow, breed: e.target.value })} placeholder="e.g. Friesian" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-ink-muted mb-1">Date of Birth</label>
            <input type="date" className="input-machined w-full" value={newCow.dob} onChange={(e) => setNewCow({ ...newCow, dob: e.target.value })} />
          </div>

          <div className="flex items-center gap-3">
            <input id="hasCalved" type="checkbox" checked={newCow.hasCalved} onChange={(e) => setNewCow({ ...newCow, hasCalved: e.target.checked })} />
            <label htmlFor="hasCalved" className="text-sm font-semibold text-ink-strong">Has had a calf before</label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsAddOpen(false)} className="btn-command bg-surface-raised text-ink">Cancel</button>
            <button type="submit" className="btn-command bg-brand text-surface">Save Animal</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}