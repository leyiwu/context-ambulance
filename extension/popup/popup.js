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
      resultsView: document.getElementById('resultsView'),
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
    };

    // Set up event listeners
    this.elements.rescueBtn.addEventListener('click', () => this.handleRescue());
    this.elements.copyBtn.addEventListener('click', () => this.handleCopy());
    this.elements.downloadBtn.addEventListener('click', () => this.handleDownload());
    this.elements.backBtn.addEventListener('click', () => this.showMainView());
    this.elements.logoBtn.addEventListener('click', () => this.showMainView());
    this.elements.settingsToggle.addEventListener('click', () => this.toggleSettings());
    this.elements.saveKeysBtn.addEventListener('click', () => this.saveApiKeys());

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
      this.showStatus('⏳', 'Scanning conversation...', 'info');
      
      chrome.tabs.sendMessage(tab.id, { action: 'scrapeConversation' }, (response) => {
        if (chrome.runtime.lastError) {
          this.showError('Failed to scrape. Refresh the page and try again.');
          return;
        }

        if (response && response.success) {
          this.messages = response.messages;
          this.elements.messageCount.textContent = this.messages.length;
          this.elements.rescueBtn.disabled = this.messages.length === 0;
          this.hideStatus();
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
    this.showStatus('🚑', 'Analyzing conversation...', 'info');

    try {
      // Send messages to background script for processing
      chrome.runtime.sendMessage({
        action: 'processConversation',
        data: {
          messages: this.messages,
          analyzer: this.elements.analyzerSelect.value,
          sanitization: this.elements.sanitizationSelect.value,
          platform: this.platform
        }
      }, (response) => {
        if (response && response.success) {
          this.rescueResult = response.result;
          this.showResults();
        } else {
          this.showError(response?.error || 'Processing failed');
          this.elements.rescueBtn.disabled = false;
        }
      });

    } catch (error) {
      this.showError(`Error: ${error.message}`);
      this.elements.rescueBtn.disabled = false;
    }
  }

  showResults() {
    this.elements.mainContent.classList.add('hidden');
    this.elements.resultsView.classList.remove('hidden');
    this.hideStatus();

    const stats = this.rescueResult.stats;
    this.elements.originalCount.textContent = stats.original_count;
    this.elements.removedCount.textContent = stats.total_removed;
    this.elements.reductionPercent.textContent = `${stats.reduction_percent}%`;

    // Show detected loops
    if (this.rescueResult.analysis.loops_detected.length > 0) {
      const loopsHtml = this.rescueResult.analysis.loops_detected
        .map(loop => `<div class="loop-item">• ${loop.description}</div>`)
        .join('');
      this.elements.loopsDetected.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px;">⚠️ Patterns Removed:</div>
        ${loopsHtml}
      `;
    } else {
      this.elements.loopsDetected.innerHTML = '<div>No major loops detected</div>';
    }
  }

  showMainView() {
    this.elements.resultsView.classList.add('hidden');
    this.elements.mainContent.classList.remove('hidden');
    this.elements.rescueBtn.disabled = false;
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
