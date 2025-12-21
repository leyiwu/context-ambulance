"""Rule-based analyzer - no API required."""

from collections import Counter
from typing import List

from . import Analysis, BaseAnalyzer, LoopPattern, Message


class RuleBasedAnalyzer(BaseAnalyzer):
    """
    Analyzer using heuristics and pattern matching - no API calls.
    
    Free, fast, and privacy-preserving. Good for basic loop detection
    and conversation cleanup without sending data to external services.
    """
    
    def __init__(self, error_threshold: int = 3, apology_threshold: int = 3):
        """
        Initialize rule-based analyzer.
        
        Args:
            error_threshold: Number of repetitions before flagging as loop
            apology_threshold: Number of apologies before flagging
        """
        self.error_threshold = error_threshold
        self.apology_threshold = apology_threshold
    
    def analyze_conversation(self, messages: List[Message]) -> Analysis:
        """
        Analyze conversation using rule-based heuristics.
        
        Args:
            messages: List of conversation messages
            
        Returns:
            Analysis with detected loops and basic insights
        """
        # Detect various loop patterns
        loops = []
        loops.extend(self._detect_repetitive_errors(messages))
        loops.extend(self._detect_apology_cascade(messages))
        loops.extend(self._detect_code_churn(messages))
        
        # Extract goal (simple heuristic: first user message)
        goal = self._extract_goal(messages)
        
        # Find blocker (most recent error or repeated issue)
        blocker = self._identify_blocker(messages, loops)
        
        # Extract current state (last code block or recent context)
        current_state = self._extract_current_state(messages)
        
        # Generate key insights from non-loop messages
        key_insights = self._extract_insights(messages, loops)
        
        # Suggest next steps based on patterns
        recommended_steps = self._generate_recommendations(loops)
        
        return Analysis(
            goal=goal,
            blocker=blocker,
            current_state=current_state,
            key_insights=key_insights,
            loops_detected=loops,
            recommended_steps=recommended_steps
        )
    
    def _detect_repetitive_errors(self, messages: List[Message]) -> List[LoopPattern]:
        """Detect repeated error messages."""
        error_messages = []
        
        for i, msg in enumerate(messages):
            if self._is_error_message(msg.content):
                # Extract error signature (first 100 chars)
                error_sig = msg.content[:100].lower()
                error_messages.append((i, error_sig))
        
        # Count occurrences of similar errors
        error_counts = Counter(sig for _, sig in error_messages)
        
        loops = []
        for error_sig, count in error_counts.items():
            if count >= self.error_threshold:
                indices = [i for i, sig in error_messages if sig == error_sig]
                loops.append(LoopPattern(
                    pattern_type="repetitive_error",
                    occurrences=count,
                    first_index=indices[0],
                    last_index=indices[-1],
                    description=f"Same error repeated {count} times: {error_sig[:50]}..."
                ))
        
        return loops
    
    def _detect_apology_cascade(self, messages: List[Message]) -> List[LoopPattern]:
        """Detect sequences of apologies without progress."""
        apology_indices = []
        
        for i, msg in enumerate(messages):
            if msg.role.value == "assistant" and self._is_apology(msg.content):
                apology_indices.append(i)
        
        if len(apology_indices) >= self.apology_threshold:
            return [LoopPattern(
                pattern_type="apology_cascade",
                occurrences=len(apology_indices),
                first_index=apology_indices[0],
                last_index=apology_indices[-1],
                description=f"Model apologized {len(apology_indices)} times without making progress"
            )]
        
        return []
    
    def _detect_code_churn(self, messages: List[Message]) -> List[LoopPattern]:
        """Detect repeated code modifications with minimal changes."""
        code_blocks = []
        
        for i, msg in enumerate(messages):
            blocks = self._extract_code_blocks(msg.content)
            for block in blocks:
                code_blocks.append((i, block))
        
        # Look for similar code blocks (simple: same length within 10%)
        loops = []
        seen = set()
        
        for i, (idx1, code1) in enumerate(code_blocks):
            if i in seen:
                continue
            
            similar_indices = [idx1]
            for j, (idx2, code2) in enumerate(code_blocks[i+1:], start=i+1):
                if j in seen:
                    continue
                
                # Simple similarity check: length and first/last lines
                len_ratio = len(code2) / len(code1) if len(code1) > 0 else 0
                if 0.9 <= len_ratio <= 1.1:
                    similar_indices.append(idx2)
                    seen.add(j)
            
            if len(similar_indices) >= 3:
                loops.append(LoopPattern(
                    pattern_type="code_churn",
                    occurrences=len(similar_indices),
                    first_index=similar_indices[0],
                    last_index=similar_indices[-1],
                    description=f"Similar code repeated {len(similar_indices)} times with minor variations"
                ))
        
        return loops
    
    def _extract_goal(self, messages: List[Message]) -> str:
        """Extract user's goal from conversation."""
        # Simple heuristic: first substantial user message
        for msg in messages:
            if msg.role.value == "user" and len(msg.content) > 50:
                # Truncate to first sentence or 200 chars
                content = msg.content.split('\n')[0]
                if len(content) > 200:
                    content = content[:200] + "..."
                return content
        
        return "Goal not clearly identified from conversation"
    
    def _identify_blocker(self, messages: List[Message], loops: List[LoopPattern]) -> str:
        """Identify the main blocker causing issues."""
        # If we have repetitive errors, that's likely the blocker
        error_loops = [l for l in loops if l.pattern_type == "repetitive_error"]
        if error_loops:
            most_repeated = max(error_loops, key=lambda x: x.occurrences)
            return most_repeated.description
        
        # Otherwise, look for recent error messages
        for msg in reversed(messages[-10:]):
            if self._is_error_message(msg.content):
                # Extract error summary
                lines = msg.content.split('\n')
                for line in lines:
                    if any(word in line.lower() for word in ['error', 'exception', 'failed']):
                        return line.strip()[:200]
        
        # Check for apology loops
        apology_loops = [l for l in loops if l.pattern_type == "apology_cascade"]
        if apology_loops:
            return "Conversation stuck in repetitive pattern without progress"
        
        return "Blocker not clearly identified"
    
    def _extract_current_state(self, messages: List[Message]) -> str:
        """Extract current state or last good code."""
        # Look for most recent substantial code block
        for msg in reversed(messages):
            code_blocks = self._extract_code_blocks(msg.content)
            if code_blocks:
                # Return the first (usually only) substantial code block
                for block in code_blocks:
                    if len(block) > 50:
                        return f"```\n{block}\n```"
        
        # No code found, describe recent context
        if messages:
            last_msg = messages[-1]
            return last_msg.content[:300] + ("..." if len(last_msg.content) > 300 else "")
        
        return "Current state unclear"
    
    def _extract_insights(self, messages: List[Message], loops: List[LoopPattern]) -> List[str]:
        """Extract key insights from non-loop messages."""
        insights = []
        
        # Get indices involved in loops
        loop_indices = set()
        for loop in loops:
            loop_indices.update(range(loop.first_index, loop.last_index + 1))
        
        # Look for breakthrough moments (non-loop messages with progress indicators)
        progress_indicators = [
            'solved', 'fixed', 'working', 'success',
            'found the issue', 'figured out', 'realized'
        ]
        
        for i, msg in enumerate(messages):
            if i in loop_indices:
                continue
            
            content_lower = msg.content.lower()
            if any(indicator in content_lower for indicator in progress_indicators):
                # Extract the sentence with the insight
                sentences = msg.content.split('.')
                for sentence in sentences:
                    if any(indicator in sentence.lower() for indicator in progress_indicators):
                        insight = sentence.strip()[:150]
                        if insight:
                            insights.append(insight)
                        break
        
        if not insights:
            insights.append("No clear breakthroughs identified in conversation")
        
        return insights[:5]  # Limit to top 5
    
    def _generate_recommendations(self, loops: List[LoopPattern]) -> List[str]:
        """Generate recommendations based on detected patterns."""
        recommendations = []
        
        if any(l.pattern_type == "repetitive_error" for l in loops):
            recommendations.append("Try a completely different approach - the current method has failed multiple times")
        
        if any(l.pattern_type == "apology_cascade" for l in loops):
            recommendations.append("Provide more context or constraints to break out of the current pattern")
        
        if any(l.pattern_type == "code_churn" for l in loops):
            recommendations.append("Step back and reconsider the architecture rather than making incremental tweaks")
        
        if not recommendations:
            recommendations.append("Review the original goal and verify assumptions")
        
        recommendations.append("Consider consulting documentation or external resources")
        
        return recommendations
