export function listaApiParaUi(l, ordem) {
  return {
    id: l.id,
    titulo: l.name,
    descricao: l.description || "Sem descrição.",
    oculta: !!l.is_hidden, // persistido de verdade via PATCH /lists/{id}
    ordem,
  };
}

export function problemaApiParaUi(p, listaId, ordem) {
  return {
    id: p.id,
    listaId,
    titulo: p.title,
    enunciado: p.description,
    entradaSaida: {
      entrada: p.input ? p.input : "— (sem entrada)",
      saida: p.expected_output,
    },
    saidaEsperada: p.expected_output,
    // Não existe "starter code" persistido no back-end (ver GAPS) — usamos um
    // texto padrão só de apresentação.
    starter: "# Escreva sua solução abaixo.\n\n",
    ordem,
    // "oculta" para exercícios não é persistida (problems não tem is_hidden
    // no banco) — é somente local/cliente nesta sessão. Ver GAPS no final.
    oculta: false,
  };
}