# Limitações conhecidas

## Versão 0.3

- A arte e os personagens ainda usam formas vetoriais/procedurais provisórias.
- O áudio ainda não foi implementado.
- Esc permanece reservado para pausa; as quatro direções aceitam as demais teclas físicas identificadas pelo navegador.
- O teste Playwright local depende do Chromium; neste ambiente o espelho de download devolve arquivo truncado, portanto o navegador real é executado no GitHub Actions.
- O cenário usa consulta linear de inimigos; spatial hash e pooling pertencem ao marco de desempenho.

Esses itens são escopo declarado, não requisitos concluídos.
