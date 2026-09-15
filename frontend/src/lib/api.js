const BASE = "/api";

async function tratar(res) {
  if (!res.ok) {
    const corpo = await res.json().catch(() => ({}));
    throw new Error(corpo.detail || `Erro ${res.status}`);
  }
  return res.json();
}

export async function login(usuario, senha) {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ usuario, senha }),
  });
  return tratar(res);
}

export async function logout() {
  await fetch(`${BASE}/logout`, { method: "POST", credentials: "include" });
}

export async function quemSou() {
  const res = await fetch(`${BASE}/me`, { credentials: "include" });
  if (!res.ok) return null;
  return res.json();
}

export async function status() {
  const res = await fetch(`${BASE}/status`, { credentials: "include" });
  if (!res.ok) return { servidores_ativos: [] };
  return res.json();
}

/** Chama o chat em streaming, chamando onPedaco(texto) a cada pedaço recebido. */
export async function perguntarStreaming(mensagem, historico, onPedaco) {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ mensagem, historico }),
  });
  if (!res.ok || !res.body) {
    const corpo = await res.json().catch(() => ({}));
    throw new Error(corpo.detail || `Erro ${res.status}`);
  }
  const leitor = res.body.getReader();
  const decodificador = new TextDecoder();
  while (true) {
    const { done, value } = await leitor.read();
    if (done) break;
    onPedaco(decodificador.decode(value, { stream: true }));
  }
}

/** Dados da página Operacional. tecnico é opcional — omite pra não filtrar. */
export async function biOperacional(inicio, fim, tecnico) {
  const params = new URLSearchParams({ inicio, fim });
  if (tecnico) params.set("tecnico", tecnico);
  const res = await fetch(`${BASE}/bi/operacional?${params}`, { credentials: "include" });
  return tratar(res);
}

/** Dados da página Clientes — drill-down cliente -> etiqueta. */
export async function biClientes(inicio, fim) {
  const params = new URLSearchParams({ inicio, fim });
  const res = await fetch(`${BASE}/bi/clientes?${params}`, { credentials: "include" });
  return tratar(res);
}

export async function biGeral(inicio, fim) {
  const params = new URLSearchParams({ inicio, fim });
  const res = await fetch(`${BASE}/bi/geral?${params}`, { credentials: "include" });
  return tratar(res);
}
