# Guia de Integração API LinkedIn

Este documento descreve as regras críticas, padrões e o histórico de tentativas frustradas para a integração com a API do LinkedIn (Versão 2024+), visando prevenir regressões e facilitar a manutenção.

## 📋 Regras de Ouro

### 1. Versionamento (LinkedIn-Version)
- **Formato:** Sempre use o formato de 6 dígitos `YYYYMM` (ex: `202601`).
- **Header:** O header deve ser `LinkedIn-Version`.
- **Fallbacks:** Devido ao ciclo de vida agressivo do LinkedIn, utilize sempre a função centralizada `fetchLinkedInWithFallback` que rotaciona entre versões ativas (ex: `202606`, `202601`, `202508`).

### 2. Descoberta de Páginas (ACLs)
- **Endpoint Correto:** `https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED`.
- **Campos de Resposta:** A API pode retornar o URN da organização no campo `organizationTarget` ou `organization`. O código deve verificar ambos.
- **Protocolo:** Sempre inclua o header `X-Restli-Protocol-Version: 2.0.0`.

### 3. Persistência de Tokens (Frontend)
- **Salvamento Atômico:** Ao receber o token OAuth no frontend, re-busque as configurações do banco de dados antes de fazer o merge e salvar. Isso evita que o estado assíncrono do React sobrescreva o novo token com dados antigos.
- **Prevenção de Duplicidade:** Use um `useRef` (ex: `processingCodeRef`) para garantir que o código de autorização seja trocado pelo token apenas uma vez, evitando erros de "code already used".

### 4. Escopos e Permissões
- **Escopos Atuais:** `r_basicprofile w_member_social r_organization_social w_organization_social rw_organization_admin r_member_postAnalytics`.
- **Evite:** O escopo `r_liteprofile` está depreciado e causa erros genéricos ("Bummer").

## ❌ Histórico de Falhas (O que não fazer)

| Erro / Problema | Causa Tentada | Resultado | Solução |
| :--- | :--- | :--- | :--- |
| **426 NONEXISTENT_VERSION** | Versão sunset (ex: `202507`) ou header incorreto. | Falha total na requisição. | Usar `fetchLinkedInWithFallback` com versões mais recentes. |
| **INVALID_VERSION** | Uso de data completa `YYYYMMDD` (ex: `20250101`). | LinkedIn rejeita o formato de 8 dígitos. | Usar apenas 6 dígitos `YYYYMM`. |
| **426 / Sunset** | Endpoint `/rest/organizationalEntityAcls`. | Endpoint desativado pelo LinkedIn. | Migrar para `/rest/organizationAcls`. |
| **Token Perdido** | Salvar no context e esperar o "auto-save". | Race condition no React limpava o token no reload. | Persistir explicitamente no DB logo após a troca do token. |
| **401 Unauthorized** | Falta de `X-Restli-Protocol-Version`. | API rejeita chamadas Restli sem versão do protocolo. | Sempre incluir o header de protocolo `2.0.0`. |

## 🛠️ Manutenção

Toda nova chamada à API do LinkedIn deve ser adicionada ao `api/linkedin-proxy.js` utilizando os utilitários exportados:
- `fetchLinkedInWithFallback`: Para requisições genéricas.
- `getPostDetails`: Para buscar detalhes de posts (gerencia prefixos `ugcPost` e `share`).
- `getAuthorDetails`: Para buscar perfis de pessoas ou organizações.
