"""Tests for conversation sanitizer."""

import pytest

from context_ambulance.analyzers import Analysis, LoopPattern
from context_ambulance.config import SanitizationLevel
from context_ambulance.sanitizers import ConversationSanitizer
from tests.fixtures import SAMPLE_LOOP_CONVERSATION, SAMPLE_CODE_CHURN


class TestConversationSanitizer:
    """Tests for conversation sanitizer."""
    
    def test_remove_apology_loops(self):
        """Test removal of apology cascades."""
        sanitizer = ConversationSanitizer(level=SanitizationLevel.BALANCED)
        
        # Create mock analysis with apology loop
        analysis = Analysis(
            goal="Fix error",
            blocker="Stuck",
            key_insights=[],
            loops_detected=[
                LoopPattern(
                    pattern_type="apology_cascade",
                    occurrences=3,
                    first_index=1,
                    last_index=7,
                    description="Multiple apologies"
                )
            ]
        )
        
        sanitized = sanitizer.sanitize(SAMPLE_LOOP_CONVERSATION, analysis)
        
        # Should remove some messages
        assert len(sanitized) < len(SAMPLE_LOOP_CONVERSATION)
    
    def test_aggressive_cleanup(self):
        """Test aggressive sanitization removes more content."""
        aggressive = ConversationSanitizer(level=SanitizationLevel.AGGRESSIVE)
        balanced = ConversationSanitizer(level=SanitizationLevel.BALANCED)
        
        analysis = Analysis(
            goal="Test",
            blocker="Test",
            key_insights=[],
            loops_detected=[]
        )
        
        aggressive_result = aggressive.sanitize(SAMPLE_LOOP_CONVERSATION, analysis)
        balanced_result = balanced.sanitize(SAMPLE_LOOP_CONVERSATION, analysis)
        
        # Aggressive should remove more
        assert len(aggressive_result) <= len(balanced_result)
    
    def test_removal_stats(self):
        """Test statistics calculation."""
        sanitizer = ConversationSanitizer()
        
        analysis = Analysis(
            goal="Test",
            blocker="Test",
            key_insights=[],
            loops_detected=[]
        )
        
        sanitized = sanitizer.sanitize(SAMPLE_LOOP_CONVERSATION, analysis)
        stats = sanitizer.get_removal_stats(SAMPLE_LOOP_CONVERSATION, sanitized)
        
        assert 'total_removed' in stats
        assert 'original_count' in stats
        assert 'sanitized_count' in stats
        assert 'reduction_percent' in stats
        
        assert stats['original_count'] == len(SAMPLE_LOOP_CONVERSATION)
        assert stats['sanitized_count'] == len(sanitized)
        assert stats['total_removed'] == stats['original_count'] - stats['sanitized_count']
