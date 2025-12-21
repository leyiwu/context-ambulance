# Context Ambulance 🚑

**The Eject Button for ChatGPT Doom Loops**

Rescue poisoned LLM conversations by sanitizing chat histories and generating clean context packages that work with ANY LLM.

## The Problem: Context Poisoning

You're 50 messages deep with ChatGPT. The model gets stuck in a loop—repeating the same broken code, hallucinating, apologizing without progress. Moving to a new model gives you two bad options:

1. **Paste the whole history:** The new model reads 20 failed attempts and repeats the same mistakes
2. **Start over:** You lose all context of what you're trying to build

## The Solution

Context Ambulance acts as a paramedic:

1. **Scrape** your poisoned chat session
2. **Analyze** with a fast LLM to identify loops, extract goals, find blockers
3. **Sanitize** by aggressively removing noise, failed attempts, apologies
4. **Generate** a clean `Context_Rescue_Package.md`
5. **Handoff** to ANY fresh LLM (Gemini, Claude, GPT-4, etc.)

## Installation

```bash
# Clone repository
git clone https://github.com/yourusername/context-ambulance.git
cd context-ambulance

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install
pip install -e .

# Optional: Install with all features
pip install -e ".[all]"
```

## Quick Start

```bash
# Configure (optional - works without API keys using rule-based analysis)
cp .env.example .env
# Edit .env and add your API keys

# Rescue a conversation (from manual input)
context-ambulance rescue --input my_chat.txt

# Or scrape from browser (requires selenium)
pip install -e ".[scraping]"
context-ambulance rescue --browser chrome
```

## Usage

### Basic Rescue
```bash
context-ambulance rescue --input chat.txt --output rescue.md
```

### With Different Analyzers
```bash
# Use Gemini Flash (default - fast and cheap)
context-ambulance rescue --analyzer gemini --input chat.txt

# Use Claude Haiku
context-ambulance rescue --analyzer claude --input chat.txt

# No API - rule-based only (free, private)
context-ambulance rescue --analyzer none --input chat.txt
```

### Sanitization Levels
```bash
# Keep more context
context-ambulance rescue --sanitization minimal --input chat.txt

# Aggressive cleaning (default)
context-ambulance rescue --sanitization aggressive --input chat.txt
```

## Output Format

The generated rescue package is a structured markdown file that works with any LLM:

```markdown
# Context Rescue Package

## 🎯 ORIGINAL GOAL
[Extracted goal]

## 📍 CURRENT STATE
[Last known good code]

## 🚨 THE BLOCKER
[Specific error causing the loop]

## 💡 KEY INSIGHTS PRESERVED
[Important decisions and constraints]

## 🧹 WHAT WAS REMOVED
- X repetitive errors
- Y failed attempts

## 📋 RECOMMENDED NEXT STEPS
[Fresh approaches to try]

## 🔄 INSTRUCTION FOR NEXT LLM
You are a senior engineer taking over a stalled project...

## 📎 CLEANED CONVERSATION
[Essential exchanges only]
```

## Development

```bash
# Install with dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black src/ tests/

# Lint
ruff src/ tests/
```

## Architecture

```
src/context_ambulance/
├── analyzers/        # LLM-based analysis (swappable providers)
├── sanitizers/       # Conversation cleaning logic
├── generators/       # Rescue package generation
├── scrapers/         # Browser automation (optional)
├── cli.py           # Command-line interface
└── config.py        # Configuration management
```

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
