const API_URL = 'http://localhost:8080';

function formatarIdentificacao(valor) {
    if (!valor) return '';
    valor = valor.trim();

    if (/^\d/.test(valor)) {
        let v = valor.replace(/\D/g, "").substring(0, 11);

        if (v.length > 9) {
            v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
        } else if (v.length > 6) {
            v = v.replace(/^(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
        } else if (v.length > 3) {
            v = v.replace(/^(\d{3})(\d{1,3})/, "$1.$2");
        }

        return v;
    } else {
        return valor.toUpperCase().substring(0, 9);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const inputs = [
        document.getElementById('login-identificacao'),
        document.getElementById('func-cpf'),
        document.getElementById('redefinir-identificacao')
    ];

    inputs.forEach(input => {
        if (input) {
            input.addEventListener('input', (e) => {
                e.target.value = formatarIdentificacao(e.target.value);
            });
        }
    });
});

function extrairIdentificacao(identificacao) {
    const texto = identificacao.trim();
    const textoUpper = texto.toUpperCase();
    const apenasNumeros = texto.replace(/\D/g, '');

    if (/^FUNC-\d{4}$/i.test(texto)) {
        return { tipo: 'FUNCIONARIO', dto: { cpf: null, matricula: textoUpper } };
    }

    if (/^PROF-\d{4}$/i.test(texto)) {
        return { tipo: 'PROFESSOR', dto: { cpf: null, matricula: textoUpper } };
    }

    if (apenasNumeros.length === 11) {
        return { tipo: 'CPF', dto: { cpf: apenasNumeros, matricula: null } };
    }

    return { tipo: 'DESCONHECIDO', dto: { cpf: texto, matricula: texto } };
}

function avisoCacheHtml(usandoCache) {
    if (!usandoCache) return '';
    return `<p class="no-alerts" style="background:#fff3cd; color:#856404; border:1px solid #ffeeba; border-radius:8px; padding:10px; margin-bottom:15px;">⚠️ Não foi possível conectar ao servidor agora. Exibindo dados salvos localmente, que podem estar desatualizados.</p>`;
}

function showToast(mensagem, tipo = "success") {
    injetarEstiloToast();

    let toast = document.getElementById("sgc-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "sgc-toast";
        document.body.appendChild(toast);
    }

    toast.textContent = mensagem;
    toast.className = `sgc-toast sgc-toast-${tipo === "error" ? "error" : "success"} sgc-toast-show`;

    clearTimeout(toast._sgcTimeoutId);
    toast._sgcTimeoutId = setTimeout(() => {
        toast.classList.remove("sgc-toast-show");
    }, 3000);
}

function injetarEstiloToast() {
    if (document.getElementById("sgc-toast-style")) return;

    const style = document.createElement("style");
    style.id = "sgc-toast-style";
    style.textContent = `
        #sgc-toast {
            position: fixed;
            left: 50%;
            bottom: 30px;
            transform: translateX(-50%) translateY(20px);
            min-width: 220px;
            max-width: 90vw;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: #fff;
            text-align: center;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            opacity: 0;
            pointer-events: none;
            z-index: 9999;
            transition: opacity .25s ease, transform .25s ease;
        }
        #sgc-toast.sgc-toast-show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        #sgc-toast.sgc-toast-success { background: #27ae60; }
        #sgc-toast.sgc-toast-error { background: #c0392b; }
    `;
    document.head.appendChild(style);
}

function getUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("SGC_usuario_logado"));
    } catch (e) {
        return null;
    }
}