"use client";

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
  ChevronUp,
  ChevronDown,
  Lock,
  ScanLine,
  FileWarning,
} from "lucide-react";
import Image from "next/image";

const LINE_HEIGHT_PX = 22;

/* =========================================================================
   LISTAS DE CONTEÚDO + EXERCÍCIOS — em produção viria de uma API/banco.
   ========================================================================= */
const LISTAS = [
  {
    id: "loops",
    titulo: "Laços e Condicionais",
    descricao: "Fluxo de controle: for, if e range.",
  },
  {
    id: "recursao",
    titulo: "Recursão e Sequências",
    descricao: "Funções que chamam a si mesmas e sequências numéricas.",
  },
];

const EXERCICIOS = [
  {
    id: "pares",
    listaId: "loops",
    titulo: "Números pares",
    enunciado:
      "Escreva um programa que imprima todos os números pares entre 1 e 20 (incluindo o 20), separados por um único espaço, em uma única linha.",
    entradaSaida: {
      entrada: "— (sem entrada)",
      saida: "2 4 6 8 10 12 14 16 18 20",
    },
    starter: `# Escreva sua solução abaixo.
# Dica: use um laço (for) e a função print().

for numero in range(1, 21):
    pass  # substitua esta linha
`,
    saidaEsperada: "2 4 6 8 10 12 14 16 18 20",
    avaliarQualidade: (codigo) => {
      const notas = [];
      const usaPasso2 = /range\s*\(\s*\d+\s*,\s*\d+\s*,\s*2\s*\)/.test(codigo);
      const usaModulo = /%\s*2\s*==\s*0/.test(codigo);
      if (usaModulo && !usaPasso2) {
        notas.push(
          "Seu código testa cada número com `% 2 == 0`. Funciona, mas dá para ir direto ao ponto pulando de 2 em 2 com `range(2, 21, 2)`.",
        );
      }
      return notas;
    },
  },
  {
    id: "primo",
    listaId: "loops",
    titulo: "Verificar número primo",
    enunciado:
      "A variável n já vem definida com o valor 29. Verifique se n é primo e imprima exatamente Primo ou Não é primo (sem aspas, sem texto extra).",
    entradaSaida: { entrada: "n = 29", saida: "Primo" },
    starter: `n = 29

# Verifique se n é primo e imprima o resultado.
`,
    saidaEsperada: "Primo",
    avaliarQualidade: (codigo) => {
      const notas = [];
      const loopAteN =
        /range\s*\(\s*2\s*,\s*n\s*\)/.test(codigo) ||
        /range\s*\(\s*2\s*,\s*n\s*\+\s*1\s*\)/.test(codigo);
      const usaRaiz = /\*\*\s*0\.5|sqrt\s*\(/.test(codigo);
      if (loopAteN && !usaRaiz) {
        notas.push(
          "O laço percorre todos os números até n. Para checar primalidade basta ir até a raiz quadrada (`range(2, int(n**0.5) + 1)`) — mesmo resultado, muito menos iterações.",
        );
      }
      if (!/n\s*<\s*2/.test(codigo) && !/n\s*<=\s*1/.test(codigo)) {
        notas.push(
          "Para deixar a solução mais robusta, trate explicitamente o caso n < 2, mesmo que o valor fixo de hoje não passe por esse caminho.",
        );
      }
      return notas;
    },
  },
  {
    id: "fibonacci",
    listaId: "recursao",
    titulo: "Sequência de Fibonacci",
    enunciado:
      "Imprima os 10 primeiros termos da sequência de Fibonacci (começando em 0 e 1), separados por um único espaço, em uma única linha.",
    entradaSaida: {
      entrada: "— (sem entrada)",
      saida: "0 1 1 2 3 5 8 13 21 34",
    },
    starter: `# Gere os 10 primeiros termos de Fibonacci.

`,
    saidaEsperada: "0 1 1 2 3 5 8 13 21 34",
    avaliarQualidade: (codigo) => {
      const notas = [];
      const recursivoSemMemo =
        /def\s+\w+\s*\(/.test(codigo) &&
        /\w+\s*\(\s*\w+\s*-\s*1\s*\)/.test(codigo) &&
        /\w+\s*\(\s*\w+\s*-\s*2\s*\)/.test(codigo) &&
        !/lru_cache|memo|\{\}/.test(codigo);
      if (recursivoSemMemo) {
        notas.push(
          "Sua solução usa recursão pura. Para 10 termos funciona bem, mas o custo cresce exponencialmente — para números maiores, prefira uma versão iterativa ou `functools.lru_cache`.",
        );
      }
      return notas;
    },
  },
  {
    id: "fatorial",
    listaId: "recursao",
    titulo: "Fatorial de um número",
    enunciado:
      "A variável n já vem definida com o valor 5. Calcule o fatorial de n (n!) e imprima apenas o resultado.",
    entradaSaida: { entrada: "n = 5", saida: "120" },
    starter: `n = 5

# Calcule o fatorial de n e imprima o resultado.
`,
    saidaEsperada: "120",
    avaliarQualidade: () => [],
  },
];

function previewDe(texto, max = 92) {
  const limpo = texto.trim();
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
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* =========================================================================
   ERROS PYTHON -> EXPLICAÇÃO DIDÁTICA
   ========================================================================= */
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
  const encontrado = mapa.find((m) => textoErro.includes(m.chave));
  if (encontrado) return encontrado;
  return {
    titulo: "Erro ao executar o código",
    explicacao: "Algo impediu a execução completa do seu programa.",
    dica: "Veja o detalhe técnico para localizar a linha exata do problema.",
  };
}

/* diff simples por prefixo/sufixo comum */
function diffSimples(esperado, obtido) {
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

/* validação da criação de exercício/lista personalizados — tudo no front-end */
function validarNovoExercicio(f) {
  const erros = {};
  if (!f.titulo.trim() || f.titulo.trim().length < 3)
    erros.titulo = "Informe um título com pelo menos 3 caracteres.";
  if (!f.enunciado.trim() || f.enunciado.trim().length < 15)
    erros.enunciado = "Descreva o enunciado com pelo menos 15 caracteres.";
  if (!f.saidaEsperada.trim())
    erros.saidaEsperada = "Informe a saída exata que o programa deve imprimir.";
  if (!f.listaId)
    erros.listaId = "Escolha uma lista existente ou crie uma nova.";
  if (
    f.listaId === "__nova__" &&
    (!f.novaListaNome.trim() || f.novaListaNome.trim().length < 3)
  ) {
    erros.novaListaNome = "Dê um nome (mín. 3 caracteres) para a nova lista.";
  }
  return erros;
}

const PYODIDE_VERSION = "0.28.3";
const PYODIDE_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pyodide/${PYODIDE_VERSION}/`;

const WRAPPER_PY = `
import sys, io, traceback
_stdout_capture = io.StringIO()
_old_stdout = sys.stdout
sys.stdout = _stdout_capture
_erro = None
try:
    exec(compile(codigo_do_aluno, "<aluno>", "exec"), {})
except Exception as e:
    _erro = "".join(traceback.format_exception_only(type(e), e)).strip()
finally:
    sys.stdout = _old_stdout
_saida = _stdout_capture.getvalue()
`;

async function pedirComentarioIA({
  enunciado,
  codigo,
  esperado,
  obtido,
  erro,
}) {
  const contexto = erro
    ? `Erro ao executar: ${erro}`
    : `Saída esperada: ${JSON.stringify(esperado)}\nSaída obtida: ${JSON.stringify(obtido)}`;

  const prompt = `Enunciado do exercício: ${enunciado}

Código do aluno:
\`\`\`python
${codigo}
\`\`\`

${contexto}

Escreva um comentário curto (no máximo 3 frases), em português do Brasil, como "Kezia", assistente de IA simpática e direta de uma plataforma de exercícios de Python. Aponte a causa mais provável do problema e uma dica objetiva de correção. Não reescreva o código inteiro do aluno, nem revele a resposta pronta.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  const bloco = data?.content?.find((b) => b.type === "text");
  if (!bloco?.text) throw new Error("resposta vazia");
  return bloco.text.trim();
}

const FORM_VAZIO = {
  listaId: "",
  novaListaNome: "",
  novaListaDescricao: "",
  titulo: "",
  enunciado: "",
  entrada: "",
  saidaEsperada: "",
  starter: "",
};
const FORM_LISTA_VAZIO = { id: null, titulo: "", descricao: "" };

export default function KeziaExercicios() {
  const [tema, setTema] = useState("escuro");
  const [view, setView] = useState("listas"); // 'listas' | 'exercicios' | 'exercicio'
  const [listaAtual, setListaAtual] = useState(null);
  const [exercicioAtual, setExercicioAtual] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [pyodideStatus, setPyodideStatus] = useState("carregando");
  const [executando, setExecutando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [comentarioIA, setComentarioIA] = useState({
    status: "ocioso",
    texto: "",
  });
  const [popupAberto, setPopupAberto] = useState(false);
  const [fila, setFila] = useState(null); // { itens: [...], indice: number } quando resolvendo uma lista inteira
  const [resolvidos, setResolvidos] = useState([]); // ids de exercícios já resolvidos com sucesso

  const [listas, setListas] = useState(() =>
    LISTAS.map((l, i) => ({ ...l, ordem: i, oculta: false })),
  );
  const [exercicios, setExercicios] = useState(() =>
    EXERCICIOS.map((e, i) => ({ ...e, ordem: i, oculta: false })),
  );

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [errosForm, setErrosForm] = useState({});
  const [edicaoExercicioId, setEdicaoExercicioId] = useState(null);

  const [modalListaAberto, setModalListaAberto] = useState(false);
  const [formLista, setFormLista] = useState(FORM_LISTA_VAZIO);

  const [menuAberto, setMenuAberto] = useState(null); // { tipo: 'lista'|'exercicio', id }
  const [moverExpandido, setMoverExpandido] = useState(null); // id do item com submenu "mover" aberto
  const [confirmacao, setConfirmacao] = useState(null); // { acao: 'ocultar'|'excluir', tipo: 'lista'|'exercicio', id, titulo }

  const [fabAberto, setFabAberto] = useState(false);
  const [scanStatus, setScanStatus] = useState("ocioso"); // 'ocioso' | 'processando' | 'erro'
  const scanInputRef = useRef(null);

  const pyodideRef = useRef(null);
  const textareaRef = useRef(null);
  const medidorRef = useRef(null);
  const gutterWrapRef = useRef(null);
  const gutterInnerRef = useRef(null);
  const codigoRef = useRef("");
  const [numerosLinha, setNumerosLinha] = useState([1]);

  const todasListas = listas;
  const todosExercicios = exercicios;
  const listasOrdenadas = useMemo(
    () => [...listas].sort((a, b) => a.ordem - b.ordem),
    [listas],
  );
  const exerciciosOrdenados = useMemo(
    () => [...exercicios].sort((a, b) => a.ordem - b.ordem),
    [exercicios],
  );

  /* ---------- lógica de conclusão / bloqueio ---------- */
  const listaCompleta = useCallback(
    (lista) => {
      const exs = exercicios.filter((e) => e.listaId === lista.id);
      if (exs.length === 0) return false;
      return exs.every((e) => resolvidos.includes(e.id));
    },
    [exercicios, resolvidos],
  );

  const listaBloqueada = useCallback(
    (lista) => {
      if (!lista.oculta) return false;
      const outras = listas.filter((l) => l.id !== lista.id);
      if (outras.length === 0) return true;
      return !outras.every((l) => listaCompleta(l));
    },
    [listas, listaCompleta],
  );

  const exercicioBloqueado = useCallback(
    (ex) => {
      if (!ex.oculta) return false;
      const outros = exercicios.filter(
        (e) => e.listaId === ex.listaId && e.id !== ex.id,
      );
      if (outros.length === 0) return true;
      return !outros.every((e) => resolvidos.includes(e.id));
    },
    [exercicios, resolvidos],
  );

  useEffect(() => {
    const linkFont = document.createElement("link");
    linkFont.rel = "stylesheet";
    linkFont.href =
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap";
    document.head.appendChild(linkFont);

    const script = document.createElement("script");
    script.src = `${PYODIDE_BASE}pyodide.js`;
    script.async = true;
    script.onload = async () => {
      try {
        const pyodide = await window.loadPyodide({ indexURL: PYODIDE_BASE });
        pyodideRef.current = pyodide;
        setPyodideStatus("pronto");
      } catch (e) {
        setPyodideStatus("falhou");
      }
    };
    script.onerror = () => setPyodideStatus("falhou");
    document.body.appendChild(script);

    return () => {
      if (linkFont.parentNode) document.head.removeChild(linkFont);
    };
  }, []);

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

  const selecionarLista = (lista) => {
    if (listaBloqueada(lista)) return;
    setListaAtual(lista);
    setFila(null);
    setView("exercicios");
  };

  const voltarParaListas = () => {
    setView("listas");
    setListaAtual(null);
    setFila(null);
  };

  const voltarParaExercicios = () => {
    setFila(null);
    setView("exercicios");
  };

  const abrirExercicio = (ex) => {
    if (exercicioBloqueado(ex)) return;
    setFila(null);
    carregarExercicio(ex);
  };

  const resolverLista = (lista, aleatorio) => {
    const itensDaLista = exerciciosOrdenados.filter(
      (e) => e.listaId === lista.id && !exercicioBloqueado(e),
    );
    if (itensDaLista.length === 0) return;
    const itens = aleatorio ? embaralhar(itensDaLista) : itensDaLista;
    setFila({ itens, indice: 0 });
    carregarExercicio(itens[0]);
  };

  const finalizarFila = () => {
    setFila(null);
    setPopupAberto(false);
    setView("exercicios");
  };

  /* itens usados para os botões avançar/retroceder na tela do exercício:
     seguem a fila (sequencial/aleatória) quando existe, senão a ordem da lista atual */
  const itensNavegacao = fila
    ? fila.itens
    : listaAtual
      ? exerciciosOrdenados.filter((e) => e.listaId === listaAtual.id)
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

  /* ---------- criação e edição personalizadas ---------- */
  const abrirModalCriar = () => {
    setForm({ ...FORM_VAZIO, listaId: listaAtual?.id || "" });
    setErrosForm({});
    setEdicaoExercicioId(null);
    setFabAberto(false);
    setModalAberto(true);
  };

  const abrirEdicaoExercicio = (ex) => {
    setForm({
      listaId: ex.listaId,
      novaListaNome: "",
      novaListaDescricao: "",
      titulo: ex.titulo,
      enunciado: ex.enunciado,
      entrada:
        ex.entradaSaida.entrada === "— (sem entrada)"
          ? ""
          : ex.entradaSaida.entrada,
      saidaEsperada: ex.saidaEsperada,
      starter: ex.starter,
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
    setMenuAberto(null);
    setModalListaAberto(true);
  };

  const salvarEdicaoLista = () => {
    if (!formLista.titulo.trim() || formLista.titulo.trim().length < 3) return;
    setListas((prev) =>
      prev.map((l) =>
        l.id === formLista.id
          ? {
              ...l,
              titulo: formLista.titulo.trim(),
              descricao: formLista.descricao.trim() || l.descricao,
            }
          : l,
      ),
    );
    setModalListaAberto(false);
  };

  const salvarExercicio = () => {
    const erros = validarNovoExercicio(form);
    if (Object.keys(erros).length > 0) {
      setErrosForm(erros);
      return;
    }

    if (edicaoExercicioId) {
      setExercicios((prev) =>
        prev.map((e) =>
          e.id === edicaoExercicioId
            ? {
                ...e,
                listaId: form.listaId === "__nova__" ? e.listaId : form.listaId,
                titulo: form.titulo.trim(),
                enunciado: form.enunciado.trim(),
                entradaSaida: {
                  entrada: form.entrada.trim() || "— (sem entrada)",
                  saida: form.saidaEsperada.trim(),
                },
                starter: form.starter.trim() || e.starter,
                saidaEsperada: form.saidaEsperada.trim(),
              }
            : e,
        ),
      );
      setModalAberto(false);
      setEdicaoExercicioId(null);
      return;
    }

    let listaId = form.listaId;
    if (listaId === "__nova__") {
      listaId = `custom-lista-${slugificar(form.novaListaNome) || Date.now()}`;
      const maiorOrdemLista = listas.reduce(
        (max, l) => Math.max(max, l.ordem),
        -1,
      );
      const novaLista = {
        id: listaId,
        titulo: form.novaListaNome.trim(),
        descricao: form.novaListaDescricao.trim() || "Lista personalizada.",
        ordem: maiorOrdemLista + 1,
        oculta: false,
      };
      setListas((prev) => [...prev, novaLista]);
    }

    const maiorOrdemExercicio = exercicios.reduce(
      (max, e) => Math.max(max, e.ordem),
      -1,
    );
    const novoExercicio = {
      id: `custom-${Date.now()}`,
      listaId,
      titulo: form.titulo.trim(),
      enunciado: form.enunciado.trim(),
      entradaSaida: {
        entrada: form.entrada.trim() || "— (sem entrada)",
        saida: form.saidaEsperada.trim(),
      },
      starter: form.starter.trim() || "# Escreva sua solução abaixo.\n\n",
      saidaEsperada: form.saidaEsperada.trim(),
      avaliarQualidade: () => [],
      personalizado: true,
      ordem: maiorOrdemExercicio + 1,
      oculta: false,
    };
    setExercicios((prev) => [...prev, novoExercicio]);
    setModalAberto(false);

    const listaFinal =
      listaId === form.listaId
        ? todasListas.find((l) => l.id === listaId)
        : {
            id: listaId,
            titulo: form.novaListaNome.trim(),
            descricao: form.novaListaDescricao.trim() || "Lista personalizada.",
          };
    setListaAtual(listaFinal);
    setFila(null);
    setView("exercicios");
  };

  /* ---------- menu de 3 pontinhos: mover, ocultar, excluir ---------- */
  const moverItem = (tipo, id, direcao) => {
    if (tipo === "lista") {
      setListas((prev) => {
        const ordenadas = [...prev].sort((a, b) => a.ordem - b.ordem);
        const idx = ordenadas.findIndex((x) => x.id === id);
        const novoIdx = idx + (direcao === "cima" ? -1 : 1);
        if (idx === -1 || novoIdx < 0 || novoIdx >= ordenadas.length)
          return prev;
        const a = ordenadas[idx],
          b = ordenadas[novoIdx];
        return prev.map((x) =>
          x.id === a.id
            ? { ...x, ordem: b.ordem }
            : x.id === b.id
              ? { ...x, ordem: a.ordem }
              : x,
        );
      });
    } else {
      setExercicios((prev) => {
        const alvo = prev.find((x) => x.id === id);
        if (!alvo) return prev;
        const grupo = prev
          .filter((x) => x.listaId === alvo.listaId)
          .sort((a, b) => a.ordem - b.ordem);
        const idx = grupo.findIndex((x) => x.id === id);
        const novoIdx = idx + (direcao === "cima" ? -1 : 1);
        if (novoIdx < 0 || novoIdx >= grupo.length) return prev;
        const a = grupo[idx],
          b = grupo[novoIdx];
        return prev.map((x) =>
          x.id === a.id
            ? { ...x, ordem: b.ordem }
            : x.id === b.id
              ? { ...x, ordem: a.ordem }
              : x,
        );
      });
    }
    setMenuAberto(null);
    setMoverExpandido(null);
  };

  const pedirOcultar = (tipo, item) => {
    setMenuAberto(null);
    setConfirmacao({ acao: "ocultar", tipo, id: item.id, titulo: item.titulo });
  };

  const removerBloqueio = (tipo, id) => {
    if (tipo === "lista")
      setListas((prev) =>
        prev.map((l) => (l.id === id ? { ...l, oculta: false } : l)),
      );
    else
      setExercicios((prev) =>
        prev.map((e) => (e.id === id ? { ...e, oculta: false } : e)),
      );
    setMenuAberto(null);
  };

  const pedirExcluir = (tipo, item) => {
    setMenuAberto(null);
    setConfirmacao({ acao: "excluir", tipo, id: item.id, titulo: item.titulo });
  };

  const confirmarAcao = () => {
    if (!confirmacao) return;
    const { acao, tipo, id } = confirmacao;
    if (acao === "ocultar") {
      if (tipo === "lista")
        setListas((prev) =>
          prev.map((l) => (l.id === id ? { ...l, oculta: true } : l)),
        );
      else
        setExercicios((prev) =>
          prev.map((e) => (e.id === id ? { ...e, oculta: true } : e)),
        );
    } else if (acao === "excluir") {
      if (tipo === "lista") {
        setListas((prev) => prev.filter((l) => l.id !== id));
        if (listaAtual?.id === id) voltarParaListas();
      } else {
        setExercicios((prev) => prev.filter((e) => e.id !== id));
        if (exercicioAtual?.id === id) voltarParaExercicios();
      }
    }
    setConfirmacao(null);
  };

  /* ---------- escanear questão de um documento (imagem ou PDF) ---------- */
  const arquivoParaBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const acionarSelecaoArquivo = () => {
    setFabAberto(false);
    scanInputRef.current?.click();
  };

  const aoSelecionarArquivoScan = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanStatus("processando");
    try {
      const base64 = await arquivoParaBase64(file);
      const ehPdf = file.type === "application/pdf";
      const blocoArquivo = ehPdf
        ? {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          }
        : {
            type: "image",
            source: {
              type: "base64",
              media_type: file.type || "image/png",
              data: base64,
            },
          };
      const instrucao = `Este arquivo contém um enunciado de exercício de programação em Python. Extraia as informações e responda APENAS com um JSON válido, sem markdown e sem crases, no formato exato:
{"titulo": "...", "enunciado": "...", "entrada": "...", "saidaEsperada": "..."}
Se não houver entrada explícita, use "— (sem entrada)" no campo entrada. Se não conseguir identificar a saída esperada com certeza, faça sua melhor estimativa a partir do enunciado.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 600,
          messages: [
            {
              role: "user",
              content: [blocoArquivo, { type: "text", text: instrucao }],
            },
          ],
        }),
      });
      const data = await response.json();
      const bloco = data?.content?.find((b) => b.type === "text");
      if (!bloco?.text) throw new Error("resposta vazia");
      const limpo = bloco.text
        .trim()
        .replace(/^```json/i, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();
      const extraido = JSON.parse(limpo);

      setForm({
        listaId: listaAtual?.id || "",
        novaListaNome: "",
        novaListaDescricao: "",
        titulo: extraido.titulo || "",
        enunciado: extraido.enunciado || "",
        entrada:
          extraido.entrada && extraido.entrada !== "— (sem entrada)"
            ? extraido.entrada
            : "",
        saidaEsperada: extraido.saidaEsperada || "",
        starter: "",
      });
      setErrosForm({});
      setEdicaoExercicioId(null);
      setScanStatus("ocioso");
      setModalAberto(true);
    } catch (err) {
      setScanStatus("erro");
    }
  };

  /* ---------- IA e execução ---------- */
  const dispararComentarioIA = useCallback(async (contexto) => {
    setComentarioIA({ status: "carregando", texto: "" });
    try {
      const texto = await pedirComentarioIA(contexto);
      setComentarioIA({ status: "pronto", texto });
    } catch (e) {
      setComentarioIA({
        status: "falhou",
        texto:
          "Não consegui buscar meu comentário agora — mas a explicação e o diff acima já mostram onde está o problema.",
      });
    }
  }, []);

  const executar = useCallback(async () => {
    if (!pyodideRef.current || executando || !exercicioAtual) return;
    setExecutando(true);
    setResultado(null);
    setComentarioIA({ status: "ocioso", texto: "" });
    setPopupAberto(false);

    const inicio = performance.now();
    try {
      const pyodide = pyodideRef.current;
      pyodide.globals.set("codigo_do_aluno", codigo);
      await pyodide.runPythonAsync(WRAPPER_PY);
      const tempoMs = Math.round(performance.now() - inicio);
      const saida = pyodide.globals.get("_saida");
      const erro = pyodide.globals.get("_erro");

      if (erro) {
        setResultado({ tipo: "erro", erro, tempoMs });
        dispararComentarioIA({
          enunciado: exercicioAtual.enunciado,
          codigo,
          erro,
        });
        return;
      }

      const obtida = (saida ?? "").trim();
      const esperada = exercicioAtual.saidaEsperada.trim();

      if (obtida !== esperada) {
        setResultado({ tipo: "saida_incorreta", obtida, esperada, tempoMs });
        dispararComentarioIA({
          enunciado: exercicioAtual.enunciado,
          codigo,
          esperado: esperada,
          obtido: obtida,
        });
        return;
      }

      const notas = exercicioAtual.avaliarQualidade(codigo);
      setResultado({
        tipo: notas.length > 0 ? "correto_melhorar" : "correto_ideal",
        notas,
        tempoMs,
      });
      setResolvidos((prev) =>
        prev.includes(exercicioAtual.id) ? prev : [...prev, exercicioAtual.id],
      );
      setPopupAberto(true);
    } catch (e) {
      const tempoMs = Math.round(performance.now() - inicio);
      setResultado({ tipo: "erro", erro: String(e), tempoMs });
    } finally {
      setExecutando(false);
    }
  }, [codigo, exercicioAtual, executando, dispararComentarioIA]);

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
        .theme-btn { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 9px; background: var(--surface); border: 1px solid var(--border); color: var(--text-soft); cursor: pointer; }
        .theme-btn:hover { color: var(--secondary); border-color: var(--secondary); }
        .status-pill { display: flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-soft); border: 1px solid var(--border); padding: 6px 12px; border-radius: 999px; background: var(--surface); }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--text-soft); }
        .status-dot.pronto { background: var(--secondary); }
        .status-dot.falhou { background: var(--tertiary); }
        .ghost-btn { display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--border); color: inherit; font-family: var(--font-sans); font-size: 13.5px; font-weight: 600; padding: 8px 14px; border-radius: 9px; cursor: pointer; }
        .ghost-btn:hover { border-color: var(--secondary); color: var(--secondary); }

        /* ---------- LISTAS DE CONTEÚDO ---------- */
        .secao-head { margin-bottom: 22px; }
        .secao-head h2 { font-size: 24px; margin: 0 0 6px; }
        .secao-head p { margin: 0; color: var(--text-soft); font-size: 14.5px; }
        .conteudo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
        .conteudo-card { text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 22px; cursor: pointer; display: flex; flex-direction: column; gap: 10px; transition: border-color 0.15s ease, transform 0.15s ease; }
        .conteudo-card:hover { border-color: var(--secondary); transform: translateY(-2px); }
        .conteudo-card h3 { margin: 0; font-size: 18px; }
        .conteudo-card p { margin: 0; font-size: 13.5px; color: var(--text-soft); line-height: 1.5; flex-grow: 1; }
        .conteudo-card .contagem { display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 11.5px; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.05em; }

        .fab { position: fixed; right: 30px; bottom: 30px; width: 54px; height: 54px; border-radius: 50%; background: var(--secondary); color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 12px 28px rgba(0,0,0,0.35); z-index: 40; }
        .fab:hover { background: var(--primary); transform: translateY(-2px); }

        /* ---------- LISTA DETALHE ---------- */
        .lista-toolbar { display: flex; gap: 12px; margin: 18px 0 26px; flex-wrap: wrap; }
        .lista-toolbar button { display: flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-weight: 700; font-size: 13.5px; padding: 10px 16px; border-radius: 9px; cursor: pointer; border: 1px solid var(--border); }
        .btn-resolver { background: var(--secondary); border-color: var(--secondary); color: #fff; }
        .btn-resolver:hover { background: var(--primary); }
        .btn-aleatorio { background: var(--surface); color: inherit; }
        .btn-aleatorio:hover { border-color: var(--tertiary); color: var(--tertiary); }
        .exercicio-card { text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; cursor: pointer; display: flex; flex-direction: column; gap: 8px; transition: border-color 0.15s ease, transform 0.15s ease; }
        .exercicio-card:hover { border-color: var(--secondary); transform: translateY(-2px); }
        .exercicio-card h3 { margin: 0; font-size: 16px; }
        .exercicio-card p { margin: 0; font-size: 13px; color: var(--text-soft); line-height: 1.5; }

        /* ---------- PÁGINA DO EXERCÍCIO ---------- */
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
        @media (max-width: 880px) { .grid { grid-template-columns: 1fr; } }

        .panel { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 26px 26px 24px; box-shadow: 0 20px 45px rgba(0,0,0,0.16); position: relative; min-height: 380px; }
        .eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--secondary); margin: 0 0 8px; }
        .panel h2 { font-family: var(--font-sans); font-weight: 700; font-size: 23px; margin: 0 0 14px; }
        .panel p.enunciado { font-size: 15.5px; line-height: 1.65; margin: 0 0 20px; color: inherit; }
        .es-box { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .es-card { background: var(--surface-soft); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; }
        .es-card .label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-soft); }
        .es-card .value { font-family: var(--font-mono); font-size: 13.5px; margin-top: 4px; word-break: break-word; }

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
        textarea.editor { flex: 1; min-width: 0; min-height: 280px; resize: vertical; background: var(--code-bg); color: #D8DEE4; font-family: var(--font-mono); font-size: 14px; line-height: ${LINE_HEIGHT_PX}px; border: none; outline: none; padding: 18px 20px; tab-size: 4; }

        .run-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--code-bg-soft); border-top: 1px solid var(--border); }
        .run-btn { display: flex; align-items: center; gap: 8px; background: var(--secondary); color: #fff; border: none; font-family: var(--font-sans); font-weight: 700; font-size: 14px; padding: 10px 18px; border-radius: 9px; cursor: pointer; }
        .run-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .run-btn:not(:disabled):hover { background: var(--primary); }
        .run-hint { font-family: var(--font-mono); font-size: 11px; color: var(--text-soft); }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .result-card { border-radius: 12px; border: 1px solid var(--border); background: var(--code-bg-soft); min-height: 100px; padding: 18px 20px; box-shadow: 0 16px 36px rgba(0,0,0,0.16); }
        .result-empty { color: var(--text-soft); font-family: var(--font-mono); font-size: 13px; }
        .result-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .result-head { display: flex; align-items: center; gap: 10px; }
        .result-head h3 { font-family: var(--font-sans); font-size: 15.5px; font-weight: 700; margin: 0; }
        .tempo-pill { display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-soft); background: rgba(255,255,255,0.04); border: 1px solid var(--border); padding: 4px 10px; border-radius: 999px; flex-shrink: 0; }
        .result-text { font-size: 14px; line-height: 1.6; color: #C9D1DA; }
        .out-label { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-soft); margin-top: 12px; }
        .out-block { font-family: var(--font-mono); font-size: 13px; background: #0E1013; border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; margin-top: 6px; color: #D8DEE4; white-space: pre-wrap; word-break: break-word; }
        .out-block mark { background: color-mix(in srgb, var(--tertiary) 35%, transparent); color: #fff; border-radius: 3px; padding: 0 1px; }
        details.tech { margin-top: 12px; }
        details.tech summary { cursor: pointer; font-family: var(--font-mono); font-size: 12px; color: var(--text-soft); }

        .ia-card { margin-top: 14px; border-radius: 10px; padding: 14px 16px; background: var(--surface); border: 1px solid var(--border); position: relative; }
        .ia-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .ia-avatar { width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(120deg, var(--primary), var(--tertiary)); display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
        .ia-head span { font-family: var(--font-mono); font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-soft); }
        .ia-texto { font-size: 14px; line-height: 1.6; color: inherit; }
        .ia-loading { display: flex; gap: 5px; align-items: center; font-family: var(--font-mono); font-size: 12.5px; color: var(--text-soft); }
        .ia-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--text-soft); animation: piscar 1.1s infinite ease-in-out; }
        .ia-dot:nth-child(2) { animation-delay: 0.15s; }
        .ia-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes piscar { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }

        /* ---------- POPUP TAREFA CONCLUÍDA ---------- */
        .overlay { position: fixed; inset: 0; background: rgba(10, 10, 14, 0.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px; animation: fadeIn 180ms ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .popup-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; max-width: 420px; width: 100%; padding: 28px 26px 24px; box-shadow: 0 30px 70px rgba(0,0,0,0.4); position: relative; animation: popIn 260ms cubic-bezier(.2,1.6,.4,1); }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.85) translateY(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        .popup-close { position: absolute; top: 14px; right: 14px; background: none; border: none; color: var(--text-soft); cursor: pointer; }
        .popup-close:hover { color: var(--tertiary); }
        .popup-icon { width: 52px; height: 52px; border-radius: 50%; background: color-mix(in srgb, var(--secondary) 16%, transparent); display: flex; align-items: center; justify-content: center; color: var(--secondary); margin-bottom: 14px; }
        .popup-card h3 { margin: 0 0 6px; font-size: 20px; }
        .popup-card p.sub { margin: 0 0 4px; color: var(--text-soft); font-size: 14px; }
        .popup-melhorias { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
        .popup-melhorias .rotulo { display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #E9C572; margin-bottom: 8px; }
        .popup-melhorias ul { margin: 0; padding-left: 18px; font-size: 13.5px; line-height: 1.55; color: inherit; }
        .popup-melhorias li { margin-bottom: 8px; }
        .popup-actions { display: flex; gap: 10px; margin-top: 20px; }
        .popup-btn { flex: 1; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 14px; border-radius: 9px; font-weight: 600; font-size: 13.5px; cursor: pointer; border: 1px solid var(--border); background: var(--surface-soft); color: inherit; }
        .popup-btn.principal { background: var(--secondary); border-color: var(--secondary); color: #fff; }
        .popup-btn.principal:hover { background: var(--primary); }
        .popup-btn:hover { border-color: var(--secondary); }

        /* ---------- MODAL DE CRIAÇÃO ---------- */
        .modal-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; max-width: 520px; width: 100%; max-height: 88vh; overflow-y: auto; padding: 26px 26px 22px; box-shadow: 0 30px 70px rgba(0,0,0,0.4); position: relative; animation: popIn 220ms cubic-bezier(.2,1.6,.4,1); }
        .modal-card h3 { margin: 0 0 4px; font-size: 19px; }
        .modal-card p.sub { margin: 0 0 20px; color: var(--text-soft); font-size: 13.5px; }
        .campo { margin-bottom: 16px; }
        .campo label { display: block; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-soft); margin-bottom: 6px; }
        .campo input, .campo textarea, .campo select { width: 100%; box-sizing: border-box; background: var(--surface-soft); border: 1px solid var(--border); border-radius: 8px; padding: 9px 11px; font-family: var(--font-sans); font-size: 13.5px; color: inherit; }
        .campo textarea { font-family: var(--font-mono); resize: vertical; min-height: 60px; }
        .campo .erro { color: var(--tertiary); font-size: 12px; margin-top: 5px; }
        .campo-dupla { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .modal-footer { display: flex; gap: 10px; margin-top: 6px; }
        .modal-nota { font-size: 11.5px; color: var(--text-soft); margin-top: 14px; }

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
        .card-menu-btn { position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: var(--text-soft); display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5; }
        .card-menu-btn:hover { background: var(--surface-soft); border-color: var(--border); color: var(--secondary); }
        .card-menu { position: absolute; top: 42px; right: 12px; width: 196px; background: var(--surface); border: 1px solid var(--border); border-radius: 11px; box-shadow: 0 16px 36px rgba(0,0,0,0.3); z-index: 30; overflow: hidden; text-align: left; }
        .card-menu button { display: flex; align-items: center; gap: 9px; width: 100%; box-sizing: border-box; text-align: left; padding: 10px 13px; background: none; border: none; font-family: var(--font-sans); font-size: 13px; font-weight: 500; color: inherit; cursor: pointer; }
        .card-menu button:hover { background: var(--surface-soft); color: var(--secondary); }
        .card-menu button.perigo:hover { color: var(--tertiary); }
        .card-menu .separador { height: 1px; background: var(--border); margin: 4px 0; }
        .card-menu .submover { display: flex; gap: 6px; padding: 4px 10px 8px; }
        .card-menu .submover button { flex: 1; justify-content: center; padding: 7px 6px; background: var(--surface-soft); border-radius: 7px; }

        .card-bloqueada { opacity: 0.6; cursor: not-allowed !important; }
        .lock-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: color-mix(in srgb, var(--surface) 82%, transparent); border-radius: 14px; font-family: var(--font-mono); font-size: 10.5px; text-align: center; padding: 16px; color: var(--text-soft); z-index: 3; }
        .lock-overlay strong { color: inherit; font-size: 11px; }

        /* ---------- NAVEGAÇÃO ANTERIOR / PRÓXIMO NO EXERCÍCIO ---------- */
        .eyebrow-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
        .nav-btns { display: flex; gap: 6px; }
        .nav-btn { display: flex; align-items: center; gap: 4px; background: var(--surface-soft); border: 1px solid var(--border); color: inherit; font-family: var(--font-mono); font-size: 11px; padding: 5px 10px; border-radius: 7px; cursor: pointer; }
        .nav-btn:hover:not(:disabled) { border-color: var(--secondary); color: var(--secondary); }
        .nav-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* ---------- FAB (criar / escanear) ---------- */
        .fab-group { position: fixed; right: 30px; bottom: 30px; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; z-index: 40; }
        .fab-action { display: flex; align-items: center; gap: 9px; background: var(--surface); border: 1px solid var(--border); color: inherit; font-family: var(--font-sans); font-size: 12.5px; font-weight: 600; padding: 8px 16px 8px 8px; border-radius: 999px; cursor: pointer; box-shadow: 0 10px 24px rgba(0,0,0,0.28); animation: popIn 160ms ease; white-space: nowrap; }
        .fab-action:hover { border-color: var(--secondary); color: var(--secondary); }
        .fab-action .icon-circle { width: 28px; height: 28px; border-radius: 50%; background: var(--surface-soft); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .fab-main { width: 54px; height: 54px; border-radius: 50%; background: var(--secondary); color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 12px 28px rgba(0,0,0,0.35); transition: transform 0.2s ease, background 0.2s ease; }
        .fab-main:hover { background: var(--primary); }
        .fab-main.aberto { transform: rotate(45deg); background: var(--tertiary); }
        .scan-toast { position: fixed; right: 30px; bottom: 96px; display: flex; align-items: center; gap: 8px; background: var(--surface); border: 1px solid var(--border); padding: 9px 15px; border-radius: 999px; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-soft); box-shadow: 0 10px 24px rgba(0,0,0,0.25); z-index: 41; }
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
              alt="Kezia"
              width={150}
              height={150}
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
                className={`status-dot ${pyodideStatus === "pronto" ? "pronto" : pyodideStatus === "falhou" ? "falhou" : ""}`}
              />
              {pyodideStatus === "carregando" && "carregando interpretador…"}
              {pyodideStatus === "pronto" && "interpretador pronto"}
              {pyodideStatus === "falhou" && "falha ao carregar"}
            </div>
          </div>
        </div>

        {view === "listas" && (
          <div>
            <div className="secao-head">
              <h2>Listas de exercícios</h2>
              <p>Escolha um conteúdo para ver os exercícios disponíveis.</p>
            </div>
            <div className="conteudo-grid">
              {listasOrdenadas.map((lista, idx) => {
                const qtd = todosExercicios.filter(
                  (e) => e.listaId === lista.id,
                ).length;
                const bloqueada = listaBloqueada(lista);
                return (
                  <div
                    key={lista.id}
                    className={`conteudo-card${bloqueada ? " card-bloqueada" : ""}`}
                    onClick={() => selecionarLista(lista)}
                  >
                    <h3>{lista.titulo}</h3>
                    <p>{lista.descricao}</p>
                    <span className="contagem">
                      <ListChecks size={13} /> {qtd} exercício
                      {qtd !== 1 ? "s" : ""}
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
                        setMoverExpandido(null);
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
                          <button
                            onClick={() =>
                              setMoverExpandido(
                                moverExpandido === lista.id ? null : lista.id,
                              )
                            }
                          >
                            <ChevronUp size={14} /> Mover
                          </button>
                          {moverExpandido === lista.id && (
                            <div className="submover">
                              <button
                                onClick={() =>
                                  moverItem("lista", lista.id, "cima")
                                }
                                disabled={idx === 0}
                              >
                                <ChevronUp size={13} /> Cima
                              </button>
                              <button
                                onClick={() =>
                                  moverItem("lista", lista.id, "baixo")
                                }
                                disabled={idx === listasOrdenadas.length - 1}
                              >
                                <ChevronDown size={13} /> Baixo
                              </button>
                            </div>
                          )}
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
                            <Trash2 size={14} /> Excluir para mim
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

            <input
              ref={scanInputRef}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: "none" }}
              onChange={aoSelecionarArquivoScan}
            />
            <div className="fab-group">
              {fabAberto && (
                <>
                  <button
                    className="fab-action"
                    onClick={acionarSelecaoArquivo}
                  >
                    <span className="icon-circle">
                      <ScanLine size={14} />
                    </span>{" "}
                    Escanear questão
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
                title="Criar exercício ou lista personalizada"
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
                <FileWarning size={13} /> Não consegui ler o documento.{" "}
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
          </div>
        )}

        {view === "exercicios" && listaAtual && (
          <div>
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
            </div>
            <div className="conteudo-grid">
              {exerciciosOrdenados
                .filter((e) => e.listaId === listaAtual.id)
                .map((ex, idx, arr) => {
                  const bloqueado = exercicioBloqueado(ex);
                  return (
                    <div
                      key={ex.id}
                      className={`exercicio-card${bloqueado ? " card-bloqueada" : ""}`}
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
                          setMoverExpandido(null);
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
                              onClick={() =>
                                setMoverExpandido(
                                  moverExpandido === ex.id ? null : ex.id,
                                )
                              }
                            >
                              <ChevronUp size={14} /> Mover
                            </button>
                            {moverExpandido === ex.id && (
                              <div className="submover">
                                <button
                                  onClick={() =>
                                    moverItem("exercicio", ex.id, "cima")
                                  }
                                  disabled={idx === 0}
                                >
                                  <ChevronUp size={13} /> Cima
                                </button>
                                <button
                                  onClick={() =>
                                    moverItem("exercicio", ex.id, "baixo")
                                  }
                                  disabled={idx === arr.length - 1}
                                >
                                  <ChevronDown size={13} /> Baixo
                                </button>
                              </div>
                            )}
                            <div className="separador" />
                            {ex.oculta ? (
                              <button
                                onClick={() =>
                                  removerBloqueio("exercicio", ex.id)
                                }
                              >
                                <Eye size={14} /> Remover bloqueio
                              </button>
                            ) : (
                              <button
                                onClick={() => pedirOcultar("exercicio", ex)}
                              >
                                <EyeOff size={14} /> Ocultar
                              </button>
                            )}
                            <button
                              className="perigo"
                              onClick={() => pedirExcluir("exercicio", ex)}
                            >
                              <Trash2 size={14} /> Excluir para mim
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

        {view === "exercicio" && exercicioAtual && (
          <div className="grid">
            <div className="panel">
              <div className="eyebrow-row">
                <p className="eyebrow" style={{ margin: 0 }}>
                  {listaAtual?.titulo || "Exercício"}
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
                  <div className="editor-filename">solucao.py</div>
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
                    disabled={pyodideStatus !== "pronto" || executando}
                  >
                    {executando ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <Play size={16} />
                    )}
                    {executando ? "Executando…" : "Executar e enviar"}
                  </button>
                  <span className="run-hint">
                    Tab insere indentação · a numeração acompanha quebras
                    automáticas de linha
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
                          diferente do esperado. O trecho destacado é onde as
                          saídas divergem.
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
                      {comentarioIA.status === "carregando" && (
                        <div className="ia-loading">
                          analisando seu código
                          <span className="ia-dot" />
                          <span className="ia-dot" />
                          <span className="ia-dot" />
                        </div>
                      )}
                      {(comentarioIA.status === "pronto" ||
                        comentarioIA.status === "falhou") && (
                        <p className="ia-texto">{comentarioIA.texto}</p>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

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
                        setView("exercicios");
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
                  ? "Ajuste os campos abaixo e salve as alterações."
                  : "Preencha os campos abaixo — o exercício fica pronto para uso assim que salvo, sem precisar de nada no back-end."}
              </p>

              {scanStatus === "processando" && (
                <p
                  className="modal-nota"
                  style={{ marginTop: 0, marginBottom: 14 }}
                >
                  <Loader2
                    size={12}
                    className="spin"
                    style={{ verticalAlign: "middle", marginRight: 6 }}
                  />
                  Os campos abaixo foram pré-preenchidos a partir do documento —
                  revise antes de salvar.
                </p>
              )}

              <div className="campo">
                <label>Lista</label>
                <select
                  value={form.listaId}
                  onChange={(e) =>
                    setForm({ ...form, listaId: e.target.value })
                  }
                >
                  <option value="">Selecione uma lista…</option>
                  {todasListas.map((l) => (
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
                    <input
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

              <div className="campo-dupla">
                <div className="campo">
                  <label>Entrada (opcional)</label>
                  <input
                    value={form.entrada}
                    onChange={(e) =>
                      setForm({ ...form, entrada: e.target.value })
                    }
                    placeholder="Ex.: texto = 'kezia'"
                  />
                </div>
                <div className="campo">
                  <label>Saída esperada (exata)</label>
                  <input
                    value={form.saidaEsperada}
                    onChange={(e) =>
                      setForm({ ...form, saidaEsperada: e.target.value })
                    }
                    placeholder="Ex.: aizek"
                  />
                  {errosForm.saidaEsperada && (
                    <div className="erro">{errosForm.saidaEsperada}</div>
                  )}
                </div>
              </div>

              <div className="campo">
                <label>Código inicial (opcional)</label>
                <textarea
                  value={form.starter}
                  onChange={(e) =>
                    setForm({ ...form, starter: e.target.value })
                  }
                  placeholder={"texto = 'kezia'\n\n# escreva sua solução"}
                />
              </div>

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
                >
                  {edicaoExercicioId ? "Salvar alterações" : "Criar exercício"}
                </button>
              </div>
              <p className="modal-nota">
                A correção compara a saída do programa, caractere a caractere,
                com o texto informado acima em "Saída esperada". Salvo apenas
                nesta sessão.
              </p>
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
                >
                  Salvar alterações
                </button>
              </div>
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
              {confirmacao.acao === "ocultar" ? (
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
                  </p>
                </>
              ) : (
                <>
                  <h3>Excluir para mim?</h3>
                  <p className="sub">
                    Tem certeza que deseja excluir "{confirmacao.titulo}"? Essa
                    ação não pode ser desfeita.
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
                  {confirmacao.acao === "ocultar" ? "Ocultar" : "Excluir"}
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
    </div>
  );
}
