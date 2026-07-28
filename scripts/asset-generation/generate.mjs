if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    'OPENAI_API_KEY ausente. A geração é manual e nunca ocorre no navegador.',
  );
}

throw new Error(
  'Geração paga ainda não habilitada. Aprove primeiro a prova visual e o orçamento.',
);
