# Changelog

Todas as mudanças relevantes serão registradas neste arquivo.

## 0.2.0 — 2026-07-30

### Adicionado

- Sala de preparação antes da partida com personagem, contrato, risco, recompensa e semente.
- Partida determinística de cinco minutos com movimento por teclado e controle.
- Três armas, três passivas e três evoluções.
- Três inimigos comuns, Carrasco Corrompido e Bispo da Peste.
- Experiência, escolhas de nível, vitória, derrota, resultados e retorno à guilda.
- Save em IndexedDB com fallback, checksum, exportação e importação.
- Ferreiro com progressão permanente.
- Cenário procedural em parallax ligado à câmera e ao movimento.
- API controlada de testes e Playwright cobrindo início real e deslocamento.

### Corrigido

- O botão **Preparar expedição** agora abre o fluxo real em vez de apenas trocar de texto.
- A API de testes só é instalada depois que o save termina de carregar.
- Pickups de experiência preservam a posição do inimigo antes da destruição visual.
- Listeners e camadas gráficas são removidos ao trocar de cena.

## 0.1.0 — 2026-07-28

### Adicionado

- Base Phaser 4, Vite 8 e TypeScript estrito.
- Tela inicial responsiva com renderização WebGL/Canvas.
- Vitest, cobertura, Playwright e ESLint.
- Workflows de CI, testes completos e GitHub Pages.
- Documentação estrutural, manifestos e validadores iniciais.

### Limitações

- A arte inicial é procedural/provisória; o pipeline de arte será ativado no Marco 4.
