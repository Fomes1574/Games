# Orçamento de desempenho

Alvo normal: 60 FPS, frame time ≤16,67 ms, 250–350 inimigos, quatro armas e partículas moderadas. Intenso: 500–650 inimigos ainda jogáveis. Estresse: até 1.000 inimigos simplificados para diagnóstico.

Medir FPS, p95/p99 de frame time, entidades, memória, consultas espaciais, IA, combate e spawn. Não pode haver crescimento contínuo de memória.

Otimizar somente com evidência: pooling, spatial hash, culling, IA intervalada, agrupamento de pickups e redução adaptativa de efeitos.

## Baseline do Marco 1

Build de 2026-07-28: HTML 0,85 kB gzip, CSS 1,43 kB gzip e JavaScript 359,43 kB gzip. O chunk inicial ultrapassa o aviso padrão de 500 kB sem compressão por incluir Phaser; divisão e carregamento progressivo serão medidos quando existirem cenas e pacotes de conteúdo.

## Baseline da fatia jogável 0.2.0

Build de 2026-07-30: HTML 3,47 kB gzip, CSS 4,98 kB gzip e JavaScript 371,15 kB gzip. O acréscimo inclui a sala de preparação, HUD completo, sistemas da expedição e cenário procedural em paralaxe. O JavaScript continua acima do aviso padrão de 500 kB sem compressão pelo Phaser; a próxima medição deve separar o motor do código da aplicação e registrar p95/p99 de frame time com 250, 500 e 1.000 inimigos.
