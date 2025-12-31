// Claude Conversation Scraper
(function() {
  'use strict';

  class ClaudeScraper {
    constructor() {
      this.setupMessageListener();
    }

    setupMessageListener() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'scrapeConversation') {
          try {
            const messages = this.scrapeMessages();
            sendResponse({ success: true, messages });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
        }
        return true;
      });
    }

    scrapeMessages() {
      const messages = [];
      
      // Claude uses specific div structure for messages
      // Look for message containers in conversation
      const conversationContainer = document.querySelector('[role="presentation"]') || 
                                    document.querySelector('main') ||
                                    document.body;
      
      // Claude message pattern: alternating user/assistant divs
      const allDivs = conversationContainer.querySelectorAll('div[class*="font-"]');
      
      let isUserMessage = true; // Claude typically starts with user message
      
      allDivs.forEach((div) => {
        const text = div.innerText?.trim();
        
        // Filter out UI elements and short content
        if (!text || text.length < 10) return;
        
        // Skip if it looks like a UI element
        if (this.isUIElement(text)) return;
        
        // Detect role based on content and structure
        const hasUserIndicators = div.querySelector('[data-test*="user" i]') ||
                                  text.startsWith('You:') ||
                                  div.classList.toString().includes('user');
        
        const hasAssistantIndicators = div.querySelector('[data-test*="claude" i]') ||
                                       div.classList.toString().includes('assistant');
        
        let role = 'ASSISTANT';
        if (hasUserIndicators) {
          role = 'USER';
        } else if (!hasAssistantIndicators) {
          // Alternate if unclear
          role = isUserMessage ? 'USER' : 'ASSISTANT';
        }
        
        // Extract content with code blocks preserved
        const content = this.extractContent(div);
        
        if (content && content.length > 10) {
          messages.push({
            role: role,
            content: content,
            timestamp: null
          });
          
          isUserMessage = !isUserMessage;
        }
      });

      return messages;
    }

    isUIElement(text) {
      const uiPatterns = [
        /^(new chat|settings|profile|upgrade|help)/i,
        /^(copy|edit|retry|regenerate)/i,
        /^\d+ tokens$/i,
        /^claude-/i
      ];
      
      return uiPatterns.some(pattern => pattern.test(text));
    }

    extractContent(element) {
      // Similar to ChatGPT scraper
      const codeBlocks = element.querySelectorAll('pre code, pre, code[class*="language"]');
      const codeTexts = Array.from(codeBlocks).map(block => block.textContent);
      
      let textContent = element.textContent || element.innerText;
      
      // Replace code blocks with placeholders
      codeBlocks.forEach((block, index) => {
        const placeholder = `__CODE_BLOCK_${index}__`;
        textContent = textContent.replace(block.textContent, placeholder);
      });
      
      // Re-inject with markdown formatting
      codeTexts.forEach((code, index) => {
        const language = codeBlocks[index].className.match(/language-(\w+)/)?.[1] || '';
        textContent = textContent.replace(
          `__CODE_BLOCK_${index}__`,
          `\n\`\`\`${language}\n${code}\n\`\`\`\n`
        );
      });
      
      return textContent.trim();
    }
  }

  new ClaudeScraper();
})();
