# Deploy

O repositório de projeto usa <https://fomes1574.github.io/Games/> e Vite `base: '/Games/'`.

1. Execute `npm ci` e `npm run verify`.
2. Faça push na `main`.
3. `ci.yml` valida a revisão.
4. `deploy.yml` repete os portões, configura Pages, envia `dist` e publica.
5. Verifique URL, canvas, console, assets, início e versão.

O workflow solicita somente `contents: read`, `pages: write` e `id-token: write`. Concorrência cancela deploy antigo. A primeira execução usa `enablement: true` para habilitar Pages quando permitido.
