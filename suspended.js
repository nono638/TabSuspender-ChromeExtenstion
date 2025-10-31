// Suspended page script
(function() {
  'use strict';

  // Parse URL parameters
  const params = new URLSearchParams(window.location.search);
  const originalUrl = params.get('url');
  const originalTitle = params.get('title');
  const faviconUrl = params.get('favicon');

  // Update page content
  if (originalTitle) {
    document.getElementById('title').textContent = originalTitle;
    document.title = `💤 ${originalTitle}`;
  }

  if (originalUrl) {
    document.getElementById('url').textContent = originalUrl;
  }

  if (faviconUrl && faviconUrl !== 'undefined' && faviconUrl !== 'null') {
    const favicon = document.getElementById('favicon');
    const placeholder = document.getElementById('favicon-placeholder');
    
    favicon.src = faviconUrl;
    favicon.style.display = 'block';
    placeholder.style.display = 'none';
    
    // Handle favicon load error
    favicon.onerror = function() {
      favicon.style.display = 'none';
      placeholder.style.display = 'flex';
    };
  }

  // Restore tab function
  function restoreTab() {
    if (originalUrl) {
      chrome.runtime.sendMessage({
        action: 'restoreTab',
        url: originalUrl
      }).catch(error => {
        console.error('Error restoring tab:', error);
        // Fallback: directly navigate
        window.location.href = originalUrl;
      });
    }
  }

  // Button click handler
  document.getElementById('restoreBtn').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    restoreTab();
  });

  // Whitelist button handler
  document.getElementById('whitelistBtn').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (originalUrl) {
      try {
        // Extract root domain from URL
        const url = new URL(originalUrl);
        const domain = url.hostname;
        
        // Disable button to prevent double-clicks
        const btn = document.getElementById('whitelistBtn');
        btn.disabled = true;
        btn.style.opacity = '0.6';
        
        // Add to whitelist
        chrome.runtime.sendMessage({
          action: 'addToWhitelist',
          domain: domain
        }).then(() => {
          // Show status message
          const statusMsg = document.getElementById('statusMessage');
          statusMsg.textContent = domain + ' added to whitelist, restoring tab...';
          statusMsg.style.display = 'block';
          
          // Wait 1 second, then restore tab
          setTimeout(() => {
            restoreTab();
          }, 1000);
        }).catch(error => {
          console.error('Error adding to whitelist:', error);
          // Still restore even if whitelist fails
          setTimeout(() => {
            restoreTab();
          }, 1000);
        });
      } catch (error) {
        console.error('Error parsing URL:', error);
      }
    }
  });

  // Restore on any click (making the whole page clickable)
  document.addEventListener('click', function(e) {
    // Only restore if not clicking the buttons
    const restoreBtn = document.getElementById('restoreBtn');
    const whitelistBtn = document.getElementById('whitelistBtn');
    
    if (e.target.id !== 'restoreBtn' && !restoreBtn.contains(e.target) &&
        e.target.id !== 'whitelistBtn' && !whitelistBtn.contains(e.target)) {
      restoreTab();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    // Enter or Space to restore
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      restoreTab();
    }
    
    // R key to restore
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      restoreTab();
    }
  });

  // Set focus to button for keyboard accessibility
  window.addEventListener('load', function() {
    document.getElementById('restoreBtn').focus();
  });
})();
