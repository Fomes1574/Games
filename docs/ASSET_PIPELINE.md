# Pipeline de assets

1. `npm run assets:plan`: lista manifestos pendentes sem custo.
2. `npm run assets:generate`: exige `OPENAI_API_KEY`, limites explícitos e execução manual.
3. `npm run assets:process`: recorta, normaliza e otimiza.
4. `npm run assets:validate`: bloqueia dimensões, alfa, bordas e referências inválidas.
5. `npm run assets:atlas`: inclui apenas aprovados.
6. `npm run assets:report`: gera inventário e reprovações.

Cada item registra prompt, restrições, referência, modelo, data, versão, seed, dimensões, estado, tentativas, hash e custo estimado. Falhas são retomáveis e seletivas. Sem API, placeholders e manifestos mantêm o jogo funcional.
