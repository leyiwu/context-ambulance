"""Tests for analyzers."""

import pytest

from context_ambulance.analyzers import Message, MessageRole, LoopPattern
from context_ambulance.analyzers.rules import RuleBasedAnalyzer
from tests.fixtures import (
    SAMPLE_LOOP_CONVERSATION,
    SAMPLE_CODE_CHURN,
    SAMPLE_CLEAN_CONVERSATION
)


class TestRuleBasedAnalyzer:
    """Tests for rule-based analyzer."""
    
    def test_detect_repetitive_errors(self):
        """Test detection of repetitive error messages."""
        analyzer = RuleBasedAnalyzer(error_threshold=2)
        analysis = analyzer.analyze_conversation(SAMPLE_LOOP_CONVERSATION)
        
        # Should detect the apology cascade
        assert len(analysis.loops_detected) > 0
        apology_loops = [l for l in analysis.loops_detected if l.pattern_type == "apology_cascade"]
        assert len(apology_loops) > 0
    
    # def test_detect_code_churn(self):
    #     """Test detection of code churn."""
    #     analyzer = RuleBasedAnalyzer()
    #     analysis = analyzer.analyze_conversation(SAMPLE_CODE_CHURN)
        
    #     # Should detect code being modified repeatedly
    #     code_loops = [l for l in analysis.loops_detected if l.pattern_type == "code_churn"]
    #     assert len(code_loops) > 0
    
    def test_clean_conversation(self):
        """Test that clean conversations don't trigger false positives."""
        analyzer = RuleBasedAnalyzer()
        analysis = analyzer.analyze_conversation(SAMPLE_CLEAN_CONVERSATION)
        
        # Should detect few or no loops
        assert len(analysis.loops_detected) == 0
    
    def test_extract_goal(self):
        """Test goal extraction."""
        analyzer = RuleBasedAnalyzer()
        analysis = analyzer.analyze_conversation(SAMPLE_LOOP_CONVERSATION)
        
        # Goal should be from first user message
        assert "Python error" in analysis.goal or "fix" in analysis.goal
    
    # def test_identify_blocker(self):
    #     """Test blocker identification."""
    #     analyzer = RuleBasedAnalyzer()
    #     analysis = analyzer.analyze_conversation(SAMPLE_LOOP_CONVERSATION)
        
    #     # Blocker should reference the repetition or apologies
    #     assert len(analysis.blocker) > 0
    #     assert any(word in analysis.blocker.lower() for word in ['apolog', 'repeat', 'stuck'])
    
    def test_recommendations(self):
        """Test that recommendations are generated."""
        analyzer = RuleBasedAnalyzer()
        analysis = analyzer.analyze_conversation(SAMPLE_LOOP_CONVERSATION)
        
        assert len(analysis.recommended_steps) > 0


class TestMessageParsing:
    """Tests for message data models."""
    
    def test_message_creation(self):
        """Test creating message objects."""
        msg = Message(
            role=MessageRole.USER,
            content="Test message"
        )
        assert msg.role == MessageRole.USER
        assert msg.content == "Test message"
    
    def test_message_str(self):
        """Test string representation."""
        msg = Message(
            role=MessageRole.ASSISTANT,
            content="A" * 150  # Long content
        )
        str_repr = str(msg)
        assert "assistant" in str_repr
        assert len(str_repr) < len(msg.content)  # Should be truncated
