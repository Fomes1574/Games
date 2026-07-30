# Arquitetura técnica

## Camadas

1. `core`: RNG, tempo, matemática, eventos e validação.
2. `domain`: combate, ondas, progressão, economia e save; TypeScript puro.
3. `game`: Phaser, renderização, input, áudio, câmera e sincronização.
4. `ui`: menus HTML/CSS e acessibilidade.
5. `services`: IndexedDB, assets e telemetria.

As Scenes orquestram adaptadores; não calculam regras de dano ou progressão. Conteúdo é data-driven e validado antes do build.

`domain/weapons` contém tabelas tipadas de nível; `domain/encounters` contém o cronograma; `domain/combat/statusEffects` limita propagação, vulnerabilidade e lentidão. A Scene adapta essas decisões ao Phaser. Perfis visuais em `src/data/content.ts` permitem trocar placeholders por sprites e atlas sem alterar as regras.

`domain/input/touchMovement` normaliza o analógico virtual sem depender do DOM. `AppController` adapta Pointer Events para esse domínio e envia o vetor à Scene; teclado e gamepad mantêm caminhos próprios. A camada HTML de toque só é habilitada em dispositivo compatível e é suspensa quando a simulação não aceita movimento.

## Simulação

Passo fixo com acumulador limitado evita alterações de combate por FPS e espirais após perda de foco. Todos os sistemas recebem RNG com semente; `Math.random()` é proibido no domínio.

## Hospedagem

SPA sem rotas de servidor, `base` `/Games/`, assets relativos ao `import.meta.env.BASE_URL` e deploy estático pelo GitHub Pages.
