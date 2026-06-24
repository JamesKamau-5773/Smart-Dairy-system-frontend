import React from 'react';
import { AlertOctagon } from 'lucide-react';

export default function BiologicalLimitAlert({ feedTarget, naturalLimit }) {
  const safeTarget = feedTarget || 0;
  const safeLimit = naturalLimit || 0;

  // Only show if we are feeding for MORE milk than the cow can naturally produce today
  if (safeTarget <= safeLimit) return null;

  return (
    <div className="mt-4 p-4 bg-danger/10 border border-danger/20 rounded-md flex gap-3 shadow-sm">
      <AlertOctagon className="text-danger shrink-0 mt-0.5" size={20} />
      <div>
        <h4 className="text-sm font-bold text-danger uppercase tracking-wide">⚠️ Wasting Feed (Overfeeding)</h4>
        <p className="text-sm text-danger/90 mt-1">
          Your feed mix is built for <strong>{safeTarget.toFixed(1)}L</strong>, but based on this cow's Days In Milk (DIM), her natural limit today is only <strong>~{safeLimit.toFixed(1)}L</strong>. 
          <br className="my-1"/>
          <em>Action: She will not give you more milk, she will just gain weight. Reduce concentrates to protect your margin.</em>
        </p>
      </div>
    </div>
  );
}