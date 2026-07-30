# Limitações conhecidas

## Versão 0.5

- A arte e os personagens ainda usam formas vetoriais/procedurais provisórias.
- O áudio ainda não foi implementado.
- Esc permanece reservado para pausa; as quatro direções aceitam as demais teclas físicas identificadas pelo navegador.
- O teste Playwright depende de Chromium compatível; o CI instala a versão fixada pelo projeto.
- O cenário usa consulta linear de inimigos; spatial hash e pooling pertencem ao marco de desempenho.
- Os perfis visuais e conjuntos de animação já estão separados dos atributos de combate, mas os sprites finais ainda não existem.
- A interface mobile funciona em retrato e paisagem; instalação como aplicativo/PWA e suporte offline completo ainda não fazem parte deste marco.

Esses itens são escopo declarado, não requisitos concluídos.
