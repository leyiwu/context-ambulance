# Quick Start: Install the Extension

## Step 1: Create Icon Files

The extension needs icon files. Create simple placeholders:

### Option A: Use Emoji (Quick)

Create these HTML files and take screenshots:

**icon16.html:**
```html
<!DOCTYPE html>
<html><body style="margin:0;width:16px;height:16px;display:flex;align-items:center;justify-content:center;background:#667eea;font-size:10px;">🚑</body></html>
```

**icon48.html:**
```html
<!DOCTYPE html>
<html><body style="margin:0;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:#667eea;font-size:32px;">🚑</body></html>
```

**icon128.html:**
```html
<!DOCTYPE html>
<html><body style="margin:0;width:128px;height:128px;display:flex;align-items:center;justify-content:center;background:#667eea;font-size:96px;">🚑</body></html>
```

Then:
1. Open each in browser
2. Take screenshot (Win + Shift + S)
3. Crop to exact size
4. Save as PNG in `extension/icons/`

### Option B: Download Ready Icons

I'll create a PowerShell script to generate simple colored squares:

## Step 2: Load Extension

```powershell
# From project root
cd extension

# Open Chrome
start chrome chrome://extensions/
```

Then in Chrome:
1. Enable "Developer mode" (top right toggle)
2. Click "Load unpacked"
3. Select the `extension` folder
4. Extension icon (🚑) should appear in toolbar

## Step 3: Test It

1. Open https://chat.openai.com
2. Start a conversation (or use existing one)
3. Click the 🚑 extension icon
4. Should see: "ChatGPT detected, X messages found"
5. Click "Rescue This Conversation"
6. Copy or download the result

## Troubleshooting

### "Failed to scrape"
- Refresh the ChatGPT page
- Make sure there are actual messages in the conversation
- Check console for errors (F12 → Console tab)

### Extension not loading
- Make sure you selected the `extension` folder, not `extension/manifest.json`
- Check that all files are present
- Look for errors in `chrome://extensions/`

### No messages detected
- ChatGPT may have changed their DOM structure
- Open DevTools (F12) on ChatGPT page
- Check console for scraper errors
- You may need to update the selectors in `content/chatgpt-scraper.js`

## Next Steps

Once working:
- Try on Claude.ai
- Try on Gemini (gemini.google.com)
- Test with a real looping conversation
- Compare rescue package quality
