"use client";

import { useState, useEffect } from 'react';
import { localBridge } from '@/lib/local-bridge';

interface LocalBridgeConnection {
  url: string;
  token: string;
  projectInfo: any;
  connected: boolean;
}

export function useLocalBridge() {
  const [connection, setConnection] = useState<LocalBridgeConnection | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const detectCLI = async () => {
    setIsDetecting(true);
    try {
      const detected = await localBridge.detectLocalCLI();
      setConnection(detected);
      return detected;
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    // Auto-detect on mount
    detectCLI();
  }, []);

  return {
    connection,
    isConnected: localBridge.isConnected(),
    isDetecting,
    detectCLI,
    saveTest: localBridge.saveTestToLocal.bind(localBridge),
    executeTest: localBridge.executeTestRemotely.bind(localBridge),
    getTestFiles: localBridge.getLocalTestFiles.bind(localBridge)
  };
} 