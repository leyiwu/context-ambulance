// Popup UI Controller
class PopupController {
  constructor() {
    this.platform = null;
    this.messages = [];
    this.rescueResult = null;
    
    this.init();
  }

  async init() {
    // Get DOM elements
    this.elements = {
      rescueBtn: document.getElementById('rescueBtn'),
      platformName: document.getElementById('platformName'),
      platformIcon: document.getElementById('platformIcon'),
      messageCount: document.getElementById('messageCount'),
      analyzerSelect: document.getElementById('analyzerSelect'),
      sanitizationSelect: document.getElementById('sanitizationSelect'),
      status: document.getElementById('status'),
      statusIcon: document.getElementById('statusIcon'),
      statusMessage: document.getElementById('statusMessage'),
      mainContent: document.getElementById('mainContent'),
      previewView: document.getElementById('previewView'),
      resultsView: document.getElementById('resultsView'),
      messageList: document.getElementById('messageList'),
      previewRemoveCount: document.getElementById('previewRemoveCount'),
      previewReduction: document.getElementById('previewReduction'),
      selectAllBtn: document.getElementById('selectAllBtn'),
      deselectAllBtn: document.getElementById('deselectAllBtn'),
      keepRulesBtn: document.getElementById('keepRulesBtn'),
      confirmRescueBtn: document.getElementById('confirmRescueBtn'),
      generateRevivalBtn: document.getElementById('generateRevivalBtn'),
      cancelPreviewBtn: document.getElementById('cancelPreviewBtn'),
      copyBtn: document.getElementById('copyBtn'),
      downloadBtn: document.getElementById('downloadBtn'),
      backBtn: document.getElementById('backBtn'),
      originalCount: document.getElementById('originalCount'),
      removedCount: document.getElementById('removedCount'),
      reductionPercent: document.getElementById('reductionPercent'),
      loopsDetected: document.getElementById('loopsDetected'),
      settingsToggle: document.getElementById('settingsToggle'),
      settingsContent: document.getElementById('settingsContent'),
      geminiApiKey: document.getElementById('geminiApiKey'),
      claudeApiKey: document.getElementById('claudeApiKey'),
      saveKeysBtn: document.getElementById('saveKeysBtn'),
      keysSavedMsg: document.getElementById('keysSavedMsg'),
      logoBtn: document.getElementById('logoBtn'),
      revivalResultsView: document.getElementById('revivalResultsView'),
      revivalPromptText: document.getElementById('revivalPromptText'),
      copyRevivalBtn: document.getElementById('copyRevivalBtn'),
      downloadRevivalBtn: document.getElementById('downloadRevivalBtn'),
      backFromRevivalBtn: document.getElementById('backFromRevivalBtn'),
    };

    // Set up event listeners
    this.elements.rescueBtn.addEventListener('click', () => this.handleRescue());
    this.elements.selectAllBtn.addEventListener('click', () => this.selectAll());
    this.elements.deselectAllBtn.addEventListener('click', () => this.deselectAll());
    this.elements.keepRulesBtn.addEventListener('click', () => this.useAISuggestions());
    this.elements.confirmRescueBtn.addEventListener('click', () => this.confirmAndGenerateRescue());
    this.elements.generateRevivalBtn.addEventListener('click', () => this.generateRevival());
    this.elements.cancelPreviewBtn.addEventListener('click', () => this.showMainView());
    this.elements.copyBtn.addEventListener('click', () => this.handleCopy());
    this.elements.downloadBtn.addEventListener('click', () => this.handleDownload());
    this.elements.backBtn.addEventListener('click', () => {
      if (this.analysisResult) {
        this.showPreview(this.analysisResult);
      } else {
        this.showMainView();
      }
    });
    this.elements.logoBtn.addEventListener('click', () => this.showMainView());
    this.elements.settingsToggle.addEventListener('click', () => this.toggleSettings());
    this.elements.saveKeysBtn.addEventListener('click', () => this.saveApiKeys());
    this.elements.copyRevivalBtn.addEventListener('click', () => this.copyRevivalPrompt());
    this.elements.downloadRevivalBtn.addEventListener('click', () => this.downloadRevivalPrompt());
    this.elements.backFromRevivalBtn.addEventListener('click', () => {
      if (this.analysisResult) {
        this.showPreview(this.analysisResult);
      } else {
        this.showMainView();
      }
    });

    // Load saved preferences and API keys
    await this.loadPreferences();
    await this.loadApiKeys();

    // Detect platform and scrape messages
    await this.detectPlatformAndScrape();
  }

  async loadPreferences() {
    const result = await chrome.storage.local.get(['analyzer', 'sanitization']);
    if (result.analyzer) {
      this.elements.analyzerSelect.value = result.analyzer;
    }
    if (result.sanitization) {
      this.elements.sanitizationSelect.value = result.sanitization;
    }
  }

  async savePreferences() {
    await chrome.storage.local.set({
      analyzer: this.elements.analyzerSelect.value,
      sanitization: this.elements.sanitizationSelect.value
    });
  }

  toggleSettings() {
    const isHidden = this.elements.settingsContent.classList.contains('hidden');
    this.elements.settingsContent.classList.toggle('hidden');
    this.elements.settingsToggle.classList.toggle('open');
  }

  async loadApiKeys() {
    const result = await chrome.storage.local.get(['geminiApiKey', 'claudeApiKey']);
    const geminiKey = result.geminiApiKey || '';
    const claudeKey = result.claudeApiKey || '';
    
    if (geminiKey) {
      this.elements.geminiApiKey.value = geminiKey;
    }
    if (claudeKey) {
      this.elements.claudeApiKey.value = claudeKey;
    }
    
    // Update analyzer dropdown on load
    this.updateAnalyzerOptions(geminiKey, claudeKey);
  }

  async saveApiKeys() {
    const geminiKey = this.elements.geminiApiKey.value.trim();
    const claudeKey = this.elements.claudeApiKey.value.trim();

    await chrome.storage.local.set({
      geminiApiKey: geminiKey,
      claudeApiKey: claudeKey
    });

    // Show success message
    this.elements.keysSavedMsg.classList.remove('hidden');
    setTimeout(() => {
      this.elements.keysSavedMsg.classList.add('hidden');
    }, 3000);

    // Update analyzer dropdown based on available keys
    this.updateAnalyzerOptions(geminiKey, claudeKey);
  }

  updateAnalyzerOptions(geminiKey, claudeKey) {
    const analyzerSelect = this.elements.analyzerSelect;
    const currentValue = analyzerSelect.value;

    // Reset options
    analyzerSelect.innerHTML = `
      <option value="none">Rule-based (Fast, Free)</option>
      ${geminiKey ? '<option value="gemini">Gemini Flash (With Your API Key)</option>' : '<option value="gemini" disabled>Gemini Flash (API Key Required)</option>'}
      ${claudeKey ? '<option value="claude">Claude Haiku (With Your API Key)</option>' : '<option value="claude" disabled>Claude Haiku (API Key Required)</option>'}
    `;

    // Restore previous selection if still valid
    if ((currentValue === 'gemini' && geminiKey) || (currentValue === 'claude' && claudeKey) || currentValue === 'none') {
      analyzerSelect.value = currentValue;
    }
  }

  async detectPlatformAndScrape() {
    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        this.showError('No active tab found');
        return;
      }

      // Detect platform from URL
      const url = tab.url;
      if (url.includes('chatgpt.com')) {
        this.platform = 'chatgpt';
        this.elements.platformIcon.textContent = '🤖';
        this.elements.platformName.textContent = 'ChatGPT';
      } else if (url.includes('claude.ai')) {
        this.platform = 'claude';
        this.elements.platformIcon.textContent = '🧠';
        this.elements.platformName.textContent = 'Claude';
      } else if (url.includes('gemini.google.com')) {
        this.platform = 'gemini';
        this.elements.platformIcon.textContent = '✨';
        this.elements.platformName.textContent = 'Gemini';
      } else {
        this.showError('Unsupported platform. Open ChatGPT, Claude, or Gemini.');
        return;
      }

      // Request scraping from content script
      this.showStatus('🔍', 'Scanning conversation...', 'info');
      
      chrome.tabs.sendMessage(tab.id, { action: 'scrapeConversation' }, (response) => {
        if (chrome.runtime.lastError) {
          this.showError('Failed to scrape. Refresh the page and try again.');
          return;
        }

        if (response && response.success) {
          this.messages = response.messages;
          const count = this.messages.length;
          this.elements.messageCount.textContent = count;
          this.elements.rescueBtn.disabled = count === 0;
          
          // Show detailed status (keep it visible, don't auto-hide)
          if (count === 0) {
            this.showError('No messages found. Try scrolling through the conversation first.');
          } else {
            this.showStatus('✅', `Found ${count} message${count === 1 ? '' : 's'}`, 'success');
            // Don't auto-hide - let it stay visible
          }
        } else {
          this.showError(response?.error || 'Failed to scrape conversation');
        }
      });

    } catch (error) {
      this.showError(`Error: ${error.message}`);
    }
  }

  async handleRescue() {
    if (this.messages.length === 0) return;

    await this.savePreferences();

    this.elements.rescueBtn.disabled = true;
    const msgCount = this.messages.length;
    this.showStatus('🔍', `Analyzing ${msgCount} message${msgCount === 1 ? '' : 's'}...`, 'info');

    try {
      // Send messages to background script for analysis only (not generating yet)
      chrome.runtime.sendMessage({
        action: 'analyzeConversation',
        data: {
          messages: this.messages,
          analyzer: this.elements.analyzerSelect.value,
          sanitization: this.elements.sanitizationSelect.value,
          platform: this.platform
        }
      }, (response) => {
        if (response && response.success) {
          this.analysisResult = response.result;
          this.showPreview(response.result);
        } else {
          this.showError(response?.error || 'Analysis failed');
          this.elements.rescueBtn.disabled = false;
        }
      });

    } catch (error) {
      this.showError(`Error: ${error.message}`);
      this.elements.rescueBtn.disabled = false;
    }
  }

  showPreview(result) {
    // Show preview view
    this.elements.mainContent.classList.add('hidden');
    this.elements.resultsView.classList.add('hidden');
    this.elements.revivalResultsView.classList.add('hidden');
    this.elements.previewView.classList.remove('hidden');
    this.hideStatus();

    // Store analysis result and removal indices
    this.removalIndices = this.getRemovalIndices(result.analysis);
    
    // Render all messages with checkboxes
    this.renderMessageList();

    // Auto-scroll to bottom where recent messages/hallucinations typically occur
    setTimeout(() => {
      this.elements.messageList.scrollTop = this.elements.messageList.scrollHeight;
    }, 100);

    // Re-enable buttons (in case they were disabled from previous action)
    this.elements.confirmRescueBtn.disabled = false;
    this.elements.generateRevivalBtn.disabled = false;
    this.elements.rescueBtn.disabled = false;
  }

  renderMessageList() {
    this.elements.messageList.innerHTML = '';
    
    console.log('Rendering messages:', this.messages.length, 'messages');
    console.log('Sample message:', this.messages[0]);
    
    if (this.messages.length === 0) {
      this.elements.messageList.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #6b7280;">
          <p>No messages found.</p>
        </div>
      `;
      return;
    }

    this.messages.forEach((msg, index) => {
      console.log(`Message ${index}:`, msg.role, msg.content.substring(0, 50));
      
      const suggestedRemove = this.removalIndices.has(index);
      const reason = suggestedRemove ? this.getRemovalReason(index, this.analysisResult.analysis) : null;
      
      const messageCard = document.createElement('div');
      messageCard.className = `message-card ${suggestedRemove ? 'suggested-remove' : ''}`;
      messageCard.dataset.index = index;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'message-checkbox';
      checkbox.id = `msg-${index}`;
      checkbox.dataset.index = index;
      checkbox.checked = !suggestedRemove; // Checked = KEEP, Unchecked = REMOVE
      checkbox.addEventListener('change', () => this.updateRemovalCount());
      
      const label = document.createElement('label');
      label.htmlFor = `msg-${index}`;
      label.className = 'message-content';
      
      const roleClass = msg.role.toLowerCase();
      const reasonHtml = reason ? `<span class="removal-reason">${reason}</span>` : '';
      const roleText = msg.role.toUpperCase() === 'USER' ? 'User' : 'AI';
      
      label.innerHTML = `
        <div class="message-header">
          <div>
            <span class="message-role ${roleClass}">${roleText}</span>
          </div>
          ${reasonHtml}
        </div>
        <div class="message-text">
          ${this.escapeHtml(msg.content.substring(0, 200))}${msg.content.length > 200 ? '...' : ''}
        </div>
      `;
      
      messageCard.appendChild(checkbox);
      messageCard.appendChild(label);
      this.elements.messageList.appendChild(messageCard);
    });

    this.updateRemovalCount();
  }

  updateRemovalCount() {
    const checkboxes = this.elements.messageList.querySelectorAll('.message-checkbox');
    const uncheckedCount = Array.from(checkboxes).filter(cb => !cb.checked).length;
    const totalCount = this.messages.length;
    const reduction = totalCount > 0 ? Math.round((uncheckedCount / totalCount) * 100) : 0;
    
    this.elements.previewRemoveCount.innerHTML = `
      <strong>${uncheckedCount}</strong> message${uncheckedCount === 1 ? '' : 's'} to remove
    `;
    this.elements.previewReduction.textContent = `${reduction}%`;

    // Update card styling based on checkbox state
    checkboxes.forEach(checkbox => {
      const card = checkbox.closest('.message-card');
      if (!checkbox.checked) { // Unchecked = remove
        card.classList.add('suggested-remove');
        card.classList.remove('kept');
      } else { // Checked = keep
        card.classList.remove('suggested-remove');
        card.classList.add('kept');
      }
    });
  }

  selectAll() {
    // Check all = keep all
    const checkboxes = this.elements.messageList.querySelectorAll('.message-checkbox');
    checkboxes.forEach(cb => cb.checked = true);
    this.updateRemovalCount();
  }

  deselectAll() {
    // Uncheck all = remove all
    const checkboxes = this.elements.messageList.querySelectorAll('.message-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    this.updateRemovalCount();
  }

  useAISuggestions() {
    const checkboxes = this.elements.messageList.querySelectorAll('.message-checkbox');
    checkboxes.forEach(cb => {
      const index = parseInt(cb.dataset.index);
      cb.checked = !this.removalIndices.has(index); // Check if AI wants to KEEP it
    });
    this.updateRemovalCount();
  }

  getCheckedMessages() {
    const checkboxes = this.elements.messageList.querySelectorAll('.message-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
  }

  getUncheckedMessages() {
    // Returns CHECKED messages (messages to KEEP)
    const checkboxes = this.elements.messageList.querySelectorAll('.message-checkbox:checked');
    const checkedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
    return this.messages.filter((_, index) => checkedIndices.includes(index));
  }

  getRemovalIndices(analysis) {
    const indices = new Set();
    
    // Add indices from detected loops
    analysis.loops_detected.forEach(loop => {
      if (loop.indices) {
        loop.indices.forEach(i => indices.add(i));
      }
    });
    
    return indices;
  }

  getRemovalReason(index, analysis) {
    for (const loop of analysis.loops_detected) {
      if (loop.indices && loop.indices.includes(index)) {
        return loop.type.replace(/_/g, ' ');
      }
    }
    return 'loop pattern';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async confirmAndGenerateRescue() {
    this.elements.confirmRescueBtn.disabled = true;
    this.showStatus('🚑', 'Generating rescue package...', 'info');

    try {
      const keptMessages = this.getUncheckedMessages();
      const removedCount = this.messages.length - keptMessages.length;
      const reductionPercent = Math.round((removedCount / this.messages.length) * 100);

      // Generate rescue package with user-selected messages
      chrome.runtime.sendMessage({
        action: 'generateRescue',
        data: {
          analysis: this.analysisResult.analysis,
          messages: keptMessages,
          stats: {
            original_count: this.messages.length,
            sanitized_count: keptMessages.length,
            total_removed: removedCount,
            reduction_percent: reductionPercent
          },
          platform: this.platform
        }
      }, (response) => {
        if (response && response.success) {
          this.rescueResult = response.result;
          this.showResults();
        } else {
          this.showError(response?.error || 'Generation failed');
          this.elements.confirmRescueBtn.disabled = false;
        }
      });

    } catch (error) {
      this.showError(`Error: ${error.message}`);
      this.elements.confirmRescueBtn.disabled = false;
    }
  }

  async generateRevival() {
    this.elements.generateRevivalBtn.disabled = true;
    this.showStatus('🔄', 'Generating revival prompt...', 'info');

    try {
      const keptMessages = this.getUncheckedMessages();
      const removedCount = this.messages.length - keptMessages.length;

      // Generate revival prompt
      const revivalPrompt = this.createRevivalPrompt(keptMessages, removedCount);

      // Copy to clipboard
      await navigator.clipboard.writeText(revivalPrompt);
      
      // Show revival results view
      this.showRevivalResults(revivalPrompt);

    } catch (error) {
      this.showError(`Error: ${error.message}`);
      this.elements.generateRevivalBtn.disabled = false;
    }
  }

  createRevivalPrompt(keptMessages, removedCount) {
    // Simple context reset prompt - include FULL message content (no truncation)
    const conversationSummary = keptMessages
      .map((msg, idx) => {
        const role = msg.role.toUpperCase() === 'USER' ? 'Me' : 'You';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n---\n\n');

    return `STOP - You've lost context and your last response was off track.

I removed ${removedCount} irrelevant message${removedCount === 1 ? '' : 's'} where you went off track.

Please review the conversation below - that's the ONLY valid context. Your next response should directly address my last message based on this history.

Don't apologize or acknowledge this message. Just continue from where the valid conversation left off.

---

## Valid Conversation History:

${conversationSummary}`;
  }

  extractLastCode(messages) {
    // Find last message with code block
    for (let i = messages.length - 1; i >= 0; i--) {
      const match = messages[i].content.match(/```[\s\S]*?```/);
      if (match) {
        return match[0].replace(/```\w*\n?/, '').replace(/```$/, '').trim();
      }
    }
    return null;
  }

  showResults() {
    this.elements.previewView.classList.add('hidden');
    this.elements.revivalResultsView.classList.add('hidden');
    this.elements.mainContent.classList.add('hidden');
    this.elements.resultsView.classList.remove('hidden');
    this.hideStatus();

    const stats = this.rescueResult.stats;
    this.elements.originalCount.textContent = stats.original_count;
    this.elements.removedCount.textContent = stats.total_removed;
    this.elements.reductionPercent.textContent = `${stats.reduction_percent}%`;

    // Show next steps
    const nextStepsDiv = document.getElementById('nextSteps');
    if (nextStepsDiv) {
      nextStepsDiv.style.display = 'block';
    }
  }

  showMainView() {
    this.elements.resultsView.classList.add('hidden');
    this.elements.revivalResultsView.classList.add('hidden');
    this.elements.previewView.classList.add('hidden');
    this.elements.mainContent.classList.remove('hidden');
    this.elements.rescueBtn.disabled = false;
    this.hideStatus();
  }

  showRevivalResults(revivalPrompt) {
    this.currentRevivalPrompt = revivalPrompt;
    
    // Hide other views and show revival results
    this.elements.previewView.classList.add('hidden');
    this.elements.resultsView.classList.add('hidden');
    this.elements.mainContent.classList.add('hidden');
    this.elements.revivalResultsView.classList.remove('hidden');
    this.hideStatus();
    
    // Set the prompt text
    this.elements.revivalPromptText.value = revivalPrompt;
    
    // Re-enable button
    this.elements.generateRevivalBtn.disabled = false;
  }

  async copyRevivalPrompt() {
    try {
      await navigator.clipboard.writeText(this.currentRevivalPrompt);
      this.showStatus('✅', 'Copied to clipboard!', 'success');
      setTimeout(() => this.hideStatus(), 2000);
    } catch (error) {
      this.showError('Failed to copy to clipboard');
    }
  }

  downloadRevivalPrompt() {
    const blob = new Blob([this.currentRevivalPrompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `revival_prompt_${this.platform}_${timestamp}.md`;

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    }, () => {
      URL.revokeObjectURL(url);
      this.showStatus('✅', 'Download started!', 'success');
      setTimeout(() => this.hideStatus(), 2000);
    });
  }

  async handleCopy() {
    try {
      await navigator.clipboard.writeText(this.rescueResult.markdown);
      this.showStatus('✅', 'Copied to clipboard!', 'success');
      setTimeout(() => this.hideStatus(), 2000);
    } catch (error) {
      this.showError('Failed to copy to clipboard');
    }
  }

  handleDownload() {
    const blob = new Blob([this.rescueResult.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `rescue_${this.platform}_${timestamp}.md`;

    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    }, () => {
      URL.revokeObjectURL(url);
      this.showStatus('✅', 'Download started!', 'success');
      setTimeout(() => this.hideStatus(), 2000);
    });
  }

  showStatus(icon, message, type = 'info') {
    this.elements.status.classList.remove('hidden', 'success', 'error');
    if (type === 'success') this.elements.status.classList.add('success');
    if (type === 'error') this.elements.status.classList.add('error');
    
    this.elements.statusIcon.textContent = icon;
    this.elements.statusMessage.textContent = message;
  }

  hideStatus() {
    this.elements.status.classList.add('hidden');
  }

  showError(message) {
    this.showStatus('❌', message, 'error');
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
