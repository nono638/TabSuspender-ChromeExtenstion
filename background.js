// Background Service Worker for Tab Suspension
import { TabStateManager } from './modules/tab-state-manager.js';
import { SuspensionEngine } from './modules/suspension-engine.js';
import { WhitelistManager } from './modules/whitelist-manager.js';
import { MemoryTracker } from './modules/memory-tracker.js';

class TabSuspender {
  constructor() {
    this.stateManager = new TabStateManager();
    this.suspensionEngine = new SuspensionEngine();
    this.whitelistManager = new WhitelistManager();
    this.memoryTracker = new MemoryTracker();
    
    this.tabActivity = new Map(); // tabId -> lastActivityTimestamp
    this.suspensionTimer = 5 * 60 * 1000; // 5 minutes default
    this.checkInterval = 60 * 1000; // Check every minute
    
    this.init();
  }

  async init() {
    // Load settings
    const settings = await this.loadSettings();
    this.suspensionTimer = settings.suspensionTimer || (5 * 60 * 1000); // Default 5 minutes
    
    // Set up listeners
    this.setupListeners();
    
    // Start periodic check (every 30 seconds)
    chrome.alarms.create('checkTabs', { periodInMinutes: 0.5 });
    
    console.log('Tab Suspender initialized');
  }

  async loadSettings() {
    const result = await chrome.storage.local.get(['suspensionTimer', 'customRules']);
    return {
      suspensionTimer: result.suspensionTimer || (5 * 60 * 1000), // Default 5 minutes
      customRules: result.customRules || []
    };
  }

  setupListeners() {
    // Track tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.markTabActive(activeInfo.tabId);
    });

    // Track tab updates (navigation, etc)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.markTabActive(tabId);
      }
    });

    // Track tab creation
    chrome.tabs.onCreated.addListener((tab) => {
      this.markTabActive(tab.id);
    });

    // Clean up closed tabs
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabActivity.delete(tabId);
    });

    // Listen for idle state changes
    chrome.idle.onStateChanged.addListener((state) => {
      if (state === 'active') {
        // User became active, mark current tab as active
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            this.markTabActive(tabs[0].id);
          }
        });
      }
    });

    // Periodic check alarm
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'checkTabs') {
        this.checkAndSuspendTabs();
      }
    });

    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Handle async messages properly
      this.handleMessage(request, sender, sendResponse).catch(error => {
        console.error('Error handling message:', error);
        sendResponse({ error: error.message });
      });
      return true; // Keep channel open for async response
    });
  }

  markTabActive(tabId) {
    this.tabActivity.set(tabId, Date.now());
  }

  async checkAndSuspendTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const now = Date.now();
      const settings = await this.loadSettings();
      const whitelist = await this.whitelistManager.getWhitelist();
      const customRules = settings.customRules || [];

      for (const tab of tabs) {
        // Skip if tab is already discarded or suspended
        if (tab.discarded) continue;
        
        // Skip active tab
        if (tab.active) continue;
        
        // Skip special URLs
        if (this.isSpecialUrl(tab.url)) continue;
        
        // Check whitelist
        if (this.whitelistManager.isWhitelisted(tab.url, whitelist)) continue;
        
        // Get suspension time for this tab (check custom rules first)
        let suspensionTime = this.suspensionTimer;
        
        // Check if there's a custom rule for this domain
        if (tab.url) {
          try {
            const url = new URL(tab.url);
            const hostname = url.hostname;
            
            const rule = customRules.find(r => 
              hostname === r.domain || hostname.endsWith('.' + r.domain)
            );
            
            if (rule) {
              suspensionTime = rule.minutes * 60 * 1000; // Convert minutes to milliseconds
            }
          } catch (error) {
            // Invalid URL, use default time
          }
        }
        
        // Check if tab should be suspended
        const lastActivity = this.tabActivity.get(tab.id) || tab.lastAccessed || now;
        const idleTime = now - lastActivity;
        
        if (idleTime >= suspensionTime) {
          // Check if tab is safe to suspend
          const isSafe = await this.suspensionEngine.isSafeToSuspend(tab.id);
          
          if (isSafe) {
            await this.suspendTab(tab);
          }
        }
      }
    } catch (error) {
      console.error('Error checking tabs:', error);
    }
  }

  async suspendTab(tab) {
    try {
      // Save tab state before suspending
      await this.stateManager.saveTabState(tab);
      
      // Create suspended page URL
      const suspendedUrl = chrome.runtime.getURL('suspended.html') + 
        `?url=${encodeURIComponent(tab.url)}` +
        `&title=${encodeURIComponent(tab.title)}` +
        `&favicon=${encodeURIComponent(tab.favIconUrl || '')}`;
      
      // Navigate to suspended page
      await chrome.tabs.update(tab.id, { url: suspendedUrl });
      
      // Track memory saved
      await this.memoryTracker.trackSuspension(tab.id);
      
      console.log(`Suspended tab: ${tab.title}`);
    } catch (error) {
      console.error('Error suspending tab:', error);
    }
  }

  async restoreTab(tabId, originalUrl) {
    try {
      // Restore tab state
      const state = await this.stateManager.getTabState(originalUrl);
      
      // Navigate back to original URL
      await chrome.tabs.update(tabId, { url: originalUrl });
      
      // Mark as active
      this.markTabActive(tabId);
      
      // Restore scroll position after load
      if (state && state.scrollPosition) {
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, {
            action: 'restoreScroll',
            position: state.scrollPosition
          }).catch(() => {
            // Tab may not be ready yet
          });
        }, 1000);
      }
      
      console.log(`Restored tab: ${originalUrl}`);
    } catch (error) {
      console.error('Error restoring tab:', error);
    }
  }

  isSpecialUrl(url) {
    if (!url) return true;
    
    const specialProtocols = ['chrome:', 'chrome-extension:', 'about:', 'edge:', 'browser:'];
    return specialProtocols.some(protocol => url.startsWith(protocol));
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'restoreTab':
          await this.restoreTab(sender.tab.id, request.url);
          sendResponse({ success: true });
          break;
          
        case 'getMemoryStats':
          const stats = await this.memoryTracker.getStats();
          sendResponse(stats);
          break;
          
        case 'addToWhitelist':
          await this.whitelistManager.addDomain(request.domain);
          sendResponse({ success: true });
          break;
          
        case 'removeFromWhitelist':
          await this.whitelistManager.removeDomain(request.domain);
          sendResponse({ success: true });
          break;
          
        case 'getWhitelist':
          const whitelist = await this.whitelistManager.getWhitelist();
          sendResponse(whitelist);
          break;
          
        case 'updateSettings':
          await chrome.storage.local.set(request.settings);
          if (request.settings.suspensionTimer) {
            this.suspensionTimer = request.settings.suspensionTimer;
          }
          sendResponse({ success: true });
          break;
          
        case 'tabActivity':
          this.markTabActive(sender.tab.id);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }
}

// Initialize the tab suspender
const tabSuspender = new TabSuspender();
