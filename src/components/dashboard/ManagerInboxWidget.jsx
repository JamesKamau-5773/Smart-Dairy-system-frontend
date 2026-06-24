import React from 'react';
import { AlertTriangle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ManagerInboxWidget() {
  // Mock data - In a real app, this comes from your useQuery(QUERY_KEYS.ALERTS)
  const activeAlerts = [
    {
      id: 1,
      title: 'Herd Target Discrepancy',
      message: 'Current Dairy Meal yields 14.7% Protein, but the Herd Target requires 16.0%.',
      time: 'Today, 02:00 AM',
      actionLink: '/feed-nutrition/mix',
      actionText: 'Adjust Formula',
      icon: AlertTriangle,
      status: 'Action Required'
    }
  ];

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <AlertTriangle className="text-danger" size={24} />
        <h2 className="text-xl font-bold text-ink">Needs Attention</h2>
        <span className="bg-danger text-surface text-xs font-bold px-3 py-1 rounded-full">
          {activeAlerts.length} {activeAlerts.length === 1 ? 'alert' : 'alerts'}
        </span>
      </div>

      {/* Alert Cards */}
      <div className="space-y-4">
        {activeAlerts.map((alert) => (
          <div 
            key={alert.id} 
            className="bg-surface rounded-2xl border border-ink/10 shadow-sm flex items-start gap-4 p-5 relative overflow-hidden"
          >
            {/* Left Vertical Brand Bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand rounded-l-2xl"></div>
            
            {/* Icon */}
            <div className="p-3 bg-brand/5 rounded-xl text-brand ml-2">
              <alert.icon size={20} />
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-brand text-base">{alert.title}</h4>
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40 bg-brand/5 px-2 py-1 rounded-md">
                  {alert.time}
                </span>
              </div>
              <p className="text-sm text-ink-muted mt-1 leading-relaxed max-w-lg">
                {alert.message}
              </p>
              
              {/* Primary Action Button */}
              <div className="mt-4">
                <Link 
                  to={alert.actionLink}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand text-surface text-xs font-bold rounded-lg hover:bg-brand/90 transition-colors shadow-sm"
                >
                  <Settings size={14} /> {alert.actionText}
                </Link>
              </div>
            </div>
            
            {/* High-Contrast Status Badge */}
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-danger-dark bg-danger/10 border border-danger/20 px-2 py-1 rounded-md">
                {alert.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}