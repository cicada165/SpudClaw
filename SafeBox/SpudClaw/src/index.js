import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
dotenv.config();

const WORKSPACE_DIR = '/home/spud/app/workspace';
const HISTORY_FILE = path.join(WORKSPACE_DIR, 'chat_history.json');
const LOG_FILE = path.join(WORKSPACE_DIR, 'session.log');
const PORT = 18789;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE,
});

const model = process.env.MODEL_NAME || process.env.MODEL || 'omni-1';

const app = express();
app.use(express.json());

let conversationHistory = [];

async function init() {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    conversationHistory = JSON.parse(data);
    console.log('Loaded ' + conversationHistory.length + ' messages from persistent history.');
  } catch (err) {
    console.log('No existing history found. Starting fresh.');
    conversationHistory = [];
  }
}

async function saveHistory() {
  try {
    await fs.writeFile(HISTORY_FILE, JSON.stringify(conversationHistory, null, 2));
  } catch (err) {
    console.error('Failed to save history:', err);
  }
}

async function logToWorkspace(data) {
  const timestamp = new Date().toISOString();
  const logContent = "[" + timestamp + "] " + data + "\n";
  try {
    await fs.appendFile(LOG_FILE, logContent);
  } catch (err) {
    console.error('Failed to write to workspace:', err);
  }
}

async function checkConnectivity() {
  const results = {
    gateway: 'Checking...',
    internet: 'Checking...',
    dns: 'Checking...'
  };

  try {
    await execAsync('ping -c 1 8.8.8.8');
    results.internet = 'OK';
  } catch (e) {
    results.internet = 'FAILED';
  }

  try {
    await execAsync('nslookup google.com');
    results.dns = 'OK';
  } catch (e) {
    results.dns = 'FAILED';
  }

  try {
    const res = await fetch(process.env.OPENAI_API_BASE + '/models', {
      headers: { 'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY }
    });
    results.gateway = res.ok ? 'OK' : 'FAILED (' + res.status + ')';
  } catch (e) {
    results.gateway = 'FAILED (' + e.message + ')';
  }

  return results;
}

app.get('/', async (req, res) => {
  const stats = await checkConnectivity();
  res.send(`
    <html>
      <head>
        <title>SpudClaw Tool</title>
        <style>
          body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
          .container { max-width: 800px; margin: 0 auto; background: #1e293b; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); }
          h1 { color: #38bdf8; margin-bottom: 0.5rem; }
          .status-bar { display: flex; gap: 1rem; margin: 1rem 0; padding: 1rem; background: #0f172a; border-radius: 8px; }
          .stat { font-size: 0.85rem; padding: 0.25rem 0.5rem; border-radius: 4px; border: 1px solid #334155; }
          .ok { color: #4ade80; font-weight: bold; }
          .fail { color: #f87171; font-weight: bold; }
          .chat-box { background: #0f172a; padding: 1.5rem; border-radius: 8px; margin-top: 1.5rem; min-height: 300px; max-height: 500px; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
          .msg { padding: 0.75rem 1rem; border-radius: 8px; max-width: 85%; line-height: 1.5; font-size: 0.95rem; }
          .user-msg { align-self: flex-end; background: #38bdf8; color: #0f172a; font-weight: 500; }
          .bot-msg { align-self: flex-start; background: #334155; border: 1px solid #475569; }
          .input-area { display: flex; gap: 0.5rem; margin-top: 1.5rem; }
          input { flex: 1; padding: 0.75rem; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: white; outline: none; }
          input:focus { border-color: #38bdf8; }
          button { padding: 0.75rem 1.5rem; border-radius: 8px; border: none; background: #38bdf8; color: #0f172a; font-weight: bold; cursor: pointer; transition: background 0.2s; }
          button:hover { background: #0ea5e9; }
          button:disabled { opacity: 0.5; cursor: not-allowed; }
          .msg-header { font-size: 0.7rem; color: #64748b; margin-bottom: 0.2rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>SpudClaw Tool</h1>
          <div class="status-bar">
            <div class="stat">Gateway: <span class="\${stats.gateway === 'OK' ? 'ok' : 'fail'}">\${stats.gateway}</span></div>
            <div class="stat">Internet: <span class="\${stats.internet === 'OK' ? 'ok' : 'fail'}">\${stats.internet}</span></div>
            <div class="stat">DNS: <span class="\${stats.dns === 'OK' ? 'ok' : 'fail'}">\${stats.dns}</span></div>
          </div>
          <div class="chat-box" id="chat"></div>
          <div class="input-area">
            <input type="text" id="prompt" placeholder="Enter query..." onkeypress="if(event.key==='Enter') ask()">
            <button id="send-btn" onclick="ask()">Send</button>
          </div>
          <p style="font-size: 0.75rem; color: #64748b; margin-top: 1rem;">Session: <code id="session-info">Persistent</code> | Workspace: <code>/home/spud/app/workspace</code></p>
        </div>
        <script>
          const chat = document.getElementById('chat');
          const promptInput = document.getElementById('prompt');
          const sendBtn = document.getElementById('send-btn');

          function addMessage(text, role, silent = false) {
            const div = document.createElement('div');
            div.className = 'msg ' + (role === 'user' ? 'user-msg' : 'bot-msg');
            div.innerText = text;
            chat.appendChild(div);
            if (!silent) chat.scrollTop = chat.scrollHeight;
          }

          async function loadHistory() {
            try {
              const res = await fetch('/history');
              const history = await res.json();
              history.forEach(m => {
                if (m.role !== 'system') addMessage(m.content, m.role, true);
              });
              chat.scrollTop = chat.scrollHeight;
            } catch (err) {}
          }

          async function ask() {
            const prompt = promptInput.value.trim();
            if (!prompt) return;

            promptInput.value = '';
            addMessage(prompt, 'user');
            
            promptInput.disabled = true;
            sendBtn.disabled = true;

            try {
              const res = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
              });
              const data = await res.json();
              if (data.error) {
                addMessage('Error: ' + data.error, 'bot');
              } else {
                addMessage(data.response, 'bot');
              }
            } catch (err) {
              addMessage('Error: ' + err.message, 'bot');
            } finally {
              promptInput.disabled = false;
              sendBtn.disabled = false;
              promptInput.focus();
            }
          }

          loadHistory();
        </script>
      </body>
    </html>
  `);
});

app.get('/history', (req, res) => {
  res.json(conversationHistory);
});

app.post('/chat', async (req, res) => {
  const { prompt } = req.body;
  await logToWorkspace('User: ' + prompt);

  try {
    let context = '';
    if (prompt.toLowerCase().includes('fetch ') || prompt.toLowerCase().includes('http')) {
      const urlMatch = prompt.match(/https?:\/\/[^\\s]+/);
      if (urlMatch) {
        try {
          const fetchRes = await fetch(urlMatch[0]);
          if (fetchRes.ok) {
            const html = await fetchRes.text();
            context = "\\n\\n[Current Content from " + urlMatch[0] + "]:\\n" + html.substring(0, 2000) + "...";
            await logToWorkspace('System: Successfully fetched ' + urlMatch[0]);
          }
        } catch (e) {
          await logToWorkspace('System: Failed to fetch ' + urlMatch[0] + ': ' + e.message);
        }
      }
    }

    const messages = [
      { role: 'system', content: 'You are a professional AI assistant tool. You have persistent memory of this conversation.' },
      ...conversationHistory,
      { role: 'user', content: prompt + context }
    ];

    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
    });

    const output = completion.choices[0].message.content;

    // Update memory
    conversationHistory.push({ role: 'user', content: prompt });
    conversationHistory.push({ role: 'assistant', content: output });

    // Trim history if it gets too long (e.g., keep last 20 messages)
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

    await saveHistory();
    await logToWorkspace('Agent: ' + output);
    res.json({ response: output });

  } catch (error) {
    console.error('Agent encountered an error:', error.message);
    await logToWorkspace('Error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
});

init().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SpudClaw is listening on port \${PORT}`);
    logToWorkspace('SpudClaw Tool with Persistent Memory started.');
  });
});
