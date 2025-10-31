// Whitelist Manager - Manages domains that should never be suspended
export class WhitelistManager {
  constructor() {
    this.storageKey = 'whitelist';
    this.defaultWhitelist = [
      'mail.google.com',
      'outlook.live.com',
      'outlook.office.com',
      'calendar.google.com',
      'meet.google.com',
      'zoom.us',
      'teams.microsoft.com',
      'slack.com',
      'discord.com',
      'music.youtube.com',
      'spotify.com',
      'netflix.com',
      'twitch.tv'
    ];
  }

  async getWhitelist() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      return result[this.storageKey] || this.defaultWhitelist;
    } catch (error) {
      console.error('Error getting whitelist:', error);
      return this.defaultWhitelist;
    }
  }

  async addDomain(domain) {
    try {
      const whitelist = await this.getWhitelist();
      
      // Extract domain from URL if full URL provided
      const cleanDomain = this.extractDomain(domain);
      
      if (!whitelist.includes(cleanDomain)) {
        whitelist.push(cleanDomain);
        await chrome.storage.local.set({ [this.storageKey]: whitelist });
        console.log(`Added ${cleanDomain} to whitelist`);
      }
      
      return whitelist;
    } catch (error) {
      console.error('Error adding to whitelist:', error);
      return null;
    }
  }

  async removeDomain(domain) {
    try {
      const whitelist = await this.getWhitelist();
      const cleanDomain = this.extractDomain(domain);
      
      const index = whitelist.indexOf(cleanDomain);
      if (index > -1) {
        whitelist.splice(index, 1);
        await chrome.storage.local.set({ [this.storageKey]: whitelist });
        console.log(`Removed ${cleanDomain} from whitelist`);
      }
      
      return whitelist;
    } catch (error) {
      console.error('Error removing from whitelist:', error);
      return null;
    }
  }

  isWhitelisted(url, whitelist = null) {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      const list = whitelist || this.defaultWhitelist;
      
      // Check exact match
      if (list.includes(hostname)) {
        return true;
      }
      
      // Check if any whitelist domain is a suffix of hostname
      // (e.g., 'google.com' matches 'mail.google.com')
      return list.some(domain => {
        return hostname === domain || hostname.endsWith('.' + domain);
      });
    } catch (error) {
      return false;
    }
  }

  extractDomain(input) {
    try {
      // If it's already a domain, return it
      if (!input.includes('/') && !input.includes(':')) {
        return input.toLowerCase();
      }
      
      // If it's a URL, extract the hostname
      const url = new URL(input.startsWith('http') ? input : `https://${input}`);
      return url.hostname.toLowerCase();
    } catch (error) {
      // If parsing fails, return the input cleaned up
      return input.toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    }
  }

  async resetToDefault() {
    try {
      await chrome.storage.local.set({ [this.storageKey]: this.defaultWhitelist });
      return this.defaultWhitelist;
    } catch (error) {
      console.error('Error resetting whitelist:', error);
      return null;
    }
  }
}
