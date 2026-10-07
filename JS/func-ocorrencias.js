let minhasOcorrenciasCache = [];

document.addEventListener("DOMContentLoaded", () => {
    carregarHistoricoOcorrencias();
});

function formatarDataOcorrencia(dataIso) {
    if (!dataIso) return "";
    const data = new Date(dataIso);
    if (isNaN(data.getTime())) return dataIso;
    return data.toLocaleDateString('pt-BR') + " " + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function escaparHtml(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

async function salvarOcorrencia() {
    const usuario = getUsuarioLogado();
    if (!usuario) {
        showToast("Sessão expirada. Faça login novamente.", "error");
        return;
    }

    const gravidade = document.getElementById("sel-ocorrencia-gravidade").value;
    const mensagem = document.getElementById("txt-ocorrencia-mensagem").value.trim();

    if (!mensagem) {
        showToast("Escreva uma mensagem detalhando o ocorrido!", "error");
        return;
    }

    const ocorrenciaDTO = {
        funcionarioId: usuario.id,
        gravidade: gravidade,
        mensagem: mensagem
    };

    try {
        const response = await fetch(`${API_URL}/ocorrencias`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ocorrenciaDTO)
        });

        if (response.ok) {
            showToast("Mensagem enviada com sucesso!");
            document.getElementById("txt-ocorrencia-mensagem").value = "";
            await carregarHistoricoOcorrencias();
        } else {
            const msgErro = await response.text();
            showToast("Erro ao enviar: " + (msgErro || "Verifique os dados enviados."), "error");
        }
    } catch (error) {
        console.error("Erro de conexão:", error);
        showToast("Erro ao conectar com o servidor. Tente novamente.", "error");
    }
}

async function carregarHistoricoOcorrencias() {
    const container = document.getElementById("historico-ocorrencias-container");
    if (!container) return;

    const usuario = getUsuarioLogado();
    if (!usuario) {
        container.innerHTML = `<p class="no-alerts">Sessão expirada. Faça login novamente.</p>`;
        return;
    }

    try {
        const res = await fetch(`${API_URL}/ocorrencias/funcionario/${usuario.id}`);
        if (res.ok) {
            minhasOcorrenciasCache = await res.json();
        }
    } catch (error) {
        console.warn("API offline ao carregar ocorrências.");
        container.innerHTML = `<p class="no-alerts">Não foi possível carregar suas ocorrências. Verifique a conexão com o servidor.</p>`;
        return;
    }

    if (minhasOcorrenciasCache.length === 0) {
        container.innerHTML = `<p class="no-alerts">Você ainda não enviou nenhuma mensagem.</p>`;
        return;
    }

    const contador = document.getElementById("historico-contador");
    if (contador) contador.textContent = minhasOcorrenciasCache.length;

    container.innerHTML = minhasOcorrenciasCache.slice().reverse().map(oc => `
        <div class="msg-historico-card msg-card-${escaparHtml(oc.gravidade)}">
            <div class="msg-header-line">
                <span class="badge-gravidade badge-${escaparHtml(oc.gravidade)}">${escaparHtml(oc.gravidade)}</span>
                <span class="msg-time-stamp">${formatarDataOcorrencia(oc.dataHora)}</span>
            </div>
            <div class="msg-body-text">${escaparHtml(oc.mensagem)}</div>
            ${oc.status === 'resolvido'
                ? `<div class="msg-status msg-status-ok">✓ Designado para: ${escaparHtml(oc.encarregado ? oc.encarregado.nome : 'Equipe')}</div>`
                : `<div class="msg-status msg-status-pendente">⏳ Aguardando leitura do Gestor</div>`
            }
            ${oc.status === 'pendente'
                ? `<div class="msg-actions">
                       <button type="button" class="btn-icon" onclick="editarMinhaOcorrencia(${oc.id})">✏️ Editar</button>
                       <button type="button" class="btn-icon perigo" onclick="deletarMinhaOcorrencia(${oc.id})">🗑️ Excluir</button>
                   </div>`
                : ''
            }
        </div>
    `).join('');
}

async function deletarMinhaOcorrencia(id) {
    const oc = minhasOcorrenciasCache.find(o => o.id === id);
    if (!oc) return;

    if (oc.status !== 'pendente') {
        showToast("Só é possível excluir ocorrências ainda não designadas.", "error");
        return;
    }

    if (!confirm("Deseja realmente remover esta mensagem?")) return;

    try {
        const res = await fetch(`${API_URL}/ocorrencias/${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Mensagem removida.");
            await carregarHistoricoOcorrencias();
            return;
        }
    } catch (error) {
        console.error("Erro ao deletar ocorrência:", error);
    }

    showToast("Erro ao remover a mensagem.", "error");
}

async function editarMinhaOcorrencia(id) {
    const oc = minhasOcorrenciasCache.find(o => o.id === id);
    if (!oc) return;

    if (oc.status !== 'pendente') {
        showToast("Só é possível editar ocorrências ainda não designadas.", "error");
        return;
    }

    const novaMensagem = prompt("Editar mensagem da ocorrência:", oc.mensagem);
    if (novaMensagem === null) return;

    const novaGravidade = prompt("Gravidade (leve, moderada ou urgente):", oc.gravidade);
    if (novaGravidade === null) return;

    const gravidadeLimpa = novaGravidade.trim().toLowerCase();
    const gravidadeValida = ["leve", "moderada", "urgente"].includes(gravidadeLimpa);

    if (!gravidadeValida || !novaMensagem.trim()) {
        showToast("Dados inválidos. A edição foi cancelada.", "error");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/ocorrencias/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gravidade: gravidadeLimpa, mensagem: novaMensagem.trim() })
        });

        if (res.ok) {
            showToast("Mensagem atualizada com sucesso!");
            await carregarHistoricoOcorrencias();
            return;
        }

        const msgErro = await res.text();
        showToast("Erro ao atualizar: " + (msgErro || "Tente novamente."), "error");
    } catch (error) {
        console.error("Erro de conexão:", error);
        showToast("Erro ao conectar com o servidor.", "error");
    }
}