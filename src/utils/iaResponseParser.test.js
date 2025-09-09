import { describe, it, expect } from 'vitest';
import { parseIaResponseToCsvData } from './iaResponseParser';

describe('parseIaResponseToCsvData', () => {
  const expectedHeaders = ["Título", "Texto Principal", "Ponte para o Próximo", "prompt_imagem_carrossel"];

  it('should return empty data and default headers for invalid or empty input', () => {
    expect(parseIaResponseToCsvData(null)).toEqual({ data: [], headers: expectedHeaders });
    expect(parseIaResponseToCsvData(undefined)).toEqual({ data: [], headers: expectedHeaders });
    expect(parseIaResponseToCsvData('')).toEqual({ data: [], headers: expectedHeaders });
    expect(parseIaResponseToCsvData('  ')).toEqual({ data: [], headers: expectedHeaders });
  });

  it('should parse a valid CSV block from the response', () => {
    const responseText = `
      Some text before the CSV.
      \`\`\`csv
      Título,Texto Principal,"Ponte para o Próximo",prompt_imagem_carrossel
      "Post 1","Content 1","Next 1","Prompt 1"
      "Post 2","Content 2","Next 2","Prompt 2"
      \`\`\`
      Some text after the CSV.
    `;
    const result = parseIaResponseToCsvData(responseText);
    expect(result.headers).toEqual(expectedHeaders);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      "Título": "Post 1",
      "Texto Principal": "Content 1",
      "Ponte para o Próximo": "Next 1",
      "prompt_imagem_carrossel": "Prompt 1",
    });
  });

  it('should handle different header casing and spacing', () => {
    const responseText = `
      \`\`\`csv
      "  título ", " texto principal", "ponte para o próximo", "prompt_imagem_carrossel"
      "Post 1","Content 1","Next 1","Prompt 1"
      \`\`\`
    `;
    const result = parseIaResponseToCsvData(responseText);
    expect(result.data[0]['Título']).toBe('Post 1');
    expect(result.data[0]['Texto Principal']).toBe('Content 1');
  });

  it('should handle missing optional columns in the CSV', () => {
    const responseText = `
      \`\`\`csv
      Título,Texto Principal
      "Post 1","Content 1"
      \`\`\`
    `;
    const result = parseIaResponseToCsvData(responseText);
    expect(result.data[0]).toEqual({
      "Título": "Post 1",
      "Texto Principal": "Content 1",
      "Ponte para o Próximo": "",
      "prompt_imagem_carrossel": "",
    });
  });

  it('should return empty data if CSV block has no data rows', () => {
    const responseText = `
      \`\`\`csv
      Título,Texto Principal
      \`\`\`
    `;
    const result = parseIaResponseToCsvData(responseText);
    expect(result.data).toHaveLength(0);
  });

  it('should use fallback parser when no CSV block is found', () => {
    const responseText = `
      Título: Fallback Post 1
      Texto Principal: Fallback Content 1
      Ponte para o Próximo: Fallback Next 1
      prompt_imagem_carrossel: Fallback Prompt 1

      Título: Fallback Post 2
      Texto Principal: Fallback Content 2
    `;
    const result = parseIaResponseToCsvData(responseText);
    expect(result.headers).toEqual(expectedHeaders);
    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      "Título": "Fallback Post 1",
      "Texto Principal": "Fallback Content 1",
      "Ponte para o Próximo": "Fallback Next 1",
      "prompt_imagem_carrossel": "Fallback Prompt 1",
    });
    expect(result.data[1]).toEqual({
      "Título": "Fallback Post 2",
      "Texto Principal": "Fallback Content 2",
      "Ponte para o Próximo": "",
      "prompt_imagem_carrossel": "",
    });
  });

  it('should return empty data when no structured data is found', () => {
    const responseText = "This is just some random text without any structure.";
    const result = parseIaResponseToCsvData(responseText);
    expect(result.data).toHaveLength(0);
  });
});
