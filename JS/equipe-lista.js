let cacheFuncionarios = JSON.parse(localStorage.getItem("SGC_cache_funcionarios")) || [];

document.addEventListener("DOMContentLoaded", () => {
    carregarListaFuncionarios();
});

function formatarCPF(cpf) {
    if (!cpf) return 'N/A';
    
    const apenasNumeros = String(cpf).replace(/\D/g, '').padStart(11, '0');
    
    if (apenasNumeros.length !== 11) return cpf;
    
    return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

async function carregarListaFuncionarios() {
    const container = document.getElementById("lista-funcionarios-container");
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/funcionarios/listar`);
        if (res.ok) {
            cacheFuncionarios = await res.json();
            localStorage.setItem("SGC_cache_funcionarios", JSON.stringify(cacheFuncionarios));
        }
    } catch (error) {
        console.warn("API offline, carregando cache local de funcionários.");
    }

    if (!cacheFuncionarios || cacheFuncionarios.length === 0) {
        container.innerHTML = `<p class="no-alerts">Nenhum funcionário cadastrado.</p>`;
        return;
    }

    container.innerHTML = cacheFuncionarios.map(func => `
        <div class="crud-item-card">
            <div class="crud-icon-box">👤</div>
            <div class="crud-details">
                <h4>${func.nome}</h4>
                <p>Matrícula: <strong>${func.matricula || 'N/A'}</strong> | CPF: ${formatarCPF(func.cpf)}</p>
                <p>Função: ${func.funcao ? func.funcao.toUpperCase() : 'ASG'}</p>
            </div>
            <div class="crud-actions">
                <span onclick="editarFuncionario(${func.id})" style="cursor:pointer; margin-right: 10px;">✏️</span>
                <span onclick="deletarFuncionario(${func.id})" style="cursor:pointer;">🗑️</span>
            </div>
        </div>
    `).join('');
}
function limparFormFuncionario() {
    localStorage.removeItem('editFuncionarioId');
}

function editarFuncionario(id) {
    localStorage.setItem('editFuncionarioId', id);
    window.location.href = 'equipe-form.html';
}

async function deletarFuncionario(id) {
    if (!confirm("Deseja realmente remover este funcionário?")) return;

    try {
        const res = await fetch(`${API_URL}/funcionarios/${id}`, { method: "DELETE" });
        if (res.ok) {
            showToast("Funcionário removido com sucesso!");
            await carregarListaFuncionarios();
            return;
        }
    } catch (error) {
        console.error("Erro ao deletar:", error);
    }

    cacheFuncionarios = cacheFuncionarios.filter(f => f.id !== id);
    localStorage.setItem("SGC_cache_funcionarios", JSON.stringify(cacheFuncionarios));
    showToast("Removido localmente!");
    carregarListaFuncionarios();
}