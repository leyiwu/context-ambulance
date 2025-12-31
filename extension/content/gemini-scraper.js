// Gemini Conversation Scraper
(function() {
  'use strict';

  class GeminiScraper {
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
      
      // Gemini uses message-content class or data attributes
      const messageElements = document.querySelectorAll('[data-test-id*="message"], .message-content, [class*="conversation-turn"]');
      
      if (messageElements.length === 0) {
        return this.scrapeFallback();
      }

      messageElements.forEach((element) => {
        // Determine role based on class or structure
        const classList = element.className || '';
        const isUser = classList.includes('user') || 
                      element.querySelector('[aria-label*="You" i]') ||
                      element.closest('[data-role="user"]');
        
        const content = this.extractContent(element);
        
        if (content.trim()) {
          messages.push({
            role: isUser ? 'USER' : 'ASSISTANT',
            content: content.trim(),
            timestamp: null
          });
        }
      });

      return messages;
    }

    scrapeFallback() {
      const messages = [];
      const mainContent = document.querySelector('main') || document.body;
      
      // Look for alternating message pattern
      const potentialMessages = mainContent.querySelectorAll('div[class*="model-response"], div[class*="user-query"]');
      
      potentialMessages.forEach((div) => {
        const text = div.innerText?.trim();
        if (!text || text.length < 5) return;
        
        const isUser = div.className.includes('user') || div.className.includes('query');
        
        messages.push({
          role: isUser ? 'USER' : 'ASSISTANT',
          content: text,
          timestamp: null
        });
      });

      return messages;
    }

    extractContent(element) {
      const codeBlocks = element.querySelectorAll('pre code, pre, code[class*="language"]');
      const codeTexts = Array.from(codeBlocks).map(block => block.textContent);
      
      let textContent = element.textContent || element.innerText;
      
      codeBlocks.forEach((block, index) => {
        const placeholder = `__CODE_BLOCK_${index}__`;
        textContent = textContent.replace(block.textContent, placeholder);
      });
      
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

  new GeminiScraper();
})();
