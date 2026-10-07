let cacheSalas = [];

document.addEventListener("DOMContentLoaded", async () => {
    await carregarSalasDisponiveis();

    const usuario = getUsuarioLogado();
    if (usuario) {
        const salaOcupada = await buscarSalaOcupadaPeloProfessor(usuario.id);
        if (salaOcupada) {
            showToast("Você já possui uma sala ocupada no momento. Libere-a antes de reservar outra.", "error");
            window.location.href = "professor.html";
        }
    }
});

async function buscarSalaOcupadaPeloProfessor(professorId) {
    try {
        const res = await fetch(`${API_URL}/ambientes/professor/${professorId}`);
        if (res.ok) {
            const texto = await res.text();
            if (!texto) return null;
            return JSON.parse(texto);
        }
    } catch (error) {
        console.warn("Não foi possível verificar salas ocupadas.");
    }
    return null;
}

async function carregarSalasDisponiveis() {
    let ambientes = [];
    try {
        const res = await fetch(`${API_URL}/ambientes`);
        if (res.ok) {
            ambientes = await res.json();
            localStorage.setItem("SGC_locais_fallback", JSON.stringify(ambientes));
        }
    } catch (error) {
        ambientes = JSON.parse(localStorage.getItem("SGC_locais_fallback")) || [];
    }

    cacheSalas = ambientes.filter(a => (a.tipo || '').toLowerCase() === 'sala' && !a.ocupado);

    const select = document.getElementById("sel-reserva-sala");
    if (!select) return;

    select.innerHTML = cacheSalas.length > 0
        ? cacheSalas.map(s => `<option value="${s.id}">${s.nome}</option>`).join('')
        : `<option value="">Nenhuma sala disponível no momento</option>`;
}

async function salvarReserva() {
    const usuario = getUsuarioLogado();
    if (!usuario) {
        showToast("Sessão expirada. Faça login novamente.", "error");
        return;
    }

    const salaSelect = document.getElementById("sel-reserva-sala");
    const inicioInput = document.getElementById("time-reserva-inicio");
    const fimInput = document.getElementById("time-reserva-fim");

    if (!salaSelect.value) {
        showToast("Selecione uma sala!", "error");
        return;
    }

    if (!inicioInput.value || !fimInput.value) {
        showToast("Preencha os horários de entrada e saída!", "error");
        return;
    }

    if (fimInput.value <= inicioInput.value) {
        showToast("O horário de saída deve ser depois do horário de entrada.", "error");
        return;
    }

    const ambienteId = parseInt(salaSelect.value);

    try {
        const res = await fetch(`${API_URL}/ambientes/${ambienteId}/ocupar`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ professorId: usuario.id })
        });

        if (res.ok) {
            const salaCache = cacheSalas.find(s => s.id === ambienteId) || { nome: salaSelect.options[salaSelect.selectedIndex].text };
            localStorage.setItem("SGC_minha_reserva_horarios", JSON.stringify({
                ambienteId,
                nomeSala: salaCache.nome,
                horarioInicio: inicioInput.value + ":00",
                horarioFim: fimInput.value + ":00"
            }));
            showToast("Sala reservada com sucesso!");
            window.location.href = "professor.html";
            return;
        }

        const msgErro = await res.text();
        showToast("Erro ao reservar: " + (msgErro || "Verifique os dados enviados."), "error");
    } catch (error) {
        console.error("Erro de conexão:", error);
        showToast("Erro ao conectar com o servidor.", "error");
    }
}