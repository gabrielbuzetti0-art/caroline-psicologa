// Estado da aplicação
let state = {
    currentStep: 1,
    selectedDate: null,
    selectedTime: null,
    pacienteData: {},
    agendamentoId: null,
    tipoSessao: 'avulsa',
    parcelas: 1
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sistema iniciado');
    initCalendar();
    initEventListeners();
    initMasks();
    initCEPSearch();
});

// Inicializar calendário
function initCalendar() {
    const datepicker = flatpickr("#datepicker", {
        locale: "pt",
        minDate: "today",
        dateFormat: "d/m/Y",
        disable: [
            function(date) {
                return (date.getDay() === 0 || date.getDay() === 6);
            }
        ],
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length > 0) {
                state.selectedDate = selectedDates[0];
                document.getElementById('btnNextStep1').disabled = false;
                console.log('✅ Data selecionada:', state.selectedDate);
            }
        }
    });
}

// Inicializar event listeners
function initEventListeners() {
    document.getElementById('btnNextStep1').addEventListener('click', () => {
        console.log('▶️ Passo 1 → 2');
        console.log('Estado:', state);
        goToStep(2);
    });
    
    document.getElementById('btnBackStep2').addEventListener('click', () => goToStep(1));
    document.getElementById('btnNextStep2').addEventListener('click', () => goToStep(3));
    document.getElementById('btnBackStep3').addEventListener('click', () => goToStep(2));
    document.getElementById('btnNextStep3').addEventListener('click', handleStep3);
    document.getElementById('btnBackStep4').addEventListener('click', () => goToStep(3));
    document.getElementById('btnFinalizarAgendamento').addEventListener('click', finalizarAgendamento);

    // Listener para mudança de tipo de sessão
    document.querySelectorAll('input[name="tipoSessao"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.tipoSessao = e.target.value;
            console.log('✅ Tipo ALTERADO para:', state.tipoSessao);
            
            const alertaHorarioFixo = document.getElementById('alertaHorarioFixo');
            if (e.target.value === 'pacote_mensal' || e.target.value === 'pacote_anual') {
                alertaHorarioFixo.style.display = 'flex';
            } else {
                alertaHorarioFixo.style.display = 'none';
            }
        });
    });

    const selectParcelas = document.getElementById('selectParcelas');
    if (selectParcelas) {
        selectParcelas.addEventListener('change', (e) => {
            state.parcelas = parseInt(e.target.value);
            atualizarDetalheParcelas();
        });
    }
}

// Inicializar máscaras
function initMasks() {
    const telefoneInput = document.getElementById('telefone');
    const cpfInput = document.getElementById('cpf');
    const cepInput = document.getElementById('cep');

    telefoneInput.addEventListener('input', (e) => {
        e.target.value = utils.mascaraTelefone(e.target.value);
    });

    cpfInput.addEventListener('input', (e) => {
        e.target.value = utils.mascaraCPF(e.target.value);
    });

    cepInput.addEventListener('input', (e) => {
        e.target.value = utils.mascaraCEP(e.target.value);
    });
}

// Inicializar busca de CEP
function initCEPSearch() {
    const cepInput = document.getElementById('cep');
    
    cepInput.addEventListener('blur', async () => {
        const cep = cepInput.value.replace(/\D/g, '');
        
        if (cep.length === 8) {
            const endereco = await utils.buscarCEP(cep);
            
            if (endereco) {
                document.getElementById('rua').value = endereco.rua || '';
                document.getElementById('bairro').value = endereco.bairro || '';
                document.getElementById('cidade').value = endereco.cidade || '';
                document.getElementById('estado').value = endereco.estado || '';
            } else {
                alert('CEP não encontrado!');
            }
        }
    });
}

// Navegar para um passo específico
function goToStep(stepNumber) {
    console.log('===================================');
    console.log('📍 NAVEGANDO PARA PASSO:', stepNumber);
    console.log('📊 ESTADO COMPLETO:', JSON.parse(JSON.stringify(state)));
    console.log('===================================');
    
    state.currentStep = stepNumber;

    document.querySelectorAll('.step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');
        
        if (stepNum === stepNumber) {
            step.classList.add('active');
        } else if (stepNum < stepNumber) {
            step.classList.add('completed');
        }
    });

    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`step${stepNumber}`).classList.add('active');

    if (stepNumber === 2) {
        console.log('🔄 PASSO 2 - Vai carregar horários');
        carregarHorarios();
    } else if (stepNumber === 4) {
        console.log('📋 PASSO 4 - Vai mostrar resumo');
        mostrarResumo();
        configurarParcelamento();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Carregar horários disponíveis
async function carregarHorarios() {
    const horariosGrid = document.getElementById('horariosGrid');
    const loading = document.getElementById('loadingHorarios');
    
    loading.style.display = 'block';
    horariosGrid.innerHTML = '';
    
    try {
        console.log('🔍 Buscando horários disponíveis para:', state.selectedDate);
        
        // Formatar data para enviar ao backend
        const dataFormatada = state.selectedDate.toISOString().split('T')[0];
        
        // Buscar horários disponíveis do backend
        const response = await agendamentoAPI.horariosDisponiveis(
            dataFormatada, 
            state.tipoSessao
        );
        
        console.log('✅ Resposta completa da API:', response);
        console.log('✅ response.data:', response.data);
        console.log('✅ Tipo de response.data:', typeof response.data);
        console.log('✅ É array?', Array.isArray(response.data));
        
        // Extrair horários do response
        let horariosDisponiveis = [];
        
        if (Array.isArray(response.data)) {
            horariosDisponiveis = response.data;
        } else if (response.data && Array.isArray(response.data.horariosDisponiveis)) {
            horariosDisponiveis = response.data.horariosDisponiveis;
        } else if (response.data && typeof response.data === 'object') {
            // Se for objeto, tentar pegar qualquer propriedade que seja array
            const valores = Object.values(response.data);
            const arrayEncontrado = valores.find(v => Array.isArray(v));
            if (arrayEncontrado) {
                horariosDisponiveis = arrayEncontrado;
            }
        }
        
        console.log('✅ Horários processados:', horariosDisponiveis);
        
        if (!Array.isArray(horariosDisponiveis) || horariosDisponiveis.length === 0) {
            horariosGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
                    <p style="font-size: 18px; margin-bottom: 10px;">😔 Nenhum horário disponível</p>
                    <p>Todos os horários deste dia já estão ocupados. Por favor, escolha outra data.</p>
                </div>
            `;
            document.getElementById('btnNextStep2').disabled = true;
            return;
        }
        
        // Atualizar data selecionada no texto
        document.getElementById('selectedDate').textContent = utils.formatarData(state.selectedDate);
        
        // Renderizar horários disponíveis
        horariosDisponiveis.forEach(horario => {
            const button = document.createElement('button');
            button.className = 'horario-btn';
            button.textContent = horario;
            button.onclick = () => selecionarHorario(horario);
            horariosGrid.appendChild(button);
        });
        
        console.log('✅ Total de horários renderizados:', horariosDisponiveis.length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar horários:', error);
        horariosGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #e74c3c;">
                <p style="font-size: 18px; margin-bottom: 10px;">❌ Erro ao carregar horários</p>
                <p>${error.message}</p>
                <p style="font-size: 12px; margin-top: 10px;">Tente novamente mais tarde ou entre em contato.</p>
            </div>
        `;
        document.getElementById('btnNextStep2').disabled = true;
    } finally {
        loading.style.display = 'none';
    }
}

// Selecionar horário
function selecionarHorario(horario) {
    document.querySelectorAll('.horario-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    event.target.classList.add('selected');
    state.selectedTime = horario;
    document.getElementById('btnNextStep2').disabled = false;
    console.log('✅ Horário selecionado:', horario);
}

// Validar e processar passo 3
function handleStep3() {
    const form = document.getElementById('formDadosPaciente');
    const lgpdCheckbox = document.getElementById('aceitoLGPD');
    
    if (!lgpdCheckbox || !lgpdCheckbox.checked) {
        alert('Você precisa aceitar a Política de Privacidade para continuar.');
        if (lgpdCheckbox) lgpdCheckbox.focus();
        return;
    }
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const dados = {};
    
    formData.forEach((value, key) => {
        if (key === 'primeiraConsulta') {
            dados[key] = document.getElementById('primeiraConsulta').checked;
        } else if (key === 'aceitoLGPD') {
            dados[key] = true;
        } else {
            dados[key] = typeof value === 'string' ? value.trim() : value;
        }
    });

    if (!utils.validarCPF(dados.cpf)) {
        alert('CPF inválido!');
        document.getElementById('cpf').focus();
        return;
    }

    const emailLimpo = dados.email.trim();
    if (!utils.validarEmail(emailLimpo)) {
        alert('E-mail inválido!');
        document.getElementById('email').focus();
        return;
    }
    dados.email = emailLimpo;

    state.pacienteData = dados;
    console.log('✅ Dados do paciente salvos:', state.pacienteData);

    goToStep(4);
}

// Configurar opções de parcelamento
function configurarParcelamento() {
    console.log('⚙️ Configurando parcelamento para tipo:', state.tipoSessao);
    
    const tipoSessao = state.tipoSessao;
    const parcelamentoContainer = document.getElementById('parcelamentoContainer');
    const selectParcelas = document.getElementById('selectParcelas');
    
    if (tipoSessao === 'pacote_mensal' || tipoSessao === 'pacote_anual') {
        parcelamentoContainer.style.display = 'block';
        
        selectParcelas.innerHTML = '';
        
        if (tipoSessao === 'pacote_mensal') {
            for (let i = 1; i <= 4; i++) {
                const option = document.createElement('option');
                option.value = i;
                const valorParcela = (480 / i).toFixed(2);
                option.textContent = `${i}x de R$ ${valorParcela}${i === 1 ? ' (à vista)' : ''}`;
                selectParcelas.appendChild(option);
            }
        } else {
            for (let i = 1; i <= 12; i++) {
                const option = document.createElement('option');
                option.value = i;
                const valorParcela = (5760 / i).toFixed(2);
                option.textContent = `${i}x de R$ ${valorParcela}${i === 1 ? ' (à vista)' : ''}`;
                selectParcelas.appendChild(option);
            }
        }
        
        state.parcelas = 1;
        
        if (state.selectedDate && state.selectedTime) {
            atualizarDetalheParcelas();
        }
        
    } else {
        parcelamentoContainer.style.display = 'none';
        state.parcelas = 1;
    }
}

// Atualizar detalhes do parcelamento
function atualizarDetalheParcelas() {
    const tipoSessao = state.tipoSessao;
    const parcelas = state.parcelas;
    const detalheElement = document.getElementById('parcelamentoDetalhe');
    
    const diaSemana = state.selectedDate ? obterDiaSemana(state.selectedDate) : '[dia da semana]';
    const horario = state.selectedTime || '[horário]';
    
    if (tipoSessao === 'pacote_mensal') {
        const totalSessoes = 4;
        const valorTotal = 480;
        const valorParcela = (valorTotal / parcelas).toFixed(2);
        
        detalheElement.innerHTML = `
            <strong>📋 Resumo do Pacote Mensal:</strong><br>
            • ${totalSessoes} sessões semanais<br>
            • Toda ${diaSemana} às ${horario}<br>
            • Valor total: R$ ${valorTotal.toFixed(2)}<br>
            • Parcelamento: ${parcelas}x de R$ ${valorParcela}
        `;
    } else if (tipoSessao === 'pacote_anual') {
        const totalSessoes = 48;
        const valorTotal = 5760;
        const valorParcela = (valorTotal / parcelas).toFixed(2);
        const economia = (totalSessoes * 150) - valorTotal;
        
        detalheElement.innerHTML = `
            <strong>📋 Resumo do Pacote Anual:</strong><br>
            • ${totalSessoes} sessões semanais (1 ano)<br>
            • Toda ${diaSemana} às ${horario}<br>
            • Valor total: R$ ${valorTotal.toFixed(2)}<br>
            • Economia de R$ ${economia.toFixed(2)}!<br>
            • Parcelamento: ${parcelas}x de R$ ${valorParcela}
        `;
    }
}

// Obter dia da semana por extenso
function obterDiaSemana(data) {
    if (!data) return 'dia da semana';
    
    const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    return dias[data.getDay()];
}

// Mostrar resumo do agendamento
function mostrarResumo() {
    console.log('📋 ========== MOSTRANDO RESUMO ==========');
    console.log('Estado completo:', JSON.parse(JSON.stringify(state)));
    
    const tipoSessao = state.tipoSessao;
    
    let valorSessao, tipoTexto;
    
    if (tipoSessao === 'pacote_mensal') {
        valorSessao = 'R$ 480,00';
        tipoTexto = 'Pacote Mensal (4 sessões)';
    } else if (tipoSessao === 'pacote_anual') {
        valorSessao = 'R$ 5.760,00';
        tipoTexto = 'Pacote Anual (48 sessões)';
    } else {
        valorSessao = 'R$ 150,00';
        tipoTexto = 'Sessão Avulsa';
    }

    const dataFormatada = state.selectedDate ? utils.formatarData(state.selectedDate) : 'Data não selecionada';
    
    console.log('Resumo gerado:', { dataFormatada, horario: state.selectedTime, tipo: tipoTexto, valor: valorSessao });
    
    document.getElementById('resumoData').textContent = dataFormatada;
    document.getElementById('resumoHorario').textContent = state.selectedTime || 'Horário não selecionado';
    document.getElementById('resumoNome').textContent = state.pacienteData.nome;
    document.getElementById('resumoEmail').textContent = state.pacienteData.email;
    document.getElementById('resumoTipo').textContent = tipoTexto;
    document.getElementById('resumoValor').textContent = valorSessao;
}

// Finalizar agendamento
async function finalizarAgendamento() {
    const btnFinalizar = document.getElementById('btnFinalizarAgendamento');
    btnFinalizar.disabled = true;
    btnFinalizar.textContent = 'Processando...';

    console.log('🚀 ========== FINALIZANDO AGENDAMENTO ==========');
    console.log('Estado completo:', JSON.parse(JSON.stringify(state)));

    if (!state.selectedDate || !state.selectedTime) {
        alert('Erro: Data ou horário não selecionados.');
        btnFinalizar.disabled = false;
        btnFinalizar.textContent = '✓ Confirmar e Pagar';
        return;
    }

    try {
        let pacienteId;
        
        console.log('🔍 Buscando paciente por email:', state.pacienteData.email);
        
        try {
            const pacienteExistente = await pacienteAPI.buscarPorEmail(state.pacienteData.email);
            pacienteId = pacienteExistente.data._id;
            console.log('✅ Paciente existente encontrado:', pacienteId);
        } catch (errorBusca) {
            console.log('📝 Paciente não encontrado, criando novo...');
            
            const novoPaciente = await pacienteAPI.criar({
                nome: state.pacienteData.nome,
                email: state.pacienteData.email,
                telefone: state.pacienteData.telefone,
                cpf: state.pacienteData.cpf.replace(/\D/g, ''),
                dataNascimento: state.pacienteData.dataNascimento,
                endereco: {
                    rua: state.pacienteData.rua || '',
                    numero: state.pacienteData.numero || '',
                    bairro: state.pacienteData.bairro || '',
                    cidade: state.pacienteData.cidade || '',
                    estado: state.pacienteData.estado || '',
                    cep: state.pacienteData.cep?.replace(/\D/g, '') || ''
                },
                primeiraConsulta: state.pacienteData.primeiraConsulta || false,
                observacoes: state.pacienteData.observacoes || ''
            });
            
            pacienteId = novoPaciente.data._id;
            console.log('✅ Novo paciente criado:', pacienteId);
        }

        if (!pacienteId) {
            throw new Error('Erro: ID do paciente não foi obtido!');
        }

        const [hora, minuto] = state.selectedTime.split(':');
        const dataHora = new Date(state.selectedDate);
        dataHora.setHours(parseInt(hora), parseInt(minuto), 0, 0);

        const dadosAgendamento = {
            pacienteId: pacienteId,
            dataHora: dataHora.toISOString(),
            tipo: state.tipoSessao,
            observacoes: state.pacienteData.observacoes || ''
        };

        if (state.tipoSessao === 'pacote_mensal' || state.tipoSessao === 'pacote_anual') {
            dadosAgendamento.parcelas = state.parcelas;
        }

        const agendamento = await agendamentoAPI.criar(dadosAgendamento);
        console.log('✅ Agendamento criado:', agendamento);
        state.agendamentoId = agendamento.data._id;

        const metodoPagamento = document.querySelector('input[name="metodoPagamento"]:checked').value;

        if (metodoPagamento === 'pix' || metodoPagamento === 'cartao') {
            console.log('💳 Criando pagamento via Mercado Pago...');
            
            try {
                const preferencia = await pagamentoAPI.criarPreferencia(state.agendamentoId);
                console.log('✅ Preferência criada:', preferencia);
                
                if (preferencia.sandbox_init_point) {
                    window.location.href = preferencia.sandbox_init_point;
                } else if (preferencia.init_point) {
                    window.location.href = preferencia.init_point;
                }
                
                return;
            } catch (errorPagamento) {
                console.error('❌ Erro ao criar preferência:', errorPagamento);
                alert('Erro ao processar pagamento. Tente novamente.');
                btnFinalizar.disabled = false;
                btnFinalizar.textContent = '✓ Confirmar e Pagar';
                return;
            }
        }

        document.querySelectorAll('.step-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById('stepSucesso').style.display = 'block';

        console.log('🎉 AGENDAMENTO FINALIZADO COM SUCESSO!');

    } catch (error) {
        console.error('❌ Erro completo:', error);
        alert('Erro ao finalizar agendamento: ' + error.message);
        btnFinalizar.disabled = false;
        btnFinalizar.textContent = '✓ Confirmar e Pagar';
    }
}