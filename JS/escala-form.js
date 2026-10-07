let editandoId = null;
let cacheFuncionarios = JSON.parse(localStorage.getItem("SGC_cache_funcionarios")) || [];

document.addEventListener("DOMContentLoaded", async () => {
    await carregarSeletoresEscala();

    const editId = localStorage.getItem('editEscalaId');
    if (editId) {
        await prepararEdicaoEscala(editId);
    }
});

function obterDataHojeISO() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

async function carregarSeletoresEscala() {
    try {
        const resFunc = await fetch(`${API_URL}/funcionarios/listar`);
        if (resFunc.ok) {
            cacheFuncionarios = await resFunc.json();
            localStorage.setItem("SGC_cache_funcionarios", JSON.stringify(cacheFuncionarios));
        }
    } catch (err) {
        console.error("Erro ao carregar funcionários:", err);
    }

    const selEscalaFunc = document.getElementById("sel-escala-func");
    if (selEscalaFunc) {
        selEscalaFunc.innerHTML = cacheFuncionarios.map(f => `<option value="${f.id}">${f.nome} (${f.funcao ? f.funcao.toUpperCase() : 'ASG'})</option>`).join('');
    }

    let locaisLista = JSON.parse(localStorage.getItem("SGC_locais_fallback")) || [];
    try {
        const resLocais = await fetch(`${API_URL}/ambientes`);
        if (resLocais.ok) {
            locaisLista = await resLocais.json();
            localStorage.setItem("SGC_locais_fallback", JSON.stringify(locaisLista));
        }
    } catch (err) {
        console.error("Erro ao carregar locais:", err);
    }

    const selEscalaLocal = document.getElementById("sel-escala-local");
    if (selEscalaLocal) {
        selEscalaLocal.innerHTML = locaisLista.length > 0
            ? locaisLista.map(l => `<option value="${l.id}">${l.nome}</option>`).join('')
            : `<option value="">Nenhum ambiente mapeado</option>`;
    }

    const selEscalaTarefa = document.getElementById("sel-escala-tarefa");
    if (selEscalaTarefa) {
        selEscalaTarefa.innerHTML = `
            <option value="">Nenhuma tarefa cadastrada</option>
        `;
        
        try {
            const resTarefas = await fetch(`${API_URL}/tarefas`);
            if (resTarefas.ok) {
                const tarefas = await resTarefas.json();
                if (tarefas && tarefas.length > 0) {
                    selEscalaTarefa.innerHTML = tarefas.map(t => `<option value="${t.id}">${t.descricao}</option>`).join('');
                }
            }
        } catch (err) {
            console.error("Erro ao carregar tarefas:", err);
        }
    }
}

async function prepararEdicaoEscala(id) {
    let atribuicoes = JSON.parse(localStorage.getItem("SGC_escalas_fallback")) || [];
    try {
        const res = await fetch(`${API_URL}/atribuicoes`);
        if (res.ok) {
            const dadosApi = await res.json();
            if (dadosApi && dadosApi.length > 0) atribuicoes = dadosApi;
        }
    } catch (err) {
        console.error("Erro ao carregar atribuições para edição:", err);
    }

    const cron = atribuicoes.find(c => String(c.id) === String(id));
    if (!cron) return;

    editandoId = cron.id;

    if (document.getElementById("sel-escala-func")) document.getElementById("sel-escala-func").value = cron.funcionario ? cron.funcionario.id : "";
    if (document.getElementById("sel-escala-local")) document.getElementById("sel-escala-local").value = cron.ambiente ? cron.ambiente.id : "";
    if (document.getElementById("sel-escala-tarefa")) document.getElementById("sel-escala-tarefa").value = cron.tarefa ? cron.tarefa.id : "";

    const diaInput = document.getElementById("sel-escala-dia");
    if (diaInput) {
        diaInput.value = cron.diaSemana || "segunda";
    }

    const inicioInput = document.getElementById("time-escala-inicio");
    if (inicioInput) inicioInput.value = cron.horarioInicio ? cron.horarioInicio.substring(0, 5) : "";

    const fimInput = document.getElementById("time-escala-fim");
    if (fimInput) fimInput.value = cron.horarioFim ? cron.horarioFim.substring(0, 5) : "";

    const titulo = document.querySelector('h1');
    if (titulo) titulo.innerText = "Editar Horário da Grade";

    const btnSubmit = document.querySelector("button[type='submit']");
    if (btnSubmit) btnSubmit.innerText = "Atualizar Grade";
}

function formatarHoraComSegundos(hora) {
    if (!hora) return "00:00:00";
    if (hora.length === 5) return `${hora}:00`;
    return hora;
}

async function salvarEscala() {
    const funcSelect = document.getElementById("sel-escala-func");
    const localSelect = document.getElementById("sel-escala-local");
    const tarefaSelect = document.getElementById("sel-escala-tarefa");
    const diaInput = document.getElementById("sel-escala-dia");
    const inicioInput = document.getElementById("time-escala-inicio");
    const fimInput = document.getElementById("time-escala-fim");

    if (!funcSelect || !localSelect || !inicioInput || !fimInput) {
        if (typeof showToast === "function") showToast("Erro ao ler os campos do formulário.", "error");
        return;
    }

    const funcionarioId = parseInt(funcSelect.value, 10);
    const ambienteId = parseInt(localSelect.value, 10);
    const tarefaId = tarefaSelect && tarefaSelect.value ? parseInt(tarefaSelect.value, 10) : 1;

    if (isNaN(funcionarioId) || isNaN(ambienteId) || isNaN(tarefaId) || !inicioInput.value || !fimInput.value) {
        if (typeof showToast === "function") showToast("Selecione opções válidas para Responsável, Ambiente e Tarefa!", "error");
        return;
    }

    if (!diaInput || !diaInput.value) {
        if (typeof showToast === "function") showToast("Selecione o dia da semana!", "error");
        return;
    }

    const dataAtribuicao = obterDataHojeISO();
    const diaSemanaCalculado = diaInput.value;

    const dto = {
        funcionarioId: funcionarioId,
        ambienteId: ambienteId,
        tarefaId: tarefaId,
        dia: dataAtribuicao,
        diaSemana: diaSemanaCalculado,
        horarioInicio: formatarHoraComSegundos(inicioInput.value),
        horarioFim: formatarHoraComSegundos(fimInput.value)
    };

    let url = `${API_URL}/atribuicoes`;
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
            if (typeof showToast === "function") showToast("Escala salva com sucesso!");
            localStorage.removeItem('editEscalaId');
            window.location.href = 'escala-lista.html';
            return;
        }

        const msgErro = await res.text();
        if (typeof showToast === "function") showToast("Erro ao salvar no servidor: " + (msgErro || `HTTP ${res.status}`), "error");
        return;
    } catch (error) {
        console.error("Falha de conexão ao salvar escala:", error);
    }

    let bancoEscalas = JSON.parse(localStorage.getItem("SGC_escalas_fallback")) || [];

    const funcOptionText = (funcSelect.selectedIndex >= 0 && funcSelect.options[funcSelect.selectedIndex])
        ? funcSelect.options[funcSelect.selectedIndex].text
        : "";
    const funcCache = cacheFuncionarios.find(f => String(f.id) === String(funcionarioId)) || { nome: funcOptionText };

    let locaisLista = JSON.parse(localStorage.getItem("SGC_locais_fallback")) || [];
    const localOptionText = (localSelect.selectedIndex >= 0 && localSelect.options[localSelect.selectedIndex])
        ? localSelect.options[localSelect.selectedIndex].text
        : "";
    const ambCache = locaisLista.find(a => String(a.id) === String(ambienteId)) || { nome: localOptionText };

    const tarefaOptionText = (tarefaSelect && tarefaSelect.selectedIndex >= 0 && tarefaSelect.options[tarefaSelect.selectedIndex])
        ? tarefaSelect.options[tarefaSelect.selectedIndex].text
        : "Limpeza Padrão";

    const novaEscala = {
        id: editandoId || Date.now(),
        funcionario: funcCache,
        ambiente: ambCache,
        tarefa: { id: tarefaId, descricao: tarefaOptionText },
        dia: dataAtribuicao,
        diaSemana: diaSemanaCalculado,
        horarioInicio: dto.horarioInicio,
        horarioFim: dto.horarioFim
    };

    if (!editandoId) {
        bancoEscalas.push(novaEscala);
        if (typeof showToast === "function") showToast("Sem conexão — Escala salva apenas localmente!", "error");
    } else {
        bancoEscalas = bancoEscalas.map(e => String(e.id) === String(editandoId) ? novaEscala : e);
        if (typeof showToast === "function") showToast("Sem conexão — Escala atualizada apenas localmente!", "error");
    }

    localStorage.setItem("SGC_escalas_fallback", JSON.stringify(bancoEscalas));
    localStorage.removeItem('editEscalaId');
    window.location.href = 'escala-lista.html';
}