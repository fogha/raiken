import fs from 'fs';
import path from 'path';
import { localBridge } from '@/lib/local-bridge';

// Directory for test scripts
export const TEST_SCRIPTS_DIR = 'generated-tests';

export interface TestFile {
  name: string;       
  path: string;      
  content: string;    
}

export async function saveTestScript(name: string, content: string, tabId?: string): Promise<string> {
  // First, try to save via local bridge - detect if not already connected
  let bridgeConnection = localBridge.getConnectionInfo();
  if (!bridgeConnection) {
    console.log(`[Raiken] No bridge connection found, attempting to detect local CLI...`);
    bridgeConnection = await localBridge.detectLocalCLI();
  }

  if (bridgeConnection && localBridge.isConnected()) {
    try {
      // Generate safe filename for bridge
      const safeName = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      const filename = tabId ? `${safeName}_${tabId}.spec.ts` : `${safeName}.spec.ts`;
      
      console.log(`[Raiken] Attempting to save to local bridge: ${filename}`);
      const result = await localBridge.saveTestToLocal(content, filename, tabId);
      
      if (result.success && result.path) {
        console.log(`[Raiken] Test script saved to local project: ${result.path}`);
        return result.path;
      } else {
        console.warn(`[Raiken] Local bridge save failed: ${result.error}, falling back to local save`);
      }
    } catch (error) {
      console.warn(`[Raiken] Local bridge error: ${error}, falling back to local save`);
    }
  } else {
    console.log(`[Raiken] No local bridge connection available, saving locally`);
  }

  // Fallback: Save locally to generated-tests directory
  // Generate safe filename
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
  let filename: string;
  let filePath: string;
  
  if (tabId) {
    // For tabs, check if a file already exists for this tab ID
    const existingFile = findExistingFileForTab(tabId);
    if (existingFile) {
      // Update the existing file
      filename = path.basename(existingFile);
      filePath = existingFile;
      console.log(`[Raiken] Updating existing file for tab ${tabId}: ${filePath}`);
    } else {
      // Create new file with tab ID
      filename = `${safeName}_${tabId}.spec.ts`;
      filePath = path.join(TEST_SCRIPTS_DIR, filename);
      console.log(`[Raiken] Creating new file for tab ${tabId}: ${filePath}`);
    }
  } else {
    // No tab ID, create a simple filename
    filename = `${safeName}.spec.ts`;
    filePath = path.join(TEST_SCRIPTS_DIR, filename);
  }
  
  try {
    // Ensure the directory exists
    if (!fs.existsSync(TEST_SCRIPTS_DIR)) {
      fs.mkdirSync(TEST_SCRIPTS_DIR, { recursive: true });
    }
    
    // Write the test script to file
    fs.writeFileSync(filePath, content);
    console.log(`[Raiken] Test script saved to ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('[Raiken] Error saving test script:', error);
    throw error;
  }
}

/**
 * Find existing file for a tab ID by searching for files that end with the tab ID
 */
function findExistingFileForTab(tabId: string): string | null {
  try {
    if (!fs.existsSync(TEST_SCRIPTS_DIR)) {
      return null;
    }
    
    const files = fs.readdirSync(TEST_SCRIPTS_DIR);
    const existingFile = files.find(file => 
      file.endsWith(`_${tabId}.spec.ts`) && file.includes(tabId)
    );
    
    return existingFile ? path.join(TEST_SCRIPTS_DIR, existingFile) : null;
  } catch (error) {
    console.error('[Raiken] Error finding existing file for tab:', error);
    return null;
  }
}

export async function listTestScripts(): Promise<{ name: string; path: string; content: string }[]> {
  try {
    // Ensure the directory exists
    if (!fs.existsSync(TEST_SCRIPTS_DIR)) {
      return [];
    }
    
    const files = fs.readdirSync(TEST_SCRIPTS_DIR);
    
    return files
      .filter(file => file.endsWith('.spec.ts'))
      .map(file => {
        const filePath = path.join(TEST_SCRIPTS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        return {
          name: file.replace('.spec.ts', ''),
          path: filePath,
          content
        };
      });
  } catch (error) {
    console.error('[Raiken] Error listing test scripts:', error);
    return [];
  }
}

/**
 * Get a specific test script file by path
 */
export async function getTestScript(filePath: string): Promise<TestFile | null> {
  try {
    // Extract directory and filename
    const parts = filePath.split('/');
    const filename = parts.pop();
    const directory = parts.join('/');
    
    if (!filename) {
      throw new Error('Invalid file path');
    }
    
    const response = await fetch(`/api/v1/tests?action=list`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to get test script: ${await response.text()}`);
    }
    
    const file = await response.json();
    
    return {
      name: formatDisplayName(file.name),
      path: filePath,
      content: file.content
    };
  } catch (error) {
    console.error(`Error getting test script ${filePath}:`, error);
    return null;
  }
}

/**
 * Delete a test script file
 */
export async function deleteTestScript(filePath: string): Promise<boolean> {
  try {
    // Extract directory and filename
    const parts = filePath.split('/');
    const filename = parts.pop();
    const directory = parts.join('/');
    
    if (!filename) {
      throw new Error('Invalid file path');
    }
    
    const response = await fetch(`/api/v1/tests?path=${encodeURIComponent(filePath)}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete test script: ${await response.text()}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting test script ${filePath}:`, error);
    return false;
  }
}

/**
 * Format a filename into a display name
 */
function formatDisplayName(filename: string): string {
  return filename
    .replace(/\.spec\.ts$/, '')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
} 