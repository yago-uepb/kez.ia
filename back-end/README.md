# COMANDOS

## Gerenciamento do Ambiente Virtual (.venv)

Insira os seguintes comandos no terminal para:

- Gerar venv: `python -m venv .venv`
- Ativar venv: `.\.venv\Scripts\Activate.ps1`

- Atualizar/Gerar arquivo com pacote de dependências: `python -m pip freeze > requirements.txt`
- Instalar dependências: `python -m pip install -r requirements.txt`
- Desinstalar alguma biblioteca em específico: `python -m pip uninstall <nome-da-biblioteca>`

- Desativar venv: `deactivate`

## Execução em diferentes ambientes

Após configurar o `.env` com todos os elementos necessários (destacados em [src/core/settings.py](./src/core/settings.py)), insira os seguintes comandos no terminal para executar:

- Servidor em DEV : `python -m fastapi dev src/main.py --app app`
- Servidor em PRO : `python -m fastapi run src/main.py --app app`

# MELHORIAS FUTURAS

## 1. Sandboxing da execução dos códigos

## 2. Error Disclosure

- Problema: Exposição desnecessária de erros internos do sistema, o que pode acarretar na exposição de dados confidenciais que põem em risco a plataforma.

- Solução: Customização do handle de erros do FastAPI para permitir a saída somente de erros controlados.

## 3. Buscar pelos test_cases em lotes no serviço de submissão de questões

## 4. Identificação e extração dos dados de imagens nos documentos

## 5. Testabilidade do Suporte para questões que envolvem bibliotecas do Python.

## 6. Considerar todos os casos de vulnerabilidade em cada funcionalidade

### 6.1. Tratamento adequado de entradas

### 6.2. Falha de segurança quanto aos MIME Types dos documentos

### 6.3. Prompt Injection

- Problema: A utilização de modelos LLM abre brechas para riscos de exposição de elementos confidenciais da API via instruções maliciosas escondidas e tratadas como parte dos dados enviados para a API.

- Solução: Adoção de Prompt Guards como camada de segurança extra.
