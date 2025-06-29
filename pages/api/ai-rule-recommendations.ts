import type { NextApiRequest, NextApiResponse } from 'next';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function getAIRuleRecommendations(clients: any[], workers: any[], tasks: any[], existingRules: any[]) {
  const dataSummary = {
    clients: clients.slice(0, 10),
    workers: workers.slice(0, 10),
    tasks: tasks.slice(0, 10),
  };

  const prompt = `You are an AI assistant analyzing resource allocation data to suggest business rules. 

Current data:
Clients: ${JSON.stringify(dataSummary.clients)}
Workers: ${JSON.stringify(dataSummary.workers)}
Tasks: ${JSON.stringify(dataSummary.tasks)}
Existing Rules: ${JSON.stringify(existingRules)}

Analyze the data patterns and suggest business rules that would improve resource allocation. Look for:

1. Tasks that frequently work together (co-run rules)
2. Groups that need slot restrictions
3. Workers that might be overloaded (load limits)
4. Tasks with specific phase requirements (phase windows)
5. Skill gaps or bottlenecks
6. Priority conflicts

Respond in this JSON format:
{
  "recommendations": [
    {
      "type": "coRun|slotRestriction|loadLimit|phaseWindow",
      "reason": "why this rule is recommended",
      "rule": {
        "type": "rule type",
        // rule-specific fields
      },
      "confidence": "high|medium|low",
      "impact": "description of expected impact"
    }
  ],
  "insights": [
    "general insights about the data patterns"
  ]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a business analyst specializing in resource allocation optimization.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    }),
  });

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  
  try {
    return JSON.parse(text);
  } catch {
    return {
      recommendations: [],
      insights: ["Unable to parse AI recommendations. Please review your data manually."]
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OpenAI API key not set' });
  }

  const { clients, workers, tasks, existingRules = [] } = req.body;

  try {
    const recommendations = await getAIRuleRecommendations(clients, workers, tasks, existingRules);
    res.status(200).json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 