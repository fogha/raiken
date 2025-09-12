/**
 * Storage Service - Abstraction for data persistence
 */

export class StorageService {
  private prefix: string;

  constructor(prefix: string = 'raiken') {
    this.prefix = prefix;
  }

  /**
   * Get item from localStorage
   */
  getItem<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(`${this.prefix}:${key}`);
      if (item === null) {
        return defaultValue || null;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return defaultValue || null;
    }
  }

  /**
   * Set item in localStorage
   */
  setItem<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(`${this.prefix}:${key}`, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(`${this.prefix}:${key}`);
      return true;
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all items with prefix
   */
  clear(): boolean {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(`${this.prefix}:`)
      );
      keys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }

  /**
   * Get all keys with prefix
   */
  getAllKeys(): string[] {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(`${this.prefix}:`))
      .map(key => key.replace(`${this.prefix}:`, ''));
  }

  /**
   * Check if key exists
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(`${this.prefix}:${key}`) !== null;
  }
}

export const storageService = new StorageService();
