import type { NextApiRequest, NextApiResponse } from 'next';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function callOpenAIForRule(description: string, clients: any[], workers: any[], tasks: any[]) {
  const dataSummary = {
    clients: clients.slice(0, 10),
    workers: workers.slice(0, 10),
    tasks: tasks.slice(0, 10),
  };
  const prompt = `You are a helpful assistant for a resource allocation tool. The user will describe a business rule in plain English. You will receive three datasets: clients, workers, and tasks (each as an array of objects). Convert the user's description into a structured rule in one of these formats:\n\n- { \"type\": \"coRun\", \"tasks\": [TaskID, ...] }\n- { \"type\": \"slotRestriction\", \"group\": string, \"minCommonSlots\": number }\n- { \"type\": \"loadLimit\", \"group\": string, \"maxSlotsPerPhase\": number }\n- { \"type\": \"phaseWindow\", \"task\": TaskID, \"allowedPhases\": string }\n\nUser description: ${description}\n\nClients: ${JSON.stringify(dataSummary.clients)}\nWorkers: ${JSON.stringify(dataSummary.workers)}\nTasks: ${JSON.stringify(dataSummary.tasks)}\n\nRespond with only the JSON for the rule.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a JSON API.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 256,
    }),
  });
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  try {
    const rule = JSON.parse(text);
    return rule;
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not set' });
  }

  const { description, clients, workers, tasks } = req.body;

  try {
    const rule = await callOpenAIForRule(description, clients, workers, tasks);
    if (rule) {
      res.status(200).json({ rule });
    } else {
      res.status(400).json({ error: 'Could not parse rule from AI response' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 