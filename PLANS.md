# Plano de desenvolvimento

Regra permanente: se uma validação falhar, corrigir e executá-la novamente antes do próximo marco.

## M0 — Auditoria e documentação

- Estado: concluído em 2026-07-28.
- Objetivo: registrar produto, arquitetura, riscos e critérios.
- Arquivos: `AGENTS.md`, `README.md`, `CHANGELOG.md`, `docs/*`.
- Validação: revisão dos documentos e estado do Git.
- Resultado: repositório originalmente vazio; Node 24 e npm 11 disponíveis; publicação autorizada diretamente na `main`.
- Risco: escopo integral é muito maior que um único marco.
- Decisão: obedecer a ordem infraestrutura → publicação → núcleo jogável.

## M1 — Infraestrutura publicável

- Estado: concluído.
- Objetivo: provar Phaser, Vite, TypeScript, Vitest, Playwright, CI e Pages.
- Arquivos: configurações raiz, `src/main.ts`, `BootScene`, testes e workflows.
- Implementação: tela inicial responsiva renderizada por Phaser com shell HTML acessível.
- Validação: `npm run verify`, Playwright no CI e URL pública aprovados.
- Aceite: build sem erro, canvas visível, nenhum erro de console e `/Games/` funcional.
- Resultado: GitHub Pages publicado em `https://fomes1574.github.io/Games/`.

## M2 — Núcleo jogável

- Estado: concluído localmente; validação remota em andamento.
- Objetivo: partida determinística com movimento, inimigos, ataque, dano, XP, nível e encerramento.
- Arquivos: `src/core`, `src/domain`, `src/game`, `src/data`, testes.
- Validação: unitários, integração, Playwright via `window.__GAME_TEST_API__`.
- Resultado: RNG com semente, movimento, armas automáticas, dano, XP, escolhas, vitória/derrota e API de teste implementados.
- Aceite: `npm run verify` aprovado com 16 testes e 91,26% de cobertura de statements; Playwright remoto pendente.

## M3 — Fatia vertical de cinco minutos

- Estado: implementada localmente; validação remota em andamento.
- Objetivo: Brutamontes, três armas, três passivas, três evoluções, três inimigos, elite, chefe, guilda e save.
- Validação: partida real completa, importação/exportação e deploy verificado.
- Resultado: sala de preparação, Brutamontes, três armas/passivas/evoluções, três inimigos, elite, Bispo da Peste, guilda e save.
- Aceite: início, movimento e parallax cobertos por Playwright; partida completa e deploy aguardam CI.

## M4 — Pipeline visual

- Estado: pendente.
- Objetivo: prova visual, manifestos, geração seletiva, processamento, validação e atlas.
- Validação: `assets:*`, contact sheet e relatório de reprovações.
- Aceite: arte consistente, licenciada e sem chave no cliente.

## M5–M9 — Conteúdo, balanceamento, desempenho, acabamento e lançamento

- Estado: pendente.
- Objetivo: cumprir o escopo integral documentado em `docs/GAME_DESIGN.md`.
- Validação: suíte completa, simulador, cenários de 350/650/1.000 entidades, acessibilidade e smoke público.
- Aceite: todos os critérios de `README.md` e limitações registradas em `docs/KNOWN_ISSUES.md`.
