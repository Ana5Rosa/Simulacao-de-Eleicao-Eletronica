# Correções realizadas e validação pendente

Projeto: Sistema de Simulação de Eleição Eletrônica. A arquitetura original (Node.js, TypeScript, Express, Neo4j, módulos Routes/Controller/Service/Repository) foi mantida. Não foram incluídas novas dependências.

## Alterações

| Item | Implementação |
|---|---|
| Integridade da votação | `votacao.repository.ts` verifica eleição aberta, eleitor ativo, candidato da eleição e participação dentro da mesma transação. Se a gravação falhar, a participação também é revertida. |
| Concorrência | `shared/transacoes.ts`, `eleicoes.repository.ts` e `candidatos.repository.ts` usam o mesmo lock de escrita na eleição. Transições só avançam. Alteração de candidato é atômica, com locks das eleições de origem e destino. |
| Candidatos | Cadastro, alteração e exclusão permitidos somente enquanto a eleição estiver AGENDADA. Número eleitoral único na eleição, validado sob lock. O candidato permanece registrado após a abertura para preservar os votos. |
| Sigilo | Votos e participações não armazenam horários individuais novos. O identificador interno do voto não é devolvido ao eleitor. O retorno contém mensagem e cargo. |
| Eleitores excluídos | Exclusão lógica (`ativo=false`), remoção de `senhaHash`, impedimento de login e de uso de JWT antigo; a votação também confirma o estado do eleitor sob lock. E-mail permanece reservado para impedir recadastro com o mesmo e-mail após exclusão. |
| Autenticação | JWT HS256 com segredo obrigatório (32 caracteres ou mais); credenciais do administrador obrigatórias no `.env`. Sem valores fixos de produção. |
| Banco | Criação automática das seis constraints antes de atender requisições; conexão inicializada sob demanda. |
| Validação | E-mail, texto não vazio, senha, número eleitoral como string de dígitos, data real AAAA-MM-DD, horários HH:mm e turno (`1º Turno` ou `2º Turno`). Encerramento posterior à abertura. |
| Resultados | Ordenação explícita por quantidade de votos. Empates com votos retornam todos os mais votados; se todos têm zero, `maisVotado` é uma lista vazia. |
| Documentação | Swagger com corpos PUT e exemplos atualizados; README atualizado; `.env.example` sem senhas reais. |
| Testes | Atualização dos testes antigos, testes unitários de transações e um fluxo HTTP com banco real, incluindo requisições concorrentes. |

## O que foi verificado neste ambiente

- Conferência do código-fonte e transpilação isolada dos 38 arquivos TypeScript com o compilador global, sem erros de sintaxe.
- Verificações isoladas adicionais com `node:assert/strict` e driver simulado passaram: validação de data, hora, turno e senha; bloqueio de voto encerrado, inativo e duplicado; confirmação sem ID; transição inválida; bloqueio de exclusão de candidato e ordenação do resultado. Não equivalem à suíte Jest nem validam Cypher no Neo4j.
- A instalação via `npm ci` não foi concluída: o ambiente retornou `EAI_AGAIN` ao acessar `registry.npmjs.org`.
- `npm run build` não completou devido à falta das definições de tipo de Jest e Node. `npm test` não executou porque Jest não foi instalado. Não há instância Neo4j configurada neste ambiente.
- Portanto, a compilação completa, o resultado do Jest e as consultas Cypher reais ainda devem ser confirmados. Os testes com mocks não substituem os testes com banco.

## Passos para verificar no seu computador (PowerShell)

1. Extraia o ZIP. Abra o terminal na pasta `backend`.
2. Execute `npm ci`. Use o Node.js 22 ou superior; se a instalação acusar incompatibilidade, confira o erro e os requisitos do pacote informado. Não altere o lockfile sem necessidade.
3. Execute `Copy-Item .env.example .env` apenas se não existir `.env`. Configure suas credenciais Neo4j e do Chefe. Gere o JWT com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Não compartilhe nem versione `.env`.
4. Execute `npm run build` e `npm test -- --runInBand`. Observe os erros, caso existam. A suíte real estará pulada por padrão.
5. Para testar o Neo4j, aponte o `.env` para uma instância **exclusiva de testes**, execute `$env:RUN_NEO4J_TESTS = '1'`, `npm test -- --runInBand` e depois `Remove-Item Env:RUN_NEO4J_TESTS`. Verifique se todos passam e se a suíte real deixou de ser pulada. Os dados criados pelo teste são identificados e removidos ao final; as constraints e cargos permanecem.
6. Execute `npm run dev` e acesse `http://localhost:3000/api-docs`. Faça login usando as credenciais do `.env`.

## Roteiro de demonstração no Swagger

| Ação | Resultado esperado |
|---|---|
| Login como Chefe | 200 com JWT |
| Criar eleição, eleitores e candidatos | 201; eleição AGENDADA |
| Alterar e excluir candidato antes da abertura | 200 e 204 |
| Login como eleitor e tentar votar antes da abertura | 400 |
| Abrir como Chefe | 200; ABERTA |
| Tentar alterar/excluir candidato durante votação | 400 |
| Tentar votar como candidato ou Chefe | 403 |
| Votar como eleitor | 201, mensagem e cargo, sem protocolo |
| Votar no mesmo cargo novamente | 400 |
| Votar em outro cargo | 201 |
| Consultar `/votacao/meus-status/{eleicaoId}` | Cargos votados, não candidatos |
| Consultar acompanhamento como candidato | Somente seu cargo |
| Consultar acompanhamento como eleitor | Todos os cargos com candidatos |
| Excluir outro eleitor e tentar usar seu token anterior | 401 |
| Encerrar como Chefe e tentar novo voto | 400 |
| Consultar resultado final | 200, totais e mais votados |
| Tentar reabrir ou alterar candidatos | 400; resultado permanece igual |

## Banco da versão antiga

Prefira uma instância nova para a apresentação. Se precisar manter dados antigos:

1. Faça backup/exportação e pare o servidor antigo.
2. Execute as duas consultas de `backend/database/migracao-sigilo.cypher` no Neo4j Query, separadamente. Elas removem somente os campos temporais. Protocolos já fornecidos, backups e logs históricos não são revogados por essa migração.
3. A versão nova normaliza novos e-mails para minúsculas. Se houver e-mails antigos em maiúsculas, confira se a normalização causaria duplicidades antes de alterar os registros, ou recrie os usuários de demonstração em um banco novo. Não normalize cegamente.
4. Se a inicialização apontar violações de constraints, analise os registros duplicados e corrija-os manualmente com backup. Não exclua votos indiscriminadamente. A versão nova não reconstitui votos ou vínculos já perdidos no sistema antigo.
