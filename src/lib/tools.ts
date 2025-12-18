import { ToolDefinition, SearchResult } from '@/types';

// Tool definitions for function calling
export const AVAILABLE_TOOLS: ToolDefinition[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information. Use this when you need to find up-to-date information, news, or facts that you might not know.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up on the web',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_current_time',
    description: 'Get the current date and time. Use this when asked about current time or date.',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'The timezone (e.g., "Asia/Tokyo", "UTC"). Defaults to Asia/Tokyo.',
        },
      },
      required: [],
    },
  },
  {
    name: 'calculator',
    description: 'Perform mathematical calculations. Use this for any math operations.',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The mathematical expression to evaluate (e.g., "2 + 2 * 3", "sqrt(16)", "sin(45)")',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'analyze_image',
    description: 'Analyze and describe the content of an image that the user has uploaded.',
    parameters: {
      type: 'object',
      properties: {
        imageIndex: {
          type: 'string',
          description: 'The index of the image to analyze (0 for first image, 1 for second, etc.)',
        },
        question: {
          type: 'string',
          description: 'Specific question about the image (optional)',
        },
      },
      required: [],
    },
  },
];

// Tool execution functions
export async function executeWebSearch(query: string): Promise<SearchResult[]> {
  try {
    // Using DuckDuckGo instant answer API (free, no API key needed)
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    
    if (!response.ok) {
      throw new Error('Search request failed');
    }
    
    const data = await response.json();
    const results: SearchResult[] = [];
    
    // Get abstract if available
    if (data.Abstract) {
      results.push({
        title: data.Heading || 'Result',
        url: data.AbstractURL || '',
        snippet: data.Abstract,
      });
    }
    
    // Get related topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || 'Related',
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }
    
    // If no results from DuckDuckGo, use a fallback search
    if (results.length === 0) {
      // Fallback: Return a message suggesting the search
      return [{
        title: `Search: ${query}`,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        snippet: `No instant results found. You can search directly at: https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      }];
    }
    
    return results;
  } catch (error) {
    console.error('Search error:', error);
    return [{
      title: 'Search Error',
      url: '',
      snippet: `Failed to search: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }];
  }
}

export function getCurrentTime(timezone: string = 'Asia/Tokyo'): string {
  try {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    return now.toLocaleString('ja-JP', options);
  } catch {
    return new Date().toISOString();
  }
}

export function calculate(expression: string): string {
  try {
    // Sanitize the expression to prevent code injection
    const sanitized = expression
      .replace(/[^0-9+\-*/().%\s^]/gi, '')
      .replace(/\^/g, '**');
    
    // Add Math functions support
    const withMathFuncs = expression
      .replace(/sqrt\(/gi, 'Math.sqrt(')
      .replace(/sin\(/gi, 'Math.sin(')
      .replace(/cos\(/gi, 'Math.cos(')
      .replace(/tan\(/gi, 'Math.tan(')
      .replace(/log\(/gi, 'Math.log10(')
      .replace(/ln\(/gi, 'Math.log(')
      .replace(/abs\(/gi, 'Math.abs(')
      .replace(/pow\(/gi, 'Math.pow(')
      .replace(/pi/gi, 'Math.PI')
      .replace(/e(?![a-z])/gi, 'Math.E');
    
    // Use Function constructor for safer eval
    const result = new Function(`return ${withMathFuncs}`)();
    
    if (typeof result === 'number') {
      if (Number.isNaN(result)) return 'Error: Invalid calculation';
      if (!Number.isFinite(result)) return 'Error: Result is infinite';
      return result.toString();
    }
    return 'Error: Invalid expression';
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : 'Invalid expression'}`;
  }
}

// Execute a tool by name
export async function executeTool(
  toolName: string, 
  args: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case 'web_search': {
      const results = await executeWebSearch(args.query as string);
      if (results.length === 0) {
        return 'No search results found.';
      }
      return JSON.stringify(results, null, 2);
    }
    
    case 'get_current_time': {
      const timezone = (args.timezone as string) || 'Asia/Tokyo';
      return getCurrentTime(timezone);
    }
    
    case 'calculator': {
      return calculate(args.expression as string);
    }
    
    case 'analyze_image': {
      // Image analysis is handled differently - returns a prompt for the LLM
      return 'IMAGE_ANALYSIS_REQUESTED';
    }
    
    default:
      return `Unknown tool: ${toolName}`;
  }
}

// Convert tools to OpenAI/Azure format
export function getOpenAITools() {
  return AVAILABLE_TOOLS.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

// Convert tools to Gemini format
export function getGeminiTools() {
  return [{
    functionDeclarations: AVAILABLE_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
  }];
}
