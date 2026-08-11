# SOBRE

O projeto consiste no desenvolvimento de uma plataforma web voltada para estudantes de programação, especialmente aqueles que estão iniciando seus estudos em algoritmos e linguagem Python. A proposta une funcionalidades de um juiz online, semelhante ao Beecrowd, com recursos de Inteligência Artificial capazes de auxiliar o aluno durante todo o processo de aprendizagem.

Ao submeter um algoritmo, o sistema não apenas informa se a solução está correta ou incorreta, mas também analisa o código de forma inteligente, identificando erros, explicando suas causas em linguagem acessível, sugerindo melhorias e apresentando boas práticas de programação. Dessa forma, a plataforma deixa de ser apenas uma ferramenta de avaliação e passa a atuar como um tutor virtual, oferecendo um feedback muito mais completo e educativo.

De forma complementar, o sistema ainda abrange a personalização de questões e listas de exercícios, configurando-se como um ótimo recurso de ensino-aprendizagem no meio acadêmico.

# REGRAS

1. A entrada é um bloco único e sempre deve ser capturada por meio da função `input()`.
2. Sem texto excedente, não utilize `print()`, `input()`, ou qualquer elemento que imprima um texto que destoe do que é a saída esperada.
3. Não envie códigos maliciosos que podem danificar, alterar ou excluir a estrutura interna da API.
   Exemplo:

```python
from pathlib import Path
import shutil
root = Path(__file__).resolve().parent
shutil.rmtree(root)
```

4. Para dados complexos — como listas, tuplas, dicionários, matrizes, entre outros —, o ideal é importar a biblioteca `ast` nativa do Python e executar a função `ast.literal_eval()` nessa respectiva entrada.

# DOCUMENTAÇÃO

- [Visão Geral](https://docs.google.com/document/d/15wlFxLmMxsPU5cFhJRjCt6DKQca_XRwHFeXqeEGJb8Q/edit?usp=sharing)

## Banco de Dados

- [Esquema Conceitual no Modelo ER](https://www.tldraw.com/f/94jtl8YQs_fM2HmvgNE35?d=v150.98.1276.695.page)

- [Script db-fiddle](https://www.db-fiddle.com/f/joFuH6axFgMFwQuG2RusQL/2)

## Fluxos da Aplicação

- [Fluxogramas](https://www.tldraw.com/f/94jtl8YQs_fM2HmvgNE35?d=v0.0.1276.695.87eJhZT2UOrdVXIyB4prx)

# MELHORIAS FUTURAS

Cada setor tem suas perspectivas futuras mais detalhadas

- [Front-end](front-end/README.md)

- [Back-end](back-end/README.md)
