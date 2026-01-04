// Background Service Worker
// Handles message processing and communication with Python CLI

// Gemini API Analyzer
class GeminiAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent';
  }

  async analyze(messages) {
    const conversationText = messages.map(m => 
      `${m.role}: ${m.content.substring(0, 500)}`
    ).join('\n\n');

    const prompt = `Analyze this LLM conversation that got stuck in a loop. Identify:
1. The original goal
2. What blocked progress
3. Loop patterns (apology cascade, code churn, repetitive errors)

Conversation:
${conversationText}

Respond in JSON format:
{
  "goal": "brief description",
  "blocker": "what went wrong",
  "loops": [{"type": "apology_cascade", "description": "...", "occurrences": 5}],
  "key_insights": ["insight 1", "insight 2"]
}`;

    try {
      const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 }
        })
      });

      if (!response.ok) throw new Error('Gemini API request failed');

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      
      // Extract JSON from markdown code block if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      const parsed = JSON.parse(jsonStr);

      return {
        goal: parsed.goal || 'Goal unclear',
        blocker: parsed.blocker || 'Blocker unclear',
        loops_detected: parsed.loops || [],
        key_insights: parsed.key_insights || [],
        recommended_steps: [
          'Review the cleaned conversation below',
          'Try a fundamentally different approach',
          'Consider breaking the problem into smaller parts'
        ]
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback to simple analyzer
      return new SimpleAnalyzer().analyze(messages);
    }
  }
}

// Claude API Analyzer  
class ClaudeAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.endpoint = 'https://api.anthropic.com/v1/messages';
  }

  async analyze(messages) {
    const conversationText = messages.map(m => 
      `${m.role}: ${m.content.substring(0, 500)}`
    ).join('\n\n');

    const prompt = `Analyze this LLM conversation that got stuck. Identify the goal, blocker, and loop patterns. Respond in JSON with: goal, blocker, loops (array of {type, description, occurrences}), key_insights.

Conversation:
${conversationText}`;

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) throw new Error('Claude API request failed');

      const data = await response.json();
      const text = data.content[0].text;
      
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      const parsed = JSON.parse(jsonStr);

      return {
        goal: parsed.goal || 'Goal unclear',
        blocker: parsed.blocker || 'Blocker unclear',
        loops_detected: parsed.loops || [],
        key_insights: parsed.key_insights || [],
        recommended_steps: [
          'Review the cleaned conversation below',
          'Try a fundamentally different approach',
          'Consider breaking the problem into smaller parts'
        ]
      };
    } catch (error) {
      console.error('Claude API error:', error);
      return new SimpleAnalyzer().analyze(messages);
    }
  }
}

// Simple in-browser analyzer (fallback when CLI unavailable)
class SimpleAnalyzer {
  analyze(messages) {
    const analysis = {
      goal: this.extractGoal(messages),
      blocker: this.findBlocker(messages),
      loops_detected: this.detectLoops(messages),
      key_insights: [],
      recommended_steps: [
        'Review the cleaned conversation below',
        'Consider alternative approaches not yet attempted',
        'Check documentation for the specific error'
      ]
    };
    
    return analysis;
  }

  extractGoal(messages) {
    // First substantial user message
    const firstUser = messages.find(m => m.role === 'USER' && m.content.length > 30);
    if (firstUser) {
      const firstSentence = firstUser.content.split(/[.!?]/)[0];
      return firstSentence.substring(0, 200) + (firstSentence.length > 200 ? '...' : '');
    }
    return 'Goal not clearly identified';
  }

  findBlocker(messages) {
    // Look for repeated patterns
    const apologyCount = messages.filter(m => 
      m.role === 'ASSISTANT' && /apologi[sz]e|sorry/i.test(m.content)
    ).length;
    
    if (apologyCount >= 3) {
      return 'Conversation stuck in repetitive pattern without progress';
    }
    
    return 'Specific blocker unclear - review conversation for patterns';
  }

  detectLoops(messages) {
    const loops = [];
    
    // Detect apology cascade
    let apologyCount = 0;
    messages.forEach(m => {
      if (m.role === 'ASSISTANT' && /apologi[sz]e|sorry/i.test(m.content)) {
        apologyCount++;
      }
    });
    
    if (apologyCount >= 3) {
      loops.push({
        pattern_type: 'apology_cascade',
        occurrences: apologyCount,
        description: `Model apologized ${apologyCount} times without making progress`
      });
    }
    
    // Detect code churn (simple: count code blocks)
    const codeBlocks = messages.filter(m => m.content.includes('```')).length;
    if (codeBlocks >= 5) {
      loops.push({
        pattern_type: 'code_churn',
        occurrences: codeBlocks,
        description: `Code modified ${codeBlocks} times with minor variations`
      });
    }
    
    return loops;
  }
}

class SimpleSanitizer {
  sanitize(messages, analysis) {
    const loopIndices = new Set();
    
    // Remove apology messages (keep first one)
    let apologyFound = false;
    messages.forEach((m, i) => {
      if (m.role === 'ASSISTANT' && /apologi[sz]e|sorry/i.test(m.content)) {
        if (apologyFound) {
          loopIndices.add(i);
        }
        apologyFound = true;
      }
    });
    
    // Remove obvious filler
    messages.forEach((m, i) => {
      const content = m.content.toLowerCase();
      if (content === 'let me try again' || 
          content === 'i see' ||
          content.length < 20) {
        loopIndices.add(i);
      }
    });
    
    const sanitized = messages.filter((m, i) => !loopIndices.has(i));
    
    return {
      sanitized,
      stats: {
        original_count: messages.length,
        sanitized_count: sanitized.length,
        total_removed: loopIndices.size,
        reduction_percent: Math.round((loopIndices.size / messages.length) * 100)
      }
    };
  }
}

class RescuePackageGenerator {
  generate(analysis, messages, stats, platform) {
    const timestamp = new Date().toISOString().split('T')[0] + ' ' + 
                     new Date().toTimeString().split(' ')[0];
    
    return `# Context Rescue Package

*Generated by Context Ambulance on ${timestamp}*
*Source: ${platform.toUpperCase()}*

---

## 🎯 ORIGINAL GOAL

${analysis.goal}

---

## 🚨 THE BLOCKER

**Issue:** ${analysis.blocker}

${analysis.loops_detected.length > 0 ? `
**Detected Patterns:**
${analysis.loops_detected.map(loop => 
  `- **${this.formatLoopType(loop.pattern_type)}**: ${loop.description} (${loop.occurrences} occurrences)`
).join('\n')}
` : ''}

---

## 🧹 WHAT WAS REMOVED

- **${stats.total_removed}** messages removed (${stats.reduction_percent}% reduction)
- Original: ${stats.original_count} messages
- Cleaned: ${stats.sanitized_count} messages

---

## 📋 RECOMMENDED NEXT STEPS

${analysis.recommended_steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

---

## 🔄 INSTRUCTION FOR NEXT LLM

You are a **senior engineer** taking over a stalled project from a colleague.

The previous session became stuck in a loop—the AI repeated failed attempts without making progress. Your colleague has cleaned up the conversation and provided you with the essential context above.

**Your Task:**
1. Read the goal and blocker carefully
2. **Ignore the failed approaches** that were removed
3. Think from **first principles**
4. Propose a **fresh solution** that avoids the patterns that caused the loop

**Important:** Do NOT repeat the removed patterns listed above. If you find yourself going in circles, stop and try a fundamentally different approach.

---

## 📎 CLEANED CONVERSATION

${messages.map(m => `### ${m.role}

${m.content}

---
`).join('\n')}

---

## ℹ️ About This Rescue Package

This file was generated by [Context Ambulance](https://github.com/yourusername/context-ambulance) - the "Eject Button" for LLM doom loops.

**Usage:**
1. Copy this entire file
2. Start a fresh conversation with ANY LLM (Gemini, Claude, GPT-4, etc.)
3. Paste this content as your first message
4. Let the fresh LLM solve your problem without the poisoned context
`;
  }

  formatLoopType(type) {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processConversation') {
    processConversation(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open
  }
  
  if (request.action === 'analyzeConversation') {
    analyzeConversation(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'generateRescue') {
    generateRescue(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function analyzeConversation(data) {
  const { messages, analyzer, sanitization, platform } = data;
  
  // Get API keys from storage
  const storage = await chrome.storage.local.get(['geminiApiKey', 'claudeApiKey']);
  
  let analysis;
  
  // Select analyzer based on user choice and available keys
  if (analyzer === 'gemini' && storage.geminiApiKey) {
    const geminiAnalyzer = new GeminiAnalyzer(storage.geminiApiKey);
    analysis = await geminiAnalyzer.analyze(messages);
  } else if (analyzer === 'claude' && storage.claudeApiKey) {
    const claudeAnalyzer = new ClaudeAnalyzer(storage.claudeApiKey);
    analysis = await claudeAnalyzer.analyze(messages);
  } else {
    // Fallback to simple rule-based analyzer
    const simpleAnalyzer = new SimpleAnalyzer();
    analysis = simpleAnalyzer.analyze(messages);
  }
  
  const sanitizer = new SimpleSanitizer();
  const { sanitized, stats } = sanitizer.sanitize(messages, analysis);
  
  return {
    analysis,
    stats,
    sanitized_messages: sanitized
  };
}

async function generateRescue(data) {
  const { analysis, messages, stats, platform } = data;
  
  // Sanitize messages based on analysis
  const sanitizer = new SimpleSanitizer();
  const { sanitized } = sanitizer.sanitize(messages, analysis);
  
  const generator = new RescuePackageGenerator();
  const markdown = generator.generate(analysis, sanitized, stats, platform);
  
  return {
    analysis,
    stats,
    markdown,
    sanitized_messages: sanitized
  };
}

async function processConversation(data) {
  const { messages, analyzer, sanitization, platform } = data;
  
  // Get API keys from storage
  const storage = await chrome.storage.local.get(['geminiApiKey', 'claudeApiKey']);
  
  let analysis;
  
  // Select analyzer based on user choice and available keys
  if (analyzer === 'gemini' && storage.geminiApiKey) {
    const geminiAnalyzer = new GeminiAnalyzer(storage.geminiApiKey);
    analysis = await geminiAnalyzer.analyze(messages);
  } else if (analyzer === 'claude' && storage.claudeApiKey) {
    const claudeAnalyzer = new ClaudeAnalyzer(storage.claudeApiKey);
    analysis = await claudeAnalyzer.analyze(messages);
  } else {
    // Fallback to simple rule-based analyzer
    const simpleAnalyzer = new SimpleAnalyzer();
    analysis = simpleAnalyzer.analyze(messages);
  }
  
  const sanitizer = new SimpleSanitizer();
  const { sanitized, stats } = sanitizer.sanitize(messages, analysis);
  
  const generator = new RescuePackageGenerator();
  const markdown = generator.generate(analysis, sanitized, stats, platform);
  
  return {
    analysis,
    stats,
    markdown,
    sanitized_messages: sanitized
  };
}

// Extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Context Ambulance extension installed');
});
