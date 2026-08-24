import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Droplets, Filter, Calendar as CalendarIcon, Table } from 'lucide-react';
import { reportsApi } from '@/lib/backendApi';
import { Skeleton } from '@/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


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

  const chartData = useMemo(() => {
    const dailyRecords = reportData?.daily_records;
    if (!dailyRecords || !Array.isArray(dailyRecords)) return [];
    // Sort records chronologically to ensure the chart's x-axis flows correctly from left (oldest) to right (newest).
    return dailyRecords
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(item => ({
      date: format(new Date(item.date), 'MMM d'),
      produced: item.total_produced ?? item.produced ?? 0,
      sold: item.total_sold ?? item.sold ?? 0,
      unsold: item.total_unsold ?? item.unsold ?? item.remaining ?? 0,
    }));
  }, [reportData]);

  return (
    <div className="animate-reveal space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink/10 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 text-brand border border-brand/10 text-[10px] font-bold uppercase tracking-widest rounded-full mb-3">
            <Droplets size={12} /> Reports
          </div>
          <h1 className="font-sans font-black text-3xl tracking-tight text-ink m-0">
            Milk Inventory Report
          </h1>
          <p className="text-sm font-medium text-ink-muted mt-2 max-w-xl">
            Visualize the flow of milk from production to sales over time.
          </p>
        </div>
      </div>

      <div className="card-machined p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 border-b border-ink/10 pb-4">
          <h3 className="font-sans font-bold text-xl text-brand flex items-center gap-2">
            <Droplets size={20} className="text-accent" /> Milk Inventory Trend
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
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
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
              <span className="capitalize">{lineKey}</span>
            </label>
          ))}
        </div>
        <div className="h-96">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : isError ? (
            <div className="flex items-center justify-center h-full text-danger">
              Error loading report data.
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
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
                {visibleLines.produced && <Line type="monotone" dataKey="produced" name="Total Produced" stroke="#3b82f6" strokeWidth={2} />}
                {visibleLines.sold && <Line type="monotone" dataKey="sold" name="Total Sold" stroke="#16a34a" strokeWidth={2} />}
                {visibleLines.unsold && <Line type="monotone" dataKey="unsold" name="Total Unsold" stroke="#ef4444" strokeWidth={2} />}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-ink-muted">
              No data available for the selected date range.
            </div>
          )}
        </div>
      </div>

      <div className="card-machined overflow-hidden !p-0">
        <div className="p-6 border-b border-ink/10 flex items-center gap-2">
          <Table size={18} className="text-brand" />
          <h3 className="font-bold text-lg text-ink">Daily Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-raised">
              <tr>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted">Date</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">Produced (L)</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">Sold (L)</th>
                <th className="p-4 font-sans text-xs font-semibold uppercase tracking-wider text-ink-muted text-right">Unsold (L)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan="4" className="p-4"><Skeleton className="h-6 w-full" /></td></tr>
                ))
              ) : isError ? (
                <tr><td colSpan="4" className="p-6 text-center text-danger">Error loading report data.</td></tr>
              ) : chartData.length > 0 ? (
                chartData.map((record) => (
                  <tr key={record.date} className="hover:bg-surface-raised transition-colors">
                    <td className="p-4 text-sm font-medium text-ink">{record.date}</td>
                    <td className="p-4 text-sm font-semibold text-ink text-right tabular-nums">{record.produced.toFixed(1)}</td>
                    <td className="p-4 text-sm font-semibold text-success text-right tabular-nums">{record.sold.toFixed(1)}</td>
                    <td className="p-4 text-sm font-semibold text-danger text-right tabular-nums">{record.unsold.toFixed(1)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="p-6 text-center text-ink-muted">No data available for the selected date range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}