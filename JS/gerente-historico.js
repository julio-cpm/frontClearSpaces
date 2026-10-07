let ocorrenciasCache = [];
let cacheFuncionariosHistorico = JSON.parse(localStorage.getItem("SGC_cache_funcionarios")) || [];

document.addEventListener("DOMContentLoaded", async () => {
    await atualizarCacheFuncionariosHistorico();
    carregarHistoricoGlobalGestor();
});

async function atualizarCacheFuncionariosHistorico() {
    try {
        const res = await fetch(`${API_URL}/funcionarios/listar`);
        if (res.ok) {
            cacheFuncionariosHistorico = await res.json();
            localStorage.setItem("SGC_cache_funcionarios", JSON.stringify(cacheFuncionariosHistorico));
        }
    } catch (error) {
        console.warn("API offline, usando cache local de funcionários.");
    }
}

function optionsFuncionariosReatribuir(oc) {
    if (!cacheFuncionariosHistorico || cacheFuncionariosHistorico.length === 0) {
        return `<option value="">Nenhum colaborador cadastrado</option>`;
    }
    return cacheFuncionariosHistorico.map(f => {
        const jaEncarregado = oc.encarregado && oc.encarregado.id === f.id;
        return `<option value="${f.id}" ${jaEncarregado ? "selected" : ""}>${f.nome} (${f.funcao ? f.funcao.toUpperCase() : 'ASG'})</option>`;
    }).join('');
}

function formatarDataHistorico(dataIso) {
    if (!dataIso) return "";
    const data = new Date(dataIso);
    if (isNaN(data.getTime())) return dataIso;
    return data.toLocaleDateString('pt-BR') + " " + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

async function carregarHistoricoGlobalGestor() {
    const container = document.getElementById("historico-global-gestor-container");
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/ocorrencias`);
        if (res.ok) {
            ocorrenciasCache = await res.json();
        }
    } catch (error) {
        console.warn("API offline ao carregar histórico.");
        container.innerHTML = `<p class="no-alerts">Não foi possível carregar o histórico. Verifique a conexão com o servidor.</p>`;
        return;
    }

    if (ocorrenciasCache.length === 0) {
        container.innerHTML = `<p class="no-alerts">Nenhuma ocorrência registrada até o momento.</p>`;
        return;
    }

    container.innerHTML = ocorrenciasCache.slice().reverse().map(oc => `
        <div class="msg-historico-card">
            <div class="msg-header-line">
                <span class="badge-gravidade badge-${oc.gravidade}">${oc.gravidade}</span>
                <span class="msg-time-stamp">${formatarDataHistorico(oc.dataHora)}</span>
            </div>
            <div class="alerta-meta-info">Enviado por: <strong>${oc.remetente ? oc.remetente.nome : 'Desconhecido'}</strong></div>
            <div class="msg-body-text">${oc.mensagem}</div>
            ${oc.status === 'resolvido'
                ? `<div class="status-resolvido-box">✓ Designado para: ${oc.encarregado ? oc.encarregado.nome : 'Equipe'}</div>`
                : `<div class="status-resolvido-box" style="background:#fff3cd; color:#856404; border-color:#ffeeba;">⏳ Aguardando leitura do Gestor</div>`
            }
            <div class="crud-actions" style="margin-top:10px; display:flex; justify-content:flex-end; gap: 15px; font-size: 18px;">
                <span onclick="editarOcorrencia(${oc.id})" style="cursor:pointer;" title="Alterar responsável designado">✏️</span>
                <span onclick="deletarOcorrencia(${oc.id})" style="cursor:pointer;" title="Excluir ocorrência">🗑️</span>
            </div>

            <div class="designar-box" id="reatribuir-box-${oc.id}" style="display:none; margin-top:10px;">
                <label>Alterar colaborador designado:</label>
                <div class="designar-controls">
                    <select id="select-reatribuir-${oc.id}">
                        <option value="">Escolha quem vai resolver...</option>
                        ${optionsFuncionariosReatribuir(oc)}
                    </select>
                    <button class="btn-designar-acao" onclick="salvarReatribuicao(${oc.id})">Salvar</button>
                </div>
            </div>
        </div>
    `).join('');
}

function editarOcorrencia(id) {
    const box = document.getElementById(`reatribuir-box-${id}`);
    if (!box) return;
    box.style.display = box.style.display === "none" ? "block" : "none";
}

async function salvarReatribuicao(id) {
    const select = document.getElementById(`select-reatribuir-${id}`);

    if (!select || !select.value) {
        showToast("Selecione um colaborador antes de salvar!", "error");
        return;
    }

    const encarregadoId = Number(select.value);

    try {
        const res = await fetch(`${API_URL}/ocorrencias/${id}/designar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ encarregadoId: encarregadoId })
        });

        if (res.ok) {
            showToast("Colaborador designado atualizado com sucesso!");
            await carregarHistoricoGlobalGestor();
            return;
        }

        const msgErro = await res.text();
        showToast("Erro ao atualizar: " + (msgErro || "Tente novamente."), "error");
    } catch (error) {
        console.error("Erro de conexão:", error);
        showToast("Erro ao conectar com o servidor.", "error");
    }
}

async function deletarOcorrencia(id) {
    if (!confirm("Deseja realmente remover esta ocorrência?")) return;

    try {
        const res = await fetch(`${API_URL}/ocorrencias/${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Ocorrência removida.");
            carregarHistoricoGlobalGestor();
            return;
        }
    } catch (error) {
        console.error("Erro ao deletar ocorrência:", error);
    }

    showToast("Erro ao remover ocorrência.", "error");
}