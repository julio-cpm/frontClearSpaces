/* Acessibilidade: botões A+ / A- (tamanho do texto) + VLibras (Libras - gov.br) */
(function () {
    const CHAVE = 'SGC_tamanho_fonte';
    const MIN = 80, MAX = 150, PASSO = 10, PADRAO = 100;

    function lerTamanho() {
        try {
            const v = parseInt(localStorage.getItem(CHAVE), 10);
            return isNaN(v) ? PADRAO : Math.min(MAX, Math.max(MIN, v));
        } catch (e) { return PADRAO; }
    }

    function aplicarTamanho(v) {
        document.documentElement.style.fontSize = v + '%';
        try { localStorage.setItem(CHAVE, v); } catch (e) {}
        const diminuir = document.getElementById('sgc-fonte-menos');
        const aumentar = document.getElementById('sgc-fonte-mais');
        if (diminuir) diminuir.disabled = v <= MIN;
        if (aumentar) aumentar.disabled = v >= MAX;
    }

    function alterar(delta) {
        aplicarTamanho(Math.min(MAX, Math.max(MIN, lerTamanho() + delta)));
    }

    function criarBotoes() {
        if (document.getElementById("sgc-acess-fonte")) return;
        const estilo = document.createElement('style');
        estilo.textContent = `
            #sgc-acess-fonte {
                position: fixed; left: 12px; bottom: 12px; z-index: 9998;
                display: flex; gap: 8px;
            }
            #sgc-acess-fonte button {
                width: 46px; height: 46px; border-radius: 50%; border: none;
                background: #1b4998; color: #fff; font-weight: 800; font-size: 16px;
                cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,.25);
            }
            #sgc-acess-fonte button:hover:not(:disabled) { background: #27a2e2; }
            #sgc-acess-fonte button:focus-visible { outline: 3px solid #fae07e; outline-offset: 2px; }
            #sgc-acess-fonte button:disabled { opacity: .4; cursor: not-allowed; }
        `;
        document.head.appendChild(estilo);

        const box = document.createElement('div');
        box.id = 'sgc-acess-fonte';
        box.setAttribute('role', 'group');
        box.setAttribute('aria-label', 'Tamanho do texto');
        box.innerHTML = `
            <button type="button" id="sgc-fonte-menos" aria-label="Diminuir texto" title="Diminuir texto">A−</button>
            <button type="button" id="sgc-fonte-mais" aria-label="Aumentar texto" title="Aumentar texto">A+</button>
        `;
        document.body.appendChild(box);
        document.getElementById('sgc-fonte-menos').addEventListener('click', () => alterar(-PASSO));
        document.getElementById('sgc-fonte-mais').addEventListener('click', () => alterar(PASSO));
        aplicarTamanho(lerTamanho());
    }

    function carregarVLibras() {
        if (document.querySelector('[vw]')) return;
        const wrapper = document.createElement('div');
        wrapper.setAttribute('vw', '');
        wrapper.className = 'enabled';
        wrapper.innerHTML = `
            <div vw-access-button class="active"></div>
            <div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>
        `;
        document.body.appendChild(wrapper);

        const script = document.createElement('script');
        script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
        script.onload = () => new window.VLibras.Widget('https://vlibras.gov.br/app');
        document.body.appendChild(script);
    }

    // aplica o tamanho salvo o quanto antes
    document.documentElement.style.fontSize = lerTamanho() + '%';

    document.addEventListener('DOMContentLoaded', () => {
        criarBotoes();
        carregarVLibras();
    });
    // como o script usa "defer", o DOM já pode estar pronto
    if (document.readyState !== 'loading') {
        if (!document.getElementById('sgc-acess-fonte')) { criarBotoes(); carregarVLibras(); }
    }
})();
