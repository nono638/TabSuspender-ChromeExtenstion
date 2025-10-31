// Popup script for extension control panel
(function() {
  'use strict';

  let currentTab = null;
  let whitelist = [];
  let whitelistVisible = false;
  let rulesVisible = false;
  let customRules = [];

  // Initialize popup
  async function init() {
    await loadCurrentTab();
    await loadStats();
    await loadWhitelist();
    await loadSettings();
    setupEventListeners();
    
    // Start live updates every 4 seconds
    startLiveUpdates();
  }

  // Load current tab info
  async function loadCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tabs[0];

      if (currentTab) {
        document.getElementById('currentTabTitle').textContent = currentTab.title || 'Untitled';
        document.getElementById('currentTabUrl').textContent = currentTab.url || 'about:blank';

        // Check if current tab is whitelisted
        updateWhitelistButton();
      }
    } catch (error) {
      console.error('Error loading current tab:', error);
    }
  }

  // Load memory stats
  async function loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getMemoryStats' });
      
      if (response && !response.error) {
        // System memory stats
        if (response.totalMemory && response.currentAvailableMemory) {
          const totalGB = (response.totalMemory / (1024 * 1024 * 1024)).toFixed(1);
          const usedBytes = response.totalMemory - response.currentAvailableMemory;
          const usedGB = (usedBytes / (1024 * 1024 * 1024)).toFixed(1);
          const usedPercent = parseFloat(response.memoryUsagePercent) || 0;
          
          // Update text
          document.getElementById('totalMemory').textContent = totalGB + ' GB';
          document.getElementById('usedMemory').textContent = usedGB + ' GB';
          document.getElementById('memoryPercent').textContent = usedPercent.toFixed(1) + '%';
          
          // Update progress bar width
          const memoryBar = document.getElementById('memoryBar');
          memoryBar.style.width = usedPercent + '%';
          
          // Color code both percentage and progress bar
          const percentElement = document.getElementById('memoryPercent');
          percentElement.classList.remove('memory-good', 'memory-warning', 'memory-caution', 'memory-critical');
          memoryBar.classList.remove('memory-good', 'memory-warning', 'memory-caution', 'memory-critical');
          
          let colorClass = 'memory-good';
          if (usedPercent >= 90) {
            colorClass = 'memory-critical';
          } else if (usedPercent >= 80) {
            colorClass = 'memory-caution';
          } else if (usedPercent >= 75) {
            colorClass = 'memory-warning';
          }
          
          percentElement.classList.add(colorClass);
          memoryBar.classList.add(colorClass);
        }

        // Suspended tabs count
        document.getElementById('suspendedCount').textContent = response.currentSuspendedTabs || 0;
      } else {
        // Show error if response indicates an error
        console.error('Error loading stats:', response?.error || 'No response from background script');
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Show user-friendly message
      if (error.message && error.message.includes('Receiving end does not exist')) {
        console.log('Background script not ready. Retrying...');
        // Retry after a short delay
        setTimeout(loadStats, 500);
      }
    }
  }

  // Start live updates every 2 seconds
  let statsInterval;
  function startLiveUpdates() {
    // Clear any existing interval
    if (statsInterval) {
      clearInterval(statsInterval);
    }
    
    // Update stats every 2 seconds
    statsInterval = setInterval(loadStats, 2000);
  }

  // Stop live updates when popup closes
  window.addEventListener('unload', () => {
    if (statsInterval) {
      clearInterval(statsInterval);
    }
  });

  // Load whitelist
  async function loadWhitelist() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getWhitelist' });
      
      if (response) {
        whitelist = response;
        renderWhitelist();
        updateWhitelistButton();
      }
    } catch (error) {
      console.error('Error loading whitelist:', error);
    }
  }

  // Render whitelist
  function renderWhitelist() {
    const whitelistList = document.getElementById('whitelistList');
    whitelistList.innerHTML = '';

    if (whitelist.length === 0) {
      whitelistList.innerHTML = '<p class="help-text">No whitelisted domains</p>';
      return;
    }

    whitelist.sort().forEach(domain => {
      const item = document.createElement('div');
      item.className = 'whitelist-item';
      
      const domainSpan = document.createElement('span');
      domainSpan.className = 'whitelist-domain';
      domainSpan.textContent = domain;
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove from whitelist';
      removeBtn.onclick = () => removeFromWhitelist(domain);
      
      item.appendChild(domainSpan);
      item.appendChild(removeBtn);
      whitelistList.appendChild(item);
    });
  }

  // Load settings
  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get(['suspensionTimer', 'customRules']);
      
      if (result.suspensionTimer) {
        // Convert milliseconds to minutes for display
        const minutes = Math.round(result.suspensionTimer / 60000);
        document.getElementById('suspensionTime').value = minutes;
      } else {
        document.getElementById('suspensionTime').value = 5; // Default 5 minutes
      }

      // Load custom rules
      if (result.customRules) {
        customRules = result.customRules;
        renderRules();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Update whitelist button based on current tab
  function updateWhitelistButton() {
    if (!currentTab || !currentTab.url) return;

    try {
      const url = new URL(currentTab.url);
      const hostname = url.hostname;
      const isWhitelisted = whitelist.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );

      const btn = document.getElementById('whitelistBtn');
      const icon = document.getElementById('whitelistIcon');
      const text = document.getElementById('whitelistText');

      if (isWhitelisted) {
        icon.textContent = '✓';
        text.textContent = 'Whitelisted';
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-secondary');
      } else {
        icon.textContent = '➕';
        text.textContent = 'Add to Whitelist';
        btn.classList.add('btn-secondary');
        btn.classList.remove('btn-primary');
      }
    } catch (error) {
      // Invalid URL
    }
  }

  // Add current tab to whitelist
  async function addToWhitelist() {
    if (!currentTab || !currentTab.url) return;

    try {
      const url = new URL(currentTab.url);
      const hostname = url.hostname;

      const response = await chrome.runtime.sendMessage({
        action: 'addToWhitelist',
        domain: hostname
      });

      if (response.success) {
        await loadWhitelist();
        showNotification('Added to whitelist');
      }
    } catch (error) {
      console.error('Error adding to whitelist:', error);
      showNotification('Error adding to whitelist', 'error');
    }
  }

  // Remove current tab from whitelist
  async function removeFromWhitelist(domain) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'removeFromWhitelist',
        domain: domain
      });

      if (response.success) {
        await loadWhitelist();
        showNotification('Removed from whitelist');
      }
    } catch (error) {
      console.error('Error removing from whitelist:', error);
      showNotification('Error removing from whitelist', 'error');
    }
  }

  // Render custom rules
  function renderRules() {
    const rulesList = document.getElementById('rulesList');
    rulesList.innerHTML = '';

    if (customRules.length === 0) {
      rulesList.innerHTML = '<p class="help-text">No custom rules yet</p>';
      return;
    }

    customRules.forEach((rule, index) => {
      const item = document.createElement('div');
      item.className = 'rule-item';
      
      const info = document.createElement('div');
      info.className = 'rule-info';
      
      const domain = document.createElement('span');
      domain.className = 'rule-domain';
      domain.textContent = rule.domain;
      
      const time = document.createElement('span');
      time.className = 'rule-time';
      time.textContent = `Suspend after ${rule.minutes} minute${rule.minutes !== 1 ? 's' : ''}`;
      
      info.appendChild(domain);
      info.appendChild(time);
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove rule';
      removeBtn.onclick = () => removeRule(index);
      
      item.appendChild(info);
      item.appendChild(removeBtn);
      rulesList.appendChild(item);
    });
  }

  // Add custom rule
  async function addRule() {
    const domainInput = document.getElementById('ruleDomain');
    const minutesInput = document.getElementById('ruleMinutes');
    
    let domain = domainInput.value.trim();
    let minutes = validateMinutes(parseInt(minutesInput.value));

    if (!domain) {
      showNotification('Please enter a domain', 'error');
      return;
    }

    // Extract domain from URL if needed
    try {
      if (domain.includes('/') || domain.includes(':')) {
        const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
        domain = url.hostname;
      }
    } catch (error) {
      // If parsing fails, use as-is
    }

    // Check if rule already exists
    const existingIndex = customRules.findIndex(r => r.domain === domain);
    if (existingIndex >= 0) {
      customRules[existingIndex].minutes = minutes;
    } else {
      customRules.push({ domain, minutes });
    }

    // Save rules
    await chrome.storage.local.set({ customRules });
    
    // Clear inputs
    domainInput.value = '';
    minutesInput.value = '';
    
    renderRules();
    showNotification('Rule added');
  }

  // Remove custom rule
  async function removeRule(index) {
    customRules.splice(index, 1);
    await chrome.storage.local.set({ customRules });
    renderRules();
    showNotification('Rule removed');
  }

  // Validate minutes input
  function validateMinutes(value) {
    const MAX_MINUTES = 6000; // 100 hours
    const MIN_MINUTES = 1;
    const DEFAULT_MINUTES = 5;

    // Check if it's a valid number
    if (isNaN(value) || value === null || value === undefined) {
      return DEFAULT_MINUTES;
    }

    // Round if it's a float
    const rounded = Math.round(value);

    // Clamp to valid range
    if (rounded < MIN_MINUTES) {
      return MIN_MINUTES;
    }
    if (rounded > MAX_MINUTES) {
      return MAX_MINUTES;
    }

    return rounded;
  }

  // Handle suspension timer input with validation
  function handleTimerInput() {
    const input = document.getElementById('suspensionTime');
    const warningDiv = document.getElementById('timerWarning');
    const MAX_MINUTES = 6000;
    
    let value = parseFloat(input.value);
    let warning = '';

    // Check for invalid input
    if (isNaN(value) || value === null || value === undefined || input.value.trim() === '') {
      value = 5;
      input.value = 5;
      warning = 'Invalid input. Using default value of 5 minutes.';
    } else {
      // Check if it's a float
      if (value !== Math.floor(value)) {
        value = Math.round(value);
        input.value = value;
        warning = 'Only integers allowed. Rounded to ' + value + ' minutes.';
      }

      // Check max value
      if (value > MAX_MINUTES) {
        value = MAX_MINUTES;
        input.value = MAX_MINUTES;
        warning = '100 hours (6000 minutes) is the maximum allowable value.';
      }

      // Check min value
      if (value < 1) {
        value = 1;
        input.value = 1;
        warning = 'Minimum value is 1 minute.';
      }
    }

    // Show/hide warning
    if (warning) {
      warningDiv.textContent = warning;
      warningDiv.style.display = 'block';
      setTimeout(() => {
        warningDiv.style.display = 'none';
      }, 5000);
    } else {
      warningDiv.style.display = 'none';
    }

    return value;
  }

  // Toggle rules visibility
  function toggleRules() {
    rulesVisible = !rulesVisible;
    const section = document.getElementById('rulesSection');
    const btn = document.getElementById('toggleRules');

    if (rulesVisible) {
      section.style.display = 'block';
      btn.textContent = 'Hide';
    } else {
      section.style.display = 'none';
      btn.textContent = 'Show';
    }
  }

  // Toggle whitelist visibility
  function toggleWhitelist() {
    whitelistVisible = !whitelistVisible;
    const section = document.getElementById('whitelistSection');
    const btn = document.getElementById('toggleWhitelist');

    if (whitelistVisible) {
      section.style.display = 'block';
      btn.textContent = 'Hide';
    } else {
      section.style.display = 'none';
      btn.textContent = 'Show';
    }
  }

  // Update settings
  async function updateSettings() {
    try {
      const minutes = handleTimerInput();
      const suspensionTimer = minutes * 60 * 1000; // Convert to milliseconds
      
      await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { suspensionTimer }
      });

      showNotification('Settings saved');
    } catch (error) {
      console.error('Error updating settings:', error);
      showNotification('Error saving settings', 'error');
    }
  }

  // Show notification
  function showNotification(message, type = 'success') {
    // Simple notification (could be enhanced with a toast system)
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  // Setup event listeners
  function setupEventListeners() {
    // Whitelist button
    document.getElementById('whitelistBtn').addEventListener('click', async () => {
      if (!currentTab || !currentTab.url) return;

      try {
        const url = new URL(currentTab.url);
        const hostname = url.hostname;
        const isWhitelisted = whitelist.some(domain => 
          hostname === domain || hostname.endsWith('.' + domain)
        );

        if (isWhitelisted) {
          await removeFromWhitelist(hostname);
        } else {
          await addToWhitelist();
        }
      } catch (error) {
        console.error('Error toggling whitelist:', error);
      }
    });

    // Toggle whitelist section
    document.getElementById('toggleWhitelist').addEventListener('click', toggleWhitelist);

    // Toggle rules section
    document.getElementById('toggleRules').addEventListener('click', toggleRules);

    // Add rule button
    document.getElementById('addRuleBtn').addEventListener('click', addRule);

    // Settings change - use blur and change events for validation
    const timerInput = document.getElementById('suspensionTime');
    timerInput.addEventListener('blur', updateSettings);
    timerInput.addEventListener('change', updateSettings);
    
    // Allow Enter key to save
    timerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        updateSettings();
      }
    });

    // Coffee button
    document.getElementById('coffeeBtn').addEventListener('click', () => {
      chrome.tabs.create({ 
        url: 'https://buymeacoffee.com/NoahCollin?via=tab-suspender-extension' 
      });
    });

    // Help link
    document.getElementById('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/NoahCollin/tab-suspender' });
    });

    // Settings link
    document.getElementById('settingsLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'chrome://extensions/?id=' + chrome.runtime.id });
    });
  }

  // Initialize on load
  document.addEventListener('DOMContentLoaded', init);
})();
