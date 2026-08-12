"use client";

/* =============================================================================
   KEZIA — Bancada de exercícios de Python
   -----------------------------------------------------------------------------
   Arquivo único por enquanto, mas dividido em blocos claramente demarcados
   para facilitar uma futura separação em múltiplos arquivos/páginas:

     1. CONFIG / CAMADA DE API        -> lib/api.js
     2. UTILITÁRIOS COMPARTILHADOS    -> lib/utils.js
     3. MAPEADORES API -> UI          -> lib/mappers.js
     4. SUBCOMPONENTES REUTILIZÁVEIS  -> components/*
     5. PÁGINA: LISTAS                -> pages/ListasPage.jsx
     6. PÁGINA: EXERCÍCIOS DA LISTA   -> pages/ExerciciosPage.jsx
     7. PÁGINA: EXERCÍCIO / ENVIO     -> pages/ExercicioPage.jsx
     8. MODAIS (criação/edição/scan)  -> components/modals/*
     9. COMPONENTE RAIZ (orquestra)   -> app/page.jsx

   Este arquivo foi refatorado para consumir o back-end real (rotas e schemas
   fornecidos), no lugar de: (a) rodar Python no navegador via Pyodide e
   (b) chamar a API da Anthropic diretamente do front-end. Consulte o
   comentário "GAPS DE BACK-END" no fim do arquivo para a lista de
   funcionalidades do front que hoje não têm suporte completo no back-end.
   ============================================================================= */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  Clock,
  Bot,
  Sun,
  Moon,
  ArrowLeft,
  ArrowRight,
  PartyPopper,
  X,
  Plus,
  Shuffle,
  ListChecks,
  MoreVertical,
  Pencil,
  EyeOff,
  Eye,
  Trash2,
  Lock,
  ScanLine,
  FileWarning,
  Wand2,
  CheckSquare,
  Square,
  FlaskConical,
  Dices,
} from "lucide-react";
import Image from "next/image";

const LINE_HEIGHT_PX = 22;

/* =============================================================================
   1. CONFIG / CAMADA DE API
   ============================================================================= */

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
const Api = {
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

/* =============================================================================
   2. UTILITÁRIOS COMPARTILHADOS
   ============================================================================= */

function normalizarQuebraDeLinha(valor) {
  if (valor == null) return "";
  return String(valor)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\n/g, "\n");
}

function normalizarCasoDeTeste(caso) {
  return {
    ...caso,
    input: caso?.input == null ? null : normalizarQuebraDeLinha(caso.input),
    expected_output:
      caso?.expected_output == null
        ? ""
        : normalizarQuebraDeLinha(caso.expected_output),
  };
}

function previewDe(texto, max = 92) {
  const limpo = (texto || "").trim();
  if (limpo.length <= max) return limpo;
  return limpo.slice(0, max).trim() + "…";
}

function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function slugificar(texto) {
  return (texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* Erros Python -> explicação didática (independe do back-end, é só apresentação) */
function explicarErro(textoErro) {
  const mapa = [
    {
      chave: "IndentationError",
      titulo: "Erro de indentação",
      explicacao:
        "O Python usa a indentação para saber o que está dentro de um laço, função ou condicional. Alguma linha está com espaços a mais, a menos, ou misturando tabs e espaços.",
      dica: "Confira se todas as linhas de um mesmo bloco começam com a mesma quantidade de espaços.",
    },
    {
      chave: "SyntaxError",
      titulo: "Erro de sintaxe",
      explicacao:
        "O interpretador não conseguiu entender essa linha — geralmente falta um `:` no final de um for/if/def, um parêntese não foi fechado, ou há um caractere fora do lugar.",
      dica: "Olhe a linha indicada no detalhe técnico e confira parênteses, dois-pontos e aspas.",
    },
    {
      chave: "NameError",
      titulo: "Nome não definido",
      explicacao:
        "Seu código usa uma variável ou função que ainda não existe nesse ponto — provavelmente um nome digitado errado ou usado antes de ser criado.",
      dica: "Confira a grafia do nome e se a variável foi criada antes da linha onde é usada.",
    },
    {
      chave: "TypeError",
      titulo: "Tipo incompatível",
      explicacao:
        "Você tentou uma operação entre tipos que não combinam — por exemplo, somar texto com número, ou chamar algo que não é função.",
      dica: "Use `int()` ou `str()` para converter valores antes de misturá-los.",
    },
    {
      chave: "ZeroDivisionError",
      titulo: "Divisão por zero",
      explicacao: "O código tentou dividir um número por zero.",
      dica: "Verifique o divisor antes da divisão, ou trate esse caso com um `if`.",
    },
    {
      chave: "IndexError",
      titulo: "Índice fora do intervalo",
      explicacao:
        "Seu código tentou acessar uma posição de uma lista (ou string) que não existe.",
      dica: "A contagem começa em 0 e vai até `len(lista) - 1`.",
    },
    {
      chave: "KeyError",
      titulo: "Chave inexistente",
      explicacao:
        "Seu código tentou acessar uma chave que não existe em um dicionário.",
      dica: "Use `dicionario.get(chave)` ou confirme antes com `if chave in dicionario`.",
    },
    {
      chave: "ValueError",
      titulo: "Valor inválido",
      explicacao:
        "Uma função recebeu um valor do tipo certo, mas com conteúdo inválido.",
      dica: "Confira o valor antes de convertê-lo, por exemplo com `.isdigit()`.",
    },
    {
      chave: "AttributeError",
      titulo: "Atributo inexistente",
      explicacao:
        "Você chamou um método ou atributo que não existe para esse tipo de objeto.",
      dica: "Confira a grafia do método e o tipo real do valor.",
    },
    {
      chave: "EOFError",
      titulo: "Entrada de dados não suportada aqui",
      explicacao:
        "Seu código usa `input()`, mas este exercício não fornece entrada pelo teclado — os valores já vêm definidos como variáveis.",
      dica: "Remova o `input()` e use diretamente a variável fornecida no enunciado.",
    },
    {
      chave: "ModuleNotFoundError",
      titulo: "Módulo não disponível",
      explicacao:
        "O código importa uma biblioteca que não está disponível neste ambiente.",
      dica: "Use apenas módulos padrão do Python (math, random, etc).",
    },
  ];
  const encontrado = mapa.find((m) => (textoErro || "").includes(m.chave));
  if (encontrado) return encontrado;
  return {
    titulo: "Erro ao executar o código",
    explicacao: "Algo impediu a execução completa do seu programa.",
    dica: "Veja o detalhe técnico para localizar a linha exata do problema.",
  };
}

/* diff simples por prefixo/sufixo comum */
function diffSimples(esperado, obtido) {
  esperado = esperado ?? "";
  obtido = obtido ?? "";
  let i = 0;
  const maxPrefixo = Math.min(esperado.length, obtido.length);
  while (i < maxPrefixo && esperado[i] === obtido[i]) i++;
  let j = 0;
  const maxSufixo = Math.min(esperado.length - i, obtido.length - i);
  while (
    j < maxSufixo &&
    esperado[esperado.length - 1 - j] === obtido[obtido.length - 1 - j]
  )
    j++;
  return {
    prefixo: esperado.slice(0, i),
    meioEsperado: esperado.slice(i, esperado.length - j),
    meioObtido: obtido.slice(i, obtido.length - j),
    sufixo: esperado.slice(esperado.length - j),
  };
}

/* validação do formulário de criação/edição de exercício (front-end) */
function validarFormExercicio(f) {
  const erros = {};
  if (!f.titulo.trim() || f.titulo.trim().length < 3)
    erros.titulo = "Informe um título com pelo menos 3 caracteres.";
  if (!f.enunciado.trim() || f.enunciado.trim().length < 15)
    erros.enunciado = "Descreva o enunciado com pelo menos 15 caracteres.";
  if (!f.listaId)
    erros.listaId = "Escolha uma lista existente ou crie uma nova.";
  if (
    f.listaId === "__nova__" &&
    (!f.novaListaNome.trim() || f.novaListaNome.trim().length < 3)
  ) {
    erros.novaListaNome = "Dê um nome (mín. 3 caracteres) para a nova lista.";
  }
  const casosValidos = f.testCases.filter(
    (tc) => tc.expected_output.trim().length > 0,
  );
  if (casosValidos.length === 0) {
    erros.testCases =
      "Adicione ao menos um caso de teste com saída esperada preenchida.";
  }
  if (casosValidos.length > 10) {
    erros.testCases = "No máximo 10 casos de teste por exercício.";
  }
  return erros;
}

const arquivoParaBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/* =============================================================================
   3. MAPEADORES API -> UI
   -----------------------------------------------------------------------------
   O back-end fala em inglês/estrutura de banco (name, title, description,
   input, expected_output, is_hidden…). O front mantém os rótulos em
   português usados na UI original (titulo, enunciado, entradaSaida…) para
   preservar 100% da identidade visual e o texto já escrito. Estes
   mapeadores isolam essa tradução em um único lugar.
   ============================================================================= */

function listaApiParaUi(l, ordem) {
  return {
    id: l.id,
    titulo: l.name,
    descricao: l.description || "Sem descrição.",
    oculta: !!l.is_hidden, // persistido de verdade via PATCH /lists/{id}
    ordem,
  };
}

function problemaApiParaUi(p, listaId, ordem) {
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

/* =============================================================================
   4. SUBCOMPONENTES REUTILIZÁVEIS
   ============================================================================= */

/** Editor de casos de teste usado no modal de criação/edição de exercício.
 *  Mapeia diretamente para o schema `TestCases { input, expected_output }`
 *  usado tanto em `ProblemCreate.test_cases` quanto (em lote, até 10 por
 *  chamada) no endpoint `POST /problems/{id}/test-cases`. O primeiro caso
 *  da lista é também o usado como amostra (Entrada/Saída esperada) exibida
 *  no painel do exercício, pois é o que fica salvo nas colunas
 *  `input`/`expected_output` da tabela `problems`. Usa `<textarea>` (e não
 *  `<input>`) para que quebras de linha em entradas/saídas multilinha
 *  fiquem visíveis e possam ser digitadas de verdade. */
function EditorCasosDeTeste({ casos, onChange, sugerindo, onSugerir, erro }) {
  const atualizarCaso = (idx, campo, valor) => {
    const novos = casos.map((c, i) =>
      i === idx ? { ...c, [campo]: valor } : c,
    );
    onChange(novos);
  };
  const adicionarCaso = () => {
    if (casos.length >= 10) return;
    onChange([...casos, { input: "", expected_output: "" }]);
  };
  const removerCaso = (idx) => {
    if (casos.length <= 1) return;
    onChange(casos.filter((_, i) => i !== idx));
  };

  return (
    <div className="campo">
      <div className="tc-cabecalho">
        <label style={{ margin: 0 }}>
          Casos de teste{" "}
          <span className="tc-hint">
            (o 1º é a amostra mostrada ao aluno · Enter cria uma quebra de linha
            de verdade dentro da entrada/saída · máx. 10)
          </span>
        </label>
        <button
          type="button"
          className="tc-sugerir"
          onClick={onSugerir}
          disabled={sugerindo}
        >
          {sugerindo ? (
            <Loader2 size={13} className="spin" />
          ) : (
            <Wand2 size={13} />
          )}
          {sugerindo ? "Gerando…" : "Sugerir com IA"}
        </button>
      </div>
      <div className="tc-lista">
        {casos.map((c, idx) => (
          <div className="tc-linha" key={idx}>
            <div className="tc-linha-head">
              <span className="tc-indice">
                {idx === 0 ? "Amostra" : `#${idx + 1}`}
              </span>
              <button
                type="button"
                className="tc-remover"
                onClick={() => removerCaso(idx)}
                disabled={casos.length <= 1}
                title="Remover caso"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <textarea
              className="tc-textarea"
              placeholder="Entrada (opcional) — use Enter para quebras de linha"
              rows={2}
              value={c.input ?? ""}
              onChange={(e) => atualizarCaso(idx, "input", e.target.value)}
            />
            <textarea
              className="tc-textarea"
              placeholder="Saída esperada (exata) — use Enter para quebras de linha"
              rows={2}
              value={c.expected_output ?? ""}
              onChange={(e) =>
                atualizarCaso(idx, "expected_output", e.target.value)
              }
            />
          </div>
        ))}
      </div>
      {casos.length < 10 && (
        <button type="button" className="tc-adicionar" onClick={adicionarCaso}>
          <Plus size={13} /> Adicionar caso de teste
        </button>
      )}
      {erro && <div className="erro">{erro}</div>}
    </div>
  );
}

/* =============================================================================
   9. COMPONENTE RAIZ (orquestra fetch de dados + navegação entre "páginas")
   ============================================================================= */

const FORM_VAZIO = {
  listaId: "",
  novaListaNome: "",
  novaListaDescricao: "",
  titulo: "",
  enunciado: "",
  testCases: [{ input: "", expected_output: "" }],
};
const FORM_LISTA_VAZIO = { id: null, titulo: "", descricao: "" };

export default function KeziaExercicios() {
  const [tema, setTema] = useState("escuro");
  const [view, setView] = useState("listas"); // 'listas' | 'exercicios' | 'exercicio'

  // -------- status de conectividade com o back-end (substitui o antigo
  // status do interpretador Pyodide local, que não existe mais) --------
  const [apiStatus, setApiStatus] = useState("verificando"); // 'verificando' | 'pronto' | 'falhou'
  const [erroGlobal, setErroGlobal] = useState(null);

  // -------- dados vindos da API --------
  const [listas, setListas] = useState([]);
  const [carregandoListas, setCarregandoListas] = useState(true);
  const [listaAtual, setListaAtual] = useState(null); // objeto UI (ver listaApiParaUi)
  const [exercicios, setExercicios] = useState([]); // exercícios da lista atual
  const [carregandoExercicios, setCarregandoExercicios] = useState(false);
  const [exercicioAtual, setExercicioAtual] = useState(null);

  const [codigo, setCodigo] = useState("");
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [comentarioIA, setComentarioIA] = useState({
    status: "ocioso",
    texto: "",
  });
  const [popupAberto, setPopupAberto] = useState(false);
  const [fila, setFila] = useState(null);
  const [origemFila, setOrigemFila] = useState(null); // 'lista' | 'aleatorio' — define pra onde volta ao finalizar

  // "resolvidos" é só-cliente nesta sessão porque o back-end ainda não
  // persiste o progresso do aluno. Exercícios não possuem opção de ocultar.
  const [resolvidos, setResolvidos] = useState([]);

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [errosForm, setErrosForm] = useState({});
  const [edicaoExercicioId, setEdicaoExercicioId] = useState(null);
  const [sugerindoTestCases, setSugerindoTestCases] = useState(false);
  const [salvandoExercicio, setSalvandoExercicio] = useState(false);

  const [modalListaAberto, setModalListaAberto] = useState(false);
  const [formLista, setFormLista] = useState(FORM_LISTA_VAZIO);
  const [salvandoLista, setSalvandoLista] = useState(false);

  const [menuAberto, setMenuAberto] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null);
  const [modalVinculoAberto, setModalVinculoAberto] = useState(null);
  const [listaDestinoId, setListaDestinoId] = useState("");
  const [acaoVinculo, setAcaoVinculo] = useState("adicionar");
  const [salvandoVinculo, setSalvandoVinculo] = useState(false);
  const [vinculoErro, setVinculoErro] = useState("");

  const [fabAberto, setFabAberto] = useState(false);
  const [scanStatus, setScanStatus] = useState("ocioso"); // 'ocioso' | 'processando' | 'erro'
  const [scanErro, setScanErro] = useState("");
  const [importacao, setImportacao] = useState(null); // { questoes: [{titulo, enunciado, selecionada}], listaId, reason }
  const [importando, setImportando] = useState(false);
  const [casosDeTeste, setCasosDeTeste] = useState([]);
  const [casosDeTesteOriginais, setCasosDeTesteOriginais] = useState([]);
  const [casosDeTesteModal, setCasosDeTesteModal] = useState(null); // { problemId } | null
  const [casosDeTesteErro, setCasosDeTesteErro] = useState("");
  const [carregandoCasosDeTeste, setCarregandoCasosDeTeste] = useState(false);
  const [salvandoCasosDeTeste, setSalvandoCasosDeTeste] = useState(false);

  const scanInputRef = useRef(null);

  // -------- modal: sortear questão dentro de um escopo --------
  const [modalSortearAberto, setModalSortearAberto] = useState(false);
  const [sorteioListasIds, setSorteioListasIds] = useState(() => new Set());
  const [sorteioExcluirResolvidos, setSorteioExcluirResolvidos] =
    useState(true);
  const [sorteioQuantidade, setSorteioQuantidade] = useState(1);
  const [sorteando, setSorteando] = useState(false);
  const [sorteioErro, setSorteioErro] = useState("");

  const textareaRef = useRef(null);
  const medidorRef = useRef(null);
  const gutterWrapRef = useRef(null);
  const gutterInnerRef = useRef(null);
  const codigoRef = useRef("");
  const [numerosLinha, setNumerosLinha] = useState([1]);

  const listasOrdenadas = useMemo(
    () => [...listas].sort((a, b) => a.ordem - b.ordem),
    [listas],
  );
  const exerciciosOrdenados = useMemo(
    () => [...exercicios].sort((a, b) => a.ordem - b.ordem),
    [exercicios],
  );

  /* ---------- carregar fonte + checar conectividade com a API ---------- */
  useEffect(() => {
    const linkFont = document.createElement("link");
    linkFont.rel = "stylesheet";
    linkFont.href =
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap";
    document.head.appendChild(linkFont);
    return () => {
      if (linkFont.parentNode) document.head.removeChild(linkFont);
    };
  }, []);

  /* ---------- fecha qualquer menu de 3 pontinhos aberto ao clicar fora ---------- */
  useEffect(() => {
    if (!menuAberto) return;
    const aoClicarFora = (e) => {
      if (!e.target.closest(".card-menu, .card-menu-btn")) {
        setMenuAberto(null);
      }
    };
    const aoTeclarEsc = (e) => {
      if (e.key === "Escape") setMenuAberto(null);
    };
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclarEsc);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclarEsc);
    };
  }, [menuAberto]);

  const carregarListas = useCallback(async () => {
    setCarregandoListas(true);
    try {
      const data = await Api.listarListas();
      const mapeadas = (data || []).map((l, i) => listaApiParaUi(l, i));
      setListas(mapeadas);
      setApiStatus("pronto");
      setErroGlobal(null);
    } catch (e) {
      setApiStatus("falhou");
      setErroGlobal(e.message || "Não foi possível conectar ao servidor.");
    } finally {
      setCarregandoListas(false);
    }
  }, []);

  useEffect(() => {
    carregarListas();
  }, [carregarListas]);

  /* ---------- lógica de conclusão / bloqueio (client-side, ver GAPS) ---------- */
  const listaCompleta = useCallback(
    (lista) => {
      if (lista.id !== listaAtual?.id) return false; // só temos exercícios da lista aberta carregados
      if (exercicios.length === 0) return false;
      return exercicios.every((e) => resolvidos.includes(e.id));
    },
    [exercicios, resolvidos, listaAtual],
  );

  const listaBloqueada = useCallback(
    (lista) => {
      if (!lista.oculta) return false;
      const outras = listas.filter((l) => l.id !== lista.id);
      if (outras.length === 0) return true;
      // Sem progresso persistido por usuário, só conseguimos avaliar isso
      // com precisão para a lista atualmente carregada — ver GAPS.
      return !outras.every((l) => listaCompleta(l));
    },
    [listas, listaCompleta],
  );

  // Exercícios não possuem mais o conceito de "ocultar".
  // Mantemos o helper para preservar os fluxos existentes de bloqueio/navegação.
  const exercicioBloqueado = useCallback(() => false, []);

  /* ---------- numeração de linhas ciente de quebra automática ---------- */
  const atualizarNumeros = useCallback(() => {
    const ta = textareaRef.current;
    const medidor = medidorRef.current;
    if (!ta || !medidor) return;
    const estilo = window.getComputedStyle(ta);
    medidor.style.width = ta.clientWidth + "px";
    medidor.style.font = estilo.font;
    medidor.style.letterSpacing = estilo.letterSpacing;
    medidor.style.paddingLeft = estilo.paddingLeft;
    medidor.style.paddingRight = estilo.paddingRight;

    const linhas = codigoRef.current.split("\n");
    const numeros = [];
    linhas.forEach((linha, idx) => {
      medidor.textContent = linha.length ? linha : "\u200b";
      const altura = medidor.scrollHeight;
      const linhasVisuais = Math.max(1, Math.round(altura / LINE_HEIGHT_PX));
      numeros.push(idx + 1);
      for (let k = 1; k < linhasVisuais; k++) numeros.push(null);
    });
    setNumerosLinha(numeros);
    if (gutterWrapRef.current)
      gutterWrapRef.current.style.height = ta.offsetHeight + "px";
  }, []);

  useEffect(() => {
    codigoRef.current = codigo;
    atualizarNumeros();
  }, [codigo, atualizarNumeros, view]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => atualizarNumeros());
    ro.observe(ta);
    return () => ro.disconnect();
  }, [atualizarNumeros, view]);

  const aoRolarEditor = (e) => {
    if (gutterInnerRef.current) {
      gutterInnerRef.current.style.transform = `translateY(-${e.target.scrollTop}px)`;
    }
  };

  /* ---------- navegação ---------- */
  const carregarExercicio = (ex) => {
    setExercicioAtual(ex);
    setCodigo(ex.starter);
    setResultado(null);
    setComentarioIA({ status: "ocioso", texto: "" });
    setPopupAberto(false);
    setView("exercicio");
  };

  const selecionarLista = async (lista) => {
    if (listaBloqueada(lista)) return;
    setListaAtual(lista);
    setFila(null);
    setOrigemFila(null);
    setExercicios([]);
    setCarregandoExercicios(true);
    setView("exercicios");
    try {
      const detalhe = await Api.obterLista(lista.id); // ListDetailResponse { ...lista, problems }
      const mapeados = (detalhe.problems || []).map((p, i) =>
        problemaApiParaUi(p, lista.id, i),
      );
      setExercicios(mapeados);
    } catch (e) {
      setErroGlobal(
        e.message || "Não foi possível carregar os exercícios desta lista.",
      );
    } finally {
      setCarregandoExercicios(false);
    }
  };

  const voltarParaListas = () => {
    setView("listas");
    setListaAtual(null);
    setFila(null);
    setOrigemFila(null);
    carregarListas();
  };

  const voltarParaExercicios = () => {
    setFila(null);
    setOrigemFila(null);
    setView(listaAtual ? "exercicios" : "listas");
  };

  const abrirExercicio = (ex) => {
    if (exercicioBloqueado(ex)) return;
    setFila(null);
    setOrigemFila(null);
    carregarExercicio(ex);
  };

  const resolverLista = (lista, aleatorio) => {
    const itensDaLista = exerciciosOrdenados.filter(
      (e) => !exercicioBloqueado(e),
    );
    if (itensDaLista.length === 0) return;
    const itens = aleatorio ? embaralhar(itensDaLista) : itensDaLista;
    setFila({ itens, indice: 0 });
    setOrigemFila("lista");
    carregarExercicio(itens[0]);
  };

  const finalizarFila = () => {
    const voltarParaHome = origemFila === "aleatorio" || !listaAtual;
    setFila(null);
    setPopupAberto(false);
    if (voltarParaHome) {
      setListaAtual(null);
      setView("listas");
    } else {
      setView("exercicios");
    }
    setOrigemFila(null);
  };

  const itensNavegacao = fila
    ? fila.itens
    : listaAtual
      ? exerciciosOrdenados
      : [];
  const indiceNavegacao = exercicioAtual
    ? itensNavegacao.findIndex((e) => e.id === exercicioAtual.id)
    : -1;

  const irParaExercicio = (indice) => {
    if (indice < 0 || indice >= itensNavegacao.length) return;
    if (fila) setFila((f) => ({ ...f, indice }));
    carregarExercicio(itensNavegacao[indice]);
  };

  const avancarNaFila = () => irParaExercicio(indiceNavegacao + 1);

  /* ---------- criação e edição de exercício/lista ---------- */
  const abrirModalCriar = () => {
    setForm({
      ...FORM_VAZIO,
      listaId: listaAtual?.id || "",
      testCases: [{ input: "", expected_output: "" }],
    });
    setErrosForm({});
    setEdicaoExercicioId(null);
    setFabAberto(false);
    setModalAberto(true);
  };

  const abrirEdicaoExercicio = (ex) => {
    // Este formulário edita título, enunciado e o caso de amostra. Para
    // consultar/editar os casos ocultos já cadastrados, use "Ver casos de
    // teste" (GET/PUT /problems/{id}/test-cases, /test-cases). Casos
    // adicionados aqui além da amostra são criados como novos casos ocultos
    // ao salvar (POST /problems/{id}/test-cases).
    setForm({
      listaId: ex.listaId,
      novaListaNome: "",
      novaListaDescricao: "",
      titulo: ex.titulo,
      enunciado: ex.enunciado,
      testCases: [
        {
          input:
            ex.entradaSaida.entrada === "— (sem entrada)"
              ? ""
              : ex.entradaSaida.entrada,
          expected_output: ex.saidaEsperada,
        },
      ],
    });
    setErrosForm({});
    setEdicaoExercicioId(ex.id);
    setMenuAberto(null);
    setModalAberto(true);
  };

  const abrirEdicaoLista = (lista) => {
    setFormLista({
      id: lista.id,
      titulo: lista.titulo,
      descricao: lista.descricao,
    });
    setErrosForm({});
    setMenuAberto(null);
    setModalListaAberto(true);
  };

  const salvarEdicaoLista = async () => {
    if (!formLista.titulo.trim() || formLista.titulo.trim().length < 3) {
      setErrosForm({ geral: "Informe um título com pelo menos 3 caracteres." });
      return;
    }
    setSalvandoLista(true);
    try {
      await Api.editarLista(formLista.id, {
        name: formLista.titulo.trim(),
        description: formLista.descricao.trim() || null,
      });
      await carregarListas();
      if (listaAtual?.id === formLista.id) {
        setListaAtual((la) => ({
          ...la,
          titulo: formLista.titulo.trim(),
          descricao: formLista.descricao.trim(),
        }));
      }
      setModalListaAberto(false);
    } catch (e) {
      setErrosForm({
        geral: e.message || "Não foi possível salvar as alterações da lista.",
      });
    } finally {
      setSalvandoLista(false);
    }
  };

  const pedirSugestaoTestCases = async () => {
    if (!form.titulo.trim() || !form.enunciado.trim()) {
      setErrosForm((prev) => ({
        ...prev,
        testCases: "Preencha título e enunciado antes de pedir sugestões.",
      }));
      return;
    }
    setSugerindoTestCases(true);
    try {
      const resp = await Api.sugerirCasosDeTeste([
        { title: form.titulo.trim(), description: form.enunciado.trim() },
      ]);
      const sugestao = resp?.questions?.[0]?.test_cases || [];
      if (sugestao.length > 0) {
        setForm((f) => ({
          ...f,
          testCases: sugestao.map((tc) => ({
            input: tc.input ?? "",
            expected_output: tc.expected_output ?? "",
          })),
        }));
      } else {
        setErrosForm((prev) => ({
          ...prev,
          testCases: "A IA não retornou sugestões para este enunciado.",
        }));
      }
    } catch (e) {
      setErrosForm((prev) => ({
        ...prev,
        testCases: `Não consegui gerar sugestões agora (${e.message}).`,
      }));
    } finally {
      setSugerindoTestCases(false);
    }
  };

  const salvarExercicio = async () => {
    const erros = validarFormExercicio(form);
    if (Object.keys(erros).length > 0) {
      setErrosForm(erros);
      return;
    }
    setSalvandoExercicio(true);
    try {
      const testCasesValidos = form.testCases
        .filter((tc) => tc.expected_output.trim().length > 0)
        .map((tc) => ({
          input: tc.input?.trim() || null,
          expected_output: tc.expected_output.trim(),
        }));

      if (edicaoExercicioId) {
        // A amostra (1º caso) atualiza título/enunciado/entrada/saída do
        // problema. Quaisquer casos extras adicionados neste formulário são
        // criados como novos casos ocultos via POST (até 10 por chamada).
        const [amostra, ...extras] = testCasesValidos;
        await Api.editarProblema(edicaoExercicioId, {
          title: form.titulo.trim(),
          description: form.enunciado.trim(),
          input: amostra.input?.trim() || null,
          expected_output: amostra.expected_output.trim(),
        });
        if (extras.length > 0) {
          await Api.criarCasosDeTeste(edicaoExercicioId, extras);
        }
        if (listaAtual) await selecionarLista(listaAtual);
        setModalAberto(false);
        setEdicaoExercicioId(null);
        return;
      }

      let listaId = form.listaId;
      let listaParaAbrir = listas.find((l) => l.id === listaId);
      if (listaId === "__nova__") {
        const nova = await Api.criarLista({
          name: form.novaListaNome.trim(),
          description: form.novaListaDescricao.trim() || null,
        });
        listaId = nova.id;
        listaParaAbrir = listaApiParaUi(nova, listas.length);
      }

      await Api.adicionarProblemasNaLista(listaId, [
        {
          title: form.titulo.trim(),
          description: form.enunciado.trim(),
          test_cases: testCasesValidos,
        },
      ]);

      await carregarListas();
      setModalAberto(false);
      await selecionarLista(listaParaAbrir);
    } catch (e) {
      setErrosForm({
        geral: e.message || "Não foi possível salvar o exercício agora.",
      });
    } finally {
      setSalvandoExercicio(false);
    }
  };

  /* ---------- menu de 3 pontinhos: organização, remoção e exclusão ---------- */
  const pedirOcultar = (tipo, item) => {
    setMenuAberto(null);
    setConfirmacao({ acao: "ocultar", tipo, id: item.id, titulo: item.titulo });
  };

  const removerBloqueio = async (tipo, id) => {
    if (tipo === "lista") {
      try {
        await Api.editarLista(id, { is_hidden: false });
        await carregarListas();
      } catch (e) {
        setErroGlobal(
          e.message || "Não foi possível remover o bloqueio desta lista.",
        );
      }
    }
    setMenuAberto(null);
  };

  const abrirModalVinculo = (ex) => {
    setMenuAberto(null);
    setListaDestinoId("");
    setAcaoVinculo("adicionar");
    setVinculoErro("");
    setModalVinculoAberto(ex);
  };

  const salvarVinculo = async () => {
    if (!modalVinculoAberto || !listaDestinoId || !listaAtual) return;
    if (String(listaDestinoId) === String(listaAtual.id)) return;

    setSalvandoVinculo(true);
    setVinculoErro("");
    try {
      await Api.vincularProblema(listaDestinoId, modalVinculoAberto.id);
      if (acaoVinculo === "mover") {
        await Api.desvincularProblema(listaAtual.id, modalVinculoAberto.id);
      }
      setModalVinculoAberto(null);
      setListaDestinoId("");
      await selecionarLista(listaAtual);
    } catch (e) {
      setVinculoErro(
        e.message || "Não foi possível alterar as listas do exercício.",
      );
    } finally {
      setSalvandoVinculo(false);
    }
  };

  const pedirRemoverDaLista = (item) => {
    setMenuAberto(null);
    setConfirmacao({
      acao: "remover",
      tipo: "exercicio",
      id: item.id,
      titulo: item.titulo,
    });
  };

  const pedirExcluir = (tipo, item) => {
    setMenuAberto(null);
    setConfirmacao({ acao: "excluir", tipo, id: item.id, titulo: item.titulo });
  };

  const confirmarAcao = async () => {
    if (!confirmacao) return;
    const { acao, tipo, id } = confirmacao;
    try {
      if (acao === "ocultar") {
        if (tipo === "lista") {
          await Api.editarLista(id, { is_hidden: true }); // persiste de verdade
          await carregarListas();
        }
      } else if (acao === "remover") {
        // Desvincula o problema apenas desta lista (DELETE /list-problems).
        // Ele continua existindo caso pertença a outras listas.
        if (listaAtual) {
          await Api.desvincularProblema(listaAtual.id, id);
          await selecionarLista(listaAtual);
        }
      } else if (acao === "excluir") {
        if (tipo === "lista") {
          await Api.excluirListas([id]); // exclusão real, afeta todo mundo (sem "para mim")
          if (listaAtual?.id === id) voltarParaListas();
          else await carregarListas();
        } else {
          // Exclusão definitiva e global do problema (DELETE /problems),
          // removendo-o de qualquer lista à qual pertença.
          await Api.excluirProblemas([id]);
          if (listaAtual) await selecionarLista(listaAtual);
          else await carregarListas();
        }
      }
      setConfirmacao(null);
    } catch (e) {
      setErroGlobal(
        e.message ||
          "Não foi possível concluir essa ação agora. Tente novamente.",
      );
      setConfirmacao(null);
    }
  };

  /* ---------- ver/editar casos de teste de um exercício (GET/POST/PUT/DELETE
     /problems/{id}/test-cases e /test-cases) ---------- */
  const abrirEditorDeCasosDeTeste = async (problemId) => {
    setMenuAberto(null);
    setCasosDeTesteErro("");
    setCarregandoCasosDeTeste(true);
    setCasosDeTesteModal({ problemId });
    try {
      const resp = await Api.listarCasosDeTeste(problemId);
      const sample = resp?.sample_case
        ? [
            normalizarCasoDeTeste({
              ...resp.sample_case,
              id: null,
              sample: true,
            }),
          ]
        : [];
      const remaining = (resp?.remaining_cases || []).map(
        normalizarCasoDeTeste,
      );
      setCasosDeTeste([...sample, ...remaining]);
      setCasosDeTesteOriginais([...remaining]);
    } catch (err) {
      setCasosDeTesteErro(
        err?.message || "Não foi possível carregar os casos de teste.",
      );
    } finally {
      setCarregandoCasosDeTeste(false);
    }
  };

  const atualizarCasoLocalmente = (index, campo, valor) => {
    setCasosDeTeste((atuais) =>
      atuais.map((caso, i) =>
        i === index
          ? { ...caso, [campo]: normalizarQuebraDeLinha(valor) }
          : caso,
      ),
    );
  };

  const adicionarCasoLocalmente = () => {
    setCasosDeTeste((atuais) => [
      ...atuais,
      { id: null, input: "", expected_output: "" },
    ]);
  };

  const removerCasoLocalmente = (index) => {
    setCasosDeTeste((atuais) => atuais.filter((_, i) => i !== index));
  };

  const salvarCasosDeTeste = async () => {
    if (!casosDeTesteModal) return;

    const editaveis = casosDeTeste
      .filter((caso) => !caso.sample)
      .map(normalizarCasoDeTeste);

    if (editaveis.length > 10) {
      setCasosDeTesteErro(
        "O máximo é de 10 casos de teste ocultos por exercício.",
      );
      return;
    }
    const semSaida = editaveis.some((c) => !c.expected_output.trim());
    if (semSaida) {
      setCasosDeTesteErro(
        "Todos os casos precisam de uma saída esperada preenchida.",
      );
      return;
    }

    setSalvandoCasosDeTeste(true);
    setCasosDeTesteErro("");

    try {
      const existentes = editaveis.filter((c) => c.id);
      const novos = editaveis.filter((c) => !c.id);

      if (existentes.length) {
        await Api.atualizarCasosDeTeste(
          existentes.map(({ id, input, expected_output }) => ({
            id,
            input,
            expected_output,
          })),
        );
      }

      if (novos.length) {
        await Api.criarCasosDeTeste(
          casosDeTesteModal.problemId,
          novos.map(({ input, expected_output }) => ({
            input,
            expected_output,
          })),
        );
      }

      const resp = await Api.listarCasosDeTeste(casosDeTesteModal.problemId);
      const sample = resp?.sample_case
        ? [
            normalizarCasoDeTeste({
              ...resp.sample_case,
              id: null,
              sample: true,
            }),
          ]
        : [];
      const remaining = (resp?.remaining_cases || []).map(
        normalizarCasoDeTeste,
      );
      setCasosDeTeste([...sample, ...remaining]);
      setCasosDeTesteOriginais([...remaining]);
    } catch (err) {
      setCasosDeTesteErro(
        err?.message || "Não foi possível salvar os casos de teste.",
      );
    } finally {
      setSalvandoCasosDeTeste(false);
    }
  };

  const excluirCasoDeTesteLocal = async (caso) => {
    if (!caso?.id) return;
    setCasosDeTesteErro("");
    try {
      await Api.excluirCasosDeTeste([caso.id]);
      setCasosDeTeste((atuais) => atuais.filter((item) => item.id !== caso.id));
    } catch (err) {
      setCasosDeTesteErro(
        err?.message || "Não foi possível excluir o caso de teste.",
      );
    }
  };

  /* ---------- sortear questão(ões): global na home, restrito na lista ---------- */
  const abrirModalSortear = () => {
    setFabAberto(false);
    setSorteioListasIds(new Set(listaAtual ? [listaAtual.id] : []));
    setSorteioExcluirResolvidos(true);
    setSorteioQuantidade(1);
    setSorteioErro("");
    setModalSortearAberto(true);
  };

  const alternarListaSorteio = (id) => {
    if (listaAtual) return;
    setSorteioListasIds((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const confirmarSorteio = async () => {
    setSorteioErro("");
    setSorteando(true);
    try {
      const resp = await Api.problemasAleatorios({
        // Home = geral. Dentro de uma lista = somente a lista atual.
        listsIds: listaAtual
          ? [listaAtual.id]
          : sorteioListasIds.size > 0
            ? Array.from(sorteioListasIds)
            : undefined,
        excludedIds: sorteioExcluirResolvidos ? resolvidos : undefined,
        quantity: sorteioQuantidade,
      });
      const brutos = Array.isArray(resp) ? resp : resp?.problems || [];
      if (brutos.length === 0) {
        setSorteioErro("Nenhuma questão encontrada com esses filtros.");
        return;
      }
      const itens = brutos.map((p, i) =>
        problemaApiParaUi(p, listaAtual?.id ?? null, i),
      );
      setModalSortearAberto(false);
      if (itens.length > 1) {
        setFila({ itens, indice: 0 });
        setOrigemFila("aleatorio");
      } else {
        setFila(null);
        setOrigemFila(null);
      }
      carregarExercicio(itens[0]);
    } catch (e) {
      setSorteioErro(
        e.message || "Não foi possível sortear uma questão agora.",
      );
    } finally {
      setSorteando(false);
    }
  };

  /* ---------- escanear questão(ões) de um documento (imagem, PDF ou DOCX) ---------- */
  const acionarSelecaoArquivo = () => {
    setFabAberto(false);
    scanInputRef.current?.click();
  };

  const EXTENSOES_DOCUMENTO = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
  };

  const aoSelecionarArquivoScan = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setScanStatus("processando");
    setScanErro("");

    try {
      const resp = await Api.extrairQuestoesDeDocumento(file);
      const questoes = resp?.questions || [];

      if (questoes.length === 0) {
        setScanStatus("erro");
        setScanErro("O documento não parece conter questões reconhecíveis.");
        return;
      }

      setImportacao({
        questoes: questoes.map((q, i) => ({
          chave: i,
          titulo: q.title,
          enunciado: q.description,
          selecionada: true,
        })),
        listaId: listaAtual?.id || "",
        novaListaNome: "",
        reason: resp.reason,
      });
      setScanStatus("ocioso");
    } catch (err) {
      setScanStatus("erro");
      setScanErro(
        err?.message || "Não consegui ler o documento. Tente novamente.",
      );
    }
  };

  const alternarSelecaoImportacao = (chave) => {
    setImportacao((imp) => ({
      ...imp,
      questoes: imp.questoes.map((q) =>
        q.chave === chave ? { ...q, selecionada: !q.selecionada } : q,
      ),
    }));
  };

  const confirmarImportacao = async () => {
    if (!importacao) return;
    const selecionadas = importacao.questoes.filter((q) => q.selecionada);
    if (selecionadas.length === 0) return;
    setImportando(true);
    setErroGlobal(null);
    try {
      let listaId = importacao.listaId;
      if (listaId === "__nova__") {
        const nova = await Api.criarLista({
          name: importacao.novaListaNome.trim(),
          description: null,
        });
        listaId = nova.id;
      }
      if (!listaId) throw new Error("Escolha uma lista de destino.");

      // Pede à IA casos de teste para todas as questões selecionadas de uma vez.
      const sugestoes = await Api.sugerirCasosDeTeste(
        selecionadas.map((q) => ({
          title: q.titulo,
          description: normalizarQuebraDeLinha(q.enunciado),
        })),
      );
      const porTitulo = new Map(
        (sugestoes?.questions || []).map((q) => [q.title, q.test_cases || []]),
      );

      const problemasParaCriar = [];
      const semCasos = [];
      selecionadas.forEach((q) => {
        const casos = (porTitulo.get(q.titulo) || [])
          .map(normalizarCasoDeTeste)
          .filter((tc) => (tc.expected_output || "").trim());
        if (casos.length === 0) {
          semCasos.push(q.titulo);
          return;
        }
        problemasParaCriar.push({
          title: q.titulo,
          description: normalizarQuebraDeLinha(q.enunciado),
          test_cases: casos,
        });
      });

      if (problemasParaCriar.length > 0) {
        await Api.adicionarProblemasNaLista(listaId, problemasParaCriar);
      }

      await carregarListas();
      const listaFinal = listas.find((l) => l.id === listaId) || {
        id: listaId,
        titulo: "Nova lista",
        descricao: "",
      };
      setImportacao(null);
      await selecionarLista(listaFinal);

      if (semCasos.length > 0) {
        setErroGlobal(
          `Importado(s), mas sem casos de teste sugeridos para: ${semCasos.join(", ")}. Edite manualmente para adicionar os casos de teste.`,
        );
      }
    } catch (e) {
      setErroGlobal(
        e.message || "Não foi possível concluir a importação agora.",
      );
    } finally {
      setImportando(false);
    }
  };

  /* ---------- envio da solução (agora executado e corrigido no back-end) ---------- */
  const executar = useCallback(async () => {
    if (executando || !exercicioAtual) return;
    setExecutando(true);
    setResultado(null);
    setComentarioIA({ status: "ocioso", texto: "" });
    setPopupAberto(false);

    const inicio = performance.now();
    try {
      const resp = await Api.enviarSolucao(exercicioAtual.id, codigo);
      // O back-end não retorna tempo de execução no servidor; o valor
      // abaixo é apenas o tempo de ida-e-volta da requisição (ver GAPS).
      const tempoMs = Math.round(performance.now() - inicio);

      if (resp.status === "approved") {
        const review = resp.ai_review; // AIReviewApprovedCase | null
        const notas = review?.suggestion ? [review.suggestion] : [];
        setResultado({
          tipo: notas.length > 0 ? "correto_melhorar" : "correto_ideal",
          notas,
          tempoMs,
          explicacaoIA: review?.explanation || null,
        });
        setResolvidos((prev) =>
          prev.includes(exercicioAtual.id)
            ? prev
            : [...prev, exercicioAtual.id],
        );
        setPopupAberto(true);
        return;
      }

      // status === "rejected"
      const review = resp.ai_review; // AIReviewRejectedCase | null
      const falhou = resp.failed_case; // FailedCase | null
      const ehErroDeExecucao =
        !!review?.exception || (falhou && falhou.actual_output == null);

      if (ehErroDeExecucao) {
        setResultado({
          tipo: "erro",
          erro: review?.exception || "Erro desconhecido ao executar o código.",
          tempoMs,
          entradaCaso: falhou?.input ?? null,
        });
      } else {
        setResultado({
          tipo: "saida_incorreta",
          obtida: falhou?.actual_output ?? "",
          esperada: falhou?.expected_output ?? exercicioAtual.saidaEsperada,
          entradaCaso: falhou?.input ?? null,
          tempoMs,
        });
      }

      // O comentário da IA às vezes não referencia explicitamente qual caso
      // de teste falhou — por isso sempre exibimos "Entrada testada" acima,
      // com o valor exato usado pelo corretor, independente do texto da IA.
      const textoComentario = [review?.explanation, review?.suggestion]
        .filter(Boolean)
        .join(" ");
      setComentarioIA({
        status: textoComentario ? "pronto" : "falhou",
        texto:
          textoComentario ||
          "Não recebi um comentário detalhado desta vez — mas a explicação e o diff acima já mostram onde está o problema.",
      });
    } catch (e) {
      const tempoMs = Math.round(performance.now() - inicio);
      setResultado({
        tipo: "erro",
        erro: e.message || String(e),
        tempoMs,
        entradaCaso: null,
      });
    } finally {
      setExecutando(false);
    }
  }, [codigo, exercicioAtual, executando]);

  const aoTeclarTab = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = textareaRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const novo = codigo.slice(0, start) + "    " + codigo.slice(end);
      setCodigo(novo);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 4;
      });
    }
  };

  return (
    <div className={`kezia-root tema-${tema}`}>
      <style>{`
        .kezia-root {
          --primary: #1B2FD1;
          --secondary: #1E78F5;
          --tertiary: #C21C8C;
          --font-mono: 'JetBrains Mono', monospace;
          --font-sans: 'Source Sans 3', sans-serif;
          font-family: var(--font-sans);
          min-height: 100vh;
          padding: 28px 20px 60px;
          position: relative;
          transition: background 0.25s ease, color 0.25s ease;
        }
        .kezia-root.tema-escuro {
          background: #1C1B21; color: #EDF3F3;
          --surface: #24232A; --surface-soft: #2B2A32; --border: #37363F;
          --text-soft: #A6ACC0; --code-bg: #14141A; --code-bg-soft: #1B1A22; --gutter-bg: #17161B;
        }
        .kezia-root.tema-claro {
          background: linear-gradient(160deg, #F3FBF9, #EAF6F8); color: #232323;
          --surface: #FFFFFF; --surface-soft: #F2F6F5; --border: #DCE7E5;
          --text-soft: #656D6C; --code-bg: #10131C; --code-bg-soft: #171B26; --gutter-bg: #0C0E16;
        }

        .shell { max-width: 1180px; margin: 0 auto; }
        .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 14px; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand img.logo { height: 34px; width: auto; display: block; }
        .brand-tagline { font-size: 12.5px; color: var(--text-soft); border-left: 1px solid var(--border); padding-left: 10px; margin-left: 2px; }

        .topbar-actions { display: flex; align-items: center; gap: 10px; }
        .theme-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 9px; background: var(--surface); border: 1px solid var(--border); color: var(--text-soft); cursor: pointer; transition: color 0.2s ease, border-color 0.2s ease, transform 0.3s ease; }
        .theme-btn:hover { color: var(--secondary); border-color: var(--secondary); transform: rotate(-12deg); }
        .theme-btn svg { transition: transform 0.35s cubic-bezier(.2,1.4,.4,1); }
        .status-pill { display: flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-soft); border: 1px solid var(--border); padding: 6px 12px; border-radius: 999px; background: var(--surface); transition: border-color 0.2s ease; }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--text-soft); transition: background 0.3s ease; }
        .status-dot.pronto { background: var(--secondary); }
        .status-dot.falhou { background: var(--tertiary); }
        .ghost-btn { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--border); color: inherit; font-family: var(--font-sans); font-size: 13.5px; font-weight: 600; padding: 8px 14px; border-radius: 9px; cursor: pointer; transition: border-color 0.18s ease, color 0.18s ease, transform 0.18s ease; }
        .ghost-btn:hover { border-color: var(--secondary); color: var(--secondary); transform: translateX(-2px); }

        .banner-erro { display: flex; align-items: center; gap: 10px; background: color-mix(in srgb, var(--tertiary) 14%, transparent); border: 1px solid var(--tertiary); color: inherit; border-radius: 10px; padding: 10px 14px; margin-bottom: 18px; font-size: 13px; animation: deslizarEntrar 220ms ease; }
        .banner-erro button { margin-left: auto; background: none; border: none; color: var(--tertiary); cursor: pointer; }

        /* ---------- ANIMAÇÕES GERAIS ---------- */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.85) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes deslizarEntrar { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes paginaEntra { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes menuEntra { from { opacity: 0; transform: scale(0.92) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .pagina-anim { animation: paginaEntra 320ms cubic-bezier(.2,.8,.2,1); }

        /* ---------- LISTAS DE CONTEÚDO ---------- */
        .secao-head { margin-bottom: 22px; }
        .secao-head h2 { font-size: 24px; margin: 0 0 6px; }
        .secao-head p { margin: 0; color: var(--text-soft); font-size: 14.5px; }
        .conteudo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .conteudo-card { text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 22px; cursor: pointer; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease; }
        .conteudo-card:hover { border-color: var(--secondary); transform: translateY(-3px); box-shadow: 0 14px 30px rgba(0,0,0,0.16); }
        .conteudo-card h3 { margin: 0; font-size: 18px; }
        .conteudo-card p { margin: 0; font-size: 13.5px; color: var(--text-soft); line-height: 1.5; flex-grow: 1; white-space: pre-wrap; word-break: break-word; }
        .conteudo-card .contagem { display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 11.5px; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.05em; }

        .fab { position: fixed; right: 30px; bottom: 30px; width: 54px; height: 54px; border-radius: 50%; background: var(--secondary); color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 12px 28px rgba(0,0,0,0.35); z-index: 40; transition: background 0.2s ease, transform 0.2s ease; }
        .fab:hover { background: var(--primary); transform: translateY(-2px); }

        /* ---------- LISTA DETALHE ---------- */
        .lista-toolbar { display: flex; gap: 12px; margin: 18px 0 26px; flex-wrap: wrap; }
        .lista-toolbar button { display: flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-weight: 700; font-size: 13.5px; padding: 10px 16px; border-radius: 9px; cursor: pointer; border: 1px solid var(--border); transition: border-color 0.18s ease, transform 0.18s ease, background 0.18s ease, color 0.18s ease; }
        .lista-toolbar button:active { transform: scale(0.97); }
        .btn-resolver { background: var(--secondary); border-color: var(--secondary); color: #fff; }
        .btn-resolver:hover { background: var(--primary); }
        .btn-aleatorio { background: var(--surface); color: inherit; }
        .btn-aleatorio:hover { border-color: var(--tertiary); color: var(--tertiary); }
        .btn-sortear { background: var(--surface); color: inherit; }
        .btn-sortear:hover { border-color: var(--secondary); color: var(--secondary); }
        .exercicio-card { text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; cursor: pointer; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease; }
        .exercicio-card:hover { border-color: var(--secondary); transform: translateY(-3px); box-shadow: 0 14px 30px rgba(0,0,0,0.16); }
        .exercicio-card h3 { margin: 0; font-size: 16px; }
        .exercicio-card p { margin: 0; font-size: 13px; color: var(--text-soft); line-height: 1.5; white-space: pre-wrap; word-break: break-word; }

        /* ---------- PÁGINA DO EXERCÍCIO ---------- */
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
        @media (max-width: 880px) { .grid { grid-template-columns: 1fr; } }

        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 26px 26px 24px; box-shadow: 0 20px 45px rgba(0,0,0,0.16); position: relative; min-height: 380px; }
        .eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--secondary); margin: 0 0 8px; }
        .panel h2 { font-family: var(--font-sans); font-weight: 700; font-size: 23px; margin: 0 0 14px; }
        .panel p.enunciado { font-size: 15.5px; line-height: 1.65; margin: 0 0 20px; color: inherit; white-space: pre-wrap; word-break: break-word; }
        .es-box { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .es-card { background: var(--surface-soft); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; }
        .es-card .label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-soft); }
        .es-card .value { font-family: var(--font-mono); font-size: 13.5px; margin-top: 4px; white-space: pre-wrap; word-break: break-word; }

        .code-col { display: flex; flex-direction: column; gap: 14px; }
        .editor-card { background: var(--code-bg); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); box-shadow: 0 20px 45px rgba(0,0,0,0.2); }
        .editor-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--code-bg-soft); border-bottom: 1px solid var(--border); }
        .editor-head .dots { display: flex; gap: 6px; }
        .editor-head .dots span { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
        .dots span:nth-child(1) { background: var(--tertiary); }
        .dots span:nth-child(2) { background: #E0B85B; }
        .dots span:nth-child(3) { background: var(--secondary); }
        .editor-filename { font-family: var(--font-mono); font-size: 12px; color: var(--text-soft); }

        .editor-body { display: flex; align-items: stretch; }
        .gutter-wrap { width: 46px; flex-shrink: 0; overflow: hidden; background: var(--gutter-bg); border-right: 1px solid var(--border); position: relative; }
        .gutter-inner { padding-top: 18px; will-change: transform; }
        .gutter-row { height: ${LINE_HEIGHT_PX}px; line-height: ${LINE_HEIGHT_PX}px; text-align: right; padding-right: 10px; font-family: var(--font-mono); font-size: 12.5px; color: var(--text-soft); opacity: 0.75; user-select: none; white-space: nowrap; }
        textarea.editor { flex: 1; min-width: 0; min-height: 280px; resize: vertical; background: var(--code-bg); color: #D8DEE4; font-family: var(--font-mono); font-size: 14px; line-height: ${LINE_HEIGHT_PX}px; border: none; outline: none; padding: 18px 20px; tab-size: 4; white-space: pre; }

        .run-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--code-bg-soft); border-top: 1px solid var(--border); }
        .run-btn { display: flex; align-items: center; gap: 8px; background: var(--secondary); color: #fff; border: none; font-family: var(--font-sans); font-weight: 700; font-size: 14px; padding: 10px 18px; border-radius: 9px; cursor: pointer; transition: background 0.18s ease, transform 0.12s ease; }
        .run-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .run-btn:not(:disabled):hover { background: var(--primary); }
        .run-btn:not(:disabled):active { transform: scale(0.97); }
        .run-hint { font-family: var(--font-mono); font-size: 11px; color: var(--text-soft); }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .result-card { border-radius: 12px; border: 1px solid var(--border); background: var(--code-bg-soft); min-height: 100px; padding: 18px 20px; box-shadow: 0 16px 36px rgba(0,0,0,0.16); animation: fadeIn 220ms ease; }
        .result-empty { color: var(--text-soft); font-family: var(--font-mono); font-size: 13px; }
        .result-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .result-head { display: flex; align-items: center; gap: 10px; }
        .result-head h3 { font-family: var(--font-sans); font-size: 15.5px; font-weight: 700; margin: 0; }
        .tempo-pill { display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-soft); background: rgba(255,255,255,0.04); border: 1px solid var(--border); padding: 4px 10px; border-radius: 999px; flex-shrink: 0; }
        .result-text { font-size: 14px; line-height: 1.6; color: #C9D1DA; white-space: pre-wrap; word-break: break-word; }
        .out-label { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-soft); margin-top: 12px; }
        .out-block { font-family: var(--font-mono); font-size: 13px; background: #0E1013; border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; margin-top: 6px; color: #D8DEE4; white-space: pre-wrap; word-break: break-word; }
        .out-block mark { background: color-mix(in srgb, var(--tertiary) 35%, transparent); color: #fff; border-radius: 3px; padding: 0 1px; }
        details.tech { margin-top: 12px; }
        details.tech summary { cursor: pointer; font-family: var(--font-mono); font-size: 12px; color: var(--text-soft); }

        .ia-card { margin-top: 14px; border-radius: 10px; padding: 14px 16px; background: var(--surface); border: 1px solid var(--border); position: relative; animation: fadeIn 260ms ease; }
        .ia-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .ia-avatar { width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(120deg, var(--primary), var(--tertiary)); display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
        .ia-head span { font-family: var(--font-mono); font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-soft); }
        .ia-texto { font-size: 14px; line-height: 1.6; color: inherit; white-space: pre-wrap; word-break: break-word; }
        .ia-loading { display: flex; gap: 5px; align-items: center; font-family: var(--font-mono); font-size: 12.5px; color: var(--text-soft); }
        .ia-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--text-soft); animation: piscar 1.1s infinite ease-in-out; }
        .ia-dot:nth-child(2) { animation-delay: 0.15s; }
        .ia-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes piscar { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }

        /* ---------- POPUP TAREFA CONCLUÍDA ---------- */
        .overlay { position: fixed; inset: 0; background: rgba(10, 10, 14, 0.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; animation: fadeIn 180ms ease; }
        .popup-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; max-width: 420px; width: 100%; padding: 28px 26px 24px; box-shadow: 0 30px 70px rgba(0,0,0,0.4); position: relative; animation: popIn 260ms cubic-bezier(.2,1.6,.4,1); }
        .popup-close { position: absolute; top: 14px; right: 14px; background: none; border: none; color: var(--text-soft); cursor: pointer; transition: color 0.15s ease, transform 0.15s ease; }
        .popup-close:hover { color: var(--tertiary); transform: rotate(90deg); }
        .popup-icon { width: 52px; height: 52px; border-radius: 50%; background: color-mix(in srgb, var(--secondary) 16%, transparent); display: flex; align-items: center; justify-content: center; color: var(--secondary); margin-bottom: 14px; }
        .popup-card h3 { margin: 0 0 6px; font-size: 20px; }
        .popup-card p.sub { margin: 0 0 4px; color: var(--text-soft); font-size: 14px; white-space: pre-wrap; word-break: break-word; }
        .popup-melhorias { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
        .popup-melhorias .rotulo { display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #E9C572; margin-bottom: 8px; }
        .popup-melhorias ul { margin: 0; padding-left: 18px; font-size: 13.5px; line-height: 1.55; color: inherit; }
        .popup-melhorias li { margin-bottom: 8px; white-space: pre-wrap; word-break: break-word; }
        .popup-actions { display: flex; gap: 10px; margin-top: 20px; }
        .popup-btn { flex: 1; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 14px; border-radius: 9px; font-weight: 600; font-size: 13.5px; cursor: pointer; border: 1px solid var(--border); background: var(--surface-soft); color: inherit; transition: border-color 0.15s ease, transform 0.12s ease, background 0.15s ease; }
        .popup-btn.principal { background: var(--secondary); border-color: var(--secondary); color: #fff; }
        .popup-btn.principal:hover { background: var(--primary); }
        .popup-btn:hover { border-color: var(--secondary); }
        .popup-btn:active { transform: scale(0.97); }

        /* ---------- MODAL DE CRIAÇÃO ---------- */
        .modal-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; max-width: 560px; width: 100%; max-height: 88vh; overflow-y: auto; padding: 26px 26px 22px; box-shadow: 0 30px 70px rgba(0,0,0,0.4); position: relative; animation: popIn 220ms cubic-bezier(.2,1.6,.4,1); }
        .modal-card h3 { margin: 0 0 4px; font-size: 19px; }
        .modal-card p.sub { margin: 0 0 20px; color: var(--text-soft); font-size: 13.5px; }
        .campo { margin-bottom: 16px; }
        .campo label { display: block; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-soft); margin-bottom: 6px; }
        .campo input, .campo textarea, .campo select { width: 100%; box-sizing: border-box; background: var(--surface-soft); border: 1px solid var(--border); border-radius: 8px; padding: 9px 11px; font-family: var(--font-sans); font-size: 13.5px; color: inherit; transition: border-color 0.15s ease; }
        .campo input:focus, .campo textarea:focus, .campo select:focus { border-color: var(--secondary); outline: none; }
        .campo textarea { font-family: var(--font-mono); resize: vertical; min-height: 110px; line-height: 1.5; white-space: pre-wrap; }
        .campo textarea.textarea-curta { min-height: 84px; }
        .campo .erro { color: var(--tertiary); font-size: 12px; margin-top: 5px; }
        .campo-dupla { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .modal-footer { display: flex; gap: 10px; margin-top: 6px; }
        .modal-nota { font-size: 11.5px; color: var(--text-soft); margin-top: 14px; }
        .erro { color: var(--tertiary); font-size: 12.5px; }

        /* ---------- EDITOR DE CASOS DE TESTE ---------- */
        .tc-cabecalho { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
        .tc-hint { text-transform: none; font-family: var(--font-sans); color: var(--text-soft); font-weight: 400; letter-spacing: 0; font-size: 11px; }
        .tc-sugerir { display: flex; align-items: center; gap: 6px; background: var(--surface-soft); border: 1px solid var(--border); color: inherit; font-family: var(--font-sans); font-size: 11.5px; font-weight: 600; padding: 6px 10px; border-radius: 999px; cursor: pointer; transition: border-color 0.15s ease, color 0.15s ease; }
        .tc-sugerir:hover:not(:disabled) { border-color: var(--secondary); color: var(--secondary); }
        .tc-sugerir:disabled { opacity: 0.6; cursor: not-allowed; }
        .tc-lista { display: flex; flex-direction: column; gap: 10px; max-height: 360px; overflow-y: auto; padding-right: 2px; }
        .tc-linha { display: flex; flex-direction: column; gap: 6px; background: var(--surface-soft); border: 1px solid var(--border); border-radius: 10px; padding: 10px; }
        .tc-linha-head { display: flex; align-items: center; justify-content: space-between; }
        .tc-indice { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-soft); }
        .tc-textarea { width: 100%; box-sizing: border-box; font-family: var(--font-mono); font-size: 12.5px; line-height: 1.45; resize: vertical; min-height: 56px; white-space: pre-wrap; background: var(--surface); border: 1px solid var(--border); border-radius: 7px; padding: 7px 9px; color: inherit; }
        .tc-textarea:focus { border-color: var(--secondary); outline: none; }
        .tc-remover { width: 26px; height: 26px; border-radius: 7px; background: var(--surface); border: 1px solid var(--border); color: var(--text-soft); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: color 0.15s ease, border-color 0.15s ease; }
        .tc-remover:hover:not(:disabled) { color: var(--tertiary); border-color: var(--tertiary); }
        .tc-remover:disabled { opacity: 0.35; cursor: not-allowed; }
        .tc-adicionar { display: flex; align-items: center; gap: 6px; background: none; border: 1px dashed var(--border); color: var(--text-soft); font-size: 12px; padding: 8px 10px; border-radius: 8px; cursor: pointer; margin-top: 8px; width: 100%; justify-content: center; transition: border-color 0.15s ease, color 0.15s ease; }
        .tc-adicionar:hover { border-color: var(--secondary); color: var(--secondary); }

        /* ---------- MODAL DE SORTEIO ---------- */
        .sorteio-listas { display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; margin-bottom: 4px; }
        .sorteio-item { display: flex; align-items: center; gap: 10px; background: var(--surface-soft); border: 1px solid var(--border); border-radius: 8px; padding: 9px 12px; cursor: pointer; transition: border-color 0.15s ease; }
        .sorteio-item:hover { border-color: var(--secondary); }
        .sorteio-item-fixo { cursor: default; border-color: var(--secondary); }
        .vinculo-modos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
        .vinculo-modos button { display: flex; align-items: center; justify-content: center; gap: 7px; background: var(--surface-soft); border: 1px solid var(--border); color: inherit; font-family: var(--font-sans); font-size: 12.5px; font-weight: 600; padding: 9px 10px; border-radius: 8px; cursor: pointer; transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease; }
        .vinculo-modos button:hover:not(:disabled) { border-color: var(--secondary); color: var(--secondary); }
        .vinculo-modos button.ativo { border-color: var(--secondary); color: var(--secondary); background: color-mix(in srgb, var(--secondary) 10%, var(--surface-soft)); }
        .vinculo-modos button:disabled { opacity: 0.55; cursor: not-allowed; }
        .sorteio-item span { font-size: 13px; }
        .sorteio-toggle { display: flex; align-items: center; gap: 10px; background: var(--surface-soft); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; cursor: pointer; margin-top: 14px; }
        .sorteio-toggle span { font-size: 13px; }

        /* ---------- MODAL DE IMPORTAÇÃO (scan) ---------- */
        .import-lista { display: flex; flex-direction: column; gap: 10px; max-height: 320px; overflow-y: auto; margin-bottom: 16px; }
        .import-item { display: flex; gap: 10px; align-items: flex-start; background: var(--surface-soft); border: 1px solid var(--border); border-radius: 10px; padding: 12px; }
        .import-item button.check { background: none; border: none; color: var(--secondary); cursor: pointer; padding: 2px; flex-shrink: 0; }
        .import-item .conteudo { flex: 1; min-width: 0; }
        .import-item input, .import-item textarea { width: 100%; box-sizing: border-box; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; font-size: 12.5px; color: inherit; font-family: var(--font-sans); margin-top: 4px; }
        .import-item textarea { font-family: var(--font-mono); min-height: 90px; resize: vertical; white-space: pre-wrap; line-height: 1.45; }

        /* ---------- LOGO NO TEMA ESCURO ---------- */
        .tema-escuro .brand img.logo { filter: brightness(1.22); }

        /* ---------- BARRAS DE ROLAGEM COM IDENTIDADE VISUAL ---------- */
        .kezia-root, .kezia-root * { scrollbar-width: thin; scrollbar-color: var(--secondary) var(--surface-soft); }
        .kezia-root *::-webkit-scrollbar { width: 10px; height: 10px; }
        .kezia-root *::-webkit-scrollbar-track { background: var(--surface-soft); border-radius: 999px; }
        .kezia-root *::-webkit-scrollbar-thumb { background: var(--secondary); border-radius: 999px; border: 2px solid var(--surface-soft); }
        .kezia-root *::-webkit-scrollbar-thumb:hover { background: var(--primary); }
        html, body { scrollbar-width: thin; scrollbar-color: #1E78F5 #14141A; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { width: 10px; height: 10px; }
        html::-webkit-scrollbar-track, body::-webkit-scrollbar-track { background: #14141A; }
        html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb { background: #1E78F5; border-radius: 999px; }
        html::-webkit-scrollbar-thumb:hover, body::-webkit-scrollbar-thumb:hover { background: #1B2FD1; }

        /* ---------- MENU DE 3 PONTINHOS (cards de lista/exercício) ---------- */
        .conteudo-card, .exercicio-card { position: relative; }
        .conteudo-card.card-menu-aberto, .exercicio-card.card-menu-aberto { z-index: 70; }
        .card-menu-btn { position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: var(--text-soft); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5; transition: background 0.15s ease, color 0.15s ease; }
        .card-menu-btn:hover { background: var(--surface-soft); border-color: var(--border); color: var(--secondary); }
        .card-menu { position: absolute; top: 42px; right: 12px; width: 210px; background: var(--surface); border: 1px solid var(--border); border-radius: 11px; box-shadow: 0 16px 36px rgba(0,0,0,0.32); z-index: 60; overflow: hidden; text-align: left; transform-origin: top right; animation: menuEntra 140ms cubic-bezier(.2,1.2,.4,1); }
        .card-menu button { display: flex; align-items: center; gap: 9px; width: 100%; box-sizing: border-box; text-align: left; padding: 10px 13px; background: none; border: none; font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: inherit; cursor: pointer; transition: background 0.12s ease, color 0.12s ease; }
        .card-menu button:hover { background: var(--surface-soft); color: var(--secondary); }
        .card-menu button.perigo:hover { color: var(--tertiary); }
        .card-menu .separador { height: 1px; background: var(--border); margin: 4px 0; }

        .card-bloqueada { opacity: 0.6; cursor: not-allowed !important; }
        .lock-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: color-mix(in srgb, var(--surface) 82%, transparent); border-radius: 14px; font-family: var(--font-mono); font-size: 10.5px; text-align: center; padding: 16px; color: var(--text-soft); z-index: 3; animation: fadeIn 220ms ease; }
        .lock-overlay strong { color: inherit; font-size: 11px; }

        /* ---------- NAVEGAÇÃO ANTERIOR / PRÓXIMO NO EXERCÍCIO ---------- */
        .eyebrow-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
        .nav-btns { display: flex; gap: 6px; }
        .nav-btn { display: flex; align-items: center; gap: 4px; background: var(--surface-soft); border: 1px solid var(--border); color: inherit; font-family: var(--font-mono); font-size: 11px; padding: 5px 10px; border-radius: 7px; cursor: pointer; transition: border-color 0.15s ease, color 0.15s ease; }
        .nav-btn:hover:not(:disabled) { border-color: var(--secondary); color: var(--secondary); }
        .nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* ---------- FAB (criar / escanear / sortear) ---------- */
        .fab-group { position: fixed; right: 30px; bottom: 30px; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; z-index: 40; }
        .fab-action { display: flex; align-items: center; gap: 9px; background: var(--surface); border: 1px solid var(--border); color: inherit; font-family: var(--font-sans); font-size: 12.5px; font-weight: 600; padding: 8px 16px 8px 8px; border-radius: 999px; cursor: pointer; box-shadow: 0 10px 24px rgba(0,0,0,0.28); animation: popIn 160ms ease; white-space: nowrap; transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease; }
        .fab-action:hover { border-color: var(--secondary); color: var(--secondary); transform: translateX(-2px); }
        .fab-action .icon-circle { width: 28px; height: 28px; border-radius: 50%; background: var(--surface-soft); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .fab-main { width: 54px; height: 54px; border-radius: 50%; background: var(--secondary); color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 12px 28px rgba(0,0,0,0.35); transition: transform 0.2s ease, background 0.2s ease; }
        .fab-main:hover { background: var(--primary); }
        .fab-main.aberto { transform: rotate(45deg); background: var(--tertiary); }
        .scan-toast { position: fixed; right: 30px; bottom: 96px; display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--border); padding: 9px 15px; border-radius: 999px; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-soft); box-shadow: 0 10px 24px rgba(0,0,0,0.25); z-index: 41; max-width: 320px; animation: deslizarEntrar 220ms ease; }
        .scan-toast.erro { color: var(--tertiary); border-color: var(--tertiary); }

        /* ---------- MODAL DE EDIÇÃO DE LISTA / CONFIRMAÇÕES ---------- */
        .popup-btn.perigo { background: var(--tertiary); border-color: var(--tertiary); color: #fff; }
        .popup-btn.perigo:hover { filter: brightness(1.1); }
        .popup-icon.aviso { background: color-mix(in srgb, var(--tertiary) 16%, transparent); color: var(--tertiary); }
      `}</style>

      <div className="shell">
        <div className="topbar">
          <div className="brand">
            <Image
              className="logo"
              src="/logo.png"
              alt="Kez.ia"
              width={150}
              height={150}
              loading="eager"
            />
            <span className="brand-tagline">
              Bancada de exercícios de Python
            </span>
          </div>
          <div className="topbar-actions">
            {view === "exercicios" && (
              <button className="ghost-btn" onClick={voltarParaListas}>
                <ArrowLeft size={15} /> Listas
              </button>
            )}
            {view === "exercicio" && (
              <button className="ghost-btn" onClick={voltarParaExercicios}>
                <ArrowLeft size={15} /> {listaAtual?.titulo || "Voltar"}
              </button>
            )}
            <button
              className="theme-btn"
              onClick={() =>
                setTema((t) => (t === "escuro" ? "claro" : "escuro"))
              }
              title="Alternar tema"
            >
              {tema === "escuro" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="status-pill">
              <span
                className={`status-dot ${apiStatus === "pronto" ? "pronto" : apiStatus === "falhou" ? "falhou" : ""}`}
              />
              {apiStatus === "verificando" && "conectando ao servidor…"}
              {apiStatus === "pronto" && "servidor conectado"}
              {apiStatus === "falhou" && "falha ao conectar"}
            </div>
          </div>
        </div>

        {erroGlobal && (
          <div className="banner-erro">
            <AlertTriangle size={15} />
            {erroGlobal}
            <button onClick={() => setErroGlobal(null)}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* =====================================================================
            PÁGINA: LISTAS  (futuro: pages/ListasPage.jsx)
           ===================================================================== */}
        {view === "listas" && (
          <div className="pagina-anim">
            <div className="secao-head">
              <h2>Listas de exercícios</h2>
              <p>Escolha um conteúdo para ver os exercícios disponíveis.</p>
            </div>

            {carregandoListas && (
              <p className="result-empty">carregando listas…</p>
            )}

            <div className="conteudo-grid">
              {listasOrdenadas.map((lista) => {
                const bloqueada = listaBloqueada(lista);
                return (
                  <div
                    key={lista.id}
                    className={`conteudo-card${bloqueada ? " card-bloqueada" : ""}${menuAberto?.tipo === "lista" && menuAberto.id === lista.id ? " card-menu-aberto" : ""}`}
                    onClick={() => selecionarLista(lista)}
                  >
                    <h3>{lista.titulo}</h3>
                    <p>{lista.descricao}</p>
                    <span className="contagem">
                      <ListChecks size={13} /> ver exercícios
                    </span>

                    <button
                      className="card-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuAberto(
                          menuAberto?.tipo === "lista" &&
                            menuAberto.id === lista.id
                            ? null
                            : { tipo: "lista", id: lista.id },
                        );
                      }}
                      title="Mais opções"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {menuAberto?.tipo === "lista" &&
                      menuAberto.id === lista.id && (
                        <div
                          className="card-menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={() => abrirEdicaoLista(lista)}>
                            <Pencil size={14} /> Editar
                          </button>
                          <div className="separador" />
                          {lista.oculta ? (
                            <button
                              onClick={() => removerBloqueio("lista", lista.id)}
                            >
                              <Eye size={14} /> Remover bloqueio
                            </button>
                          ) : (
                            <button
                              onClick={() => pedirOcultar("lista", lista)}
                            >
                              <EyeOff size={14} /> Ocultar
                            </button>
                          )}
                          <button
                            className="perigo"
                            onClick={() => pedirExcluir("lista", lista)}
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      )}

                    {bloqueada && (
                      <div className="lock-overlay">
                        <Lock size={18} />
                        <strong>Bloqueada</strong>
                        <span>Conclua as outras listas para liberar esta.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================================
            PÁGINA: EXERCÍCIOS DA LISTA  (futuro: pages/ExerciciosPage.jsx)
           ===================================================================== */}
        {view === "exercicios" && listaAtual && (
          <div className="pagina-anim">
            <div className="secao-head">
              <h2>{listaAtual.titulo}</h2>
              <p>{listaAtual.descricao}</p>
            </div>
            <div className="lista-toolbar">
              <button
                className="btn-resolver"
                onClick={() => resolverLista(listaAtual, false)}
              >
                <Play size={15} /> Resolver lista
              </button>
              <button
                className="btn-aleatorio"
                onClick={() => resolverLista(listaAtual, true)}
              >
                <Shuffle size={15} /> Resolver em ordem aleatória
              </button>
              <button className="btn-sortear" onClick={abrirModalSortear}>
                <Dices size={15} /> Sortear questão
              </button>
            </div>

            {carregandoExercicios && (
              <p className="result-empty">carregando exercícios…</p>
            )}

            <div className="conteudo-grid">
              {exerciciosOrdenados.map((ex) => {
                const bloqueado = exercicioBloqueado(ex);
                return (
                  <div
                    key={ex.id}
                    className={`exercicio-card${bloqueado ? " card-bloqueada" : ""}${menuAberto?.tipo === "exercicio" && menuAberto.id === ex.id ? " card-menu-aberto" : ""}`}
                    onClick={() => abrirExercicio(ex)}
                  >
                    <h3>{ex.titulo}</h3>
                    <p>{previewDe(ex.enunciado)}</p>

                    <button
                      className="card-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuAberto(
                          menuAberto?.tipo === "exercicio" &&
                            menuAberto.id === ex.id
                            ? null
                            : { tipo: "exercicio", id: ex.id },
                        );
                      }}
                      title="Mais opções"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {menuAberto?.tipo === "exercicio" &&
                      menuAberto.id === ex.id && (
                        <div
                          className="card-menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button onClick={() => abrirEdicaoExercicio(ex)}>
                            <Pencil size={14} /> Editar
                          </button>
                          <button
                            onClick={() => abrirEditorDeCasosDeTeste(ex.id)}
                          >
                            <FlaskConical size={14} /> Ver casos de teste
                          </button>
                          <div className="separador" />
                          <button onClick={() => abrirModalVinculo(ex)}>
                            <ListChecks size={14} /> Adicionar a outra lista
                          </button>
                          <div className="separador" />
                          <button onClick={() => pedirRemoverDaLista(ex)}>
                            <X size={14} /> Remover desta lista
                          </button>
                          <button
                            className="perigo"
                            onClick={() => pedirExcluir("exercicio", ex)}
                          >
                            <Trash2 size={14} /> Excluir definitivamente
                          </button>
                        </div>
                      )}

                    {bloqueado && (
                      <div className="lock-overlay">
                        <Lock size={18} />
                        <strong>Bloqueado</strong>
                        <span>
                          Conclua os outros exercícios da lista para liberar
                          este.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================================
            PÁGINA: EXERCÍCIO / ENVIO  (futuro: pages/ExercicioPage.jsx)
           ===================================================================== */}
        {view === "exercicio" && exercicioAtual && (
          <div className="grid pagina-anim">
            <div className="panel">
              <div className="eyebrow-row">
                <p className="eyebrow" style={{ margin: 0 }}>
                  {listaAtual?.titulo || "Exercício avulso"}
                  {fila
                    ? ` · ${fila.indice + 1}/${fila.itens.length}`
                    : indiceNavegacao >= 0
                      ? ` · ${indiceNavegacao + 1}/${itensNavegacao.length}`
                      : ""}
                </p>
                {itensNavegacao.length > 1 && (
                  <div className="nav-btns">
                    <button
                      className="nav-btn"
                      onClick={() => irParaExercicio(indiceNavegacao - 1)}
                      disabled={indiceNavegacao <= 0}
                    >
                      <ArrowLeft size={13} /> Anterior
                    </button>
                    <button
                      className="nav-btn"
                      onClick={() => irParaExercicio(indiceNavegacao + 1)}
                      disabled={
                        indiceNavegacao === -1 ||
                        indiceNavegacao >= itensNavegacao.length - 1
                      }
                    >
                      Próxima <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>
              <h2>{exercicioAtual.titulo}</h2>
              <p className="enunciado">{exercicioAtual.enunciado}</p>
              <div className="es-box">
                <div className="es-card">
                  <div className="label">Entrada</div>
                  <div className="value">
                    {exercicioAtual.entradaSaida.entrada}
                  </div>
                </div>
                <div className="es-card">
                  <div className="label">Saída esperada</div>
                  <div className="value">
                    {exercicioAtual.entradaSaida.saida}
                  </div>
                </div>
              </div>
            </div>

            <div className="code-col">
              <div className="editor-card">
                <div className="editor-head">
                  <div className="dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="editor-filename">attempt.py</div>
                </div>
                <div className="editor-body">
                  <div className="gutter-wrap" ref={gutterWrapRef}>
                    <div className="gutter-inner" ref={gutterInnerRef}>
                      {numerosLinha.map((n, i) => (
                        <div key={i} className="gutter-row">
                          {n ?? ""}
                        </div>
                      ))}
                    </div>
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="editor"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    onKeyDown={aoTeclarTab}
                    onScroll={aoRolarEditor}
                    spellCheck={false}
                  />
                </div>
                <div className="run-row">
                  <button
                    className="run-btn"
                    onClick={executar}
                    disabled={apiStatus !== "pronto" || executando}
                  >
                    {executando ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <Play size={16} />
                    )}
                    {executando ? "Enviando…" : "Enviar"}
                  </button>
                  <span className="run-hint">
                    Tab insere indentação · correção roda no servidor
                  </span>
                </div>
              </div>

              <div className="result-card">
                {!resultado && (
                  <div className="result-empty">
                    // aguardando envio da solução
                  </div>
                )}

                {resultado && (
                  <div className="result-top">
                    <div className="result-head">
                      {resultado.tipo === "erro" && (
                        <>
                          <XCircle size={18} color="#EE8DC4" />
                          <h3 style={{ color: "#EE8DC4" }}>Erro ao executar</h3>
                        </>
                      )}
                      {resultado.tipo === "saida_incorreta" && (
                        <>
                          <AlertTriangle size={18} color="#EE8DC4" />
                          <h3 style={{ color: "#EE8DC4" }}>Saída incorreta</h3>
                        </>
                      )}
                      {(resultado.tipo === "correto_ideal" ||
                        resultado.tipo === "correto_melhorar") && (
                        <>
                          <CheckCircle2 size={18} color="#7DB8FF" />
                          <h3 style={{ color: "#7DB8FF" }}>Correto</h3>
                        </>
                      )}
                    </div>
                    <span className="tempo-pill">
                      <Clock size={12} /> {resultado.tempoMs} ms
                    </span>
                  </div>
                )}

                {(resultado?.tipo === "erro" ||
                  resultado?.tipo === "saida_incorreta") &&
                  resultado.entradaCaso != null && (
                    <>
                      <div className="out-label">
                        Entrada do caso de teste testado
                      </div>
                      <div className="out-block">
                        {resultado.entradaCaso || "(sem entrada)"}
                      </div>
                    </>
                  )}

                {resultado?.tipo === "erro" &&
                  (() => {
                    const info = explicarErro(resultado.erro);
                    return (
                      <>
                        <p className="result-text">
                          <strong>{info.titulo}.</strong> {info.explicacao}
                        </p>
                        <p className="result-text">
                          <strong>O que fazer:</strong> {info.dica}
                        </p>
                        <details className="tech">
                          <summary>ver detalhe técnico</summary>
                          <div className="out-block">{resultado.erro}</div>
                        </details>
                      </>
                    );
                  })()}

                {resultado?.tipo === "saida_incorreta" &&
                  (() => {
                    const d = diffSimples(resultado.esperada, resultado.obtida);
                    return (
                      <>
                        <p className="result-text">
                          O código rodou sem erros, mas o que foi impresso é
                          diferente do esperado para esta entrada. O trecho
                          destacado é onde as saídas divergem.
                        </p>
                        <div className="out-label">Saída esperada</div>
                        <div className="out-block">
                          {d.prefixo}
                          {d.meioEsperado && <mark>{d.meioEsperado}</mark>}
                          {d.sufixo}
                          {!resultado.esperada && "(vazio)"}
                        </div>
                        <div className="out-label">Saída obtida</div>
                        <div className="out-block">
                          {d.prefixo}
                          {d.meioObtido && <mark>{d.meioObtido}</mark>}
                          {d.sufixo}
                          {!resultado.obtida &&
                            "(vazio — seu código não imprimiu nada)"}
                        </div>
                      </>
                    );
                  })()}

                {(resultado?.tipo === "correto_ideal" ||
                  resultado?.tipo === "correto_melhorar") && (
                  <p className="result-text">
                    Sua resposta foi enviada e está correta — veja o resumo na
                    janela que abriu.
                  </p>
                )}

                {(resultado?.tipo === "erro" ||
                  resultado?.tipo === "saida_incorreta") &&
                  comentarioIA.status !== "ocioso" && (
                    <div className="ia-card">
                      <div className="ia-head">
                        <span className="ia-avatar">
                          <Bot size={13} />
                        </span>
                        <span>Comentário da Kezia</span>
                      </div>
                      <p className="ia-texto">{comentarioIA.texto}</p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            MODAIS (futuro: components/modals/*)
           ===================================================================== */}

        {popupAberto &&
          resultado &&
          (resultado.tipo === "correto_ideal" ||
            resultado.tipo === "correto_melhorar") && (
            <div className="overlay" onClick={() => setPopupAberto(false)}>
              <div className="popup-card" onClick={(e) => e.stopPropagation()}>
                <button
                  className="popup-close"
                  onClick={() => setPopupAberto(false)}
                >
                  <X size={18} />
                </button>
                <div className="popup-icon">
                  <PartyPopper size={26} />
                </div>
                <h3>Tarefa concluída!</h3>
                <p className="sub">
                  Sua saída bateu com o esperado, em {resultado.tempoMs} ms.
                </p>
                {resultado.explicacaoIA && (
                  <p className="sub">{resultado.explicacaoIA}</p>
                )}

                {resultado.tipo === "correto_melhorar" && (
                  <div className="popup-melhorias">
                    <div className="rotulo">
                      <Sparkles size={12} /> Para deixar ainda melhor
                    </div>
                    <ul>
                      {resultado.notas.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="popup-actions">
                  <button
                    className="popup-btn"
                    onClick={() => setPopupAberto(false)}
                  >
                    Continuar aqui
                  </button>
                  {fila ? (
                    fila.indice + 1 < fila.itens.length ? (
                      <button
                        className="popup-btn principal"
                        onClick={avancarNaFila}
                      >
                        Próximo exercício <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button
                        className="popup-btn principal"
                        onClick={finalizarFila}
                      >
                        Finalizar lista
                      </button>
                    )
                  ) : (
                    <button
                      className="popup-btn principal"
                      onClick={() => {
                        setPopupAberto(false);
                        setView(listaAtual ? "exercicios" : "listas");
                      }}
                    >
                      Ver outros exercícios
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        {modalAberto && (
          <div className="overlay" onClick={() => setModalAberto(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <button
                className="popup-close"
                onClick={() => setModalAberto(false)}
              >
                <X size={18} />
              </button>
              <h3>
                {edicaoExercicioId ? "Editar exercício" : "Novo exercício"}
              </h3>
              <p className="sub">
                {edicaoExercicioId
                  ? "Este formulário edita título, enunciado e o caso de amostra. Casos extras adicionados abaixo são criados como novos casos ocultos ao salvar. Para editar os casos ocultos já existentes, use “Ver casos de teste” no menu do exercício."
                  : "Preencha os campos abaixo — o exercício é salvo no servidor assim que enviado."}
              </p>

              {errosForm.geral && (
                <p
                  className="erro"
                  style={{ marginTop: -10, marginBottom: 14 }}
                >
                  <AlertTriangle
                    size={13}
                    style={{ verticalAlign: "-2px", marginRight: 4 }}
                  />
                  {errosForm.geral}
                </p>
              )}

              <div className="campo">
                <label>Lista</label>
                <select
                  value={form.listaId}
                  onChange={(e) =>
                    setForm({ ...form, listaId: e.target.value })
                  }
                  disabled={!!edicaoExercicioId}
                >
                  <option value="">Selecione uma lista…</option>
                  {listas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.titulo}
                    </option>
                  ))}
                  {!edicaoExercicioId && (
                    <option value="__nova__">+ Criar nova lista</option>
                  )}
                </select>
                {errosForm.listaId && (
                  <div className="erro">{errosForm.listaId}</div>
                )}
              </div>

              {form.listaId === "__nova__" && (
                <div className="campo-dupla">
                  <div className="campo">
                    <label>Nome da nova lista</label>
                    <input
                      value={form.novaListaNome}
                      onChange={(e) =>
                        setForm({ ...form, novaListaNome: e.target.value })
                      }
                      placeholder="Ex.: Manipulação de strings"
                    />
                    {errosForm.novaListaNome && (
                      <div className="erro">{errosForm.novaListaNome}</div>
                    )}
                  </div>
                  <div className="campo">
                    <label>Descrição (opcional)</label>
                    <textarea
                      className="textarea-curta"
                      value={form.novaListaDescricao}
                      onChange={(e) =>
                        setForm({ ...form, novaListaDescricao: e.target.value })
                      }
                      placeholder="Ex.: Métodos de string e formatação"
                    />
                  </div>
                </div>
              )}

              <div className="campo">
                <label>Título do exercício</label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex.: Inverter uma string"
                />
                {errosForm.titulo && (
                  <div className="erro">{errosForm.titulo}</div>
                )}
              </div>

              <div className="campo">
                <label>Enunciado</label>
                <textarea
                  value={form.enunciado}
                  onChange={(e) =>
                    setForm({ ...form, enunciado: e.target.value })
                  }
                  placeholder="Descreva o que o aluno deve fazer…"
                />
                {errosForm.enunciado && (
                  <div className="erro">{errosForm.enunciado}</div>
                )}
              </div>

              <EditorCasosDeTeste
                casos={form.testCases}
                onChange={(testCases) => setForm({ ...form, testCases })}
                sugerindo={sugerindoTestCases}
                onSugerir={pedirSugestaoTestCases}
                erro={errosForm.testCases}
              />

              <div className="modal-footer">
                <button
                  className="popup-btn"
                  onClick={() => {
                    setModalAberto(false);
                    setEdicaoExercicioId(null);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="popup-btn principal"
                  onClick={salvarExercicio}
                  disabled={salvandoExercicio}
                >
                  {salvandoExercicio ? (
                    <Loader2 size={14} className="spin" />
                  ) : null}
                  {edicaoExercicioId ? "Salvar alterações" : "Criar exercício"}
                </button>
              </div>
              <p className="modal-nota">
                A correção compara a saída do programa, caractere a caractere,
                com a saída esperada de cada caso de teste, executando no
                servidor.
              </p>
            </div>
          </div>
        )}

        {modalVinculoAberto && (
          <div
            className="overlay"
            onClick={() => !salvandoVinculo && setModalVinculoAberto(null)}
          >
            <div className="popup-card" onClick={(e) => e.stopPropagation()}>
              <button
                className="popup-close"
                onClick={() => setModalVinculoAberto(null)}
                disabled={salvandoVinculo}
              >
                <X size={18} />
              </button>
              <h3>Organizar exercício</h3>
              <p className="sub">
                “{modalVinculoAberto.titulo}” já existe e pode ser adicionado a
                outra lista ou movido para ela.
              </p>
              <div className="campo">
                <label>Lista de destino</label>
                <select
                  value={listaDestinoId}
                  onChange={(e) => setListaDestinoId(e.target.value)}
                  disabled={salvandoVinculo}
                >
                  <option value="">Selecione uma lista…</option>
                  {listas
                    .filter((l) => l.id !== listaAtual?.id)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.titulo}
                      </option>
                    ))}
                </select>
              </div>
              <div className="vinculo-modos">
                <button
                  type="button"
                  className={acaoVinculo === "adicionar" ? "ativo" : ""}
                  onClick={() => setAcaoVinculo("adicionar")}
                  disabled={salvandoVinculo}
                >
                  <ListChecks size={14} /> Adicionar
                </button>
                <button
                  type="button"
                  className={acaoVinculo === "mover" ? "ativo" : ""}
                  onClick={() => setAcaoVinculo("mover")}
                  disabled={salvandoVinculo}
                >
                  <ArrowRight size={14} /> Mover
                </button>
              </div>
              <p className="modal-nota">
                Adicionar mantém o exercício nesta lista. Mover também o remove
                da lista atual.
              </p>
              {vinculoErro && (
                <p className="erro" style={{ marginTop: 10 }}>
                  <AlertTriangle
                    size={13}
                    style={{ verticalAlign: "-2px", marginRight: 4 }}
                  />
                  {vinculoErro}
                </p>
              )}
              <div className="popup-actions">
                <button
                  className="popup-btn"
                  onClick={() => setModalVinculoAberto(null)}
                  disabled={salvandoVinculo}
                >
                  Cancelar
                </button>
                <button
                  className="popup-btn principal"
                  onClick={salvarVinculo}
                  disabled={salvandoVinculo || !listaDestinoId}
                >
                  {salvandoVinculo ? (
                    <Loader2 size={14} className="spin" />
                  ) : null}
                  {acaoVinculo === "mover"
                    ? "Mover exercício"
                    : "Adicionar à lista"}
                </button>
              </div>
            </div>
          </div>
        )}

        {modalListaAberto && (
          <div className="overlay" onClick={() => setModalListaAberto(false)}>
            <div className="popup-card" onClick={(e) => e.stopPropagation()}>
              <button
                className="popup-close"
                onClick={() => setModalListaAberto(false)}
              >
                <X size={18} />
              </button>
              <h3>Editar lista</h3>
              <p className="sub">
                Atualize o título e a descrição desta lista de conteúdo.
              </p>
              {errosForm.geral && (
                <p className="erro">
                  <AlertTriangle
                    size={13}
                    style={{ verticalAlign: "-2px", marginRight: 4 }}
                  />
                  {errosForm.geral}
                </p>
              )}
              <div className="campo">
                <label>Título</label>
                <input
                  value={formLista.titulo}
                  onChange={(e) =>
                    setFormLista({ ...formLista, titulo: e.target.value })
                  }
                  placeholder="Ex.: Laços e Condicionais"
                />
              </div>
              <div className="campo">
                <label>Descrição</label>
                <textarea
                  value={formLista.descricao}
                  onChange={(e) =>
                    setFormLista({ ...formLista, descricao: e.target.value })
                  }
                  placeholder="Descreva o conteúdo desta lista…"
                />
              </div>
              <div className="popup-actions">
                <button
                  className="popup-btn"
                  onClick={() => setModalListaAberto(false)}
                >
                  Cancelar
                </button>
                <button
                  className="popup-btn principal"
                  onClick={salvarEdicaoLista}
                  disabled={salvandoLista}
                >
                  {salvandoLista ? (
                    <Loader2 size={14} className="spin" />
                  ) : null}{" "}
                  Salvar alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de casos de teste — agora apoiado nas rotas reais:
              GET  /problems/{id}/test-cases
              POST /problems/{id}/test-cases (até 10 por chamada)
              PUT  /test-cases (até 10 por chamada)
              DELETE /test-cases
            A amostra é somente leitura aqui (ela é editada junto do
            exercício); os demais casos podem ser criados, editados e
            excluídos livremente, com quebras de linha preservadas. */}
        {casosDeTesteModal && (
          <div
            className="overlay"
            onClick={() => !salvandoCasosDeTeste && setCasosDeTesteModal(null)}
          >
            <div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 640 }}
            >
              <button
                className="popup-close"
                onClick={() => setCasosDeTesteModal(null)}
                disabled={salvandoCasosDeTeste}
              >
                <X size={18} />
              </button>
              <h3>Casos de teste</h3>
              <p className="sub">
                Edite os casos ocultos usados na correção. A amostra é somente
                leitura aqui — para alterá-la, edite o exercício. Quebras de
                linha são preservadas nas entradas e saídas.
              </p>

              {casosDeTesteErro && (
                <p className="erro" style={{ marginBottom: 14 }}>
                  <AlertTriangle
                    size={13}
                    style={{ verticalAlign: "-2px", marginRight: 4 }}
                  />
                  {casosDeTesteErro}
                </p>
              )}

              {carregandoCasosDeTeste ? (
                <p className="result-empty">carregando casos de teste…</p>
              ) : (
                <>
                  <div className="tc-lista">
                    {casosDeTeste.map((caso, index) => (
                      <div
                        className="tc-linha"
                        key={caso.id ?? `novo-${index}`}
                      >
                        <div className="tc-linha-head">
                          <span className="tc-indice">
                            {caso.sample
                              ? "Amostra (visível ao aluno)"
                              : `Caso oculto #${index}`}
                          </span>
                          {!caso.sample && (
                            <button
                              type="button"
                              className="tc-remover"
                              onClick={() =>
                                caso.id
                                  ? excluirCasoDeTesteLocal(caso)
                                  : removerCasoLocalmente(index)
                              }
                              title="Remover caso"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <textarea
                          className="tc-textarea"
                          placeholder="Entrada (opcional) — use Enter para quebras de linha"
                          rows={2}
                          readOnly={caso.sample}
                          value={caso.input ?? ""}
                          onChange={(e) =>
                            atualizarCasoLocalmente(
                              index,
                              "input",
                              e.target.value,
                            )
                          }
                        />
                        <textarea
                          className="tc-textarea"
                          placeholder="Saída esperada (exata) — use Enter para quebras de linha"
                          rows={2}
                          readOnly={caso.sample}
                          value={caso.expected_output ?? ""}
                          onChange={(e) =>
                            atualizarCasoLocalmente(
                              index,
                              "expected_output",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>

                  {casosDeTeste.filter((c) => !c.sample).length < 10 && (
                    <button
                      type="button"
                      className="tc-adicionar"
                      onClick={adicionarCasoLocalmente}
                    >
                      <Plus size={13} /> Adicionar caso de teste
                    </button>
                  )}

                  <div className="modal-footer">
                    <button
                      className="popup-btn"
                      onClick={() => setCasosDeTesteModal(null)}
                      disabled={salvandoCasosDeTeste}
                    >
                      Fechar
                    </button>
                    <button
                      className="popup-btn principal"
                      onClick={salvarCasosDeTeste}
                      disabled={salvandoCasosDeTeste}
                    >
                      {salvandoCasosDeTeste ? (
                        <Loader2 size={14} className="spin" />
                      ) : (
                        <CheckCircle2 size={14} />
                      )}
                      {salvandoCasosDeTeste ? "Salvando…" : "Salvar alterações"}
                    </button>
                  </div>
                  <p className="modal-nota">
                    Até 10 casos ocultos por exercício. Casos novos são criados
                    ao salvar; casos já existentes são atualizados.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal de sorteio de questão dentro de um escopo de listas,
            espelhando GET /problems/random?lists_ids=...&excluded_problem_ids=...&quantity=... */}
        {modalSortearAberto && (
          <div
            className="overlay"
            onClick={() => !sorteando && setModalSortearAberto(false)}
          >
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <button
                className="popup-close"
                onClick={() => setModalSortearAberto(false)}
                disabled={sorteando}
              >
                <X size={18} />
              </button>
              <h3>Sortear questão</h3>
              <p className="sub">
                {listaAtual
                  ? `O sorteio está limitado à lista “${listaAtual.titulo}”.`
                  : "Escolha o escopo. Nenhuma lista marcada considera todas as questões registradas."}
              </p>

              <div className="campo">
                <label>Escopo</label>
                {listaAtual ? (
                  <div className="sorteio-item sorteio-item-fixo">
                    <CheckSquare size={16} />
                    <span>{listaAtual.titulo}</span>
                  </div>
                ) : (
                  <div className="sorteio-listas">
                    {listas.map((l) => (
                      <label className="sorteio-item" key={l.id}>
                        {sorteioListasIds.has(l.id) ? (
                          <CheckSquare size={16} />
                        ) : (
                          <Square size={16} />
                        )}
                        <span>{l.titulo}</span>
                        <input
                          type="checkbox"
                          checked={sorteioListasIds.has(l.id)}
                          onChange={() => alternarListaSorteio(l.id)}
                          style={{ display: "none" }}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <label className="sorteio-toggle">
                {sorteioExcluirResolvidos ? (
                  <CheckSquare size={16} />
                ) : (
                  <Square size={16} />
                )}
                <span>
                  Desconsiderar exercícios já resolvidos nesta sessão (
                  {resolvidos.length})
                </span>
                <input
                  type="checkbox"
                  checked={sorteioExcluirResolvidos}
                  onChange={() => setSorteioExcluirResolvidos((v) => !v)}
                  style={{ display: "none" }}
                />
              </label>

              <div className="campo" style={{ marginTop: 16 }}>
                <label>Quantidade</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={sorteioQuantidade}
                  onChange={(e) =>
                    setSorteioQuantidade(
                      Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                    )
                  }
                />
              </div>

              {sorteioErro && (
                <p className="erro">
                  <AlertTriangle
                    size={13}
                    style={{ verticalAlign: "-2px", marginRight: 4 }}
                  />
                  {sorteioErro}
                </p>
              )}

              <div className="modal-footer">
                <button
                  className="popup-btn"
                  onClick={() => setModalSortearAberto(false)}
                  disabled={sorteando}
                >
                  Cancelar
                </button>
                <button
                  className="popup-btn principal"
                  onClick={confirmarSorteio}
                  disabled={sorteando}
                >
                  {sorteando ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <Dices size={14} />
                  )}
                  {sorteando ? "Sorteando…" : "Sortear"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de revisão da importação por scan — necessário porque
            /ai/documents/extract-questions pode retornar várias questões de
            uma vez (lista inteira escaneada). */}
        {importacao && (
          <div
            className="overlay"
            onClick={() => !importando && setImportacao(null)}
          >
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <button
                className="popup-close"
                onClick={() => setImportacao(null)}
                disabled={importando}
              >
                <X size={18} />
              </button>
              <h3>Revisar questões extraídas</h3>
              <p className="sub">
                {importacao.questoes.length === 1
                  ? "Confira a questão extraída antes de importar."
                  : `Encontramos ${importacao.questoes.length} questões neste documento. Selecione quais deseja importar.`}
              </p>

              <div className="campo">
                <label>Lista de destino</label>
                <select
                  value={importacao.listaId}
                  onChange={(e) =>
                    setImportacao({ ...importacao, listaId: e.target.value })
                  }
                >
                  <option value="">Selecione uma lista…</option>
                  {listas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.titulo}
                    </option>
                  ))}
                  <option value="__nova__">+ Criar nova lista</option>
                </select>
              </div>
              {importacao.listaId === "__nova__" && (
                <div className="campo">
                  <label>Nome da nova lista</label>
                  <input
                    value={importacao.novaListaNome}
                    onChange={(e) =>
                      setImportacao({
                        ...importacao,
                        novaListaNome: e.target.value,
                      })
                    }
                    placeholder="Ex.: Questões da prova 1"
                  />
                </div>
              )}

              <div className="import-lista">
                {importacao.questoes.map((q) => (
                  <div className="import-item" key={q.chave}>
                    <button
                      className="check"
                      onClick={() => alternarSelecaoImportacao(q.chave)}
                      title="Selecionar/desmarcar"
                    >
                      {q.selecionada ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                    <div className="conteudo">
                      <input
                        value={q.titulo}
                        onChange={(e) =>
                          setImportacao((imp) => ({
                            ...imp,
                            questoes: imp.questoes.map((it) =>
                              it.chave === q.chave
                                ? { ...it, titulo: e.target.value }
                                : it,
                            ),
                          }))
                        }
                      />
                      <textarea
                        value={q.enunciado}
                        onChange={(e) =>
                          setImportacao((imp) => ({
                            ...imp,
                            questoes: imp.questoes.map((it) =>
                              it.chave === q.chave
                                ? { ...it, enunciado: e.target.value }
                                : it,
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button
                  className="popup-btn"
                  onClick={() => setImportacao(null)}
                  disabled={importando}
                >
                  Cancelar
                </button>
                <button
                  className="popup-btn principal"
                  onClick={confirmarImportacao}
                  disabled={importando}
                >
                  {importando ? (
                    <Loader2 size={14} className="spin" />
                  ) : (
                    <Wand2 size={14} />
                  )}
                  {importando
                    ? "Gerando casos de teste e importando…"
                    : "Gerar casos de teste com IA e importar"}
                </button>
              </div>
              <p className="modal-nota">
                A extração do documento traz apenas título e enunciado; os casos
                de teste são gerados em seguida com IA. Revise-os depois na tela
                de edição do exercício.
              </p>
            </div>
          </div>
        )}

        {confirmacao && (
          <div className="overlay" onClick={() => setConfirmacao(null)}>
            <div className="popup-card" onClick={(e) => e.stopPropagation()}>
              <button
                className="popup-close"
                onClick={() => setConfirmacao(null)}
              >
                <X size={18} />
              </button>
              <div className="popup-icon aviso">
                <AlertTriangle size={24} />
              </div>
              {confirmacao.acao === "ocultar" && (
                <>
                  <h3>
                    Ocultar{" "}
                    {confirmacao.tipo === "lista" ? "lista" : "exercício"}?
                  </h3>
                  <p className="sub">
                    "{confirmacao.titulo}" não vai sumir da dashboard, mas
                    ficará bloqueada
                    {confirmacao.tipo === "lista"
                      ? " até que as outras listas sejam resolvidas."
                      : " até que os outros exercícios da lista sejam resolvidos."}
                    {confirmacao.tipo === "exercicio" &&
                      " (esse bloqueio vale só para esta sessão do navegador — ver observação no código)."}
                  </p>
                </>
              )}
              {confirmacao.acao === "remover" && (
                <>
                  <h3>Remover exercício da lista?</h3>
                  <p className="sub">
                    "{confirmacao.titulo}" será desvinculado desta lista. Se ele
                    pertencer a outra lista, continuará existindo lá.
                  </p>
                </>
              )}
              {confirmacao.acao === "excluir" && (
                <>
                  <h3>
                    {confirmacao.tipo === "lista"
                      ? "Excluir lista?"
                      : "Excluir questão definitivamente?"}
                  </h3>
                  <p className="sub">
                    {confirmacao.tipo === "lista"
                      ? `Tem certeza que deseja excluir "${confirmacao.titulo}"? Essa ação é definitiva e afeta todos os usuários da plataforma.`
                      : `Tem certeza que deseja excluir "${confirmacao.titulo}" permanentemente? Ela será removida de todas as listas às quais pertence e essa ação não pode ser desfeita.`}
                  </p>
                </>
              )}
              <div className="popup-actions">
                <button
                  className="popup-btn"
                  onClick={() => setConfirmacao(null)}
                >
                  Cancelar
                </button>
                <button
                  className={`popup-btn ${confirmacao.acao === "excluir" ? "perigo" : "principal"}`}
                  onClick={confirmarAcao}
                >
                  {confirmacao.acao === "ocultar"
                    ? "Ocultar"
                    : confirmacao.acao === "remover"
                      ? "Remover"
                      : "Excluir"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        ref={medidorRef}
        style={{
          position: "absolute",
          visibility: "hidden",
          top: 0,
          left: -9999,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          boxSizing: "border-box",
        }}
      />
      {/* =====================================================================
          COMPONENTE GLOBAL: FAB DA PÁGINA INICIAL
          Fora de .pagina-anim para que position: fixed não seja afetado
          pelo transform da animação de entrada.
         ===================================================================== */}
      {view === "listas" && (
        <>
          <input
            ref={scanInputRef}
            type="file"
            accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: "none" }}
            onChange={aoSelecionarArquivoScan}
          />
          <div className="fab-group">
            {fabAberto && (
              <>
                <button className="fab-action" onClick={abrirModalSortear}>
                  <span className="icon-circle">
                    <Dices size={14} />
                  </span>{" "}
                  Sortear questão
                </button>
                <button className="fab-action" onClick={acionarSelecaoArquivo}>
                  <span className="icon-circle">
                    <ScanLine size={14} />
                  </span>{" "}
                  Escanear questão(ões)
                </button>
                <button className="fab-action" onClick={abrirModalCriar}>
                  <span className="icon-circle">
                    <Pencil size={14} />
                  </span>{" "}
                  Criar manualmente
                </button>
              </>
            )}
            <button
              className={`fab-main${fabAberto ? " aberto" : ""}`}
              onClick={() => setFabAberto((v) => !v)}
              title="Criar, escanear ou sortear exercício"
            >
              <Plus size={24} />
            </button>
          </div>
          {scanStatus === "processando" && (
            <div className="scan-toast">
              <Loader2 size={13} className="spin" /> Lendo o documento…
            </div>
          )}
          {scanStatus === "erro" && (
            <div className="scan-toast erro">
              <FileWarning size={13} />{" "}
              {scanErro || "Não consegui ler o documento."}{" "}
              <button
                onClick={() => setScanStatus("ocioso")}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                fechar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* =============================================================================
   GAPS DE BACK-END
   -----------------------------------------------------------------------------
   Funcionalidades que o front-end original previa e que a API/banco de dados
   fornecidos ainda não suportam por completo. Resumo rápido:

   1. Sem autenticação/usuários (sem tabela users, sem login) — tudo abaixo
      que dependeria de "por aluno" é, na prática, global.
   2. Progresso do aluno (resolvidos / desbloqueio sequencial) não é
      persistido: não há tabela de submissões/histórico nem is_hidden ligado
      a usuário. Reseta a cada refresh.
   3. `ExtractedQuestion` só tem title/description — a extração de PDF/
      DOCX/imagem não traz entrada/saída esperada; usamos
      /ai/suggest-test-cases como segundo passo para gerar isso.
   4. "Leitura de PDFs e lista de questões" segue como rota em beta — o
      contrato exato do corpo esperado por /ai/documents/extract-questions
      não foi documentado; tratamos como best-effort.
   5. Sem histórico de submissões (GET /submits ou similar) — não dá pra
      mostrar tentativas anteriores nem reabrir o feedback da IA depois.
   6. SubmitResponse não retorna tempo de execução do servidor — o "ms"
      mostrado agora é só o tempo de ida-e-volta da requisição.
   7. `starter code` do exercício não é persistido — cada abertura usa um
      texto padrão fixo.
   8. Reordenação de listas/exercícios foi removida da UI (não refletia
      nenhuma coluna de ordem na API e não fazia sentido mantê-la).

   Resolvido nesta versão: a gestão de casos de teste ocultos (visualizar,
   criar até 10, editar e excluir) agora usa as rotas reais GET/POST/PUT/DELETE
   de /problems/{id}/test-cases e /test-cases, então o cache local por sessão
   do navegador que existia antes foi removido.
   ============================================================================= */
