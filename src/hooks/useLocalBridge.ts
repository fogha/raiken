"use client";

import { useState, useEffect } from 'react';
import { unifiedBridge, BridgeMode, BridgeStatus } from '@/lib/unified-bridge';

export function useLocalBridge() {
  const [connection, setConnection] = useState<BridgeStatus | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const detectBridge = async () => {
    setIsDetecting(true);
    try {
      const bridge = await unifiedBridge.getBridge();
      const status = unifiedBridge.getStatus();
      setConnection(status.connected ? status : null);
      return bridge;
    } finally {
      setIsDetecting(false);
    }
  };

  const reconnect = async () => {
    setIsDetecting(true);
    try {
      const success = await unifiedBridge.reconnect();
      const status = unifiedBridge.getStatus();
      setConnection(success ? status : null);
      return success;
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    // Auto-detect on mount
    detectBridge();

    // Update connection status periodically
    const interval = setInterval(() => {
      const status = unifiedBridge.getStatus();
      setConnection(status.connected ? status : null);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    connection,
    isConnected: connection?.connected ?? false,
    isDetecting,
    detectBridge,
    reconnect,
    saveTest: unifiedBridge.saveTest.bind(unifiedBridge),
    executeTest: unifiedBridge.executeTest.bind(unifiedBridge),
    getTestFiles: unifiedBridge.getTestFiles.bind(unifiedBridge),
    getReports: unifiedBridge.getReports.bind(unifiedBridge),
    deleteReport: unifiedBridge.deleteReport.bind(unifiedBridge),
    getStatus: () => unifiedBridge.getStatus(),
    disconnect: () => unifiedBridge.disconnect()
  };
} 