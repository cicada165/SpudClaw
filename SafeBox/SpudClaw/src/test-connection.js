import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-1234',
  baseURL: process.env.OPENAI_API_BASE || 'http://host.docker.internal:4000/v1',
});

async function main() {
  console.log('--- SpudClaw Connection Test ---');
  console.log(`Base URL: ${openai.baseURL}`);
  console.log(`Model: ${process.env.MODEL || 'omni-1'}`);

  try {
    const response = await openai.chat.completions.create({
      model: process.env.MODEL || 'omni-1',
      messages: [{ role: 'user', content: 'Hello SpudClaw, are you online?' }],
    });

    console.log('\nSuccess! Response from gateway:');
    console.log(response.choices[0].message.content);
    process.exit(0);
  } catch (error) {
    console.error('\nError connecting to gateway:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
