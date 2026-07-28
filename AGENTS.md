# AGENTS.md

## Comandos obrigatórios

- Instalação: `npm ci`
- Desenvolvimento: `npm run dev`
- Lint: `npm run lint`
- Tipos: `npm run typecheck`
- Testes: `npm run test` e `npm run test:coverage`
- Playwright: `npm run test:e2e`
- Build: `npm run build`
- Conteúdo: `npm run content:validate`
- Assets: `npm run assets:validate`
- Simulação: `npm run simulate`
- Validação completa: `npm run verify`
- Deploy: push na `main` após `npm run verify`; `.github/workflows/deploy.yml` publica o `dist`.

## Arquitetura e convenções

- Regras em TypeScript puro dentro de `src/core` e `src/domain`; Phaser apenas adapta input, áudio e renderização.
- Menus complexos usam HTML/CSS; conteúdo e balanceamento são dados validados.
- Não use `Math.random()` nos sistemas: use o RNG com semente.
- TypeScript estrito, APIs públicas tipadas, composição e funções pequenas.
- Preserve o `base: '/Games/'`; caminhos devem funcionar no GitHub Pages.

## Segurança e conclusão

- Nunca inclua segredos, `.env`, chaves no cliente, `eval` ou execução de save importado.
- Não ignore, desative ou atualize snapshots para esconder testes falhando.
- Corrija toda regressão antes de avançar de marco.
- Uma mudança só termina após lint, typecheck, testes, validações, build e teste real em navegador.
- Atualize `PLANS.md`, `CHANGELOG.md` e documentos afetados.
