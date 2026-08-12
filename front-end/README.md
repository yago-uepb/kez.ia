# COMANDOS

## Execução em diferentes ambientes

Após configurar o `.env` com todos os elementos necessários, insira os seguintes comandos no terminal para executar:

- Front-end em DEV : `npm run dev`
- Front-end em PRO : `npm run build` e depois `npm run start`

# MELHORIAS FUTURAS

## 1. Temporizador para resolução dos problemas

## 2. Adicionar autenticação/usuários

- Problema: Sem tabela users, sem login — tudo abaixo que dependeria de "por aluno" é, na prática, global.

### 2.1. Progresso do aluno

- Problema: Resolvidos / desbloqueio sequencial não é persistido: não há tabela de submissões/histórico nem is_hidden ligado a usuário. Reseta a cada refresh.

### 2.2. Histórico de submissões

- Problema: Não dá pra mostrar tentativas anteriores nem reabrir o feedback da IA depois.

## 3. Adicionar retorno de tempo de execução do servidor

- Problema: O "ms" mostrado agora é só o tempo de ida-e-volta da requisição.

## 4. `starter code` do exercício não é persistido

- Problema: Cada exercício usa um texto de abertura padrão fixo.
