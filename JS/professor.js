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
        container.innerHTML = `<p class="no-alerts">Você não tem nenhuma sala reservada no momento.</p>`;
        if (listaHojeContainer) listaHojeContainer.innerHTML = `<p class="no-alerts">Nenhuma reserva ativa.</p>`;
        localStorage.removeItem("SGC_minha_reserva_horarios");
        return;
    }

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
            <div class="reserva-acoes">
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

async function encerrarReserva(ambienteId) {
    if (!confirm("Deseja encerrar esta reserva agora?")) return;

    try {
        const res = await fetch(`${API_URL}/ambientes/${ambienteId}/liberar`, { method: "PUT" });
        if (res.ok) {
            showToast("Reserva encerrada com sucesso!");
            localStorage.removeItem("SGC_minha_reserva_horarios");

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