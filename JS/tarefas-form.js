let editandoTarefaId = null;
let procedimentosLista = [];

document.addEventListener("DOMContentLoaded", async () => {
    procedimentosLista = [
        "Lavagem de vasos",
        "Higienização de pias",
        "Reposição de papéis",
        "Recolhimento do lixo"
    ];
    renderizarListaProcedimentos();

    const editId = localStorage.getItem('editTarefaId');
    if (!editId) return;

    try {
        const res = await fetch(`${API_URL}/tarefas`);
        if (res.ok) {
            const lista = await res.json();
            const tarefa = lista.find(t => t.id == editId);
            if (tarefa) {
                editandoTarefaId = tarefa.id;
                document.getElementById('txt-tarefa-descricao').value = tarefa.descricao || '';
                document.getElementById('sel-tarefa-tipo').value = tarefa.tipoLimpezaEnum || 'intensiva';
                document.getElementById('sel-tarefa-periodo').value = tarefa.periodo ? tarefa.periodo.id : 1;

                if (tarefa.procedimentos && tarefa.procedimentos.length > 0) {
                    procedimentosLista = tarefa.procedimentos;
                    renderizarListaProcedimentos();
                }

                preencherPrazoComoDuracao(tarefa.horarioConclusao);

                const h1 = document.querySelector('h1');
                if (h1) h1.innerText = "Editar Tarefa";
                
                const btnSubmit = document.querySelector("button[type='submit']");
                if (btnSubmit) btnSubmit.innerText = "Atualizar Tarefa";
            }
        }
    } catch (err) {
        console.error("Erro ao carregar tarefa para edição:", err);
    }
});

function adicionarProcedimentoNaLista() {
    const input = document.getElementById('txt-novo-procedimento');
    const valor = input.value.trim();

    if (!valor) {
        showToast("Digite o nome do procedimento!", "error");
        return;
    }

    procedimentosLista.push(valor);
    input.value = "";
    renderizarListaProcedimentos();
}

function removerProcedimentoDaLista(index) {
    procedimentosLista.splice(index, 1);
    renderizarListaProcedimentos();
}

function renderizarListaProcedimentos() {
    const ul = document.getElementById('lista-procedimentos-cadastrados');
    if (!ul) return;

    if (procedimentosLista.length === 0) {
        ul.innerHTML = `<li style="font-size:0.875rem; color:#888;">Nenhum procedimento adicionado.</li>`;
        return;
    }

    ul.innerHTML = procedimentosLista.map((proc, idx) => {
        const desc = typeof proc === 'string' ? proc : proc.descricao;
        return `
            <li style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 10px 14px; border: 1px solid #d3d4d8; border-radius: 10px; font-size: 0.9375rem;">
                <span>📌 ${desc}</span>
                <span onclick="removerProcedimentoDaLista(${idx})" style="cursor: pointer; color: #e74c3c; font-weight: bold; margin-left: 10px;">✕</span>
            </li>
        `;
    }).join('');
}

function preencherPrazoComoDuracao(horarioConclusaoIso) {
    const inputHoras = document.getElementById('tarefa-prazo-horas');
    const inputMinutos = document.getElementById('tarefa-prazo-minutos');
    if (!inputHoras || !inputMinutos || !horarioConclusaoIso) return;

    const dataConclusao = new Date(horarioConclusaoIso);
    if (isNaN(dataConclusao.getTime())) return;

    const diffMs = dataConclusao.getTime() - Date.now();
    if (diffMs <= 0) {
        inputHoras.value = 0;
        inputMinutos.value = 0;
        return;
    }

    const totalMinutos = Math.round(diffMs / 60000);
    inputHoras.value = Math.floor(totalMinutos / 60);
    inputMinutos.value = totalMinutos % 60;
}

function calcularHorarioConclusao(horas, minutos) {
    if (!horas && !minutos) return null;

    const dataAlvo = new Date();
    dataAlvo.setSeconds(0, 0);
    dataAlvo.setMinutes(dataAlvo.getMinutes() + minutos);
    dataAlvo.setHours(dataAlvo.getHours() + horas);

    const ano = dataAlvo.getFullYear();
    const mes = String(dataAlvo.getMonth() + 1).padStart(2, '0');
    const dia = String(dataAlvo.getDate()).padStart(2, '0');
    const hora = String(dataAlvo.getHours()).padStart(2, '0');
    const minuto = String(dataAlvo.getMinutes()).padStart(2, '0');

    return `${ano}-${mes}-${dia}T${hora}:${minuto}:00`;
}

async function salvarTarefa() {
    const descricao = document.getElementById('txt-tarefa-descricao').value.trim();
    const tipoLimpeza = document.getElementById('sel-tarefa-tipo').value;
    const periodoId = document.getElementById('sel-tarefa-periodo').value;

    const horas = parseInt(document.getElementById('tarefa-prazo-horas').value, 10) || 0;
    const minutos = parseInt(document.getElementById('tarefa-prazo-minutos').value, 10) || 0;

    if (!descricao) {
        showToast("Descreva a tarefa!", "error");
        return;
    }

    const procedimentosDTO = procedimentosLista.map(p => {
        if (typeof p === 'string') {
            return { descricao: p, concluido: false };
        }
        return { id: p.id || null, descricao: p.descricao, concluido: !!p.concluido };
    });

    const tarefaDTO = {
        descricao: descricao,
        tipoLimpeza: tipoLimpeza,
        periodoId: Number(periodoId),
        horarioConclusao: calcularHorarioConclusao(horas, minutos),
        procedimentos: procedimentosDTO
    };

    const url = editandoTarefaId ? `${API_URL}/tarefas/${editandoTarefaId}` : `${API_URL}/tarefas`;
    const method = editandoTarefaId ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tarefaDTO)
        });

        if (response.ok) {
            showToast(editandoTarefaId ? 'Tarefa atualizada com sucesso!' : 'Tarefa cadastrada com sucesso!');
            localStorage.removeItem('editTarefaId');
            window.location.href = 'tarefas-lista.html';
        } else {
            const msgErro = await response.text();
            alert('Erro ao salvar tarefa: ' + (msgErro || 'Verifique os dados enviados.'));
        }
    } catch (error) {
        console.error('Erro de conexão:', error);
        alert('Erro ao conectar com o servidor Java.');
    }
}