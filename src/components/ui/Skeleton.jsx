import React from 'react';

export default function Skeleton({ className = '', ...props }) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-md bg-ink/5 ${className}`}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent motion-reduce:animate-none" />
    </div>
  );
}