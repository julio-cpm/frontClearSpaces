document.addEventListener("DOMContentLoaded", () => {
    carregarListaLocais();
});

async function carregarListaLocais() {
    const container = document.getElementById("lista-locais-container");
    if (!container) return;

    let ambientesLocais = JSON.parse(localStorage.getItem("SGC_locais_fallback")) || [];

    try {
        const res = await fetch(`${API_URL}/ambientes`);
        if (res.ok) {
            ambientesLocais = await res.json();
            localStorage.setItem("SGC_locais_fallback", JSON.stringify(ambientesLocais));
        }
    } catch (error) {}

    if (ambientesLocais.length === 0) {
        container.innerHTML = `<p class="no-alerts">Nenhum local mapeado.</p>`;
        return;
    }

    container.innerHTML = ambientesLocais.map(amb => {
        let corStatus = "var(--verde)";
        if (amb.statusAmbiente === "sujo" || amb.statusAmbiente === "Pendente de Limpeza") corStatus = "var(--vermelho-btn)";
        if (amb.statusAmbiente === "pendente") corStatus = "var(--amarelo-texto)";

        return `
        <div class="crud-item-card">
            <div class="crud-icon-box" style="background-color: ${corStatus}">📍</div>
            <div class="crud-details">
                <h4>${amb.nome}</h4>
                <p>Setor: ${amb.localizacao || "Geral"} | Tipo: ${amb.tipo || "Operacional"}</p>
                <p style="color:${corStatus}; font-weight:bold; font-size:12px;">Status: ${(amb.statusAmbiente || "PENDENTE").toUpperCase()}</p>
            </div>
            <div class="crud-actions">
                <span onclick="editarLocal(${amb.id})" style="cursor:pointer; margin-right: 10px;">✏️</span>
                <span onclick="deletarLocal(${amb.id})" style="cursor:pointer;">🗑️</span>
            </div>
        </div>
        `;
    }).join('');
}

function limparFormLocal() {
    localStorage.removeItem('editLocalId');
}

function editarLocal(id) {
    localStorage.setItem('editLocalId', id);
    window.location.href = 'locais-form.html';
}

async function deletarLocal(id) {
    if (!confirm("Deseja deletar este local?")) return;

    try {
        const res = await fetch(`${API_URL}/ambientes/${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Local removido.");
            carregarListaLocais();
            return;
        }
    } catch (error) {}

    let bancoLocal = JSON.parse(localStorage.getItem("SGC_locais_fallback")) || [];
    bancoLocal = bancoLocal.filter(amb => amb.id !== id);
    localStorage.setItem("SGC_locais_fallback", JSON.stringify(bancoLocal));
    showToast("Removido localmente!");
    carregarListaLocais();
}
