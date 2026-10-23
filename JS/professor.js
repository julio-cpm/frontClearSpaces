document.addEventListener("DOMContentLoaded", () => {
    exibirNomeProfessor();
    carregarReservaAtual();
});

function exibirNomeProfessor() {
    const usuario = getUsuarioLogado();
    const el = document.getElementById("professor-nome-header");
    if (usuario && usuario.nome && el) {
        el.innerText = `Olá, ${usuario.nome.split(" ")[0]}`;
    }
}

function formatarHora(hora) {
    if (!hora) return "--:--";
    return hora.substring(0, 5);
}

async function buscarSalaOcupada() {
    const usuario = getUsuarioLogado();
    if (!usuario) return null;

    try {
        const res = await fetch(`${API_URL}/ambientes/professor/${usuario.id}`);
        if (res.ok) {
            const texto = await res.text();
            if (!texto) return null;
            return JSON.parse(texto);
        }
    } catch (error) {
        console.warn("API offline ao verificar sala ocupada.");
    }
    return null;
}

async function carregarReservaAtual() {
    const container = document.getElementById("reserva-atual-container");
    const listaHojeContainer = document.getElementById("lista-reservas-hoje-container");
    if (!container) return;

    const ambienteOcupado = await buscarSalaOcupada();

    if (!ambienteOcupado) {
        // Verifica se o professor saiu temporariamente (sala desocupada no backend, mas com pausa registada)
        const reservaPausada = JSON.parse(localStorage.getItem("SGC_reserva_pausada"));

        if (reservaPausada) {
            container.innerHTML = `
                <div class="reserva-ativa-card" style="border-left-color: #f1c40f;">
                    <span class="badge-status-reserva ausente" style="background-color: #fff3cd; color: #856404; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold;">🟡 Ausente Temporariamente</span>
                    <div class="reserva-sala-nome" style="margin-top: 8px;">📍 ${reservaPausada.nome}</div>
                    <div class="reserva-horario-linha" style="margin-top: 4px;">A sala encontra-se libertada no sistema.</div>
                    <div class="reserva-acoes" style="display: flex; gap: 8px; margin-top: 12px;">
                        <button type="button" class="btn-primary" style="background-color: #27ae60;" onclick="voltarParaSala(${reservaPausada.id})">↩️ Voltar (Reocupar Sala)</button>
                        <button type="button" class="btn-outline-small" onclick="cancelarPausaDefinitivamente()">Encerrar Definitivamente</button>
                    </div>
                </div>
            `;

            if (listaHojeContainer) {
                listaHojeContainer.innerHTML = `
                <div class="escala-slot">
                    <div>📍 ${reservaPausada.nome}</div>
                    <div>Status: Ausente Temporariamente (Desocupada)</div>
                </div>`;
            }
            return;
        }

        container.innerHTML = `<p class="no-alerts">Você não tem nenhuma sala reservada no momento.</p>`;
        if (listaHojeContainer) listaHojeContainer.innerHTML = `<p class="no-alerts">Nenhuma reserva ativa.</p>`;
        localStorage.removeItem("SGC_minha_reserva_horarios");
        localStorage.removeItem("SGC_reserva_pausada");
        return;
    }

    // Se a sala estiver ocupada no backend, limpa registos temporários
    localStorage.removeItem("SGC_reserva_pausada");

    const horariosSalvos = JSON.parse(localStorage.getItem("SGC_minha_reserva_horarios")) || {};
    const temHorarioSalvo = horariosSalvos.ambienteId === ambienteOcupado.id;
    const horarioInicio = temHorarioSalvo ? horariosSalvos.horarioInicio : null;
    const horarioFim = temHorarioSalvo ? horariosSalvos.horarioFim : null;

    container.innerHTML = `
        <div class="reserva-ativa-card">
            <span class="badge-status-reserva ativa">✅ Sala ocupada</span>
            <div class="reserva-sala-nome">📍 ${ambienteOcupado.nome}</div>
            ${horarioInicio ? `<div class="reserva-horario-linha">⏰ Entrada: <strong>${formatarHora(horarioInicio)}</strong></div>` : ''}
            ${horarioFim ? `<div class="reserva-horario-linha">🚪 Saída prevista: <strong>${formatarHora(horarioFim)}</strong></div>` : ''}
            <div class="reserva-acoes" style="display: flex; gap: 8px; margin-top: 12px;">
                <button type="button" class="btn-outline-small" style="border-color: #f39c12; color: #d35400;" onclick="sairTemporariamente(${ambienteOcupado.id}, '${ambienteOcupado.nome}')">🚪 Sair Temporariamente</button>
                <button type="button" class="btn-outline-small" onclick="encerrarReserva(${ambienteOcupado.id})">Encerrar Reserva</button>
            </div>
        </div>
    `;

    if (listaHojeContainer) {
        listaHojeContainer.innerHTML = `
        <div class="escala-slot">
            <div>📍 ${ambienteOcupado.nome}</div>
            <div>Status: Ativa</div>
            ${horarioInicio ? `<div class="reserva-horario-linha">⏰ <strong>${formatarHora(horarioInicio)}h</strong> às <strong>${formatarHora(horarioFim)}h</strong></div>` : ''}
        </div>`;
    }
}

// Chamas a API para libertar a sala no sistema backend
async function sairTemporariamente(ambienteId, ambienteNome) {
    if (!confirm("Deseja sair temporariamente? A sala será desocupada no sistema.")) return;

    try {
        const res = await fetch(`${API_URL}/ambientes/${ambienteId}/liberar`, { method: "PUT" });
        if (res.ok) {
            const horariosSalvos = JSON.parse(localStorage.getItem("SGC_minha_reserva_horarios")) || {};
            localStorage.setItem("SGC_reserva_pausada", JSON.stringify({
                id: ambienteId,
                nome: ambienteNome,
                horarios: horariosSalvos
            }));

            showToast("Sala desocupada temporariamente no sistema!");
            await carregarReservaAtual();
            return;
        }
        const msgErro = await res.text();
        showToast("Erro ao libertar sala: " + (msgErro || "Tente novamente."), "error");
    } catch (error) {
        console.error("Erro de conexão:", error);
        showToast("Erro ao conectar ao servidor.", "error");
    }
}

// Chamas a API para reocupar a mesma sala no backend
async function voltarParaSala(ambienteId) {
    const usuario = getUsuarioLogado();
    if (!usuario) {
        showToast("Sessão expirada. Faça login novamente.", "error");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/ambientes/${ambienteId}/ocupar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ professorId: usuario.id })
        });

        if (res.ok) {
            showToast("Você reocupou a sala com sucesso!");
            localStorage.removeItem("SGC_reserva_pausada");
            await carregarReservaAtual();
            return;
        }
        const msgErro = await res.text();
        showToast("Não foi possível reocupar a sala: " + (msgErro || "Verifique se ainda está disponível."), "error");
    } catch (error) {
        console.error("Erro de conexão:", error);
        showToast("Erro ao conectar ao servidor.", "error");
    }
}

function cancelarPausaDefinitivamente() {
    if (!confirm("Deseja encerrar definitivamente o vínculo com esta sala?")) return;
    localStorage.removeItem("SGC_reserva_pausada");
    localStorage.removeItem("SGC_minha_reserva_horarios");
    showToast("Reserva finalizada.");
    carregarReservaAtual();
}

async function encerrarReserva(ambienteId) {
    if (!confirm("Deseja encerrar esta reserva agora?")) return;

    try {
        const res = await fetch(`${API_URL}/ambientes/${ambienteId}/liberar`, { method: "PUT" });
        if (res.ok) {
            showToast("Reserva encerrada com sucesso!");
            localStorage.removeItem("SGC_minha_reserva_horarios");
            localStorage.removeItem("SGC_reserva_pausada");

            await carregarReservaAtual();
            return;
        }
        const msgErro = await res.text();
        showToast("Erro ao encerrar: " + (msgErro || "Tente novamente."), "error");
    } catch (error) {
        console.error("Erro de conexão:", error);
        showToast("Erro ao conectar com o servidor.", "error");
    }
}