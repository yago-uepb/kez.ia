# SOBRE

O projeto consiste no desenvolvimento de uma plataforma web voltada para estudantes de programação, especialmente aqueles que estão iniciando seus estudos em algoritmos e linguagem Python. A proposta une funcionalidades de um juiz online, semelhante ao Beecrowd, com recursos de Inteligência Artificial capazes de auxiliar o aluno durante todo o processo de aprendizagem.
Ao submeter um algoritmo, o sistema não apenas informa se a solução está correta ou incorreta, mas também analisa o código de forma inteligente, identificando erros, explicando suas causas em linguagem acessível, sugerindo melhorias e apresentando boas práticas de programação. Dessa forma, a plataforma deixa de ser apenas uma ferramenta de avaliação e passa a atuar como um tutor virtual, oferecendo um feedback muito mais completo e educativo.
De forma complementar, o sistema ainda abrange a personalização de questões e listas de exercícios, configurando-se como um ótimo recurso de ensino-aprendizagem no meio acadêmico.

# REGRAS

1. Sem print, ou texto no input, ou qualquer elemento que destoe do que é a saída esperada.
2. Não envie códigos maliciosos que podem danificar, alterar ou excluir a estrutura interna da API.

# DOCUMENTAÇÃO

- Visão Geral: `https://docs.google.com/document/d/15wlFxLmMxsPU5cFhJRjCt6DKQca_XRwHFeXqeEGJb8Q/edit?usp=sharing`

- Esquema Conceitual Simplificado: `https://www.tldraw.com/f/94jtl8YQs_fM2HmvgNE35?d=v150.98.1276.695.page`

- Script db-fiddle: `https://www.db-fiddle.com/f/joFuH6axFgMFwQuG2RusQL/0`

- Fluxogramas: `https://www.tldraw.com/f/94jtl8YQs_fM2HmvgNE35?d=v0.0.1276.695.87eJhZT2UOrdVXIyB4prx`

# COMANDOS BÁSICOS

## Gerenciamento do Ambiente Virtual (.venv)

Insira os seguintes comandos no terminal para:

- Gerar ambiente virtual: `python -m venv .venv`
- Ativar ambiente virtual: `.\.venv\Scripts\Activate.ps1`

- Gerar arquivo com pacote de dependências utilizadas atualmente: `python -m pip freeze > requirements.txt`
- Instalar dependências: `python -m pip install -r requirements.txt`
- Desinstalar uma biblioteca em específico: `python -m pip uninstall <nome-da-biblioteca>`

# COMO EXECUTAR:

Insira os seguintes comandos no terminal para executar:

- Servidor: `uvicorn src.main:app --reload`
- Testes: `python -m tests.main`

# PRINCIPAIS TECNOLOGIAS UTILIZADAS

## Linguagens & Frameworks

- Python
- FastAPI

## Serviços

- Groq
- PostgreSQL

# BIBLIOTECAS
