import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const WORKSPACE_DIR = '/home/spud/app/workspace';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_BASE,
});

const model = process.env.MODEL || 'omni-1';

async function logToWorkspace(data) {
    const timestamp = new Date().toISOString();
    const logContent = `[${timestamp}] ${data}\n`;
    const logPath = path.join(WORKSPACE_DIR, 'session.log');

    try {
        await fs.appendFile(logPath, logContent);
    } catch (err) {
        console.error('Failed to write to workspace:', err);
    }
}

async function runAgent() {
    console.log('SpudClaw is active and monitoring...');
    await logToWorkspace('SpudClaw session started.');

    try {
        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: 'You are SpudClaw, a locally hosted AI agent. You have access to a secure workspace folder. Keep your responses concise.' },
                { role: 'user', content: 'Introduce yourself and confirm your connection to the Omni-LLM gateway.' }
            ],
        });

        const output = completion.choices[0].message.content;
        console.log('Agent Output:', output);
        await logToWorkspace(`Agent Response: ${output}`);

    } catch (error) {
        console.error('Agent encountered an error:', error.message);
        await logToWorkspace(`Error: ${error.message}`);
    }
}

runAgent();
