import type { NextApiRequest, NextApiResponse } from 'next';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type AISuggestion = {
  entity: 'clients' | 'workers' | 'tasks';
  row: number;
  column: string;
  issue: string;
  suggestedFix: string;
};

async function getAICorrectionSuggestions(validationErrors: any, clients: any[], workers: any[], tasks: any[]) {
  const dataSummary = {
    clients: clients.slice(0, 5),
    workers: workers.slice(0, 5),
    tasks: tasks.slice(0, 5),
  };

  const prompt = `You are an AI assistant helping to fix data validation errors in a resource allocation system. 

Current data sample:
Clients: ${JSON.stringify(dataSummary.clients)}
Workers: ${JSON.stringify(dataSummary.workers)}
Tasks: ${JSON.stringify(dataSummary.tasks)}

Validation errors found:
${JSON.stringify(validationErrors, null, 2)}

For each error, provide specific, actionable suggestions for fixing the data. Focus on:
1. What the correct value should be
2. How to fix the issue
3. Any patterns or common mistakes to avoid

Respond in this JSON format:
{
  "suggestions": [
    {
      "entity": "clients|workers|tasks",
      "row": 2,
      "column": "RequiredSkills",
      "issue": "Missing worker skill",
      "suggestedFix": "Add skill 'API Testing' to Bob Smith"
    }
  ],
  "generalAdvice": "overall advice for data quality"
}

Make sure each suggestion has:
- entity: the data type (clients, workers, or tasks)
- row: the row number (1-based index)
- column: the field name that has the issue
- issue: a clear description of the problem
- suggestedFix: a specific, actionable fix`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a data quality expert helping fix validation errors. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  
  try {
    const parsed = JSON.parse(text);
    
    // Validate and ensure proper structure
    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      return {
        suggestions: [],
        generalAdvice: "AI response format was invalid. Please review validation errors manually."
      };
    }

    // Validate each suggestion has required fields
    const validSuggestions: AISuggestion[] = parsed.suggestions.filter((s: any) => 
      s.entity && ['clients', 'workers', 'tasks'].includes(s.entity) &&
      typeof s.row === 'number' &&
      s.column &&
      s.issue &&
      s.suggestedFix
    );

    return {
      suggestions: validSuggestions,
      generalAdvice: parsed.generalAdvice || "Review the suggestions above to fix data quality issues."
    };
  } catch (error) {
    return {
      suggestions: [],
      generalAdvice: "Unable to parse AI suggestions. Please review the validation errors manually."
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

  const { validationErrors, clients, workers, tasks } = req.body;

  try {
    const suggestions = await getAICorrectionSuggestions(validationErrors, clients, workers, tasks);
    res.status(200).json(suggestions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 