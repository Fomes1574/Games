# Plano de testes

- Unitário: RNG, dano, status, XP, escolhas, evoluções, economia, save, controles e ondas.
- Integração: início, pausa, nível, chefe, resultado, guilda e armazenamento.
- E2E: aplicativo real, teclado padrão/remapeado, persistência, escolhas, vitória/derrota forçadas, morte, game over, reload e erros.
- Visual: menu, seleção, combate, chefe, morte, game over, resultado, guilda e cena lotada no mesmo ambiente.
- Balanceamento: centenas de sementes por arquétipo.
- Desempenho: cenários normal, intenso e estresse.

Na versão 0.4, unitários verificam cronograma, metade da duração do veneno transferido, vulnerabilidade sem autoamplificação, lentidão menor no chefe, limites de armas e níveis posteriores. Playwright confirma 80/5, cartas compactas e a formação dos 30 segundos sem modal.

E2E falha em exceção, console crítico, 404, canvas ausente, tela preta ou carregamento infinito. Falhas preservam trace, screenshot, vídeo e estado.
