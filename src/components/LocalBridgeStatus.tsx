"use client";

import React, { useEffect } from 'react';
import { useLocalBridge } from '@/hooks/useLocalBridge';
import { useNotificationStore } from '@/store/notificationStore';

export function LocalBridgeStatus() {
  const { connection, isConnected, isDetecting } = useLocalBridge();
  const { addNotification } = useNotificationStore();

  // Show notification when detecting CLI
  useEffect(() => {
    if (isDetecting) {
      addNotification({
        type: 'info',
        title: 'Detecting local CLI',
        message: 'Searching for Arten CLI bridge server...',
        duration: 5000,
      });
    }
  }, [isDetecting, addNotification]);

  // Show notification when connection state changes
  useEffect(() => {
    if (isConnected && connection) {
      addNotification({
        type: 'success',
        title: 'Connected to local project',
        message: `${connection.projectInfo.name} • ${connection.projectInfo.type} • ${connection.projectInfo.testDir} • ${connection.url.replace('http://localhost:', 'port ')}`,
        duration: 10000,
      });
    } else if (!isDetecting) {
      // Only show disconnected notification if we're not currently detecting
      addNotification({
        type: 'warning',
        title: 'Local CLI not detected',
        message: 'To save tests directly to your project, run the bridge server.',
        duration: 10000,
      });
    }
  }, [isConnected, connection, isDetecting, addNotification]);

  // This component doesn't render anything visible - it just manages notifications
  return null;
}

export function LocalBridgeToggle() {
  const { isConnected } = useLocalBridge();
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
      <span className="text-sm text-gray-600">
        {isConnected ? 'Local CLI Connected' : 'Local CLI Disconnected'}
      </span>
    </div>
  );
} 