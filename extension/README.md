# Context Ambulance Browser Extension

## Installation

### Load Unpacked Extension (Development)

1. Open Chrome/Edge/Brave
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `extension/` folder from this project

### Usage

1. Open ChatGPT, Claude, or Gemini in your browser
2. Start or continue a conversation
3. When you notice the conversation getting stuck in loops:
   - Click the Context Ambulance extension icon (🚑)
   - Review the detected messages
   - Click "Rescue This Conversation"
4. Copy or download the generated rescue package
5. Paste it into a fresh LLM session

## Features

- ✅ **One-click scraping** from ChatGPT, Claude, and Gemini
- ✅ **Loop detection** (apology cascades, code churn)
- ✅ **Automatic sanitization** with configurable levels
- ✅ **Beautiful UI** with real-time stats
- ✅ **Export options** (copy to clipboard or download .md)
- ✅ **Works offline** (uses in-browser analyzer)

## Architecture

```
extension/
├── manifest.json          # Extension configuration
├── popup/                 # Extension popup UI
│   ├── popup.html        
│   ├── popup.css
│   └── popup.js          # UI controller
├── content/              # Page scrapers
│   ├── chatgpt-scraper.js
│   ├── claude-scraper.js
│   └── gemini-scraper.js
├── background/           # Service worker
│   └── background.js     # Message processor
└── icons/               # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## How It Works

1. **Content Scripts** inject into ChatGPT/Claude/Gemini pages
2. When user clicks rescue, **Popup** requests scraping
3. **Content Script** extracts messages from DOM
4. **Background Worker** analyzes and sanitizes
5. **Popup** displays results and allows export

## Scraping Strategy

### ChatGPT
- Looks for `[data-message-author-role]` elements
- Preserves code blocks with proper markdown formatting
- Fallback: searches for message group divs

### Claude
- Targets conversation container divs
- Alternates USER/ASSISTANT based on structure
- Filters out UI elements

### Gemini
- Finds `[data-test-id*="message"]` elements
- Uses class patterns for role detection
- Multiple fallback strategies

## Future Enhancements

- [ ] Native messaging to Python CLI for better analysis
- [ ] Gemini API integration (optional, requires key)
- [ ] Conversation history browser
- [ ] Settings page for customization
- [ ] Keyboard shortcuts
- [ ] Auto-detect doom loops in real-time
- [ ] Publish to Chrome Web Store

## Development

### Testing Locally

```powershell
# Make changes to extension files
# Then reload extension in chrome://extensions/

# Test on each platform:
# 1. Open ChatGPT and create a looping conversation
# 2. Click extension icon
# 3. Verify scraping and rescue work correctly
```

### Debugging

- Use Chrome DevTools on the popup (right-click extension icon → Inspect popup)
- View background worker logs in `chrome://extensions/` → Details → Service worker
- Content script logs appear in page console (F12 on ChatGPT page)

## Permissions Explained

- `activeTab`: Read messages from current tab
- `storage`: Save user preferences
- `downloads`: Export rescue packages
- `host_permissions`: Access ChatGPT, Claude, Gemini DOM

## Privacy

- ✅ No data sent to external servers
- ✅ All processing happens locally in browser
- ✅ Optional: Connect to your local Python CLI
- ✅ No tracking or analytics

## License

MIT
