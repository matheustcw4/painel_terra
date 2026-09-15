# Painel Terra

Fase 1 do `PAINEL-STATUS.md`: login + chat com o agente, funcionando de ponta a ponta.
Fase 2 (gráficos reais nas 4 páginas restantes) ainda não está implementada — elas
existem como placeholder, prontas pra receber o conteúdo.

Stack: FastAPI (backend, Python) + React/Vite/Tailwind (frontend). Dois processos
separados — o Vite proxya `/api` pro backend em dev, sem precisar configurar CORS na mão.

## Testado de verdade antes de entregar (não só escrito)

- Backend: login com senha errada (`401`), login certo, cookie de sessão, `/api/me`,
  chat em streaming batendo de verdade no MCP `relatorios-terra` (produziu PDF real).
  Achei e corrigi 2 bugs reais rodando isso: `passlib` quebra com `bcrypt` novo (troquei
  pelo pacote `bcrypt` direto), e erro no meio do streaming sumia sem chegar no cliente.
- Frontend: compila limpo (`npm run build`, zero warning), dev server sobe e serve a
  página sem erro de import.
- **Não testado**: o agente decidindo *qual* ferramenta chamar a partir de linguagem
  natural — não tenho chave de API Anthropic neste ambiente pra isso. E não consegui
  tirar screenshot (sem Chromium disponível aqui) — revisão foi só por leitura de
  código e pelo CSS realmente compilado, não visual.

## Rodar o backend

```powershell
cd painel\backend
py -3.12 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

copy .env.example .env
copy usuarios.example.yaml usuarios.yaml
```

Edita o `.env`: `ANTHROPIC_API_KEY` (obrigatório), e as connection strings do Zeus/
Protector/Operacional — `claude mcp get <nome>` mostra cada uma. `relatorios-terra` já
vem preenchido com o caminho confirmado no seu `claude mcp list`.

Login de exemplo já pronto pra testar: `admin` / `mudar123` (hash real, gerado com
bcrypt, não placeholder). Troca por usuário de verdade com:

```powershell
python criar_usuario.py
```

Sobe o backend:

```powershell
uvicorn main:app --reload --port 8001
```

## Rodar o frontend

Em outro terminal:

```powershell
cd painel\frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. Se o backend estiver rodando em porta diferente de 8001,
ajusta o `target` em `frontend/vite.config.js`.

## Estrutura

```
painel/
  backend/
    main.py            → app FastAPI, rotas
    auth.py             → login, JWT em cookie httpOnly
    agente.py            → LangGraph + langchain-mcp-adapters, streaming
    criar_usuario.py      → helper pra adicionar usuário com senha hasheada de verdade
    usuarios.example.yaml → copia pra usuarios.yaml (nunca commitado)
    .env.example           → copia pra .env (nunca commitado)
  frontend/
    src/
      pages/Login.jsx, Chat.jsx, Placeholder.jsx
      components/Layout.jsx
      context/AuthContext.jsx
      lib/api.js
      index.css            → paleta e tipografia (tokens do Tailwind v4)
```

## Próximo passo

Fase 2 do `PAINEL-STATUS.md`: consulta SQL direta (sem passar pelo agente) pras 4
páginas placeholder. `backend/agente.py` já isola as connection strings — o módulo de
consulta direta é código novo ao lado, reaproveitando as mesmas variáveis de ambiente.
