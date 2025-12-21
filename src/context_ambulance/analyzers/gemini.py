"""Gemini-based conversation analyzer."""

import os
from typing import List, Optional

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

from . import Analysis, BaseAnalyzer, LoopPattern, Message


class GeminiAnalyzer(BaseAnalyzer):
    """Analyzer using Google Gemini Flash for fast, cheap analysis."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-1.5-flash-8b"):
        """
        Initialize Gemini analyzer.
        
        Args:
            api_key: Google API key (or set GOOGLE_API_KEY env var)
            model: Gemini model to use (default: gemini-1.5-flash-8b)
        """
        if not GEMINI_AVAILABLE:
            raise ImportError(
                "google-generativeai not installed. "
                "Install with: pip install google-generativeai"
            )
        
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError(
                "Google API key required. Set GOOGLE_API_KEY environment variable "
                "or pass api_key parameter."
            )
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(model)
        self.model_name = model
    
    def analyze_conversation(self, messages: List[Message]) -> Analysis:
        """
        Analyze conversation using Gemini Flash.
        
        Args:
            messages: List of conversation messages
            
        Returns:
            Analysis with extracted goal, blocker, loops, and insights
        """
        # Build conversation text for analysis
        conversation_text = self._format_messages(messages)
        
        # Create analysis prompt
        prompt = self._build_analysis_prompt(conversation_text)
        
        # Call Gemini API
        response = self.model.generate_content(prompt)
        
        # Parse response into Analysis object
        analysis = self._parse_response(response.text, messages)
        
        return analysis
    
    def _format_messages(self, messages: List[Message]) -> str:
        """Format messages for analysis."""
        formatted = []
        for i, msg in enumerate(messages):
            formatted.append(f"[{i+1}] {msg.role.value.upper()}: {msg.content}")
        return "\n\n".join(formatted)
    
    def _build_analysis_prompt(self, conversation: str) -> str:
        """Build the analysis prompt for Gemini."""
        return f"""You are analyzing a conversation between a user and an AI assistant that has become stuck in a loop or degraded state.

Your task: Extract key information to help rescue this conversation.

CONVERSATION:
{conversation}

ANALYZE AND RESPOND IN THIS EXACT FORMAT:

GOAL:
[What is the user's original goal/objective? Be specific and clear.]

BLOCKER:
[What specific error, issue, or problem is causing the conversation to loop or fail?]

CURRENT_STATE:
[What is the last known good code or state? If there's working code, include it. If not, describe the current situation.]

LOOPS_DETECTED:
[List each loop/pattern detected in this format:]
- TYPE: [repetitive_error|circular_logic|apology_cascade|code_churn]
  OCCURRENCES: [number]
  DESCRIPTION: [what's repeating]

KEY_INSIGHTS:
[List important insights, decisions, or constraints that should be preserved:]
- [insight 1]
- [insight 2]

RECOMMENDED_STEPS:
[Suggest 2-3 fresh approaches to try:]
1. [step 1]
2. [step 2]

Be concise and actionable. Focus on extracting signal from noise."""
    
    def _parse_response(self, response_text: str, messages: List[Message]) -> Analysis:
        """Parse Gemini response into Analysis object."""
        sections = self._split_into_sections(response_text)
        
        # Extract goal
        goal = sections.get("GOAL", "Goal not clearly identified").strip()
        
        # Extract blocker
        blocker = sections.get("BLOCKER", "Blocker not identified").strip()
        
        # Extract current state
        current_state = sections.get("CURRENT_STATE", None)
        if current_state:
            current_state = current_state.strip()
        
        # Parse loops
        loops = self._parse_loops(sections.get("LOOPS_DETECTED", ""))
        
        # Extract key insights
        insights_text = sections.get("KEY_INSIGHTS", "")
        key_insights = [
            line.strip('- ').strip()
            for line in insights_text.split('\n')
            if line.strip().startswith('-')
        ]
        
        # Extract recommended steps
        steps_text = sections.get("RECOMMENDED_STEPS", "")
        recommended_steps = [
            line.split('.', 1)[1].strip() if '.' in line else line.strip()
            for line in steps_text.split('\n')
            if line.strip() and any(line.strip().startswith(str(i)) for i in range(1, 10))
        ]
        
        return Analysis(
            goal=goal,
            blocker=blocker,
            current_state=current_state,
            key_insights=key_insights,
            loops_detected=loops,
            recommended_steps=recommended_steps
        )
    
    def _split_into_sections(self, text: str) -> dict:
        """Split response text into labeled sections."""
        sections = {}
        current_section = None
        current_content = []
        
        for line in text.split('\n'):
            # Check if this is a section header
            if line.strip().endswith(':') and line.strip().isupper():
                # Save previous section
                if current_section:
                    sections[current_section] = '\n'.join(current_content)
                # Start new section
                current_section = line.strip().rstrip(':')
                current_content = []
            elif current_section:
                current_content.append(line)
        
        # Save last section
        if current_section:
            sections[current_section] = '\n'.join(current_content)
        
        return sections
    
    def _parse_loops(self, loops_text: str) -> List[LoopPattern]:
        """Parse loops section into LoopPattern objects."""
        loops = []
        current_loop = {}
        
        for line in loops_text.split('\n'):
            line = line.strip()
            if not line:
                if current_loop:
                    loops.append(self._create_loop_pattern(current_loop))
                    current_loop = {}
                continue
            
            if line.startswith('- TYPE:'):
                current_loop['type'] = line.split(':', 1)[1].strip()
            elif 'OCCURRENCES:' in line:
                try:
                    current_loop['occurrences'] = int(line.split(':')[1].strip())
                except ValueError:
                    current_loop['occurrences'] = 1
            elif 'DESCRIPTION:' in line:
                current_loop['description'] = line.split(':', 1)[1].strip()
        
        if current_loop:
            loops.append(self._create_loop_pattern(current_loop))
        
        return loops
    
    def _create_loop_pattern(self, loop_dict: dict) -> LoopPattern:
        """Create LoopPattern from parsed dictionary."""
        return LoopPattern(
            pattern_type=loop_dict.get('type', 'unknown'),
            occurrences=loop_dict.get('occurrences', 1),
            first_index=0,  # Not available from LLM analysis
            last_index=0,   # Not available from LLM analysis
            description=loop_dict.get('description', 'No description')
        )
