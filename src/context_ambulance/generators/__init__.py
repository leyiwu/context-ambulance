"""Rescue package generator."""

from datetime import datetime
from pathlib import Path
from typing import List, Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape

from ..analyzers import Analysis, Message
from ..sanitizers import ConversationSanitizer


class RescuePackageGenerator:
    """Generates Context_Rescue_Package.md files."""
    
    def __init__(self, template_dir: Optional[Path] = None):
        """
        Initialize generator.
        
        Args:
            template_dir: Path to templates directory (auto-detected if None)
        """
        if template_dir is None:
            # Auto-detect template directory
            template_dir = Path(__file__).parent.parent / "templates"
        
        self.template_dir = template_dir
        self.env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )
    
    def generate(
        self,
        analysis: Analysis,
        original_messages: List[Message],
        sanitized_messages: List[Message],
        output_path: Path,
        sanitizer: Optional[ConversationSanitizer] = None
    ) -> Path:
        """
        Generate rescue package markdown file.
        
        Args:
            analysis: Analysis results
            original_messages: Original conversation
            sanitized_messages: Cleaned conversation
            output_path: Where to save the package
            sanitizer: Sanitizer instance for stats (optional)
            
        Returns:
            Path to generated file
        """
        # Calculate removal statistics
        stats = None
        if sanitizer:
            stats = sanitizer.get_removal_stats(original_messages, sanitized_messages)
        
        # Prepare template context
        context = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'goal': analysis.goal,
            'blocker': analysis.blocker,
            'current_state': analysis.current_state,
            'key_insights': analysis.key_insights,
            'recommended_steps': analysis.recommended_steps,
            'loops_detected': analysis.loops_detected,
            'cleaned_messages': sanitized_messages,
            'stats': stats,
        }
        
        # Render template
        template = self.env.get_template('rescue_package.md')
        content = template.render(**context)
        
        # Write to file
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(content, encoding='utf-8')
        
        return output_path
    
    def generate_filename(self, base_name: str = "rescue") -> str:
        """
        Generate a timestamped filename.
        
        Args:
            base_name: Base name for the file
            
        Returns:
            Filename with timestamp
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"{base_name}_{timestamp}.md"
