"use client";

import React from 'react';
import { useNotificationStore, type Notification } from '@/store/notificationStore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const getIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    case 'info':
    default:
      return Info;
  }
};

const getAlertStyles = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return 'border-green-200 bg-green-50';
    case 'error':
      return 'border-red-200 bg-red-50';
    case 'warning':
      return 'border-orange-200 bg-orange-50';
    case 'info':
    default:
      return 'border-blue-200 bg-blue-50';
  }
};

const getIconStyles = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return 'text-green-600';
    case 'error':
      return 'text-red-600';
    case 'warning':
      return 'text-orange-600';
    case 'info':
    default:
      return 'text-blue-600';
  }
};

const getTitleStyles = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return 'text-green-800';
    case 'error':
      return 'text-red-800';
    case 'warning':
      return 'text-orange-800';
    case 'info':
    default:
      return 'text-blue-800';
  }
};

const getMessageStyles = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return 'text-green-700';
    case 'error':
      return 'text-red-700';
    case 'warning':
      return 'text-orange-700';
    case 'info':
    default:
      return 'text-blue-700';
  }
};

function NotificationItem({ notification }: { notification: Notification }) {
  const { removeNotification } = useNotificationStore();
  const Icon = getIcon(notification.type);

  const handleClose = () => {
    removeNotification(notification.id);
  };

  return (
    <Alert className={`w-96 max-w-[calc(100vw-2rem)] shadow-lg ${getAlertStyles(notification.type)}`}>
      <Icon className={`h-4 w-4 ${getIconStyles(notification.type)}`} />
      <div className="flex-1 min-w-0">
        <AlertTitle className={`${getTitleStyles(notification.type)}`}>
          {notification.title}
        </AlertTitle>
        {notification.message && (
          <AlertDescription className={`${getMessageStyles(notification.type)} mt-1`}>
            {notification.message}
          </AlertDescription>
        )}
      </div>
      {notification.dismissible && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClose} 
          className="h-6 w-6 p-0 ml-2 flex-shrink-0"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Alert>
  );
}

export function NotificationContainer() {
  const { notifications } = useNotificationStore();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
} 