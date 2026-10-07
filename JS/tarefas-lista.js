let cacheTarefas = JSON.parse(localStorage.getItem("SGC_tarefas_fallback")) || [];

document.addEventListener("DOMContentLoaded", () => {
    carregarListaTarefas();
});

function formatarTipoLimpeza(tipo) {
    return tipo === "manutencao" ? "Manutenção" : "Completa";
}

function formatarDataPrazo(dataIso) {
    if (!dataIso) return "Sem prazo definido";
    const data = new Date(dataIso);
    if (isNaN(data.getTime())) return dataIso;
    return data.toLocaleDateString('pt-BR') + " às " + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

async function carregarListaTarefas() {
    const container = document.getElementById("lista-tarefas-container");
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/tarefas`);
        if (res.ok) {
            cacheTarefas = await res.json();
            try {
                localStorage.setItem("SGC_tarefas_fallback", JSON.stringify(cacheTarefas));
            } catch (e) {
                console.warn("Não foi possível salvar cache de tarefas:", e);
            }
        } else {
            console.error("GET /tarefas falhou:", res.status, await res.text());
        }
    } catch (error) {
        console.error("Erro ao carregar /tarefas:", error);
    }

    if (!cacheTarefas || cacheTarefas.length === 0) {
        container.innerHTML = `<p class="no-alerts">Nenhuma tarefa cadastrada.</p>`;
        return;
    }

    container.innerHTML = cacheTarefas.map(t => `
        <div class="crud-item-card">
            <div class="crud-icon-box">🧹</div>
            <div class="crud-details">
                <h4>${t.descricao}</h4>
                <p>Tipo: <strong>${formatarTipoLimpeza(t.tipoLimpezaEnum)}</strong> | Período: ${t.periodo ? t.periodo.periodoEnum : '-'}</p>
                <p>Prazo: ${formatarDataPrazo(t.horarioConclusao)}</p>
            </div>
            <div class="crud-actions">
                <span onclick="editarTarefa(${t.id})" style="cursor:pointer; margin-right: 10px;">✏️</span>
                <span onclick="deletarTarefa(${t.id})" style="cursor:pointer;">🗑️</span>
            </div>
        </div>
    `).join('');
}

function limparFormTarefa() {
    localStorage.removeItem('editTarefaId');
}

function editarTarefa(id) {
    localStorage.setItem('editTarefaId', id);
    window.location.href = 'tarefas-form.html';
}

async function deletarTarefa(id) {
    if (!confirm("Deseja realmente remover esta tarefa?")) return;

    try {
        const res = await fetch(`${API_URL}/tarefas/${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Tarefa removida com sucesso!");
            await carregarListaTarefas();
            return;
        }
    } catch (error) {
        console.error("Erro ao deletar tarefa:", error);
    }

    cacheTarefas = cacheTarefas.filter(t => t.id !== id);
    localStorage.setItem("SGC_tarefas_fallback", JSON.stringify(cacheTarefas));
    showToast("Removido localmente!");
    carregarListaTarefas();
}