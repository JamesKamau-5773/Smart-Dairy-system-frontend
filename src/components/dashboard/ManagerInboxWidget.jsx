import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { safetyApi } from '../../lib/backendApi';
import { useTenant } from '../../hooks/useTenant';
import { dashboardCopy } from '../../i18n/dashboard';

export default function ManagerInboxWidget() {
  const copy = dashboardCopy.inbox;
  const { tenantId, farmId } = useTenant();
  const { data } = useQuery({
    queryKey: ['safety-dashboard', tenantId, farmId],
    queryFn: () => safetyApi.dashboard(),
    enabled: !!tenantId && !!farmId,
  });

  const activeAlerts = React.useMemo(() => {
    const alerts = data?.alerts ?? data?.activeAlerts ?? data?.operational_alerts ?? data?.operationalAlerts ?? [];

    if (!Array.isArray(alerts)) {
      return [];
    }

    return alerts.map((alert, index) => ({
      id: alert.id ?? alert.alert_id ?? index,
      // Alert text comes from the backend; only the fallbacks are worded here.
      title: alert.title ?? alert.name ?? null,
      message: alert.message ?? alert.description ?? '',
      time: alert.time ?? alert.createdAt ?? alert.updatedAt ?? null,
      actionLink: alert.actionLink ?? alert.link ?? '/operations/safety',
      actionText: alert.actionText ?? null,
      icon: AlertTriangle,
      status: alert.status ?? null,
    }));
  }, [data]);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-ink">{copy.title}</h2>
        <span className="bg-danger text-surface text-xs font-bold px-3 py-1 rounded-full">
          {copy.count(activeAlerts.length)}
        </span>
      </div>

      {/* Alert Cards */}
      <div className="space-y-4">
        {activeAlerts.map((alert) => (
          <div 
            key={alert.id} 
            className="bg-surface rounded-2xl border border-ink/10  flex items-start gap-4 p-5 relative overflow-hidden"
          >
            {/* Left Vertical Brand Bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand rounded-l-2xl"></div>
            
            {/* Icon */}
            <div className="p-3 bg-brand/5 rounded-xl text-brand ml-2">
              <alert.icon size={20} aria-hidden="true" />
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-brand text-base">{alert.title ?? copy.fallbackTitle}</h4>
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40 bg-brand/5 px-2 py-1 rounded-md">
                  {alert.time ?? copy.fallbackTime}
                </span>
              </div>
              <p className="text-sm text-ink-muted mt-1 leading-relaxed max-w-lg">
                {alert.message}
              </p>
              
              {/* Primary Action Button */}
              <div className="mt-4">
                <Link 
                  to={alert.actionLink}
                  className="inline-flex items-center px-4 py-2 bg-brand text-surface text-xs font-bold rounded-lg hover:bg-brand/90 transition-colors "
                >
                  {alert.actionText ?? copy.fallbackAction}
                </Link>
              </div>
            </div>
            
            {/* High-Contrast Status Badge */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-danger-dark bg-danger/10 border border-danger/20 px-2 py-1 rounded-md">
                {alert.status ?? copy.fallbackStatus}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}