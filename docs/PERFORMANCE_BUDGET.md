# Orçamento de desempenho

Alvo normal: 60 FPS, frame time ≤16,67 ms, 250–350 inimigos, quatro armas e partículas moderadas. Intenso: 500–650 inimigos ainda jogáveis. Estresse: até 1.000 inimigos simplificados para diagnóstico.

Medir FPS, p95/p99 de frame time, entidades, memória, consultas espaciais, IA, combate e spawn. Não pode haver crescimento contínuo de memória.

Otimizar somente com evidência: pooling, spatial hash, culling, IA intervalada, agrupamento de pickups e redução adaptativa de efeitos.

## Baseline do Marco 1

Build de 2026-07-28: HTML 0,85 kB gzip, CSS 1,43 kB gzip e JavaScript 359,43 kB gzip. O chunk inicial ultrapassa o aviso padrão de 500 kB sem compressão por incluir Phaser; divisão e carregamento progressivo serão medidos quando existirem cenas e pacotes de conteúdo.

## Baseline da fatia jogável 0.2.0

Build de 2026-07-30: HTML 3,47 kB gzip, CSS 4,98 kB gzip e JavaScript 371,15 kB gzip. O acréscimo inclui a sala de preparação, HUD completo, sistemas da expedição e cenário procedural em paralaxe. O JavaScript continua acima do aviso padrão de 500 kB sem compressão pelo Phaser; a próxima medição deve separar o motor do código da aplicação e registrar p95/p99 de frame time com 250, 500 e 1.000 inimigos.

## Baseline de controles e game over 0.3.0

Build de 2026-07-30: HTML 3,87 kB gzip, CSS 5,70 kB gzip e JavaScript 373,28 kB gzip. A diferença inclui remapeamento persistente, animação procedural de morte e a tela de game over. O alerta de chunk inicial permanece ligado ao Phaser e continua registrado para divisão no marco de desempenho.

## Baseline de combate e formações 0.4.0

Build de 2026-07-30: HTML 3,86 kB gzip, CSS 5,92 kB gzip e JavaScript 379,59 kB gzip. A diferença inclui seis armas, seis evoluções, efeitos de estado, cura, formações temporizadas e novos inimigos. A simulação determinística cobre 236 inimigos agendados; a medição de p95/p99 com as metas de 250, 500 e 1.000 entidades continua reservada ao marco de desempenho.

## Baseline mobile 0.5.0

Build de 2026-07-30: HTML 4,13 kB gzip, CSS 7,15 kB gzip e JavaScript 380,41 kB gzip. O acréscimo corresponde ao analógico virtual, áreas seguras e regras responsivas; não adiciona biblioteca nem loop de renderização. O alerta do chunk inicial continua ligado ao Phaser.

## Baseline de legado e Grimório 0.6.0

Build de 2026-07-31: HTML 4,89 kB gzip, CSS 8,88 kB gzip e JavaScript 388,24 kB gzip. Progressão, Grimório e Ameaça usam dados e HTML/CSS sem nova biblioteca. A simulação determinística contém 266 inimigos agendados somando todos os níveis; somente as ondas permitidas pela Ameaça escolhida entram em uma partida.
