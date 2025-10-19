"use client";

import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationStore, type Notification } from '@/store/notificationStore';

interface ToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

function Toast({ notification, onDismiss }: ToastProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getColorClasses = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900/20 dark:border-slate-800 dark:text-slate-200';
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm animate-in slide-in-from-right-2 max-w-md',
        getColorClasses()
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">
          {notification.title}
        </div>
        {notification.message && (
          <div className="text-sm opacity-90 mt-1">
            {notification.message}
          </div>
        )}
      </div>
      
      {notification.dismissible && (
        <button
          onClick={() => onDismiss(notification.id)}
          className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function ToastContainer() {
  const { notifications, removeNotification } = useNotificationStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-50 space-y-3 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Toast
            notification={notification}
            onDismiss={removeNotification}
          />
        </div>
      ))}
    </div>
  );
}
