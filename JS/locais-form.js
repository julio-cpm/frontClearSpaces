
let editandoId = null;

document.addEventListener("DOMContentLoaded", async () => {
    const editId = localStorage.getItem('editLocalId');
    if (!editId) return;

    let ambientesLocais = JSON.parse(localStorage.getItem("SGC_locais_fallback")) || [];
    try {
        const res = await fetch(`${API_URL}/ambientes`);
        if (res.ok) ambientesLocais = await res.json();
    } catch (error) {}

    const amb = ambientesLocais.find(a => a.id == editId);
    if (!amb) return;

    editandoId = amb.id;
    document.getElementById("txt-local-nome").value = amb.nome || "";
    document.getElementById("txt-local-vaga").value = amb.localizacao || "";
    if (document.getElementById("sel-local-tipo")) document.getElementById("sel-local-tipo").value = amb.tipo || "sala";
    if (document.getElementById("sel-local-status")) document.getElementById("sel-local-status").value = amb.statusAmbiente || "pendente";

    document.querySelector('h1').innerText = "Editar Ambiente";
    const btnSubmit = document.querySelector("button[type='submit']");
    if (btnSubmit) btnSubmit.innerText = "Atualizar Local";
});

async function salvarLocal() {
    const nomeInput = document.getElementById("txt-local-nome");
    if (!nomeInput) return;
    const nome = nomeInput.value.trim();

    const inputLocalizacao = document.getElementById("txt-local-vaga");
    const localizacao = inputLocalizacao ? inputLocalizacao.value.trim() : "Geral";

    const tipoSelect = document.getElementById("sel-local-tipo");
    const tipo = tipoSelect ? tipoSelect.value : "sala";

    const statusSelect = document.getElementById("sel-local-status");
    const statusAmbiente = statusSelect ? statusSelect.value : "pendente";

    if (!nome) {
        showToast("Insira o Nome do ambiente!", "error");
        return;
    }

    const dto = { nome, localizacao, tipo, statusAmbiente };

    let url = `${API_URL}/ambientes`;
    let method = "POST";
    if (editandoId) {
        url += `/${editandoId}`;
        method = "PUT";
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dto)
        });

        if (res.ok) {
            showToast("Ambiente salvo!");
            localStorage.removeItem('editLocalId');
            window.location.href = 'locais-lista.html';
            return;
        }

        // O servidor respondeu, mas recusou o insert/update — agora você VÊ o erro real
        const msgErro = await res.text();
        showToast("Erro ao salvar no servidor: " + (msgErro || `HTTP ${res.status}`), "error");
        return;
    } catch (error) {
        // Só cai aqui se o servidor estiver realmente fora do ar (falha de conexão)
        console.error("Falha de conexão ao salvar ambiente:", error);
    }

    let bancoLocal = JSON.parse(localStorage.getItem("SGC_locais_fallback")) || [];
    if (!editandoId) {
        dto.id = Date.now();
        bancoLocal.push(dto);
        showToast("Sem conexão com o servidor — salvo apenas localmente!", "error");
    } else {
        bancoLocal = bancoLocal.map(amb => amb.id === editandoId ? { ...amb, ...dto, id: editandoId } : amb);
        showToast("Sem conexão com o servidor — atualizado apenas localmente!", "error");
    }

    localStorage.setItem("SGC_locais_fallback", JSON.stringify(bancoLocal));
    localStorage.removeItem('editLocalId');
    window.location.href = 'locais-lista.html';
}