import { describe, it, expect } from 'vitest';

function parseHashtagSequence(rawInput, existingHashtags = []) {
  if (!rawInput || !rawInput.trim()) return existingHashtags;
  const parsedTags = rawInput
    .trim()
    .split(/[\s,#]+/)
    .map(t => t.trim())
    .filter(Boolean);

  const updatedHashtags = [...existingHashtags];
  parsedTags.forEach(tag => {
    if (!updatedHashtags.includes(tag)) {
      updatedHashtags.push(tag);
    }
  });
  return updatedHashtags;
}

describe('Hashtag Sequence Parsing', () => {
  it('parses a single string with multiple hashtags separated by space', () => {
    const input = '#EstabilidadeOperacional #SRE #Metricas #FattoConsultoria #GovernancaTI';
    const result = parseHashtagSequence(input);
    expect(result).toEqual([
      'EstabilidadeOperacional',
      'SRE',
      'Metricas',
      'FattoConsultoria',
      'GovernancaTI'
    ]);
  });

  it('handles commas, extra spaces, and tags without #', () => {
    const input = '#EstabilidadeOperacional, SRE, #Metricas  #FattoConsultoria';
    const result = parseHashtagSequence(input);
    expect(result).toEqual([
      'EstabilidadeOperacional',
      'SRE',
      'Metricas',
      'FattoConsultoria'
    ]);
  });

  it('deduplicates tags against existing list', () => {
    const existing = ['SRE', 'Metricas'];
    const input = '#SRE #GovernancaTI #Metricas #NovaTag';
    const result = parseHashtagSequence(input, existing);
    expect(result).toEqual([
      'SRE',
      'Metricas',
      'GovernancaTI',
      'NovaTag'
    ]);
  });
});
