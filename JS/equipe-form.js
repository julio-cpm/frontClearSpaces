document.addEventListener("DOMContentLoaded", async () => {
    const editId = localStorage.getItem('editFuncionarioId');
    const inputNome = document.getElementById('func-nome');
    if (!inputNome) return;

    if (editId) {
        const campoSenhaNova = document.getElementById('func-senha').closest('.input-group');
        const htmlSenhaAntiga = `
            <div class="input-group" id="container-senha-antiga">
                <label for="func-senha-antiga">ANTIGA SENHA DE ACESSO</label>
                <input type="password" id="func-senha-antiga" placeholder="Digite a senha antiga" required>
            </div>
        `;
        campoSenhaNova.insertAdjacentHTML('beforebegin', htmlSenhaAntiga);

        const inputSenha = document.getElementById('func-senha');
        if (inputSenha) {
            inputSenha.required = false;
            inputSenha.placeholder = "Deixe em branco para manter a senha atual";
        }

        const titulo = document.querySelector('h1');
        if (titulo) titulo.innerText = "Editar Colaborador";
        
        const btnSubmit = document.querySelector("button[type='submit']");
        if (btnSubmit) btnSubmit.innerText = "Atualizar Colaborador no Banco";

        try {
            const res = await fetch(`${API_URL}/funcionarios/listar`);
            if (res.ok) {
                const lista = await res.json();
                const func = lista.find(f => f.id == editId);
                if (func) {
                    document.getElementById('func-nome').value = func.nome || '';
                    document.getElementById('func-cpf').value = func.cpf || '';
                    document.getElementById('func-cargo').value = func.funcao ? func.funcao.toLowerCase() : 'asg';
                    document.getElementById('func-periodo').value = func.periodo ? (func.periodo.id || func.periodo) : 1;
                }
            }
        } catch (err) {
            console.error("Erro ao carregar colaborador para edição:", err);
        }
    }
});

async function salvarColaborador() {
    const editId = localStorage.getItem('editFuncionarioId');
    
    const nome = document.getElementById('func-nome').value;
    const cpf = document.getElementById('func-cpf').value;
    
    const inputSenhaAntiga = document.getElementById('func-senha-antiga');
    const senhaAntiga = inputSenhaAntiga ? inputSenhaAntiga.value : '';
    
    const senha = document.getElementById('func-senha').value;
    const funcao = document.getElementById('func-cargo').value;
    const periodoId = document.getElementById('func-periodo').value;

    const funcionarioDTO = {
        nome: nome,
        cpf: cpf,
        senhaAntiga: senhaAntiga,
        senha: senha,
        funcao: funcao,
        periodoId: Number(periodoId)
    };

    const url = editId ? `${API_URL}/funcionarios/${editId}` : `${API_URL}/funcionarios/registrar`;
    const method = editId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(funcionarioDTO)
        });

        if (response.ok) {
            alert(editId ? 'Colaborador atualizado com sucesso!' : 'Colaborador cadastrado com sucesso!');
            localStorage.removeItem('editFuncionarioId');
            window.location.href = 'equipe-lista.html';
        } else {
            const msgErro = await response.text();
            alert('Erro ao salvar colaborador: ' + (msgErro || 'Verifique os dados enviados.'));
        }
    } catch (error) {
        console.error('Erro de conexão:', error);
        alert('Erro ao conectar com o servidor Java.');
    }
}