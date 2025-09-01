import { jest } from '@jest/globals';
import { embedTextOpenAI } from '../src/embedding.js';
import { mockEmbeddingResponse, resetMocks } from './mocks.js';

describe('Embedding Module Tests', () => {
  beforeEach(() => {
    resetMocks();
    (global.fetch as any).mockResolvedValue(mockEmbeddingResponse);
  });

  describe('embedTextOpenAI()', () => {
    test('should generate embedding for text', async () => {
      const text = 'Machine learning revolutionizes data analysis';
      
      const embedding = await embedTextOpenAI(text);
      
      expect(embedding).toHaveLength(1536);
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"input":"Machine learning revolutionizes data analysis"')
        })
      );
    });

    test('should handle different text lengths', async () => {
      const testTexts = [
        'Short',
        'Medium length text with some details',
        'Very long text that contains extensive information and detailed descriptions that would typically be found in comprehensive documentation or articles with multiple paragraphs and complex information structures that need to be processed by the embedding model',
        '',
        'Single word',
        'Text with special characters: @#$%^&*()_+-=[]{}|;:\'",.<>?/~`',
        'Multi-line\ntext\nwith\nbreaks',
        'Unicode text with émojis 🚀 and special characters ñáéíóú',
        'Numbers and text: 123 456 789 mixed with words'
      ];

      for (let i = 0; i < testTexts.length; i++) {
        const text = testTexts[i];
        const embedding = await embedTextOpenAI(text);
        
        expect(embedding).toHaveLength(1536);
        expect(Array.isArray(embedding)).toBe(true);
        const callBody = JSON.parse((global.fetch as any).mock.calls[i][1].body);
        expect(callBody.input).toBe(text);
      }
    });

    test('should use default embedding model', async () => {
      const text = 'Test text';
      
      await embedTextOpenAI(text);
      
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.model).toBe('text-embedding-3-small');
    });

    test('should use custom embedding model from environment', async () => {
      const originalModel = process.env.EMBED_MODEL;
      process.env.EMBED_MODEL = 'text-embedding-3-large';

      const text = 'Test text';
      await embedTextOpenAI(text);
      
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.model).toBe('text-embedding-3-large');

      // Restore original
      if (originalModel) {
        process.env.EMBED_MODEL = originalModel;
      } else {
        delete process.env.EMBED_MODEL;
      }
    });

    test('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        text: (jest.fn() as any).mockResolvedValue('Rate limit exceeded')
      });

      await expect(embedTextOpenAI('test text'))
        .rejects.toThrow('Gagal ambil embedding: Rate limit exceeded');
    });

    test('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network connection failed'));

      await expect(embedTextOpenAI('test text'))
        .rejects.toThrow('Network connection failed');
    });

    test('should require OpenAI API key', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      await expect(embedTextOpenAI('test text'))
        .rejects.toThrow('OPENAI_API_KEY tidak di-set');

      // Restore original
      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });

    test('should handle malformed API response', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: (jest.fn() as any).mockResolvedValue({
          data: [] // Empty data array
        })
      });

      await expect(embedTextOpenAI('test text'))
        .rejects.toThrow();
    });

    test('should validate embedding dimensions', async () => {
      const customResponse: any = {
        ok: true,
        json: (jest.fn() as any).mockResolvedValue({
          data: [{
            embedding: Array.from({ length: 1536 }, (_, i) => i * 0.001)
          }]
        })
      };
      (global.fetch as any).mockResolvedValue(customResponse);

      const embedding = await embedTextOpenAI('test text');
      
      expect(embedding).toHaveLength(1536);
      expect(embedding[0]).toBe(0);
      expect(embedding[1]).toBe(0.001);
      expect(embedding[1535]).toBeCloseTo(1.535, 10);
    });
  });
});
