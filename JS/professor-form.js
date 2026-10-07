document.addEventListener("DOMContentLoaded", async () => {
    const editId = localStorage.getItem('editProfessorId');
    const inputNome = document.getElementById('prof-nome');
    if (!editId || !inputNome) return;

    try {
        const res = await fetch(`${API_URL}/professores/listar`);
        if (res.ok) {
            const lista = await res.json();
            const professor = lista.find(p => p.id == editId);
            if (professor) {
                document.getElementById('prof-nome').value = professor.nome || '';
                document.getElementById('prof-cpf').value = professor.cpf || '';
                document.getElementById('prof-periodo').value = professor.periodo ? professor.periodo.id : 1;

                const inputSenha = document.getElementById('prof-senha');
                if (inputSenha) {
                    inputSenha.required = false;
                    inputSenha.placeholder = "Deixe em branco para manter a senha atual";
                }

                document.querySelector('h1').innerText = "Editar Professor";
                const btnSubmit = document.querySelector("button[type='submit']");
                if (btnSubmit) btnSubmit.innerText = "Atualizar Professor no Banco";
            }
        }
    } catch (err) {
        console.error("Erro ao carregar professor para edição:", err);
    }
});

async function salvarProfessor() {
    const editId = localStorage.getItem('editProfessorId');
    const nome = document.getElementById('prof-nome').value;
    const cpf = document.getElementById('prof-cpf').value;
    const senha = document.getElementById('prof-senha').value;
    const periodoId = document.getElementById('prof-periodo').value;

    const professorDTO = {
        nome: nome,
        cpf: cpf,
        senha: senha,
        periodoId: Number(periodoId)
    };

    const url = editId ? `${API_URL}/professores/${editId}` : `${API_URL}/professores/registrar`;
    const method = editId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(professorDTO)
        });

        if (response.ok) {
            alert(editId ? 'Professor atualizado com sucesso!' : 'Professor cadastrado com sucesso!');
            localStorage.removeItem('editProfessorId');
            window.location.href = 'professor-lista.html';
        } else {
            const msgErro = await response.text();
            alert('Erro ao salvar professor: ' + (msgErro || 'Verifique os dados enviados.'));
        }
    } catch (error) {
        console.error('Erro de conexão:', error);
        alert('Erro ao conectar com o servidor Java.');
    }
}