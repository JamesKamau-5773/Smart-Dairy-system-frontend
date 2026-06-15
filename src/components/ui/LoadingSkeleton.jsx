import React from 'react';
import Skeleton from './Skeleton';

export default function LoadingSkeleton({ className = '', type = 'box', rows = 1 }) {
  if (rows > 1) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton
            key={index}
            className={index === rows - 1 ? 'h-4 w-5/6' : 'h-4 w-full'}
          />
        ))}
      </div>
    );
  }

  if (type === 'text') {
    return <Skeleton className={`h-6 w-3/4 ${className}`} />;
  }

  return <Skeleton className={`h-full w-full ${className}`} />;
}