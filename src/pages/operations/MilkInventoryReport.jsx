import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { formatDate, formatShortDate } from '@/lib/dateFormat';
import { milkCopy } from '@/i18n/milk';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar as CalendarIcon } from 'lucide-react';
import { reportsApi } from '@/lib/backendApi';
import { Skeleton } from '@/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import GroupedDateRows from '@/components/ui/GroupedDateRows';
import { shellCopy } from '../../i18n/shell';

export default function MilkInventoryReport() {
  const [date, setDate] = useState({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const [visibleLines, setVisibleLines] = useState({
    produced: true,
    sold: true,
    unsold: true,
  });

  const { data: reportData, isLoading, isError } = useQuery({
    queryKey: ['milkInventoryReport', date],
    queryFn: () => {
      const from = date.from ? format(date.from, 'yyyy-MM-dd') : undefined;
      const to = date.to ? format(date.to, 'yyyy-MM-dd') : undefined;
      return reportsApi.getMilkInventory(from, to);
    },
    enabled: !!date.from && !!date.to,
  });

  const handleToggleLine = (line) => {
    setVisibleLines(prev => ({ ...prev, [line]: !prev[line] }));
  };

  const dailyRecords = useMemo(() => {
    const dailyRecords = reportData?.daily_records;
    if (!dailyRecords || !Array.isArray(dailyRecords)) return [];
    return dailyRecords
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(item => ({
      date: String(item.date).slice(0, 10),
      produced: item.total_produced ?? item.produced ?? 0,
      sold: item.total_sold ?? item.sold ?? 0,
      unsold: item.total_unsold ?? item.unsold ?? item.remaining ?? 0,
      }));
  }, [reportData]);

  const chartData = useMemo(() => dailyRecords.map((record) => ({
    ...record,
    label: formatShortDate(record.date),
  })), [dailyRecords]);

  const copy = milkCopy.inventoryReport;
  return (
    <div className="animate-reveal space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 gap-4">
        <div>
          <h1 className="font-sans font-black text-3xl tracking-tight text-ink m-0">
            {shellCopy.nav.items.milkInventory}
          </h1>
          <p className="text-sm font-medium text-ink-muted mt-2 max-w-xl">
            {copy.subtitle}
          </p>
        </div>
      </div>

      <div className="card-machined p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 border-b border-ink/10 pb-4">
          <h3 className="font-sans font-bold text-xl text-brand">

            {copy.trend}
          </h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal rounded-md border-ink/20",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {formatDate(date.from)} -{" "}
                      {formatDate(date.to)}
                    </>
                  ) : (
                    formatDate(date.from)
                  )
                ) : (
                  <span>{copy.pickDate}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center justify-end gap-6 mb-4">
          {Object.keys(visibleLines).map((lineKey) => (
            <label key={lineKey} className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input
                type="checkbox"
                checked={visibleLines[lineKey]}
                onChange={() => handleToggleLine(lineKey)}
                className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
              />
              <span>{copy.lines[lineKey]}</span>
            </label>
          ))}
        </div>
        <div className="h-96">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : isError ? (
            <div className="flex items-center justify-center h-full text-brand">
              {copy.loadFailed}
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" L" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend />
                {visibleLines.produced && <Line type="monotone" dataKey="produced" name={copy.legend.produced} stroke="#38BDF8" strokeWidth={2} />}
                {visibleLines.sold && <Line type="monotone" dataKey="sold" name={copy.legend.sold} stroke="#16a34a" strokeWidth={2} />}
                {visibleLines.unsold && <Line type="monotone" dataKey="unsold" name={copy.legend.unsold} stroke="#ef4444" strokeWidth={2} />}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-ink-muted">
              {copy.noData}
            </div>
          )}
        </div>
      </div>

      <div className="card-machined overflow-hidden !p-0">
        <div className="p-6 border-b border-ink/10">
          <h3 className="font-bold text-lg text-ink">{copy.dailyRecords}</h3>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead className="bg-surface-raised">
              <tr>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted">{copy.columns.date}</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">{copy.columns.produced}</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">{copy.columns.sold}</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">{copy.columns.unsold}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan="4" className="p-4"><Skeleton className="h-6 w-full" /></td></tr>
                ))
              ) : isError ? (
                <tr><td colSpan="4" className="p-6 text-center text-brand">{copy.loadFailed}</td></tr>
              ) : chartData.length > 0 ? (
                <GroupedDateRows
                  items={dailyRecords}
                  getDate={(record) => record.date}
                  colSpan={4}
                  renderGroupMeta={(items) => {
                    const totals = items.reduce((sum, item) => ({
                      produced: sum.produced + Number(item.produced || 0),
                      sold: sum.sold + Number(item.sold || 0),
                      unsold: sum.unsold + Number(item.unsold || 0),
                    }), { produced: 0, sold: 0, unsold: 0 });
                    return copy.dayMeta(totals.produced.toFixed(1), totals.sold.toFixed(1), totals.unsold.toFixed(1));
                  }}
                  renderItem={(record) => (
                  <tr key={record.date} className="hover:bg-surface-raised transition-colors">
                    <td className="p-4 text-sm font-medium text-ink">{formatDate(record.date)}</td>
                    <td className="p-4 text-sm font-semibold text-ink text-right tabular-nums">{record.produced.toFixed(1)}</td>
                    <td className="p-4 text-sm font-semibold text-brand text-right tabular-nums">{record.sold.toFixed(1)}</td>
                    <td className="p-4 text-sm font-semibold text-brand-dark text-right tabular-nums">{record.unsold.toFixed(1)}</td>
                  </tr>
                  )}
                />
              ) : (
                <tr><td colSpan="4" className="p-6 text-center text-ink-muted">{copy.noData}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-ink/10 md:hidden">
          {isLoading ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-20 w-full" /></div>)
            : isError ? <p className="p-5 text-center text-sm text-brand">{copy.loadFailed}</p>
              : dailyRecords.map((record) => (
                <article key={record.date} className="grid grid-cols-2 gap-3 p-4 text-sm">
                  <div className="col-span-2 font-semibold text-ink">{formatDate(record.date)}</div>
                  <div><p className="text-xs text-ink-muted">{copy.lines.produced}</p><p className="mt-1 font-semibold tabular-nums text-ink">{Number(record.produced || 0).toFixed(1)} L</p></div>
                  <div><p className="text-xs text-ink-muted">{copy.lines.sold}</p><p className="mt-1 font-semibold tabular-nums text-brand">{Number(record.sold || 0).toFixed(1)} L</p></div>
                  <div className="col-span-2"><p className="text-xs text-ink-muted">{copy.lines.unsold}</p><p className="mt-1 font-semibold tabular-nums text-ink">{Number(record.unsold || 0).toFixed(1)} L</p></div>
                </article>
              ))}
          {!isLoading && !isError && dailyRecords.length === 0 && <p className="p-5 text-center text-sm text-ink-muted">{copy.noData}</p>}
        </div>
      </div>
    </div>
  );
}
