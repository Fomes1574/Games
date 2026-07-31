# Plano de testes

- Unitário: RNG, dano, status, XP, escolhas, evoluções, economia, save, controles e ondas.
- Integração: início, pausa, nível, chefe, resultado, guilda e armazenamento.
- E2E: aplicativo real, teclado padrão/remapeado, persistência, escolhas, vitória/derrota forçadas, morte, game over, reload e erros.
- Visual: menu, seleção, combate, chefe, morte, game over, resultado, guilda e cena lotada no mesmo ambiente.
- Balanceamento: centenas de sementes por arquétipo.
- Desempenho: cenários normal, intenso e estresse.

Na versão 0.4, unitários verificam cronograma, metade da duração do veneno transferido, vulnerabilidade sem autoamplificação, lentidão menor no chefe, limites de armas e níveis posteriores. Playwright confirma 80/5, cartas compactas e a formação dos 30 segundos sem modal.

Na versão 0.5, o projeto Chromium desktop continua executando a suíte anterior sem controles móveis visíveis. Um projeto Chromium com toque em 390×844 cobre menus sem overflow, analógico virtual, pausa, suspensão durante melhorias e reorganização em paisagem 844×390.

Na versão 0.6, unitários cobrem custos e limites permanentes, Ressureição, fórmulas de Ameaça, migração v1→v2, novas sinergias e eventos condicionais. Playwright cobre os dezessete cards, bloqueio de Ameaça, Grimório e passagem de índice para página em celular.

E2E falha em exceção, console crítico, 404, canvas ausente, tela preta ou carregamento infinito. Falhas preservam trace, screenshot, vídeo e estado.
