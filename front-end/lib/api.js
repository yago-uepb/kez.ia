
// Ajuste conforme o ambiente (dev/staging/prod).
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", body, params } = {}) {
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([chave, valor]) => {
      if (valor === undefined || valor === null || valor === "") return;
      if (Array.isArray(valor)) valor.forEach((item) => qs.append(chave, item));
      else qs.append(chave, valor);
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const res = await fetch(url, {
    method,
    headers: isFormData
      ? undefined
      : body !== undefined
        ? { "Content-Type": "application/json" }
        : undefined,
    body:
      body !== undefined
        ? isFormData
          ? body
          : JSON.stringify(body)
        : undefined,
  });
  if (!res.ok) {
    let detalhe = "";
    try {
      const j = await res.json();
      detalhe = j?.detail
        ? typeof j.detail === "string"
          ? j.detail
          : JSON.stringify(j.detail)
        : "";
    } catch {
      /* corpo não era JSON */
    }
    throw new ApiError(
      detalhe || `Falha em ${method} ${path} (HTTP ${res.status})`,
      res.status,
    );
  }
  if (res.status === 204) return null;
  const texto = await res.text();
  return texto ? JSON.parse(texto) : null;
}

/**
 * Camada fina sobre os endpoints do back-end. Cada método corresponde
 * diretamente a uma rota documentada — mantenha 1:1 para facilitar auditoria.
 */
export const Api = {
  // Listas
  listarListas: () => request("/lists"),
  obterLista: (id) => request(`/lists/${id}`), // ListDetailResponse: inclui .problems
  criarLista: (body) => request("/lists", { method: "POST", body }),
  editarLista: (id, body) => request(`/lists/${id}`, { method: "PATCH", body }),
  excluirListas: (ids) =>
    request("/lists", { method: "DELETE", body: { ids } }),

  // Vínculo lista <-> problema
  adicionarProblemasNaLista: (listId, problems) =>
    request(`/lists/${listId}/problems`, {
      method: "POST",
      body: { problems },
    }),
  vincularProblema: (listId, problemId) =>
    request("/list-problems", {
      method: "POST",
      body: { list_id: listId, problem_id: problemId },
    }),
  desvincularProblema: (listId, problemId) =>
    request("/list-problems", {
      method: "DELETE",
      body: { list_id: listId, problem_id: problemId },
    }),

  // Problemas
  obterProblema: (id) => request(`/problems/${id}`),
  editarProblema: (id, body) =>
    request(`/problems/${id}`, { method: "PATCH", body }),
  excluirProblemas: (ids) =>
    request("/problems", { method: "DELETE", body: { ids } }),
  problemasAleatorios: ({ listsIds, excludedIds, quantity } = {}) =>
    request("/problems/random", {
      params: {
        lists_ids: listsIds,
        excluded_problem_ids: excludedIds,
        quantity,
      },
    }),

  // Casos de teste
  // GET  /problems/{id}/test-cases -> { sample_case, remaining_cases }
  // POST /problems/{id}/test-cases -> aceita de 1 a 10 casos por chamada
  // PUT  /test-cases               -> atualiza de 1 a 10 casos já existentes
  // DELETE /test-cases             -> exclui por ids
  listarCasosDeTeste: (problemId) =>
    request(`/problems/${problemId}/test-cases`),

  criarCasosDeTeste: (problemId, testCases) =>
    request(`/problems/${problemId}/test-cases`, {
      method: "POST",
      body: { test_cases: testCases },
    }),

  atualizarCasosDeTeste: (testCases) =>
    request("/test-cases", {
      method: "PUT",
      body: { test_cases: testCases },
    }),

  excluirCasosDeTeste: (ids) =>
    request("/test-cases", { method: "DELETE", body: { ids } }),

  // Submissão (execução + correção + revisão de IA acontecem no back-end)
  enviarSolucao: (problemId, attempt) =>
    request("/submits", {
      method: "POST",
      body: { problem_id: problemId, attempt },
    }),

  // IA auxiliar
  extrairQuestoesDeDocumento: (arquivo) => {
    const formData = new FormData();
    formData.append("file", arquivo, arquivo.name);
    return request("/ai/documents/extract-questions", {
      method: "POST",
      body: formData,
    });
  },

  sugerirCasosDeTeste: (questions) =>
    request("/ai/suggest-test-cases", { method: "POST", body: { questions } }),
};
