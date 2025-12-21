"""Configuration management for Context Ambulance."""

import os
from enum import Enum
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv


class AnalyzerProvider(Enum):
    """Available analyzer providers."""
    GEMINI = "gemini"
    CLAUDE = "claude"
    OPENAI = "openai"
    NONE = "none"  # Rule-based only


class SanitizationLevel(Enum):
    """Sanitization aggressiveness levels."""
    MINIMAL = "minimal"      # Keep most context
    BALANCED = "balanced"    # Default
    AGGRESSIVE = "aggressive"  # Maximum cleanup


class Config:
    """Application configuration."""
    
    def __init__(self, env_file: Optional[Path] = None):
        """
        Load configuration from environment.
        
        Args:
            env_file: Path to .env file (optional)
        """
        if env_file and env_file.exists():
            load_dotenv(env_file)
        else:
            load_dotenv()  # Load from default .env location
        
        # Analyzer settings
        self.analyzer_provider = self._get_analyzer_provider()
        
        # API keys
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        # Analysis settings
        self.max_messages_to_analyze = int(os.getenv("MAX_MESSAGES_TO_ANALYZE", "100"))
        self.sanitization_level = self._get_sanitization_level()
        
        # Output settings
        self.output_dir = Path(os.getenv("OUTPUT_DIR", "./rescue_packages"))
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_analyzer_provider(self) -> AnalyzerProvider:
        """Get analyzer provider from environment."""
        provider_str = os.getenv("ANALYZER_PROVIDER", "gemini").lower()
        try:
            return AnalyzerProvider(provider_str)
        except ValueError:
            return AnalyzerProvider.GEMINI
    
    def _get_sanitization_level(self) -> SanitizationLevel:
        """Get sanitization level from environment."""
        level_str = os.getenv("SANITIZATION_LEVEL", "balanced").lower()
        try:
            return SanitizationLevel(level_str)
        except ValueError:
            return SanitizationLevel.BALANCED
    
    def get_analyzer(self):
        """
        Get appropriate analyzer instance based on configuration.
        
        Returns:
            BaseAnalyzer instance
            
        Raises:
            ValueError: If required API key is missing
            ImportError: If required package is not installed
        """
        if self.analyzer_provider == AnalyzerProvider.NONE:
            from .analyzers.rules import RuleBasedAnalyzer
            return RuleBasedAnalyzer()
        
        elif self.analyzer_provider == AnalyzerProvider.GEMINI:
            if not self.google_api_key:
                raise ValueError(
                    "GOOGLE_API_KEY not found. Set it in .env or use --analyzer none"
                )
            from .analyzers.gemini import GeminiAnalyzer
            return GeminiAnalyzer(api_key=self.google_api_key)
        
        elif self.analyzer_provider == AnalyzerProvider.CLAUDE:
            if not self.anthropic_api_key:
                raise ValueError(
                    "ANTHROPIC_API_KEY not found. Set it in .env or use --analyzer none"
                )
            # TODO: Implement ClaudeAnalyzer
            raise NotImplementedError("Claude analyzer not yet implemented")
        
        elif self.analyzer_provider == AnalyzerProvider.OPENAI:
            if not self.openai_api_key:
                raise ValueError(
                    "OPENAI_API_KEY not found. Set it in .env or use --analyzer none"
                )
            # TODO: Implement OpenAIAnalyzer
            raise NotImplementedError("OpenAI analyzer not yet implemented")
        
        else:
            raise ValueError(f"Unknown analyzer provider: {self.analyzer_provider}")
    
    def validate(self) -> bool:
        """
        Validate configuration.
        
        Returns:
            True if configuration is valid
            
        Raises:
            ValueError: If configuration is invalid
        """
        # Check if selected analyzer has required API key
        if self.analyzer_provider == AnalyzerProvider.GEMINI and not self.google_api_key:
            raise ValueError("Gemini analyzer requires GOOGLE_API_KEY")
        
        if self.analyzer_provider == AnalyzerProvider.CLAUDE and not self.anthropic_api_key:
            raise ValueError("Claude analyzer requires ANTHROPIC_API_KEY")
        
        if self.analyzer_provider == AnalyzerProvider.OPENAI and not self.openai_api_key:
            raise ValueError("OpenAI analyzer requires OPENAI_API_KEY")
        
        return True


# Global config instance
_config: Optional[Config] = None


def get_config() -> Config:
    """Get global configuration instance."""
    global _config
    if _config is None:
        _config = Config()
    return _config


def set_config(config: Config):
    """Set global configuration instance."""
    global _config
    _config = config
