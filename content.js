// Content Script - Runs on all pages to check suspension safety and track activity
(function() {
  'use strict';

  // Check if extension context is valid
  try {
    // Test if we can access chrome.runtime
    if (!chrome.runtime || !chrome.runtime.id) {
      console.log('Extension context invalidated, content script will not run');
      return;
    }
    
    // Check if this is the suspended page
    if (window.location.href.includes(chrome.runtime.getURL('suspended.html'))) {
      return; // Don't run on suspended pages
    }
  } catch (error) {
    // Extension was reloaded/updated, this content script is orphaned
    console.log('Extension context invalidated:', error.message);
    return;
  }

  // Track user activity
  let lastActivity = Date.now();
  const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];

  function notifyActivity() {
    const now = Date.now();
    // Throttle notifications to once per 30 seconds
    if (now - lastActivity > 30000) {
      lastActivity = now;
      
      // Check if extension context is still valid before sending message
      try {
        if (chrome.runtime && chrome.runtime.id) {
          chrome.runtime.sendMessage({ action: 'tabActivity' }).catch(() => {
            // Background script may not be ready or extension was reloaded
          });
        }
      } catch (error) {
        // Extension context invalidated, stop trying to send messages
        console.log('Extension reloaded, stopping activity tracking');
        // Remove event listeners to stop unnecessary attempts
        activityEvents.forEach(event => {
          document.removeEventListener(event, notifyActivity);
        });
      }
    }
  }

  // Listen for user activity
  activityEvents.forEach(event => {
    document.addEventListener(event, notifyActivity, { passive: true });
  });

  // Check if page has form data
  function hasFormData() {
    const forms = document.querySelectorAll('form');
    
    for (const form of forms) {
      const inputs = form.querySelectorAll('input, textarea');
      
      for (const input of inputs) {
        // Skip empty inputs and certain types
        if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') {
          continue;
        }
        
        // Check if input has user-entered data
        if (input.value && input.value.trim().length > 0) {
          // Check if it's not a default value
          if (input.defaultValue !== input.value) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  // Check if page has active media
  function hasActiveMedia() {
    const media = document.querySelectorAll('audio, video');
    
    for (const element of media) {
      if (!element.paused && !element.ended) {
        return true;
      }
    }
    
    return false;
  }

  // WebSocket check removed - too many false positives with analytics/chat widgets
  // Users can whitelist sites if needed

  // Get current scroll position
  function getScrollPosition() {
    return {
      x: window.scrollX || window.pageXOffset,
      y: window.scrollY || window.pageYOffset
    };
  }

  // Restore scroll position
  function restoreScrollPosition(position) {
    if (position && typeof position.x === 'number' && typeof position.y === 'number') {
      window.scrollTo(position.x, position.y);
    }
  }

  // Message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      switch (request.action) {
        case 'checkSuspensionSafety':
          sendResponse({
            hasFormData: hasFormData(),
            hasActiveMedia: hasActiveMedia(),
            isLoading: document.readyState !== 'complete'
          });
          break;
          
        case 'getScrollPosition':
          sendResponse({
            position: getScrollPosition()
          });
          break;
          
        case 'restoreScroll':
          restoreScrollPosition(request.position);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script error:', error);
      sendResponse({ error: error.message });
    }
    
    return true;
  });

  // Notify background that content script is ready
  try {
    if (chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage({ action: 'contentScriptReady' }).catch(() => {
        // Background script may not be ready yet
      });
    }
  } catch (error) {
    // Extension context invalidated
  }
})();
