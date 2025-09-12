"use client";

import React, { useEffect } from 'react';
import { useLocalBridge } from '@/hooks/useLocalBridge';
import { useBrowserStore } from '@/store/browserStore';

export function LocalBridgeStatus() {
  const { connection, isConnected, isDetecting } = useLocalBridge();
  const { setStatus, clearStatus } = useBrowserStore();

  // Update status bar when detecting CLI
  useEffect(() => {
    if (isDetecting) {
      setStatus('DETECTING_CLI', 'Detecting local CLI...', 'loading');
    }
  }, [isDetecting, setStatus]);

  // Update status bar when connection state changes
  useEffect(() => {
    if (isConnected && connection) {
      const port = connection.url.replace('http://localhost:', '');
      setStatus('CLI_CONNECTED', `Local CLI connected • ${connection.projectInfo.name} • Port ${port}`, 'success');
      // Clear connected status after showing it briefly
      setTimeout(() => {
        clearStatus();
      }, 4000);
    } else if (!isDetecting) {
      // Only show disconnected status if we're not currently detecting
      setStatus('CLI_DISCONNECTED', 'Local CLI disconnected • Tests saved to browser storage', 'info');
      // Clear disconnected status after showing it briefly
      setTimeout(() => {
        clearStatus();
      }, 4000);
    }
  }, [isConnected, connection, isDetecting, setStatus, clearStatus]);

  // This component doesn't render anything visible - it just updates the status bar
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