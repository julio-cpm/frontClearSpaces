let cacheFuncionarios = JSON.parse(localStorage.getItem("SGC_cache_funcionarios")) || [];

// Circunferência do anel de progresso (2 * PI * raio), raio = 52 no SVG do gerente.html
const CIRCUNFERENCIA_ANEL = 2 * Math.PI * 52;

document.addEventListener("DOMContentLoaded", async () => {
    await carregarPainelGerente();
    await atualizarCacheFuncionarios();
    await renderizarAlertasGestor();
});

async function atualizarCacheFuncionarios() {
    try {
        const res = await fetch(`${API_URL}/funcionarios/listar`);
        if (res.ok) {
            cacheFuncionarios = await res.json();
            localStorage.setItem("SGC_cache_funcionarios", JSON.stringify(cacheFuncionarios));
        }
    } catch (error) {
        console.warn("API offline, usando cache local de funcionários.");
    }
}

async function carregarPainelGerente() {
    let ambientes = JSON.parse(localStorage.getItem("SGC_locais_fallback")) || [];

    try {
        const resAmbientes = await fetch(`${API_URL}/ambientes`);
        if (resAmbientes.ok) {
            ambientes = await resAmbientes.json();
            localStorage.setItem("SGC_locais_fallback", JSON.stringify(ambientes));
        }
    } catch (error) {}

    const limpos = ambientes.filter(a => a.statusAmbiente && a.statusAmbiente.toLowerCase() === 'limpo').length;
    const pendentes = ambientes.filter(a => a.statusAmbiente && (a.statusAmbiente.toLowerCase() === 'pendente' || a.statusAmbiente.toLowerCase() === 'pendente de limpeza')).length;
    const sujos = ambientes.filter(a => a.statusAmbiente && a.statusAmbiente.toLowerCase() === 'sujo').length;

    if (document.querySelector(".stat-item.blue h2")) document.querySelector(".stat-item.blue h2").innerText = limpos;
    if (document.querySelector(".stat-item.yellow h2")) document.querySelector(".stat-item.yellow h2").innerText = pendentes;
    if (document.querySelector(".stat-item.red-alert h2")) document.querySelector(".stat-item.red-alert h2").innerText = sujos;

    atualizarAnelProgresso(limpos, ambientes.length);
}

// Preenche o anel de progresso (SVG) com base em quantos ambientes
// estão limpos em relação ao total mapeado. A cor do anel muda
// conforme a faixa de percentual: vermelho < 40%, amarelo < 80%, verde >= 80%.
function atualizarAnelProgresso(limpos, total) {
    const elFill = document.getElementById("progresso-anel-fill");
    const elTexto = document.getElementById("progresso-anel-percentual");
    if (!elFill || !elTexto) return;

    const percentual = total > 0 ? Math.round((limpos / total) * 100) : 0;
    const offset = CIRCUNFERENCIA_ANEL - (CIRCUNFERENCIA_ANEL * percentual / 100);

    elFill.style.strokeDasharray = `${CIRCUNFERENCIA_ANEL}`;
    elFill.style.strokeDashoffset = `${offset}`;
    elTexto.innerText = `${percentual}%`;

    let cor = "var(--vermelho-btn)";
    if (percentual >= 80) cor = "var(--verde)";
    else if (percentual >= 40) cor = "var(--amarelo-texto)";

    elFill.style.stroke = cor;
}

function formatarDataOcorrenciaGestor(dataIso) {
    if (!dataIso) return "";
    const data = new Date(dataIso);
    if (isNaN(data.getTime())) return dataIso;
    return data.toLocaleDateString('pt-BR') + " " + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

async function renderizarAlertasGestor() {
    const container = document.getElementById("painel-alertas-container");
    if (!container) return;

    let ocorrencias = [];
    try {
        const res = await fetch(`${API_URL}/ocorrencias`);
        if (res.ok) {
            ocorrencias = await res.json();
        }
    } catch (error) {
        console.warn("API offline ao carregar ocorrências.");
        container.innerHTML = `<p class="no-alerts">Não foi possível carregar as ocorrências. Verifique a conexão com o servidor.</p>`;
        return;
    }

    const pendentes = ocorrencias.filter(oc => oc.status === "pendente");

    const pesoGravidade = { "urgente": 3, "moderada": 2, "leve": 1};

    pendentes.sort((a, b) => {
        const pesoA = pesoGravidade[a.gravidade?.toLowerCase()] || 0;
        const pesoB = pesoGravidade[b.gravidade?.toLowerCase()] || 0;

        if (pesoB !== pesoA) {
            return pesoB - pesoA;
        }

        return new Date(b.dataHora) - new Date(a.dataHora);
    });

    if (pendentes.length === 0) {
        container.innerHTML = `<p class="no-alerts">Nenhuma ocorrência ou solicitação pendente no momento.</p>`;
        return;
    }

    const optionsFuncionarios = cacheFuncionarios.length > 0
        ? cacheFuncionarios.map(f => `<option value="${f.id}">${f.nome} (${f.funcao ? f.funcao.toUpperCase() : 'ASG'})</option>`).join('')
        : `<option value="">Nenhum colaborador cadastrado</option>`;

    container.innerHTML = pendentes.map(oc => `
        <div class="gestor-alerta-card border-${oc.gravidade}">
            <div class="msg-header-line">
                <span class="badge-gravidade badge-${oc.gravidade}">${oc.gravidade}</span>
                <span class="msg-time-stamp">${formatarDataOcorrenciaGestor(oc.dataHora)}</span>
            </div>
            <div class="alerta-meta-info">Enviado por: <strong>${oc.remetente ? oc.remetente.nome : 'Desconhecido'}</strong></div>
            <div class="msg-body-text">"${oc.mensagem}"</div>

            <div class="designar-box">
                <label>Designar colaborador para solucionar:</label>
                <div class="designar-controls">
                    <select id="select-delegar-${oc.id}">
                        <option value="">Escolha quem vai resolver...</option>
                        ${optionsFuncionarios}
                    </select>
                    <button class="btn-designar-acao" onclick="delegarOcorrencia(${oc.id})">Designar</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function delegarOcorrencia(idOcorrencia) {
    const select = document.getElementById(`select-delegar-${idOcorrencia}`);

    if (!select || !select.value) {
        showToast("Por favor, selecione um funcionário antes de designar!", "error");
        return;
    }

    const encarregadoId = Number(select.value);

    try {
        const res = await fetch(`${API_URL}/ocorrencias/${idOcorrencia}/designar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ encarregadoId: encarregadoId })
        });

        if (res.ok) {
            showToast("Ocorrência designada com sucesso!");
            await renderizarAlertasGestor();
            return;
        }

        const msgErro = await res.text();
        showToast("Erro ao designar: " + (msgErro || "Tente novamente."), "error");
    } catch (error) {
        console.error("Erro de conexão:", error);
        showToast("Erro ao conectar com o servidor.", "error");
    }
}