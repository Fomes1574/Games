# Limitações conhecidas

## Versão 0.2

- A arte e os personagens ainda usam formas vetoriais/procedurais provisórias.
- Áudio e remapeamento de controles ainda não foram implementados.
- O teste Playwright local depende do Chromium; neste ambiente o espelho de download devolve arquivo truncado, portanto o navegador real é executado no GitHub Actions.
- O cenário usa consulta linear de inimigos; spatial hash e pooling pertencem ao marco de desempenho.

Esses itens são escopo declarado, não requisitos concluídos.
