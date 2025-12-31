// ChatGPT Conversation Scraper
(function() {
  'use strict';

  class ChatGPTScraper {
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
        return true; // Keep channel open for async response
      });
    }

    scrapeMessages() {
      const messages = [];
      
      // ChatGPT uses data-message-author-role attribute
      const messageElements = document.querySelectorAll('[data-message-author-role]');
      
      if (messageElements.length === 0) {
        // Fallback: try alternative selectors
        return this.scrapeFallback();
      }

      messageElements.forEach((element) => {
        const role = element.getAttribute('data-message-author-role');
        const contentDiv = element.querySelector('[data-message-id]') || element;
        
        // Get text content, preserving code blocks
        const content = this.extractContent(contentDiv);
        
        if (content.trim()) {
          messages.push({
            role: role === 'user' ? 'USER' : 'ASSISTANT',
            content: content.trim(),
            timestamp: null // ChatGPT doesn't expose timestamps easily
          });
        }
      });

      return messages;
    }

    scrapeFallback() {
      const messages = [];
      
      // Try to find conversation container
      const conversationEl = document.querySelector('main') || document.body;
      const allDivs = conversationEl.querySelectorAll('div[class*="group"]');
      
      let currentRole = null;
      
      allDivs.forEach((div) => {
        // Heuristic: User messages typically have different styling
        const text = div.innerText?.trim();
        if (!text || text.length < 5) return;
        
        // Try to detect role from content or structure
        const isUserMessage = div.querySelector('img[alt*="user" i]') || 
                             div.classList.toString().includes('user');
        
        if (text && text !== currentRole) {
          messages.push({
            role: isUserMessage ? 'USER' : 'ASSISTANT',
            content: text,
            timestamp: null
          });
        }
      });

      return messages;
    }

    extractContent(element) {
      let content = '';
      
      // Handle code blocks specially
      const codeBlocks = element.querySelectorAll('pre code, pre');
      const codeTexts = Array.from(codeBlocks).map(block => block.textContent);
      
      // Get main text content
      let textContent = element.textContent || element.innerText;
      
      // Re-inject code blocks with proper formatting
      codeBlocks.forEach((block, index) => {
        const language = block.className.replace('language-', '') || '';
        const placeholder = `__CODE_BLOCK_${index}__`;
        textContent = textContent.replace(block.textContent, placeholder);
      });
      
      // Replace placeholders with markdown code blocks
      codeTexts.forEach((code, index) => {
        const language = codeBlocks[index].className.replace(/.*language-(\w+).*/, '$1') || '';
        textContent = textContent.replace(
          `__CODE_BLOCK_${index}__`,
          `\n\`\`\`${language}\n${code}\n\`\`\`\n`
        );
      });
      
      return textContent;
    }
  }

  // Initialize scraper
  new ChatGPTScraper();
})();
