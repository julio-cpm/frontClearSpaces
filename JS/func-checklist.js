let streamAtivo = null;
let fotoAntesBase64 = null;
let fotoDepoisBase64 = null;
let tarefaAtual = null;

document.addEventListener("DOMContentLoaded", () => {
    tarefaAtual = JSON.parse(localStorage.getItem("SGC_tarefa_atual"));

    if (!tarefaAtual || !tarefaAtual.tarefaId) {
        showToast("Nenhuma tarefa selecionada.", "error");
        window.location.href = "func-tarefas.html";
        return;
    }

    document.getElementById("checklist-titulo-ambiente").innerText = tarefaAtual.ambienteNome || "Ambiente";
    document.getElementById("checklist-titulo-tarefa").innerText = "Tarefa: " + (tarefaAtual.tarefaDescricao || "Limpeza Geral");
});

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
        showToast("Não foi possível acessar a câmera. Verifique as permissões do navegador.", "error");
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
    } else {
        fotoDepoisBase64 = null;
    }

    atualizarBotaoFinalizar();
    abrirCamera(etapa);
}

function liberarEtapa(idEtapa) {
    const el = document.getElementById(idEtapa);
    el.style.opacity = "1";
    el.style.pointerEvents = "auto";
}

function pararCamera() {
    if (streamAtivo) {
        streamAtivo.getTracks().forEach(track => track.stop());
        streamAtivo = null;
    }
}

function atualizarBotaoFinalizar() {
    document.getElementById("btn-finalizar").disabled = !(fotoAntesBase64 && fotoDepoisBase64);
}

function extrairBase64Puro(dataUrl) {
    if (!dataUrl) return null;
    const partes = dataUrl.split(",");
    return partes.length > 1 ? partes[1] : dataUrl;
}

async function marcarAtribuicaoConcluida() {
    if (!tarefaAtual.cronogramaId) {
        console.warn("Nenhum ID de atribuição salvo em SGC_tarefa_atual; não foi possível marcar como concluído.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/atribuicoes/${tarefaAtual.cronogramaId}/concluir`, {
            method: "PUT"
        });

        if (!res.ok) {
            const msgErro = await res.text();
            console.error("Erro ao concluir atribuição:", msgErro);
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

    const antesPuro = extrairBase64Puro(fotoAntesBase64);
    const depoisPuro = extrairBase64Puro(fotoDepoisBase64);

    try {
        const resAntes = await fetch(`${API_URL}/tarefas/${tarefaAtual.tarefaId}/ft_antes`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ foto_antes: antesPuro })
        });

        const resDepois = await fetch(`${API_URL}/tarefas/${tarefaAtual.tarefaId}/ft_depois`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ foto_depois: depoisPuro })
        });

        await marcarAtribuicaoConcluida();

        if (resAntes.ok && resDepois.ok) {
            showToast("Checklist finalizado com sucesso!");
        } else {
            const erroAntes = !resAntes.ok ? await resAntes.text() : null;
            const erroDepois = !resDepois.ok ? await resDepois.text() : null;
            console.error("Erro ao salvar fotos:", erroAntes, erroDepois);
            showToast("Checklist enviado, mas houve erro ao salvar as fotos no servidor.", "error");
        }
    } catch (error) {
        console.error("Erro ao enviar fotos ao servidor:", error);
        showToast("Erro ao conectar com o servidor. As fotos não foram enviadas.", "error");
    }

    localStorage.removeItem("SGC_tarefa_atual");
    window.location.href = "func-tarefas.html";
}

window.addEventListener("beforeunload", pararCamera);