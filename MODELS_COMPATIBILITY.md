# Compatibilidade e Custo de Modelos Gemini

Esta documentação serve como um guia para a seleção de modelos de IA do Google, focando em alternativas de baixo custo e com nível de uso gratuito ("free tier").

## Resumo dos Níveis de Custo

- **Modelos "Flash"**: Geralmente são as opções mais rápidas e de menor custo, ideais para a maioria das tarefas, como tradução, resumo e geração de conteúdo rápido. Modelos como `gemini-1.5-flash` e `gemini-2.0-flash` fazem parte do "free tier" da API Gemini.
- **Modelos "Pro"**: Oferecem maior capacidade de raciocínio para tarefas complexas, mas têm um custo mais elevado.
- **Modelos de Imagem "Imagen" (via Vertex AI)**: São poderosos, mas representam o maior custo, sendo faturados pela API da Vertex AI.
- **Modelos de Imagem "Gemini" (via Gemini API)**: O modelo `gemini-2.5-flash-image` é uma alternativa de excelente custo-benefício, pois utiliza a API Gemini (com "free tier") em vez da API Vertex AI, mais cara.

## Modelos de Texto (generateContent)
- `gemini-2.0-flash` (Recomendado, Baixo Custo)
- `gemini-1.5-flash` (Recomendado, Baixo Custo)
- `gemini-2.0-pro`
- `gemini-1.5-pro`

## Modelos de Imagem (generateImage)
- `gemini-2.5-flash-image` (Recomendado, Baixo Custo, via Gemini API)
- `imagen-4.0-generate-preview-06-06` (Alto Custo, via Vertex AI)
- `imagen-3.0-generate-002` (Alto Custo, via Vertex AI)


## Matriz de Compatibilidade e Custo
| Modelo | API | generateContent | generateImage | Custo | Recomendado Para |
|--------------------------|-------------|-----------------|---------------|-------------|------------------------------------|
| `gemini-2.0-flash` | Gemini API | ✅ | ❌ | Baixo | Texto rápido e geral |
| `gemini-1.5-flash` | Gemini API | ✅ | ❌ | Baixo | Texto rápido com grande contexto |
| `gemini-2.5-flash-image` | Gemini API | ✅ | ✅ | Baixo | Geração de imagem com bom custo |
| `imagen-4.0` | Vertex AI | ❌ | ✅ | Alto | Geração de imagem de alta qualidade |
| `imagen-3.0` | Vertex AI | ❌ | ✅ | Alto | Geração de imagem de alta qualidade |
