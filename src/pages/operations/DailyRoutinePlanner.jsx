import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Save, CheckSquare } from 'lucide-react';
import { loadScheduleTasks, saveScheduleTasks } from '../../lib/schedule';
import { routineApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';

function loadInitialTasks() {
  return loadScheduleTasks();
}

export default function DailyRoutinePlanner() {
  const queryClient = useQueryClient();
  const { tenantId, farmId } = useTenant();
  const initialTasks = loadInitialTasks();
  const { data: backendTasks } = useQuery({
    queryKey: ['routine-plans', tenantId, farmId],
    queryFn: () => routineApi.listPlans(),
    enabled: !!tenantId && !!farmId,
  });
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTaskId, setActiveTaskId] = useState(initialTasks[0]?.id ?? null);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  useEffect(() => {
    if (Array.isArray(backendTasks) && backendTasks.length > 0) {
      setTasks(backendTasks);
      setActiveTaskId((currentId) => backendTasks.some((task) => task.id === currentId) ? currentId : backendTasks[0]?.id ?? null);
    }
  }, [backendTasks]);

  const activeTask = tasks.find((task) => task.id === activeTaskId) || tasks[0] || null;

  const plannerSummary = useMemo(() => {
    const tasksWithNotes = tasks.filter((task) => Boolean((task.checklist || task.notes || '').trim())).length;

    return {
      totalTasks: tasks.length,
      tasksWithNotes,
      activeSteps: (activeTask?.checklist || activeTask?.notes || '')
        .split('\n')
        .map((step) => step.trim())
        .filter(Boolean).length,
    };
  }, [activeTask?.checklist, activeTask?.notes, tasks]);

  const handleNoteChange = (text) => {
    setTasks((currentTasks) => currentTasks.map((task) => 
      task.id === activeTaskId ? { ...task, checklist: text, notes: text } : task
    ));
  };

  const saveRoutine = useMutation({
    mutationFn: (payload) => routineApi.savePlans(payload),
    onSuccess: () => {
      saveScheduleTasks(tasks);
      queryClient.invalidateQueries({ queryKey: ['routine-plans', tenantId, farmId] });
      setLastSavedAt(new Date());
    },
  });

  const handleSave = () => {
    saveRoutine.mutate(tasks);
  };

  const checklistSteps = (activeTask?.checklist || activeTask?.notes || '')
    .split('\n')
    .map((step) => step.trim())
    .filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-reveal">
      <div className="rounded-[28px] border border-ink/10 bg-[linear-gradient(135deg,rgba(223,249,255,0.94),rgba(255,255,255,0.98))] p-5 sm:p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 border-b border-ink/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-sans text-3xl font-black tracking-tight text-brand">Daily Routine Planner</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink">
              Set the daily schedule. The notes you type here will appear as a checklist on the herdsman&apos;s phone.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            <span className="rounded-full border border-ink/10 bg-surface/90 px-3 py-1">{plannerSummary.totalTasks} blocks</span>
            <span className="rounded-full border border-ink/10 bg-surface/90 px-3 py-1">{plannerSummary.tasksWithNotes} with notes</span>
            <span className="rounded-full border border-ink/10 bg-surface/90 px-3 py-1">{plannerSummary.activeSteps} active steps</span>
            {lastSavedAt && (
              <span className="rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-brand">
                Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: The Schedule List */}
        <div className="lg:col-span-2 card-machined bg-surface p-6 shadow-sm border border-ink/10">
          <div className="flex items-center justify-between mb-4 border-b border-ink/5 pb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-ink-muted flex items-center gap-2">
              <Clock size={16} /> Daily Tasks
            </h3>
          </div>

          <div className="space-y-3">
            {tasks.length === 0 && (
              <div className="rounded-xl border border-dashed border-ink/10 bg-surface-warm/60 p-5 text-sm text-ink-muted">
                No routine tasks saved yet. Add tasks in the planner and save them to load a working schedule.
              </div>
            )}
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setActiveTaskId(task.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  activeTaskId === task.id 
                    ? 'bg-brand/5 border-brand/30 shadow-sm' 
                    : 'bg-surface hover:bg-surface-raised border-ink/10'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                      activeTaskId === task.id ? 'text-brand' : 'text-ink-muted'
                    }`}>
                      {task.time}
                    </span>
                    <span className={`font-semibold text-base ${
                      activeTaskId === task.id ? 'text-brand-dark' : 'text-ink-strong'
                    }`}>
                      {task.title}
                    </span>
                  </div>

                  {task.notes && (
                    <div className="hidden md:flex items-center gap-1 text-[10px] font-bold text-ink-muted bg-surface-warm px-2 py-1 rounded">
                      <CheckSquare size={12} /> Notes Added
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-ink/10">
            <button type="button" onClick={handleSave} className="btn-command bg-brand text-surface flex items-center gap-2 px-6">
              <Save size={16} /> Save Routine
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: The Sticky Notes Editor */}
        <div className="lg:col-span-1 sticky top-6">
          <div className="card-machined bg-surface-warm/40 p-6 border border-brand/15 shadow-sm rounded-2xl">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand mb-1">
              Herdsman Instructions For:
            </h3>
            <p className="font-bold text-ink-strong text-lg mb-4 border-b border-ink/10 pb-4">
              {activeTask?.title || 'Daily Routine'}
            </p>

            <label className="block text-xs font-semibold text-ink-muted mb-2">
              Type one action per line to create a checklist:
            </label>

            <textarea
              value={activeTask?.checklist || activeTask?.notes || ''}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder={"e.g. Sweep the floor\nCheck the water"}
              className="w-full h-64 p-4 rounded-xl border border-ink/20 focus:border-brand focus:ring-1 focus:ring-brand bg-white text-sm text-ink-strong leading-relaxed resize-none transition-colors"
            />

            <p className="text-[10px] text-ink-muted mt-3 italic text-center">
              Changes stay on this time block until you click "Save Routine".
            </p>
          </div>
        </div>

      </div>

    
    </div>
  );
}
