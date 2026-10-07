let diaSelecionado = "segunda";

document.addEventListener("DOMContentLoaded", () => {
    configurarNavegacaoSemana();
    carregarListaEscalas();
});

function configurarNavegacaoSemana() {
    document.querySelectorAll(".week-nav span").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".week-nav span").forEach(b => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            e.target.classList.add("active");
            e.target.setAttribute("aria-selected", "true");

            const textoDia = e.target.innerText.toLowerCase();
            if (textoDia.includes("seg")) diaSelecionado = "segunda";
            else if (textoDia.includes("ter")) diaSelecionado = "terça";
            else if (textoDia.includes("qua")) diaSelecionado = "quarta";
            else if (textoDia.includes("qui")) diaSelecionado = "quinta";
            else if (textoDia.includes("sex")) diaSelecionado = "sexta";
            else if (textoDia.includes("sab") || textoDia.includes("sáb")) diaSelecionado = "sábado";
            else if (textoDia.includes("dom")) diaSelecionado = "domingo";

            carregarListaEscalas();
        });
    });
}

async function buscarMapaStatusAmbientes() {
    let ambientes = JSON.parse(localStorage.getItem("SGC_locais_fallback")) || [];

    try {
        const res = await fetch(`${API_URL}/ambientes`);
        if (res.ok) {
            ambientes = await res.json();
            localStorage.setItem("SGC_locais_fallback", JSON.stringify(ambientes));
        }
    } catch (error) {
        console.warn("API offline ao carregar status dos ambientes para o progresso.");
    }

    const mapa = {};
    ambientes.forEach(a => {
        mapa[a.id] = (a.statusAmbiente || "pendente").toLowerCase();
    });
    return mapa;
}

function atualizarProgressoCronograma(escalasDoDia, mapaStatus) {
    const elPercentualTexto = document.getElementById("progresso-percentual-texto");
    const elBarraFill = document.getElementById("progresso-barra-fill");
    const elLimpoNumero = document.getElementById("progresso-limpo-numero");
    const elFaltaNumero = document.getElementById("progresso-falta-numero");

    if (!elPercentualTexto || !elBarraFill || !elLimpoNumero || !elFaltaNumero) return;

    const idsAmbientes = [...new Set(
        escalasDoDia
            .filter(c => c.ambiente && c.ambiente.id)
            .map(c => c.ambiente.id)
    )];

    if (idsAmbientes.length === 0) {
        elPercentualTexto.innerText = "0%";
        elBarraFill.style.width = "0%";
        elBarraFill.style.backgroundColor = "var(--cinza-borda)";
        elLimpoNumero.innerText = "0%";
        elFaltaNumero.innerText = "0%";
        return;
    }

    const totalLimpos = idsAmbientes.filter(id => mapaStatus[id] === "limpo").length;
    const percentualLimpo = Math.round((totalLimpos / idsAmbientes.length) * 100);
    const percentualFalta = 100 - percentualLimpo;

    elPercentualTexto.innerText = `${percentualLimpo}%`;
    elBarraFill.style.width = `${percentualLimpo}%`;
    elLimpoNumero.innerText = `${percentualLimpo}%`;
    elFaltaNumero.innerText = `${percentualFalta}%`;

    elBarraFill.style.backgroundColor = percentualLimpo === 100
        ? "var(--verde)"
        : (percentualLimpo >= 50 ? "var(--amarelo-texto)" : "var(--vermelho-btn)");
}

async function carregarListaEscalas() {
    const container = document.getElementById("lista-escalas-container");
    if (!container) return;

    let atribuicoes = JSON.parse(localStorage.getItem("SGC_escalas_fallback")) || [];

    try {
        const res = await fetch(`${API_URL}/atribuicoes`);
        if (res.ok) {
            const dadosApi = await res.json();
            atribuicoes = dadosApi || [];
            localStorage.setItem("SGC_escalas_fallback", JSON.stringify(atribuicoes));
        }
    } catch (error) {
        console.error("Erro ao carregar escala da API:", error);
    }

    const diaAba = diaSelecionado.substring(0, 3).toLowerCase();
    const escalasDoDia = atribuicoes.filter(c => c.diaSemana && c.diaSemana.toLowerCase().includes(diaAba));

    const mapaStatus = await buscarMapaStatusAmbientes();
    atualizarProgressoCronograma(escalasDoDia, mapaStatus);

    if (escalasDoDia.length === 0) {
        container.innerHTML = `
            <a href="escala-form.html" onclick="limparFormEscala()" style="cursor:pointer; text-decoration:none; display:block; padding:20px; text-align:center; border: 2px dashed #ccc; border-radius: 8px; color: #666; margin-top: 15px;">
                + Nenhuma escala para esta ${diaSelecionado}. Clique para adicionar.
            </a>`;
        return;
    }

    container.innerHTML = escalasDoDia.map(cron => {
        const statusAmbiente = cron.ambiente ? (mapaStatus[cron.ambiente.id] || "pendente") : "pendente";
        const badgeInfo = {
            limpo: { cor: "#1e8449", bg: "#eafaf1", texto: "🟢 Limpo" },
            pendente: { cor: "#f57f17", bg: "#fff8e1", texto: "🟡 Pendente" },
            sujo: { cor: "#c0392b", bg: "#fdecea", texto: "🔴 Sujo" }
        }[statusAmbiente] || { cor: "#f57f17", bg: "#fff8e1", texto: "🟡 Pendente" };

        return `
        <div class="escala-slot" style="border: 1px solid #ccc; padding: 15px; margin-top: 15px; border-radius: 8px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <div style="font-weight: bold; color: #1a56db; font-size: 16px; margin-bottom: 5px;">📍 ${cron.ambiente ? cron.ambiente.nome : 'Ambiente Geral'}</div>
                <span style="font-size:11px; font-weight:700; padding:3px 10px; border-radius:12px; white-space:nowrap; background:${badgeInfo.bg}; color:${badgeInfo.cor};">${badgeInfo.texto}</span>
            </div>
            <div style="margin-bottom: 3px;"><strong>Tarefa:</strong> ${cron.tarefa ? cron.tarefa.descricao : 'Limpeza Geral'}</div>
            <div style="margin-bottom: 3px;"><strong>Responsável:</strong> ${cron.funcionario ? cron.funcionario.nome : 'Sem Colaborador'}</div>
            <div style="margin-bottom: 8px; color: #555;">⏰ <strong>Horário:</strong> ${cron.horarioInicio ? cron.horarioInicio.substring(0,5) : '00:00'}h às ${cron.horarioFim ? cron.horarioFim.substring(0,5) : '00:00'}h</div>
            ${cron.horarioConclusao ? `<div style="margin-bottom: 8px; color: #1e8449; font-weight:700;">✅ Concluído às ${formatarHoraConclusaoEscala(cron.horarioConclusao)}</div>` : ''}
            <div class="crud-actions" style="margin-top:10px; display:flex; justify-content:flex-end; gap: 15px; font-size: 18px; cursor: pointer;">
                <span onclick="editarEscala('${cron.id}')" title="Editar">✏️</span>
                <span onclick="deletarEscala('${cron.id}')" title="Excluir">🗑️</span>
            </div>
        </div>
    `;
    }).join('');
}

function limparFormEscala() {
    localStorage.removeItem('editEscalaId');
}

function editarEscala(id) {
    localStorage.setItem('editEscalaId', id);
    window.location.href = 'escala-form.html';
}

async function deletarEscala(id) {
    if (!confirm("Remover este horário da grade?")) return;

    try {
        const res = await fetch(`${API_URL}/atribuicoes/${id}`, { method: "DELETE" });
        if (res.ok) {
            if (typeof showToast === "function") showToast("Escala excluída.");
            carregarListaEscalas();
            return;
        }
    } catch (error) {
        console.error("Erro ao deletar escala via API:", error);
    }

    let bancoEscalas = JSON.parse(localStorage.getItem("SGC_escalas_fallback")) || [];
    bancoEscalas = bancoEscalas.filter(e => String(e.id) !== String(id));
    localStorage.setItem("SGC_escalas_fallback", JSON.stringify(bancoEscalas));
    if (typeof showToast === "function") showToast("Removido localmente!");
    carregarListaEscalas();
}
function formatarHoraConclusaoEscala(dataIso) {
    if (!dataIso) return "";
    const data = new Date(dataIso);
    if (isNaN(data.getTime())) return "";
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}