# 🌙 Intelligent Tab Suspender

Automatically suspend idle tabs to reduce memory usage and speed up Chrome. Perfect for power users with dozens of tabs open!

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/YOUR_EXTENSION_ID?label=Chrome%20Web%20Store)](https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **Automatic Tab Suspension** - Tabs automatically suspend after your chosen idle time (default 5 minutes)
- **Smart Detection** - Won't suspend tabs with unsaved forms, playing media, or active content
- **One-Click Whitelist** - Easily whitelist sites you want to keep active
- **Custom Rules** - Set different suspension times for different domains
- **Memory Monitoring** - Real-time memory usage display with color-coded indicators
- **Fast Recovery** - Suspended tabs restore instantly with one click
- **No Data Loss** - Saves scroll position, form data, and tab state

## 🚀 Installation

### From Chrome Web Store (Recommended)
[Install from Chrome Web Store](https://chrome.google.com/webstore/detail/YOUR_EXTENSION_ID)

### From Source
1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/intelligent-tab-suspender.git
   ```
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the cloned folder

## 📖 How It Works

1. Set your preferred idle time (1-6000 minutes)
2. Browse normally - the extension tracks tab activity
3. Idle tabs automatically suspend to free memory
4. Click suspended tabs to instantly restore them
5. Add frequently-used sites to whitelist

## 💡 Smart Features

The extension checks every 30 seconds and never suspends tabs with:
- Unsaved form data
- Playing audio/video
- Active downloads
- Loading content
- Pinned tabs

## 🔒 Privacy

- **No data collection** - Zero tracking or analytics
- **No external servers** - All processing happens locally
- **No network requests** - Completely offline
- **Open source** - You can see exactly what it does

## 🛠️ Development

### Prerequisites
- Chrome/Chromium browser
- Basic understanding of Chrome Extensions

### Project Structure
```
intelligent-tab-suspender/
├── manifest.json           # Extension configuration
├── background.js          # Background service worker
├── content.js             # Content script for page monitoring
├── popup.html/js/css      # Extension popup interface
├── suspended.html/js      # Suspended tab page
├── modules/               # Core functionality modules
│   ├── memory-tracker.js
│   ├── suspension-engine.js
│   ├── tab-state-manager.js
│   └── whitelist-manager.js
└── icons/                 # Extension icons
```

### Building from Source
No build process required! The extension runs directly from the source files.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ☕ Support

If you find this extension helpful, consider buying me a coffee!

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/YOUR_USERNAME)

## 📊 Permissions Explained

The extension requires these permissions:
- **tabs** - To detect, suspend, and restore tabs
- **storage** - To save your settings locally
- **alarms** - To check tabs every 30 seconds
- **system.memory** - To display memory usage statistics
- **scripting** - To detect form data and media on pages
- **idle** - To track system idle state
- **host permissions** - To run content scripts for safety checks

## 🐛 Known Issues

None currently! Please report any issues on the [Issues page](https://github.com/YOUR_USERNAME/intelligent-tab-suspender/issues).

## 📞 Contact

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/intelligent-tab-suspender/issues)
- **Email**: your.email@example.com

---

Made with ❤️ for tab hoarders everywhere!
