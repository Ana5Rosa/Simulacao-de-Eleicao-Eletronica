// Opcional: somente em banco existente da versão antiga.
// Faça backup, confirme o banco e pare o servidor antes de executar.
// Remove campos que permitem correlacionar temporalmente participação e voto.
// Não altera os votos, seus vínculos ou as contagens.
MATCH (p:RegistroParticipacao) REMOVE p.registradoEm;
MATCH (v:Voto) REMOVE v.confirmadoEm;
