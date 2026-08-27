import { describe, it, expect } from 'vitest';
import {
  hasProblemaSolucao,
  getAvailableCampaignPosts,
  buildPromptTextFromPosts,
} from './campaignUtils';

describe('campaignUtils - short post generation helpers', () => {
  describe('hasProblemaSolucao', () => {
    it('returns true when both problema and solucao are non-empty', () => {
      const campaignState = {
        problema: 'Empresas não conseguem gerenciar o tempo.',
        solucao: 'Um software de automação fácil de usar.',
      };
      expect(hasProblemaSolucao(campaignState)).toBe(true);
    });

    it('returns false when problema or solucao is missing or empty', () => {
      expect(hasProblemaSolucao({})).toBe(false);
      expect(hasProblemaSolucao({ problema: 'Apenas problema' })).toBe(false);
      expect(hasProblemaSolucao({ solucao: 'Apenas solução' })).toBe(false);
      expect(hasProblemaSolucao({ problema: '   ', solucao: '  ' })).toBe(false);
    });
  });

  describe('getAvailableCampaignPosts', () => {
    it('returns empty array when campaign has no posts', () => {
      expect(getAvailableCampaignPosts({})).toEqual([]);
    });

    it('extracts main post and followup posts correctly', () => {
      const campaignState = {
        campaignContent: {
          titulo: 'Título do Post Principal',
          conteudo: 'Conteúdo do post principal.',
          cta: 'Clique aqui',
        },
        followupPosts: [
          {
            titulo: 'Followup 1',
            conteudo: 'Conteúdo do followup 1.',
            cta: 'Saiba mais',
          },
          {
            titulo: 'Followup 2',
            conteudo: 'Conteúdo do followup 2.',
            cta: 'Inscreva-se',
          },
        ],
      };

      const posts = getAvailableCampaignPosts(campaignState);
      expect(posts.length).toBe(3);
      expect(posts[0]).toEqual({
        tipo: 'Post Principal',
        titulo: 'Título do Post Principal',
        conteudo: 'Conteúdo do post principal.',
        cta: 'Clique aqui',
      });
      expect(posts[1]).toEqual({
        tipo: 'Post Follow-up 1',
        titulo: 'Followup 1',
        conteudo: 'Conteúdo do followup 1.',
        cta: 'Saiba mais',
      });
      expect(posts[2]).toEqual({
        tipo: 'Post Follow-up 2',
        titulo: 'Followup 2',
        conteudo: 'Conteúdo do followup 2.',
        cta: 'Inscreva-se',
      });
    });
  });

  describe('buildPromptTextFromPosts', () => {
    it('returns empty string when no posts are provided', () => {
      expect(buildPromptTextFromPosts([])).toBe('');
      expect(buildPromptTextFromPosts(null)).toBe('');
    });

    it('formats posts into structured prompt text', () => {
      const posts = [
        {
          tipo: 'Post Principal',
          titulo: 'Título Main',
          conteudo: 'Conteúdo Main',
          cta: 'CTA Main',
        },
        {
          tipo: 'Post Follow-up 1',
          titulo: 'Título Followup',
          conteudo: 'Conteúdo Followup',
          cta: 'CTA Followup',
        },
      ];

      const result = buildPromptTextFromPosts(posts);
      expect(result).toContain('--- POST PRINCIPAL (1/2) ---');
      expect(result).toContain('Título: Título Main');
      expect(result).toContain('Conteúdo: Conteúdo Main');
      expect(result).toContain('CTA: CTA Main');
      expect(result).toContain('--- POST FOLLOW-UP 1 (2/2) ---');
      expect(result).toContain('Título: Título Followup');
    });
  });
});
