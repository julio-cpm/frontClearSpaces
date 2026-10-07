let editandoTarefaId = null;

document.addEventListener("DOMContentLoaded", async () => {
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
                document.getElementById('sel-tarefa-tipo').value = tarefa.tipoLimpezaEnum || 'completa';
                document.getElementById('sel-tarefa-periodo').value = tarefa.periodo ? tarefa.periodo.id : 1;

                preencherPrazoComoDuracao(tarefa.horarioConclusao);

                document.querySelector('h1').innerText = "Editar Tarefa";
                const btnSubmit = document.querySelector("button[type='submit']");
                if (btnSubmit) btnSubmit.innerText = "Atualizar Tarefa";
            }
        }
    } catch (err) {
        console.error("Erro ao carregar tarefa para edição:", err);
    }
});

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

    const tarefaDTO = {
        descricao: descricao,
        tipoLimpeza: tipoLimpeza,
        periodoId: Number(periodoId),
        horarioConclusao: calcularHorarioConclusao(horas, minutos)
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