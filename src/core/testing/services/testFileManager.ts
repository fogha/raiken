import fs from 'fs';
import path from 'path';

// Directory for test scripts
export const TEST_SCRIPTS_DIR = 'generated-tests';

export interface TestFile {
  name: string;       
  path: string;      
  content: string;    
}

export async function saveTestScript(name: string, content: string, tabId?: string): Promise<string> {
  // Generate safe filename with optional tab ID for uniqueness
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
    
  const filename = tabId ? `${safeName}_${tabId}.spec.ts` : `${safeName}.spec.ts`;
  const filePath = path.join(TEST_SCRIPTS_DIR, filename);
  
  try {
    // Ensure the directory exists
    if (!fs.existsSync(TEST_SCRIPTS_DIR)) {
      fs.mkdirSync(TEST_SCRIPTS_DIR, { recursive: true });
    }
    
    // Write the test script to file
    fs.writeFileSync(filePath, content);
    console.log(`[Arten] Test script saved to ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('[Arten] Error saving test script:', error);
    throw error;
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
    console.error('[Arten] Error listing test scripts:', error);
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
    
    const response = await fetch(`/api/test-files?directory=${directory}&filename=${filename}`);
    
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
    
    const response = await fetch(`/api/test-files?directory=${directory}&filename=${filename}`, {
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