/*!
 * Maw AI Engine – Local + Web‑Enhanced Thinking
 * Version 1.0
 * No API keys required. Uses DuckDuckGo & Wikipedia public APIs.
 */
class MawAI {
  userName: string | null;
  conversationContext: any[];
  cache: Map<string, string>;
  knowledge: any;

  constructor() {
    this.userName = null;
    this.conversationContext = [];
    this.cache = new Map();
    // Local knowledge base (condensed from previous model)
    this.knowledge = {
      identity: {
        keywords: ['who are you', 'what are you', 'your name', 'about you', 'tell me about yourself', 'introduce yourself', 'what is maw', 'maw ai', 'who is maw'],
        responses: [
          "I'm **Maw AI** – a smart local + web‑enhanced assistant. I can do math, tell jokes, share facts, and when I'm stuck, I search the web using DuckDuckGo and Wikipedia to give you the best answer.",
          "Hey! I'm **Maw AI**, a hybrid AI. I keep a local brain for fast replies, but when you ask something complex, I tap into DuckDuckGo and Wikipedia – all without any API keys!"
        ]
      },
      capabilities: {
        keywords: ['what can you do', 'help me', 'capabilities', 'features', 'what do you do', 'how do you work', 'what can i ask', 'help'],
        responses: [
          "I'm a powerful local + web AI! 🎯\n\n**Local skills:** math, jokes, facts, date/time, name memory.\n**Web skills:** if I don't know an answer, I automatically search DuckDuckGo and Wikipedia to bring you accurate, up‑to‑date information.\n\nJust ask me anything!"
        ]
      },
      greeting: {
        keywords: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'yo', 'sup', 'hola', 'howdy'],
        responses: [
          "Hello! 👋 I'm Maw AI – part local, part web. Ask me anything, and I'll think on it.",
          "Hey there! 😊 Ready to help. I can answer from my internal knowledge or search the web for the latest info."
        ]
      },
      howAreYou: {
        keywords: ['how are you', 'how do you feel', 'how are you doing', 'are you ok', 'how is it going', "what's up", 'how are things'],
        responses: [
          "I'm running great! ⚡ Local knowledge is fast, and web search gives me extra power. How are YOU?",
          "Feeling smart today! I've got both local smarts and web access, so I'm ready for anything."
        ]
      },
      jokes: {
        keywords: ['joke', 'funny', 'make me laugh', 'tell me something funny', 'humor', 'another joke', 'pun'],
        responses: [
          "Why don't scientists trust atoms? Because they make up everything! ⚛️😂",
          "What do you call a fake noodle? An impasta! 🍝😄",
          "Why did the scarecrow win an award? He was outstanding in his field! 🌾🏆",
          "What do you call a bear with no teeth? A gummy bear! 🐻🍬",
          "Why don't eggs tell jokes? They'd crack each other up! 🥚😆",
          "What's a computer's favorite snack? Microchips! 💻🍟",
          "Why did the math book look so sad? It had too many problems. 📚😢",
          "What do you call a dinosaur that crashes his car? Tyrannosaurus Wrecks! 🦖🚗",
          "Why can't you give Elsa a balloon? She'll let it go! ❄️🎈",
          "What's the best thing about Switzerland? I don't know, but the flag is a big plus! 🇨🇭➕"
        ]
      },
      facts: {
        keywords: ['fact', 'interesting', 'did you know', 'tell me something interesting', 'trivia', 'cool fact', 'fun fact', 'another fact'],
        responses: [
          "💡 Did you know? Honey never spoils. Archaeologists have found 3,000‑year‑old honey in Egyptian tombs that's still perfectly edible!",
          "💡 Fun fact: Octopuses have three hearts, nine brains, and blue blood! 🐙",
          "💡 Here's a cool one: A day on Venus is longer than a year on Venus. It takes Venus 243 Earth days to rotate once, but only 225 days to orbit the Sun!",
          "💡 Did you know? The human brain can process an image in as little as 13 milliseconds! That's faster than you can blink. 🧠",
          "💡 Fun fact: Bananas are berries, but strawberries aren't! 🍌",
          "💡 Interesting: The first computer bug was a real moth found in a Harvard computer in 1947. That's where 'debugging' comes from! 🦋💻",
          "💡 Did you know? There are more possible chess games than atoms in the observable universe! ♟️",
          "💡 Cool fact: Sloths can hold their breath longer than dolphins can — up to 40 minutes underwater! 🦥",
          "💡 Fun fact: The shortest war in history lasted only 38‑45 minutes (Britain vs. Zanzibar, 1896).",
          "💡 Did you know? Your nose can remember 50,000 different scents! 👃"
        ]
      },
      datetime: {
        keywords: ['what time', 'what day', 'what date', "today's date", 'current time', 'what is today', 'what is the date', 'time now', 'day is it'],
        getResponse: function() {
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return `📅 **Today is ${dateStr}**\n🕐 **Current time:** ${timeStr}\n\n(All from your device's clock – I told you I'm local!)`;
        }
      },
      math: {
        keywords: ['calculate', 'math', 'solve', 'what is', 'compute', 'multiply', 'divide', 'add', 'subtract', 'percent', 'square', 'cube', 'plus', 'minus', 'times', 'divided'],
        getResponse: function(input) {
          const mathMatch = input.match(/([\d\s\+\-\*\/\(\)\.\^\%]+)/g);
          if (mathMatch) {
            try {
              let expr = mathMatch[0].trim()
                .replace(/plus/gi, '+')
                .replace(/minus/gi, '-')
                .replace(/times/gi, '*')
                .replace(/multiplied by/gi, '*')
                .replace(/divided by/gi, '/')
                .replace(/over/gi, '/')
                .replace(/\^/g, '**')
                .replace(/%/g, '/100')
                .replace(/[\+\-\*\/]+$/, '');
              if (expr && /^[\d\s\+\-\*\/\(\)\.]+$/.test(expr)) {
                const result = Function('return (' + expr + ')')();
                if (typeof result === 'number' && isFinite(result)) {
                  return `🧮 **Result:** ${expr.trim()} = **${Math.round(result * 1000000) / 1000000}**\n\nThat's ${result.toLocaleString()}!`;
                }
              }
            } catch (e) {}
          }
          return null;
        }
      },
      nameRecognition: {
        keywords: ['my name is', 'i am called', 'call me', "i'm called", 'my name', 'name is'],
        patterns: [
          /my name is\s+([A-Za-z]+)/i,
          /i am called\s+([A-Za-z]+)/i,
          /call me\s+([A-Za-z]+)/i,
          /i'm called\s+([A-Za-z]+)/i,
          /i'm\s+([A-Za-z]+)/i,
        ],
        getResponse: function(input) {
          for (const pattern of this.patterns) {
            const match = input.match(pattern);
            if (match && match[1]) {
              const name = match[1].trim();
              this.userName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
              return `Nice to meet you, **${this.userName}**! 😊 I'll remember your name. Now we're properly introduced!\n\nWhat can I help you with, ${this.userName}?`;
            }
          }
          return null;
        }
      },
      thanks: {
        keywords: ['thank you', 'thanks', 'thank', 'appreciate', 'grateful', 'thx', 'ty'],
        responses: [
          "You're welcome! 😊 That's what I'm here for. Anything else you'd like to know?",
          "Anytime! I'm always happy to help. What's next?",
          "No problem at all! I'm just doing my local AI thing. Anything else?"
        ]
      },
      goodbye: {
        keywords: ['goodbye', 'bye', 'see you', 'farewell', 'good night', 'gotta go', 'cya', 'later', 'going to go'],
        responses: [
          "Goodbye! 👋 It was great chatting with you. Remember, I'm always here on your device whenever you need me!",
          "See you later! I'll be right here waiting whenever you want to chat again. Take care!",
          "Farewell for now! I don't actually go anywhere — I'm local! So just open this file again anytime. 😄"
        ]
      },
      fallback: {
        responses: [
          "Let me think about that... I'll search the web for an answer.",
          "Hmm, that's not in my local brain. Let me check DuckDuckGo and Wikipedia..."
        ]
      }
    };
  }

  // ------------------- Helper methods -------------------
  containsAny(input, keywords) {
    return keywords.some(kw => input.includes(kw));
  }

  getRandomResponse(responses: any) {
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // ------------------- Web search methods -------------------
  async searchDuckDuckGo(query) {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      // Prefer AbstractText, then Answer, then Definition
      if (data.AbstractText && data.AbstractText.trim() !== '') {
        return { text: data.AbstractText, source: data.AbstractURL || 'DuckDuckGo' };
      } else if (data.Answer && data.Answer.trim() !== '') {
        return { text: data.Answer, source: data.AbstractURL || 'DuckDuckGo' };
      } else if (data.Definition && data.Definition.trim() !== '') {
        return { text: data.Definition, source: data.DefinitionURL || 'DuckDuckGo' };
      }
      return null;
    } catch (e) {
      console.warn('DuckDuckGo search failed:', e);
      return null;
    }
  }

  async searchWikipedia(query: any) {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.extract && data.extract.trim() !== '') {
        return { text: data.extract, source: data.content_urls?.desktop?.page || 'Wikipedia' };
      }
      return null;
    } catch (e) {
      console.warn('Wikipedia search failed:', e);
      return null;
    }
  }

  // ------------------- Main response generator -------------------
  async generateResponse(input: any) {
    const cleanInput = input.toLowerCase().trim();

    // 1. Name recognition (needs access to this.userName)
    if (this.knowledge.nameRecognition.keywords.some(kw => cleanInput.includes(kw))) {
      const nameResponse = this.knowledge.nameRecognition.getResponse.call(this, cleanInput);
      if (nameResponse) return nameResponse;
    }

    // 2. Local categories (static)
    for (const [key, cat] of Object.entries(this.knowledge as Record<string, any>)) {
      if (key === 'nameRecognition' || key === 'fallback' || key === 'datetime' || key === 'math') continue;
      if (cat.keywords && this.containsAny(cleanInput, cat.keywords)) {
        return this.getRandomResponse(cat.responses);
      }
    }

    // 3. Dynamic: datetime
    if (this.knowledge.datetime.keywords.some(kw => cleanInput.includes(kw))) {
      return this.knowledge.datetime.getResponse();
    }

    // 4. Dynamic: math
    if (this.knowledge.math.keywords.some(kw => cleanInput.includes(kw))) {
      const mathRes = this.knowledge.math.getResponse(cleanInput);
      if (mathRes) return mathRes;
    }

    // 5. Check cache first
    if (this.cache.has(cleanInput)) {
      return this.cache.get(cleanInput);
    }

    // 6. Web search fallback
    console.log('🔄 Searching web for:', input);
    let answer = null;

    // Try DuckDuckGo first (fast instant answers)
    const ddg = await this.searchDuckDuckGo(input);
    if (ddg && ddg.text) {
      answer = `${ddg.text}\n\n_📚 Source: [${ddg.source}](${ddg.source})_`;
    } else {
      // Fallback to Wikipedia
      const wiki = await this.searchWikipedia(input);
      if (wiki && wiki.text) {
        answer = `${wiki.text}\n\n_📚 Source: [Wikipedia](${wiki.source})_`;
      }
    }

    if (answer) {
      this.cache.set(cleanInput, answer);
      return answer;
    }

    // 7. Ultimate fallback
    return "I couldn't find a good answer for that, even after searching the web. Could you rephrase the question? 🤔";
  }
}

export default MawAI;
