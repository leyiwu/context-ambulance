"""Conversation sanitizer - removes noise and loops."""

from typing import List, Set

from ..analyzers import Analysis, LoopPattern, Message, MessageRole
from ..config import SanitizationLevel


class ConversationSanitizer:
    """Sanitizes conversations by removing loops and noise."""
    
    def __init__(self, level: SanitizationLevel = SanitizationLevel.BALANCED):
        """
        Initialize sanitizer.
        
        Args:
            level: Sanitization aggressiveness level
        """
        self.level = level
    
    def sanitize(
        self,
        messages: List[Message],
        analysis: Analysis
    ) -> List[Message]:
        """
        Sanitize conversation based on analysis.
        
        Args:
            messages: Original conversation messages
            analysis: Analysis results with detected loops
            
        Returns:
            Cleaned list of messages
        """
        # Get indices to remove based on detected loops
        remove_indices = self._get_removal_indices(messages, analysis)
        
        # Filter out messages at removal indices
        sanitized = [
            msg for i, msg in enumerate(messages)
            if i not in remove_indices
        ]
        
        # Apply additional sanitization based on level
        if self.level == SanitizationLevel.AGGRESSIVE:
            sanitized = self._aggressive_cleanup(sanitized)
        elif self.level == SanitizationLevel.BALANCED:
            sanitized = self._balanced_cleanup(sanitized)
        # MINIMAL level: just remove detected loops, no additional cleanup
        
        return sanitized
    
    def _get_removal_indices(
        self,
        messages: List[Message],
        analysis: Analysis
    ) -> Set[int]:
        """Get set of message indices to remove based on loop detection."""
        remove_indices = set()
        
        for loop in analysis.loops_detected:
            if loop.pattern_type == "repetitive_error":
                # Keep first occurrence, remove rest
                indices = range(loop.first_index, loop.last_index + 1)
                # Keep the first error, remove subsequent ones
                for idx in list(indices)[1:]:
                    remove_indices.add(idx)
            
            elif loop.pattern_type == "apology_cascade":
                # Remove all but first apology
                indices = self._find_apology_indices(
                    messages,
                    loop.first_index,
                    loop.last_index
                )
                for idx in indices[1:]:
                    remove_indices.add(idx)
            
            elif loop.pattern_type == "code_churn":
                # Keep only the last version of churned code
                indices = range(loop.first_index, loop.last_index + 1)
                for idx in list(indices)[:-1]:
                    remove_indices.add(idx)
        
        return remove_indices
    
    def _find_apology_indices(
        self,
        messages: List[Message],
        start: int,
        end: int
    ) -> List[int]:
        """Find indices of apology messages in range."""
        apology_phrases = [
            'i apologize', 'sorry', 'my apologies',
            'i was wrong', 'let me correct'
        ]
        
        indices = []
        for i in range(start, min(end + 1, len(messages))):
            content_lower = messages[i].content.lower()
            if any(phrase in content_lower for phrase in apology_phrases):
                indices.append(i)
        
        return indices
    
    def _aggressive_cleanup(self, messages: List[Message]) -> List[Message]:
        """Apply aggressive sanitization."""
        cleaned = []
        seen_errors = set()
        seen_code_hashes = set()
        
        for msg in messages:
            # Skip duplicate errors
            if self._is_error(msg):
                error_sig = self._get_error_signature(msg.content)
                if error_sig in seen_errors:
                    continue
                seen_errors.add(error_sig)
            
            # Skip duplicate code blocks
            code_blocks = self._extract_code_blocks(msg.content)
            if code_blocks:
                code_hash = hash(code_blocks[0][:500])  # Hash first 500 chars
                if code_hash in seen_code_hashes:
                    continue
                seen_code_hashes.add(code_hash)
            
            # Skip messages that add no value
            if self._is_filler_message(msg):
                continue
            
            cleaned.append(msg)
        
        return cleaned
    
    def _balanced_cleanup(self, messages: List[Message]) -> List[Message]:
        """Apply balanced sanitization."""
        cleaned = []
        error_count = {}
        
        for msg in messages:
            # Limit repeated errors (keep first 2 occurrences)
            if self._is_error(msg):
                error_sig = self._get_error_signature(msg.content)
                error_count[error_sig] = error_count.get(error_sig, 0) + 1
                if error_count[error_sig] > 2:
                    continue
            
            # Skip obvious filler
            if self._is_filler_message(msg):
                continue
            
            cleaned.append(msg)
        
        return cleaned
    
    def _is_error(self, message: Message) -> bool:
        """Check if message contains an error."""
        error_indicators = [
            'error:', 'exception:', 'traceback',
            'failed', 'cannot', 'undefined'
        ]
        content_lower = message.content.lower()
        return any(indicator in content_lower for indicator in error_indicators)
    
    def _get_error_signature(self, content: str) -> str:
        """Extract error signature for deduplication."""
        # Return first 100 chars as signature
        return content[:100].lower().strip()
    
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
    
    def _is_filler_message(self, message: Message) -> bool:
        """Check if message is filler (low information value)."""
        if message.role != MessageRole.ASSISTANT:
            return False
        
        content_lower = message.content.lower().strip()
        
        # Very short messages with no code
        if len(content_lower) < 30 and '```' not in message.content:
            return True
        
        # Pure acknowledgments
        filler_phrases = [
            'sure', 'okay', 'got it', 'understood',
            'let me try', 'i\'ll fix', 'one moment'
        ]
        
        if any(content_lower == phrase for phrase in filler_phrases):
            return True
        
        return False
    
    def get_removal_stats(
        self,
        original: List[Message],
        sanitized: List[Message]
    ) -> dict:
        """
        Calculate statistics about what was removed.
        
        Returns:
            Dictionary with removal statistics
        """
        removed_count = len(original) - len(sanitized)
        
        # Count types of removed messages
        original_set = set(id(msg) for msg in sanitized)
        removed = [msg for msg in original if id(msg) not in original_set]
        
        error_count = sum(1 for msg in removed if self._is_error(msg))
        apology_count = sum(1 for msg in removed if self._is_apology(msg))
        code_count = sum(1 for msg in removed if self._extract_code_blocks(msg.content))
        
        return {
            'total_removed': removed_count,
            'errors_removed': error_count,
            'apologies_removed': apology_count,
            'code_blocks_removed': code_count,
            'original_count': len(original),
            'sanitized_count': len(sanitized),
            'reduction_percent': round(removed_count / len(original) * 100, 1) if original else 0
        }
    
    def _is_apology(self, message: Message) -> bool:
        """Check if message is an apology."""
        apology_phrases = [
            'i apologize', 'sorry', 'my apologies',
            'i was wrong', 'let me correct'
        ]
        content_lower = message.content.lower()
        return any(phrase in content_lower for phrase in apology_phrases)
