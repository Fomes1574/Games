# Modelo de balanceamento

O simulador sem renderização usará sementes fixas e agentes parado, circular, evasivo, coletor, caçador de elites, aleatório, sinérgico, defensivo e agressivo.

Métricas mínimas: vitória, tempo de morte, nível, dano por arma, dano recebido, cura, mortes, elites, chefe, escolhas, evoluções, recursos e XP perdida.

Alertas: arma dominante/inútil, evolução impossível, escolha universal, combinação invencível, personagem inviável, onda impossível e crescimento infinito. Ajustes não são automáticos: todo rebalanceamento exige relatório.

## Baseline 0.4

- Vida 80, armadura 5, resistência por cerco 0 e 0,25 s de proteção contra impactos simultâneos.
- Aura Divina pulsa a cada 0,5 s; lentidão máxima de 30% em comuns e 12% em chefes.
- Viúva Negra não amplia o próprio veneno, limita vulnerabilidade a 20% e mantém três acúmulos.
- Veneno transferido não volta a se propagar e conserva apenas metade do tempo restante.
- `npm run simulate` reprova dano sustentado fora do intervalo inicial, lentidão de chefe inválida ou vulnerabilidade excessiva.

## Progressão 0.6

- Ameaça usa `vida × 1,18^(nível-1)`, `dano × 1,07^(nível-1)` e `brasas × 1,15^(nível-1)`; velocidade não escala exponencialmente.
- Dano permanente termina em +32%; Vida termina em +50 e mantém a base inicial em 80 antes do legado.
- Regeneração permanente termina em 0,20/s e não recebe o multiplicador de Cura.
- Ressureição possui uma carga, retorna com 50% da vida e bloqueia dano por um segundo.
- Bônus permanentes são aditivos sobre a base e não alteram a Ameaça automaticamente.
