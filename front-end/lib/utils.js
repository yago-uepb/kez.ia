export function normalizarQuebraDeLinha(valor) {
  if (valor == null) return "";
  return String(valor)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\n/g, "\n");
}

export function normalizarCasoDeTeste(caso) {
  return {
    ...caso,
    input: caso?.input == null ? null : normalizarQuebraDeLinha(caso.input),
    expected_output:
      caso?.expected_output == null
        ? ""
        : normalizarQuebraDeLinha(caso.expected_output),
  };
}

export function previewDe(texto, max = 92) {
  const limpo = (texto || "").trim();
  if (limpo.length <= max) return limpo;
  return limpo.slice(0, max).trim() + "…";
}

export function embaralhar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

export function slugificar(texto) {
  return (texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/* Erros Python -> explicação didática (independe do back-end, é só apresentação) */
export function explicarErro(textoErro) {
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
export function diffSimples(esperado, obtido) {
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
export function validarFormExercicio(f) {
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

export const arquivoParaBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });