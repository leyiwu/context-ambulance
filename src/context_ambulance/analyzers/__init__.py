"""Base analyzer interface and data models."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import List, Optional


class MessageRole(Enum):
    """Role of the message sender."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


@dataclass
class Message:
    """Represents a single message in a conversation."""
    role: MessageRole
    content: str
    timestamp: Optional[datetime] = None
    
    def __str__(self) -> str:
        return f"{self.role.value}: {self.content[:100]}..."


@dataclass
class LoopPattern:
    """Detected loop or problematic pattern."""
    pattern_type: str  # "repetitive_error", "circular_logic", "apology_cascade", etc.
    occurrences: int
    first_index: int
    last_index: int
    description: str
    
    def __str__(self) -> str:
        return f"{self.pattern_type} (x{self.occurrences}): {self.description}"


@dataclass
class Analysis:
    """Results of conversation analysis."""
    goal: str  # Extracted original goal
    blocker: str  # Specific issue causing the loop
    key_insights: List[str]  # Important decisions/constraints to preserve
    loops_detected: List[LoopPattern]  # Detected problematic patterns
    current_state: Optional[str] = None  # Last known good code/context
    recommended_steps: List[str] = None  # Suggested next approaches
    
    def __post_init__(self):
        if self.recommended_steps is None:
            self.recommended_steps = []
    
    @property
    def total_loops(self) -> int:
        """Total number of loop occurrences detected."""
        return sum(loop.occurrences for loop in self.loops_detected)
    
    def summary(self) -> str:
        """Human-readable summary of analysis."""
        return (
            f"Goal: {self.goal}\n"
            f"Blocker: {self.blocker}\n"
            f"Loops detected: {len(self.loops_detected)} patterns, {self.total_loops} total occurrences\n"
            f"Key insights: {len(self.key_insights)}"
        )


class BaseAnalyzer(ABC):
    """Abstract base class for conversation analyzers."""
    
    @abstractmethod
    def analyze_conversation(self, messages: List[Message]) -> Analysis:
        """
        Analyze a conversation to extract goal, detect loops, and identify blockers.
        
        Args:
            messages: List of conversation messages
            
        Returns:
            Analysis object with extracted information
        """
        pass
    
    def _extract_code_blocks(self, content: str) -> List[str]:
        """Extract code blocks from message content."""
        code_blocks = []
        lines = content.split('\n')
        in_code_block = False
        current_block = []
        
        for line in lines:
            if line.strip().startswith('```'):
                if in_code_block:
                    code_blocks.append('\n'.join(current_block))
                    current_block = []
                in_code_block = not in_code_block
            elif in_code_block:
                current_block.append(line)
        
        return code_blocks
    
    def _is_error_message(self, content: str) -> bool:
        """Check if message contains an error."""
        error_indicators = [
            'error:', 'exception:', 'traceback',
            'failed', 'cannot', 'undefined',
            'null pointer', 'segmentation fault'
        ]
        content_lower = content.lower()
        return any(indicator in content_lower for indicator in error_indicators)
    
    def _is_apology(self, content: str) -> bool:
        """Check if message is an apology."""
        apology_phrases = [
            'i apologize', 'sorry', 'my apologies',
            'i was wrong', 'let me correct'
        ]
        content_lower = content.lower()
        return any(phrase in content_lower for phrase in apology_phrases)
