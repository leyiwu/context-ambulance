# Copilot Instructions for Context_Ambulance

## Project Overview
Context Ambulance is the "Eject Button" for ChatGPT Doom Loops. A Python CLI tool that rescues poisoned LLM conversations by scraping live chat sessions, sanitizing the history, and generating a clean `Context_Rescue_Package.md` that works with ANY LLM (Gemini, Claude, GPT-4, etc.).

**Core Workflow:** Scrape Live Chat → Analyze & Sanitize → Generate Rescue Package → Use with Any LLM

**Tech Stack:** Python 3.10+, Click CLI, Jinja2 templates, LLM APIs (swappable)

## Project Structure
```
src/context_ambulance/
├── analyzers/           # LLM-based & rule-based analysis
│   ├── __init__.py     # BaseAnalyzer, Message, Analysis models
│   ├── gemini.py       # Gemini Flash analyzer (default)
│   └── rules.py        # Rule-based analyzer (no API)
├── sanitizers/         # Conversation cleaning logic
│   └── __init__.py     # ConversationSanitizer
├── generators/         # Rescue package generation
│   └── __init__.py     # RescuePackageGenerator
├── templates/          # Jinja2 templates
│   └── rescue_package.md
├── cli.py              # Click commands (rescue, analyze)
└── config.py           # Config, AnalyzerProvider, SanitizationLevel

tests/
├── fixtures/           # Sample conversations for testing
├── test_analyzers.py
└── test_sanitizers.py
```

## Development Setup

**Initial Setup:**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cp .env.example .env  # Add GOOGLE_API_KEY if using Gemini
```

**Run Tests:**
```powershell
pytest
pytest tests/test_analyzers.py -v
```

**Run CLI (after install):**
```powershell
context-ambulance rescue --input tests/fixtures/sample_conversation.txt --analyzer none
```

## Key Architecture Patterns

### 1. Analyzer Adapter Pattern (Swappable LLMs)
All analyzers inherit from `BaseAnalyzer` abstract class. This allows easy swapping between:
- `GeminiAnalyzer` (default, uses gemini-1.5-flash-8b)
- `RuleBasedAnalyzer` (no API, uses heuristics)
- Future: `ClaudeAnalyzer`, `OpenAIAnalyzer`

**Example:**
```python
# In config.py - get_analyzer() method
if self.analyzer_provider == AnalyzerProvider.GEMINI:
    return GeminiAnalyzer(api_key=self.google_api_key)
elif self.analyzer_provider == AnalyzerProvider.NONE:
    return RuleBasedAnalyzer()
```

**When adding new analyzer:**
1. Create new file in `src/context_ambulance/analyzers/`
2. Inherit from `BaseAnalyzer`
3. Implement `analyze_conversation(messages) -> Analysis`
4. Add to `AnalyzerProvider` enum in `config.py`
5. Add case in `Config.get_analyzer()`

### 2. Data Models (Pydantic-style dataclasses)
Core data structures in `analyzers/__init__.py`:
- `Message`: Single message with role (USER/ASSISTANT), content, timestamp
- `LoopPattern`: Detected loop with type, occurrences, indices, description
- `Analysis`: Results with goal, blocker, insights, loops, recommendations

**Never mutate these directly** - create new instances when modifying.

### 3. Sanitization Levels
Three levels in `SanitizationLevel` enum:
- `MINIMAL`: Remove only detected loops
- `BALANCED`: Remove loops + obvious filler (default)
- `AGGRESSIVE`: Deduplicate errors, code blocks, filler

**Implementation in `ConversationSanitizer.sanitize()`:**
```python
# Always remove detected loops
remove_indices = self._get_removal_indices(messages, analysis)
sanitized = [msg for i, msg in enumerate(messages) if i not in remove_indices]

# Then apply level-specific cleanup
if self.level == SanitizationLevel.AGGRESSIVE:
    sanitized = self._aggressive_cleanup(sanitized)
```

### 4. Template-Based Output
Rescue packages use Jinja2 template at `templates/rescue_package.md`. This allows:
- Consistent output format
- Easy customization without code changes
- Variables: `goal`, `blocker`, `loops_detected`, `cleaned_messages`, `stats`

**Modifying output:** Edit the template file, not the generator code.

## Common Workflows

### Adding a New Analyzer
1. Create `src/context_ambulance/analyzers/yourname.py`
2. Import and inherit: `from . import BaseAnalyzer, Analysis, Message`
3. Implement `analyze_conversation()` method
4. Parse API responses into `Analysis` object with `goal`, `blocker`, `loops_detected`, etc.
5. Add to `config.py`: Update `AnalyzerProvider` enum and `get_analyzer()` switch

### Improving Loop Detection
**Rule-based patterns in `analyzers/rules.py`:**
- `_detect_repetitive_errors()`: Finds same error 3+ times
- `_detect_apology_cascade()`: Finds "I apologize" patterns
- `_detect_code_churn()`: Finds similar code blocks repeated

**To add new pattern:**
1. Create `_detect_your_pattern()` method
2. Return list of `LoopPattern` objects
3. Call from `analyze_conversation()` and extend `loops` list

### Testing New Features
**Test fixtures in `tests/fixtures/__init__.py`:**
- `SAMPLE_LOOP_CONVERSATION`: Conversation with apology loops
- `SAMPLE_CODE_CHURN`: Conversation with repeated code changes
- `SAMPLE_CLEAN_CONVERSATION`: No loops (for false positive testing)

**Add new fixture for your test case, then test against it.**

## Configuration Management

**Environment Variables (.env):**
```bash
ANALYZER_PROVIDER=gemini  # or claude, openai, none
GOOGLE_API_KEY=your_key
SANITIZATION_LEVEL=balanced  # minimal, balanced, aggressive
MAX_MESSAGES_TO_ANALYZE=100
OUTPUT_DIR=./rescue_packages
```

**Override via CLI:**
```powershell
context-ambulance rescue --analyzer none --sanitization aggressive --max-messages 50
```

**Precedence:** CLI flags > .env > defaults

## Critical Conventions

### 1. LLM-Agnostic Design
- Never hardcode Gemini-specific prompts in core logic
- Output (`rescue_package.md`) must work with ANY LLM
- Keep analyzer implementations in separate files
- Use abstract base class for all analyzers

### 2. Graceful Degradation
If Gemini API fails, CLI should:
```python
try:
    analyzer = config.get_analyzer()  # Gemini
    analysis = analyzer.analyze_conversation(messages)
except Exception:
    console.print("[yellow]Falling back to rule-based...[/yellow]")
    analyzer = RuleBasedAnalyzer()
    analysis = analyzer.analyze_conversation(messages)
```

**Always provide fallback to `RuleBasedAnalyzer`** so tool works without API keys.

### 3. Privacy & Security
- Never log API keys or full message content
- Don't save conversations to disk unless explicitly requested
- Sanitize user content before showing in output (future: detect secrets)

### 4. User Experience
Use `rich` library for beautiful CLI output:
- `Progress` with spinners for long operations
- `Panel` for success/error messages
- Color codes: `[cyan]`, `[yellow]`, `[red]`, `[green]`

**Example:**
```python
console.print(f"✓ Removed {stats['total_removed']} messages ({stats['reduction_percent']}% reduction)")
```

## Testing Strategy

**Unit Tests:**
- `test_analyzers.py`: Test loop detection algorithms
- `test_sanitizers.py`: Test removal logic and stats

**No integration tests yet** - mock Gemini API calls to avoid costs.

**Run specific test:**
```powershell
pytest tests/test_analyzers.py::TestRuleBasedAnalyzer::test_detect_code_churn -v
```

## Dependencies

**Core (required):**
- `click`: CLI framework
- `rich`: Beautiful terminal output
- `python-dotenv`: Environment management
- `pydantic`: Data validation
- `jinja2`: Template rendering

**Optional (install as needed):**
- `google-generativeai`: Gemini API (`pip install -e ".[gemini]"`)
- `selenium`: Browser scraping (`pip install -e ".[scraping]"`)
- `anthropic`, `openai`: Alternative analyzers

**Development:**
- `pytest`, `pytest-mock`: Testing
- `black`, `ruff`: Code formatting/linting

## Future Enhancements (Not Yet Implemented)

- Web scraping from ChatGPT/Claude/Gemini UIs (selenium/playwright)
- Claude and OpenAI analyzer implementations
- Browser extension for one-click rescue
- Conversation diff viewer (before/after)
- Local LLM support (Ollama)

## Troubleshooting

**"API key not found"**: Copy `.env.example` to `.env` and add keys, OR use `--analyzer none`

**Template not found**: Install package properly with `pip install -e .` (not just running Python files directly)

**Import errors**: Ensure using Python 3.10+ and virtual environment is activated

---

*For detailed usage, see README.md*
