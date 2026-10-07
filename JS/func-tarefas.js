document.addEventListener("DOMContentLoaded", () => {
    carregarMinhasTarefasHoje();
});

function getDiaSemanaAtual() {
    const dias = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
    return dias[new Date().getDay()];
}

function formatarHoraConclusaoTarefa(dataIso) {
    if (!dataIso) return "";
    const data = new Date(dataIso);
    if (isNaN(data.getTime())) return "";
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

async function buscarMapaOcupacaoAmbientes() {
    let ambientes = JSON.parse(localStorage.getItem("SGC_locais_fallback")) || [];
    try {
        const res = await fetch(`${API_URL}/ambientes`);
        if (res.ok) {
            ambientes = await res.json();
            localStorage.setItem("SGC_locais_fallback", JSON.stringify(ambientes));
        }
    } catch (error) {
        console.warn("API offline ao carregar status de ocupação dos ambientes.");
    }

    const mapa = {};
    ambientes.forEach(a => { mapa[a.id] = !!a.ocupado; });
    return mapa;
}

async function carregarMinhasTarefasHoje() {
    const container = document.getElementById("lista-minhas-tarefas");
    if (!container) return;

    const usuario = getUsuarioLogado();
    if (!usuario) {
        container.innerHTML = `<p class="no-alerts">Sessão expirada. Faça login novamente.</p>`;
        return;
    }

    const diaHoje = getDiaSemanaAtual();

    if (diaHoje === "domingo" || diaHoje === "sábado") {
        container.innerHTML = `<p class="no-alerts">Sem escala definida para hoje (${diaHoje}).</p>`;
        return;
    }

    let atribuicoes = JSON.parse(localStorage.getItem("SGC_escalas_fallback")) || [];

    try {
        const res = await fetch(`${API_URL}/atribuicoes`);
        if (res.ok) {
            atribuicoes = await res.json();
            localStorage.setItem("SGC_escalas_fallback", JSON.stringify(atribuicoes));
        }
    } catch (error) {
        console.warn("API offline, usando cache local de escalas.");
    }

    const minhasTarefas = atribuicoes.filter(c =>
        c.funcionario &&
        c.funcionario.id === usuario.id &&
        c.diaSemana &&
        c.diaSemana.trim().toLowerCase() === diaHoje
    );

    if (minhasTarefas.length === 0) {
        container.innerHTML = `<p class="no-alerts">Nenhuma tarefa atribuída a você hoje.</p>`;
        return;
    }

    const mapaOcupacao = await buscarMapaOcupacaoAmbientes();

    const tarefasComStatus = minhasTarefas.map(cron => {
        const ambienteId = cron.ambiente ? cron.ambiente.id : null;
        return { ...cron, _ocupado: ambienteId !== null ? !!mapaOcupacao[ambienteId] : false };
    });

    tarefasComStatus.sort((a, b) => {
        if (!!a.horarioConclusao !== !!b.horarioConclusao) {
            return a.horarioConclusao ? 1 : -1;
        }
        return Number(a._ocupado) - Number(b._ocupado);
    });

    container.innerHTML = tarefasComStatus.map((cron, index) => `
        <div class="escala-slot" data-index="${index}" style="cursor: ${cron.horarioConclusao ? 'default' : 'pointer'}; ${cron.horarioConclusao ? 'opacity: 0.7;' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div>${cron.ambiente ? cron.ambiente.nome : "Ambiente Geral"}</div>
                <span style="font-size:11px; font-weight:700; padding:3px 10px; border-radius:12px; white-space:nowrap; ${
                    cron.horarioConclusao
                        ? 'background:#eafaf1; color:#1e8449;'
                        : (cron._ocupado ? 'background:#fdecea; color:#c0392b;' : 'background:#eafaf1; color:#1e8449;')
                }">
                    ${cron.horarioConclusao ? '✅ Concluída' : (cron._ocupado ? '🔴 Ocupada' : '🟢 Disponível')}
                </span>
            </div>
            <div>Tarefa: ${cron.tarefa ? cron.tarefa.descricao : "Limpeza Geral"}</div>
            <div>Responsável: Você</div>
            ${cron.horarioConclusao
                ? `<div style="margin-top: 8px; color: #1e8449; font-weight: 700;">✅ Concluída às ${formatarHoraConclusaoTarefa(cron.horarioConclusao)}</div>`
                : `<div style="margin-top: 8px; color: var(--azul-claro); font-weight: 700;">⏰ Horário: ${cron.horarioInicio ? cron.horarioInicio.substring(0, 5) : "--:--"}h às ${cron.horarioFim ? cron.horarioFim.substring(0, 5) : "--:--"}h</div>`
            }
        </div>
    `).join('');

    container.querySelectorAll(".escala-slot").forEach(el => {
        el.addEventListener("click", () => {
            const cron = tarefasComStatus[Number(el.dataset.index)];
            if (cron.horarioConclusao) {
                showToast("Esta tarefa já foi concluída hoje.", "error");
                return;
            }
            if (cron._ocupado) {
                showToast("Este ambiente está ocupado no momento. Aguarde a liberação para iniciar a limpeza.", "error");
                return;
            }
            abrirChecklist(cron);
        });
    });
}

function abrirChecklist(cron) {
    if (!cron.tarefa || !cron.tarefa.id) {
        showToast("Esta escala não possui uma tarefa vinculada.", "error");
        return;
    }

    const dadosTarefa = {
        cronogramaId: cron.id,
        tarefaId: cron.tarefa.id,
        tarefaDescricao: cron.tarefa.descricao,
        ambienteNome: cron.ambiente ? cron.ambiente.nome : "Ambiente"
    };

    localStorage.setItem("SGC_tarefa_atual", JSON.stringify(dadosTarefa));
    window.location.href = "func-checklist.html";
}