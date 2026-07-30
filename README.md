# A Última Companhia

Survivors-like 2D dark fantasy para navegador. O jogador comanda uma das últimas guildas vivas em um mundo de noite permanente, envia aventureiros a expedições e retorna com recursos para ampliar suas possibilidades.

> Estado atual: versão 0.5 — fatia vertical jogável em computador e celular, com eventos cronometrados silenciosos, seis armas, seis evoluções, inimigos de suporte e defesa, cura em campo, controles remapeáveis, morte, game over, chefe, guilda e save local.

## Executar

Requisitos: Node.js 24 LTS e npm 11.

```bash
npm ci
npm run dev
```

Abra `http://localhost:4173/Games/`.

## Validar

```bash
npm run verify
npm run test:e2e
```

O build de produção fica em `dist/`. Para testá-lo:

```bash
npm run preview
```

## Publicação

Pushes na `main` executam CI e publicam no GitHub Pages pelo workflow `deploy.yml`.

URL esperada: <https://fomes1574.github.io/Games/>

O Vite usa `base: '/Games/'`; não introduza caminhos absolutos como `/assets/...`.

## Estrutura

- `src/core` e `src/domain`: regras determinísticas sem Phaser.
- `src/game`: cenas e adaptadores Phaser.
- `src/ui`: interface HTML/CSS.
- `src/data`: conteúdo validado.
- `scripts`: assets, balanceamento, validações e release.
- `tests`: unitários, integração, navegador, visual e desempenho.
- `docs`: decisões, especificações e critérios mensuráveis.

## Segurança

O jogo é totalmente estático. Não existem chaves ou APIs privadas no navegador. `OPENAI_API_KEY` poderá ser usada apenas por ferramentas locais/manuais de arte e jamais é versionada.

## Jogar

1. Escolha **Preparar expedição**.
2. Revise o Brutamontes e o contrato da Charneca dos Sinos.
3. Use uma semente opcional ou deixe o campo vazio.
4. Escolha **Assinar contrato e partir**.
5. Mova-se com WASD, setas ou controle; as armas atacam automaticamente.
6. Em **Configurações**, selecione qualquer direção e pressione uma nova tecla para remapear o movimento. Esc permanece reservado para pausa.

No celular, mova-se pelo analógico virtual no canto inferior esquerdo. Melhorias, pausa e menus respondem diretamente ao toque; retrato e paisagem são suportados.

O Brutamontes começa com 80 de vida, 5 de armadura e nenhuma resistência oculta por estar cercado. O limite inicial é de quatro armas por build.

Licença ainda não definida; não reutilize código ou arte sem autorização do proprietário.
