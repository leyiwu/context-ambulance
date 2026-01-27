# Privacy Policy for Context Ambulance

**Last Updated:** January 27, 2026

## Overview

Context Ambulance is a browser extension designed to rescue users from unproductive AI conversation loops. This privacy policy explains how the extension handles your data.

## Our Commitment

**Context Ambulance does not collect, store, transmit, or share any of your personal data or conversation content with external servers.**

## Data Processing

### What the Extension Accesses

1. **Conversation Content** - When you click the rescue button, the extension reads the visible conversation from the current tab (ChatGPT, Claude, or Gemini) to generate a rescue package.

2. **User Preferences** - Settings like sanitization level and analyzer choice are stored locally in your browser using Chrome's storage API.

### How Data is Processed

- **100% Local Processing** - All conversation scraping, analysis, and sanitization happens entirely within your browser
- **No External Transmission** - Your conversations never leave your device
- **No Server Storage** - We do not operate any servers that store user data
- **No Third-Party Services** - The extension does not use analytics, tracking, or advertising services

## Permissions Explained

The extension requests the following permissions. Here's why each is necessary:

### activeTab
- **Purpose:** Read conversation content from the currently active ChatGPT/Claude/Gemini tab when you click the rescue button
- **Data Access:** Only accesses the tab you're currently viewing, and only when you explicitly click rescue
- **Not Used For:** Background monitoring, tracking, or accessing other tabs

### storage
- **Purpose:** Save your preferences (sanitization level, analyzer choice) locally in your browser
- **Data Stored:** Only user settings - no conversation content is ever stored
- **Location:** Data stays in your browser's local storage, never transmitted

### downloads
- **Purpose:** Save the generated rescue package markdown file to your computer
- **Data Access:** Only triggers the download of the locally generated markdown file
- **Not Used For:** Uploading files or transmitting data

### Host Permissions (chatgpt.com, claude.ai, gemini.google.com)
- **Purpose:** Inject content scripts that can read and extract conversation DOM elements
- **Data Access:** Only reads visible conversation content when you trigger a rescue
- **Not Used For:** Monitoring your activity, tracking visited pages, or accessing other sites

## What We Don't Do

❌ **No Data Collection** - We don't collect analytics, usage statistics, or telemetry  
❌ **No Tracking** - We don't track your browsing activity or conversation topics  
❌ **No Cookies** - We don't use cookies or similar tracking technologies  
❌ **No Third-Party Sharing** - We have no data to share because we don't collect any  
❌ **No User Accounts** - No registration, login, or user identification  
❌ **No Advertisements** - We don't display ads or use advertising networks  
❌ **No Remote Code** - All code runs locally; no external scripts are loaded  

## Optional Python CLI Tool

Context Ambulance also offers an optional Python CLI tool for offline analysis. If you choose to use the CLI tool with LLM APIs (Gemini, Claude, OpenAI):

- **You control the API keys** - You provide your own API credentials
- **Direct communication** - Your data goes directly to the LLM provider you choose, not through our servers
- **API provider policies apply** - Review the privacy policies of Google (Gemini), Anthropic (Claude), or OpenAI as applicable
- **Completely optional** - The browser extension works without the CLI tool and uses local rule-based analysis by default

## Open Source Transparency

Context Ambulance is open source (MIT License). You can:

- **Audit the code** - Review exactly what the extension does at [GitHub repository URL]
- **Verify our claims** - See for yourself that no data transmission occurs
- **Contribute** - Help improve privacy and security through community review

## Data Security

Since we don't collect or transmit data, there's no risk of:
- Data breaches affecting your conversations
- Unauthorized access to your information
- Server compromises exposing user data

All processing happens in your browser's sandboxed environment, protected by Chrome's security model.

## Changes to Privacy Policy

If we ever change how data is handled (though we have no plans to), we will:
1. Update this policy with a new "Last Updated" date
2. Notify users through the extension update notes
3. Require consent for any material changes that affect privacy

## Children's Privacy

Context Ambulance does not knowingly collect data from anyone, including children under 13. Since we collect no personal information, COPPA compliance is inherent to our design.

## Your Rights

Since we don't collect your data, there's nothing for us to:
- Provide access to
- Correct or update
- Delete or anonymize
- Export or transfer

Your conversations remain entirely under your control on your device.

## Contact

If you have questions about this privacy policy or the extension's data handling:

- **GitHub Issues:** [repository URL]/issues
- **Email:** [your contact email]

For bug reports or feature requests, please use GitHub Issues.

## Third-Party Websites

Context Ambulance operates on third-party websites (ChatGPT, Claude, Gemini). This privacy policy only covers the Context Ambulance extension itself, not those platforms. Please review:

- OpenAI Privacy Policy (for ChatGPT)
- Anthropic Privacy Policy (for Claude)
- Google Privacy Policy (for Gemini)

## Legal Compliance

Context Ambulance complies with:
- **GDPR** (EU) - No personal data processing occurs
- **CCPA** (California) - No personal information is collected or sold
- **Chrome Web Store Policies** - Minimal permissions, transparent functionality

## Summary

**Privacy in Plain English:**

When you click the rescue button, Context Ambulance reads your conversation from the current tab, cleans it up using local algorithms, and saves a markdown file to your computer. That's it. No data leaves your device, no tracking occurs, and we have no way to see your conversations.

---

**Your privacy is protected by design, not just by policy.**

If you have concerns or find any behavior inconsistent with this policy, please report it immediately via GitHub Issues.
