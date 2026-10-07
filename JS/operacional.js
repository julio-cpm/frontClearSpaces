let notificacoesCache = [];
let sseNotificacoes = null;

document.addEventListener("DOMContentLoaded", () => {
    const usuario = getUsuarioLogado();
    const elNome = document.querySelector(".header-operacional h2");
    if (usuario && usuario.nome && elNome) {
        elNome.innerText = `Olá, ${usuario.nome.split(" ")[0]}`;
    }

    if (usuario && usuario.id) {
        carregarNotificacoes(usuario.id);
        conectarNotificacoesSSE(usuario.id);
    }
});

window.addEventListener("beforeunload", () => {
    if (sseNotificacoes) sseNotificacoes.close();
});

async function carregarNotificacoes(funcionarioId) {
    try {
        const res = await fetch(`${API_URL}/notificacoes/usuario/${funcionarioId}`);
        if (res.ok) {
            notificacoesCache = await res.json();
        }
    } catch (error) {
        console.warn("API offline ao carregar notificações.");
    }

    atualizarBadgeNotificacoes();

    const painel = document.getElementById("painel-notificacoes");
    if (painel && painel.style.display === "block") {
        renderizarListaNotificacoes();
    }
}

function conectarNotificacoesSSE(funcionarioId) {
    if (!window.EventSource) return;

    try {
        sseNotificacoes = new EventSource(`${API_URL}/notificacoes/stream/${funcionarioId}`);

        sseNotificacoes.addEventListener("ambiente-liberado", (event) => {
            if (typeof showToast === "function") {
                showToast(event.data || "Nova notificação recebida!", "success");
            }
            carregarNotificacoes(funcionarioId);
        });

        sseNotificacoes.onerror = () => {
        };
    } catch (error) {
        console.warn("Não foi possível conectar ao stream de notificações.");
    }
}

function formatarDataNotificacao(dataIso) {
    if (!dataIso) return "";
    const data = new Date(dataIso);
    if (isNaN(data.getTime())) return dataIso;
    return data.toLocaleDateString('pt-BR') + " " + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function atualizarBadgeNotificacoes() {
    const badge = document.getElementById("badge-notificacoes");
    if (!badge) return;

    const naoLidas = notificacoesCache.filter(n => !n.lida).length;
    if (naoLidas > 0) {
        badge.innerText = naoLidas > 9 ? "9+" : naoLidas;
        badge.style.display = "block";
    } else {
        badge.style.display = "none";
    }
}

function renderizarListaNotificacoes() {
    const container = document.getElementById("lista-notificacoes-container");
    if (!container) return;

    const notificacoes = notificacoesCache
        .slice()
        .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

    if (notificacoes.length === 0) {
        container.innerHTML = `<p style="padding:20px; text-align:center; color:#999; font-size:13px;">Nenhuma notificação por aqui.</p>`;
        return;
    }

    container.innerHTML = notificacoes.map(n => `
        <div style="padding:12px 15px; border-bottom:1px solid #f2f2f2; ${n.lida ? '' : 'background:#eaf4fd;'}">
            <div style="font-weight:700; font-size:13px; color:#1a56db; margin-bottom:3px;">${n.titulo}</div>
            <div style="font-size:13px; color:#444; margin-bottom:5px;">${n.mensagem}</div>
            <div style="font-size:11px; color:#999;">${formatarDataNotificacao(n.dataHora)}</div>
        </div>
    `).join('');
}

async function toggleNotificacoes() {
    const painel = document.getElementById("painel-notificacoes");
    if (!painel) return;

    const vaiAbrir = painel.style.display === "none" || !painel.style.display;

    if (vaiAbrir) {
        renderizarListaNotificacoes();
        painel.style.display = "block";
        await marcarTodasComoLidasNoServidor();
    } else {
        painel.style.display = "none";
    }
}

async function marcarTodasComoLidasNoServidor() {
    const usuario = getUsuarioLogado();
    if (!usuario) return;

    notificacoesCache = notificacoesCache.map(n => ({ ...n, lida: true }));
    atualizarBadgeNotificacoes();
    renderizarListaNotificacoes();

    try {
        await fetch(`${API_URL}/notificacoes/ler/${usuario.id}`, { method: "PUT" });
    } catch (error) {
        console.warn("Não foi possível marcar as notificações como lidas no servidor.");
    }
}

async function limparNotificacoesTela() {
     const usuario = getUsuarioLogado();
    if (!usuario) return;

    notificacoesCache = notificacoesCache.map(n => ({ ...n, lida: true }));
    atualizarBadgeNotificacoes();
    renderizarListaNotificacoes();

    try {
        await fetch(`${API_URL}/notificacoes/limpar/${usuario.id}`, { method: "DELETE" });
    } catch (error) {
        console.warn("Não foi possível marcar as notificações como lidas no servidor.");
    }
}

document.addEventListener("click", (e) => {
    const painel = document.getElementById("painel-notificacoes");
    const btn = document.getElementById("btn-notificacoes");
    if (!painel || painel.style.display === "none" || painel.style.display === "") return;
    if (!painel.contains(e.target) && !btn.contains(e.target)) {
        painel.style.display = "none";
    }
});