# Formato de save

Configurações pequenas usam `localStorage`; progresso e estatísticas usam IndexedDB em transações. O envelope terá `version`, `id`, `createdAt`, `updatedAt`, `payload` e checksum.

Importação limita tamanho, valida tipos, faixas, IDs e versão antes de substituir. Uma gravação cria backup anterior; migrações são sequenciais e testadas. Nenhum campo importado é executado ou injetado como HTML.
