// Tab State Manager - Saves and restores tab state
export class TabStateManager {
  constructor() {
    this.storageKey = 'tabStates';
  }

  async saveTabState(tab) {
    try {
      // Get scroll position from content script
      let scrollPosition = { x: 0, y: 0 };
      
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getScrollPosition' });
        if (response && response.position) {
          scrollPosition = response.position;
        }
      } catch (error) {
        // Content script may not be ready or tab may not support it
      }

      const state = {
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl,
        scrollPosition: scrollPosition,
        timestamp: Date.now()
      };

      // Store in chrome.storage.local
      const key = `tabState_${this.getUrlHash(tab.url)}`;
      await chrome.storage.local.set({ [key]: state });

      return state;
    } catch (error) {
      console.error('Error saving tab state:', error);
      return null;
    }
  }

  async getTabState(url) {
    try {
      const key = `tabState_${this.getUrlHash(url)}`;
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('Error getting tab state:', error);
      return null;
    }
  }

  async clearTabState(url) {
    try {
      const key = `tabState_${this.getUrlHash(url)}`;
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('Error clearing tab state:', error);
    }
  }

  async cleanOldStates() {
    try {
      const allData = await chrome.storage.local.get(null);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      const keysToRemove = [];

      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('tabState_') && value.timestamp) {
          if (now - value.timestamp > maxAge) {
            keysToRemove.push(key);
          }
        }
      }

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleaned ${keysToRemove.length} old tab states`);
      }
    } catch (error) {
      console.error('Error cleaning old states:', error);
    }
  }

  getUrlHash(url) {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
