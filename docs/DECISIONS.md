# Decisões

## ADR-001 — Publicação direta na main

O usuário autorizou explicitamente atuação direta na `main` para o repositório vazio. Checkpoints pequenos e testados reduzem o risco.

## ADR-002 — Phaser 4 e dependências fixadas

As versões estáveis consultadas no registro npm em 2026-07-28 foram fixadas sem intervalos para builds reproduzíveis. TypeScript 7.0.2 foi descartado porque `typescript-eslint` declara suporte apenas a versões `<6.1`; foi adotado TypeScript 6.0.3 sem forçar peer dependencies incompatíveis.

## ADR-003 — Interface híbrida

Phaser renderiza o mundo; HTML/CSS atende menus e acessibilidade. Regras permanecem fora das Scenes.

## ADR-004 — Placeholder procedural primeiro

A primeira página usa formas procedurais, pois o documento exige provar build e Pages antes de produção visual em massa.

## ADR-005 — Combate legível sem anúncios de evento

Eventos especiais usam horários fixos e formações determinísticas, mas não exibem título, banner ou texto. Apenas telegráficos próprios dos ataques permanecem visíveis.

## ADR-006 — Evolução curta para a partida de cinco minutos

Armas possuem cinco níveis, uma transformação condicionada a passiva nível 3 e elite derrotado, e dois níveis posteriores. A build aceita quatro armas para preservar escolhas entre as seis disponíveis.
