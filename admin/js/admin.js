// Credenciais (em produção, isso deveria estar no backend!)
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'carol2025'; // MUDE ESSA SENHA!

let agendamentos = [];

// Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');
    
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        carregarAgendamentos();
    } else {
        errorMsg.textContent = '❌ Usuário ou senha incorretos!';
        errorMsg.style.display = 'block';
    }
});

// Logout
function logout() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Carregar agendamentos
async function carregarAgendamentos() {
    const loading = document.getElementById('loading');
    const tabelaBody = document.getElementById('tabelaBody');
    
    loading.style.display = 'block';
    tabelaBody.innerHTML = '';
    
    try {
        const dataInicio = document.getElementById('filterDataInicio').value;
        const dataFim    = document.getElementById('filterDataFim').value;
        const statusSel  = document.getElementById('filterStatus').value;
        
        const filtros = {};
        if (dataInicio) filtros.dataInicio = dataInicio;
        if (dataFim) filtros.dataFim = dataFim;

        // 👇 Se nada foi escolhido no filtro, mostra só CONFIRMADO
        if (statusSel) {
            filtros.status = statusSel;        // pendente / confirmado / cancelado
        } else {
            filtros.status = 'confirmado';     // padrão: só quem pagou
        }
        
        const response = await agendamentoAPI.listar(filtros);
        agendamentos = response.data || [];
        
        atualizarEstatisticas();
        renderizarTabela();
        
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        tabelaBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Erro ao carregar agendamentos</td></tr>';
    } finally {
        loading.style.display = 'none';
    }
}


// Atualizar estatísticas
function atualizarEstatisticas() {
    const total = agendamentos.length;
    const pendentes = agendamentos.filter(a => a.status === 'pendente').length;
    const confirmados = agendamentos.filter(a => a.status === 'confirmado').length;
    
    const hoje = new Date().toISOString().split('T')[0];
    const agendamentosHoje = agendamentos.filter(a => {
        const dataAgendamento = new Date(a.dataHora).toISOString().split('T')[0];
        return dataAgendamento === hoje;
    }).length;
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statPendentes').textContent = pendentes;
    document.getElementById('statConfirmados').textContent = confirmados;
    document.getElementById('statHoje').textContent = agendamentosHoje;
}

// Renderizar tabela
function renderizarTabela() {
    const tbody = document.getElementById('tabelaBody');
    
    if (agendamentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #999;">Nenhum agendamento encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = agendamentos.map(ag => {
        const dataHora = new Date(ag.dataHora);
        const dataFormatada = dataHora.toLocaleDateString('pt-BR');
        const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const statusClass = `badge-${ag.status}`;
        const statusTexto = ag.status.charAt(0).toUpperCase() + ag.status.slice(1);
        
        const pagamentoClass = ag.statusPagamento === 'pago' ? 'badge-pago' : 'badge-pendente';
        const pagamentoTexto = ag.statusPagamento === 'pago' ? 'Pago' : 'Pendente';
        
        const tipoTexto = ag.tipo === 'avulsa' ? 'Avulsa' : 
                         ag.tipo === 'pacote_mensal' ? 'Pacote Mensal' : 'Pacote Anual';
        
        return `
            <tr>
                <td>${dataFormatada}<br><small>${horaFormatada}</small></td>
                <td><strong>${ag.paciente?.nome || 'N/A'}</strong></td>
                <td>
                    ${ag.paciente?.email || 'N/A'}<br>
                    <small>${ag.paciente?.telefone || 'N/A'}</small>
                </td>
                <td>${tipoTexto}</td>
                <td>R$ ${ag.valor?.toFixed(2) || '0.00'}</td>
                <td><span class="badge ${statusClass}">${statusTexto}</span></td>
                <td><span class="badge ${pagamentoClass}">${pagamentoTexto}</span></td>
                <td>
                    <button class="btn btn-info btn-small" onclick="verDetalhes('${ag._id}')">👁️ Ver</button>
                    ${ag.status === 'pendente' ? `<button class="btn btn-success btn-small" onclick="confirmarAgendamento('${ag._id}')">✓</button>` : ''}
                    ${ag.status !== 'cancelado' ? `<button class="btn btn-danger btn-small" onclick="cancelarAgendamento('${ag._id}')">✗</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// Ver detalhes
function verDetalhes(id) {
    const ag = agendamentos.find(a => a._id === id);
    if (!ag) return;
    
    const dataHora = new Date(ag.dataHora);
    const dataFormatada = dataHora.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h3>📅 Agendamento</h3>
        <p><strong>Data/Hora:</strong> ${dataFormatada} às ${horaFormatada}</p>
        <p><strong>Tipo:</strong> ${ag.tipo === 'avulsa' ? 'Sessão Avulsa' : ag.tipo === 'pacote_mensal' ? 'Pacote Mensal' : 'Pacote Anual'}</p>
        <p><strong>Status:</strong> ${ag.status}</p>
        <p><strong>Valor:</strong> R$ ${ag.valor?.toFixed(2)}</p>
        
        <h3>👤 Paciente</h3>
        <p><strong>Nome:</strong> ${ag.paciente?.nome}</p>
        <p><strong>Email:</strong> ${ag.paciente?.email}</p>
        <p><strong>Telefone:</strong> ${ag.paciente?.telefone}</p>
        <p><strong>CPF:</strong> ${ag.paciente?.cpf}</p>
        <p><strong>Data Nascimento:</strong> ${new Date(ag.paciente?.dataNascimento).toLocaleDateString('pt-BR')}</p>
        
        ${ag.paciente?.endereco ? `
            <h3>📍 Endereço</h3>
            <p>${ag.paciente.endereco.rua}, ${ag.paciente.endereco.numero}</p>
            <p>${ag.paciente.endereco.bairro} - ${ag.paciente.endereco.cidade}/${ag.paciente.endereco.estado}</p>
            <p>CEP: ${ag.paciente.endereco.cep}</p>
        ` : ''}
        
        ${ag.observacoes ? `<h3>📝 Observações</h3><p>${ag.observacoes}</p>` : ''}
        
        <h3>💳 Pagamento</h3>
        <p><strong>Status:</strong> ${ag.statusPagamento || 'Pendente'}</p>
        <p><strong>Método:</strong> ${ag.metodoPagamento || 'N/A'}</p>
        ${ag.dataPagamento ? `<p><strong>Data:</strong> ${new Date(ag.dataPagamento).toLocaleDateString('pt-BR')}</p>` : ''}
    `;
    
    document.getElementById('modalDetalhes').style.display = 'flex';
}

// Fechar modal
function fecharModal() {
    document.getElementById('modalDetalhes').style.display = 'none';
}

// Confirmar agendamento
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
        await carregarAgendamentos(); // 👈 garante recarga completa
    } catch (error) {
        alert('❌ Erro ao cancelar agendamento');
        console.error(error);
    }
}


// Limpar filtros
function limparFiltros() {
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';
    document.getElementById('filterStatus').value = '';
    carregarAgendamentos();
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modalDetalhes');
    if (event.target == modal) {
        fecharModal();
    }
}