# Especificação de animação

Personagens: células até 128×128, quatro direções inicialmente, pivô fixo nos pés e arma separada quando necessário. Estados: idle, caminhada, ataque, habilidade, dano, morte, vitória e interação.

Inimigos comuns usam 64×64 ou 96×96; elites até 128×128; chefes até 256×256. Loops não podem alterar roupa, arma, proporções ou posição dos pés. Efeitos e telegráficos são camadas independentes e respeitam redução de flashes e partículas.

Cada definição de inimigo possui `profileId`, `animationSet` e escala visual. IA, hitbox e estados de combate não dependem da textura. A troca dos círculos por sprites deve preservar os estados `spawn`, `idle`, `move`, `attack`, `hurt` e `death`, com `aim`/`cast` para unidades à distância.

Aura Divina usa preenchimento de baixa opacidade e borda discreta; veneno usa um anel de estado separado do corpo; brasas e golpes são efeitos independentes. Nenhuma dessas camadas pode ocultar a silhueta dos inimigos.
