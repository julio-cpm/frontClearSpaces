let streamAtivo = null;
let fotoAntesBase64 = null;
let fotoDepoisBase64 = null;
let tarefaAtual = null;

document.addEventListener("DOMContentLoaded", () => {
    tarefaAtual = JSON.parse(localStorage.getItem("SGC_tarefa_atual"));

    if (!tarefaAtual || !tarefaAtual.tarefaId) {
        showToast("Nenhuma tarefa selecionada.", "error");
        setTimeout(() => { window.location.href = "func-tarefas.html"; }, 1500);
        return;
    }

    const elAmbiente = document.getElementById("checklist-titulo-ambiente");
    const elTarefa = document.getElementById("checklist-titulo-tarefa");

    if (elAmbiente) elAmbiente.innerText = tarefaAtual.ambienteNome || "Ambiente";
    if (elTarefa) elTarefa.innerText = "Tarefa: " + (tarefaAtual.tarefaDescricao || "Limpeza Geral");

    renderizarProcedimentos();
});

function renderizarProcedimentos() {
    const containerGroup = document.querySelector(".checkbox-group");
    if (!containerGroup) return;

    const listaProcedimentos = (tarefaAtual.procedimentos && tarefaAtual.procedimentos.length > 0)
        ? tarefaAtual.procedimentos
        : [
            { id: 1, descricao: "Lavagem de vasos", concluido: false },
            { id: 2, descricao: "Higienização de pias", concluido: false },
            { id: 3, descricao: "Reposição de papéis", concluido: false },
            { id: 4, descricao: "Recolhimento do lixo", concluido: false }
          ];

    containerGroup.innerHTML = listaProcedimentos.map(proc => {
        const isObj = typeof proc === 'object';
        const id = isObj ? (proc.id || '') : '';
        const desc = isObj ? proc.descricao : proc;
        const concluido = isObj ? !!proc.concluido : false;

        return `
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="checkbox" class="chk-procedimento" data-id="${id}" data-descricao="${desc}" ${concluido ? 'checked' : ''}> 
            <span>${desc}</span>
        </label>
        `;
    }).join('');

    document.querySelectorAll(".chk-procedimento").forEach(chk => {
        chk.addEventListener("change", atualizarBotaoFinalizar);
    });

    atualizarBotaoFinalizar();
}

async function abrirCamera(etapa) {
    const video = document.getElementById(`video-camera-${etapa}`);

    try {
        streamAtivo = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        video.srcObject = streamAtivo;
        video.style.display = "block";

        const preview = document.getElementById(`preview-foto-${etapa}`);
        if (preview) preview.style.display = "none";

        document.getElementById(`btn-abrir-camera-${etapa}`).style.display = "none";
        document.getElementById(`btn-capturar-${etapa}`).style.display = "inline-block";
    } catch (error) {
        console.error("Erro ao acessar câmera:", error);
        showToast("Não foi possível acessar a câmera.", "error");
    }
}

function capturarFoto(etapa) {
    const video = document.getElementById(`video-camera-${etapa}`);
    const canvas = document.getElementById(`canvas-captura-${etapa}`);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL("image/jpeg", 0.8);

    if (etapa === "antes") {
        fotoAntesBase64 = base64;
    } else {
        fotoDepoisBase64 = base64;
    }

    const preview = document.getElementById(`preview-foto-${etapa}`);
    preview.src = base64;
    preview.style.display = "block";

    pararCamera();
    video.style.display = "none";

    document.getElementById(`btn-capturar-${etapa}`).style.display = "none";
    document.getElementById(`btn-refazer-${etapa}`).style.display = "inline-block";

    if (etapa === "antes") {
        liberarEtapa("etapa-checklist");
        liberarEtapa("etapa-foto-depois");
    }

    atualizarBotaoFinalizar();
}

function refazerFoto(etapa) {
    document.getElementById(`preview-foto-${etapa}`).style.display = "none";
    document.getElementById(`btn-refazer-${etapa}`).style.display = "none";

    if (etapa === "antes") {
        fotoAntesBase64 = null;
        bloquearEtapa("etapa-checklist");
        bloquearEtapa("etapa-foto-depois");
    } else {
        fotoDepoisBase64 = null;
    }

    atualizarBotaoFinalizar();
    abrirCamera(etapa);
}

function liberarEtapa(idEtapa) {
    const el = document.getElementById(idEtapa);
    if (el) {
        el.style.opacity = "1";
        el.style.pointerEvents = "auto";
    }
}

function bloquearEtapa(idEtapa) {
    const el = document.getElementById(idEtapa);
    if (el) {
        el.style.opacity = "0.4";
        el.style.pointerEvents = "none";
    }
}

function pararCamera() {
    if (streamAtivo) {
        streamAtivo.getTracks().forEach(track => track.stop());
        streamAtivo = null;
    }
}

function todosProcedimentosMarcados() {
    const checkboxes = document.querySelectorAll(".chk-procedimento");
    if (checkboxes.length === 0) return true;
    return Array.from(checkboxes).every(chk => chk.checked);
}

function atualizarBotaoFinalizar() {
    const fotosOk = !!(fotoAntesBase64 && fotoDepoisBase64);
    const procedimentosOk = todosProcedimentosMarcados();

    const btnFinalizar = document.getElementById("btn-finalizar");
    if (btnFinalizar) {
        btnFinalizar.disabled = !(fotosOk && procedimentosOk);
    }
}

function extrairBase64Puro(dataUrl) {
    if (!dataUrl) return null;
    const partes = dataUrl.split(",");
    return partes.length > 1 ? partes[1] : dataUrl;
}

async function marcarAtribuicaoConcluida() {
    if (!tarefaAtual.cronogramaId) return;

    try {
        const res = await fetch(`${API_URL}/atribuicoes/${tarefaAtual.cronogramaId}/concluir`, {
            method: "PUT"
        });

        if (!res.ok) {
            console.error("Erro ao concluir atribuição:", await res.text());
        }
    } catch (error) {
        console.error("Erro de conexão ao concluir atribuição:", error);
    }
}

async function finalizarChecklist() {
    if (!fotoAntesBase64 || !fotoDepoisBase64) {
        showToast("Tire as fotos de ANTES e DEPOIS para finalizar.", "error");
        return;
    }

    if (!todosProcedimentosMarcados()) {
        showToast("Marque todos os procedimentos antes de enviar.", "error");
        return;
    }

    const antesPuro = extrairBase64Puro(fotoAntesBase64);
    const depoisPuro = extrairBase64Puro(fotoDepoisBase64);

    const checkboxes = document.querySelectorAll(".chk-procedimento");
    const procedimentosDTO = Array.from(checkboxes).map(chk => ({
        id: chk.dataset.id ? Number(chk.dataset.id) : null,
        descricao: chk.dataset.descricao || chk.nextElementSibling.innerText,
        concluido: chk.checked
    }));

    try {
        const resAntes = await fetch(`${API_URL}/tarefas/${tarefaAtual.tarefaId}/ft_antes`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ foto_antes: antesPuro })
        });

        const resConcluir = await fetch(`${API_URL}/tarefas/${tarefaAtual.tarefaId}/concluir`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                foto_depois: depoisPuro,
                procedimentos: procedimentosDTO
            })
        });

        await marcarAtribuicaoConcluida();

        if (resAntes.ok && resConcluir.ok) {
            showToast("Checklist finalizado com sucesso!");
        } else {
            showToast("Checklist enviado com avisos ao salvar fotos/procedimentos.", "error");
        }

        localStorage.removeItem("SGC_tarefa_atual");
        setTimeout(() => { window.location.href = "func-tarefas.html"; }, 1500);

    } catch (error) {
        console.error("Erro ao enviar dados:", error);
        showToast("Erro ao conectar com o servidor.", "error");
    }
}

window.addEventListener("beforeunload", pararCamera);