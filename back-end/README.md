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
