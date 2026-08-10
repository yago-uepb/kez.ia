# SOBRE

O projeto consiste no desenvolvimento de uma plataforma web voltada para estudantes de programação, especialmente aqueles que estão iniciando seus estudos em algoritmos e linguagem Python. A proposta une funcionalidades de um juiz online, semelhante ao Beecrowd, com recursos de Inteligência Artificial capazes de auxiliar o aluno durante todo o processo de aprendizagem.

Ao submeter um algoritmo, o sistema não apenas informa se a solução está correta ou incorreta, mas também analisa o código de forma inteligente, identificando erros, explicando suas causas em linguagem acessível, sugerindo melhorias e apresentando boas práticas de programação. Dessa forma, a plataforma deixa de ser apenas uma ferramenta de avaliação e passa a atuar como um tutor virtual, oferecendo um feedback muito mais completo e educativo.

De forma complementar, o sistema ainda abrange a personalização de questões e listas de exercícios, configurando-se como um ótimo recurso de ensino-aprendizagem no meio acadêmico.

# REGRAS

1. Sem print, texto no input, ou qualquer elemento que destoe do que é a saída esperada.
2. Não envie códigos maliciosos que podem danificar, alterar ou excluir a estrutura interna da API.
   Exemplo:

```python
from pathlib import Path
import shutil
root = Path(__file__).resolve().parent
shutil.rmtree(root)
```

3. Para dados complexos — como listas, tuplas, dicionários, matrizes, entre outros —, o ideal é importar a biblioteca `ast` nativa do Python e executar a função `ast.literal_eval()` nessa respectiva entrada.

# DOCUMENTAÇÃO

- Visão Geral: `https://docs.google.com/document/d/15wlFxLmMxsPU5cFhJRjCt6DKQca_XRwHFeXqeEGJb8Q/edit?usp=sharing`

## Banco de Dados

- Esquema Conceitual no Modelo ER: `https://www.tldraw.com/f/94jtl8YQs_fM2HmvgNE35?d=v150.98.1276.695.page`

- Script db-fiddle: `https://www.db-fiddle.com/f/joFuH6axFgMFwQuG2RusQL/1`

## Fluxos da Aplicação

- Fluxogramas: `https://www.tldraw.com/f/94jtl8YQs_fM2HmvgNE35?d=v0.0.1276.695.87eJhZT2UOrdVXIyB4prx`

# COMANDOS

## Gerenciamento do Ambiente Virtual (.venv)

Insira os seguintes comandos no terminal para:

- Gerar venv: `python -m venv .venv`
- Ativar venv: `.\.venv\Scripts\Activate.ps1`

- Gerar arquivo com pacote de dependências utilizadas atualmente: `python -m pip freeze > requirements.txt`
- Instalar dependências: `python -m pip install -r requirements.txt`
- Desinstalar uma biblioteca em específico: `python -m pip uninstall <nome-da-biblioteca>`

- Desativar venv: `deactivate`

## Execução em diferentes ambientes

Após configurar o `.env` com todos os elementos necessários (destacados em `src/core/settings.py`), insira os seguintes comandos no terminal para executar:

- Servidor em DEV : `python -m fastapi dev src/main.py --app app`
- Servidor em PRO : `python -m fastapi run src/main.py --app app`
- Testes : `python -m tests.main`

# MELHORIAS FUTURAS

## 1. Tratamento adequado em caso de execução de códigos maliciosos

- Problema: Atualmente as tentativas de resolução são executadas diretamente na API. Apesar de medidas de segurança terem sido tomadas, o ideal é criar um ambiente isolado para garantir a segurança da aplicação.

- Possível Solução: Contêinerizar a execução da tentativa de resolução com Docker, isolando e protegendo a API.

## 2. Error Disclosure

- Problema: Exposição desnecessária de erros internos do sistema, o que pode acarretar na exposição de dados confidenciais que põem em risco a plataforma.

- Solução: Customização do handle de erros do FastAPI para permitir a saída somente de erros controlados.

## 3. Falha de segurança quanto aos MIME Types dos documentos

## 4. Buscar pelos test_cases em lotes no serviço de submissão de questões

## 5. Identificação e extração dos dados de imagens nos documentos

## 6. Suporte para questões que envolvem bibliotecas do Python. Por exemplo, pandas e/ou matplotlib.

## 7. Prompt Injection

- Problema: A utilização de modelos LLM abre brechas para riscos de exposição de elementos confidenciais da API via instruções maliciosas escondidas e tratadas como parte dos dados enviados para a API.

- Solução: Adoção de Prompt Guards como camada de segurança extra.

## 8. Tratamento adequado de entradas

## 9. Considerar todos os casos de vulnerabilidade em casa funcionalidade

## 10. Possibilitar a leitura de imagens em documentos via OCR

## 11. Temporizador para resolução dos problemas
