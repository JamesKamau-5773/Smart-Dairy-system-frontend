import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart2, Calendar, Search } from 'lucide-react';

import { useTenant } from '../../hooks/useTenant';
import { reportsApi } from '../../lib/backendApi'; // Assuming reportsApi is added to backendApi
import { Skeleton } from '../../components/ui'; // Assuming a Skeleton component exists

const MilkInventoryReport = () => {
  const { tenantId, farmId } = useTenant();
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['milk-inventory-report', tenantId, farmId, filters.startDate, filters.endDate],
    queryFn: () => reportsApi.getMilkInventory(filters.startDate, filters.endDate),
    enabled: !!tenantId && !!farmId && !!filters.startDate && !!filters.endDate,
    keepPreviousData: true,
  });

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Chart expects data in ascending date order, while the API returns descending.
  const chartData = useMemo(() => {
    return data?.daily_records?.slice().reverse().map(d => ({
      ...d,
      // Format date for better display on chart axis
      date: format(parseISO(d.date), 'MMM d'),
    })) || [];
  }, [data]);

  const tableData = useMemo(() => data?.daily_records || [], [data]);

  return (
    <div className="animate-reveal space-y-6 max-w-7xl mx-auto">
      <div className="rounded-[28px] border border-ink/10 bg-[linear-gradient(135deg,rgba(223,249,255,0.95),rgba(255,255,255,0.98))] p-5 sm:p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand/5 text-brand rounded-lg border border-brand/10">
            <BarChart2 size={20} />
          </div>
          <div>
            <h2 className="font-sans font-bold text-2xl tracking-tight text-brand m-0">
              Milk Inventory Report
            </h2>
            <p className="text-sm text-ink-muted mt-1">Historical view of milk production, sales, and unsold amounts.</p>
          </div>
        </div>
      </div>

      <div className="card-machined p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
          <label className="space-y-1 text-xs font-semibold text-ink-muted">
            Start Date
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="input-machined"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold text-ink-muted">
            End Date
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="input-machined"
            />
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="card-machined p-6 text-center text-ink-muted">Loading report data...</div>
      ) : isError ? (
        <div className="card-machined p-6 text-center text-danger">
          Error loading report: {error.message}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="card-machined bg-surface p-6 shadow-sm border border-ink/5">
            <h3 className="text-base font-bold text-brand mb-4">Daily Trends</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} label={{ value: 'Liters (L)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: '#64748b' } }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', border: '1px solid rgba(0, 0, 0, 0.1)', borderRadius: '0.5rem' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="total_produced" name="Produced" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="total_sold" name="Sold" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="total_unsold" name="Unsold" stroke="#ffc658" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card-machined overflow-hidden !p-0">
            <div className="p-5 border-b border-ink/10 bg-surface-raised">
              <h3 className="font-bold text-brand text-lg m-0">Daily Records</h3>
              <p className="text-sm text-ink-muted">Most recent records first.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-brand/5">
                  <tr className="border-b border-ink/10">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-ink-muted">Date</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-ink-muted text-right">Produced (L)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-ink-muted text-right">Sold (L)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-ink-muted text-right">Unsold (L)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5 bg-white">
                  {tableData.map((row) => (
                    <tr key={row.date} className="hover:bg-surface-raised transition-colors">
                      <td className="p-4 text-sm text-ink-muted font-medium">{format(parseISO(row.date), 'PPP')}</td>
                      <td className="p-4 text-sm font-semibold text-ink text-right tabular-nums">{row.total_produced.toFixed(2)}</td>
                      <td className="p-4 text-sm font-semibold text-success text-right tabular-nums">{row.total_sold.toFixed(2)}</td>
                      <td className="p-4 text-sm font-semibold text-warning-dark text-right tabular-nums">{row.total_unsold.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tableData.length === 0 && (
                <div className="p-10 text-center text-ink-muted bg-surface-warm/30">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand mb-3">
                    <Calendar size={18} />
                  </div>
                  <p className="font-semibold text-ink">No records found for the selected date range.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilkInventoryReport;