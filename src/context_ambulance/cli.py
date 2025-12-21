"""Command-line interface for Context Ambulance."""

import sys
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

from . import __version__
from .analyzers import Message, MessageRole
from .config import Config, AnalyzerProvider, SanitizationLevel
from .generators import RescuePackageGenerator
from .sanitizers import ConversationSanitizer

console = Console()


@click.group()
@click.version_option(version=__version__)
def main():
    """Context Ambulance - The Eject Button for ChatGPT Doom Loops."""
    pass


@main.command()
@click.option(
    '--input', '-i',
    type=click.Path(exists=True, path_type=Path),
    required=True,
    help='Input file containing conversation'
)
@click.option(
    '--output', '-o',
    type=click.Path(path_type=Path),
    help='Output file path (auto-generated if not specified)'
)
@click.option(
    '--analyzer',
    type=click.Choice(['gemini', 'claude', 'openai', 'none'], case_sensitive=False),
    help='Analyzer to use (overrides config)'
)
@click.option(
    '--sanitization',
    type=click.Choice(['minimal', 'balanced', 'aggressive'], case_sensitive=False),
    default='balanced',
    help='Sanitization level'
)
@click.option(
    '--max-messages',
    type=int,
    default=100,
    help='Maximum number of messages to analyze'
)
def rescue(
    input: Path,
    output: Optional[Path],
    analyzer: Optional[str],
    sanitization: str,
    max_messages: int
):
    """
    Rescue a poisoned conversation by analyzing and generating a clean rescue package.
    
    Example: context-ambulance rescue --input chat.txt --output rescue.md
    """
    try:
        # Load configuration
        config = Config()
        
        # Override analyzer if specified
        if analyzer:
            config.analyzer_provider = AnalyzerProvider(analyzer.lower())
        
        # Override sanitization level
        config.sanitization_level = SanitizationLevel(sanitization.lower())
        config.max_messages_to_analyze = max_messages
        
        console.print(Panel.fit(
            "[bold cyan]Context Ambulance[/bold cyan]\n"
            "Rescuing your conversation...",
            border_style="cyan"
        ))
        
        # Parse input file
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("Reading conversation...", total=None)
            messages = parse_conversation_file(input)
            progress.update(task, completed=True)
            
            console.print(f"✓ Loaded {len(messages)} messages")
            
            # Limit messages if needed
            if len(messages) > max_messages:
                messages = messages[-max_messages:]
                console.print(f"  Analyzing last {max_messages} messages")
            
            # Analyze conversation
            task = progress.add_task("Analyzing conversation...", total=None)
            try:
                analyzer_instance = config.get_analyzer()
                analysis = analyzer_instance.analyze_conversation(messages)
                progress.update(task, completed=True)
                
                console.print(f"✓ Analysis complete")
                console.print(f"  Goal: {analysis.goal[:60]}...")
                console.print(f"  Loops detected: {len(analysis.loops_detected)}")
            except Exception as e:
                progress.update(task, completed=True)
                console.print(f"[yellow]⚠ Analysis failed: {e}[/yellow]")
                console.print("[yellow]  Falling back to rule-based analysis...[/yellow]")
                
                # Fallback to rule-based
                from .analyzers.rules import RuleBasedAnalyzer
                analyzer_instance = RuleBasedAnalyzer()
                analysis = analyzer_instance.analyze_conversation(messages)
                console.print(f"✓ Rule-based analysis complete")
            
            # Sanitize conversation
            task = progress.add_task("Sanitizing conversation...", total=None)
            sanitizer = ConversationSanitizer(level=config.sanitization_level)
            sanitized = sanitizer.sanitize(messages, analysis)
            stats = sanitizer.get_removal_stats(messages, sanitized)
            progress.update(task, completed=True)
            
            console.print(f"✓ Removed {stats['total_removed']} messages ({stats['reduction_percent']}% reduction)")
            
            # Generate rescue package
            task = progress.add_task("Generating rescue package...", total=None)
            generator = RescuePackageGenerator()
            
            if output is None:
                output = config.output_dir / generator.generate_filename()
            
            output_file = generator.generate(
                analysis=analysis,
                original_messages=messages,
                sanitized_messages=sanitized,
                output_path=output,
                sanitizer=sanitizer
            )
            progress.update(task, completed=True)
        
        # Success!
        console.print()
        console.print(Panel.fit(
            f"[bold green]✓ Rescue Complete![/bold green]\n\n"
            f"Output: [cyan]{output_file}[/cyan]\n\n"
            f"Next steps:\n"
            f"1. Copy the rescue package content\n"
            f"2. Start a fresh conversation with any LLM\n"
            f"3. Paste the content and let the fresh LLM solve your problem",
            border_style="green"
        ))
        
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {e}")
        if "--debug" in sys.argv:
            raise
        sys.exit(1)


@main.command()
@click.option(
    '--input', '-i',
    type=click.Path(exists=True, path_type=Path),
    required=True,
    help='Input file containing conversation'
)
@click.option(
    '--analyzer',
    type=click.Choice(['gemini', 'claude', 'openai', 'none'], case_sensitive=False),
    help='Analyzer to use'
)
def analyze(input: Path, analyzer: Optional[str]):
    """
    Analyze a conversation without generating a rescue package.
    
    Useful for debugging or understanding what loops were detected.
    """
    try:
        config = Config()
        
        if analyzer:
            config.analyzer_provider = AnalyzerProvider(analyzer.lower())
        
        console.print(f"Reading {input}...")
        messages = parse_conversation_file(input)
        
        console.print(f"Analyzing {len(messages)} messages...")
        analyzer_instance = config.get_analyzer()
        analysis = analyzer_instance.analyze_conversation(messages)
        
        # Display results
        console.print()
        console.print(Panel.fit(
            f"[bold]Analysis Results[/bold]\n\n"
            f"[cyan]Goal:[/cyan] {analysis.goal}\n\n"
            f"[yellow]Blocker:[/yellow] {analysis.blocker}\n\n"
            f"[red]Loops Detected:[/red] {len(analysis.loops_detected)}",
            border_style="blue"
        ))
        
        if analysis.loops_detected:
            console.print("\n[bold]Detected Patterns:[/bold]")
            for loop in analysis.loops_detected:
                console.print(f"  • {loop}")
        
        if analysis.key_insights:
            console.print("\n[bold]Key Insights:[/bold]")
            for insight in analysis.key_insights:
                console.print(f"  • {insight}")
        
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {e}")
        sys.exit(1)


def parse_conversation_file(file_path: Path) -> list[Message]:
    """
    Parse a conversation file into Message objects.
    
    Supports simple format:
    User: message
    Assistant: message
    
    Args:
        file_path: Path to conversation file
        
    Returns:
        List of Message objects
    """
    messages = []
    content = file_path.read_text(encoding='utf-8')
    
    current_role = None
    current_content = []
    
    for line in content.split('\n'):
        # Check for role indicators
        if line.startswith('User:') or line.startswith('USER:'):
            # Save previous message if exists
            if current_role is not None and current_content:
                messages.append(Message(
                    role=current_role,
                    content='\n'.join(current_content).strip()
                ))
            # Start new message
            current_role = MessageRole.USER
            remaining = line.split(':', 1)[1].strip() if ':' in line else ''
            current_content = [remaining] if remaining else []
        
        elif line.startswith('Assistant:') or line.startswith('ASSISTANT:'):
            # Save previous message if exists
            if current_role is not None and current_content:
                messages.append(Message(
                    role=current_role,
                    content='\n'.join(current_content).strip()
                ))
            # Start new message
            current_role = MessageRole.ASSISTANT
            remaining = line.split(':', 1)[1].strip() if ':' in line else ''
            current_content = [remaining] if remaining else []
        
        else:
            # Continue current message
            if current_role is not None:
                current_content.append(line)
    
    # Add last message
    if current_role and current_content:
        messages.append(Message(
            role=current_role,
            content='\n'.join(current_content).strip()
        ))
    
    return messages


if __name__ == '__main__':
    main()
