# Changelog

Todas as mudanças relevantes serão registradas neste arquivo.

## 0.6.0 — 2026-07-31

### Adicionado

- Dezessete melhorias permanentes com cards compactos, custos crescentes e efeitos reais em combate, coleta, economia e escolhas.
- Vida com dez níveis de +5 e Ressureição por 1.500 brasas, metade da vida e um segundo de invulnerabilidade.
- Ameaça I–X selecionável, desbloqueio por vitória e crescimento separado de vida, dano e brasas.
- Mãos Ligeiras, Visão Longa, Persistência, Sangue Antigo, Sabedoria, Bênção e Magnetismo.
- Guardião Sepulcral, Invocador da Cinza, Semeador da Praga, Estilhaçado, Sacerdote Pálido e Caçador da Bruma com comportamentos próprios.
- Grimório em formato de livro com páginas, marcadores, descoberta parcial/completa e adaptação para celular.
- Save v2 com migração automática, descobertas, Ameaça e estatísticas detalhadas.
- Jackpot, Veto, Visão e proteção contra azar aplicados às escolhas de nível.

### Alterado

- Besta da Vigília agora combina com Mãos Ligeiras; Peçonha da Viúva com Persistência; Lança com Visão Longa.
- Brasas da Lanterna de Cinzas e de Passos do Inferno ficaram discretamente mais visíveis.
- Eventos de Ameaça continuam silenciosos e não exibem títulos, banners ou pausas.

## 0.5.0 — 2026-07-30

### Adicionado

- Analógico virtual móvel com movimento contínuo, diagonal, intensidade e zona morta.
- Layout mobile com áreas seguras, suporte a altura dinâmica e adaptação entre retrato e paisagem.
- Dicas específicas para toque sem substituir instruções de teclado, mouse ou controle.
- Três testes Playwright mobile para menus, movimento, pausa, melhorias, HUD e ausência de rolagem horizontal.

### Alterado

- Controles de toque ficam isolados da entrada de teclado e gamepad e aparecem somente em dispositivos compatíveis.
- O analógico é suspenso automaticamente durante pausa, melhorias, morte e resultados.
- Cartões, painéis e alvos de toque respeitam dimensões móveis sem alterar a apresentação desktop.

## 0.4.0 — 2026-07-30

### Adicionado

- Eventos determinísticos aos 30, 60, 90, 105, 135, 165, 195, 205 e 225 segundos, sem títulos ou interrupções.
- Peçonha da Viúva, Lança e Lanterna de Cinzas, totalizando seis armas.
- Fúria Bárbara, Aura Divina, Viúva Negra, Empaladora e Passos do Inferno com dois níveis posteriores.
- Penitente Blindado, Arauto da Ruína e fragmentos de cura coletáveis.
- Simulação executável de limites de dano, fragilidade, lentidão, vulnerabilidade e cronograma.
- Perfis visuais independentes das regras para futura substituição dos placeholders por sprites.

### Alterado

- Brutamontes agora começa com 80 de vida, 5 de armadura e sem resistência por proximidade.
- Machado do Carrasco atinge apenas um arco frontal; Fúria Bárbara executa dois giros completos.
- Sino Fúnebre passou a se chamar Aura Celestial; Aura Divina cria uma área constante transparente com dano e lentidão reduzida em chefes.
- O veneno transferido dura metade do tempo restante; Viúva Negra amplia somente dano de outras fontes.
- Lança do Juramento passou a se chamar Lança e evolui para Empaladora.
- A evolução da Lanterna de Cinzas passou a se chamar Passos do Inferno.
- Cartas de melhoria mostram nível e valores atuais/próximos em uma interface mais compacta.

## 0.3.0 — 2026-07-30

### Adicionado

- Remapeamento persistente das quatro direções do teclado, com captura direta da tecla.
- Troca automática quando uma tecla já pertence a outra direção e restauração para WASD.
- Sequência procedural de morte com queda, alma, pulso, fragmentos e variante de efeitos reduzidos.
- Tela cinematográfica de **Game Over** antes do relatório da expedição.
- Testes unitários dos controles e Playwright cobrindo persistência, movimento remapeado, morte e game over.

### Alterado

- A sala de preparação ficou mais limpa com a remoção do stepper textual de aventureiro, contrato e partida.
- Setas e analógico continuam disponíveis junto das teclas personalizadas.
- A transição para o game over usa tempo real e não fica presa se o renderizador perder frames.

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
