// =========================
// CREDENCIAIS SIMPLES (front)
// =========================
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'carol2025'; // MUDA ISSO UM DIA 😅

let agendamentos = [];
let leads = [];

// =========================
// LOGIN
// =========================
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');
    
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';

        initTabs();
        // carrega tudo no começo
        carregarAgendamentos();
        carregarLeads();
        carregarEstatisticasEvolucao();
    } else {
        errorMsg.textContent = '❌ Usuário ou senha incorretos!';
        errorMsg.style.display = 'block';
    }
});

// =========================
// LOGOUT
// =========================
function logout() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// =========================
// ABAS
// =========================
function initTabs() {
    const buttons = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            buttons.forEach(b => b.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`tab-${tab}`).classList.add('active');

            // Quando trocar de aba, podemos forçar recarga se quiser:
            if (tab === 'agendamentos') {
                carregarAgendamentos();
            } else if (tab === 'leads') {
                carregarLeads();
            } else if (tab === 'estatisticas') {
                carregarEstatisticasEvolucao();
            }
        });
    });
}

// =========================
// CARREGAR AGENDAMENTOS
// =========================
async function carregarAgendamentos() {
    const loading = document.getElementById('loading');
    const tabelaBody = document.getElementById('tabelaBody');
    
    if (!loading || !tabelaBody) return;

    loading.style.display = 'block';
    tabelaBody.innerHTML = '';
    
    try {
        const dataInicio = document.getElementById('filterDataInicio').value;
        const dataFim    = document.getElementById('filterDataFim').value;
        const statusSel  = document.getElementById('filterStatus').value;
        
        const filtros = {};
        if (dataInicio) filtros.dataInicio = dataInicio;
        if (dataFim) filtros.dataFim = dataFim;

        // Se nada foi escolhido no filtro, mostra só CONFIRMADO
        if (statusSel) {
            filtros.status = statusSel;        // pendente / confirmado / cancelado
        } else {
            filtros.status = 'confirmado';     // padrão
        }
        
        const response = await agendamentoAPI.listar(filtros);
        agendamentos = response.data || [];
        
        atualizarEstatisticas();          // cards do topo da aba de agendamentos
        renderizarTabelaAgendamentos();   // tabela principal
        
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        tabelaBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Erro ao carregar agendamentos</td></tr>';
    } finally {
        loading.style.display = 'none';
    }
}

// =========================
// ESTATÍSTICAS (ABA AGENDAMENTOS)
// =========================
function atualizarEstatisticas() {
    const total = agendamentos.length;
    const pendentes = agendamentos.filter(a => a.status === 'pendente').length;
    const confirmados = agendamentos.filter(a => a.status === 'confirmado').length;
    
    const hoje = new Date().toISOString().split('T')[0];
    const agendamentosHoje = agendamentos.filter(a => {
        if (!a.dataHora) return false;
        const dataAgendamento = new Date(a.dataHora).toISOString().split('T')[0];
        return dataAgendamento === hoje;
    }).length;
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPendentes').textContent = pendentes;
    document.getElementById('statConfirmados').textContent = confirmados;
    document.getElementById('statHoje').textContent = agendamentosHoje;
}

// =========================
// TABELA DE AGENDAMENTOS
// =========================
function renderizarTabelaAgendamentos() {
    const tbody = document.getElementById('tabelaBody');
    
    if (!tbody) return;

    if (agendamentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #999;">Nenhum agendamento encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = agendamentos.map(ag => {
        const dataHora = ag.dataHora ? new Date(ag.dataHora) : null;
        const dataFormatada = dataHora
            ? dataHora.toLocaleDateString('pt-BR')
            : 'N/A';
        const horaFormatada = dataHora
            ? dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : 'N/A';
        
        const statusClass = `badge-${ag.status}`;
        const statusTexto = ag.status
            ? ag.status.charAt(0).toUpperCase() + ag.status.slice(1)
            : 'N/A';
        
        const statusPgto = ag.pagamento?.status || 'pendente';
        const pagamentoClass = statusPgto === 'aprovado' ? 'badge-pago' : 'badge-pendente';
        const pagamentoTexto = statusPgto === 'aprovado' ? 'Pago' : 'Pendente';
        
        const tipoTexto =
            ag.tipo === 'pacote_mensal' ? 'Pacote Mensal' :
            ag.tipo === 'pacote_anual' ? 'Pacote Anual' :
            ag.tipo === 'casal' ? 'Casal' :
            ag.tipo === 'avaliacao' ? 'Avaliação' :
            'Sessão Avulsa';
        
        const valor = ag.valor != null ? ag.valor.toFixed(2) : '0.00';
        
        return `
            <tr>
                <td>${dataFormatada}<br><small>${horaFormatada}</small></td>
                <td><strong>${ag.paciente?.nome || 'N/A'}</strong></td>
                <td>
                    ${ag.paciente?.email || 'N/A'}<br>
                    <small>${ag.paciente?.telefone || 'N/A'}</small>
                </td>
                <td>${tipoTexto}</td>
                <td>R$ ${valor}</td>
                <td><span class="badge ${statusClass}">${statusTexto}</span></td>
                <td><span class="badge ${pagamentoClass}">${pagamentoTexto}</span></td>
                <td>
                    <button class="btn btn-info btn-small" onclick="verDetalhesAgendamento('${ag._id}')">👁️ Ver</button>
                    ${ag.status === 'pendente' ? `<button class="btn btn-success btn-small" onclick="confirmarAgendamento('${ag._id}')">✓</button>` : ''}
                    ${ag.status !== 'cancelado' ? `<button class="btn btn-danger btn-small" onclick="cancelarAgendamento('${ag._id}')">✗</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// =========================
// VER DETALHES (AGENDAMENTO)
// =========================
function verDetalhesAgendamento(id) {
    const ag = agendamentos.find(a => a._id === id);
    if (!ag) return;
    
    const dataHora = ag.dataHora ? new Date(ag.dataHora) : null;
    const dataFormatada = dataHora
        ? dataHora.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })
        : 'N/A';
    const horaFormatada = dataHora
        ? dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : 'N/A';
    
    const modalBody = document.getElementById('modalBody');
    const statusPgto = ag.pagamento?.status || 'pendente';
    const metodoPgto = ag.pagamento?.metodo || 'N/A';
    const dataPagamento = ag.pagamento?.dataPagamento
        ? new Date(ag.pagamento.dataPagamento).toLocaleDateString('pt-BR')
        : null;

    modalBody.innerHTML = `
        <h3>📅 Agendamento</h3>
        <p><strong>Data/Hora:</strong> ${dataFormatada} às ${horaFormatada}</p>
        <p><strong>Tipo:</strong> ${
            ag.tipo === 'pacote_mensal' ? 'Pacote Mensal' :
            ag.tipo === 'pacote_anual' ? 'Pacote Anual' :
            ag.tipo === 'casal' ? 'Casal' :
            ag.tipo === 'avaliacao' ? 'Avaliação' :
            'Sessão Avulsa'
        }</p>
        <p><strong>Status:</strong> ${ag.status}</p>
        <p><strong>Valor:</strong> R$ ${ag.valor?.toFixed(2) || '0.00'}</p>
        
        <h3>👤 Paciente</h3>
        <p><strong>Nome:</strong> ${ag.paciente?.nome || 'N/A'}</p>
        <p><strong>Email:</strong> ${ag.paciente?.email || 'N/A'}</p>
        <p><strong>Telefone:</strong> ${ag.paciente?.telefone || 'N/A'}</p>
        <p><strong>CPF:</strong> ${ag.paciente?.cpf || 'N/A'}</p>
        ${ag.paciente?.dataNascimento ? `<p><strong>Data Nascimento:</strong> ${new Date(ag.paciente.dataNascimento).toLocaleDateString('pt-BR')}</p>` : ''}
        
        ${ag.paciente?.endereco ? `
            <h3>📍 Endereço</h3>
            <p>${ag.paciente.endereco.rua || ''}, ${ag.paciente.endereco.numero || ''}</p>
            <p>${ag.paciente.endereco.bairro || ''} - ${ag.paciente.endereco.cidade || ''}/${ag.paciente.endereco.estado || ''}</p>
            <p>CEP: ${ag.paciente.endereco.cep || ''}</p>
        ` : ''}
        
        ${ag.observacoes ? `<h3>📝 Observações</h3><p>${ag.observacoes}</p>` : ''}
        
        <h3>💳 Pagamento</h3>
        <p><strong>Status:</strong> ${statusPgto}</p>
        <p><strong>Método:</strong> ${metodoPgto}</p>
        ${dataPagamento ? `<p><strong>Data:</strong> ${dataPagamento}</p>` : ''}
    `;
    
    document.getElementById('modalDetalhes').style.display = 'flex';
}

// =========================
// FECHAR MODAL
// =========================
function fecharModal() {
    document.getElementById('modalDetalhes').style.display = 'none';
}

// Fecha modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modalDetalhes');
    if (event.target === modal) {
        fecharModal();
    }
};

// =========================
// CONFIRMAR / CANCELAR
// =========================
async function confirmarAgendamento(id) {
    if (!confirm('Confirmar este agendamento?')) return;
    
    try {
        await agendamentoAPI.atualizarStatus(id, 'confirmado');
        alert('✅ Agendamento confirmado!');
        carregarAgendamentos();
    } catch (error) {
        alert('❌ Erro ao confirmar agendamento');
        console.error(error);
    }
}

async function cancelarAgendamento(id) {
    const motivo = prompt('Motivo do cancelamento:');
    if (!motivo) return;
    
    try {
        await agendamentoAPI.cancelar(id, {
            motivo,
            canceladoPor: 'admin'
        });
        alert('✅ Agendamento cancelado!');
        await carregarAgendamentos();
    } catch (error) {
        alert('❌ Erro ao cancelar agendamento');
        console.error(error);
    }
}

// =========================
// LIMPAR FILTROS
// =========================
function limparFiltros() {
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';
    document.getElementById('filterStatus').value = '';
    carregarAgendamentos();
}

// =========================
// LEADS (ABA LEADS)
// =========================
async function carregarLeads() {
    const loading = document.getElementById('loadingLeads');
    const tbody = document.getElementById('tabelaLeadsBody');

    if (!loading || !tbody || typeof leadAPI === 'undefined') {
        // Se não tiver leadAPI ainda definido no api.js, evita quebrar
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">API de Leads não configurada.</td></tr>';
        return;
    }

    loading.style.display = 'block';
    tbody.innerHTML = '';

    try {
        // Busca só leads aguardando pagamento
        const resp = await leadAPI.listar({ statusLead: 'aguardando_pagamento' });
        leads = resp.data || [];

        if (leads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">Nenhum lead aguardando pagamento.</td></tr>';
            return;
        }

        tbody.innerHTML = leads.map(ld => {
            const dataHora = ld.dataHora ? new Date(ld.dataHora) : null;
            const dataFormatada = dataHora
                ? dataHora.toLocaleDateString('pt-BR')
                : 'N/A';
            const horaFormatada = dataHora
                ? dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : 'N/A';

            const statusLead = ld.statusLead || 'aguardando_pagamento';
            const statusPgto = ld.statusPagamento || 'pendente';

            const tipoTexto =
                ld.tipoSessao === 'pacote_mensal' ? 'Pacote Mensal' :
                ld.tipoSessao === 'pacote_anual' ? 'Pacote Anual' :
                'Sessão Avulsa';

            const valor = ld.valor != null ? ld.valor.toFixed(2) : '0.00';

            return `
                <tr>
                    <td>${dataFormatada}<br><small>${horaFormatada}</small></td>
                    <td><strong>${ld.nome || 'N/A'}</strong></td>
                    <td>
                        ${ld.email || 'N/A'}<br>
                        <small>${ld.telefone || 'N/A'}</small>
                    </td>
                    <td>${tipoTexto}</td>
                    <td>R$ ${valor}</td>
                    <td>${statusLead}</td>
                    <td>${statusPgto}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar leads:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Erro ao carregar leads</td></tr>';
    } finally {
        loading.style.display = 'none';
    }
}

// =========================
// ESTATÍSTICAS DE EVOLUÇÃO (ABA ESTATÍSTICAS)
// =========================
async function carregarEstatisticasEvolucao() {
    // Aqui vamos puxar TODOS os agendamentos (sem filtro) e calcular:
    // - últimos 7 dias
    // - mês atual
    // - mês anterior
    // - status "faltou"
    try {
        const resp = await agendamentoAPI.listar(); // sem filtros = todos
        const lista = resp.data || [];

        const agora = new Date();
        const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        const seteDiasAtras = new Date(hoje);
        seteDiasAtras.setDate(hoje.getDate() - 6); // hoje + 6 dias = janela de 7 dias

        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();

        const inicioMesAtual = new Date(anoAtual, mesAtual, 1);
        const inicioMesAnterior = new Date(anoAtual, mesAtual - 1, 1);
        const fimMesAnterior = new Date(anoAtual, mesAtual, 0); // dia 0 = último dia do mês anterior

        let ultimos7 = 0;
        let mesAtualCount = 0;
        let mesAnteriorCount = 0;
        let faltouCount = 0;

        lista.forEach(ag => {
            if (!ag.dataHora) return;

            const d = new Date(ag.dataHora);
            const dia = new Date(d.getFullYear(), d.getMonth(), d.getDate());

            // últimos 7 dias
            if (dia >= seteDiasAtras && dia <= hoje) {
                ultimos7++;
            }

            // mês atual
            if (dia >= inicioMesAtual && dia <= hoje) {
                mesAtualCount++;
            }

            // mês anterior
            if (dia >= inicioMesAnterior && dia <= fimMesAnterior) {
                mesAnteriorCount++;
            }

            // faltou
            if (ag.status === 'faltou') {
                faltouCount++;
            }
        });

        document.getElementById('statUltimos7').textContent = ultimos7;
        document.getElementById('statMesAtual').textContent = mesAtualCount;
        document.getElementById('statMesAnterior').textContent = mesAnteriorCount;
        document.getElementById('statFaltou').textContent = faltouCount;

    } catch (error) {
        console.error('Erro ao carregar estatísticas de evolução:', error);
        document.getElementById('statUltimos7').textContent = '-';
        document.getElementById('statMesAtual').textContent = '-';
        document.getElementById('statMesAnterior').textContent = '-';
        document.getElementById('statFaltou').textContent = '-';
    }
}
