import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractMemories } from './extract.js';
import { getOpenRouterClient } from '../lib/openrouter.js';
import { AppError } from './AppError.js';

// Mock getOpenRouterClient
vi.mock('../lib/openrouter.js', () => ({
  getOpenRouterClient: vi.fn(),
}));

describe('extractMemories', () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock behavior for OpenRouter API
    mockCreate = vi.fn();
    vi.mocked(getOpenRouterClient).mockReturnValue({
      chat: { completions: { create: mockCreate } }
    } as any);
  });

  it('should handle empty input without calling LLM', async () => {
    const result = await extractMemories('   ');
    expect(result).toEqual({ semantic: [], bubbles: [] });
    expect(getOpenRouterClient).not.toHaveBeenCalled();
  });

  it('should correctly parse a successful valid LLM response', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              semantic: ['User loves typescript', 'User lives in NY'],
              bubbles: [
                { text: 'User decided to write tests', importance: 0.9 },
                { text: 'User is hungry', importance: 0.4 }
              ]
            })
          }
        }
      ]
    });

    const result = await extractMemories('Some text about me');

    expect(result).toEqual({
      semantic: ['User loves typescript', 'User lives in NY'],
      bubbles: [
        { text: 'User decided to write tests', importance: 0.9 },
        { text: 'User is hungry', importance: 0.4 }
      ]
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);

    // Verify system prompt / user formatting is correct
    const callArgs = mockCreate.mock.calls[0]![0]!;
    expect(callArgs.model).toBe('google/gemini-2.0-flash-001');
    expect(callArgs.messages[1].content).toContain('Some text about me');
  });

  it('should truncate excessively long text input before sending to LLM', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ semantic: [], bubbles: [] }) } }]
    });

    const MAX_INPUT_LENGTH = 80_000;
    const longText = 'a'.repeat(MAX_INPUT_LENGTH + 1000);

    await extractMemories(longText);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0]![0]!;
    const userContent = callArgs.messages[1].content;

    // Ensure the text has been truncated
    expect(userContent).toContain('a'.repeat(MAX_INPUT_LENGTH));
    expect(userContent).toContain('[…truncated]');
    expect(userContent).not.toContain('a'.repeat(MAX_INPUT_LENGTH + 1));
  });

  it('should return empty memories if LLM response content is null or empty', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }]
    });

    const result1 = await extractMemories('text');
    expect(result1).toEqual({ semantic: [], bubbles: [] });

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '' } }]
    });

    const result2 = await extractMemories('text');
    expect(result2).toEqual({ semantic: [], bubbles: [] });
  });

  it('should handle invalid JSON response gracefully and return empty memories', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'This is not JSON' } }]
    });

    const result = await extractMemories('text');
    expect(result).toEqual({ semantic: [], bubbles: [] });
  });

  it('should handle malformed JSON object missing expected keys gracefully', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ someOtherKey: true }) } }]
    });

    const result = await extractMemories('text');
    expect(result).toEqual({ semantic: [], bubbles: [] });
  });

  it('should handle malformed nested types in JSON gracefully', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        semantic: ['Valid string', 123, null],
        bubbles: [
          { text: 'Valid bubble', importance: 0.5 },
          { invalidBubble: true },
          { text: 123 },
          { text: 'Clamped importance', importance: 5 } // Will be clamped to 1
        ]
      }) } }]
    });

    const result = await extractMemories('text');
    expect(result).toEqual({
      semantic: ['Valid string'],
      bubbles: [
        { text: 'Valid bubble', importance: 0.5 },
        { text: 'Clamped importance', importance: 1 }
      ]
    });
  });

  it('should throw AppError with status code 502 on network/API errors', async () => {
    mockCreate.mockRejectedValue(new Error('OpenRouter API is down'));

    await expect(extractMemories('text')).rejects.toThrow(AppError);
    await expect(extractMemories('text')).rejects.toThrow('Memory extraction failed: OpenRouter API is down');

    try {
      await extractMemories('text');
    } catch (err: any) {
      expect(err.statusCode).toBe(502);
    }
  });

  it('should re-throw AppError directly if thrown by internal process', async () => {
    const customAppError = new AppError(400, 'Custom error');
    mockCreate.mockRejectedValue(customAppError);

    await expect(extractMemories('text')).rejects.toThrow(customAppError);
  });
});
