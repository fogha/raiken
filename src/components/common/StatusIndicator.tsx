/**
 * Status Indicator Component
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { StatusType } from '@/types';

interface StatusIndicatorProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  className?: string;
}

const statusColors = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
  loading: 'bg-yellow-400',
  idle: 'bg-gray-400',
};

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function StatusIndicator({ 
  status, 
  size = 'md', 
  showPulse = false,
  className 
}: StatusIndicatorProps) {
  return (
    <div
      className={cn(
        'rounded-full',
        statusColors[status],
        sizeClasses[size],
        showPulse && (status === 'loading' || status === 'warning') && 'animate-pulse',
        className
      )}
      title={`Status: ${status}`}
    />
  );
}
