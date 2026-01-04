# Context Ambulance 🚑

**The Eject Button for LLM Doom Loops**

A browser extension that rescues poisoned LLM conversations by sanitizing chat histories and generating clean context packages.

> **NEW:** Browser extension in active development! One-click rescue directly from ChatGPT, Claude, or Gemini.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Local%20Dev-blue?logo=google-chrome)](https://github.com/leyiwu/ContextAmbulance)
[![Python CLI](https://img.shields.io/badge/Python-CLI%20Available-green?logo=python)](https://github.com/leyiwu/ContextAmbulance)
[![Chrome Web Store](https://img.shields.io/badge/Web%20Store-Coming%20Soon-lightgrey)](https://github.com/leyiwu/ContextAmbulance)

## The Problem: Context Poisoning

You're 50 messages deep with ChatGPT. The model gets stuck in a loop—repeating the same broken code, hallucinating, apologizing without progress. Moving to a new model gives you two bad options:

1. **Paste the whole history:** The new model reads 20 failed attempts and repeats the same mistakes
2. **Start over:** You lose all context of what you're trying to build

## The Solution

Context Ambulance acts as a paramedic with **two ways to save your conversation**:

### 🚑 **Rescue Mode** - Full Context Reset
**When:** Deep in a doom loop (20+ messages), need to switch LLMs

**How it works:**
1. One-click scrape from ChatGPT/Claude/Gemini
2. Review messages with smart checkboxes
3. Download clean `rescue_package.md`
4. Paste into ANY fresh LLM

**Output:** Structured markdown file optimized for handoff

---

### 🔄 **Revival Mode** - Quick In-Place Fix
**When:** Just started looping (5-15 messages), session is salvageable

**How it works:**
1. Select messages to keep
2. Generate context reset prompt
3. Copy & paste into **same chat** to reset the AI

**Output:** Short prompt that resets the conversation

---

### Use Case Comparison

| Situation | Revival 🔄 | Rescue 🚑 |
|-----------|------------|-----------|
| Model apologized 3 times | ✅ Quick fix | ❌ Overkill |
| 30+ messages of loops | ❌ Too damaged | ✅ Start fresh |
| Want to try Claude instead | ❌ Wrong tool | ✅ Perfect |
| Need to clarify context | ✅ Fastest | ❌ Unnecessary |

---

## Browser Extension

> **Status:** Local development only. Chrome Web Store publication coming soon!

### Installation (Load Unpacked)

1. **Download:** Clone this repo or download ZIP
   ```bash
   git clone https://github.com/leyiwu/ContextAmbulance.git
   cd ContextAmbulance
   ```

2. **Load Extension:**
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select `extension/` folder from this repo

3. **Use:** Navigate to ChatGPT/Claude/Gemini and click the 🚑 icon

### Supported Platforms
- ✅ ChatGPT (chatgpt.com)
- ✅ Gemini (gemini.google.com)
- ✅ Claude (claude.ai)

### Features
- **Instant scraping** - No manual copy/paste
- **Interactive preview** - Checkbox selection for each message
- **Smart suggestions** - AI-powered loop detection (optional)
- **Dual modes** - Rescue or Revival in one click
- **Works offline** - Rule-based analyzer requires no API keys

### Extension Quick Start

1. Open ChatGPT with a stuck conversation
2. Click Context Ambulance 🚑 extension icon
3. Wait for messages to load (shows count)
4. Review checkbox preview:
   - Red border = AI suggests removing
   - Green border = Recommended to keep
   - Uncheck messages you want to remove
5. Choose action:
   - 🚑 **Generate Rescue Package** → Download .md file
   - 🔄 **Generate Revival Prompt** → Copy to clipboard
6. Use output in your LLM!

---

## Python CLI (For Power Users)

> **Status:** Fully functional. For batch processing and automation.

### Installation

```bash
# Clone repository
git clone https://github.com/leyiwu/ContextAmbulance.git
cd ContextAmbulance

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Linux/Mac)
source venv/bin/activate

# Install CLI
pip install -e .
```

### Usage

```bash
# View help
context-ambulance --help

# Rescue a conversation (text file)
context-ambulance rescue --input conversation.txt

# Use specific analyzer
context-ambulance rescue --input chat.txt --analyzer gemini
context-ambulance rescue --input chat.txt --analyzer none

# Adjust sanitization level
context-ambulance rescue --input chat.txt --sanitization aggressive

# Analyze only (no package generation)
context-ambulance analyze --input chat.txt
```

### Input File Format

Plain text file with conversation:
```
User: How do I implement async in Python?
AI: Here's an approach... [code]
User: That didn't work
AI: I apologize, let me try again...
```

### Configuration

Optional `.env` file for API keys:
```bash
ANALYZER_PROVIDER=gemini  # or claude, none
GOOGLE_API_KEY=your_key_here
CLAUDE_API_KEY=your_key_here
SANITIZATION_LEVEL=balanced  # minimal, balanced, aggressive
```

---

## How It Works: Interactive Preview

Context Ambulance uses a **checkbox-based preview** to give you full control:

### 1. Scrape & Analyze
- Extension detects platform (ChatGPT/Claude/Gemini)
- Scrapes all messages with proper role detection (User/AI)
- Runs analyzer (Gemini/Claude API or rule-based)

### 2. Interactive Selection
- **Green User messages** (from you)
- **Blue AI messages** (from assistant)
- **Red border** = AI suggests removing (loops, errors, apologies)
- **Green border** = Recommended to keep

### 3. Control Buttons
- **Select All:** Check all messages for removal
- **Deselect All:** Clear all selections
- **AI Suggestions:** Auto-check red-flagged messages

### 4. Live Stats Counter
See real-time: "**15 messages to remove • 45% reduction**"

### 5. Choose Action
- **🚑 Generate Rescue Package** → Download `.md` for new LLM
- **🔄 Generate Revival Prompt** → Copy for pasting in same chat

---

## Screenshots

> **Note:** Screenshot assets coming soon. Extension is functional - visuals being prepared for documentation.

### Main View
Extension popup detecting conversation platform and message count.

### Interactive Checkbox Preview
Checkbox selection interface with:
- User messages (green labels)
- AI messages (blue labels)  
- Red borders for suggested removals
- Green borders for recommended keeps
- Live counter: "15 messages to remove • 45% reduction"

### Rescue Results
Rescue package generated with download button and next steps.

### Revival Results
Revival prompt ready to copy, with option to download as .md file.

---

## Architecture

```
Context_Ambulance/
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── manifest.json          # Permissions for chatgpt.com, claude.ai, gemini.google.com
│   ├── popup/                 # Extension UI
│   │   ├── popup.html         # Three views: main → preview → results
│   │   ├── popup.js           # PopupController: scraping, preview, dual-action buttons
│   │   └── popup.css          # Checkbox cards, User/AI badges, live counter
│   ├── content/               # Platform-specific scrapers
│   │   ├── chatgpt-scraper.js # Uses data-message-author-role
│   │   ├── claude-scraper.js  # DOM selector-based
│   │   └── gemini-scraper.js  # Alternating USER/AI pattern
│   └── background/            # Service Worker
│       └── background.js      # GeminiAnalyzer, ClaudeAnalyzer, SimpleAnalyzer
│
├── src/context_ambulance/     # Python CLI (Optional)
│   ├── analyzers/             # LLM-based & rule-based analysis
│   │   ├── gemini.py          # Gemini Flash API
│   │   ├── rules.py           # Heuristic patterns (no API)
│   │   └── __init__.py        # BaseAnalyzer, Message, Analysis models
│   ├── sanitizers/            # Conversation cleaning
│   │   └── __init__.py        # 3-level sanitization (minimal/balanced/aggressive)
│   ├── generators/            # Output generation
│   │   └── __init__.py        # RescuePackageGenerator
│   ├── templates/             # Jinja2 templates
│   │   └── rescue_package.md  # Structured markdown output
│   └── cli.py                 # Click CLI (rescue, analyze commands)
│
└── tests/                     # Pytest suite
    ├── fixtures/              # Sample conversations
    └── test_*.py              # Unit tests (9/11 passing)
```

---

## Configuration

### Extension Settings (Optional)

Click "⚙️ Analyzer Settings" in popup:

1. **Analyzer:** None (rules), Gemini API, or Claude API
2. **Gemini API Key:** Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. **Claude API Key:** Get from [Anthropic Console](https://console.anthropic.com/)
4. **Sanitization Level:** Minimal, Balanced, or Aggressive

**Default:** Rule-based analyzer (no API key needed)

---

## Output Formats

### Rescue Package (.md file)
Structured markdown optimized for handoff to fresh LLM:

```markdown
# Context Rescue Package

## 🎯 ORIGINAL GOAL
[Extracted goal from early messages]

## 📍 CURRENT STATE
[Last known good code/progress]

## 🚨 THE BLOCKER
[Specific error or loop causing the problem]

## 💡 KEY INSIGHTS PRESERVED
[Important decisions, constraints, tried approaches]

## 🧹 WHAT WAS REMOVED
- 15 repetitive errors
- 8 apology cascades
- 12 failed code attempts
- Total reduction: 45% of conversation

## 📋 RECOMMENDED NEXT STEPS
[Fresh approaches based on analysis]

## 🔄 INSTRUCTION FOR NEXT LLM
You are taking over a stalled project. The previous assistant got stuck in a loop.
Review the cleaned history below and proceed with fresh perspective...

## 📎 CLEANED CONVERSATION
User: [Message 1]
AI: [Response 1]
...
```

### Revival Prompt (clipboard text)
Short context reset for same chat:

```
I removed 15 messages where we got stuck in loops.

Let's reset: [brief summary of where we were]

Here's the conversation with the noise removed:
[selected messages]

Please continue from here with a fresh approach.
```

---

## Development

### Python CLI Development
```bash
# Install with dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run specific test
pytest tests/test_analyzers.py -v

# Format code
black src/ tests/

# Lint
ruff src/ tests/
```

### Browser Extension Development
```bash
# Load extension in Chrome
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select extension/ folder

# Test changes
1. Make code edits
2. Click "Reload" in chrome://extensions/
3. Open ChatGPT and test

# Add new scraper
1. Create extension/content/yourplatform-scraper.js
2. Add host_permissions to manifest.json
3. Implement scrapeMessages() function
4. Test on live site
```

### Testing Workflow
```bash
# Python unit tests
pytest tests/test_analyzers.py -v
pytest tests/test_sanitizers.py -v

# Extension manual testing
1. Load sample conversation in ChatGPT
2. Click extension icon
3. Verify checkboxes render correctly
4. Test Rescue mode: download file, check content
5. Test Revival mode: copy prompt, paste in chat
```

---

## Architecture

### Overall Structure
```
Context_Ambulance/
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── manifest.json          # Permissions, content scripts
│   ├── popup/                 # Extension UI (HTML/CSS/JS)
│   ├── content/               # Platform scrapers
│   └── background/            # Service worker with analyzers
│
└── .github/                   # Project documentation
    └── copilot-instructions.md
```

### Data Flow

```
1. User clicks extension → popup.js
2. Detect platform → content script (chatgpt-scraper.js)
3. Scrape messages → background.js (analyzer)
4. Return analysis → popup.js (render preview)
5. User selects messages → generate output
6. Download/copy → user uses in LLM
```

---

## Roadmap

### v1.0 (Current)
- ✅ Chrome extension with ChatGPT/Claude/Gemini support
- ✅ Interactive checkbox preview
- ✅ Dual modes (Rescue + Revival)
- ✅ Gemini/Claude API integration
- ✅ Rule-based fallback analyzer
- ✅ Python CLI for batch processing

### v1.1 (Next - Ready for Release)
- 🔜 Chrome Web Store publication
- 🔜 Screenshots and demo video
- 🔜 Analysis summary box in preview
- 🔜 Keyboard shortcuts (Ctrl+Shift+R)

### v2.0 (Future)
- Batch rescue multiple conversations
- Conversation diff viewer (before/after)
- Local LLM support (Ollama)
- VS Code extension
- Firefox support
- PyPI package publication

---

## FAQ

### Do I need API keys?
No! The extension works out-of-the-box with rule-based analysis. Gemini/Claude APIs are optional for better loop detection.

### Is my data private?
Yes. When using rule-based analysis (default), everything runs locally in your browser. API analyzers only send conversation text to the respective APIs (Gemini or Claude) if you opt in.

### Which platforms are supported?
Currently: ChatGPT (chatgpt.com), Claude (claude.ai), Gemini (gemini.google.com). Firefox support planned for v2.0.

### Can I use this with local LLMs (Ollama)?
Not yet, but it's on the roadmap for v2.0. You can use the rescue package output with any LLM that accepts text input.

### What's the difference between Rescue and Revival?
- **Rescue:** Download .md file for a brand new LLM session (bigger loops, switching models)
- **Revival:** Copy prompt to paste in current chat (quick fix, same session)

### Does this work with custom ChatGPT models?
Yes! As long as it's hosted on chatgpt.com, the scraper will work.

### Can I edit the removal suggestions?
Yes! The checkbox preview lets you manually check/uncheck any message. AI suggestions are just recommendations.

---

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Acknowledgments

Built with:
- Chrome Extension Manifest V3
- Google Gemini API
- Anthropic Claude API
- Python Click, Rich, Jinja2

Special thanks to the community for testing and feedback!

---

**Made with 🚑 for anyone stuck in an LLM doom loop**
