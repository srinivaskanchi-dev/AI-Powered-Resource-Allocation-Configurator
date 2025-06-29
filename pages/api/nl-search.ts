import type { NextApiRequest, NextApiResponse } from 'next';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function callOpenAI(query: string, clients: any[], workers: any[], tasks: any[]) {
  // Prepare a summary of the data (only first 10 rows per entity for prompt size)
  const dataSummary = {
    clients: clients.slice(0, 10),
    workers: workers.slice(0, 10),
    tasks: tasks.slice(0, 10),
  };
  const prompt = `You are a helpful assistant for a resource allocation tool. The user will provide a natural language query. You will receive three datasets: clients, workers, and tasks (each as an array of objects). For each entity, return a list of IDs (ClientID, WorkerID, TaskID) that match the user's query.\n\nUser query: ${query}\n\nClients: ${JSON.stringify(dataSummary.clients)}\nWorkers: ${JSON.stringify(dataSummary.workers)}\nTasks: ${JSON.stringify(dataSummary.tasks)}\n\nRespond in this JSON format: { "clients": [ClientID...], "workers": [WorkerID...], "tasks": [TaskID...] }`;

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
      max_tokens: 512,
    }),
  });
  const data = await response.json();
  // Try to parse the JSON from the response
  const text = data.choices?.[0]?.message?.content || '';
  try {
    const ids = JSON.parse(text);
    return ids;
  } catch {
    return { clients: [], workers: [], tasks: [] };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not set' });
  }

  const { query, clients, workers, tasks } = req.body;

  try {
    const ids = await callOpenAI(query, clients, workers, tasks);
    // Filter the original data by the returned IDs
    const filteredClients = clients.filter((c: any) => ids.clients.includes(c.ClientID));
    const filteredWorkers = workers.filter((w: any) => ids.workers.includes(w.WorkerID));
    const filteredTasks = tasks.filter((t: any) => ids.tasks.includes(t.TaskID));
    res.status(200).json({ clients: filteredClients, workers: filteredWorkers, tasks: filteredTasks });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 