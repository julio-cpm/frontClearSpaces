function extrairIdentificacao(identificacao) {
    const texto = identificacao.trim();
    const textoUpper = texto.toUpperCase();
    const apenasNumeros = texto.replace(/\D/g, '');

    if (apenasNumeros.length === 11) {
        return { tipo: 'CPF', dto: { cpf: apenasNumeros, matricula: null } };
    }

    if (/^PROF-\d{4}$/i.test(texto)) {
        return { tipo: 'PROFESSOR', dto: { cpf: null, matricula: textoUpper } };
    }

    if (/^FUNC-\d{4}$/i.test(texto)) {
        return { tipo: 'FUNCIONARIO', dto: { cpf: null, matricula: textoUpper } };
    }

    // Se o tipo for indeterminado, define CPF como nulo para que o backend consulte a matrícula
    return { tipo: 'DESCONHECIDO', dto: { cpf: null, matricula: textoUpper } };
}

async function fazerLogin(event) {
    if (event) event.preventDefault();

    const identificacao = document.getElementById('login-identificacao').value.trim();
    const senha = document.getElementById('login-senha').value.trim();

    if (!identificacao || !senha) {
        alert('Por favor, preencha o login e a senha!');
        return;
    }

    const { tipo, dto } = extrairIdentificacao(identificacao);
    const loginDTO = { ...dto, senha };
    
    if (tipo === 'FUNCIONARIO') {
        return tentarLoginEndpoint(`${API_URL}/funcionarios`, loginDTO, 'funcionario', 'HTML/operacional.html');
    }
    
    if (tipo === 'PROFESSOR') {
        return tentarLoginEndpoint(`${API_URL}/professores`, loginDTO, 'professor', 'HTML/professor.html');
    }

    const logado = await tentarLoginEndpoint(`${API_URL}/funcionarios`, loginDTO, 'funcionario', 'HTML/operacional.html', false);
    if (!logado) {
        await tentarLoginEndpoint(`${API_URL}/professores`, loginDTO, 'professor', 'HTML/professor.html', true);
    }
}

async function tentarLoginEndpoint(url, dto, tipoUsuario, paginaRedirecionamento, exibirErroGlobal = true) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        });

        if (response.ok) {
            const usuario = await response.json();
            usuario.tipoUsuario = tipoUsuario;
            localStorage.setItem('SGC_usuario_logado', JSON.stringify(usuario));
            alert(`Seja bem-vindo, ${usuario.nome}!`);

            const funcao = (usuario.funcao || '').toUpperCase();
            if (funcao === 'GERENTE') {
                window.location.href = 'HTML/gerente.html';
            } else {
                window.location.href = paginaRedirecionamento;
            }
            return true;
        }

        if (exibirErroGlobal) {
            alert('Usuário ou senha incorretos.');
        }
    } catch (error) {
        console.error(`Erro ao tentar login em ${url}:`, error);
        if (exibirErroGlobal) alert('Erro ao conectar com o servidor Spring Boot.');
    }
    return false;
}

/* --- Controle do Modal de Redefinição de Senha --- */

function abrirModalRedefinir(event) {
    if (event) event.preventDefault();
    const modal = document.getElementById('modal-redefinir');
    if (modal) modal.style.display = 'flex';
}

function fecharModalRedefinir() {
    const modal = document.getElementById('modal-redefinir');
    if (modal) modal.style.display = 'none';
    const idInput = document.getElementById('redefinir-identificacao');
    const passInput = document.getElementById('redefinir-nova-senha');
    if (idInput) idInput.value = '';
    if (passInput) passInput.value = '';
}

async function confirmarRedefinicaoSenha() {
    const identificacao = document.getElementById('redefinir-identificacao').value.trim();
    const novaSenha = document.getElementById('redefinir-nova-senha').value.trim();

    if (!identificacao || !novaSenha) {
        alert("Preencha todos os campos!");
        return;
    }

    const { tipo, dto } = extrairIdentificacao(identificacao);
    const esqueciDTO = { ...dto, novaSenha };

    const rotas = tipo === 'FUNCIONARIO' ? [`${API_URL}/funcionarios/esqueci-senha`] :
                  tipo === 'PROFESSOR'   ? [`${API_URL}/professores/esqueci-senha`] :
                  [`${API_URL}/funcionarios/esqueci-senha`, `${API_URL}/professores/esqueci-senha`];

    for (const url of rotas) {
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(esqueciDTO)
            });

            if (response.ok) {
                alert(await response.text());
                fecharModalRedefinir();
                return;
            }
        } catch (error) {
            console.error(`Erro ao redefinir senha na URL ${url}:`, error);
        }
    }
    alert('Erro ao redefinir senha. Verifique os dados informados.');
}
