// Memory Tracker - Tracks memory usage and savings from suspension
export class MemoryTracker {
  constructor() {
    this.storageKey = 'memoryStats';
    this.averageTabMemory = 50 * 1024 * 1024; // Assume 50MB per tab average
  }

  async getStats() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      const stats = result[this.storageKey] || {
        totalSuspensions: 0,
        estimatedMemorySaved: 0,
        lastUpdated: Date.now()
      };

      // Get current memory info if available
      try {
        const memoryInfo = await chrome.system.memory.getInfo();
        stats.currentAvailableMemory = memoryInfo.availableCapacity;
        stats.totalMemory = memoryInfo.capacity;
        stats.memoryUsagePercent = ((memoryInfo.capacity - memoryInfo.availableCapacity) / memoryInfo.capacity * 100).toFixed(1);
      } catch (error) {
        // Memory API not available
        console.log('Memory API not available');
      }

      // Calculate current suspended tabs
      const tabs = await chrome.tabs.query({});
      const suspendedCount = tabs.filter(tab => 
        tab.url && tab.url.includes(chrome.runtime.getURL('suspended.html'))
      ).length;
      
      stats.currentSuspendedTabs = suspendedCount;
      stats.estimatedCurrentSavings = suspendedCount * this.averageTabMemory;

      return stats;
    } catch (error) {
      console.error('Error getting memory stats:', error);
      return {
        totalSuspensions: 0,
        estimatedMemorySaved: 0,
        currentSuspendedTabs: 0,
        estimatedCurrentSavings: 0
      };
    }
  }

  async trackSuspension(tabId) {
    try {
      const stats = await this.getStats();
      stats.totalSuspensions = (stats.totalSuspensions || 0) + 1;
      stats.estimatedMemorySaved = (stats.estimatedMemorySaved || 0) + this.averageTabMemory;
      stats.lastUpdated = Date.now();

      await chrome.storage.local.set({ [this.storageKey]: stats });
    } catch (error) {
      console.error('Error tracking suspension:', error);
    }
  }

  async resetStats() {
    try {
      await chrome.storage.local.set({
        [this.storageKey]: {
          totalSuspensions: 0,
          estimatedMemorySaved: 0,
          lastUpdated: Date.now()
        }
      });
    } catch (error) {
      console.error('Error resetting stats:', error);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getDetailedStats() {
    const stats = await this.getStats();
    
    return {
      ...stats,
      formattedMemorySaved: this.formatBytes(stats.estimatedMemorySaved || 0),
      formattedCurrentSavings: this.formatBytes(stats.estimatedCurrentSavings || 0),
      formattedAvailableMemory: stats.currentAvailableMemory ? 
        this.formatBytes(stats.currentAvailableMemory) : 'N/A',
      formattedTotalMemory: stats.totalMemory ? 
        this.formatBytes(stats.totalMemory) : 'N/A'
    };
  }
}
