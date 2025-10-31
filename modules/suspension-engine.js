// Suspension Engine - Determines if a tab is safe to suspend
export class SuspensionEngine {
  constructor() {
    this.unsafeIndicators = {
      hasFormData: false,
      hasActiveMedia: false,
      isDownloading: false
    };
  }

  async isSafeToSuspend(tabId) {
    try {
      // Check if tab has form data or active media
      const response = await chrome.tabs.sendMessage(tabId, { 
        action: 'checkSuspensionSafety' 
      });

      if (response) {
        // Don't suspend if any unsafe conditions are present
        if (response.hasFormData) {
          console.log(`Tab ${tabId} has form data, skipping suspension`);
          return false;
        }
        
        if (response.hasActiveMedia) {
          console.log(`Tab ${tabId} has active media, skipping suspension`);
          return false;
        }
        
        if (response.isLoading) {
          console.log(`Tab ${tabId} is still loading, skipping suspension`);
          return false;
        }
      }

      return true;
    } catch (error) {
      // If we can't communicate with the tab, it's likely safe to suspend
      // (content script not injected or page doesn't support it)
      return true;
    }
  }

  shouldSuspendBasedOnUrl(url) {
    if (!url) return false;
    
    // Never suspend these URLs
    const neverSuspend = [
      'chrome://',
      'chrome-extension://',
      'about:',
      'edge://',
      'browser:',
      'file://',
      'view-source:'
    ];

    return !neverSuspend.some(prefix => url.startsWith(prefix));
  }

  async getSuspensionRecommendation(tab) {
    // Returns a recommendation object with reasoning
    const recommendation = {
      shouldSuspend: false,
      reason: '',
      confidence: 0
    };

    // Check URL
    if (!this.shouldSuspendBasedOnUrl(tab.url)) {
      recommendation.reason = 'Special URL that should not be suspended';
      recommendation.confidence = 1.0;
      return recommendation;
    }

    // Check if pinned
    if (tab.pinned) {
      recommendation.reason = 'Tab is pinned';
      recommendation.confidence = 0.9;
      return recommendation;
    }

    // Check if audible
    if (tab.audible) {
      recommendation.reason = 'Tab is playing audio';
      recommendation.confidence = 1.0;
      return recommendation;
    }

    // Check safety
    const isSafe = await this.isSafeToSuspend(tab.id);
    if (!isSafe) {
      recommendation.reason = 'Tab has active content (form data or media)';
      recommendation.confidence = 0.95;
      return recommendation;
    }

    // Safe to suspend
    recommendation.shouldSuspend = true;
    recommendation.reason = 'Tab is idle and safe to suspend';
    recommendation.confidence = 0.9;
    
    return recommendation;
  }
}
