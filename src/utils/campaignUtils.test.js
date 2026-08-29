import { describe, it, expect } from 'vitest';
import {
  hasProblemaSolucao,
  getAvailableCampaignPosts,
  buildPromptTextFromPosts,
  convertPostsToCsvData,
  getMainPostPromptText,
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

  describe('getMainPostPromptText', () => {
    it('returns empty string if campaignContent is missing', () => {
      expect(getMainPostPromptText({})).toBe('');
    });

    it('returns formatted content and CTA', () => {
      const campaignState = {
        campaignContent: {
          conteudo: 'Conteúdo do post principal.',
          cta: 'Clique aqui',
        },
      };
      expect(getMainPostPromptText(campaignState)).toBe('Conteúdo do post principal.\n\nClique aqui');
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

  describe('convertPostsToCsvData', () => {
    it('returns empty data and headers if no posts exist', () => {
      expect(convertPostsToCsvData({})).toEqual({ data: [], headers: [] });
    });

    it('converts campaign posts directly into short post records for csvData', () => {
      const campaignState = {
        campaignContent: {
          titulo: 'Título Principal',
          conteudo: 'Texto Principal',
          cta: 'CTA Principal',
        },
        followupPosts: [
          {
            titulo: 'Título Followup 1',
            conteudo: 'Texto Followup 1',
            cta: 'CTA Followup 1',
          },
        ],
      };

      const { data, headers } = convertPostsToCsvData(campaignState);

      expect(headers).toEqual(['Título', 'Texto Principal', 'Ponte para o Próximo', 'prompt_imagem_carrossel']);
      expect(data.length).toBe(2);

      expect(data[0]['Título']).toBe('Título Principal');
      expect(data[0]['Texto Principal']).toBe('Texto Principal');
      expect(data[0]['Ponte para o Próximo']).toBe('CTA Principal');
      expect(data[0]['id']).toBeDefined();

      expect(data[1]['Título']).toBe('Título Followup 1');
      expect(data[1]['Texto Principal']).toBe('Texto Followup 1');
      expect(data[1]['Ponte para o Próximo']).toBe('CTA Followup 1');
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
