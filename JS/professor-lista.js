document.addEventListener("DOMContentLoaded", () => {
    carregarListaProfessores();
});

function formatarCPF(cpf) {
    if (!cpf) return 'N/A';
    
    const apenasNumeros = String(cpf).replace(/\D/g, '').padStart(11, '0');
    
    if (apenasNumeros.length !== 11) return cpf;
    
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

async function carregarListaProfessores() {
    const container = document.getElementById("lista-professores-container");
    if (!container) return;

    let professores = [];

    try {
        const res = await fetch(`${API_URL}/professores/listar`);
        if (res.ok) {
            professores = await res.json();
        }
    } catch (error) {
        console.warn("API offline ao carregar professores.");
        container.innerHTML = `<p class="no-alerts">Não foi possível carregar os professores. Verifique a conexão com o servidor.</p>`;
        return;
    }

    if (!professores || professores.length === 0) {
        container.innerHTML = `<p class="no-alerts">Nenhum professor cadastrado.</p>`;
        return;
    }

    container.innerHTML = professores.map(prof => `
        <div class="crud-item-card">
            <div class="crud-icon-box" style="background-color: var(--azul-claro);">🎓</div>
            <div class="crud-details">
                <h4>${prof.nome}</h4>
                <p>Matrícula: <strong>${prof.matricula || 'N/A'}</strong> | CPF: ${formatarCPF(prof.cpf) || 'N/A'}</p>
            </div>
            <div class="crud-actions">
                <span onclick="editarProfessor(${prof.id})" style="cursor:pointer; margin-right: 10px;">✏️</span>
                <span onclick="deletarProfessor(${prof.id})" style="cursor:pointer;">🗑️</span>
            </div>
        </div>
    `).join('');
}

function limparFormProfessor() {
    localStorage.removeItem('editProfessorId');
}

function editarProfessor(id) {
    localStorage.setItem('editProfessorId', id);
    window.location.href = 'professor-form.html';
}

async function deletarProfessor(id) {
    if (!confirm("Deseja realmente remover este professor?")) return;

    try {
        const res = await fetch(`${API_URL}/professores/${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Professor removido com sucesso!");
            await carregarListaProfessores();
            return;
        }
    } catch (error) {
        console.error("Erro ao deletar:", error);
    }

    showToast("Erro ao remover o professor.", "error");
}