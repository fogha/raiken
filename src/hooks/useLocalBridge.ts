"use client";

import { useState, useEffect, useCallback } from 'react';
import { unifiedBridgeService, BridgeStatus } from '@/lib/unified-bridge';

export function useLocalBridge() {
  const [connection, setConnection] = useState<BridgeStatus | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const detectBridge = useCallback(async () => {
    setIsDetecting(true);
    try {
      const bridge = await unifiedBridgeService.getBridge();
      const status = unifiedBridgeService.getStatus();
      setConnection(status.connected ? status : null);
      return bridge;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const reconnect = useCallback(async () => {
    setIsDetecting(true);
    try {
      const success = await unifiedBridgeService.reconnect();
      const status = unifiedBridgeService.getStatus();
      setConnection(success ? status : null);
      return success;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    unifiedBridgeService.disconnect();
    setConnection(null);
  }, []);

  const getReports = useCallback(async () => {
    const bridge = await unifiedBridgeService.getBridge();
    if (!bridge) {
      throw new Error('No bridge connection available');
    }
    return await bridge.rpc('getReports', {});
  }, []);

  const deleteReport = useCallback(async (reportId: string) => {
    const bridge = await unifiedBridgeService.getBridge();
    if (!bridge) {
      throw new Error('No bridge connection available');
    }
    return await bridge.rpc('deleteReport', { reportId });
  }, []);

  const saveTest = useCallback(async (content: string, filename: string, tabId?: string) => {
    const bridge = await unifiedBridgeService.getBridge();
    if (!bridge) {
      throw new Error('No bridge connection available');
    }
    return await bridge.rpc('saveTest', { content, filename, tabId });
  }, []);

  const executeTest = useCallback(async (testPath: string, config: any) => {
    const bridge = await unifiedBridgeService.getBridge();
    if (!bridge) {
      throw new Error('No bridge connection available');
    }
    return await bridge.rpc('executeTest', { testPath, config });
  }, []);

  const getTestFiles = useCallback(async () => {
    const bridge = await unifiedBridgeService.getBridge();
    if (!bridge) {
      throw new Error('No bridge connection available');
    }
    return await bridge.rpc('getTestFiles', {});
  }, []);

  useEffect(() => {
    detectBridge();

    const interval = setInterval(() => {
      const status = unifiedBridgeService.getStatus();
      const newConnection = status.connected ? status : null;
      
      setConnection(prevConnection => {
        const prevConnected = prevConnection?.connected ?? false;
        const newConnected = newConnection?.connected ?? false;
        
        return prevConnected !== newConnected ? newConnection : prevConnection;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [detectBridge]);

  return {
    connection,
    isConnected: connection?.connected ?? false,
    isDetecting,
    detectBridge,
    reconnect,
    disconnect,
    getReports,
    deleteReport,
    saveTest,
    executeTest,
    getTestFiles,
    getStatus: () => unifiedBridgeService.getStatus()
  };
}