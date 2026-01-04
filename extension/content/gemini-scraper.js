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
      
      console.log('Gemini Scraper: Starting scrape...');
      
      // Gemini has alternating user/AI structure
      // "Show thinking" appears between messages as a separator
      // Strategy: Find message content blocks and alternate USER/ASSISTANT
      
      const mainContent = document.querySelector('main') || document.body;
      
      // Look for message content areas - Gemini wraps them in specific containers
      // Try multiple selectors
      let messageBlocks = mainContent.querySelectorAll('[data-test-id*="conversation-turn"], message-content, .conversation-turn');
      
      if (messageBlocks.length === 0) {
        // Fallback: look for large text blocks that aren't UI elements
        messageBlocks = mainContent.querySelectorAll('div[class*="conversation"] > div, chat-window > div');
      }
      
      if (messageBlocks.length === 0) {
        console.log('Gemini Scraper: No message blocks found, using deep scan');
        return this.deepScan();
      }
      
      console.log('Gemini Scraper: Found', messageBlocks.length, 'message blocks');
      
      // Assume alternating pattern: first message is USER
      let expectedRole = 'USER';
      
      messageBlocks.forEach((block, index) => {
        const content = this.extractContent(block);
        
        // Skip "Show thinking" buttons and UI elements
        if (!content || 
            content.length < 10 || 
            content.toLowerCase().includes('show thinking') ||
            content.toLowerCase().includes('hide thinking')) {
          return;
        }
        
        const msg = {
          role: expectedRole,
          content: content.trim(),
          timestamp: null
        };
        
        console.log(`Message ${messages.length}: ${expectedRole}:`, content.substring(0, 50));
        messages.push(msg);
        
        // Alternate role for next message
        expectedRole = expectedRole === 'USER' ? 'ASSISTANT' : 'USER';
      });

      console.log('Gemini Scraper: Total messages scraped:', messages.length);
      console.log('  USER messages:', messages.filter(m => m.role === 'USER').length);
      console.log('  ASSISTANT messages:', messages.filter(m => m.role === 'ASSISTANT').length);
      
      return messages;
    }

    deepScan() {
      console.log('Gemini Deep Scan: Looking for text content...');
      const messages = [];
      const mainContent = document.querySelector('main') || document.body;
      
      // Find all text-heavy divs
      const allDivs = Array.from(mainContent.querySelectorAll('div'));
      const seenContent = new Set();
      
      // Filter to only divs with substantial unique content
      const contentDivs = allDivs.filter(div => {
        const text = div.innerText?.trim();
        if (!text || text.length < 15) return false;
        if (seenContent.has(text)) return false;
        if (text.toLowerCase().includes('show thinking')) return false;
        if (text.toLowerCase().includes('hide thinking')) return false;
        
        // Check if this div contains mostly text (not just nested UI)
        const childDivs = div.querySelectorAll('div').length;
        const hasSubstantialText = text.length > 30;
        
        if (hasSubstantialText) {
          seenContent.add(text);
          return true;
        }
        return false;
      });
      
      console.log('Deep scan found', contentDivs.length, 'content divs');
      
      // Alternate USER/ASSISTANT starting with USER
      let expectedRole = 'USER';
      
      contentDivs.forEach((div, index) => {
        const text = div.innerText.trim();
        
        messages.push({
          role: expectedRole,
          content: text,
          timestamp: null
        });
        
        console.log(`Deep scan message ${index}: ${expectedRole}:`, text.substring(0, 50));
        
        // Alternate
        expectedRole = expectedRole === 'USER' ? 'ASSISTANT' : 'USER';
      });
      
      console.log('Deep scan result - USER:', messages.filter(m => m.role === 'USER').length, 
                  'ASSISTANT:', messages.filter(m => m.role === 'ASSISTANT').length);
      
      return messages;
    }

    scrapeFallback() {
      console.log('Gemini Scraper Fallback: Using alternating pattern...');
      return this.deepScan();
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
