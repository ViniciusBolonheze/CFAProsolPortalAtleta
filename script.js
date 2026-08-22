const SUPABASE_URL = 'https://jrudgjopfxfyyhnvgidz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VScGEvhYLgQSDGll2IQIsw_bsTQXRCO';

function criarSupabaseIndisponivel() {
    const erro = { message: 'Biblioteca Supabase não carregada. Verifique a conexão com a internet.' };
    const query = {
        select() { return this; }, eq() { return this; }, single() { return Promise.resolve({ data: null, error: erro }); },
        maybeSingle() { return Promise.resolve({ data: null, error: erro }); }, order() { return this; }, limit() { return this; },
        upsert() { return Promise.resolve({ error: erro }); }, insert() { return Promise.resolve({ error: erro }); },
        update() { return this; }, delete() { return this; }, then(resolve) { resolve({ data: [], error: erro }); }
    };
    return {
        from() { return query; },
        storage: { from() { return { upload() { return Promise.resolve({ data: null, error: erro }); }, getPublicUrl() { return { data: { publicUrl: '' } }; }, remove() { return Promise.resolve({ data: [], error: erro }); } }; } }
    };
}
const supabaseCreateClient = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient
    : (typeof supabase !== 'undefined' && supabase.createClient ? supabase.createClient : null);
const _supabase = supabaseCreateClient ? supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY) : criarSupabaseIndisponivel();
// Variável global para armazenar a quantidade de grupos ativa (padrão é 6)
let quantidadeGruposAtivos = 6;

const STORAGE_CONVOCACAO_KEY = 'prosol_cfa_convocacao_v1';
let criterioOrdenacaoAtual = 'nome';
let direcaoOrdenacaoAtual = 'asc'; // 'asc' (menor para maior / A-Z) ou 'desc' (maior para menor / Z-A)
let defaultColumns = [
    'Ano', 'NOME COMPLETO', 'APELIDO', 'Data de nascimento', 'Posição 1', 'Posição 2', 'CIDADE', 'Contato', 'RG', 'Foto', 'Anotacoes',
    'AVALIAÇÃO1', 'Data1', 'Altura1', 'alturasentado1', 'peso1', 'Dobras1_1', 'Dobras2_1', 'Dobras3_1', 'Dobras4_1', 'PercentualGordura1', 'alturapredita1', 'nivel1', 'distancia1', 'Salto1_1', 'Salto2_1', 'Salto3_1', 'MelhorSalto1', 'aceleração1_1', 'velocidade1_1', 'aceleração2_1', 'velocidade2_1', 'aceleração3_1', 'velocidade3_1', 'aceleração4_1', 'velocidade4_1', 'aceleração5_1', 'velocidade5_1', 'aceleração6_1', 'velocidade6_1', 'aceleração7_1', 'velocidade7_1', 'Aceleraçãofinal1', 'Velocidadefinal1', 'Volta1_1', 'Volta2_1', 'Agilidade1', 
    'AVALIAÇÃO2', 'Data2', 'Altura2', 'alturasentado2', 'peso2', 'Dobras1_2', 'Dobras2_2', 'Dobras3_2', 'Dobras4_2', 'PercentualGordura2', 'alturapredita2', 'nivel2', 'distancia2', 'Salto1_2', 'Salto2_2', 'Salto3_2', 'MelhorSalto2', 'aceleração1_2', 'velocidade1_2', 'aceleração2_2', 'velocidade2_2', 'aceleração3_2', 'velocidade3_2', 'aceleração4_2', 'velocidade4_2', 'aceleração5_2', 'velocidade5_2', 'aceleração6_2', 'velocidade6_2', 'aceleração7_2', 'velocidade7_2', 'Aceleraçãofinal2', 'Velocidadefinal2', 'Volta1_2', 'Volta2_2', 'Agilidade2'
];

let defaultData = [
    {
        'Ano': '2010', 'NOME COMPLETO': 'Bernardo Delgado Alaver Barroso', 'APELIDO': 'Bernardo', 'Data de nascimento': '23/02/2010', 'Posição 1': 'Volante', 'Posição 2': '1º volante', 'CIDADE': 'Londrina', 'Contato': '(43) 99999-0000', 'RG': '138052478', 'Foto': '', 'Anotacoes':'',
        'Data1': '02/02/2026', 'Altura1': '1,73', 'alturapredita1': '1,78', 'alturasentado1': '90', 'peso1': '66,6', 'Dobras1_1': '7', 'Dobras2_1': '6', 'Dobras3_1': '4,5', 'Dobras4_1': '9,5', 'PercentualGordura1': '0.10495',
        'nivel1': '18,4', 'distancia1': '1880', 'Salto1_1': '2,09', 'Salto2_1': '2,3', 'Salto3_1': '2,39', 'MelhorSalto1': '2,39',
        'Aceleraçãofinal1': '4.2', 'Velocidadefinal1': '21.5',
        'Volta1_1': '4,7', 'Volta2_1': '4,7', 'Agilidade1': '4,7'
    }
];

let excelColumns = defaultColumns;
let excelData = defaultData;
let uploadedPhotoBase64 = '';
let selectedAthleteIndex = null;
let editingAthleteIndex = null;
let currentPfTab = 'antropometricas';
let selectedConvocados = new Set();
let convocacaoSessaoAtiva = false;
let convocacaoCarregadaNaSessao = false;
let professorJogosAtual = null;

// Variável de controle para os Grupos
let gruposData = {
    'Grupo 1': [], 'Grupo 2': [], 'Grupo 3': [], 'Grupo 4': [], 'Grupo 5': [], 'Grupo 6': []
};
// Variável global para armazenar os exercícios que vêm do banco de dados
let exerciciosSalvosNaNuvem = {};
async function loadFromStorage() {
    try {
        const { data, error } = await _supabase.from('sistema_config').select('colunas, dados').eq('chave', 'principal').single();
        if (!error && data) {
            if (data.colunas && data.colunas.length > 0) excelColumns = data.colunas;
            if (data.dados && data.dados.length > 0) excelData = data.dados;
        }
    } catch (err) { console.error('Erro de conexão:', err); }

    const savedConvocacao = localStorage.getItem(STORAGE_CONVOCACAO_KEY);
    if (savedConvocacao) {
        try { selectedConvocados = new Set(JSON.parse(savedConvocacao)); } catch(e) {}
    }

    await carregarControlePesoStorage();
    initExcelTable();
    populateEvalSelect(); 
    ensureTestAddButton();
    ensureCalculadoraButton();
    ensurePesoButton();
    ensureGruposButton(); // Inicializa o novo botão flutuante
    ensureConvocacaoModalDom();
    ensurePrintStyles();
    initGruposFilter(); // Inicializa checkboxes da aba de grupos
}

let saveQueue = Promise.resolve();
async function saveToStorage() {
    const payload = { chave: 'principal', colunas: excelColumns, dados: excelData, atualizado_em: new Date().toISOString() };
    saveQueue = saveQueue.then(async () => {
        const { error } = await _supabase.from('sistema_config').upsert(payload, { onConflict: 'chave' });
        if (error) { console.error('Erro ao salvar no Supabase:', error); alert('Não foi possível salvar os dados no banco.'); return false; }
        return true;
    });
    return saveQueue;
}

function atualizarCabecalhoSistema() {
    const dateEl = document.querySelector('.date-display');
    if (dateEl) {
        const dataAtual = new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).format(new Date());
        dateEl.textContent = dataAtual;
    }

    const instagramEl = document.querySelector('.instagram-icon');
    if (instagramEl && !instagramEl.dataset.instagramReady) {
        instagramEl.dataset.instagramReady = '1';
        instagramEl.style.cursor = 'pointer';
        instagramEl.title = 'Abrir Instagram';
        instagramEl.addEventListener('click', () => {
            window.open('https://instagram.com/vinicius_bolonheze', '_blank', 'noopener,noreferrer');
        });
        instagramEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.open('https://instagram.com/vinicius_bolonheze', '_blank', 'noopener,noreferrer');
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", () => { atualizarCabecalhoSistema(); loadFromStorage(); });

/* === FUNÇÕES DE IMPRESSÃO / EXPORTAÇÃO === */
function ensurePrintStyles() {
    if (!document.getElementById('dynamic-print-style')) {
        const style = document.createElement('style');
        style.id = 'dynamic-print-style';
        style.innerHTML = `
            @media print {
                /* Oculta as demais telas, mas mantém o modal da ficha visível.
                   O seletor body > #fichaModal é intencionalmente mais específico
                   que a regra geral de impressão das fichas de treino. */
                body.printing-athlete > *:not(#fichaModal) { display: none !important; }
                body.printing-athlete > #fichaModal {
                    display: flex !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    min-height: 0 !important;
                    align-items: flex-start !important;
                    justify-content: center !important;
                    background: #fff !important;
                    z-index: 9999 !important;
                }
                body.printing-athlete #fichaModal { display: flex !important; }
                .modal-container { box-shadow: none !important; border: none !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
                .modal-header, .close-btn, .print-hide, button { display: none !important; }
                #fichaExportContent { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                #fichaExportContent .modal-footer ~ .modal-footer { display: none !important; }
                html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
                @page { size: portrait; margin: 10mm; }
            }
        `;
        document.head.appendChild(style);
    }
}


function onQtdGruposChange() {
    const selectQtd = document.getElementById('select-qtd-grupos');
    quantidadeGruposAtivos = parseInt(selectQtd.value) || 6;
    renderGruposScreen();
}


function shareFichaPDF() {
    const element = document.getElementById('fichaExportContent');
    if (!element) return;
    if (typeof html2pdf !== 'undefined') {
        const opt = { margin: 10, filename: 'ficha_do_atleta.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
        html2pdf().from(element).set(opt).outputPdf('blob').then((pdfBlob) => {
            const file = new File([pdfBlob], 'ficha_do_atleta.pdf', { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'Ficha do Atleta', text: 'Segue a ficha do atleta em PDF.' }).catch(err => console.log('Erro:', err));
            } else { html2pdf().from(element).set(opt).save(); }
        });
    } else { window.print(); }
}
function printFicha() {
    document.body.classList.add('printing-athlete');
    const cleanup = () => {
        document.body.classList.remove('printing-athlete');
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
    setTimeout(cleanup, 1500);
}

/* === NAVEGAÇÃO === */
function enterSystem() {
    document.getElementById('login-screen').classList.remove('active-screen');
    document.getElementById('home-screen').classList.add('active-screen');
    document.getElementById('main-nav').style.display = 'flex';
    document.getElementById('yellow-bar-nav').style.display = 'block';
}

function navigateTo(screenId, event) {
    if (screenId !== 'convocacao') { convocacaoSessaoAtiva = false; convocacaoCarregadaNaSessao = false; }
    if (screenId === 'convocacao') { openConvocacaoModal(); return; }

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active-screen');
        // O GERAR FICHAS coloca display:none inline em todas as telas.
        // Limpamos esse estilo para que a classe active-screen volte a funcionar.
        screen.style.display = '';
    });

    // A tela de fichas é exibida com display inline pelo GERAR FICHAS.
    // Ao navegar pelo menu, ela precisa ser escondida explicitamente;
    // caso contrário, permanece sobre as outras telas e bloqueia os cliques.
    const fichasTreinoScreen = document.getElementById('fichas-treino-screen');
    if (fichasTreinoScreen) {
        fichasTreinoScreen.style.display = 'none';
    }

    const fabCalc = document.getElementById('btn-calculadora-fab');
    if (fabCalc) fabCalc.style.display = (screenId === 'testes') ? 'flex' : 'none';
    const fabPeso = document.getElementById('btn-peso-pf-fab');
    if (fabPeso) fabPeso.style.display = (screenId === 'testes') ? 'flex' : 'none';
    const fabAdd = document.getElementById('btn-add-athlete-pf-fab');
    const fabGrupos = document.getElementById('btn-grupos-pf-fab');
    if (fabAdd) fabAdd.style.display = (screenId === 'testes') ? 'flex' : 'none';
    if (fabGrupos) fabGrupos.style.display = (screenId === 'testes') ? 'flex' : 'none';

    if (screenId === 'home') {
        document.getElementById('home-screen').classList.add('active-screen');
    } else if (screenId === 'excel-db') {
        document.getElementById('excel-db-screen').classList.add('active-screen');
        renderExcelTable();
    } else if (screenId === 'atletas') {
        document.getElementById('atletas-screen').classList.add('active-screen');
        renderAtletasScreen();
        if (event && event.target && event.target.classList.contains('nav-btn')) event.target.classList.add('active');
    } else if (screenId === 'testes') {
        document.getElementById('testes-screen').classList.add('active-screen');
        renderPfTable();
        if (event && event.target && event.target.classList.contains('nav-btn')) event.target.classList.add('active');
    } else if (screenId === 'grupos') {
        document.getElementById('grupos-screen').classList.add('active-screen');
        renderGruposScreen();
    } else {
        if (screenId === 'relatorios') { openRelatoriosModal(); return; }
        if (screenId === 'jogos') { openJogosProfessorModal(); return; }
        if (screenId === 'prancheta') {
            openPranchetaModal();
            return;
        }
        const genericScreen = document.getElementById('generic-screen');
        genericScreen.style.display = 'flex';
        genericScreen.classList.add('active-screen');
        const titles = { 'prancheta': 'Prancheta Tática Virtual', 'relatorios': 'Relatórios de Desempenho', 'jogos': 'Controle de Jogos' };
        document.getElementById('generic-title').innerText = titles[screenId] || 'Módulo em Desenvolvimento';
        if (event && event.target && event.target.classList.contains('nav-btn')) event.target.classList.add('active');
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => alert(`Erro: ${err.message}`));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
}

/* === FUNÇÕES AUXILIARES / EXCEL === */
function initExcelTable() {
    const headerRow = document.getElementById('excel-header-row');
    if (!headerRow) return;
    headerRow.innerHTML = '';
    const thNum = document.createElement('th'); thNum.textContent = '#'; headerRow.appendChild(thNum);
    excelColumns.forEach(col => { const th = document.createElement('th'); th.textContent = col; headerRow.appendChild(th); });
}

function convertExcelDate(value) {
    if (!value) return '';
    if (typeof value === 'string' && (value.includes('/') || value.includes('-'))) return value;
    let num = Number(value);
    if (!isNaN(num) && num > 1000 && num < 60000) {
        let utc_days = Math.floor(num - 25569);
        let date_info = new Date(utc_days * 86400 * 1000);
        return `${String(date_info.getUTCDate()).padStart(2, '0')}/${String(date_info.getUTCMonth() + 1).padStart(2, '0')}/${date_info.getUTCFullYear()}`;
    }
    return value;
}

function formatGordura(val) {
    if (val === undefined || val === null || val === '' || val === '-') return '-';
    let clean = String(val).replace('%', '').trim().replace(',', '.');
    let num = parseFloat(clean);
    if (isNaN(num)) return val;
    if (num > 0 && num <= 1) num = num * 100;
    return num.toFixed(2).replace('.', ',') + '%';
}

function renderExcelTable() {
    initExcelTable();
    const tbody = document.getElementById('excel-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    excelData.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        const tdNum = document.createElement('td');
        tdNum.textContent = rowIndex + 1; tdNum.style.backgroundColor = '#f2f2f2'; tdNum.style.fontWeight = 'bold';
        tr.appendChild(tdNum);
        excelColumns.forEach(col => {
            const td = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'text';
            let val = row[col] !== undefined && row[col] !== null ? row[col] : '';
            if (col.toLowerCase().includes('data') || col.toLowerCase().includes('nascimento')) val = convertExcelDate(val);
            input.value = val;
            input.onchange = (e) => { excelData[rowIndex][col] = e.target.value; saveToStorage(); };
            td.appendChild(input); tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

function addRowToExcel() {
    let newRow = {}; excelColumns.forEach(col => { newRow[col] = ''; });
    excelData.push(newRow); saveToStorage(); renderExcelTable();
}

function exportarBancoDadosXLSX() {
    if (typeof XLSX === 'undefined') {
        alert('A biblioteca do Excel não foi carregada.');
        return;
    }
    if (!excelData || excelData.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }

    // Usa a ordem atual das colunas do banco, sem alterar os títulos.
    const dadosParaExportar = excelData.map(row => {
        const novoRow = {};
        excelColumns.forEach(coluna => {
            novoRow[coluna] = row[coluna] !== undefined && row[coluna] !== null ? row[coluna] : '';
        });
        return novoRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar, { header: excelColumns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Banco de Dados');
    XLSX.writeFile(workbook, 'banco_de_dados_cfa_prosol.xlsx');
}

function importExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
            if (jsonData.length > 0) {
                excelColumns = Object.keys(jsonData[0]);
                excelData = jsonData; saveToStorage(); populateEvalSelect(); renderExcelTable();
                alert(`Importado com sucesso! ${jsonData.length} atletas carregados.`);
            }
        } catch (error) { alert(`Erro: ${error.message}`); }
    };
    reader.readAsArrayBuffer(file); event.target.value = '';
}

/* === FUNÇÕES GENÉRICAS E TELA DE ATLETAS MANTIDAS DO ORIGINAL === */
function openFichaAtleta(globalIndex) {
    if (globalIndex === null || globalIndex === undefined || !excelData[globalIndex]) {
        alert('Selecione um atleta na lista primeiro.'); return;
    }
    const row = excelData[globalIndex];
    function getVal(keys) {
        for (let key in row) {
            let kLow = key.toLowerCase();
            for (let target of keys) {
                if (kLow === target.toLowerCase() || kLow.includes(target.toLowerCase())) {
                    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key];
                }
            }
        }
        return '-';
    }
    let maxEvalNum = 1;
    for (let i = 1; i <= 20; i++) {
        let hasEvalData = false;
        for (let key in row) {
            let kLow = key.toLowerCase();
            if ((kLow === ('altura' + i) || kLow === ('peso' + i) || kLow === ('data' + i)) && row[key] && String(row[key]).trim() !== '-') { hasEvalData = true; break; }
        }
        if (hasEvalData) maxEvalNum = i;
    }
    const evalNum = maxEvalNum;
    function getEvalVal(baseNames) {
        for (let base of baseNames) {
            let candidates = [base + evalNum, base + '_' + evalNum];
            for (let cand of candidates) {
                for (let key in row) {
                    if (key.toLowerCase() === cand.toLowerCase()) {
                        if (row[key] && String(row[key]).trim() !== '-' && String(row[key]).trim() !== '') return row[key];
                    }
                }
            }
        }
        return '-';
    }
    const nome = getVal(['NOME COMPLETO', 'nome']) !== '-' ? getVal(['NOME COMPLETO', 'nome']) : (getVal(['APELIDO']) !== '-' ? getVal(['APELIDO']) : 'Sem Nome');
    const posicao = getVal(['Posição 1', 'posicao1', 'posição']);
    const nascimento = convertExcelDate(getVal(['Data de nascimento', 'nascimento']));
    const cidade = getVal(['CIDADE', 'cidade']);
    const foto = getVal(['Foto', 'foto']);
    const altura = getEvalVal(['Altura', 'altura']);
    const peso = getEvalVal(['peso', 'peso']);
    const alturapredita = getEvalVal(['alturapredita']);
    const subescapular = getEvalVal(['Dobras1', 'dobras1']);
    const triciptal = getEvalVal(['Dobras2', 'dobras2']);
    const supraIliaca = getEvalVal(['Dobras3', 'dobras3']);
    const abdominal = getEvalVal(['Dobras4', 'dobras4']);
    const gordura = formatGordura(getEvalVal(['PercentualGordura', 'gordura']));
    const dataAvaliacao = convertExcelDate(getEvalVal(['Data', 'data']));
    
    document.getElementById('fichaModalBody').innerHTML = `
        <div id="fichaExportContent" style="background: #fff; padding: 10px;">
            <div class="player-profile">
                <img src="${(foto && foto !== '-') ? foto : 'https://via.placeholder.com/110x140?text=Sem+Foto'}" class="player-photo">
                <div class="player-details">
                    <h3>${nome}</h3><p><strong>Posição:</strong> ${posicao}</p><p><strong>Nascimento:</strong> ${nascimento}</p><p><strong>Cidade:</strong> ${cidade !== '-' ? cidade : 'Apucarana'}</p>
                </div>
            </div>
            <div class="metrics-section">
                <h4>MEDIDAS ANTROPOMÉTRICAS ${dataAvaliacao !== '-' ? '(Avaliação ' + evalNum + ': ' + dataAvaliacao + ')' : ''}</h4>
                <div class="metrics-grid">
                    <div class="metric-item"><strong>Altura:</strong> ${altura !== '-' ? altura + ' m' : '-'}</div>
                    <div class="metric-item"><strong>Subescapular:</strong> ${subescapular !== '-' ? subescapular + ' cm' : '-'}</div>
                    <div class="metric-item"><strong>Massa Corporal:</strong> ${peso !== '-' ? peso + ' Kg' : '-'}</div>
                    <div class="metric-item"><strong>Triciptal:</strong> ${triciptal !== '-' ? triciptal + ' cm' : '-'}</div>
                    <div class="metric-item"><strong>Supra Ilíaca:</strong> ${supraIliaca !== '-' ? supraIliaca + ' cm' : '-'}</div>
                    <div class="metric-item"><strong>Abdominal:</strong> ${abdominal !== '-' ? abdominal + ' cm' : '-'}</div>
                    <div class="metric-item"><strong>% Gordura:</strong> ${gordura}</div>
                </div>
                ${alturapredita !== '-' ? `<div class="predicted-height">Altura Predita: ${alturapredita} m</div>` : ''}
            </div>
            <div class="modal-footer" style="margin-top: 15px;"><p><strong>CEO Enzo Gardini:</strong> (43) 98807-1610</p><p><strong>Instagram:</strong> @cfaprosol</p></div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;" class="no-print">
            <button onclick="shareFichaPDF()" style="flex: 1; padding: 12px; background: #0984e3; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Compartilhar PDF</button>
            <button onclick="printFicha()" style="flex: 1; padding: 12px; background: #6c5ce7; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Imprimir</button>
        </div>
    `;
    document.getElementById('fichaModal').style.display = 'flex';
}
function closeModal() { document.getElementById('fichaModal').style.display = 'none'; }
window.onclick = function(event) { if (event.target === document.getElementById('fichaModal')) closeModal(); }

function renderAtletasScreen() {
    const selectedYears = Array.from(document.querySelectorAll('.year-chk:checked')).map(chk => chk.value);
    const posLists = { 'goleiros': document.getElementById('list-goleiros'), 'zagueiros': document.getElementById('list-zagueiros'), 'laterais': document.getElementById('list-laterais'), 'volantes': document.getElementById('list-volantes'), 'meias': document.getElementById('list-meias'), 'atacantes': document.getElementById('list-atacantes'), 'extremos': document.getElementById('list-extremos') };
    for (let key in posLists) { if (posLists[key]) posLists[key].innerHTML = ''; }

    excelData.forEach((row, globalIndex) => {
        let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano'); anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';
        if (selectedYears.length > 0 && !selectedYears.includes(anoAtleta)) return;
        
        let nomeExibicao = Object.keys(row).find(k => k.toLowerCase().includes('apelido')); nomeExibicao = nomeExibicao && row[nomeExibicao] ? row[nomeExibicao] : '';
        if (!nomeExibicao) { let nm = Object.keys(row).find(k => k.toLowerCase().includes('nome')); nomeExibicao = nm && row[nm] ? row[nm] : 'Sem Nome'; }
        
        let posicao = Object.keys(row).find(k => k.toLowerCase().includes('posição') || k.toLowerCase().includes('posicao'));
        posicao = posicao ? String(row[posicao]).toLowerCase() : '';
        
        let targetBox = 'meias';
        if (posicao.includes('goleiro')) targetBox = 'goleiros'; else if (posicao.includes('zagueiro')) targetBox = 'zagueiros'; else if (posicao.includes('lateral')) targetBox = 'laterais'; else if (posicao.includes('volante')) targetBox = 'volantes'; else if (posicao.includes('atacante')) targetBox = 'atacantes'; else if (posicao.includes('extremo') || posicao.includes('ponta')) targetBox = 'extremos';

        // 1. Verifica se existe anotação preenchida
        let temAnotacao = row['Anotacoes'] && String(row['Anotacoes']).trim() !== '';
        let iconeFicha = temAnotacao ? `
            <svg width="13" height="15" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-2px; margin-left:35px;" title="Atleta possui anotações">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" fill="#ccc"></rect>
                <line x1="9" y1="12" x2="15" y2="12"></line>
                <line x1="9" y1="16" x2="13" y2="16"></line>
            </svg>
        ` : '';

        // 2. NOVO: Verifica se o atleta está lesionado ('Lesao' igual a 'sim')
        let chaveLesao = Object.keys(row).find(k => k.toLowerCase() === 'lesao');
        let valorLesao = chaveLesao ? String(row[chaveLesao]).toLowerCase().trim() : '';
        let estaLesionado = valorLesao === 'sim';

        let iconeLesao = estaLesionado ? `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#d63031" style="display:inline-block; vertical-align:-2px; margin-left:4px;" title="Atleta Lesionado">
                <rect x="9" y="2" width="6" height="20" rx="1" fill="#d63031"></rect>
                <rect x="2" y="9" width="20" height="6" rx="1" fill="#d63031"></rect>
            </svg>
        ` : '';

        // 3. Verifica se o atleta está marcado com cartão vermelho
        let chaveCartaoVermelho = Object.keys(row).find(k => ['cartaovermelho','cartao vermelho','cartão vermelho'].includes(k.toLowerCase().replace(/_/g, ' ').trim()) || k.toLowerCase().replace(/\s+/g,'') === 'cartaovermelho');
        let valorCartaoVermelho = chaveCartaoVermelho ? String(row[chaveCartaoVermelho]).toLowerCase().trim() : '';
        let temCartaoVermelho = valorCartaoVermelho === 'sim';

        let iconeCartaoVermelho = temCartaoVermelho ? `
            <svg width="13" height="16" viewBox="0 0 18 24" style="display:inline-block; vertical-align:-3px; margin-left:4px;" title="Cartão Vermelho">
                <rect x="3" y="2" width="12" height="20" rx="2" fill="#d63031" stroke="#7a0000" stroke-width="1.5"></rect>
            </svg>
        ` : '';

        const itemDiv = document.createElement('div');
        itemDiv.className = 'athlete-item' + (selectedAthleteIndex === globalIndex ? ' selected' : '');
        if(selectedAthleteIndex === globalIndex) { itemDiv.style.backgroundColor = '#0984e3'; itemDiv.style.color = '#fff'; }
        
        // 4. Insere o nome junto com os ícones (ficha, lesão e/ou cartão vermelho)
        itemDiv.innerHTML = `<span>${nomeExibicao} ${iconeFicha} ${iconeLesao} ${iconeCartaoVermelho}</span> <span>${anoAtleta}</span>`;
        
        itemDiv.onclick = () => { selectedAthleteIndex = globalIndex; renderAtletasScreen(); };
        if (posLists[targetBox]) posLists[targetBox].appendChild(itemDiv);
    });
}

function deleteSelectedAthlete() {
    if (selectedAthleteIndex === null) { alert('Selecione um atleta na lista.'); return; }
    if (confirm('Deseja realmente excluir o atleta?')) { excelData.splice(selectedAthleteIndex, 1); selectedAthleteIndex = null; saveToStorage(); renderAtletasScreen(); }
}
function setAddAthleteModalMode(mode) {
    const modal = document.getElementById('add-athlete-modal');
    if (!modal) return;
    const titleSpan = modal.querySelector('.vba-modal-title span:first-child');
    const submitBtn = modal.querySelector('.vba-btn-salvar');
    if (titleSpan) titleSpan.textContent = mode === 'edit' ? 'Editar Atleta - CFA Prosol' : 'Adicionar Atletas - CFA Prosol';
    if (submitBtn) submitBtn.textContent = mode === 'edit' ? 'Atualizar' : 'Salvar';
}
function valorCampoAtleta(row, termos) {
    const chave = Object.keys(row || {}).find(k => termos.some(t => String(k).toLowerCase().trim() === String(t).toLowerCase().trim() || String(k).toLowerCase().includes(String(t).toLowerCase())));
    return chave && row[chave] !== undefined && row[chave] !== null ? row[chave] : '';
}
function openAddAthleteModal() {
    editingAthleteIndex = null;
    uploadedPhotoBase64 = '';
    const form = document.getElementById('athlete-form');
    if (form) form.reset();
    const fileLabel = document.getElementById('file-label-text');
    if (fileLabel) fileLabel.textContent = 'Selecionar Foto';
    setAddAthleteModalMode('add');
    document.getElementById('add-athlete-modal').style.display = 'flex';
}
function openEditAthleteModal() {
    if (selectedAthleteIndex === null || selectedAthleteIndex === undefined || !excelData[selectedAthleteIndex]) {
        alert('Selecione um atleta na lista primeiro.');
        return;
    }
    editingAthleteIndex = selectedAthleteIndex;
    const row = excelData[editingAthleteIndex];
    const form = document.getElementById('athlete-form');
    if (form) form.reset();
    document.getElementById('add-ano').value = valorCampoAtleta(row, ['Ano']) || '2010';
    document.getElementById('add-nome').value = valorCampoAtleta(row, ['NOME COMPLETO', 'nome completo', 'nome']);
    document.getElementById('add-apelido').value = valorCampoAtleta(row, ['APELIDO', 'apelido']);
    document.getElementById('add-nascimento').value = convertExcelDate(valorCampoAtleta(row, ['Data de nascimento', 'nascimento']));
    document.getElementById('add-posicao').value = valorCampoAtleta(row, ['Posição 1', 'posicao 1', 'posição', 'posicao']) || 'Meia';
    document.getElementById('add-cidade').value = valorCampoAtleta(row, ['CIDADE', 'cidade']);
    document.getElementById('add-contato').value = valorCampoAtleta(row, ['Contato', 'contato']);
    document.getElementById('add-rg').value = valorCampoAtleta(row, ['RG', 'rg']);
    uploadedPhotoBase64 = valorCampoAtleta(row, ['Foto', 'foto', 'imagem']);
    const fileLabel = document.getElementById('file-label-text');
    if (fileLabel) fileLabel.textContent = uploadedPhotoBase64 ? 'Foto atual mantida' : 'Selecionar Foto';
    const fileInput = document.getElementById('add-foto');
    if (fileInput) fileInput.value = '';
    setAddAthleteModalMode('edit');
    document.getElementById('add-athlete-modal').style.display = 'flex';
}
function closeAddAthleteModal() {
    document.getElementById('add-athlete-modal').style.display = 'none';
    editingAthleteIndex = null;
    uploadedPhotoBase64 = '';
    setAddAthleteModalMode('add');
}
function previewAthletePhoto(input) {
    if (input.files && input.files[0]) { document.getElementById('file-label-text').textContent = input.files[0].name; const reader = new FileReader(); reader.onload = function(e) { uploadedPhotoBase64 = e.target.result; }; reader.readAsDataURL(input.files[0]); }
}
function saveNewAthlete(event) {
    event.preventDefault();
    const isEdit = editingAthleteIndex !== null && editingAthleteIndex !== undefined && excelData[editingAthleteIndex];
    let row;
    if (isEdit) {
        row = excelData[editingAthleteIndex];
    } else {
        row = {};
        excelColumns.forEach(col => { row[col] = ''; });
    }
    row['Ano'] = document.getElementById('add-ano').value;
    row['NOME COMPLETO'] = document.getElementById('add-nome').value;
    row['APELIDO'] = document.getElementById('add-apelido').value;
    row['Data de nascimento'] = document.getElementById('add-nascimento').value;
    row['Posição 1'] = document.getElementById('add-posicao').value;
    row['CIDADE'] = document.getElementById('add-cidade').value;
    row['Contato'] = document.getElementById('add-contato').value;
    row['RG'] = document.getElementById('add-rg').value;
    row['Foto'] = uploadedPhotoBase64 || row['Foto'] || '';
    if (!isEdit) {
        excelData.push(row);
        selectedAthleteIndex = excelData.length - 1;
    }
    saveToStorage();
    closeAddAthleteModal();
    if (typeof renderAtletasScreen === 'function') renderAtletasScreen();
    if (typeof renderExcelTable === 'function') renderExcelTable();
    alert(isEdit ? 'Atleta atualizado com sucesso!' : 'Salvo com sucesso!');
}

/* === TESTES FÍSICOS === */
function switchPfTab(tabName, eventObj) {
    currentPfTab = tabName;
    document.querySelectorAll('.pf-tab').forEach(t => t.classList.remove('active'));
    if(eventObj) eventObj.target.classList.add('active');
    renderPfTable();
}

function ensureCalculadoraButton(){let b=document.getElementById('btn-calculadora-fab');if(!b){b=document.createElement('div');b.id='btn-calculadora-fab';b.textContent='Calculadora';b.style.cssText='position:fixed;bottom:180px;right:30px;width:65px;height:65px;border-radius:50%;background:#f39c12;color:#fff;display:none;align-items:center;justify-content:center;box-shadow:0 4px 12px #0006;cursor:pointer;font-weight:bold;font-size:11px;z-index:9999;text-align:center';b.onclick=abrirCalculadoraAltura;document.body.appendChild(b);}}
function abrirCalculadoraAltura(){let m=document.getElementById('calculadora-altura-modal');if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='calculadora-altura-modal';document.body.appendChild(m)}m.innerHTML='<div class="calc-altura-card"><h3>Calculadora de Altura Predita</h3><label>Peso (kg)<input id="calc-peso" type="number" step="0.1"></label><label>Altura (m)<input id="calc-altura" type="number" step="0.01"></label><label>Data de nascimento<input id="calc-nasc" type="date"></label><label>Data da avaliação<input id="calc-aval" type="date"></label><label>Altura sentado (cm)<input id="calc-sentado" type="number" step="0.1"></label><div id="calc-resultado">Preencha os dados para calcular.</div><button onclick="calcularAlturaCalculadora()">Calcular</button><button onclick="document.getElementById(\'calculadora-altura-modal\').style.display=\'none\'">Fechar</button></div>';m.style.display='flex';document.getElementById('calc-aval').value=new Date().toISOString().slice(0,10)}
function calcularAlturaCalculadora(){const p=parseFloat(document.getElementById('calc-peso').value),h=parseFloat(document.getElementById('calc-altura').value),s=parseFloat(document.getElementById('calc-sentado').value),n=new Date(document.getElementById('calc-nasc').value),a=new Date(document.getElementById('calc-aval').value);if(!p||!h||!s||isNaN(n)||isNaN(a))return alert('Preencha todos os campos.');const idade=(a-n)/86400000/365;const r=alturaPreditaCalculada(idade,p,h,s);document.getElementById('calc-resultado').innerHTML=`MO: ${r.mo.toFixed(2).replace('.',',')}<br>Categoria: ${r.categoria.toUpperCase()}<br><strong>Altura predita: ${(Math.floor(r.valor)/100).toFixed(2).replace('.',',')} m</strong>`}

function ensureTestAddButton() {
    let fab = document.getElementById('btn-add-athlete-pf-fab');
    if (!fab) {
        fab = document.createElement('div'); fab.id = 'btn-add-athlete-pf-fab'; fab.innerHTML = '+ add';
        fab.style.cssText = 'position:fixed; bottom:30px; right:30px; width:65px; height:65px; border-radius:50%; background-color:#2ed573; color:#fff; display:none; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.4); cursor:pointer; font-weight:bold; font-size:13px; z-index:9999; user-select:none; transition:0.2s;';
        fab.onmouseover = () => { fab.style.transform = 'scale(1.1)'; fab.style.backgroundColor = '#26af5f'; };
        fab.onmouseout = () => { fab.style.transform = 'scale(1.0)'; fab.style.backgroundColor = '#2ed573'; };
        fab.onclick = openAddAthleteModal; document.body.appendChild(fab);
    }
}

// NOVO: Criar botão flutuante para Grupos
function ensureGruposButton() {
    let fab = document.getElementById('btn-grupos-pf-fab');
    if (!fab) {
        fab = document.createElement('div'); fab.id = 'btn-grupos-pf-fab'; fab.innerHTML = 'Grupos';
        // Posicionado um pouco acima do botão +add (bottom: 105px)
        fab.style.cssText = 'position:fixed; bottom:105px; right:30px; width:65px; height:65px; border-radius:50%; background-color:#316ac5; color:#fff; display:none; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.4); cursor:pointer; font-weight:bold; font-size:12px; z-index:9999; user-select:none; transition:0.2s;';
        fab.onmouseover = () => { fab.style.transform = 'scale(1.1)'; fab.style.backgroundColor = '#214a8a'; };
        fab.onmouseout = () => { fab.style.transform = 'scale(1.0)'; fab.style.backgroundColor = '#316ac5'; };
        fab.onclick = () => navigateTo('grupos'); 
        document.body.appendChild(fab);
    }
}

function populateEvalSelect() {
    let maxEval = 1;
    excelColumns.forEach(col => { let m = col.match(/^Data(\d+)$/i); if (m && parseInt(m[1]) > maxEval) maxEval = parseInt(m[1]); });
    const evalSelect = document.getElementById('pf-eval-select');
    if (evalSelect) {
        let currentVal = evalSelect.value; evalSelect.innerHTML = '';
        for (let i = 1; i <= maxEval; i++) {
            const opt = document.createElement('option'); opt.value = i; opt.textContent = 'Avaliação ' + i; evalSelect.appendChild(opt);
        }
        evalSelect.value = (currentVal && currentVal <= maxEval) ? currentVal : maxEval;
    }
}

function addNewEvaluation() {
    let maxEval = 1; excelColumns.forEach(c => { let m = c.match(/^Data(\d+)$/i); if (m && parseInt(m[1]) > maxEval) maxEval = parseInt(m[1]); });
    let newEval = maxEval + 1;
    let newCols = ['AVALIAÇÃO', 'Data', 'Altura', 'alturasentado', 'peso', 'Dobras1_', 'Dobras2_', 'Dobras3_', 'Dobras4_', 'PercentualGordura', 'alturapredita', 'nivel', 'distancia', 'Salto1_', 'Salto2_', 'Salto3_', 'MelhorSalto', 'aceleração1_', 'velocidade1_', 'aceleração2_', 'velocidade2_', 'aceleração3_', 'velocidade3_', 'aceleração4_', 'velocidade4_', 'aceleração5_', 'velocidade5_', 'aceleração6_', 'velocidade6_', 'aceleração7_', 'velocidade7_', 'Aceleraçãofinal', 'Velocidadefinal', 'Volta1_', 'Volta2_', 'Agilidade'].map(c => c + newEval);
    newCols.forEach(c => { if (!excelColumns.includes(c)) excelColumns.push(c); });
    excelData.forEach(row => { newCols.forEach(c => { if (row[c] === undefined) row[c] = ''; }); });
    saveToStorage(); populateEvalSelect(); document.getElementById('pf-eval-select').value = newEval; renderPfTable(); alert('Avaliação ' + newEval + ' adicionada!');
}

function deleteCurrentEvaluation() {
    const evalSelect = document.getElementById('pf-eval-select');
    if (!evalSelect) return;
    let currentEval = parseInt(evalSelect.value);
    let maxEval = 1; excelColumns.forEach(c => { let m = c.match(/^Data(\d+)$/i); if (m && parseInt(m[1]) > maxEval) maxEval = parseInt(m[1]); });
    if (currentEval !== maxEval || currentEval === 1) { alert('Só pode apagar a última avaliação (se maior que 1).'); return; }
    if (confirm('Deseja apagar a Avaliação ' + currentEval + '?')) {
        let colsToRemove = excelColumns.filter(c => c.toLowerCase() === ('avaliação' + currentEval) || c.toLowerCase().endsWith(currentEval) || c.toLowerCase().endsWith('_' + currentEval)).filter(c => c !== 'Ano' && c !== 'NOME COMPLETO');
        excelColumns = excelColumns.filter(c => !colsToRemove.includes(c));
        excelData.forEach(row => { colsToRemove.forEach(c => { delete row[c]; }); });
        saveToStorage(); populateEvalSelect(); evalSelect.value = maxEval - 1; renderPfTable(); alert('Apagada.');
    }
}

function valorColunaExata(row, nome) {
    const chave = Object.keys(row).find(k => k.toLowerCase() === nome.toLowerCase());
    return chave ? row[chave] : '';
}
function valorAvaliacao(row, base, evalNum) {
    const nomes = [base + evalNum, base + '_' + evalNum];
    const chave = Object.keys(row).find(k => nomes.some(n => k.toLowerCase() === n.toLowerCase()));
    return chave ? row[chave] : '';
}
function calcularIdadeAvaliacao(nascimento, avaliacao) {
    const parseData = v => {
        if (!v) return null;
        const m = String(v).match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
        if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
        const d = new Date(v); return isNaN(d) ? null : d;
    };
    const nasc = parseData(nascimento), aval = parseData(avaliacao);
    if (!nasc || !aval) return '-';
    return ((aval - nasc) / 86400000 / 365).toFixed(1).replace('.', ',');
}
const tabelaAlturaCrescer = {
 tardio:[[-2,25.77],[-1.8,25.77],[-1.6,23.74],[-1.4,23.74],[-1.2,22.63],[-1,20.22],[-.8,19.06],[-.6,17.68],[-.4,16.31],[-.2,14.76],[0,13.05],[.2,11.32],[.4,9.71],[.6,8.27],[.8,6.94],[1,5.7],[1.2,4.54],[1.4,3.51],[1.6,2.64],[1.8,1.82],[2,1.35],[2.2,.91],[2.4,.58],[2.6,.32],[2.8,.13],[3,0]],
 medio:[[-2,30.06],[-1.8,29.03],[-1.6,27.95],[-1.4,26.83],[-1.2,25.63],[-1,24.33],[-.8,22.99],[-.6,21.51],[-.4,19.88],[-.2,18.09],[0,16.16],[.2,14.12],[.4,12.35],[.6,10.65],[.8,9.12],[1,7.79],[1.2,6.59],[1.4,5.58],[1.6,4.62],[1.8,3.8],[2,3.08],[2.2,2.48],[2.4,1.96],[2.6,1.52],[2.8,1.16],[3,.87]],
 cedo:[[-2,33.8],[-1.8,32.62],[-1.6,31.44],[-1.4,30.23],[-1.2,29.05],[-1,27.66],[-.8,26.24],[-.6,24.68],[-.4,22.96],[-.2,21.07],[0,19.04],[.2,16.96],[.4,14.92],[.6,13.01],[.8,11.26],[1,9.7],[1.2,8.33],[1.4,7.11],[1.6,6.04],[1.8,5.1],[2,4.26],[2.2,3.52],[2.4,2.86],[2.6,2.29],[2.8,1.78],[3,1.34]]
};
function alturaPreditaCalculada(idade,peso,alturaM,sentadoCm){
 const alturaCm=alturaM*100, pernas=alturaCm-sentadoCm;
 const mo=-9.236+(0.0002708*pernas*sentadoCm)-(0.001663*idade*pernas)+(0.007216*idade*sentadoCm)+(0.02292*(peso/alturaCm));
 const maturidade=idade-mo; const categoria=maturidade<=13?'cedo':maturidade<=14.9?'medio':'tardio'; const tabela=tabelaAlturaCrescer[categoria];
 let a=tabela[0],b=tabela[tabela.length-1]; for(let i=1;i<tabela.length;i++){if(mo<=tabela[i][0]){a=tabela[i-1];b=tabela[i];break;}}
 const crescer=a[1]+(mo-a[0])*(b[1]-a[1])/(b[0]-a[0]); return {mo,maturidade,categoria,valor:alturaCm+crescer};
}
function normalizarTextoOrdenacaoPf(valor){
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function getPfAnoOrdenacao(row){
    let ano = String(valorColunaExata(row, 'Ano') || '').trim();
    if (!ano) {
        const nasc = convertExcelDate(valorColunaExata(row, 'Data de nascimento') || '');
        const m = String(nasc).match(/(\d{4})$/);
        if (m) ano = m[1];
    }
    const n = parseInt(ano, 10);
    return isNaN(n) ? 9999 : n;
}
function getPfNomeOrdenacao(row){
    let nome = valorColunaExata(row, 'NOME COMPLETO') || valorColunaExata(row, 'APELIDO') || '';
    if (!nome) {
        const chaveNome = Object.keys(row || {}).find(k => k.toLowerCase().includes('nome'));
        if (chaveNome) nome = row[chaveNome];
    }
    return normalizarTextoOrdenacaoPf(nome);
}
function getPfSortedEntries(selectedYear){
    return (excelData || []).map((row, rowIndex) => ({ row, rowIndex }))
        .filter(({ row }) => {
            const ano = String(valorColunaExata(row, 'Ano') || '').trim();
            return selectedYear === 'todos' || ano === selectedYear;
        })
        .sort((a, b) => {
            const anoA = getPfAnoOrdenacao(a.row);
            const anoB = getPfAnoOrdenacao(b.row);
            if (anoA !== anoB) return anoA - anoB;
            return getPfNomeOrdenacao(a.row).localeCompare(getPfNomeOrdenacao(b.row), 'pt-BR');
        });
}

function renderTabelaAntropometrica(evalNum, selectedYear, headerRow, tbody) {
    const colunas = [
        ['Ano','ano'], ['NOME COMPLETO','nome'], ['DATA NASCIMENTO','nascimento'],
        ['DATA AVALIAÇÃO','data'], ['IDADE','idade'], ['ALTURA','altura'],
        ['ALT. SENTADO','sentado'], ['ALTURA PREDITA','predita'], ['PESO','peso'],
        ['SBE','sbe'], ['TRI','tri'], ['SPI','spi'], ['ABD','abd'],
        ['SOMA DOBRAS','soma'], ['% DE GORDURA','gordura']
    ];
    colunas.forEach(c => { const th=document.createElement('th'); th.textContent=c[0]; if(c[1]==='predita'||c[1]==='idade'||c[1]==='soma'||c[1]==='gordura') th.style.color='#168a32'; headerRow.appendChild(th); });
    getPfSortedEntries(selectedYear).forEach(({row,rowIndex})=>{
        const ano=String(valorColunaExata(row,'Ano')||'').trim();
        const nascimento=convertExcelDate(valorColunaExata(row,'Data de nascimento'));
        const dataAval=convertExcelDate(valorAvaliacao(row,'Data',evalNum));
        const nums=['Dobras1_','Dobras2_','Dobras3_','Dobras4_'].map(b=>parseFloat(String(valorAvaliacao(row,b,evalNum)).replace(',','.'))||0);
        const soma=nums.reduce((a,b)=>a+b,0);
        const gordura=((soma*0.153+5.783)/100);
        const gorduraTexto=(gordura*100).toFixed(2).replace('.',',')+'%';
        const gorduraKey='PercentualGordura'+evalNum;
        const alturaPreditaKey='alturapredita'+evalNum;
        const calculoPredita=alturaPreditaCalculada(
            parseFloat(calcularIdadeAvaliacao(nascimento,dataAval).replace(',','.')) || 0,
            parseFloat(String(valorAvaliacao(row,'peso',evalNum)).replace(',','.')) || 0,
            parseFloat(String(valorAvaliacao(row,'Altura',evalNum)).replace(',','.')) || 0,
            parseFloat(String(valorAvaliacao(row,'alturasentado',evalNum)).replace(',','.')) || 0
        );
        if (calculoPredita.valor) row[alturaPreditaKey]=(Math.floor(calculoPredita.valor)/100).toFixed(2);
        row[gorduraKey]=gordura;
        if (!excelColumns.includes(gorduraKey)) excelColumns.push(gorduraKey);
        if (!excelColumns.includes(alturaPreditaKey)) excelColumns.push(alturaPreditaKey);
        const valores={ano,nome:valorColunaExata(row,'NOME COMPLETO'),nascimento,data:dataAval,idade:calcularIdadeAvaliacao(nascimento,dataAval),altura:valorAvaliacao(row,'Altura',evalNum),sentado:valorAvaliacao(row,'alturasentado',evalNum),predita:(()=>{const r=alturaPreditaCalculada(calcularIdadeAvaliacao(nascimento,dataAval).replace(',','.'),parseFloat(String(valorAvaliacao(row,'peso',evalNum)).replace(',','.'))||0,parseFloat(String(valorAvaliacao(row,'Altura',evalNum)).replace(',','.'))||0,parseFloat(String(valorAvaliacao(row,'alturasentado',evalNum)).replace(',','.'))||0);return r.valor?(Math.floor(r.valor)/100).toFixed(2).replace('.',',')+' m':'-'})(),peso:valorAvaliacao(row,'peso',evalNum),sbe:nums[0]||'',tri:nums[1]||'',spi:nums[2]||'',abd:nums[3]||'',soma:soma ? soma.toFixed(1).replace('.',',') : '',gordura:gorduraTexto};
        const tr=document.createElement('tr');
        colunas.forEach((c,i)=>{const td=document.createElement('td'), key=c[1], fixed=['idade','predita','soma','gordura'].includes(key); if(key==='ano'||key==='nome'||key==='nascimento'){td.textContent=valores[key];td.style.background='#f4f6f7';}else if(fixed){td.textContent=valores[key];td.style.background='#e8f5e9';td.style.fontWeight='bold';}else{const input=document.createElement('input');input.type='text';input.value=valores[key];input.onchange=e=>{let base={data:'Data',altura:'Altura',sentado:'alturasentado',peso:'peso',sbe:'Dobras1_',tri:'Dobras2_',spi:'Dobras3_',abd:'Dobras4_'}[key];if(base){const k=base+evalNum;excelData[rowIndex][k]=e.target.value;renderPfTable();saveToStorage();}};td.appendChild(input);}tr.appendChild(td);}); tbody.appendChild(tr);
    });
}

function distanciaNivelResistencia(valor){
 const n=parseFloat(String(valor).replace(',', '.')); if(isNaN(n)) return '';
 const tabela={9.1:80,11.1:120,11.2:160,12.1:200,12.2:240,12.3:280,13.1:320,13.2:360,13.3:400,14.1:480,14.3:560,14.4:600,14.5:640,14.6:680,14.7:720,14.8:760,15.1:800,15.2:840,15.3:880,15.4:920,15.5:960,15.6:1000,15.7:1040,15.8:1080,16.1:1120,16.2:1160,16.3:1200,16.4:1240,16.5:1280,16.6:1320,16.7:1360,16.8:1400,17.1:1440,17.2:1480,17.3:1520,17.4:1560,17.5:1600,17.6:1640,17.7:1680,17.8:1720,18.1:1760,18.2:1800,18.3:1840,18.4:1880,18.5:1920,18.6:1960,18.7:2000,18.8:2040,19.1:2080,19.2:2120,19.3:2160,19.4:2200,19.5:2240,19.6:2280,19.7:2320,19.8:2360,20.1:2400,20.2:2440,20.3:2480,20.4:2520,20.5:2560,20.6:2600,20.7:2640,20.8:2680,21.1:2720,21.2:2760,21.3:2800,21.4:2840,21.5:2880,21.6:2920,21.7:2960,21.8:3000,22.1:3040,22.2:3080,22.3:3120,22.4:3160,22.5:3200,22.6:3240,22.7:3280,22.8:3320,23.1:3360,23.2:3400,23.3:3440,23.4:3480,23.5:3520,23.6:3560,23.7:3600,23.8:3640}; return tabela[Math.round(n*10)/10] ?? '';
}
function renderTabelaResistencia(evalNum, selectedYear, headerRow, tbody){
 ['Ano','NOME COMPLETO','DATA NASCIMENTO','DATA AVALIAÇÃO','NÍVEL','DISTÂNCIA'].forEach(x=>{const th=document.createElement('th');th.textContent=x;headerRow.appendChild(th)});
 getPfSortedEntries(selectedYear).forEach(({row,rowIndex})=>{let ano=String(valorColunaExata(row,'Ano')||'').trim();const tr=document.createElement('tr');const vals=[ano,valorColunaExata(row,'NOME COMPLETO'),convertExcelDate(valorColunaExata(row,'Data de nascimento')),convertExcelDate(valorAvaliacao(row,'Data',evalNum)),valorAvaliacao(row,'nivel',evalNum),''];vals[5]=distanciaNivelResistencia(vals[4]);vals.forEach((v,i)=>{const td=document.createElement('td');if(i<4)td.textContent=v;else if(i===4){const inp=document.createElement('input');inp.value=v;inp.onchange=e=>{row['nivel'+evalNum]=e.target.value;row['distancia'+evalNum]=distanciaNivelResistencia(e.target.value);saveToStorage();renderPfTable()};td.appendChild(inp)}else{td.textContent=v;td.style.background='#e8f5e9';td.style.fontWeight='bold'}tr.appendChild(td)});tbody.appendChild(tr)})}

function renderPfTable() {
    const headerRow = document.getElementById('pf-header-row'); const tbody = document.getElementById('pf-tbody');
    if (!headerRow || !tbody) return; headerRow.innerHTML = ''; tbody.innerHTML = '';
    const evalNum = document.getElementById('pf-eval-select') ? document.getElementById('pf-eval-select').value : '1';
    const selectedYear = document.getElementById('pf-year-select') ? document.getElementById('pf-year-select').value : 'todos';
    if (currentPfTab === 'antropometricas') { renderTabelaAntropometrica(evalNum, selectedYear, headerRow, tbody); return; }
    if (currentPfTab === 'resistencia') { renderTabelaResistencia(evalNum, selectedYear, headerRow, tbody); return; }

    let baseCols = [];
    if (currentPfTab === 'antropometricas') baseCols = ['Altura', 'alturapredita', 'alturasentado', 'peso', 'Dobras1_', 'Dobras2_', 'Dobras3_', 'Dobras4_'];
    else if (currentPfTab === 'resistencia') baseCols = ['nivel', 'distancia'];
    else if (currentPfTab === 'potencia') baseCols = ['Salto1_', 'Salto2_', 'Salto3_', 'MelhorSalto'];
    else if (currentPfTab === 'velocidade') baseCols = ['Aceleraçãofinal', 'Velocidadefinal', 'aceleração1_', 'velocidade1_', 'aceleração2_', 'velocidade2_', 'aceleração3_', 'velocidade3_', 'aceleração4_', 'velocidade4_', 'aceleração5_', 'velocidade5_', 'aceleração6_', 'velocidade6_', 'aceleração7_', 'velocidade7_'];
    else if (currentPfTab === 'agilidade') baseCols = ['Volta1_', 'Volta2_', 'Agilidade'];

    let colsToDisplay = ['Ano', 'NOME COMPLETO', 'Data de nascimento', 'Data' + evalNum];
    baseCols.forEach(col => colsToDisplay.push(col + evalNum));

    colsToDisplay.forEach((col) => {
        const th = document.createElement('th'); let label = col; let cleanCol = col.replace(evalNum, '').replace('_', '');
        if (col === 'Data de nascimento') label = 'DATA NASCIMENTO'; else if (col.startsWith('Data')) label = 'DATA AVALIAÇÃO'; else if (cleanCol === 'Altura') label = 'ALTURA'; else if (cleanCol === 'alturapredita') { label = 'ALTURA PREDITA'; th.style.color = '#4cd137'; } else if (cleanCol === 'alturasentado') label = 'ALT. SENTADO'; else if (cleanCol === 'peso') label = 'PESO'; else if (cleanCol === 'Dobras1') label = 'SBE'; else if (cleanCol === 'Dobras2') label = 'TRI'; else if (cleanCol === 'Dobras3') label = 'SPI'; else if (cleanCol === 'Dobras4') label = 'ABD'; else if (cleanCol === 'nivel') label = 'NÍVEL'; else if (cleanCol === 'distancia') label = 'DISTÂNCIA'; else if (cleanCol === 'Salto1') label = 'SALTO 1'; else if (cleanCol === 'Salto2') label = 'SALTO 2'; else if (cleanCol === 'Salto3') label = 'SALTO 3'; else if (cleanCol === 'MelhorSalto') label = 'FINAL'; else if (cleanCol === 'Volta1') label = 'VOLTA 1'; else if (cleanCol === 'Volta2') label = 'VOLTA 2'; else if (cleanCol === 'Agilidade') label = 'AGILIDADE'; else if (cleanCol === 'Aceleraçãofinal') label = 'MÉDIA ACELERAÇÃO'; else if (cleanCol === 'Velocidadefinal') label = 'MÉDIA VELOCIDADE'; else if (cleanCol.toLowerCase().includes('aceleração')) label = cleanCol.replace(/aceleração/i, 'ACELERAÇÃO '); else if (cleanCol.toLowerCase().includes('velocidade')) label = cleanCol.replace(/velocidade/i, 'VELOCIDADE ');
        th.textContent = label.toUpperCase();
        if (col === 'Ano' || col === 'NOME COMPLETO') { th.style.position = 'sticky'; th.style.left = col === 'Ano' ? '0px' : '60px'; th.style.zIndex = '5'; th.style.backgroundColor = '#e1e1e1'; th.style.minWidth = col === 'Ano' ? '60px' : '220px'; }
        headerRow.appendChild(th);
    });

    getPfSortedEntries(selectedYear).forEach(({row, rowIndex}) => {
        let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano'); anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';
        // Campos calculados e fixos das abas de desempenho
        if (currentPfTab === 'potencia') {
            const vals=['Salto1_','Salto2_','Salto3_'].map(b=>parseFloat(String(valorAvaliacao(row,b,evalNum)).replace(',','.'))).filter(v=>!isNaN(v));
            row['MelhorSalto'+evalNum]=vals.length?Math.max(...vals):'';
        } else if (currentPfTab === 'velocidade') {
            const media=(base)=>{const vals=[];for(let i=1;i<=7;i++){const v=parseFloat(String(valorAvaliacao(row,base+i,evalNum)).replace(',','.'));if(!isNaN(v))vals.push(v)}return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2):''};
            row['Aceleraçãofinal'+evalNum]=media('aceleração'); row['Velocidadefinal'+evalNum]=media('velocidade');
        } else if (currentPfTab === 'agilidade') {
            const vals=['Volta1_','Volta2_'].map(b=>parseFloat(String(valorAvaliacao(row,b,evalNum)).replace(',','.'))).filter(v=>!isNaN(v));
            row['Agilidade'+evalNum]=vals.length?Math.min(...vals):'';
        }
        const tr = document.createElement('tr');
        colsToDisplay.forEach(col => {
            const td = document.createElement('td');
            let val = row[col] !== undefined ? row[col] : (row[Object.keys(row).find(k => k.toLowerCase() === col.toLowerCase())] || '');
            if (col.toLowerCase().includes('data') || col.toLowerCase().includes('nascimento')) val = convertExcelDate(val);
            if (['Ano', 'NOME COMPLETO', 'Data de nascimento'].includes(col)) { td.textContent = val; td.style.backgroundColor = '#f4f6f7'; td.style.fontWeight = '600'; }
            else {
                const cleanBase=col.replace(evalNum,'').replace('_','');
                const fixed=(currentPfTab==='potencia'&&cleanBase==='MelhorSalto') || (currentPfTab==='velocidade'&&(cleanBase==='Aceleraçãofinal'||cleanBase==='Velocidadefinal')) || (currentPfTab==='agilidade'&&cleanBase==='Agilidade');
                if(fixed){td.textContent=val;td.style.backgroundColor='#e8f5e9';td.style.fontWeight='bold';}
                else { const input=document.createElement('input'); input.type='text'; input.value=val; input.onchange=(e)=>{excelData[rowIndex][Object.keys(row).find(k=>k.toLowerCase()===col.toLowerCase())||col]=e.target.value;saveToStorage();renderPfTable();}; td.appendChild(input); }
            }
            if (col === 'Ano' || col === 'NOME COMPLETO') { td.style.position = 'sticky'; td.style.left = col === 'Ano' ? '0px' : '60px'; td.style.zIndex = '2'; td.style.backgroundColor = '#f4f6f7'; td.style.minWidth = col === 'Ano' ? '60px' : '220px'; }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}


let atletaGlobalIndexAtual = null;
let documentosAtletaTemporarios = []; // Armazena os links dos documentos atuais da sessão do modal
// Abre o pop-up de anotações preenchendo os dados do atleta selecionado
function openAnotacoesModal(globalIndex) {
    atletaGlobalIndexAtual = globalIndex;
    const row = excelData[globalIndex];
    if (!row) return;

    let nome = getValorColuna(row, ['nome', 'atleta', 'nome completo']) || 'Sem Nome';
    let apelido = getValorColuna(row, ['apelido']);
    let nomeExibicao = apelido ? `${nome} (${apelido})` : nome;
    
    document.getElementById('anotacao-atleta-nome').textContent = nomeExibicao;
    document.getElementById('anotacao-atleta-posicao').textContent = getValorColuna(row, ['posicao', 'posição']) || '-';
    document.getElementById('anotacao-atleta-nasc').textContent = getValorColuna(row, ['nascimento', 'data de nascimento']) || '-';
    document.getElementById('anotacao-atleta-cidade').textContent = getValorColuna(row, ['cidade']) || '-';
    
    const imgEl = document.getElementById('anotacao-atleta-foto');
    let foto = getValorColuna(row, ['foto', 'imagem']);
    imgEl.src = (foto) ? foto : '';
    imgEl.style.display = foto ? 'block' : 'none';

    // Separa o texto da anotação dos links salvos na coluna 'Anotacoes'
    let conteudoColuna = row['Anotacoes'] || '';
    let partes = conteudoColuna.split('--- [DOCUMENTOS ANEXADOS] ---');
    
    document.getElementById('textarea-anotacoes-texto').value = partes[0] ? partes[0].trim() : '';
    
    document.getElementById('input-novos-documentos').value = '';
    documentosAtletaTemporarios = []; // Array limpo corretamente aqui

    if (partes[1]) {
        try {
            documentosAtletaTemporarios = JSON.parse(partes[1].trim());
        } catch(e) {
            documentosAtletaTemporarios = [];
        }
    }
    
    renderizarListaDocumentosModal();

    // Checkbox de lesão
    let chaveLesao = Object.keys(row).find(k => k.toLowerCase() === 'lesao');
    document.getElementById('checkbox-lesao').checked = chaveLesao ? String(row[chaveLesao]).toLowerCase().trim() === 'sim' : false;

    // Checkbox de cartão vermelho
    let chaveCartaoVermelho = Object.keys(row).find(k => ['cartaovermelho','cartao vermelho','cartão vermelho'].includes(k.toLowerCase().replace(/_/g, ' ').trim()) || k.toLowerCase().replace(/\s+/g,'') === 'cartaovermelho');
    const checkboxCartaoVermelho = document.getElementById('checkbox-cartao-vermelho');
    if (checkboxCartaoVermelho) {
        checkboxCartaoVermelho.checked = chaveCartaoVermelho ? String(row[chaveCartaoVermelho]).toLowerCase().trim() === 'sim' : false;
    }

    document.getElementById('modal-anotacoes').style.display = 'flex';
}

// Faz o upload dos arquivos selecionados para o Supabase Storage em lote
async function processarUploadDocumentos(input) {
    if (!input.files || input.files.length === 0) return;

    const files = Array.from(input.files);
    alert('Fazendo upload de ' + files.length + ' arquivo(s) para o Supabase Storage...');

    for (let file of files) {
        try {
            const nomeArquivoUnico = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            
            // Realiza o upload para o bucket 'documentos-atletas' criado no Supabase
            const { data, error } = await _supabase.storage
                .from('documentos-atletas')
                .upload(nomeArquivoUnico, file);

            if (error) {
                console.error('Erro no upload:', error.message);
                alert('Erro ao enviar o arquivo: ' + file.name);
                continue;
            }

            // Pega a URL pública do arquivo enviado
            const { data: publicUrlData } = _supabase.storage
                .from('documentos-atletas')
                .getPublicUrl(nomeArquivoUnico);

            if (publicUrlData && publicUrlData.publicUrl) {
                documentosAtletaTemporarios.push({
                    nome: file.name,
                    url: publicUrlData.publicUrl,
                    path: nomeArquivoUnico // SALVANDO O CAMINHO PARA FACILITAR A EXCLUSÃO
                });
            }
        } catch (err) {
            console.error('Erro inesperado:', err);
        }
    }

    input.value = ''; // Limpa o input file
    renderizarListaDocumentosModal();
    alert('Upload concluído com sucesso!');
}
// Fecha o modal de anotações
function closeAnotacoesModal() {
    document.getElementById('modal-anotacoes').style.display = 'none';
}
// Renderiza a lista de documentos dentro do modal com opção de abrir ou excluir
function renderizarListaDocumentosModal() {
    const container = document.getElementById('lista-documentos-anexados');
    if (!container) return;
    container.innerHTML = '';

    if (documentosAtletaTemporarios.length === 0) {
        container.innerHTML = '<span style="color: #777; font-style: italic;">Nenhum documento anexado.</span>';
        return;
    }

    documentosAtletaTemporarios.forEach((doc, index) => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 4px 8px; border: 1px solid #ddd; border-radius: 3px;';
        
        item.innerHTML = `
            <a href="${doc.url}" target="_blank" style="color: #0984e3; text-decoration: none; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 320px;" title="${doc.nome}">
                📎 ${doc.nome}
            </a>
            <button type="button" onclick="removerDocumentoTemporario(${index})" style="background: #e53935; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 10px; font-weight: bold;">X</button>
        `;
        container.appendChild(item);
    });
}

// Remove o documento da lista e exclui definitivamente do Supabase Storage
async function removerDocumentoTemporario(index) {
    const doc = documentosAtletaTemporarios[index];

    if (!confirm(`Tem certeza que deseja excluir o anexo "${doc.nome}"? Ele será apagado definitivamente do storage.`)) {
        return;
    }

    // Identifica o caminho exato do arquivo
    let filePath = doc.path;

    // Se não houver 'path' direto, extrai o nome final a partir da URL
    if (!filePath && doc.url) {
        try {
            const urlObj = new URL(doc.url);
            const pathParts = urlObj.pathname.split('/documentos-atletas/');
            if (pathParts.length > 1) {
                filePath = decodeURIComponent(pathParts[1]);
            }
        } catch (e) {
            console.error('Erro ao processar URL do arquivo:', e);
        }
    }

    if (filePath) {
        // Tenta remover do Supabase Storage
        const { data, error } = await _supabase.storage
            .from('documentos-atletas')
            .remove([filePath]);

        if (error) {
            console.error('Erro ao excluir no Supabase Storage:', error);
            alert('Falha ao excluir no Supabase: ' + error.message + '\nVerifique as políticas (RLS) do bucket.');
            return; // Interrompe para não remover da tela se falhar na nuvem
        }

        // Se o Supabase responder sem erro mas não deletar nada
        if (data && data.length === 0) {
            console.warn('O Supabase não encontrou o arquivo com o caminho informado:', filePath);
        }
    }

    // Remove do array local e atualiza a interface
    documentosAtletaTemporarios.splice(index, 1);
    renderizarListaDocumentosModal();
    alert('Arquivo removido com sucesso!');
}





function setValorInputFicha(input, valor) {
    if (!input || valor === undefined || valor === null) return;
    input.value = valor;
    input.setAttribute('value', valor);
}
function aplicarValoresExerciciosFicha(card, valoresSalvos) {
    if (!card || !valoresSalvos) return;
    const inputs = Array.from(card.querySelectorAll('input'));
    const valores = Array.isArray(valoresSalvos) ? valoresSalvos : [];
    if (!valores.length || !inputs.length) return;

    // Formato atual: MMI/Protocolo/HIIT editáveis + 6 campos de tempo do HIIT.
    // A frase final é fixa e NÃO é salva como campo editável.
    if (valores.length >= inputs.length) {
        inputs.forEach((input, i) => setValorInputFicha(input, valores[i]));
        return;
    }

    // Compatibilidade com o formato anterior de 44 inputs:
    // [MMI label] + 21, [Protocolo label] + 12, [HIIT label] + 6 exercícios + 1 tempo único + 1 aviso final.
    // No modelo novo, o tempo único vira 6 quadradinhos e o aviso final é fixo.
    if (valores.length === 44 && inputs.length >= 48) {
        for (let i = 0; i <= 41; i++) setValorInputFicha(inputs[i], valores[i]);
        for (let i = 0; i < 6; i++) setValorInputFicha(inputs[42 + i], valores[42] || '20 SEG.');
        return;
    }

    // Compatibilidade com fichas antigas de 40 inputs:
    // 21 MMI + 12 Protocolo + 6 exercícios HIIT + 1 tempo único.
    if (valores.length === 40 && inputs.length >= 48) {
        setValorInputFicha(inputs[0], 'MMI');
        for (let i = 0; i < 21; i++) setValorInputFicha(inputs[1 + i], valores[i]);
        setValorInputFicha(inputs[22], 'Protocolo');
        for (let i = 0; i < 12; i++) setValorInputFicha(inputs[23 + i], valores[21 + i]);
        setValorInputFicha(inputs[35], 'HIIT');
        for (let i = 0; i < 6; i++) setValorInputFicha(inputs[36 + i], valores[33 + i]);
        for (let i = 0; i < 6; i++) setValorInputFicha(inputs[42 + i], valores[39] || '20 SEG.');
        return;
    }

    // Fallback seguro: aplica o que existir sem quebrar.
    inputs.forEach((input, i) => setValorInputFicha(input, valores[i]));
}

/* === GERAR FICHAS COM LAYOUT PERSONALIZADO (ATUALIZADO) === */
function gerarFichasTreino() {
    // 1. Pega apenas os painéis de grupos que estão visíveis na tela
    const paineisGrupos = Array.from(document.querySelectorAll('#grupos-screen .grupos-ficha-panel'))
                               .filter(panel => panel.style.display !== 'none');

    if (paineisGrupos.length === 0) {
        alert("Por favor, selecione a quantidade e monte os grupos na tela antes de gerar as fichas!");
        return;
    }

    const container = document.getElementById('fichas-render-container');
    container.innerHTML = '';

    // 2. Captura o nome da categoria selecionada
    const catSelect = document.getElementById('grupo-categoria-select');
    let nomeCategoria = 'Categoria Indefinida';
    if (catSelect && catSelect.selectedIndex > 0) {
        nomeCategoria = catSelect.options[catSelect.selectedIndex].text.split(' (')[0];
    }

    // 3. Captura as médias globais corretas geradas na tela anterior
    const getMediaVal = (id) => {
        const el = document.getElementById(id);
        return el && el.textContent.includes(': ') ? el.textContent.split(': ')[1] : '-';
    };
    
    const medias = { 
        yoyo: getMediaVal('media-resistencia'), 
        gord: getMediaVal('media-gordura'), 
        acel: getMediaVal('media-aceleracao'), 
        vel: getMediaVal('media-velocidade'), 
        agil: getMediaVal('media-agilidade'),
        pot: getMediaVal('media-potencia')
    };

    // 4. Inicia o loop para gerar UMA ficha para cada Grupo
        paineisGrupos.forEach((grupoElem) => {
            const nomeGrupo = grupoElem.getAttribute('data-grupo'); 
            const numeroGrupo = nomeGrupo.replace('Grupo ', '');
            
            const linhasAtletas = grupoElem.querySelectorAll('.ficha-table tbody tr');
            let atletasData = [];

            linhasAtletas.forEach((tr) => {
                const cols = tr.querySelectorAll('td');
                if (cols.length >= 9) { 
                    let nome = cols[1]?.textContent || '';
                    if (nome.trim() !== '') {
                        
                        const getVal = (index) => {
                            const input = cols[index]?.querySelector('input');
                            return input ? input.value : (cols[index]?.textContent?.trim() || '-');
                        };

                        atletasData.push({
                            nome: nome.trim(),
                            yoyo: getVal(3),
                            gordura: getVal(4),
                            aceleracao: getVal(5),
                            velocidade: getVal(6),
                            agilidade: getVal(7),
                            potencia: getVal(8)
                        });
                    }
                }
            });

            // 5. Define os valores de referência e marca em vermelho somente os testes
            const numeroReferencia = (valor) => {
                if (valor === undefined || valor === null) return NaN;
                return parseFloat(String(valor).replace('%', '').replace(',', '.'));
            };
            const mediaPotencia = numeroReferencia(medias.pot);
            const mediaYoyo = numeroReferencia(medias.yoyo);
            const mediaAceleracao = numeroReferencia(medias.acel);
            const mediaVelocidade = numeroReferencia(medias.vel);
            const mediaAgilidade = numeroReferencia(medias.agil);
            const corTeste = (tipo, valor) => {
                const n = numeroReferencia(valor);
                if (isNaN(n)) return '';
                let alerta = false;
                if (tipo === 'potencia') alerta = !isNaN(mediaPotencia) && n <= mediaPotencia;
                if (tipo === 'gordura') alerta = n < 9.10 || n > 10.99;
                if (tipo === 'yoyo') alerta = !isNaN(mediaYoyo) && n < mediaYoyo;
                if (tipo === 'aceleracao') alerta = !isNaN(mediaAceleracao) && n > mediaAceleracao;
                if (tipo === 'velocidade') alerta = !isNaN(mediaVelocidade) && n > mediaVelocidade;
                if (tipo === 'agilidade') alerta = !isNaN(mediaAgilidade) && n > mediaAgilidade;
                return alerta ? 'color: #d00000 !important;' : '';
            };

            // 6. Monta a ficha, deixando vermelho apenas o teste abaixo/acima da referência
            const fichaHTML = `
            <div class="ficha-grupo-card">
                <div class="ficha-header-title">
                    ${nomeCategoria} &nbsp;&nbsp;/&nbsp;&nbsp; Grupo ${numeroGrupo}
                </div>

                <table class="ficha-table">
                    <thead>
                        <tr style="background-color: #fff; font-weight: bold;">
                            <th style="width: 35px;"></th>
                            <th style="text-align: center; width: 220px;">NOME</th>
                            <th>POTÊNCIA</th>
                            <th>%GORDURA</th>
                            <th>YOYO</th>
                            <th>ACELERAÇÃO</th>
                            <th>VELOCIDADE</th>
                            <th>AGILIDADE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${atletasData.map((a, i) => {
                            const bgStyle = i % 2 === 1 ? 'background-color: #e2e2e2;' : 'background-color: #ffffff;';
                            return `
                                <tr style="${bgStyle}">
                                    <td style="text-align: center; font-weight: bold;">${i + 1}</td>
                                    <td style="text-align: center; font-weight: bold;">${a.nome}</td>
                                    <td style="text-align: center; font-weight: bold; ${corTeste('potencia', a.potencia)}">${a.potencia}</td>
                                    <td style="text-align: center; font-weight: bold; ${corTeste('gordura', a.gordura)}">${a.gordura}</td>
                                    <td style="text-align: center; font-weight: bold; ${corTeste('yoyo', a.yoyo)}">${a.yoyo}</td>
                                    <td style="text-align: center; font-weight: bold; ${corTeste('aceleracao', a.aceleracao)}">${a.aceleracao}</td>
                                    <td style="text-align: center; font-weight: bold; ${corTeste('velocidade', a.velocidade)}">${a.velocidade}</td>
                                    <td style="text-align: center; font-weight: bold; ${corTeste('agilidade', a.agilidade)}">${a.agilidade}</td>
                                </tr>
                            `;
                        }).join('')}
                        
                        <tr class="row-media">
                            <td colspan="2" style="text-align: center; font-size: 13px;">MÉDIA DA CATEGORIA</td>
                            <td>${medias.pot}</td>
                            <td>${medias.gord}</td>
                            <td>${medias.yoyo}</td>
                            <td>${medias.acel}</td>
                            <td>${medias.vel}</td>
                            <td>${medias.agil}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- MMI -->
                <table class="ficha-table" style="margin-top: 8px;">
                    <tr>
                        <td rowspan="3" class="side-label"><input type="text" class="side-label-edit" value="MMI"></td>
                        <td class="mmi-header"><input type="text" value="Agachamento livre"></td>
                        <td class="mmi-header"><input type="text" value="Agachamento lateral"></td>
                        <td class="mmi-header"><input type="text" value="STIFF + Avanço"></td>
                        <td class="mmi-header"><input type="text" value="Avanço Dinamico"></td>
                        <td class="mmi-header"><input type="text" value="Terra + Salto"></td>
                        <td class="mmi-header"><input type="text" value="Agachamento sumo abre e fecha com salto"></td>
                        <td class="mmi-header"><input type="text" value="Ele. Pelvica"></td>
                    </tr>
                    <tr>
                        <td class="mmi-reps"><input type="text" value="3X8"></td>
                        <td class="mmi-reps"><input type="text" value="3X8"></td>
                        <td class="mmi-reps"><input type="text" value="3X8"></td>
                        <td class="mmi-reps"><input type="text" value="3x8"></td>
                        <td class="mmi-reps"><input type="text" value="3x8"></td>
                        <td class="mmi-reps"><input type="text" value="3x6"></td>
                        <td class="mmi-reps"><input type="text" value="3x10"></td>
                    </tr>
                    <tr>
                        <td class="mmi-weight"><input type="text" value="15kg"></td>
                        <td class="mmi-weight"><input type="text" value="14kg"></td>
                        <td class="mmi-weight"><input type="text" value="8kg"></td>
                        <td class="mmi-weight"><input type="text" value="10kg"></td>
                        <td class="mmi-weight"><input type="text" value="20kg"></td>
                        <td class="mmi-weight"><input type="text" value="10kg"></td>
                        <td class="mmi-weight"><input type="text" value="20kg"></td>
                    </tr>
                </table>

                <!-- PROTOCOLO -->
                <table class="ficha-table" style="margin-top: 8px;">
                    <tr>
                        <td rowspan="2" class="side-label"><input type="text" class="side-label-edit" value="Protocolo"></td>
                        <td class="proto-header"><input type="text" value="Remada baixa"></td>
                        <td class="proto-header"><input type="text" value="Supino com elevação pélvica"></td>
                        <td class="proto-header"><input type="text" value="Remada serrote"></td>
                        <td class="proto-header"><input type="text" value="Abd remador"></td>
                        <td class="proto-header"><input type="text" value="Dumbbell Snatch"></td>
                        <td class="proto-header"><input type="text" value="Flexão"></td>
                    </tr>
                    <tr>
                        <td class="proto-weight"><input type="text" value="60kg"></td>
                        <td class="proto-weight"><input type="text" value="6kg"></td>
                        <td class="proto-weight"><input type="text" value="12kg"></td>
                        <td class="proto-weight"><input type="text" value="10kg"></td>
                        <td class="proto-weight"><input type="text" value="10kg"></td>
                        <td class="proto-weight"><input type="text" value="-"></td>
                    </tr>
                </table>

                <!-- HIIT -->
                <table class="ficha-table" style="margin-top: 8px;">
                    <tr>
                        <td rowspan="2" class="side-label"><input type="text" class="side-label-edit" value="HIIT"></td>
                        <td class="hiit-header"><input type="text" value="AGACHAMENTO COM SALTO"></td>
                        <td class="hiit-header"><input type="text" value="AVANÇO COM SALTO"></td>
                        <td class="hiit-header"><input type="text" value="POLICHINELO"></td>
                        <td class="hiit-header"><input type="text" value="ABDOMINAL"></td>
                        <td class="hiit-header"><input type="text" value="FLEXÃO"></td>
                        <td class="hiit-header"><input type="text" value="BURPEE"></td>
                    </tr>
                    <tr>
                        <td class="hiit-footer"><input type="text" value="20 SEG." style="font-weight: bold; text-align: center;"></td>
                        <td class="hiit-footer"><input type="text" value="20 SEG." style="font-weight: bold; text-align: center;"></td>
                        <td class="hiit-footer"><input type="text" value="20 SEG." style="font-weight: bold; text-align: center;"></td>
                        <td class="hiit-footer"><input type="text" value="20 SEG." style="font-weight: bold; text-align: center;"></td>
                        <td class="hiit-footer"><input type="text" value="20 SEG." style="font-weight: bold; text-align: center;"></td>
                        <td class="hiit-footer"><input type="text" value="20 SEG." style="font-weight: bold; text-align: center;"></td>
                    </tr>
                </table>

                <!-- AVISO FINAL -->
                <table class="ficha-table ficha-aviso-final" style="margin-top: 8px;">
                    <tr>
                        <td class="proto-banner">
                            Chegar ANTES ou ficar APÓS para realizar os PROTOCOLOS (Atletas marcados, deverão realizar)
                        </td>
                    </tr>
                </table>
            </div>
            `;

            container.insertAdjacentHTML('beforeend', fichaHTML);
        });

        // ==========================================
        // NOVO: APLICA OS EXERCÍCIOS SALVOS ANTES DE EXIBIR A TELA
        // ==========================================
        if (Object.keys(exerciciosSalvosNaNuvem).length > 0) {
            document.querySelectorAll('.ficha-grupo-card').forEach((card, index) => {
                const valoresSalvos = exerciciosSalvosNaNuvem[index];
                aplicarValoresExerciciosFicha(card, valoresSalvos);
            });
        }
        // ==========================================

        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById('fichas-treino-screen').style.display = 'block';
        window.scrollTo(0, 0);

        // -> SALVA AUTOMATICAMENTE NO SUPABASE APÓS GERAR AS FICHAS
        salvarNoSupabase();
}

function voltarParaGrupos() {
    document.getElementById('fichas-treino-screen').style.display = 'none';
    document.getElementById('grupos-screen').style.display = 'block';
}

// Salva as anotações de forma segura
function salvarAnotacoesAtleta() {
    if (atletaGlobalIndexAtual === null || atletaGlobalIndexAtual === undefined || !excelData[atletaGlobalIndexAtual]) {
        alert('Nenhum atleta selecionado.');
        return;
    }

    const textoDigitado = document.getElementById('textarea-anotacoes-texto').value.trim();
    
    let stringFinal = textoDigitado;
    if (documentosAtletaTemporarios.length > 0) {
        stringFinal += '\n\n--- [DOCUMENTOS ANEXADOS] ---\n' + JSON.stringify(documentosAtletaTemporarios);
    }

    excelData[atletaGlobalIndexAtual]['Anotacoes'] = stringFinal;

    const checkboxLesao = document.getElementById('checkbox-lesao');
    if (checkboxLesao) {
        excelData[atletaGlobalIndexAtual]['Lesao'] = checkboxLesao.checked ? 'sim' : '';
    }

    const checkboxCartaoVermelho = document.getElementById('checkbox-cartao-vermelho');
    if (checkboxCartaoVermelho) {
        excelData[atletaGlobalIndexAtual]['CartaoVermelho'] = checkboxCartaoVermelho.checked ? 'sim' : '';
    }

    saveToStorage(); 

    if (typeof renderExcelTable === 'function') renderExcelTable();
    if (typeof renderAtletasScreen === 'function') renderAtletasScreen();

    alert('Informações e documentos salvos com sucesso!');
    closeAnotacoesModal(); 
}


// Função auxiliar genérica para buscar dados da linha independentemente de maiúsculas/minúsculas
function getValorColuna(row, chavesPossiveis) {
    const chaveEncontrada = Object.keys(row).find(k => 
        chavesPossiveis.some(p => k.toLowerCase().trim() === p.toLowerCase().trim())
    );
    return chaveEncontrada ? row[chaveEncontrada] : '';
}

function normalizarTextoGrupoAtleta(valor) {
    return String(valor || '').trim().replace(/\s+/g, ' ');
}
function normalizarDataGrupoAtleta(valor) {
    return normalizarTextoGrupoAtleta(convertExcelDate(valor) || valor);
}
function valorColunaGrupoFlex(row, termos) {
    const chave = Object.keys(row || {}).find(k => termos.some(t => String(k).toLowerCase().includes(String(t).toLowerCase())));
    return chave ? row[chave] : '';
}
function identidadeAtletaGrupo(index) {
    const row = excelData[index] || {};
    const nomeCompleto = normalizarTextoGrupoAtleta(
        valorColunaGrupoFlex(row, ['nome completo']) ||
        valorColunaExata(row, 'NOME COMPLETO') ||
        valorColunaGrupoFlex(row, ['nome'])
    );
    const apelido = normalizarTextoGrupoAtleta(valorColunaGrupoFlex(row, ['apelido']));
    const nascimento = normalizarDataGrupoAtleta(valorColunaGrupoFlex(row, ['data de nascimento', 'nascimento']));
    const ano = normalizarTextoGrupoAtleta(valorColunaExata(row, 'Ano'));
    return { nomeCompleto, apelido, nascimento, ano };
}
function localizarAtletaGrupoSalvo(atletaSalvo) {
    if (atletaSalvo === undefined || atletaSalvo === null) return -1;
    const normalizar = normalizarTextoGrupoAtleta;
    const normalizarData = normalizarDataGrupoAtleta;

    if (typeof atletaSalvo === 'object') {
        const nomeCompletoSalvo = normalizar(atletaSalvo.nomeCompleto || atletaSalvo.nome_completo || '');
        const apelidoSalvo = normalizar(atletaSalvo.apelido || '');
        const nomeSalvo = normalizar(atletaSalvo.nome || ''); // compatibilidade com formato antigo: geralmente era apelido
        const nascimentoSalvo = normalizarData(atletaSalvo.nascimento || atletaSalvo.dataNascimento || atletaSalvo.data_nascimento || '');
        const anoSalvo = normalizar(atletaSalvo.ano || '');

        let idx = -1;
        if (nomeCompletoSalvo && nascimentoSalvo) {
            idx = excelData.findIndex((_, i) => {
                const id = identidadeAtletaGrupo(i);
                return id.nomeCompleto === nomeCompletoSalvo && id.nascimento === nascimentoSalvo;
            });
            if (idx >= 0) return idx;
        }
        if (nomeSalvo && nascimentoSalvo) {
            idx = excelData.findIndex((_, i) => {
                const id = identidadeAtletaGrupo(i);
                return (id.apelido === nomeSalvo || id.nomeCompleto === nomeSalvo) && id.nascimento === nascimentoSalvo;
            });
            if (idx >= 0) return idx;
        }
        if (apelidoSalvo && nascimentoSalvo) {
            idx = excelData.findIndex((_, i) => {
                const id = identidadeAtletaGrupo(i);
                return id.apelido === apelidoSalvo && id.nascimento === nascimentoSalvo;
            });
            if (idx >= 0) return idx;
        }
        if ((nomeCompletoSalvo || nomeSalvo || apelidoSalvo) && anoSalvo) {
            const nomeBusca = nomeCompletoSalvo || nomeSalvo || apelidoSalvo;
            idx = excelData.findIndex((_, i) => {
                const id = identidadeAtletaGrupo(i);
                return (id.nomeCompleto === nomeBusca || id.apelido === nomeBusca) && id.ano === anoSalvo;
            });
            if (idx >= 0) return idx;
        }
        return -1;
    }

    const nomeAntigo = normalizar(atletaSalvo);
    if (!nomeAntigo) return -1;
    return excelData.findIndex((_, i) => {
        const id = identidadeAtletaGrupo(i);
        return id.apelido === nomeAntigo || id.nomeCompleto === nomeAntigo;
    });
}

async function salvarNoSupabase() {
    const catSelect = document.getElementById('grupo-categoria-select');
    if (!catSelect || catSelect.selectedIndex <= 0) {
        alert("Selecione uma categoria primeiro!");
        return;
    }
    
    const categoriaId = catSelect.value;

    // 1. Salva os grupos e atletas (que já funcionam perfeitamente)
    const paineisGrupos = Array.from(document.querySelectorAll('#grupos-screen .grupos-ficha-panel'));
    const gruposDataPayload = paineisGrupos.map(panel => {
        const nomeGrupo = panel.getAttribute('data-grupo');
        const isVisivel = panel.style.display !== 'none';
        
        const atletas = Array.from(panel.querySelectorAll('.ficha-table tbody tr')).map(tr => {
            const index = Number(tr.dataset.globalIndex);
            if (Number.isInteger(index) && excelData[index]) {
                const id = identidadeAtletaGrupo(index);
                return {
                    nomeCompleto: id.nomeCompleto,
                    apelido: id.apelido,
                    nascimento: id.nascimento,
                    ano: id.ano
                };
            }
            return null;
        }).filter(atleta => atleta && atleta.nomeCompleto && atleta.nascimento);

        return { nomeGrupo, isVisivel, atletas };
    });

    // 2. Captura correta de todos os campos de exercícios (repetições, cargas) dos cards
    const exerciciosData = {};
    document.querySelectorAll('.ficha-grupo-card').forEach((card, index) => {
        const inputs = Array.from(card.querySelectorAll('input')).map(input => input.value);
        exerciciosData[index] = inputs;
    });

    // Atualiza a variável global com o que acabou de ser lido da tela
    exerciciosSalvosNaNuvem = exerciciosData;

    const payload = {
        grupos: gruposDataPayload,
        exercicios: exerciciosData
    };

    const { error } = await _supabase
        .from('configuracoes_categorias')
        .upsert({ 
            categoria_id: categoriaId, 
            dados: payload, 
            atualizado_em: new Date() 
        });

    if (error) {
        console.error("Erro ao salvar no Supabase:", error.message);
        alert("Erro ao salvar alterações na nuvem.");
    } else {
        console.log("Ficha e exercícios salvos com sucesso!");
        alert("Alterações salvas com sucesso!");
    }
}

async function carregarDoSupabase() {
    const catSelect = document.getElementById('grupo-categoria-select');
    if (!catSelect || catSelect.selectedIndex <= 0) {
        for (let g in gruposData) {
            gruposData[g] = [];
        }
        if (typeof renderGruposScreen === 'function') renderGruposScreen();
        return;
    }

    const categoriaId = catSelect.value;

    const { data, error } = await _supabase
        .from('configuracoes_categorias')
        .select('dados')
        .eq('categoria_id', categoriaId)
        .maybeSingle();

    if (error) {
        console.error("Erro ao consultar o Supabase:", error.message);
        return;
    }

    for (let g in gruposData) {
        gruposData[g] = [];
    }

    if (!data || !data.dados) {
        if (typeof renderGruposScreen === 'function') renderGruposScreen();
        return;
    }

    const estado = data.dados;

    if (estado && estado.grupos) {
        estado.grupos.forEach(gData => {
            const panel = document.querySelector(`#grupos-screen .grupos-ficha-panel[data-grupo="${gData.nomeGrupo}"]`);
            if (panel) {
                panel.style.display = gData.isVisivel ? 'block' : 'none';
            }

            if (gData.atletas && Array.isArray(gData.atletas)) {
                gData.atletas.forEach(atletaSalvo => {
                    const idx = localizarAtletaGrupoSalvo(atletaSalvo);
                    if (idx >= 0 && idx < excelData.length) {
                        if (!gruposData[gData.nomeGrupo]) gruposData[gData.nomeGrupo] = [];
                        if (!gruposData[gData.nomeGrupo].some(item => item.index === idx)) {
                            gruposData[gData.nomeGrupo].push({ index: idx, manualData: {} });
                        }
                    } else {
                        console.warn('Atleta salvo no grupo não localizado:', atletaSalvo);
                    }
                });
            }
        });

        if (typeof renderGruposScreen === 'function') {
            renderGruposScreen();
        }
    }

    // 3. Salva os dados de exercícios na variável global para quando a ficha for gerada
    if (estado && estado.exercicios) {
        exerciciosSalvosNaNuvem = estado.exercicios;
        
        // Tenta aplicar caso a tela de fichas já esteja aberta (re-render)
        document.querySelectorAll('.ficha-grupo-card').forEach((card, index) => {
            const inputs = card.querySelectorAll('input');
            const valoresSalvos = exerciciosSalvosNaNuvem[index];
            if (valoresSalvos && inputs) {
                inputs.forEach((input, i) => {
                    if (valoresSalvos[i] !== undefined) {
                        input.value = valoresSalvos[i];
                    }
                });
            }
        });
    } else {
        exerciciosSalvosNaNuvem = {}; // Limpa caso não exista nada salvo na categoria
    }
}

function imprimirFichaAtleta() {
    var bodyContent = document.getElementById('fichaModalBody').innerHTML;
    
    var janela = window.open('', '_blank', 'width=800,height=600');
    janela.document.write(`
        <html>
        <head>
            <title>Ficha do Atleta - CFA Prosol</title>
            <link rel="stylesheet" href="style.css">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .close-btn, .modal-footer, .modal-header { display: none !important; }
                .modal-overlay { display: block !important; position: static !important; background: none !important; height: auto !important; }
                .modal-container { width: 100% !important; max-width: 100% !important; border: none !important; box-shadow: none !important; }
                .modal-body { padding: 10px !important; }
                @page { size: A4 landscape; margin: 6mm; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            </style>
        </head>
        <body>
            ${bodyContent}
            <script>
                window.onload = function() { window.print(); window.close(); };
            <\/script>
        </body>
        </html>
    `);
    janela.document.close();
}






/* ========================================================
   MÓDULO NOVO: GRUPOS (Separação de Grupos)
   ======================================================== */

// Extrai as métricas da última avaliação existente do atleta
function getUltimaAvaliacao(row) {
    let maxEvalNum = 1;
    for (let i = 1; i <= 20; i++) {
        let hasData = false;
        for (let key in row) {
            let kLow = key.toLowerCase();
            if ((kLow === ('altura' + i) || kLow === ('peso' + i) || kLow === ('distancia' + i) || kLow === ('data' + i)) && row[key] && String(row[key]).trim() !== '-') {
                hasData = true; break;
            }
        }
        if (hasData) maxEvalNum = i;
    }

    function getVal(baseName) {
        let val = '-';
        for (let key in row) {
            let k = key.toLowerCase();
            if (k === (baseName.toLowerCase() + maxEvalNum) || k === (baseName.toLowerCase() + '_' + maxEvalNum)) {
                if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') val = row[key];
            }
        }
        return val;
    }

    return {
        distancia: getVal('distancia'),
        gordura: formatGordura(getVal('PercentualGordura')),
        aceleracao: getVal('Aceleraçãofinal'),
        velocidade: getVal('Velocidadefinal'),
        agilidade: getVal('Agilidade'),
        potencia: getVal('MelhorSalto')
    };
}

function initGruposFilter() {
    const container = document.getElementById('grupos-anos-filter');
    if (!container) return;
    container.innerHTML = '';
    const anos = ['2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018'];
    anos.forEach(ano => {
        container.innerHTML += `<label><input type="checkbox" class="grupo-chk-ano" value="${ano}" onchange="renderGruposScreen()"> ${ano}</label>`;
    });
}

function renderGruposScreen() {
    renderGruposLista();
    renderFichaGrupo();
    calcularMediaCategoria(); // Atualiza a média se houver categoria selecionada
    
    // NOVO: Controla a visibilidade dos painéis de grupos de acordo com a quantidade selecionada (1 a 6)
    document.querySelectorAll('.grupos-ficha-panel').forEach(panel => {
        const grupoNome = panel.getAttribute('data-grupo'); // Ex: "Grupo 1", "Grupo 2"...
        if (grupoNome) {
            // Extrai o número do grupo (ex: "Grupo 3" vira o número 3)
            const numeroGrupo = parseInt(grupoNome.replace('Grupo ', ''));
            
            // Se o número do grupo for menor ou igual ao selecionado, ele aparece. Senão, fica oculto.
            if (numeroGrupo <= quantidadeGruposAtivos) {
                panel.style.display = 'block'; // Ou 'flex', dependendo do seu layout original
            } else {
                panel.style.display = 'none';
                
                // Opcional: Se o usuário diminuiu a quantidade de grupos e havia atletas no grupo oculto,
                // você pode opcionalmente limpá-los ou mantê-los nos dados. Aqui mantemos apenas oculto visualmente.
            }
        }
    });

    // Configura o Drop Zone em TODAS as fichas ativas
    document.querySelectorAll('.grupos-ficha-panel').forEach(panel => {
        // Ignora painéis que estão ocultos
        if (panel.style.display === 'none') return;

        panel.ondragover = (e) => e.preventDefault();
        panel.ondrop = (e) => {
            e.preventDefault();
            const globalIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const grupoAtual = panel.getAttribute('data-grupo');
            
            if (!isNaN(globalIndex) && !isAtletaEmAlgumGrupo(globalIndex)) {
                gruposData[grupoAtual].push({ index: globalIndex, manualData: {} });
                renderGruposScreen(); // Re-renderiza para atualizar cores e tabelas
            }
        };
    });
}


document.addEventListener('DOMContentLoaded', () => {
    // 1. Ouvinte para o select de categoria (carregamento automático ao trocar a categoria)
    const catSelect = document.getElementById('grupo-categoria-select');
    if (catSelect) {
        catSelect.addEventListener('change', async () => {
            await carregarDoSupabase();
        });
    }

    // 2. Ouvinte EXCLUSIVO para o botão de Salvar (Apenas Manual)
    const btnSalvarFicha = document.getElementById('btn-salvar-ficha');
    if (btnSalvarFicha) {
        btnSalvarFicha.addEventListener('click', async () => {
            // O salvamento agora só acontece quando este botão for clicado
            await salvarNoSupabase();
            
            // Opcional: Se a sua função salvarNoSupabase() já tiver um alert() dentro dela, 
            // não precisa colocar nada aqui. Se não tiver, você pode adicionar:
            // alert('Ficha salva com sucesso!');
       });
    }
});

    



function isAtletaEmAlgumGrupo(globalIndex) {
    for (let grupo in gruposData) {
        if (gruposData[grupo].some(atleta => atleta.index === globalIndex)) return true;
    }
    return false;
}

function renderGruposLista() {
    const container = document.getElementById('grupos-lista-container');
    if (!container) return;
    container.innerHTML = '';

    const anosSelecionados = Array.from(document.querySelectorAll('.grupo-chk-ano:checked')).map(chk => chk.value);

    let atletasValidos = [];

    excelData.forEach((row, globalIndex) => {
        let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano');
        anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';

        if (anosSelecionados.length > 0 && !anosSelecionados.includes(anoAtleta)) return;
        if (isAtletaEmAlgumGrupo(globalIndex)) return;

        let nomeExibicao = Object.keys(row).find(k => k.toLowerCase().includes('apelido'));
        nomeExibicao = nomeExibicao && row[nomeExibicao] ? row[nomeExibicao] : '';
        if (!nomeExibicao) {
            let nm = Object.keys(row).find(k => k.toLowerCase().includes('nome'));
            nomeExibicao = nm && row[nm] ? row[nm] : 'Sem Nome';
        }

        const stats = getUltimaAvaliacao(row);

        atletasValidos.push({ globalIndex, nomeExibicao, anoAtleta, stats });
    });

    // Lógica de Ordenação
    atletasValidos.sort((a, b) => {
        let valorA, valorB;
        if (criterioOrdenacaoAtual === 'nome') {
            valorA = a.nomeExibicao.toLowerCase();
            valorB = b.nomeExibicao.toLowerCase();
            if (valorA < valorB) return direcaoOrdenacaoAtual === 'asc' ? -1 : 1;
            if (valorA > valorB) return direcaoOrdenacaoAtual === 'asc' ? 1 : -1;
            return 0;
        } else {
            valorA = parseFloat(String(a.stats[criterioOrdenacaoAtual]).replace(',', '.')) || 0;
            valorB = parseFloat(String(b.stats[criterioOrdenacaoAtual]).replace(',', '.')) || 0;
            if (direcaoOrdenacaoAtual === 'asc') return valorA - valorB; 
            else return valorB - valorA; 
        }
    });

    // Função auxiliar para exibir a setinha da ordenação atual
    const getSortIcon = (criterio) => {
        if (criterioOrdenacaoAtual === criterio) {
            return direcaoOrdenacaoAtual === 'asc' ? ' <i class="fa-solid fa-caret-up"></i>' : ' <i class="fa-solid fa-caret-down"></i>';
        }
        return '';
    };

    // Montando o Cabeçalho (com função de filtro embutida)
    const headerHTML = `
        <div class="athlete-list-header athlete-grid-layout">
            <div onclick="mudarOrdenacao('nome')">NOME / ANO${getSortIcon('nome')}</div>
            <div onclick="mudarOrdenacao('distancia')">RES.${getSortIcon('distancia')}</div>
            <div onclick="mudarOrdenacao('gordura')">% GOR.${getSortIcon('gordura')}</div>
            <div onclick="mudarOrdenacao('aceleracao')">ACE.${getSortIcon('aceleracao')}</div>
            <div onclick="mudarOrdenacao('velocidade')">VEL.${getSortIcon('velocidade')}</div>
            <div onclick="mudarOrdenacao('agilidade')">AGIL.${getSortIcon('agilidade')}</div>
            <div onclick="mudarOrdenacao('potencia')">POT.${getSortIcon('potencia')}</div>
        </div>
    `;

    // Como são 2 colunas no grid, injetamos o cabeçalho 2 vezes para preencher o topo de ambas
    container.innerHTML += headerHTML + headerHTML;

    // Renderiza os atletas (sem os prefixos, apenas os dados)
    atletasValidos.forEach(atleta => {
        const card = document.createElement('div');
        card.className = 'athlete-list-item athlete-grid-layout';
        card.draggable = true;
        card.ondragstart = (e) => { e.dataTransfer.setData('text/plain', atleta.globalIndex); };
	// NOVO: Adiciona o evento de clique para abrir o pop-up de seleção de grupo
        card.onclick = () => openSelectGrupoModal(atleta.globalIndex);
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <span class="athlete-name" title="${atleta.nomeExibicao} (${atleta.anoAtleta})">${atleta.nomeExibicao} (${atleta.anoAtleta})</span>
            <span class="athlete-stat" title="Resistência">${atleta.stats.distancia}</span>
            <span class="athlete-stat" title="% Gordura">${atleta.stats.gordura}</span>
            <span class="athlete-stat" title="Aceleração">${atleta.stats.aceleracao}</span>
            <span class="athlete-stat" title="Velocidade">${atleta.stats.velocidade}</span>
            <span class="athlete-stat" title="Agilidade">${atleta.stats.agilidade}</span>
            <span class="athlete-stat" title="Potência">${atleta.stats.potencia}</span>
        `;
        container.appendChild(card);
    });
}

function renderFichaGrupo() {
    const grupos = ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Grupo 4', 'Grupo 5', 'Grupo 6'];
    
    grupos.forEach(grupoNome => {
        const tbody = document.getElementById(`tbody-${grupoNome}`);
        if (!tbody) return;
        tbody.innerHTML = '';

        const atletasDoGrupo = gruposData[grupoNome] || [];

        atletasDoGrupo.forEach((item, arrIndex) => {
            const row = excelData[item.index];
            let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano');
            anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';
            
            let nomeExibicao = Object.keys(row).find(k => k.toLowerCase().includes('apelido'));
            nomeExibicao = nomeExibicao && row[nomeExibicao] ? row[nomeExibicao] : '';
            if (!nomeExibicao) {
                let nm = Object.keys(row).find(k => k.toLowerCase().includes('nome'));
                nomeExibicao = nm && row[nm] ? row[nm] : 'Sem Nome';
            }

            const defaultStats = getUltimaAvaliacao(row);

            const valDistancia = item.manualData.distancia !== undefined ? item.manualData.distancia : defaultStats.distancia;
            const valGordura = item.manualData.gordura !== undefined ? item.manualData.gordura : defaultStats.gordura;
            const valAceleracao = item.manualData.aceleracao !== undefined ? item.manualData.aceleracao : defaultStats.aceleracao;
            const valVelocidade = item.manualData.velocidade !== undefined ? item.manualData.velocidade : defaultStats.velocidade;
            const valAgilidade = item.manualData.agilidade !== undefined ? item.manualData.agilidade : defaultStats.agilidade;
            const valPotencia = item.manualData.potencia !== undefined ? item.manualData.potencia : defaultStats.potencia;

            const tr = document.createElement('tr');
            tr.dataset.globalIndex = item.index;
            
            const tdAction = document.createElement('td');
            tdAction.innerHTML = `<button style="background:none; border:none; color:#e53935; cursor:pointer;" onclick="removerAtletaDoGrupo('${grupoNome}', ${item.index})"><i class="fa-solid fa-trash"></i></button>`;
            
            const tdNome = document.createElement('td'); tdNome.textContent = nomeExibicao; tdNome.style.fontWeight = 'bold';
            const tdAno = document.createElement('td'); tdAno.textContent = anoAtleta;

            const createInputCell = (field, value) => {
                const td = document.createElement('td');
                const input = document.createElement('input');
                input.type = 'text';
                input.value = value;
                input.readOnly = true;
                input.tabIndex = -1;
                td.appendChild(input);
                return td;
            };

            tr.appendChild(tdAction);
            tr.appendChild(tdNome);
            tr.appendChild(tdAno);
            tr.appendChild(createInputCell('distancia', valDistancia));
            tr.appendChild(createInputCell('gordura', valGordura));
            tr.appendChild(createInputCell('aceleracao', valAceleracao));
            tr.appendChild(createInputCell('velocidade', valVelocidade));
            tr.appendChild(createInputCell('agilidade', valAgilidade));
            tr.appendChild(createInputCell('potencia', valPotencia));

            tbody.appendChild(tr);
        });
    });
}

function removerAtletaDoGrupo(grupo, globalIndex) {
    gruposData[grupo] = gruposData[grupo].filter(item => item.index !== globalIndex);
    renderGruposScreen();
}

function limparGrupo(grupoNome) {
    if (confirm(`Deseja limpar todos os atletas do ${grupoNome}?`)) {
        gruposData[grupoNome] = [];
        renderGruposScreen();
    }
}

// Calcula as médias baseado APENAS nos anos da categoria escolhida, lendo do banco completo (excelData)
function calcularMediaCategoria() {
    const categoria = document.getElementById('grupo-categoria-select').value;
    let anosCategoria = [];
    
    if (categoria === 'sub11') anosCategoria = ['2015', '2016', '2017', '2018'];
    else if (categoria === 'sub12') anosCategoria = ['2014'];
    else if (categoria === 'sub13') anosCategoria = ['2013'];
    else if (categoria === 'sub16') anosCategoria = ['2009', '2010', '2011', '2012'];

    if (anosCategoria.length === 0) {
        document.getElementById('media-resistencia').textContent = `Resistência: -`;
        document.getElementById('media-gordura').textContent = `% Gordura: -`;
        document.getElementById('media-aceleracao').textContent = `Aceleração: -`;
        document.getElementById('media-velocidade').textContent = `Velocidade: -`;
        document.getElementById('media-agilidade').textContent = `Agilidade: -`;
        document.getElementById('media-potencia').textContent = `Potência: -`;
        return;
    }

    let sums = { dist: 0, gordura: 0, acel: 0, vel: 0, agil: 0, pot: 0 };
    let counts = { dist: 0, gordura: 0, acel: 0, vel: 0, agil: 0, pot: 0 };

    excelData.forEach(row => {
        let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano');
        anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';

        if (anosCategoria.includes(anoAtleta)) {
            const stats = getUltimaAvaliacao(row);
            
            const parseNum = (str) => {
                if(!str || str === '-') return NaN;
                return parseFloat(String(str).replace('%', '').replace(',', '.'));
            };

            const d = parseNum(stats.distancia); if(!isNaN(d)){ sums.dist += d; counts.dist++; }
            const g = parseNum(stats.gordura); if(!isNaN(g)){ sums.gordura += g; counts.gordura++; }
            const ac = parseNum(stats.aceleracao); if(!isNaN(ac)){ sums.acel += ac; counts.acel++; }
            const v = parseNum(stats.velocidade); if(!isNaN(v)){ sums.vel += v; counts.vel++; }
            const ag = parseNum(stats.agilidade); if(!isNaN(ag)){ sums.agil += ag; counts.agil++; }
            const p = parseNum(stats.potencia); if(!isNaN(p)){ sums.pot += p; counts.pot++; }
        }
    });

    const formatMedia = (sum, count, isGordura) => {
        if(count === 0) return '-';
        let media = sum / count;
        return media.toFixed(2).replace('.', ',') + (isGordura ? '%' : '');
    };

    document.getElementById('media-resistencia').textContent = `Resistência: ${formatMedia(sums.dist, counts.dist)}`;
    document.getElementById('media-gordura').textContent = `% Gordura: ${formatMedia(sums.gordura, counts.gordura, true)}`;
    document.getElementById('media-aceleracao').textContent = `Aceleração: ${formatMedia(sums.acel, counts.acel)}`;
    document.getElementById('media-velocidade').textContent = `Velocidade: ${formatMedia(sums.vel, counts.vel)}`;
    document.getElementById('media-agilidade').textContent = `Agilidade: ${formatMedia(sums.agil, counts.agil)}`;
    document.getElementById('media-potencia').textContent = `Potência: ${formatMedia(sums.pot, counts.pot)}`;
}


let atletaSelecionadoParaGrupo = null;

function openSelectGrupoModal(globalIndex) {
    atletaSelecionadoParaGrupo = globalIndex;
    const row = excelData[globalIndex];
    let nomeExibicao = Object.keys(row).find(k => k.toLowerCase().includes('apelido'));
    nomeExibicao = nomeExibicao && row[nomeExibicao] ? row[nomeExibicao] : '';
    if (!nomeExibicao) {
        let nm = Object.keys(row).find(k => k.toLowerCase().includes('nome'));
        nomeExibicao = nm && row[nm] ? row[nm] : 'Sem Nome';
    }
    
    document.getElementById('modal-atleta-nome').textContent = `Atleta: ${nomeExibicao}`;
    
    // Gera os botões dos grupos dinamicamente baseados na quantidade ativa selecionada
    const containerGrupos = document.getElementById('modal-grupos-container');
    containerGrupos.innerHTML = '';
    
    for (let i = 1; i <= quantidadeGruposAtivos; i++) {
        const nomeGrupo = `Grupo ${i}`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vba-btn-salvar';
        btn.style.width = '100%';
        btn.style.textAlign = 'center';
        btn.style.marginBottom = '2px';
        btn.textContent = nomeGrupo;
        
        btn.onclick = () => {
            if (!isAtletaEmAlgumGrupo(atletaSelecionadoParaGrupo)) {
                gruposData[nomeGrupo].push({ index: atletaSelecionadoParaGrupo, manualData: {} });
                renderGruposScreen();
            }
            closeSelectGrupoModal();
        };
        
        containerGrupos.appendChild(btn);
    }

    document.getElementById('select-grupo-modal').style.display = 'flex';
}

function closeSelectGrupoModal() {
    document.getElementById('select-grupo-modal').style.display = 'none';
    atletaSelecionadoParaGrupo = null;
}






function mudarOrdenacao(criterio) {
    if (criterioOrdenacaoAtual === criterio) {
        // Se já está ordenado por este critério, inverte a direção (asc <-> desc)
        direcaoOrdenacaoAtual = direcaoOrdenacaoAtual === 'asc' ? 'desc' : 'asc';
    } else {
        // Se mudou de critério, define ele e começa do padrão (asc)
        criterioOrdenacaoAtual = criterio;
        direcaoOrdenacaoAtual = 'asc';
    }

    // Como inserimos os ícones dinamicamente na renderGruposLista, 
    // basta re-renderizar a lista para que a ordenação visual e funcional seja aplicada.
    renderGruposLista();
}


/* === RESTANTE DO CÓDIGO (CONVOCAÇÃO, ETC.) MANTIDO IGUAL === */
/* === RESTANTE DO CÓDIGO (CONVOCAÇÃO, ETC.) MANTIDO IGUAL === */
function ensureConvocacaoModalDom() {
    let modal = document.getElementById('convocacao-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'convocacao-modal';
        modal.style.cssText = `display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.6); z-index: 10000; align-items: center; justify-content: center; padding: 20px;`;
        modal.innerHTML = `
            <div style="background: #fff; width: 100%; max-width: 1250px; height: 90vh; border-radius: 8px; box-shadow: 0 8px 25px rgba(0,0,0,0.3); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #aaa;">
                <div style="background: #f1f1f1; padding: 12px 20px; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 16px;">
                    <span>Atletas - Arraste para mudar de posição</span>
                    <button onclick="closeConvocacaoModal()" style="background: none; border: none; font-size: 18px; font-weight: bold; cursor: pointer; color: #555;">&times;</button>
                </div>
                <div id="convocacao-years-bar" style="padding: 12px 20px; display: flex; gap: 20px; flex-wrap: wrap; background: #fafafa; border-bottom: 1px solid #ddd; align-items: center; justify-content: center;"></div>
                <div style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; background: #fff;">
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                        <div class="drop-box" data-category="goleiros" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Goleiros</div>
                            <div id="conv-list-goleiros" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                        <div class="drop-box" data-category="zagueiros" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Zagueiros</div>
                            <div id="conv-list-zagueiros" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                        <div class="drop-box" data-category="laterais" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Laterais</div>
                            <div id="conv-list-laterais" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                        <div class="drop-box" data-category="volantes" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Volantes</div>
                            <div id="conv-list-volantes" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                        <div class="drop-box" data-category="meias" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Meias</div>
                            <div id="conv-list-meias" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                        <div class="drop-box" data-category="atacantes" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Atacantes</div>
                            <div id="conv-list-atacantes" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                        <div class="drop-box" data-category="extremos" style="border: 1px solid #b2bec3; border-radius: 4px; display: flex; flex-direction: column; background: #fff;">
                            <div style="background: #dfe6e9; padding: 6px; text-align: center; font-weight: bold; border-bottom: 1px solid #b2bec3; font-size: 14px;">Extremos</div>
                            <div id="conv-list-extremos" style="height: 180px; overflow-y: auto; background: #fff; padding: 2px;"></div>
                        </div>
                    </div>
                </div>
                <div style="background: #f1f1f1; padding: 15px 20px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 10px;">
                        <button onclick="carregarConvocacaoSalva()" style="padding: 8px 15px; border: 1px solid #b2bec3; background: #fff; border-radius: 4px; cursor: pointer; font-weight: 600;">Carregar Convocações</button><button onclick="abrirExcluirConvocacaoModal()" style="padding: 8px 15px; border: 1px solid #d32f2f; background: #fff; color: #b30000; border-radius: 4px; cursor: pointer; font-weight: 600;">Excluir Convocação</button>
                        <button onclick="limparConvocacao()" style="padding: 8px 15px; border: 1px solid #b2bec3; background: #fff; border-radius: 4px; cursor: pointer; font-weight: 600;">Limpar Convocação</button>
                        <button onclick="excluirAtletasSelecionadosConvocacao()" style="padding: 8px 15px; border: 1px solid #d32f2f; background: #ff5252; color: #fff; border-radius: 4px; cursor: pointer; font-weight: bold;">Excluir Atletas Selecionados</button>
                    </div>
                    <div id="convocacao-contador" style="font-weight: bold; font-size: 14px; color: #111; padding: 0 15px; white-space: nowrap;">Atletas convocados: 0</div>
                    <div>
                        <button onclick="confirmarConvocacao()" style="padding: 10px 25px; border: none; background: #2ed573; color: #fff; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">Confirmar Convocação</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}
function openConvocacaoModal() { document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active-screen');s.style.display='';}); document.getElementById('home-screen')?.classList.add('active-screen'); if(!convocacaoSessaoAtiva){selectedConvocados.clear();localStorage.removeItem(STORAGE_CONVOCACAO_KEY);localStorage.removeItem('prosol_cfa_escalacao_v1');convocacaoCarregadaNaSessao=false;} convocacaoSessaoAtiva=true; ensureConvocacaoModalDom(); renderConvocacaoScreen(); document.getElementById('convocacao-modal').style.display = 'flex'; }
function closeConvocacaoModal() { document.getElementById('convocacao-modal').style.display = 'none'; }
function renderConvocacaoScreen() {
    const yearsBar = document.getElementById('convocacao-years-bar'); if (!yearsBar) return;
    yearsBar.innerHTML = '';
    ['2009', '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018'].forEach(ano => {
        const label = document.createElement('label'); label.style.cssText = 'display: flex; align-items: center; gap: 5px; cursor: pointer; font-weight: 500;';
        const chk = document.createElement('input'); chk.type = 'checkbox'; chk.value = ano; chk.checked = false; chk.className = 'conv-year-chk'; chk.onchange = renderConvocacaoLists;
        label.appendChild(chk); label.appendChild(document.createTextNode(ano)); yearsBar.appendChild(label);
    });
    renderConvocacaoLists();
}
function atualizarContadorConvocados() {
    const el = document.getElementById('convocacao-contador');
    if (el) el.textContent = 'Atletas convocados: ' + selectedConvocados.size;
}
function renderConvocacaoLists() {
    const selectedYears = Array.from(document.querySelectorAll('.conv-year-chk:checked')).map(chk => chk.value);
    const posLists = { 'goleiros': document.getElementById('conv-list-goleiros'), 'zagueiros': document.getElementById('conv-list-zagueiros'), 'laterais': document.getElementById('conv-list-laterais'), 'volantes': document.getElementById('conv-list-volantes'), 'meias': document.getElementById('conv-list-meias'), 'atacantes': document.getElementById('conv-list-atacantes'), 'extremos': document.getElementById('conv-list-extremos') };
    for (let key in posLists) { if (posLists[key]) posLists[key].innerHTML = ''; }

    document.querySelectorAll('.drop-box').forEach(box => {
        const cat = box.getAttribute('data-category');
        box.ondragover = (e) => e.preventDefault();
        box.ondrop = (e) => { e.preventDefault(); const globalIndex = parseInt(e.dataTransfer.getData('text/plain')); if (!isNaN(globalIndex)) handleAthleteDrop(globalIndex, cat); };
    });

    if (selectedYears.length === 0) { atualizarContadorConvocados(); return; }

    excelData.forEach((row, globalIndex) => {
        let anoAtleta = Object.keys(row).find(k => k.toLowerCase() === 'ano'); anoAtleta = anoAtleta ? String(row[anoAtleta]).trim() : '';
        if (!selectedYears.includes(anoAtleta)) return;

        let nomeExibicao = Object.keys(row).find(k => k.toLowerCase().includes('apelido')); nomeExibicao = nomeExibicao && row[nomeExibicao] ? row[nomeExibicao] : '';
        if (!nomeExibicao) { let nm = Object.keys(row).find(k => k.toLowerCase().includes('nome')); nomeExibicao = nm && row[nm] ? row[nm] : 'Sem Nome'; }
        
        let posicao = Object.keys(row).find(k => k.toLowerCase().includes('posição') || k.toLowerCase().includes('posicao'));
        posicao = posicao ? String(row[posicao]).toLowerCase() : '';
        
        let targetBox = 'meias';
        if (posicao.includes('goleiro')) targetBox = 'goleiros'; else if (posicao.includes('zagueiro')) targetBox = 'zagueiros'; else if (posicao.includes('lateral')) targetBox = 'laterais'; else if (posicao.includes('volante')) targetBox = 'volantes'; else if (posicao.includes('atacante')) targetBox = 'atacantes'; else if (posicao.includes('extremo') || posicao.includes('ponta')) targetBox = 'extremos';

        // Indicadores visuais apenas para identificação na convocação: lesão e cartão vermelho.
        const chaveLesaoConv = Object.keys(row).find(k => k.toLowerCase() === 'lesao');
        const estaLesionadoConv = chaveLesaoConv ? String(row[chaveLesaoConv]).toLowerCase().trim() === 'sim' : false;
        const iconeLesaoConv = estaLesionadoConv ? `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#d63031" style="display:inline-block; vertical-align:-2px; margin-right:4px; flex:0 0 auto;" title="Atleta lesionado">
                <rect x="9" y="2" width="6" height="20" rx="1" fill="#d63031"></rect>
                <rect x="2" y="9" width="20" height="6" rx="1" fill="#d63031"></rect>
            </svg>` : '';

        const chaveCartaoConv = Object.keys(row).find(k => ['cartaovermelho','cartao vermelho','cartão vermelho'].includes(k.toLowerCase().replace(/_/g, ' ').trim()) || k.toLowerCase().replace(/\s+/g,'') === 'cartaovermelho');
        const temCartaoConv = chaveCartaoConv ? String(row[chaveCartaoConv]).toLowerCase().trim() === 'sim' : false;
        const iconeCartaoConv = temCartaoConv ? `
            <svg width="11" height="14" viewBox="0 0 18 24" style="display:inline-block; vertical-align:-3px; margin-right:4px; flex:0 0 auto;" title="Cartão vermelho / suspenso">
                <rect x="3" y="2" width="12" height="20" rx="2" fill="#d63031" stroke="#7a0000" stroke-width="1.5"></rect>
            </svg>` : '';

        const itemDiv = document.createElement('div');
        itemDiv.draggable = true; itemDiv.style.cssText = 'padding: 6px 8px; cursor: grab; display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid #f1f1f1; user-select: none;';
        itemDiv.ondragstart = (e) => { e.dataTransfer.setData('text/plain', globalIndex); };
        if (selectedConvocados.has(globalIndex)) { itemDiv.style.backgroundColor = '#0984e3'; itemDiv.style.color = '#fff'; }
        itemDiv.innerHTML = `<span style="display:flex; align-items:center; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${iconeLesaoConv}${iconeCartaoConv}<span style="overflow:hidden; text-overflow:ellipsis;">${nomeExibicao}</span></span> <span style="font-size: 11px; opacity: 0.8; flex:0 0 auto; margin-left:8px;">${anoAtleta}</span>`;
        itemDiv.onclick = (e) => {
            e.stopPropagation();
            if (selectedConvocados.has(globalIndex)) { selectedConvocados.delete(globalIndex); itemDiv.style.backgroundColor = 'transparent'; itemDiv.style.color = '#000'; }
            else { selectedConvocados.add(globalIndex); itemDiv.style.backgroundColor = '#0984e3'; itemDiv.style.color = '#fff'; }
            atualizarContadorConvocados();
        };
        if (posLists[targetBox]) posLists[targetBox].appendChild(itemDiv);
    });
    atualizarContadorConvocados();
}
function handleAthleteDrop(globalIndex, targetCategory) {
    if (targetCategory === 'goleiros') updateAthletePositionInDatabase(globalIndex, 'Goleiro'); else if (targetCategory === 'zagueiros') updateAthletePositionInDatabase(globalIndex, 'Zagueiro'); else if (targetCategory === 'meias') updateAthletePositionInDatabase(globalIndex, 'Meia'); else if (targetCategory === 'atacantes') updateAthletePositionInDatabase(globalIndex, 'Atacante');
    else if (targetCategory === 'laterais') showPositionChoiceModal(['Lateral Direito', 'Lateral Esquerdo'], (chosen) => updateAthletePositionInDatabase(globalIndex, chosen));
    else if (targetCategory === 'volantes') showPositionChoiceModal(['1º Volante', '2º Volante'], (chosen) => updateAthletePositionInDatabase(globalIndex, chosen));
    else if (targetCategory === 'extremos') showPositionChoiceModal(['Ponta Dir.', 'Ponta Esq.'], (chosen) => updateAthletePositionInDatabase(globalIndex, chosen));
}
function showPositionChoiceModal(options, onSelect) {
    let choiceModal = document.getElementById('position-choice-modal');
    if (!choiceModal) {
        choiceModal = document.createElement('div'); choiceModal.id = 'position-choice-modal';
        choiceModal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 10500; display: flex; align-items: center; justify-content: center;';
        document.body.appendChild(choiceModal);
    }
    choiceModal.style.display = 'flex';
    choiceModal.innerHTML = `<div style="background: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); width: 320px; text-align: center;"><h3 style="margin-bottom: 20px; font-size: 16px; color: #333;">Escolha a Posição Específica</h3><div id="position-choice-buttons" style="display: flex; flex-direction: column; gap: 12px;"></div><button onclick="document.getElementById('position-choice-modal').style.display='none'" style="margin-top: 15px; background: #e0e0e0; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;">Cancelar</button></div>`;
    options.forEach(opt => {
        const btn = document.createElement('button'); btn.textContent = opt; btn.style.cssText = 'padding: 10px; background: #58111a; color: #d4af37; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;';
        btn.onclick = () => { choiceModal.style.display = 'none'; onSelect(opt); };
        document.getElementById('position-choice-buttons').appendChild(btn);
    });
}
function updateAthletePositionInDatabase(globalIndex, newPosition) {
    let posCol = excelColumns.find(c => c.toLowerCase() === 'posição 1' || c.toLowerCase() === 'posicao 1');
    if (!posCol) { posCol = 'Posição 1'; excelColumns.push(posCol); }
    if (excelData[globalIndex]) { excelData[globalIndex][posCol] = newPosition; saveToStorage(); renderConvocacaoLists(); }
}
function limparConvocacao() { selectedConvocados.clear(); renderConvocacaoLists(); }
function confirmarConvocacao() {
    if (selectedConvocados.size === 0) { alert('Nenhum atleta selecionado.'); return; }
    localStorage.setItem(STORAGE_CONVOCACAO_KEY, JSON.stringify(Array.from(selectedConvocados)));
    if(!convocacaoCarregadaNaSessao) localStorage.removeItem('prosol_cfa_escalacao_v1');
    abrirEscalacaoConvocacao();
}

function abrirEscalacaoConvocacao() {
    let modal = document.getElementById('escalacao-convocacao-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'escalacao-convocacao-modal';
        modal.className = 'escalacao-overlay';
        document.body.appendChild(modal);
    }
    const salvo = JSON.parse(localStorage.getItem('prosol_cfa_escalacao_v1') || '{}');
    const ordemPosicoes = ['goleiro','zagueiro','lateral','volante','meia','atacante','extremo','ponta'];
    let atletas = Array.from(selectedConvocados).map(index => {
        const row = excelData[index] || {};
        const nomeKey = Object.keys(row).find(k => k.toLowerCase().includes('apelido')) || Object.keys(row).find(k => k.toLowerCase().includes('nome'));
        const posKey = Object.keys(row).find(k => k.toLowerCase().includes('posição') || k.toLowerCase().includes('posicao'));
        const posicao = posKey && row[posKey] ? String(row[posKey]).toLowerCase() : '';
        const ordem = ordemPosicoes.findIndex(p => posicao.includes(p));
        return { index, nome: nomeKey && row[nomeKey] ? row[nomeKey] : 'Sem Nome', ordem: ordem < 0 ? 99 : ordem };
    }).sort((a,b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
    modal.innerHTML = `<div class="escalacao-card"><div class="escalacao-header"><span>ESCALAÇÃO DA CONVOCAÇÃO</span><button onclick="fecharEscalacaoConvocacao()">×</button></div><p class="escalacao-help">Defina o número e indique se cada atleta é titular ou reserva.</p><div class="escalacao-list">${atletas.map((a,i) => { const v=salvo[a.index]||{}; return `<div class="escalacao-row posicao-${a.ordem}"><span class="escalacao-name">${a.nome}</span><input class="escalacao-numero" data-index="${a.index}" value="${v.numero||''}" placeholder="#" type="number" min="1" max="99"><label><input type="radio" name="status-${a.index}" value="titular" ${v.status==='titular'?'checked':''}> Titular</label><label><input type="radio" name="status-${a.index}" value="reserva" ${v.status==='reserva'||!v.status?'checked':''}> Reserva</label></div>`; }).join('')}</div><div class="escalacao-footer"><span id="escalacao-status"></span><button class="escalacao-field" onclick="salvarEscalacaoConvocacao(); abrirCampoConvocacao()">Confirmar e abrir campo</button></div></div>`;
    modal.style.display = 'flex';
    modal.querySelectorAll('input[type="radio"]').forEach(r=>r.addEventListener('change', atualizarStatusEscalacao));
    atualizarStatusEscalacao();
}
function atualizarStatusEscalacao(){const el=document.getElementById('escalacao-status');if(!el)return;let titulares=0,reservas=0;document.querySelectorAll('#escalacao-convocacao-modal .escalacao-row').forEach(row=>{const r=row.querySelector('input[type="radio"]:checked');if(r?.value==='reserva')reservas++;else if(r?.value==='titular')titulares++;});el.textContent=`Titulares: ${titulares} | Reservas: ${reservas}`;}
function salvarEscalacaoConvocacao() {
    const dados={};
    document.querySelectorAll('#escalacao-convocacao-modal .escalacao-row').forEach(row=>{const input=row.querySelector('.escalacao-numero');const idx=input.dataset.index;const radio=row.querySelector('input[type="radio"]:checked');dados[idx]={numero:input.value,status:radio?radio.value:'titular'};});
    localStorage.setItem('prosol_cfa_escalacao_v1',JSON.stringify(dados));
    atualizarStatusEscalacao();
    alert('Escalação salva com sucesso!');
}
function voltarParaSelecaoConvocacao(){
    salvarEscalacaoConvocacao();
    fecharEscalacaoConvocacao();
    openConvocacaoModal();
    renderConvocacaoScreen();
}
function fecharEscalacaoConvocacao(){const m=document.getElementById('escalacao-convocacao-modal');if(m)m.style.display='none';}
async function carregarConvocacaoSalva(){
 const {data,error}=await _supabase.from('convocacoes').select('nome,dados').order('nome');
 if(error){alert('Erro ao carregar convocações.');return;} if(!data||!data.length){alert('Nenhuma convocação salva.');return;}
 let m=document.getElementById('carregar-convocacao-modal');if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='carregar-convocacao-modal';document.body.appendChild(m);}
 m.innerHTML=`<div class="excluir-card"><h3>Carregar convocação</h3><p>Selecione uma convocação salva:</p><select id="convocacao-para-carregar" size="9">${data.map(x=>`<option value="${x.nome.replace(/"/g,'&quot;')}">${x.nome}</option>`).join('')}</select><div><button class="carregar-btn" onclick="confirmarCarregamentoConvocacao()">Carregar</button><button onclick="document.getElementById('carregar-convocacao-modal').style.display='none'">Cancelar</button></div></div>`;
 m.style.display='flex';
}
function excluirAtletasSelecionadosConvocacao() {
    if (selectedConvocados.size === 0) { alert('Nenhum atleta selecionado.'); return; }
    if (confirm('Deseja remover os atletas selecionados da convocação?')) { selectedConvocados.clear(); localStorage.removeItem(STORAGE_CONVOCACAO_KEY); renderConvocacaoLists(); }
}

// Ativa a rolagem automática (auto-scroll) da tela de grupos ao arrastar um atleta para a beirada
document.addEventListener('DOMContentLoaded', () => {
    const screenScroll = document.getElementById('grupos-screen');
    if (screenScroll) {
        screenScroll.addEventListener('dragover', (e) => {
            const scrollSpeed = 15;
            const edgeSize = 80; // Zona de ativação do scroll nas bordas (pixels)
            const rect = screenScroll.getBoundingClientRect();
            
            // Se o mouse estiver perto da borda inferior durante o arrasto, desce a tela
            if (e.clientY > rect.bottom - edgeSize) {
                screenScroll.scrollTop += scrollSpeed;
            } 
            // Se o mouse estiver perto da borda superior, sobe a tela
            else if (e.clientY < rect.top + edgeSize) {
                screenScroll.scrollTop -= scrollSpeed;
            }
        });
    }
});
/* === FUNÇÃO PARA IMPRIMIR OS GRUPOS EM A4 PAISAGEM (MÉTODO IFRAME ISOLADO) === */
function imprimirGrupos() {
    // 1. Captura os painéis de grupos montados na tela
    const paineisGrupos = document.querySelectorAll('#grupos-screen .grupos-split-view');

    if (paineisGrupos.length === 0) {
        alert("Não há grupos visíveis para imprimir. Certifique-se de formar os grupos primeiro.");
        return;
    }

    // 2. Cria uma janela invisível (iframe) para isolar a impressão do resto do site
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write('<html><head><title>Impressão de Grupos</title>');

    // 3. Copia o seu CSS original para o iframe (para manter as cores, fontes e formatos)
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    styles.forEach(style => {
        doc.write(style.outerHTML);
    });

    // 4. Injeta as regras EXCLUSIVAS de impressão (A4, Paisagem, 1 por página)
    doc.write(`
        <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { 
                background: #fff !important; 
                margin: 0; 
                padding: 0; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }
            .print-grupo-page { 
                page-break-after: always; 
                width: 100%; 
                margin-bottom: 20px;
            }
            .print-grupo-page:last-child { page-break-after: auto; }
            
            /* Limpa sobras visuais indesejadas para o papel */
            .grupos-split-view, .grupos-ficha-panel, .grupos-list-panel { 
                box-shadow: none !important; 
            }
            .grupos-panel-title { 
                background-color: #e50000 !important; 
                color: #fff !important; 
                border-bottom: 2px solid #000 !important; 
            }
            .grupos-data-table th { background-color: #f2f2f2 !important; color: #000 !important; }
            .grupos-data-table th, .grupos-data-table td { border: 1px solid #000 !important; color: #000 !important; }
        </style>
    `);
    doc.write('</head><body>');
    doc.write('<div class="grupos-container">'); // Mantém o container para garantir o alinhamento

    // 5. Clona cada grupo e transforma os inputs em texto puro
    paineisGrupos.forEach(painel => {
        let wrapper = document.createElement('div');
        wrapper.className = 'print-grupo-page';
        
        let clone = painel.cloneNode(true);
        
        let origInputs = painel.querySelectorAll('input');
        let cloneInputs = clone.querySelectorAll('input');
        
        origInputs.forEach((inp, i) => {
            let span = document.createElement('span');
            span.textContent = inp.value;
            span.style.fontWeight = 'bold';
            span.style.color = '#b30000';
            span.style.textAlign = 'center';
            span.style.display = 'block';
            
            if (cloneInputs[i] && cloneInputs[i].parentNode) {
                cloneInputs[i].parentNode.replaceChild(span, cloneInputs[i]);
            }
        });

        wrapper.appendChild(clone);
        doc.write(wrapper.outerHTML);
    });

    doc.write('</div></body></html>');
    doc.close();

    // 6. Aguarda 1 segundo para o navegador carregar o CSS no iframe invisível e aciona a impressão
    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        // Remove o iframe da memória após a impressão
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 1000); 
}
/* Impressão exclusiva das fichas de grupos - independente da ficha do atleta */
function imprimirFichasTreino() {
    const cards = Array.from(document.querySelectorAll('#fichas-render-container .ficha-grupo-card'));
    if (!cards.length) { alert('Nenhuma ficha de grupo foi gerada.'); return; }

    const janela = window.open('', '_blank', 'width=1200,height=800');
    if (!janela) { alert('Permita pop-ups para imprimir as fichas.'); return; }

    const paginas = cards.map(card => {
        const clone = card.cloneNode(true);
        clone.querySelectorAll('input').forEach(input => {
            const span = document.createElement('span');
            span.textContent = input.value;
            span.style.fontWeight = 'bold';
            input.replaceWith(span);
        });
        return clone.outerHTML;
    }).join('');

    janela.document.write(`<!doctype html><html><head><meta charset="UTF-8">
    <title>Fichas de Grupos</title><style>
    @page { size: A4 landscape; margin: 6mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html,body { margin:0; padding:0; background:#fff; font-family:Arial,sans-serif; color:#000; }
    .ficha-grupo-card { width:100%; max-width:none; margin:0 0 12px 0; padding:15px; background:#fff; border:2px solid #000; page-break-after:always; break-after:page; box-shadow:none; }
    .ficha-grupo-card:last-child { page-break-after:auto; break-after:auto; }
    .ficha-header-title { background:#d9d9d9; font-size:26px; font-weight:bold; text-align:center; padding:10px; border:2px solid #000; margin-bottom:-1px; }
    .ficha-table { width:100%; border-collapse:collapse; font-size:12px; color:#000; text-align:center; }
    .ficha-table th,.ficha-table td { border:1.5px solid #000; padding:4px; vertical-align:middle; }
    .ficha-table input { width:100%; border:0; background:transparent; text-align:center; font-size:12px; font-weight:bold; color:inherit; }
    .row-media { background:#000 !important; color:#fff !important; font-weight:bold; font-style:italic; }
    .side-label { writing-mode:vertical-rl; transform:rotate(180deg); font-weight:bold; font-size:14px; text-align:center; background:#e0e0e0; width:32px; }
    .mmi-header { background:#c5d9f1; font-weight:bold; } .mmi-reps { background:#000; color:#fff; font-weight:bold; } .mmi-weight { background:#b8cce4; font-weight:bold; }
    .proto-header { background:#d9d9d9; font-weight:bold; } .proto-banner { background:#000; color:#fff; font-weight:bold; font-size:11px; } .proto-weight { background:#f2f2f2; font-weight:bold; }
    .hiit-header { background:#fde9d9; font-weight:bold; } .hiit-footer { background:#fcd5b4; font-weight:bold; font-size:13px; }
    </style></head><body>${paginas}</body></html>`);
    janela.document.close();
    janela.onload = () => setTimeout(() => { janela.focus(); janela.print(); }, 400);
}

/* Prancheta virtual: implementação final mini-campo localizada ao final do arquivo. */

function posicaoInicialCampo(numero, indice) {
 const n=Number(numero);
 const mapa={1:[50,90],2:[80,70],3:[60,70],4:[40,70],6:[20,70],5:[70,48],10:[50,48],8:[30,48],7:[75,25],9:[50,25],11:[25,25]};
 return mapa[n] || [50,50];
}
function abrirCampoConvocacao(){
 const salvo=JSON.parse(localStorage.getItem('prosol_cfa_escalacao_v1')||'{}');
 let modal=document.getElementById('campo-convocacao-modal'); if(!modal){modal=document.createElement('div');modal.id='campo-convocacao-modal';modal.className='campo-overlay';document.body.appendChild(modal);}
 const titulares=Object.keys(salvo).filter(i=>salvo[i].status!=='reserva').map(i=>{const r=excelData[i]||{};const nk=Object.keys(r).find(k=>k.toLowerCase().includes('apelido'))||Object.keys(r).find(k=>k.toLowerCase().includes('nome'));const pk=Object.keys(r).find(k=>k.toLowerCase().includes('posição')||k.toLowerCase().includes('posicao'));const pos=String(pk?r[pk]:'').toLowerCase();const dataKey=Object.keys(r).find(k=>k.toLowerCase().includes('nascimento')); const nascimento=dataKey?convertExcelDate(r[dataKey]):''; return {nome:nk&&r[nk]||'Sem Nome',num:salvo[i].numero||'',pos,nascimento};});
 const ordem=['goleiro','zagueiro','lateral','volante','meia','atacante','extremo'];titulares.sort((a,b)=>ordem.findIndex(x=>a.pos.includes(x))-ordem.findIndex(x=>b.pos.includes(x)));
 const reservas=Object.keys(salvo).filter(i=>salvo[i].status==='reserva').sort((a,b)=>(Number(salvo[a].numero)||999)-(Number(salvo[b].numero)||999));
 modal.innerHTML=`<div class="campo-card"><div class="campo-top"><b>CONVOCAÇÃO — ESCALAÇÃO</b><div class="campo-acoes"><button onclick="salvarConvocacaoNuvem()">💾 Salvar Convocação</button><button onclick="imprimirConvocacaoCampo()">🖨 Imprimir</button><button onclick="abrirMinutagemConvocacao()">⏱ Minutagem</button><button onclick="abrirArbitragemConvocacao()">⚖ Arbitragem</button><button class="campo-fechar" onclick="fecharCampoConvocacao()">×</button></div></div><div class="campo-layout"><aside><h3>SUPLENTES</h3><div class="campo-reservas">${reservas.map(i=>{const r=excelData[i]||{};const nk=Object.keys(r).find(k=>k.toLowerCase().includes('apelido'))||Object.keys(r).find(k=>k.toLowerCase().includes('nome'));const dataKey=Object.keys(r).find(k=>k.toLowerCase().includes('nascimento')); const nascimento=dataKey?convertExcelDate(r[dataKey]):''; return `<div class="reserva-item"><span>${salvo[i].numero||''} - ${nk&&r[nk]||'Sem Nome'}</span><span class="reserva-data">${nascimento}</span></div>`}).join('')}</div><h3>COMISSÃO TÉCNICA</h3><label class="comissao-label">Técnico:<input class="campo-edit" placeholder=""></label><label class="comissao-label">Aux. Técnico:<input class="campo-edit" placeholder=""></label><label class="comissao-label">Prep. Físico:<input class="campo-edit" placeholder=""></label><label class="comissao-label">Trein. Goleiros:<input class="campo-edit" placeholder=""></label></aside><main><div class="campo-futebol"><div class="linha-meio"></div><div class="circulo-meio"></div>${titulares.map((a,i)=>`<div class="jogador-campo" style="left:${posicaoInicialCampo(a.num,i)[0]}%;top:${posicaoInicialCampo(a.num,i)[1]}%" data-x=""><img src="${a.pos.includes('goleiro')?'camiseta_goleiro.png':'camiseta_linha.png'}"><span>${a.num} ${a.nome}<small>${a.nascimento}</small></span></div>`).join('')}</div><div class="campo-detalhes"><div class="campo-faixa"><input placeholder="Horário"><span> - </span><input placeholder="Local"><span> - </span><input placeholder="Data"></div><div class="campo-info-jogo"><div class="campo-adversario"><img src="logo.png"><b>×</b><input placeholder="Nome do adversário"></div><div class="campo-horarios"><label>Apresentação: <input placeholder=""></label><label>Preleção: <input placeholder=""></label><label>Aquecimento: <input placeholder=""></label></div></div></div></main></div></div>`;
 modal.style.display='flex';
 const carregada=window.__convocacaoCarregada;if(carregada){const faixa=[...modal.querySelectorAll('.campo-faixa input')];[carregada.horario,carregada.local,carregada.data].forEach((v,i)=>{if(faixa[i])faixa[i].value=v||''});const adv=modal.querySelector('.campo-adversario input');if(adv)adv.value=carregada.adversario||'';const hs=[...modal.querySelectorAll('.campo-horarios input')];[carregada.apresentacao,carregada.prelecao,carregada.aquecimento].forEach((v,i)=>{if(hs[i])hs[i].value=v||''});const cs=[...modal.querySelectorAll('.comissao-label input')];(carregada.comissao||[]).forEach((v,i)=>{if(cs[i])cs[i].value=v});
  const ps=carregada.jogadores||[];modal.querySelectorAll('.jogador-campo').forEach(el=>{const t=el.querySelector('span')?.innerText||'';const p=ps.find(x=>x.texto===t);if(p){el.style.left=p.left;el.style.top=p.top}});
 }
 modal.querySelectorAll('.jogador-campo').forEach(makeCampoDraggable);
}
function makeCampoDraggable(el){
 let dragging=false,dx=0,dy=0;
 el.addEventListener('pointerdown',e=>{e.preventDefault();dragging=true;const r=el.getBoundingClientRect();dx=e.clientX-(r.left+r.width/2);dy=e.clientY-(r.top+r.height/2);el.setPointerCapture(e.pointerId);el.classList.add('arrastando');});
 el.addEventListener('pointermove',e=>{if(!dragging)return;const area=el.parentElement.getBoundingClientRect();let x=((e.clientX-dx-area.left)/area.width)*100;let y=((e.clientY-dy-area.top)/area.height)*100;el.style.left=Math.max(2,Math.min(98,x))+'%';el.style.top=Math.max(4,Math.min(96,y))+'%';});
 el.addEventListener('pointerup',e=>{dragging=false;el.releasePointerCapture?.(e.pointerId);el.classList.remove('arrastando');});
 el.addEventListener('pointercancel',()=>{dragging=false;el.classList.remove('arrastando');});
}
function fecharCampoConvocacao(){const m=document.getElementById('campo-convocacao-modal');if(m)m.style.display='none';}

/* Impressão e PDF exclusivos da convocação */
function imprimirConvocacaoCampo(){
 const modal=document.getElementById('campo-convocacao-modal');if(!modal)return;
 const card=modal.querySelector('.campo-card');const layout=document.createElement('div');layout.id='print-convocacao-layout';
 layout.innerHTML='<img class="print-base" src="BASE limpa .png"><div class="print-title">CONVOCAÇÃO — ESCALAÇÃO</div><div class="print-side"></div><div class="print-bottom"></div><div class="print-players"></div>';
 const side=layout.querySelector('.print-side');const aside=card.querySelector('aside');if(aside){side.innerHTML=aside.innerHTML;aside.querySelectorAll('input').forEach((x,i)=>{const y=side.querySelectorAll('input')[i];if(y)y.value=x.value;});}
 const bottom=layout.querySelector('.print-bottom');const details=card.querySelector('.campo-detalhes');if(details){bottom.innerHTML=details.innerHTML;details.querySelectorAll('input').forEach((x,i)=>{const y=bottom.querySelectorAll('input')[i];if(y)y.value=x.value;});}
 const origemCampo=card.querySelector('.campo-futebol'), rCampo=origemCampo.getBoundingClientRect(), rCard=card.getBoundingClientRect();
 card.querySelectorAll('.jogador-campo').forEach(p=>{const q=p.cloneNode(true),r=p.getBoundingClientRect();q.style.left=(((r.left+r.width/2-rCard.left)/rCard.width)*100)+'%';q.style.top=(((r.top+r.height/2-rCard.top)/rCard.height)*100)+'%';layout.querySelector('.print-players').appendChild(q)});
 document.body.appendChild(layout);document.body.classList.add('printing-dedicated-convocacao');
 const clean=()=>{document.body.classList.remove('printing-dedicated-convocacao');layout.remove();window.removeEventListener('afterprint',clean)};window.addEventListener('afterprint',clean);window.print();setTimeout(clean,1500);
}

function identidadeAtleta(index){const r=excelData[index]||{};const nk=Object.keys(r).find(k=>k.toLowerCase().includes('nome completo'))||Object.keys(r).find(k=>k.toLowerCase().includes('nome'));const dk=Object.keys(r).find(k=>k.toLowerCase().includes('data de nascimento')||k.toLowerCase().includes('nascimento'));const ak=Object.keys(r).find(k=>k.toLowerCase()==='ano');return {nome:nk?String(r[nk]||'').trim():'',nascimento:dk?String(r[dk]||'').trim():'',ano:ak?String(r[ak]||'').trim():''};}
function localizarAtletaPorIdentidade(id){return excelData.findIndex(r=>{const x=identidadeAtleta(excelData.indexOf(r));return x.nome===id.nome&&x.nascimento===id.nascimento});}

function normalizarTextoIdentidadeConvocacao(valor){
 return String(valor||'').trim().replace(/\s+/g,' ');
}
function normalizarNascimentoIdentidadeConvocacao(valor){
 return normalizarTextoIdentidadeConvocacao(convertExcelDate(valor)||valor);
}
function nomeCompletoAtletaConvocacao(index){
 const r=excelData[index]||{};
 const nk=Object.keys(r).find(k=>k.toLowerCase().includes('nome completo'))||Object.keys(r).find(k=>k.toLowerCase()==='nome')||Object.keys(r).find(k=>k.toLowerCase().includes('nome'));
 return normalizarTextoIdentidadeConvocacao(nk?r[nk]:'');
}
function nascimentoAtletaConvocacao(index){
 const r=excelData[index]||{};
 const dk=Object.keys(r).find(k=>k.toLowerCase().includes('data de nascimento')||k.toLowerCase().includes('nascimento'));
 return normalizarNascimentoIdentidadeConvocacao(dk?r[dk]:'');
}
function identidadeAtletaConvocacao(index){
 return { nomeCompleto: nomeCompletoAtletaConvocacao(index), nascimento: nascimentoAtletaConvocacao(index) };
}
function chaveIdentidadeConvocacao(id){
 return normalizarTextoIdentidadeConvocacao(id?.nomeCompleto||id?.nome||'')+'||'+normalizarNascimentoIdentidadeConvocacao(id?.nascimento||'');
}
function localizarAtletaPorIdentidadeConvocacao(id){
 const chave=chaveIdentidadeConvocacao(id);
 if(!chave || chave==='||') return -1;
 return excelData.findIndex((row,index)=>chaveIdentidadeConvocacao(identidadeAtletaConvocacao(index))===chave);
}
function escalacaoPorIdentidadeConvocacao(escalacaoPorIndice){
 const out={};
 Array.from(selectedConvocados).forEach(index=>{
  const id=identidadeAtletaConvocacao(index);
  const chave=chaveIdentidadeConvocacao(id);
  if(chave && chave!=='||') out[chave]=escalacaoPorIndice?.[index]||{};
 });
 return out;
}
function restaurarEscalacaoPorIndiceConvocacao(escalacaoPorIdentidade, indices){
 const out={};
 (indices||[]).forEach(index=>{
  const chave=chaveIdentidadeConvocacao(identidadeAtletaConvocacao(index));
  if(escalacaoPorIdentidade && escalacaoPorIdentidade[chave]) out[index]=escalacaoPorIdentidade[chave];
 });
 return out;
}

async function salvarConvocacaoNuvem(){
 const {data,error}=await _supabase.from('convocacoes').select('nome').order('nome');
 if(error){alert('Erro ao consultar convocações.');return;}
 let m=document.getElementById('salvar-convocacao-modal');if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='salvar-convocacao-modal';document.body.appendChild(m);}
 m.innerHTML=`<div class="excluir-card salvar-card"><h3>Salvar convocação</h3><p>Digite um nome novo ou selecione uma convocação para substituir.</p><input id="nome-nova-convocacao" class="nome-convocacao-input" placeholder="Nome da convocação"><select id="convocacao-para-substituir" size="7"><option value="">— Nova convocação —</option>${(data||[]).map(x=>`<option value="${x.nome.replace(/"/g,'&quot;')}">${x.nome}</option>`).join('')}</select><div><button class="carregar-btn" onclick="confirmarSalvarConvocacao()">Salvar</button><button onclick="document.getElementById('salvar-convocacao-modal').style.display='none'">Cancelar</button></div></div>`;
 m.querySelector('#convocacao-para-substituir').onchange=e=>{if(e.target.value)m.querySelector('#nome-nova-convocacao').value=e.target.value;};m.style.display='flex';
}
async function confirmarSalvarConvocacao(){
 const nome=document.getElementById('nome-nova-convocacao')?.value.trim();if(!nome)return alert('Digite ou selecione um nome.');
 const salvo=JSON.parse(localStorage.getItem('prosol_cfa_escalacao_v1')||'{}');const faixa=[...document.querySelectorAll('#campo-convocacao-modal .campo-faixa input')].map(x=>x.value);const horarios=[...document.querySelectorAll('#campo-convocacao-modal .campo-horarios input')].map(x=>x.value);const comissao=[...document.querySelectorAll('#campo-convocacao-modal .comissao-label input')].map(x=>x.value);const jogadores=[...document.querySelectorAll('#campo-convocacao-modal .jogador-campo')].map(el=>({texto:el.querySelector('span')?.innerText||'',left:el.style.left,top:el.style.top}));const anos=[...document.querySelectorAll('.conv-year-chk:checked')].map(x=>x.value);
 const selecionadosDetalhes=[...selectedConvocados].map(identidadeAtletaConvocacao).filter(id=>id.nomeCompleto&&id.nascimento);
 const dados={nome,anos,selecionadosDetalhes,escalacao:escalacaoPorIdentidadeConvocacao(salvo),jogadores,comissao,horario:faixa[0]||'',local:faixa[1]||'',data:faixa[2]||'',adversario:document.querySelector('#campo-convocacao-modal .campo-adversario input')?.value||'',apresentacao:horarios[0]||'',prelecao:horarios[1]||'',aquecimento:horarios[2]||''};
 const {error}=await _supabase.from('convocacoes').upsert({nome,dados,atualizado_em:new Date().toISOString()},{onConflict:'nome'});if(error){alert('Erro ao salvar convocação.');console.error(error);return;}document.getElementById('salvar-convocacao-modal').style.display='none';alert('Convocação salva com sucesso!');
}


async function confirmarCarregamentoConvocacao(){
 const select=document.getElementById('convocacao-para-carregar');if(!select||!select.value)return alert('Selecione uma convocação.');
 const {data,error}=await _supabase.from('convocacoes').select('nome,dados').eq('nome',select.value).single();
 if(error||!data){alert('Não foi possível carregar a convocação.');return;}
 const d=data.dados||{};window.__convocacaoCarregada=d;convocacaoCarregadaNaSessao=true;const indices=(d.selecionadosDetalhes||[]).map(localizarAtletaPorIdentidadeConvocacao).filter(i=>i>=0);if(!indices.length){alert('Nenhum atleta desta convocação foi localizado pelo Nome Completo + Data de Nascimento.');return;}selectedConvocados=new Set(indices);localStorage.setItem(STORAGE_CONVOCACAO_KEY,JSON.stringify([...selectedConvocados]));localStorage.setItem('prosol_cfa_escalacao_v1',JSON.stringify(restaurarEscalacaoPorIndiceConvocacao(d.escalacao||{},indices)));
 document.querySelectorAll('.conv-year-chk').forEach(c=>c.checked=(d.anos||[]).includes(c.value));renderConvocacaoLists();document.getElementById('carregar-convocacao-modal').style.display='none';abrirEscalacaoConvocacao();
}

async function abrirExcluirConvocacaoModal(){
 const {data,error}=await _supabase.from('convocacoes').select('nome').order('nome');
 if(error){alert('Erro ao consultar convocações.');return;} if(!data||!data.length){alert('Nenhuma convocação salva.');return;}
 let m=document.getElementById('excluir-convocacao-modal');if(!m){m=document.createElement('div');m.id='excluir-convocacao-modal';m.className='escalacao-overlay';document.body.appendChild(m);}
 m.innerHTML=`<div class="excluir-card"><h3>Excluir convocação</h3><select id="convocacao-para-excluir" size="8">${data.map(x=>`<option value="${x.nome.replace(/"/g,'&quot;')}">${x.nome}</option>`).join('')}</select><div><button onclick="excluirConvocacaoSelecionada()">Excluir</button><button onclick="document.getElementById('excluir-convocacao-modal').style.display='none'">Cancelar</button></div></div>`;m.style.display='flex';
}
async function excluirConvocacaoSelecionada(){const s=document.getElementById('convocacao-para-excluir');if(!s||!s.value)return alert('Selecione uma convocação.');if(!confirm('Excluir '+s.value+' permanentemente?'))return;const {error}=await _supabase.from('convocacoes').delete().eq('nome',s.value);if(error){alert('Erro ao excluir.');return;}document.getElementById('excluir-convocacao-modal').style.display='none';alert('Convocação excluída.');}

function exportarConvocacaoPDF(){
 // Exportação robusta: usa a impressão da própria convocação.
 // No diálogo do navegador, escolha "Microsoft Print to PDF" ou "Salvar como PDF".
 imprimirConvocacaoCampo();
}

function abrirArbitragemConvocacao(){
 const salvo=JSON.parse(localStorage.getItem('prosol_cfa_escalacao_v1')||'{}');
 const lista=Object.keys(salvo).map(i=>{const r=excelData[i]||{};const nomeKey=Object.keys(r).find(k=>k.toLowerCase().includes('nome completo'))||Object.keys(r).find(k=>k.toLowerCase()==='nome');const apelidoKey=Object.keys(r).find(k=>k.toLowerCase().includes('apelido'));const dataKey=Object.keys(r).find(k=>k.toLowerCase().includes('nascimento'));return{numero:salvo[i].numero||'',nome:nomeKey?r[nomeKey]||'':'',apelido:apelidoKey?r[apelidoKey]||'':'',nascimento:dataKey?convertExcelDate(r[dataKey]):''}}).sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
 const w=window.open('','_blank','width=800,height=800');if(!w)return;
 const linhas=lista.map(a=>`<tr><td>${a.numero}</td><td>${a.nome}</td><td>${a.apelido}</td><td>${a.nascimento}</td></tr>`).join('');
 w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Arbitragem</title><style>@page{size:A4 portrait;margin:8mm}*{box-sizing:border-box}body{font-family:Arial;margin:0}.ficha{border:1px solid #111;min-height:0;height:auto}.cab{height:38mm;border-bottom:1px solid #111;display:flex;align-items:center;padding:8px 20px;gap:100px}.cab img{width:32mm;height:32mm;object-fit:contain}.cab h1{font-size:28px;margin:0}.tab{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px}.tab th{text-align:left;border-bottom:1px solid #111;padding:4px}.tab td{height:15px;border-bottom:1px dotted #111;border-right:1px dotted #111;padding:2px 4px}.tab th:nth-child(1),.tab td:nth-child(1){width:11%;font-weight:bold}.tab th:nth-child(2),.tab td:nth-child(2){width:46%;font-weight:bold}.tab th:nth-child(2),.tab td:nth-child(2){width:46%}.tab th:nth-child(3),.tab td:nth-child(3){width:23%}.tab th:nth-child(4),.tab td:nth-child(4){width:20%}</style></head><body><div class="ficha"><div class="cab"><img src="logo.png"><h1>CFA Prosol</h1></div><table class="tab"><thead><tr><th>Número</th><th>Nome Completo</th><th>Apelido</th><th>Data Nasc.</th></tr></thead><tbody>${linhas}</tbody></table></div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close();
}

function abrirMinutagemConvocacao(){
 const salvo=JSON.parse(localStorage.getItem('prosol_cfa_escalacao_v1')||'{}');const adv=document.querySelector('#campo-convocacao-modal .campo-adversario input')?.value||'';const data=document.querySelector('#campo-convocacao-modal .campo-faixa input:nth-of-type(3)')?.value||'';
 const arr=Object.keys(salvo).map(i=>{const r=excelData[i]||{};const nk=Object.keys(r).find(k=>k.toLowerCase().includes('apelido'))||Object.keys(r).find(k=>k.toLowerCase().includes('nome'));return{n:salvo[i].numero||'',nome:nk&&r[nk]||'' ,res:salvo[i].status==='reserva'}});const tit=arr.filter(x=>!x.res).sort((a,b)=>(Number(a.n)||999)-(Number(b.n)||999)),sup=arr.filter(x=>x.res).sort((a,b)=>(Number(a.n)||999)-(Number(b.n)||999));
 const linha=(x,i)=>`<tr><td>${x.n}</td><td>${x.nome}</td><td></td><td class="box"></td><td class="box"></td><td class="tempo-box"></td><td class="minuto"></td><td class="tempo-box"></td><td></td><td></td><td class="box"></td><td class="box"></td></tr>`;const supl=sup.map(x=>`<tr><td>${x.n}</td><td>${x.nome}</td></tr>`).join('');
 const w=window.open('','_blank','width=1100,height=800');if(!w)return;w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Minutagem</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial;margin:0;font-size:12px}.head{height:92px;display:flex;align-items:center;justify-content:center;gap:35px}.head img{width:82px}.sq{width:64px;height:38px;border:3px solid #111}.x{font-size:34px;font-weight:bold}.adv{font-size:22px;font-weight:bold}.tbl{width:100%;border-collapse:collapse;table-layout:fixed}.tbl th{text-align:center;height:23px}.tbl td{height:18px;border:1px solid #111;padding:1px 4px}.tbl td:nth-child(1){width:52px;text-align:center;border-right:0}.tbl td:nth-child(2){width:180px;text-align:left}.tbl td:nth-child(3){width:55px}.tbl td:nth-child(4),.tbl td:nth-child(5),.tbl td:nth-child(9),.tbl td:nth-child(10){width:62px}.tbl td.box,.tbl td.tempo-box,.tbl td.minuto{border:1px solid #111!important;background:#fff;height:16px}.tbl th:nth-child(1),.tbl td:nth-child(1){font-size:10px!important;width:32px!important;min-width:32px!important;max-width:32px!important;text-align:center!important}.tbl td:nth-child(7),.tbl th:nth-child(7){text-align:center!important} .tbl th:nth-child(3),.tbl td:nth-child(3),.tbl th:nth-child(10),.tbl td:nth-child(10){width:42px!important;min-width:42px!important;max-width:42px!important;padding:1px!important;text-align:center!important;white-space:nowrap}.tbl th:nth-child(4),.tbl td:nth-child(4),.tbl th:nth-child(5),.tbl td:nth-child(5),.tbl th:nth-child(11),.tbl td:nth-child(11),.tbl th:nth-child(12),.tbl td:nth-child(12){width:40px!important;min-width:40px!important;max-width:40px!important;padding:1px!important;text-align:center!important;white-space:nowrap}.tbl th:nth-child(6),.tbl td:nth-child(6),.tbl th:nth-child(8),.tbl td:nth-child(8){width:32px!important;min-width:32px!important;max-width:32px!important;padding:1px!important;text-align:center!important;white-space:nowrap}.tbl th:nth-child(7),.tbl td:nth-child(7){width:58px!important;min-width:58px!important;max-width:58px!important;text-align:center!important}.ca{background:#ff0}.cv{color:red}.bar{background:#c00;color:#fff;text-align:center;font-weight:bold;height:18px}.bottom{display:grid;grid-template-columns:240px 1fr;gap:60px}.sup td{height:15px;border-bottom:1px solid #111;border-right:2px dotted #111}.info{margin-top:15px;font-size:20px;text-align:center}.check{display:inline-block;width:36px;height:34px;border:2px solid #e33;vertical-align:middle;margin:8px 15px}.notes{border:3px solid #111;height:90px;margin-top:0;padding:4px;font-size:12px}</style></head><body><div class="head"><img src="logo.png"><span class="sq"></span><span class="x">X</span><span class="sq"></span><span class="adv">${adv||'Adversário'}</span></div><table class="tbl"><thead><tr><th>Número</th><th>Titulares</th><th>Gols</th><th class="ca">C.A.</th><th class="cv">C.V.</th><th>1º</th><th>Minuto</th><th>2º</th><th>Suplentes</th><th>Gols</th><th class="ca">C.A.</th><th class="cv">C.V.</th></tr></thead><tbody>${tit.map(linha).join('')}<tr><td colspan="12" class="bar">Suplentes</td></tr></tbody></table><div class="bottom"><table class="sup"><tbody>${supl}</tbody></table><div><div class="info"><b>Data:</b> ${data||'____/____/______'}<br><span class="check"></span> Casa <span class="check"></span> Fora</div><div class="notes">Informações adicionais</div></div></div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close();
}

/* Atualiza a tela após 10 minutos sem atividade, evitando manter uma cópia antiga aberta */
let timerInatividadeSistema;
const TEMPO_INATIVIDADE_SISTEMA = 10 * 60 * 1000;
let inicioInatividadeSistema=Date.now();
function atualizarRelogioInatividade(){
    let el=document.getElementById('relogio-inatividade-sistema');
    if(!el){el=document.createElement('div');el.id='relogio-inatividade-sistema';el.title='Tempo para atualização automática';document.body.appendChild(el);}
    const restante=Math.max(0,TEMPO_INATIVIDADE_SISTEMA-(Date.now()-inicioInatividadeSistema));
    const minutos=String(Math.floor(restante/60000)).padStart(2,'0');
    const segundos=String(Math.floor(restante%60000/1000)).padStart(2,'0');
    el.textContent='↻ '+minutos+':'+segundos;
}
function reiniciarTimerInatividadeSistema(){
    clearTimeout(timerInatividadeSistema);inicioInatividadeSistema=Date.now();atualizarRelogioInatividade();
    timerInatividadeSistema=setTimeout(()=>window.location.reload(),TEMPO_INATIVIDADE_SISTEMA);
}
function iniciarRelogioInatividadeSistema(){
    ['mousedown','keydown','input','change','scroll','touchstart','pointerdown'].forEach(evt=>document.addEventListener(evt,reiniciarTimerInatividadeSistema,{passive:true}));
    reiniciarTimerInatividadeSistema();
    setInterval(atualizarRelogioInatividade,1000);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',iniciarRelogioInatividadeSistema); else iniciarRelogioInatividadeSistema();


/* === MÓDULO JOGOS === */
function openJogosProfessorModal(){
 let m=document.getElementById('jogos-professor-modal');if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='jogos-professor-modal';document.body.appendChild(m)}
 const professores=['Christian Rondina','Eric Bergmann','Roberto Fonseca Jr.','Roberto Fonseca Jr. Sub 14','Vinícius Bolonheze'];
 m.innerHTML=`<div class="jogos-professor-card"><h3>Selecione o professor</h3><p>Escolha o banco de dados que deseja acessar:</p><div>${professores.map(p=>`<button onclick="selecionarProfessorJogos('${p}')">${p}</button>`).join('')}</div><button class="cancelar-jogos" onclick="document.getElementById('jogos-professor-modal').style.display='none'">Cancelar</button></div>`;
 m.style.display='flex';
}
function selecionarProfessorJogos(professor){
 professorJogosAtual=professor;const m=document.getElementById('jogos-professor-modal');if(m)m.style.display='none';
 document.querySelectorAll('.screen').forEach(x=>{x.classList.remove('active-screen');x.style.display=''});const g=document.getElementById('generic-screen');g.classList.add('active-screen');g.style.display='flex';renderJogosScreen();
}
function renderJogosScreen(){
 const box=document.getElementById('generic-content');if(!box)return;
 const qtdAtivos=contarAtletasAtivosJogos();
 const modoAtivos=getJogosAtivosConfigRaw()===null?`${qtdAtivos} atleta(s) disponíveis`: `${qtdAtivos} atleta(s) ativo(s)`;
 box.innerHTML=`<div class="jogos-header"><h2>Jogos — ${professorJogosAtual||''}</h2><p>Banco de dados individual do professor<br><small>${modoAtivos}</small></p></div><div id="jogos-salvos-lista" class="jogos-salvos-lista"><p>Carregando jogos salvos...</p></div><button class="atletas-ativos-fab" onclick="abrirAtletasAtivosJogos()">Atletas Ativos <span>${qtdAtivos}</span></button><button class="novo-jogo-fab" onclick="novoJogo()">Novo Jogo</button>`;
 carregarJogosSalvosProfessor();
}

function getJogosAtivosTempSet(){
 if(!window.__jogosAtivosTempSet) window.__jogosAtivosTempSet=new Set();
 return window.__jogosAtivosTempSet;
}

function chaveJogosAtivosProfessor(professor=professorJogosAtual){
 return 'prosol_cfa_jogos_ativos_v1_'+encodeURIComponent(professor||'geral');
}
function getJogosAtivosConfigRaw(){
 const raw=localStorage.getItem(chaveJogosAtivosProfessor());
 if(raw===null)return null;
 try{return JSON.parse(raw)||[]}catch(e){return []}
}
function normalizarTextoProfessorJogos(valor){
 return String(valor||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function anosPadraoJogosProfessor(professor=professorJogosAtual){
 const nome=normalizarTextoProfessorJogos(professor);
 if(nome.includes('christian')) return ['2015','2016','2017','2018'];
 if(nome.includes('eric')) return ['2014'];
 if(nome.includes('vinicius')) return ['2013'];
 if(nome.includes('roberto') && (nome.includes('sub 14') || nome.includes('sub14'))) return ['2012'];
 if(nome.includes('roberto')) return ['2009','2010','2011','2012'];
 return ['2013'];
}
function nomeAtletaJogos(row){
 const nk=Object.keys(row).find(k=>k.toLowerCase().includes('apelido'))||Object.keys(row).find(k=>k.toLowerCase().includes('nome'));
 return nk&&row[nk]?String(row[nk]).trim():'Sem Nome';
}
function anoAtletaJogos(row){return String(valorColunaExata(row,'Ano')||'').trim();}
function posicaoAtletaJogos(row){
 const pk=Object.keys(row).find(k=>k.toLowerCase().includes('posição')||k.toLowerCase().includes('posicao'));
 return pk&&row[pk]?String(row[pk]).trim():'-';
}
function normalizarDataJogos(valor){return String(convertExcelDate(valor)||'').trim();}
function nascimentoAtletaJogos(row){
 const dk=Object.keys(row).find(k=>k.toLowerCase().includes('data de nascimento')||k.toLowerCase().includes('nascimento'));
 return dk?normalizarDataJogos(row[dk]):'';
}
function nomeCompletoAtletaJogos(row){
 const nk=Object.keys(row).find(k=>k.toLowerCase().includes('nome completo'))||Object.keys(row).find(k=>k.toLowerCase()==='nome')||Object.keys(row).find(k=>k.toLowerCase().includes('nome'));
 return nk&&row[nk]?String(row[nk]).trim():'';
}
function identidadeAtletaJogos(index){
 const row=excelData[index]||{};
 return {apelido:nomeAtletaJogos(row),nascimento:nascimentoAtletaJogos(row),nomeCompleto:nomeCompletoAtletaJogos(row),ano:anoAtletaJogos(row)};
}
function localizarAtletaAtivoJogos(id){
 if(id===undefined||id===null)return -1;
 if(typeof id==='number')return id;
 const apelido=String(id.apelido||'').trim();
 const nascimento=normalizarDataJogos(id.nascimento||'');
 const nomeCompleto=String(id.nomeCompleto||id.nome||'').trim();
 const ano=String(id.ano||'').trim();
 let idx=-1;
 if(apelido&&nascimento){
  idx=excelData.findIndex(row=>nomeAtletaJogos(row)===apelido&&nascimentoAtletaJogos(row)===nascimento);
  if(idx>=0)return idx;
 }
 if(apelido&&ano){
  idx=excelData.findIndex(row=>nomeAtletaJogos(row)===apelido&&anoAtletaJogos(row)===ano);
  if(idx>=0)return idx;
 }
 if(nomeCompleto&&nascimento){
  idx=excelData.findIndex(row=>nomeCompletoAtletaJogos(row)===nomeCompleto&&nascimentoAtletaJogos(row)===nascimento);
  if(idx>=0)return idx;
 }
 return -1;
}
function getJogosAtletasAtivosIndices(){
 const cfg=getJogosAtivosConfigRaw();
 if(cfg===null){
  const anosPadrao=anosPadraoJogosProfessor();
  return excelData.map((r,i)=>({r,i})).filter(x=>anosPadrao.includes(anoAtletaJogos(x.r))).map(x=>x.i);
 }
 const indices=cfg.map(item=>localizarAtletaAtivoJogos(item)).filter(i=>Number.isInteger(i)&&i>=0&&excelData[i]);
 return Array.from(new Set(indices));
}
function contarAtletasAtivosJogos(){return getJogosAtletasAtivosIndices().length;}

function abrirAtletasAtivosJogos(){
 const cfgAtivosSalvos=getJogosAtivosConfigRaw();
 window.__jogosAtivosTempSet=new Set((cfgAtivosSalvos===null?[]:getJogosAtletasAtivosIndices()).map(i=>String(i)));
 let m=document.getElementById('atletas-ativos-jogos-modal');
 if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='atletas-ativos-jogos-modal';document.body.appendChild(m)}
 const anos=['2009','2010','2011','2012','2013','2014','2015','2016','2017','2018'];
 m.innerHTML=`<div class="atletas-ativos-card"><div class="novo-jogo-title"><b>Atletas Ativos — ${professorJogosAtual||''}</b><button onclick="document.getElementById('atletas-ativos-jogos-modal').style.display='none'">×</button></div><div class="ativos-toolbar"><input id="busca-atleta-ativo-jogos" placeholder="Buscar atleta..." oninput="renderAtletasAtivosJogosLista()"><div class="ativos-anos">${anos.map(a=>`<label><input type="checkbox" class="jogo-ativo-ano" value="${a}" onchange="renderAtletasAtivosJogosLista()"> ${a}</label>`).join('')}</div><div class="ativos-acoes"><button onclick="marcarAtletasAtivosFiltrados(true)">Marcar filtrados</button><button onclick="marcarAtletasAtivosFiltrados(false)">Desmarcar filtrados</button><button onclick="getJogosAtivosTempSet().clear();renderAtletasAtivosJogosLista()">Limpar</button></div><p>Escolha os atletas que ficarão disponíveis em todos os jogos deste professor. Se nada for salvo, será usado o padrão de anos deste professor.</p></div><div id="jogos-atletas-ativos-lista"></div><div class="ativos-footer"><strong id="jogos-ativos-contador"></strong><div><button class="salvar-jogo" onclick="salvarAtletasAtivosJogos()">Salvar Ativos</button><button class="cancelar-ativos" onclick="document.getElementById('atletas-ativos-jogos-modal').style.display='none'">Cancelar</button></div></div></div>`;
 m.style.display='flex';
 renderAtletasAtivosJogosLista();
}
function getAtletasFiltradosAtivosJogos(){
 const anosSel=Array.from(document.querySelectorAll('#atletas-ativos-jogos-modal .jogo-ativo-ano:checked')).map(x=>x.value);
 const busca=(document.getElementById('busca-atleta-ativo-jogos')?.value||'').toLowerCase().trim();
 return excelData.map((row,index)=>({index,row,nome:nomeAtletaJogos(row),ano:anoAtletaJogos(row),posicao:posicaoAtletaJogos(row)})).filter(a=>{
  if(anosSel.length&& !anosSel.includes(a.ano))return false;
  if(busca&& !(`${a.nome} ${a.ano} ${a.posicao}`.toLowerCase().includes(busca)))return false;
  return true;
 }).sort((a,b)=>a.ano.localeCompare(b.ano)||a.nome.localeCompare(b.nome,'pt-BR'));
}
function renderAtletasAtivosJogosLista(){
 const box=document.getElementById('jogos-atletas-ativos-lista');if(!box)return;
 const atletas=getAtletasFiltradosAtivosJogos();
 box.innerHTML=`<div class="ativo-atleta-head"><span></span><span>Atleta</span><span>Ano</span><span>Posição</span></div>`+atletas.map(a=>`<label class="ativo-atleta-row"><input type="checkbox" ${getJogosAtivosTempSet().has(String(a.index))?'checked':''} onchange="toggleAtletaAtivoJogos(${a.index},this.checked)"><span>${a.nome}</span><span>${a.ano}</span><span>${a.posicao}</span></label>`).join('');
 atualizarContadorAtivosJogos();
}
function toggleAtletaAtivoJogos(index,checked){
 const set=getJogosAtivosTempSet(); if(checked)set.add(String(index));else set.delete(String(index));
 atualizarContadorAtivosJogos();
}
function atualizarContadorAtivosJogos(){
 const el=document.getElementById('jogos-ativos-contador');
 if(el)el.textContent=`Selecionados: ${getJogosAtivosTempSet().size}`;
}
function marcarAtletasAtivosFiltrados(marcar){
 const set=getJogosAtivosTempSet(); getAtletasFiltradosAtivosJogos().forEach(a=>{if(marcar)set.add(String(a.index));else set.delete(String(a.index));});
 renderAtletasAtivosJogosLista();
}
function salvarAtletasAtivosJogos(){
 const indices=Array.from(getJogosAtivosTempSet()).map(x=>parseInt(x)).filter(i=>Number.isInteger(i)&&excelData[i]);
 const payload=indices.map(i=>identidadeAtletaJogos(i));
 localStorage.setItem(chaveJogosAtivosProfessor(),JSON.stringify(payload));
 const m=document.getElementById('atletas-ativos-jogos-modal');if(m)m.style.display='none';
 renderJogosScreen();
 alert('Atletas ativos salvos para '+(professorJogosAtual||'este professor')+'.');
}

function converterDataConvocacaoParaInput(valor){
 if(!valor)return '';
 const s=String(valor).trim();
 let m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
 if(m)return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
 if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
 const d=new Date(s);
 if(!isNaN(d))return d.toISOString().slice(0,10);
 return '';
}
function getConvocacaoJogoAtual(){return window.__jogoConvocacaoAtual||null;}
function indicesConvocadosDoJogo(dados){
 const d=dados||{};
 let indices=[];
 if(Array.isArray(d.selecionadosDetalhes)&&d.selecionadosDetalhes.length){
  indices=d.selecionadosDetalhes.map(id=>localizarAtletaPorIdentidadeConvocacao(id)).filter(i=>Number.isInteger(i)&&i>=0&&excelData[i]);
 }
 return Array.from(new Set(indices));
}
function getIndicesListaNovoJogo(){
 const base=getJogosAtletasAtivosIndices();
 const conv=getConvocacaoJogoAtual();
 const convocados=conv?indicesConvocadosDoJogo(conv.dados):[];
 const editados=Array.isArray(window.__jogoAtletasEditIndices)?window.__jogoAtletasEditIndices:[];
 return Array.from(new Set([...base,...convocados,...editados]));
}
function isAtletaConvocadoNoJogo(index){
 const conv=getConvocacaoJogoAtual();
 if(!conv)return false;
 return indicesConvocadosDoJogo(conv.dados).includes(index);
}
function ordemPosicaoJogos(row){
 const p=String(posicaoAtletaJogos(row)||'').toLowerCase();
 if(p.includes('goleiro'))return 0;
 if(p.includes('zagueiro'))return 1;
 if(p.includes('lateral'))return 2;
 if(p.includes('volante'))return 3;
 if(p.includes('meia'))return 4;
 if(p.includes('atacante'))return 5;
 if(p.includes('extremo')||p.includes('ponta'))return 6;
 return 99;
}
function aplicarStatsEditadasJogoNasLinhas(){
 const mapa=window.__jogoStatsEditMap||{};
 document.querySelectorAll('#novo-jogo-atletas-lista .jogo-atleta-row').forEach(row=>{
  const s=mapa[row.dataset.index];
  if(!s)return;
  const set=(sel,val)=>{const el=row.querySelector(sel);if(el)el.value=val??0;};
  set('.jogo-atleta-minutos',s.minutos);
  set('.jogo-atleta-gols',s.gols);
  set('.jogo-atleta-amarelo',s.amarelo);
  set('.jogo-atleta-vermelho',s.vermelho);
 });
}
function renderNovoJogoListaAtletas(){
 const lista=document.getElementById('novo-jogo-atletas-lista');
 if(!lista)return;
 const conv=getConvocacaoJogoAtual();
 const editando=window.__jogoEditandoAtual||null;
 const editConvSet=window.__jogoConvocadosEditSet instanceof Set?window.__jogoConvocadosEditSet:new Set();
 const cfgAtivosJogo=getJogosAtivosConfigRaw();
 const titulo=document.getElementById('novo-jogo-atletas-titulo');
 const info=document.getElementById('jogo-convocacao-info');
 const convocadosSet=new Set(conv?indicesConvocadosDoJogo(conv.dados):Array.from(editConvSet));
 if(titulo)titulo.textContent=(conv||editando)?'Atletas do Jogo — Convocados Grifados':(cfgAtivosJogo===null?'Atletas disponíveis':'Atletas Ativos');
 if(info){
  if(conv) info.innerHTML=`Convocação carregada: <strong>${conv.nome}</strong>. Atletas convocados estão grifados em verde.`;
  else if(editando) info.innerHTML=`Editando: <strong>${editando.nome}</strong>${editando.convocacaoNome?` — Convocação: <strong>${editando.convocacaoNome}</strong>`:''}. Atletas convocados estão grifados em verde.`;
  else info.innerHTML='Nenhuma convocação carregada.';
 }
 let indices=getIndicesListaNovoJogo();
 if(conv||editando){
  indices=indices.sort((ia,ib)=>{
   const ca=convocadosSet.has(ia), cb=convocadosSet.has(ib);
   if(ca!==cb)return ca?-1:1;
   const ra=excelData[ia]||{}, rb=excelData[ib]||{};
   if(ca&&cb){
    const oa=ordemPosicaoJogos(ra), ob=ordemPosicaoJogos(rb);
    if(oa!==ob)return oa-ob;
   }
   return nomeAtletaJogos(ra).localeCompare(nomeAtletaJogos(rb),'pt-BR');
  });
 }
 const linhas=indices.map(i=>{
  const row=excelData[i]||{};
  const nome=nomeAtletaJogos(row);
  const convocado=convocadosSet.has(i);
  return `<div class="jogo-atleta-row ${convocado?'jogo-convocado':''}" data-index="${i}"><span>${nome}</span><input class="jogo-atleta-minutos" type="number" value="0"><input class="jogo-atleta-gols" type="number" value="0"><input class="jogo-atleta-amarelo" type="number" value="0"><input class="jogo-atleta-vermelho" type="number" value="0"></div>`;
 }).join('');
 lista.innerHTML=`<div class="jogo-atleta-head">Atleta <span>Min.</span><span>Gols</span><span>AM.</span><span>VER.</span></div>${linhas}`;
 aplicarStatsEditadasJogoNasLinhas();
}
async function abrirBuscarConvocacaoJogo(){
 const {data,error}=await _supabase.from('convocacoes').select('nome,dados').order('nome');
 if(error){alert('Erro ao buscar convocações.');console.error(error);return;}
 if(!data||!data.length){alert('Nenhuma convocação salva encontrada.');return;}
 let m=document.getElementById('buscar-convocacao-jogo-modal');
 if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='buscar-convocacao-jogo-modal';document.body.appendChild(m)}
 m.innerHTML=`<div class="buscar-convocacao-jogo-card"><div class="novo-jogo-title"><b>Buscar Convocação</b><button onclick="document.getElementById('buscar-convocacao-jogo-modal').style.display='none'">×</button></div><div class="buscar-convocacao-jogo-body"><p>Selecione uma convocação salva para preencher a data, o adversário e grifar os atletas convocados.</p><select id="convocacao-jogo-select" size="10">${data.map(x=>`<option value="${String(x.nome).replace(/"/g,'&quot;')}">${x.nome}</option>`).join('')}</select><div class="buscar-convocacao-jogo-actions"><button onclick="confirmarBuscarConvocacaoJogo()">Carregar Convocação</button><button onclick="document.getElementById('buscar-convocacao-jogo-modal').style.display='none'">Cancelar</button></div></div></div>`;
 m.style.display='flex';
}
async function confirmarBuscarConvocacaoJogo(){
 const select=document.getElementById('convocacao-jogo-select');
 if(!select||!select.value)return alert('Selecione uma convocação.');
 const {data,error}=await _supabase.from('convocacoes').select('nome,dados').eq('nome',select.value).single();
 if(error||!data){alert('Não foi possível carregar a convocação.');console.error(error);return;}
 const dados=data.dados||{};
 window.__jogoConvocacaoAtual={nome:data.nome,dados};
 const campoData=document.querySelector('#novo-jogo-modal .jogo-data-input');
 const dataFormatada=converterDataConvocacaoParaInput(dados.data||'');
 if(campoData&&dataFormatada)campoData.value=dataFormatada;
 const campoAdversario=document.querySelector('#novo-jogo-modal .jogo-adversario-top');
 if(campoAdversario)campoAdversario.value=dados.adversario||'';
 renderNovoJogoListaAtletas();
 const m=document.getElementById('buscar-convocacao-jogo-modal');if(m)m.style.display='none';
}
function novoJogo(){
 window.__jogoConvocacaoAtual=null;
 window.__jogoEditandoAtual=null;
 window.__jogoAtletasEditIndices=[];
 window.__jogoStatsEditMap={};
 window.__jogoConvocadosEditSet=new Set();
 let m=document.getElementById('novo-jogo-modal');
 if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='novo-jogo-modal';document.body.appendChild(m)}
 const cfgAtivosJogo=getJogosAtivosConfigRaw();
 const tituloAtletasJogo=cfgAtivosJogo===null?'Atletas disponíveis':'Atletas Ativos';
 m.innerHTML=`
  <div class="novo-jogo-card">
   <div class="novo-jogo-title">
    <b>Novo Jogo</b>
    <div class="novo-jogo-title-actions">
     <button class="buscar-convocacao-jogo-btn" onclick="abrirBuscarConvocacaoJogo()">Buscar Convocação</button>
     <button class="carregar-jogo-salvo-btn" onclick="abrirCarregarJogoSalvoModal()">Carregar Jogo</button>
     <button class="novo-jogo-fechar" onclick="document.getElementById('novo-jogo-modal').style.display='none'">×</button>
    </div>
   </div>
   <div class="jogo-placar-header">
    <img src="logo.png">
    <input class="jogo-placar-prosol" type="number" min="0" placeholder="0">
    <b>X</b>
    <input class="jogo-placar-adversario" type="number" min="0" placeholder="0">
    <input class="jogo-adversario-top" placeholder="Adversário">
   </div>
   <div class="jogo-form-top">
    <label>Jogo<select class="jogo-tipo-select"><option>Campeonato</option><option>Amistoso</option><option>Torneio</option></select></label>
    <label>Data<input type="date" class="jogo-data-input"></label>
    <label>Local<select class="jogo-local-select"><option>Casa</option><option>Fora</option></select></label>
    <label class="jogo-caracteristica">Característica<select class="jogo-caracteristica-select"><option>Clube</option><option>Escolinha</option><option>Projeto</option></select></label>
    <label class="jogo-minutos">Minutos do jogo<input class="jogo-minutos-input" type="number" value="" min="0"></label>
   </div>
   <div class="jogo-convocacao-info" id="jogo-convocacao-info">Nenhuma convocação carregada.</div>
   <h3 id="novo-jogo-atletas-titulo">${tituloAtletasJogo}</h3>
   <div class="jogo-atletas" id="novo-jogo-atletas-lista"></div>
   <button class="salvar-jogo" onclick="salvarJogoSupabase()">Salvar Jogo</button>
  </div>`;
 m.style.display='flex';
 renderNovoJogoListaAtletas();
}


function formatarDataJogoBR(dataISO){
 if(!dataISO)return '';
 const m=String(dataISO).match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(m)return `${m[3]}/${m[2]}/${m[1]}`;
 return String(dataISO);
}
function numeroValorJogo(selector){
 const el=document.querySelector(selector);
 const n=parseInt(el?.value||'0',10);
 return isNaN(n)?0:n;
}
function textoValorJogo(selector){return (document.querySelector(selector)?.value||'').trim();}
function apelidoAtletaJogos(row){
 const ak=Object.keys(row||{}).find(k=>k.toLowerCase().includes('apelido'));
 return ak&&row[ak]?String(row[ak]).trim():'';
}
function dadosAtletasJogo(){
 const conv=getConvocacaoJogoAtual();
 const editConvSet=window.__jogoConvocadosEditSet instanceof Set?window.__jogoConvocadosEditSet:new Set();
 const convocadosSet=new Set(conv?indicesConvocadosDoJogo(conv.dados):Array.from(editConvSet));
 return Array.from(document.querySelectorAll('#novo-jogo-atletas-lista .jogo-atleta-row')).map(row=>{
  const index=parseInt(row.dataset.index,10);
  const atleta=excelData[index]||{};
  return {
   nomeCompleto: nomeCompletoAtletaJogos(atleta) || nomeAtletaJogos(atleta),
   apelido: apelidoAtletaJogos(atleta),
   ano: anoAtletaJogos(atleta),
   nascimento: nascimentoAtletaJogos(atleta),
   convocado: convocadosSet.has(index),
   minutos: parseInt(row.querySelector('.jogo-atleta-minutos')?.value||'0',10)||0,
   gols: parseInt(row.querySelector('.jogo-atleta-gols')?.value||'0',10)||0,
   amarelo: parseInt(row.querySelector('.jogo-atleta-amarelo')?.value||'0',10)||0,
   vermelho: parseInt(row.querySelector('.jogo-atleta-vermelho')?.value||'0',10)||0
  };
 });
}
async function proximoNumeroJogoProfessor(professor){
 const {data,error}=await _supabase.from('jogos').select('numero_jogo').eq('professor',professor).order('numero_jogo',{ascending:false}).limit(1);
 if(error)throw error;
 const ultimo=data&&data.length?parseInt(data[0].numero_jogo,10):0;
 return (isNaN(ultimo)?0:ultimo)+1;
}
function escapeHtmlJogos(valor){
 return String(valor??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
async function buscarJogoSalvoPorId(id){
 const {data,error}=await _supabase.from('jogos').select('id,professor,numero_jogo,nome,dados,criado_em').eq('id',id).single();
 if(error||!data){console.error(error);alert('Não foi possível carregar o jogo salvo.');return null;}
 return data;
}
async function carregarJogosSalvosProfessor(){
 const box=document.getElementById('jogos-salvos-lista');if(!box)return;
 const professor=professorJogosAtual||'Geral';
 const {data,error}=await _supabase.from('jogos').select('id,numero_jogo,nome,dados,criado_em').eq('professor',professor).order('numero_jogo',{ascending:false});
 if(error){
  box.innerHTML='<div class="jogos-salvos-card"><strong>Banco de jogos ainda não configurado.</strong><br><small>Crie a tabela <b>jogos</b> no Supabase usando o SQL que combinamos.</small></div>';
  return;
 }
 if(!data||!data.length){box.innerHTML='<div class="jogos-salvos-card">Nenhum jogo salvo para este professor.</div>'+renderEstatisticasJogosProfessor(calcularEstatisticasJogosProfessor([]))+renderBotaoRelatorioJogosProfessor(false);return;}
 const stats=calcularEstatisticasJogosProfessor(data);
 box.innerHTML=`<div class="jogos-salvos-card"><h3>Jogos salvos</h3>${data.map(j=>`<div class="jogo-salvo-item"><strong>${escapeHtmlJogos(j.nome)}</strong><div class="jogo-salvo-acoes"><button title="Editar jogo" onclick="editarJogoSalvoDireto('${j.id}')"><i class="fa-solid fa-pen"></i></button><button title="Ver detalhes" onclick="verDetalhesJogoSalvo('${j.id}')"><i class="fa-solid fa-magnifying-glass"></i></button><button title="Excluir jogo" class="excluir-jogo-salvo" onclick="excluirJogoSalvo('${j.id}')"><i class="fa-solid fa-xmark"></i></button></div></div>`).join('')}</div>${renderEstatisticasJogosProfessor(stats)}${renderBotaoRelatorioJogosProfessor(true)}`;
}
async function editarJogoSalvoDireto(id){
 const jogo=await buscarJogoSalvoPorId(id);if(!jogo)return;
 novoJogo();
 aplicarJogoSalvoParaEdicao(jogo);
}
async function verDetalhesJogoSalvo(id){
 const jogo=await buscarJogoSalvoPorId(id);if(!jogo)return;
 const d=jogo.dados||{};
 const placar=d.placar||{};
 const atletas=(d.atletas||[]).filter(a=>(Number(a.minutos)||0)>0||(Number(a.gols)||0)>0||(Number(a.amarelo)||0)>0||(Number(a.vermelho)||0)>0);
 let m=document.getElementById('detalhes-jogo-salvo-modal');
 if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='detalhes-jogo-salvo-modal';document.body.appendChild(m)}
 const lista=atletas.length?atletas.map(a=>{
  const eventos=[];
  if(Number(a.gols)>0)eventos.push(`<span class="det-gol">${a.gols} gol${Number(a.gols)>1?'s':''}</span>`);
  if(Number(a.amarelo)>0)eventos.push(`<span class="det-amarelo">${a.amarelo} CA</span>`);
  if(Number(a.vermelho)>0)eventos.push(`<span class="det-vermelho">${a.vermelho} CV</span>`);
  return `<div class="det-atleta-row"><strong>${escapeHtmlJogos(a.apelido||a.nomeCompleto||'Atleta')}</strong><span>${Number(a.minutos)||0} min</span><span>${eventos.join(' ')||'-'}</span></div>`;
 }).join(''):'<p class="det-sem-atletas">Nenhum atleta com minutos/eventos registrados.</p>';
 m.innerHTML=`<div class="detalhes-jogo-card"><div class="novo-jogo-title"><b>Resumo do Jogo</b><button onclick="document.getElementById('detalhes-jogo-salvo-modal').style.display='none'">×</button></div><div class="detalhes-jogo-body"><div class="det-placar"><img src="logo.png"><strong>CFA Prosol</strong><span>${placar.cfa_prosol??0}</span><b>X</b><span>${placar.adversario??0}</span><strong>${escapeHtmlJogos(d.adversario||'Adversário')}</strong></div><div class="det-info-jogo">${escapeHtmlJogos(jogo.nome)}</div><h4>Atletas que jogaram</h4><div class="det-atletas-lista">${lista}</div></div></div>`;
 m.style.display='flex';
}
async function excluirJogoSalvo(id){
 const jogo=await buscarJogoSalvoPorId(id);if(!jogo)return;
 if(!confirm('Excluir permanentemente o jogo salvo?\n\n'+jogo.nome))return;
 const {error}=await _supabase.from('jogos').delete().eq('id',id);
 if(error){console.error(error);alert('Erro ao excluir jogo. Verifique as permissões no Supabase.');return;}
 alert('Jogo excluído com sucesso.');
 carregarJogosSalvosProfessor();
}
function chaveAtletaEstatisticaJogos(atleta){
 const nome=String(atleta.nomeCompleto||atleta.nome||'').trim();
 const nascimento=String(atleta.nascimento||'').trim();
 const ano=String(atleta.ano||'').trim();
 return `${nome}|${nascimento}|${ano}`;
}
function nomeExibicaoEstatisticaJogos(atleta){
 return atleta.apelido||atleta.nomeCompleto||'Atleta';
}
function detalhesEventoJogoTexto(detalhes, tipo){
 if(!detalhes||!detalhes.length)return '';
 return detalhes.map(d=>{
  const qtd=Number(d.qtd)||0;
  let label=tipo;
  if(tipo==='gol')label=qtd>1?'gols':'gol';
  if(tipo==='CA')label='CA';
  if(tipo==='CV')label='CV';
  return `${d.data||'-'} - ${d.adversario||'Adversário'}: ${qtd} ${label}`;
 }).join('\n');
}
function detalhesResultadoJogosTexto(lista){
 if(!lista||!lista.length)return 'Nenhum jogo.';
 return lista.map(j=>`${j.data||'-'} - CFA Prosol - ${j.gf} x ${j.gs} ${j.adversario||'Adversário'}`).join('\n');
}
function calcularEstatisticasJogosProfessor(jogos){
 const stats={total:0,vitorias:0,derrotas:0,empates:0,golsFeitos:0,golsSofridos:0,vitoriasDetalhes:[],empatesDetalhes:[],derrotasDetalhes:[],atletas:{},maisMinutos:[],menosMinutos:[],goleadores:[],cartoes:[]};
 (jogos||[]).forEach(j=>{
  const dados=j.dados||{};
  const p=dados.placar||{};
  const gf=parseInt(p.cfa_prosol??0,10)||0;
  const gs=parseInt(p.adversario??0,10)||0;
  const dataJogo=dados.data||formatarDataJogoBR(dados.data_iso||'')||'';
  const adversario=dados.adversario||'Adversário';
  const detalheResultado={data:dataJogo,adversario,gf,gs,nome:j.nome||dados.nome||''};
  stats.total++;
  stats.golsFeitos+=gf;
  stats.golsSofridos+=gs;
  if(gf>gs){stats.vitorias++;stats.vitoriasDetalhes.push(detalheResultado);}
  else if(gf<gs){stats.derrotas++;stats.derrotasDetalhes.push(detalheResultado);}
  else {stats.empates++;stats.empatesDetalhes.push(detalheResultado);}
  (dados.atletas||[]).forEach(a=>{
   // Se o atleta foi removido do banco principal, mantém o resultado do jogo,
   // mas não exibe mais este atleta nos cards/listas individuais do relatório.
   if (localizarAtletaSalvoEmJogo(a) < 0) return;
   const key=chaveAtletaEstatisticaJogos(a);
   if(!stats.atletas[key]){
    stats.atletas[key]={
     nomeCompleto:a.nomeCompleto||'',
     apelido:a.apelido||'',
     ano:a.ano||'',
     nascimento:a.nascimento||'',
     minutos:0,
     gols:0,
     amarelo:0,
     vermelho:0,
     golsDetalhes:[],
     amareloDetalhes:[],
     vermelhoDetalhes:[]
    };
   }
   const item=stats.atletas[key];
   const minutos=parseInt(a.minutos??0,10)||0;
   const gols=parseInt(a.gols??0,10)||0;
   const amarelo=parseInt(a.amarelo??0,10)||0;
   const vermelho=parseInt(a.vermelho??0,10)||0;
   item.minutos+=minutos;
   item.gols+=gols;
   item.amarelo+=amarelo;
   item.vermelho+=vermelho;
   if(gols>0)item.golsDetalhes.push({data:dataJogo,adversario,qtd:gols});
   if(amarelo>0)item.amareloDetalhes.push({data:dataJogo,adversario,qtd:amarelo});
   if(vermelho>0)item.vermelhoDetalhes.push({data:dataJogo,adversario,qtd:vermelho});
  });
 });
 const atletas=Object.values(stats.atletas);
 stats.maisMinutos=[...atletas].sort((a,b)=>b.minutos-a.minutos||nomeExibicaoEstatisticaJogos(a).localeCompare(nomeExibicaoEstatisticaJogos(b),'pt-BR'));
 stats.menosMinutos=[...atletas].sort((a,b)=>a.minutos-b.minutos||nomeExibicaoEstatisticaJogos(a).localeCompare(nomeExibicaoEstatisticaJogos(b),'pt-BR'));
 stats.goleadores=[...atletas].filter(a=>a.gols>0).sort((a,b)=>b.gols-a.gols||nomeExibicaoEstatisticaJogos(a).localeCompare(nomeExibicaoEstatisticaJogos(b),'pt-BR'));
 stats.cartoes=[...atletas].filter(a=>a.amarelo>0||a.vermelho>0).sort((a,b)=>(b.amarelo+b.vermelho)-(a.amarelo+a.vermelho)||nomeExibicaoEstatisticaJogos(a).localeCompare(nomeExibicaoEstatisticaJogos(b),'pt-BR'));
 return stats;
}
function renderListaMinutosJogos(lista,tipo){
 if(!lista||!lista.length)return '<div class="estat-vazio">Sem dados.</div>';
 return `<div class="estat-lista-atletas">${lista.map((a,i)=>`<div class="estat-atleta-row"><span>${i+1}. ${escapeHtmlJogos(nomeExibicaoEstatisticaJogos(a))} <small>${escapeHtmlJogos(a.ano||'')}</small></span><strong>${a.minutos} min</strong></div>`).join('')}</div>`;
}
function renderListaGolsJogos(lista){
 if(!lista||!lista.length)return '<div class="estat-vazio">Nenhum gol registrado.</div>';
 return `<div class="estat-lista-atletas">${lista.map(a=>{const detalhe=escapeHtmlJogos(detalhesEventoJogoTexto(a.golsDetalhes,'gol'));return `<div class="estat-atleta-row"><span>${escapeHtmlJogos(nomeExibicaoEstatisticaJogos(a))} <small>${escapeHtmlJogos(a.ano||'')}</small></span><strong class="estat-tooltip" data-tooltip="${detalhe}">${a.gols} gol${a.gols>1?'s':''}</strong></div>`;}).join('')}</div>`;
}
function renderListaCartoesJogos(lista){
 if(!lista||!lista.length)return '<div class="estat-vazio">Nenhum cartão registrado.</div>';
 return `<div class="estat-lista-atletas">${lista.map(a=>{const detCA=escapeHtmlJogos(detalhesEventoJogoTexto(a.amareloDetalhes,'CA'));const detCV=escapeHtmlJogos(detalhesEventoJogoTexto(a.vermelhoDetalhes,'CV'));return `<div class="estat-atleta-row"><span>${escapeHtmlJogos(nomeExibicaoEstatisticaJogos(a))} <small>${escapeHtmlJogos(a.ano||'')}</small></span><strong>${a.amarelo>0?`<em class="estat-ca estat-tooltip" data-tooltip="${detCA}">CA ${a.amarelo}</em>`:`<em class="estat-ca">CA 0</em>`} ${a.vermelho>0?`<em class="estat-cv estat-tooltip" data-tooltip="${detCV}">CV ${a.vermelho}</em>`:`<em class="estat-cv">CV 0</em>`}</strong></div>`;}).join('')}</div>`;
}
function renderEstatisticasJogosProfessor(stats){
 const detVitorias=escapeHtmlJogos(detalhesResultadoJogosTexto(stats.vitoriasDetalhes));
 const detEmpates=escapeHtmlJogos(detalhesResultadoJogosTexto(stats.empatesDetalhes));
 const detDerrotas=escapeHtmlJogos(detalhesResultadoJogosTexto(stats.derrotasDetalhes));
 return `<div class="jogos-estatisticas-card"><h3>Estatísticas</h3><div class="jogos-estatisticas-grid"><div><strong>${stats.total}</strong><span>Total de jogos</span></div><div class="estat-tooltip" data-tooltip="${detVitorias}"><strong>${stats.vitorias}</strong><span>Vitórias</span></div><div class="estat-tooltip" data-tooltip="${detDerrotas}"><strong>${stats.derrotas}</strong><span>Derrotas</span></div><div class="estat-tooltip" data-tooltip="${detEmpates}"><strong>${stats.empates}</strong><span>Empates</span></div><div><strong>${stats.golsFeitos}</strong><span>Gols feitos</span></div><div><strong>${stats.golsSofridos}</strong><span>Gols sofridos</span></div></div><div class="jogos-estatisticas-detalhes"><div class="estat-detalhe-card"><h4>Atletas com mais tempo</h4>${renderListaMinutosJogos(stats.maisMinutos,'mais')}</div><div class="estat-detalhe-card"><h4>Atletas com menos tempo</h4>${renderListaMinutosJogos(stats.menosMinutos,'menos')}</div><div class="estat-detalhe-card"><h4>Atletas com gols</h4>${renderListaGolsJogos(stats.goleadores)}</div><div class="estat-detalhe-card"><h4>Cartões amarelos e vermelhos</h4>${renderListaCartoesJogos(stats.cartoes)}</div></div></div>`;
}

function renderBotaoRelatorioJogosProfessor(habilitado=true){
 return `<div class="relatorio-jogos-area"><button class="relatorio-jogos-btn" onclick="abrirRelatorioJogosProfessor()" ${habilitado?'':'disabled'}><i class="fa-solid fa-clipboard-list"></i> Relatório de Jogos</button></div>`;
}
function relatorioJogosGrupoPosicao(row){
 const p=String(posicaoAtletaJogos(row)||'').toLowerCase();
 if(p.includes('goleiro'))return 'Goleiros';
 if(p.includes('zagueiro'))return 'Zagueiros';
 if(p.includes('lateral')&&(p.includes('dir')||p.includes('direito')))return 'Lateral Dir.';
 if(p.includes('lateral')&&(p.includes('esq')||p.includes('esquerdo')))return 'Lateral Esq.';
 if(p.includes('lateral'))return 'Laterais';
 if(p.includes('volante'))return 'Volantes';
 if(p.includes('meia'))return 'Meias';
 if(p.includes('atacante'))return 'Atacantes';
 if((p.includes('extremo')||p.includes('ponta'))&&(p.includes('dir')||p.includes('direito')))return 'Ponta Dir.';
 if((p.includes('extremo')||p.includes('ponta'))&&(p.includes('esq')||p.includes('esquerdo')))return 'Ponta Esq.';
 if(p.includes('extremo')||p.includes('ponta'))return 'Extremos';
 return 'Outros';
}
function relatorioJogosOrdemPosicao(grupo){
 const ordem=['Goleiros','Zagueiros','Lateral Dir.','Lateral Esq.','Laterais','Volantes','Meias','Atacantes','Ponta Dir.','Ponta Esq.','Extremos','Outros'];
 const i=ordem.indexOf(grupo);return i<0?99:i;
}
function relatorioJogosClassePosicao(grupo){
 const map={'Goleiros':'pos-goleiros','Zagueiros':'pos-zagueiros','Lateral Dir.':'pos-laterais','Lateral Esq.':'pos-laterais','Laterais':'pos-laterais','Volantes':'pos-volantes','Meias':'pos-meias','Atacantes':'pos-atacantes','Ponta Dir.':'pos-extremos','Ponta Esq.':'pos-extremos','Extremos':'pos-extremos','Outros':'pos-outros'};
 return map[grupo]||'pos-outros';
}
function relatorioJogosZonaCampo(grupo){
 const zonas={
  // Linha defensiva: zagueiros sempre abaixo dos goleiros
  'Goleiros':{l:24,t:2,w:52,h:8},
  'Zagueiros':{l:27,t:12,w:46,h:18},

  // Laterais nas faixas, abaixo dos zagueiros
  'Lateral Dir.':{l:2,t:31,w:27,h:22},
  'Lateral Esq.':{l:71,t:31,w:27,h:22},
  'Laterais':{l:32,t:31,w:36,h:14},

  // Corredor central em sequência vertical, sem sobreposição
  'Volantes':{l:32,t:34,w:36,h:18},
  'Meias':{l:32,t:53,w:36,h:18},
  'Atacantes':{l:32,t:72,w:36,h:12},

  // Pontas/extremos abaixo dos laterais
  'Ponta Dir.':{l:3,t:64,w:27,h:26},
  'Ponta Esq.':{l:70,t:64,w:27,h:26},
  'Extremos':{l:32,t:84,w:36,h:10},
  'Outros':{l:32,t:93,w:36,h:7}
 };
 return zonas[grupo]||zonas['Outros'];
}
function relatorioJogosLayoutCards(grupo){
 if(grupo==='Goleiros')return 'layout-row';
 if(['Zagueiros','Volantes','Meias','Atacantes','Laterais','Extremos','Outros'].includes(grupo))return 'layout-2';
 if(['Lateral Dir.','Lateral Esq.','Ponta Dir.','Ponta Esq.'].includes(grupo))return 'layout-1';
 return 'layout-2';
}
function relatorioJogosAno(jogos){
 const anos=[...(new Set((jogos||[]).map(j=>String(j.dados?.data_iso||j.dados?.data||'').match(/(20\d{2})/)?.[1]).filter(Boolean)))];
 if(anos.length===1)return anos[0];
 if(anos.length>1)return anos.join(' / ');
 return String(new Date().getFullYear());
}
function relatorioJogosTotalMinutos(jogos){
 return (jogos||[]).reduce((s,j)=>{
  const min=parseInt(j.dados?.minutos_jogo??0,10);
  if(!isNaN(min)&&min>0)return s+min;
  const atletas=j.dados?.atletas||[];
  const maxAtleta=Math.max(0,...atletas.map(a=>parseInt(a.minutos||0,10)||0));
  return s+maxAtleta;
 },0);
}
function relatorioJogosAtletasMinutagem(jogos){
 const mapa={};
 (jogos||[]).forEach(j=>{
  (j.dados?.atletas||[]).forEach(a=>{
   const min=parseInt(a.minutos||0,10)||0;
   if(min<=0)return;
   const idx=localizarAtletaSalvoEmJogo(a);
   if(idx<0)return; // não mostra atletas que já foram excluídos do banco principal
   const key=chaveAtletaEstatisticaJogos(a);
   if(!mapa[key]){
    const row=excelData[idx]||{};
    const grupo=relatorioJogosGrupoPosicao(row);
    mapa[key]={apelido:a.apelido||a.nomeCompleto||'Atleta',nomeCompleto:a.nomeCompleto||'',ano:a.ano||'',nascimento:a.nascimento||'',minutos:0,grupo};
   }
   mapa[key].minutos+=min;
  });
 });
 return Object.values(mapa).sort((a,b)=>relatorioJogosOrdemPosicao(a.grupo)-relatorioJogosOrdemPosicao(b.grupo)||b.minutos-a.minutos||a.apelido.localeCompare(b.apelido,'pt-BR'));
}
function relatorioJogosTabelaResultados(titulo,lista,classe){
 const itens=lista||[];
 if(!itens.length)return `<div class="rj-result-box ${classe}"><h4>${titulo}</h4><table><tr><td colspan="2">-</td></tr></table></div>`;
 const maxLinhas=7;
 const colunas=[];
 for(let i=0;i<itens.length;i+=maxLinhas)colunas.push(itens.slice(i,i+maxLinhas));
 const tabelas=colunas.map(col=>`<table>${col.map(j=>`<tr><td>CFA Prosol ${j.gf} x ${j.gs} ${escapeHtmlJogos(j.adversario||'Adversário')}</td></tr>`).join('')}</table>`).join('');
 return `<div class="rj-result-box ${classe}"><h4>${titulo}</h4><div class="rj-result-cols cols-${Math.min(colunas.length,4)}">${tabelas}</div></div>`;
}
function simboloCartaoRelatorio(cor){
 const cls=cor==='amarelo'?'rj-card-yellow':'rj-card-red';
 return `<i class="${cls}"></i>`;
}
function relatorioJogosListaCompacta(lista,tipo){
 if(!lista||!lista.length)return '<div class="rj-list-cols cols-1"><table><tr><td colspan="2">-</td></tr></table></div>';
 const maxLinhas=10;
 const colunas=[];
 for(let i=0;i<lista.length;i+=maxLinhas)colunas.push(lista.slice(i,i+maxLinhas));
 const tabelas=colunas.map(col=>`<table>${col.map(a=>{
  if(tipo==='min')return `<tr><td>${escapeHtmlJogos(nomeExibicaoEstatisticaJogos(a))}</td><td>${a.minutos} min</td></tr>`;
  if(tipo==='gol')return `<tr><td>${escapeHtmlJogos(nomeExibicaoEstatisticaJogos(a))}</td><td>${a.gols}</td></tr>`;
  return `<tr><td>${escapeHtmlJogos(nomeExibicaoEstatisticaJogos(a))}</td><td>${a.amarelo} ${simboloCartaoRelatorio('amarelo')} / ${a.vermelho} ${simboloCartaoRelatorio('vermelho')}</td></tr>`;
 }).join('')}</table>`).join('');
 return `<div class="rj-list-cols cols-${Math.min(colunas.length,4)}">${tabelas}</div>`;
}
function montarRelatorioJogosMarkup(jogos,professor){
 const stats=calcularEstatisticasJogosProfessor(jogos);
 const ano=relatorioJogosAno(jogos);
 const totalMin=relatorioJogosTotalMinutos(jogos);
 const aproveitamento=stats.total?(((stats.vitorias*3+stats.empates)/(stats.total*3))*100).toFixed(1).replace('.',',')+'%':'0%';
 const atletasCampo=relatorioJogosAtletasMinutagem(jogos);
 const grupos={};
 atletasCampo.forEach(a=>{if(!grupos[a.grupo])grupos[a.grupo]=[];grupos[a.grupo].push(a);});
 const campo=Object.keys(grupos).sort((a,b)=>relatorioJogosOrdemPosicao(a)-relatorioJogosOrdemPosicao(b)).map(grupo=>{
  const z=relatorioJogosZonaCampo(grupo);
  const cards=grupos[grupo].map(a=>`<em class="${relatorioJogosClassePosicao(grupo)}"><b>${a.minutos}</b><span>${escapeHtmlJogos(a.apelido)}</span></em>`).join('');
  return `<div class="rj-zone" style="left:${z.l}%;top:${z.t}%;width:${z.w}%;height:${z.h}%"><div class="rj-cards ${relatorioJogosLayoutCards(grupo)}">${cards}</div></div>`;
 }).join('');
 const topMais=stats.maisMinutos.slice(0,10);
 const topMenos=stats.menosMinutos.slice(0,10);
 const style=`<style>@page{size:A4 portrait;margin:4mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;margin:0;color:#111;background:#fff;font-weight:400}.rj-page{width:202mm;height:289mm;margin:0 auto;padding:1.5mm 3mm;overflow:hidden}.rj-head{display:grid;grid-template-columns:23mm 1fr 23mm;align-items:center;height:24mm}.rj-head img{width:18mm;margin:auto}.rj-title{text-align:center}.rj-title h1{font-size:23.7px;margin:0 0 2px;font-weight:700}.rj-title h2{font-size:16.9px;margin:0;font-weight:900}.rj-campo{height:142mm;width:101mm;margin:2mm auto 0;border:2px solid #3e7d2b;background:#4b8f3c url('base_campo_relatorio.png') center/100% 100% no-repeat;position:relative;overflow:hidden}.rj-zone{position:absolute;z-index:2;display:flex;align-items:center;justify-content:center;overflow:visible}.rj-cards{display:flex;flex-wrap:wrap;gap:.75mm;align-items:center;justify-content:center;max-height:100%;overflow:visible}.rj-cards.layout-1{display:grid;grid-template-columns:1fr;align-content:center;justify-items:center}.rj-cards.layout-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:center;justify-items:center}.rj-cards.layout-row{display:flex;flex-wrap:nowrap;justify-content:center;align-items:center}.rj-cards em{font-style:normal;border-radius:3px;padding:.55mm 1mm;min-width:16mm;max-width:25mm;text-align:center;font-size:9.4px;line-height:1.05;color:#111;font-weight:400;box-shadow:0 1px 2px rgba(0,0,0,.25)}.rj-cards em b{display:block;font-size:11.1px;font-weight:400}.rj-cards em span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pos-goleiros{background:#d9edf7}.pos-zagueiros{background:#c9e7ff}.pos-laterais{background:#bdefff}.pos-volantes{background:#d8c5f2}.pos-meias{background:#9ee071}.pos-atacantes{background:#ffd21f}.pos-extremos{background:#f4a6a6}.pos-outros{background:#ddd}.rj-summary{display:grid;grid-template-columns:repeat(8,1fr);gap:1mm;margin:1.4mm 0}.rj-summary div{border:1px solid #111;text-align:center;font-size:9.1px;padding:.65mm;background:#f6f6f6;font-weight:400}.rj-summary b{display:block;font-size:12.5px;font-weight:400}.rj-results{display:flex;gap:1mm;height:30mm;overflow:hidden;justify-content:center;align-items:flex-start}.rj-result-box{border:1px solid #111;overflow:hidden;flex:0 1 auto;width:max-content;max-width:120mm;min-width:36mm;background:#fff}.rj-result-box h4{margin:0;background:#58111a;color:#f9c614;font-size:10px;padding:.8mm;text-align:center;font-weight:400}.rj-result-box table,.rj-lists table{width:100%;border-collapse:collapse;font-size:8.6px;font-weight:400}.rj-result-cols{display:flex;gap:.6mm;align-items:flex-start;width:100%}.rj-result-cols table{width:auto;min-width:max-content;flex:0 0 auto}.rj-result-cols.cols-1{display:block;width:100%}.rj-result-cols.cols-1 table{width:100%;min-width:100%;table-layout:auto}.rj-list-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,1fr));gap:.6mm;align-items:flex-start;width:100%;overflow:hidden}.rj-list-cols table{width:100%!important;min-width:0;table-layout:auto}.rj-list-cols.cols-1{display:block;width:100%}.rj-list-cols.cols-1 table{width:100%!important;min-width:100%;table-layout:auto}.rj-list-cols td:first-child{width:auto}.rj-list-cols td:last-child{width:8mm;text-align:center}.rj-result-box td,.rj-lists td{border:1px solid #333;padding:.42mm;line-height:1.06;font-weight:400}.rj-result-box td{white-space:nowrap;padding-left:.65mm;padding-right:.65mm}.rj-lists td{white-space:nowrap}.rj-result-box tr td:last-child{border-right:1px solid #333}.rj-result-box table{border-right:1px solid #333}.rj-card-yellow,.rj-card-red{display:inline-block;width:3.2mm;height:4.4mm;border-radius:.5mm;vertical-align:-.7mm;border:1px solid #111}.rj-card-yellow{background:#f1c40f}.rj-card-red{background:#d63031}.rj-lists{display:grid;grid-template-columns:repeat(4,1fr);gap:1mm;margin-top:1mm;height:61mm;overflow:hidden}.rj-lists>div{border:1px solid #111;overflow:hidden}.rj-lists h4{margin:0;background:#d00000;color:#fff;font-size:9.8px;text-align:center;padding:.8mm;font-weight:400}.rj-lists .green h4{background:#009245}.rj-lists .black h4{background:#111}.rj-lists .yellow h4{background:#f1c40f;color:#111}.rj-lists tbody{vertical-align:top}.rj-foot{font-size:9.1px;font-weight:400;text-align:center;margin-top:.8mm;color:#555}</style>`;
 const body=`<div class="rj-page"><div class="rj-head"><img src="logo.png"><div class="rj-title"><h1>Relatório de Jogos - ${escapeHtmlJogos(professor)}</h1><h2>${ano}</h2></div><img src="logo.png"></div><div class="rj-campo">${campo||'<p style="text-align:center;color:#fff;font-weight:bold">Sem atletas com minutagem.</p>'}</div><div class="rj-summary"><div><b>${stats.total}</b>Jogos</div><div><b>${stats.vitorias}</b>Vitórias</div><div><b>${stats.empates}</b>Empates</div><div><b>${stats.derrotas}</b>Derrotas</div><div><b>${totalMin}'</b>Minutos</div><div><b>${aproveitamento}</b>Aproveitamento</div><div><b>${stats.golsFeitos}</b>Gols feitos</div><div><b>${stats.golsSofridos}</b>Gols sofridos</div></div><div class="rj-results">${relatorioJogosTabelaResultados('Vitórias',stats.vitoriasDetalhes,'win')}${relatorioJogosTabelaResultados('Empates',stats.empatesDetalhes,'draw')}${relatorioJogosTabelaResultados('Derrotas',stats.derrotasDetalhes,'loss')}</div><div class="rj-lists"><div class="green"><h4>Top 10 atletas mais tempo</h4>${relatorioJogosListaCompacta(topMais,'min')}</div><div><h4>Top 10 atletas menos tempo</h4>${relatorioJogosListaCompacta(topMenos,'min')}</div><div class="black"><h4>Gols</h4>${relatorioJogosListaCompacta(stats.goleadores,'gol')}</div><div class="yellow"><h4>Cartões</h4>${relatorioJogosListaCompacta(stats.cartoes,'cartao')}</div></div><div class="rj-foot">CFA Prosol • Relatório gerado automaticamente</div></div>`;
 return {style,body,title:`Relatório de Jogos - ${professor}`};
}

function pdfRelatorioCorGrupo(grupo){
 const map={'Goleiros':[217,237,247],'Zagueiros':[201,231,255],'Lateral Dir.':[189,239,255],'Lateral Esq.':[189,239,255],'Laterais':[189,239,255],'Volantes':[216,197,242],'Meias':[158,224,113],'Atacantes':[255,210,31],'Ponta Dir.':[244,166,166],'Ponta Esq.':[244,166,166],'Extremos':[244,166,166],'Outros':[221,221,221]};
 return map[grupo]||map['Outros'];
}
function pdfRelatorioLoadImage(src){
 return new Promise(resolve=>{
  const img=new Image();
  img.onload=()=>{try{const c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;c.getContext('2d').drawImage(img,0,0);resolve(c.toDataURL('image/png'));}catch(e){resolve(null);}};
  img.onerror=()=>resolve(null);
  img.src=src;
 });
}
function pdfRelatorioResultadoLinhas(lista){
 return (lista||[]).map(j=>`CFA Prosol ${j.gf} x ${j.gs} ${j.adversario||'Adversário'}`);
}
function pdfRelatorioDrawBoxTable(doc,x,y,w,h,title,rows,opts={}){
 const header=opts.header||[88,17,26], headerText=opts.headerText||[249,198,20], fontSize=opts.fontSize||5.3, rowH=opts.rowH||3.2;
 doc.setDrawColor(0);doc.setLineWidth(.18);doc.rect(x,y,w,h);
 doc.setFillColor(...header);doc.rect(x,y,w,4.3,'F');
 doc.setTextColor(...headerText);doc.setFont('helvetica','normal');doc.setFontSize(opts.headerSize||7);doc.text(title,x+w/2,y+3,{align:'center'});
 doc.setTextColor(0);doc.setFont('helvetica','normal');doc.setFontSize(fontSize);
 if(!rows||!rows.length)rows=['-'];
 const maxRows=Math.max(1,Math.floor((h-4.6)/rowH));
 const cols=[];for(let i=0;i<rows.length;i+=maxRows)cols.push(rows.slice(i,i+maxRows));
 const colW=w/cols.length;
 cols.forEach((col,ci)=>{let yy=y+4.3;col.forEach(r=>{doc.rect(x+ci*colW,yy,colW,rowH);if(Array.isArray(r)){doc.text(String(r[0]||''),x+ci*colW+.7,yy+2.25);doc.text(String(r[1]||''),x+(ci+1)*colW-.7,yy+2.25,{align:'right'});}else{doc.text(doc.splitTextToSize(String(r),colW-1.4)[0]||'',x+ci*colW+.7,yy+2.25);}yy+=rowH;});});
}
async function gerarRelatorioJogosPDFMobileDireto(jogos,professor){
 const Ctor=window.jspdf&&window.jspdf.jsPDF;if(!Ctor)return false;
 const doc=new Ctor({orientation:'portrait',unit:'mm',format:'a4',compress:true});
 const stats=calcularEstatisticasJogosProfessor(jogos), ano=relatorioJogosAno(jogos), totalMin=relatorioJogosTotalMinutos(jogos);
 const aproveitamento=stats.total?(((stats.vitorias*3+stats.empates)/(stats.total*3))*100).toFixed(1).replace('.',',')+'%':'0%';
 const logo=await pdfRelatorioLoadImage('logo.png'); const campoImg=await pdfRelatorioLoadImage('base_campo_relatorio.png')||await pdfRelatorioLoadImage('BASE CAMPO.png');
 const W=210,H=297;if(logo){doc.addImage(logo,'PNG',13,5,18,18);doc.addImage(logo,'PNG',179,5,18,18);}doc.setTextColor(15);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(`Relatório de Jogos - ${professor}`,W/2,12,{align:'center'});doc.setFontSize(10);doc.text(String(ano),W/2,18,{align:'center'});
 const fx=55,fy=24,fw=100,fh=150;if(campoImg)doc.addImage(campoImg,'PNG',fx,fy,fw,fh);else{doc.setFillColor(75,143,60);doc.rect(fx,fy,fw,fh,'F');}
 const atletas=relatorioJogosAtletasMinutagem(jogos), grupos={};atletas.forEach(a=>{(grupos[a.grupo]||(grupos[a.grupo]=[])).push(a);});
 Object.keys(grupos).sort((a,b)=>relatorioJogosOrdemPosicao(a)-relatorioJogosOrdemPosicao(b)).forEach(grupo=>{const z=relatorioJogosZonaCampo(grupo), arr=grupos[grupo], color=pdfRelatorioCorGrupo(grupo);const zx=fx+z.l/100*fw,zy=fy+z.t/100*fh,zw=z.w/100*fw,zh=z.h/100*fh;let cols=2;if(['Lateral Dir.','Lateral Esq.','Ponta Dir.','Ponta Esq.'].includes(grupo))cols=1;if(grupo==='Goleiros')cols=arr.length;cols=Math.max(1,cols);const gap=.7,cw=Math.min(cols===1?22:(zw-(cols-1)*gap)/cols,24),ch=6.4,rows=Math.ceil(arr.length/cols),totalH=rows*ch+(rows-1)*gap,startY=zy+Math.max(0,(zh-totalH)/2);arr.forEach((a,i)=>{const c=i%cols,r=Math.floor(i/cols),rowCount=(r===rows-1)?arr.length-r*cols:cols,totalW=rowCount*cw+(rowCount-1)*gap,startX=zx+Math.max(0,(zw-totalW)/2),x=startX+c*(cw+gap),y=startY+r*(ch+gap);doc.setFillColor(...color);doc.roundedRect(x,y,cw,ch,1,1,'F');doc.setTextColor(0);doc.setFont('helvetica','bold');doc.setFontSize(5.4);doc.text(String(a.minutos),x+cw/2,y+2.2,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(5.0);doc.text(doc.splitTextToSize(a.apelido,cw-1)[0]||'',x+cw/2,y+5,{align:'center'});});});
 const sy=fy+fh+3,sx=8,sw=(W-16-7*1.2)/8,sh=8;[['Jogos',stats.total],['Vitórias',stats.vitorias],['Empates',stats.empates],['Derrotas',stats.derrotas],['Minutos',`${totalMin}'`],['Aproveit.',aproveitamento],['Gols feitos',stats.golsFeitos],['Gols sofridos',stats.golsSofridos]].forEach((it,i)=>{const x=sx+i*(sw+1.2);doc.rect(x,sy,sw,sh);doc.setFont('helvetica','normal');doc.setFontSize(6.3);doc.text(String(it[1]),x+sw/2,sy+3,{align:'center'});doc.setFontSize(4.7);doc.text(String(it[0]),x+sw/2,sy+6.4,{align:'center'});});
 const ry=sy+11,rh=30,rw=(W-16-2*1.5)/3;pdfRelatorioDrawBoxTable(doc,8,ry,rw,rh,'Vitórias',pdfRelatorioResultadoLinhas(stats.vitoriasDetalhes));pdfRelatorioDrawBoxTable(doc,8+rw+1.5,ry,rw,rh,'Empates',pdfRelatorioResultadoLinhas(stats.empatesDetalhes));pdfRelatorioDrawBoxTable(doc,8+2*(rw+1.5),ry,rw,rh,'Derrotas',pdfRelatorioResultadoLinhas(stats.derrotasDetalhes));
 const ly=ry+33,lh=54,lw=(W-16-3*1.5)/4;pdfRelatorioDrawBoxTable(doc,8,ly,lw,lh,'Top 10 atletas mais tempo',stats.maisMinutos.slice(0,10).map(a=>[nomeExibicaoEstatisticaJogos(a),`${a.minutos} min`]),{header:[0,146,69],headerText:[255,255,255]});pdfRelatorioDrawBoxTable(doc,8+lw+1.5,ly,lw,lh,'Top 10 atletas menos tempo',stats.menosMinutos.slice(0,10).map(a=>[nomeExibicaoEstatisticaJogos(a),`${a.minutos} min`]),{header:[208,0,0],headerText:[255,255,255]});pdfRelatorioDrawBoxTable(doc,8+2*(lw+1.5),ly,lw,lh,'Gols',stats.goleadores.map(a=>[nomeExibicaoEstatisticaJogos(a),String(a.gols)]),{header:[0,0,0],headerText:[255,255,255]});pdfRelatorioDrawBoxTable(doc,8+3*(lw+1.5),ly,lw,lh,'Cartões',stats.cartoes.map(a=>[nomeExibicaoEstatisticaJogos(a),`${a.amarelo} CA / ${a.vermelho} CV`]),{header:[241,196,15],headerText:[0,0,0],fontSize:5.0});
 doc.setFontSize(6);doc.setTextColor(80);doc.text('CFA Prosol • Relatório gerado automaticamente',W/2,H-5,{align:'center'});
 const filename=prosolSanitizeFilename(`Relatório de Jogos - ${professor}`)+'.pdf';const blob=doc.output('blob');const file=new File([blob],filename,{type:'application/pdf'});if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:`Relatório de Jogos - ${professor}`,text:'Relatório de Jogos CFA Prosol'});else doc.save(filename);return true;
}
async function abrirRelatorioJogosProfessor(){
 const professor=professorJogosAtual||'Geral';
 const {data,error}=await _supabase.from('jogos').select('id,professor,numero_jogo,nome,dados,criado_em').eq('professor',professor).order('numero_jogo',{ascending:true});
 if(error){console.error(error);alert('Erro ao carregar jogos para o relatório.');return;}
 if(!data||!data.length){alert('Nenhum jogo salvo para gerar relatório.');return;}
 if(typeof prosolIsMobile==='function'&&prosolIsMobile()&&window.jspdf&&window.jspdf.jsPDF){try{if(await gerarRelatorioJogosPDFMobileDireto(data,professor))return;}catch(e){console.error('Falha no PDF direto mobile:',e);}}
 const {style,body,title}=montarRelatorioJogosMarkup(data,professor);
 const w=window.open('','_blank','width=900,height=1100');if(!w)return alert('Permita pop-ups para gerar o relatório.');
 w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${style}</head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close();
}
async function salvarJogoSupabase(){
 const professor=professorJogosAtual||'Geral';
 const editando=window.__jogoEditandoAtual||null;
 const dataISO=textoValorJogo('#novo-jogo-modal .jogo-data-input');
 const dataBR=formatarDataJogoBR(dataISO);
 const adversario=textoValorJogo('#novo-jogo-modal .jogo-adversario-top');
 const placarProsol=numeroValorJogo('#novo-jogo-modal .jogo-placar-prosol');
 const placarAdversario=numeroValorJogo('#novo-jogo-modal .jogo-placar-adversario');
 if(!dataISO)return alert('Informe a data do jogo antes de salvar.');
 if(!adversario)return alert('Informe o adversário antes de salvar.');
 let numeroJogo;
 try{numeroJogo=editando&&editando.numero_jogo?editando.numero_jogo:await proximoNumeroJogoProfessor(professor);}catch(error){
  console.error(error);
  alert('Não foi possível acessar a tabela jogos no Supabase. Crie a tabela jogos antes de salvar.');
  return;
 }
 const nomeJogo=`Jogo ${numeroJogo} - ${dataBR} - CFA Prosol ${placarProsol} x ${placarAdversario} ${adversario}`;
 const conv=getConvocacaoJogoAtual();
 const dados={
  professor,
  numero_jogo:numeroJogo,
  nome:nomeJogo,
  tipo:textoValorJogo('#novo-jogo-modal .jogo-tipo-select'),
  data:dataBR,
  data_iso:dataISO,
  local:textoValorJogo('#novo-jogo-modal .jogo-local-select'),
  adversario,
  caracteristica:textoValorJogo('#novo-jogo-modal .jogo-caracteristica-select'),
  minutos_jogo:numeroValorJogo('#novo-jogo-modal .jogo-minutos-input'),
  placar:{cfa_prosol:placarProsol,adversario:placarAdversario},
  convocacao:conv?{nome:conv.nome}:(editando&&editando.convocacaoNome?{nome:editando.convocacaoNome}:null),
  atletas:dadosAtletasJogo()
 };
 const payload={professor,numero_jogo:numeroJogo,nome:nomeJogo,dados,atualizado_em:new Date().toISOString()};
 let error;
 if(editando&&editando.id){
  ({error}=await _supabase.from('jogos').update(payload).eq('id',editando.id));
 }else{
  ({error}=await _supabase.from('jogos').insert(payload));
 }
 if(error){console.error(error);alert('Erro ao salvar jogo no Supabase. Verifique a tabela jogos e as permissões.');return;}
 alert(nomeJogo+(editando?' atualizado':' salvo')+' com sucesso!');
 const modal=document.getElementById('novo-jogo-modal');if(modal)modal.style.display='none';
 renderJogosScreen();
}
async function abrirCarregarJogoSalvoModal(){
 const professor=professorJogosAtual||'Geral';
 const {data,error}=await _supabase.from('jogos').select('id,numero_jogo,nome,dados,criado_em').eq('professor',professor).order('numero_jogo',{ascending:false});
 if(error){alert('Erro ao carregar jogos salvos. Verifique a tabela jogos no Supabase.');console.error(error);return;}
 if(!data||!data.length){alert('Nenhum jogo salvo para este professor.');return;}
 window.__jogosSalvosCarregarTemp=data;
 let m=document.getElementById('carregar-jogo-salvo-modal');
 if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='carregar-jogo-salvo-modal';document.body.appendChild(m)}
 m.innerHTML=`<div class="buscar-convocacao-jogo-card"><div class="novo-jogo-title"><b>Carregar Jogo Salvo</b><button onclick="document.getElementById('carregar-jogo-salvo-modal').style.display='none'">×</button></div><div class="buscar-convocacao-jogo-body"><p>Selecione um jogo salvo para editar. Ao salvar, ele será atualizado no Supabase mantendo o mesmo número do jogo.</p><select id="jogo-salvo-select" size="10">${data.map(j=>`<option value="${j.id}">${j.nome}</option>`).join('')}</select><div class="buscar-convocacao-jogo-actions"><button onclick="confirmarCarregarJogoSalvo()">Carregar para Editar</button><button onclick="document.getElementById('carregar-jogo-salvo-modal').style.display='none'">Cancelar</button></div></div></div>`;
 m.style.display='flex';
}
function setValorCampoJogo(selector,valor){const el=document.querySelector(selector);if(el)el.value=valor??'';}
function localizarAtletaSalvoEmJogo(atletaSalvo){
 if(!atletaSalvo)return -1;
 let idx=localizarAtletaAtivoJogos({apelido:atletaSalvo.apelido,nascimento:atletaSalvo.nascimento,nomeCompleto:atletaSalvo.nomeCompleto,ano:atletaSalvo.ano});
 if(idx>=0)return idx;
 const nomeCompleto=String(atletaSalvo.nomeCompleto||'').trim();
 const nascimento=normalizarDataJogos(atletaSalvo.nascimento||'');
 const ano=String(atletaSalvo.ano||'').trim();
 if(nomeCompleto&&nascimento){idx=excelData.findIndex(row=>nomeCompletoAtletaJogos(row)===nomeCompleto&&nascimentoAtletaJogos(row)===nascimento);if(idx>=0)return idx;}
 if(nomeCompleto&&ano){idx=excelData.findIndex(row=>nomeCompletoAtletaJogos(row)===nomeCompleto&&anoAtletaJogos(row)===ano);if(idx>=0)return idx;}
 return -1;
}
function confirmarCarregarJogoSalvo(){
 const select=document.getElementById('jogo-salvo-select');
 if(!select||!select.value)return alert('Selecione um jogo salvo.');
 const jogo=(window.__jogosSalvosCarregarTemp||[]).find(j=>j.id===select.value);
 if(!jogo)return alert('Jogo não encontrado na lista carregada.');
 aplicarJogoSalvoParaEdicao(jogo);
 const m=document.getElementById('carregar-jogo-salvo-modal');if(m)m.style.display='none';
}
function aplicarJogoSalvoParaEdicao(jogo){
 const d=jogo.dados||{};
 window.__jogoConvocacaoAtual=null;
 window.__jogoEditandoAtual={id:jogo.id,numero_jogo:jogo.numero_jogo,nome:jogo.nome,convocacaoNome:d.convocacao&&d.convocacao.nome?d.convocacao.nome:''};
 setValorCampoJogo('#novo-jogo-modal .jogo-placar-prosol',d.placar?.cfa_prosol??0);
 setValorCampoJogo('#novo-jogo-modal .jogo-placar-adversario',d.placar?.adversario??0);
 setValorCampoJogo('#novo-jogo-modal .jogo-adversario-top',d.adversario||'');
 setValorCampoJogo('#novo-jogo-modal .jogo-data-input',d.data_iso||converterDataConvocacaoParaInput(d.data||''));
 setValorCampoJogo('#novo-jogo-modal .jogo-tipo-select',d.tipo||'Campeonato');
 setValorCampoJogo('#novo-jogo-modal .jogo-local-select',d.local||'Casa');
 setValorCampoJogo('#novo-jogo-modal .jogo-caracteristica-select',d.caracteristica||'Clube');
 setValorCampoJogo('#novo-jogo-modal .jogo-minutos-input',d.minutos_jogo||'');
 const indices=[];
 const statsMap={};
 const convocadosSet=new Set();
 (d.atletas||[]).forEach(a=>{
  const idx=localizarAtletaSalvoEmJogo(a);
  if(idx<0)return;
  indices.push(idx);
  statsMap[String(idx)]={minutos:a.minutos||0,gols:a.gols||0,amarelo:a.amarelo||0,vermelho:a.vermelho||0};
  if(a.convocado)convocadosSet.add(idx);
 });
 window.__jogoAtletasEditIndices=Array.from(new Set(indices));
 window.__jogoStatsEditMap=statsMap;
 window.__jogoConvocadosEditSet=convocadosSet;
 renderNovoJogoListaAtletas();
}


/* === MÓDULO RELATÓRIOS === */
function relatoriosAnosDisponiveis(){return ['2009','2010','2011','2012','2013','2014','2015','2016','2017'];}
function relatoriosTipos(){return {antropometricas:'Medidas Antropométricas',resistencia:'Resistência',potencia:'Potência',velocidade:'Velocidade',agilidade:'Agilidade',todos:'Todos'};}
function relatoriosMaxAvaliacao(){
 let max=1;
 (excelColumns||[]).forEach(col=>{const m=String(col).match(/^Data(\d+)$/i);if(m)max=Math.max(max,parseInt(m[1],10)||1);});
 return max;
}
function relatoriosValorColuna(row,termos){
 const chave=Object.keys(row||{}).find(k=>termos.some(t=>String(k).toLowerCase().trim()===String(t).toLowerCase().trim()));
 return chave?(row[chave]??''):'';
}
function relatoriosValorColunaFlex(row,termos){
 const chave=Object.keys(row||{}).find(k=>termos.some(t=>String(k).toLowerCase().includes(String(t).toLowerCase())));
 return chave?(row[chave]??''):'';
}
function relatoriosNomeAtleta(row){return relatoriosValorColunaFlex(row,['apelido'])||relatoriosValorColunaFlex(row,['nome completo','nome'])||'Sem Nome';}
function relatoriosAnoAtleta(row){return String(relatoriosValorColuna(row,['Ano'])||'').trim();}
function relatoriosNascimento(row){return convertExcelDate(relatoriosValorColunaFlex(row,['data de nascimento','nascimento']));}
function relatoriosNum(valor){
 if(valor===undefined||valor===null||valor==='-'||String(valor).trim()==='')return NaN;
 let s=String(valor).replace('%','').replace(/\s/g,'').replace(',','.');
 const n=parseFloat(s);
 return isNaN(n)?NaN:n;
}
function relatoriosDataSort(valor){
 const s=String(valor||'').trim();
 const m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
 if(m)return new Date(+m[3],+m[2]-1,+m[1]).getTime();
 const d=new Date(s);return isNaN(d)?0:d.getTime();
}
function relatoriosValorAvaliacao(row,base,evalNum){return valorAvaliacao(row,base,evalNum);}
function relatoriosMediaCampo(row,prefixo,evalNum){
 const vals=[];
 for(let i=1;i<=7;i++){
  const v=relatoriosNum(relatoriosValorAvaliacao(row,prefixo+i+'_',evalNum)||relatoriosValorAvaliacao(row,prefixo+i,evalNum));
  if(!isNaN(v))vals.push(v);
 }
 if(!vals.length)return '';
 return (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2).replace('.',',');
}
function relatoriosMelhorSalto(row,evalNum){
 const salvo=relatoriosValorAvaliacao(row,'MelhorSalto',evalNum); if(String(salvo||'').trim())return salvo;
 const vals=['Salto1_','Salto2_','Salto3_'].map(b=>relatoriosNum(relatoriosValorAvaliacao(row,b,evalNum))).filter(v=>!isNaN(v));
 return vals.length?String(Math.max(...vals)).replace('.',','):'';
}
function relatoriosAgilidade(row,evalNum){
 const salvo=relatoriosValorAvaliacao(row,'Agilidade',evalNum); if(String(salvo||'').trim())return salvo;
 const vals=['Volta1_','Volta2_'].map(b=>relatoriosNum(relatoriosValorAvaliacao(row,b,evalNum))).filter(v=>!isNaN(v));
 return vals.length?String(Math.min(...vals)).replace('.',','):'';
}
function relatoriosDistancia(row,evalNum){
 const dist=relatoriosValorAvaliacao(row,'distancia',evalNum); if(String(dist||'').trim())return dist;
 const nivel=relatoriosValorAvaliacao(row,'nivel',evalNum);
 return distanciaNivelResistencia(nivel)||'';
}
function relatoriosGordura(row,evalNum){
 const salvo=relatoriosValorAvaliacao(row,'PercentualGordura',evalNum); if(String(salvo||'').trim())return formatGordura(salvo);
 const nums=['Dobras1_','Dobras2_','Dobras3_','Dobras4_'].map(b=>relatoriosNum(relatoriosValorAvaliacao(row,b,evalNum)));
 if(nums.some(v=>isNaN(v)))return '';
 const soma=nums.reduce((a,b)=>a+b,0);
 return ((soma*0.153+5.783)).toFixed(2).replace('.',',')+'%';
}
function relatoriosAlturaPredita(row,evalNum){
 const salvo=relatoriosValorAvaliacao(row,'alturapredita',evalNum); if(String(salvo||'').trim())return String(salvo).replace('.',',');
 const nasc=relatoriosNascimento(row), dataAval=convertExcelDate(relatoriosValorAvaliacao(row,'Data',evalNum));
 const idade=relatoriosNum(calcularIdadeAvaliacao(nasc,dataAval));
 const peso=relatoriosNum(relatoriosValorAvaliacao(row,'peso',evalNum));
 const altura=relatoriosNum(relatoriosValorAvaliacao(row,'Altura',evalNum));
 const sentado=relatoriosNum(relatoriosValorAvaliacao(row,'alturasentado',evalNum));
 if([idade,peso,altura,sentado].some(v=>isNaN(v)||v<=0))return '';
 const r=alturaPreditaCalculada(idade,peso,altura,sentado);
 return r&&r.valor?(Math.floor(r.valor)/100).toFixed(2).replace('.',','):'';
}
function relatoriosColunas(tipo){
 const base=[{key:'nome',label:'Nome',type:'text'},{key:'nascimento',label:'Data de Nascimento',type:'date'}];
 if(tipo==='antropometricas')return base.concat([{key:'altura',label:'Altura',type:'num'},{key:'peso',label:'Peso',type:'num'},{key:'predita',label:'Altura Predita',type:'num'},{key:'gordura',label:'% de gordura',type:'num'}]);
 if(tipo==='resistencia')return base.concat([{key:'nivel',label:'Nível',type:'num'},{key:'distancia',label:'Distância',type:'num'}]);
 if(tipo==='potencia')return base.concat([{key:'salto1',label:'Salto 1',type:'num'},{key:'salto2',label:'Salto 2',type:'num'},{key:'salto3',label:'Salto 3',type:'num'},{key:'melhorSalto',label:'Melhor Salto',type:'num'}]);
 if(tipo==='velocidade')return base.concat([{key:'aceleracao',label:'Aceleração',type:'num'},{key:'velocidade',label:'Velocidade',type:'num'}]);
 if(tipo==='agilidade')return base.concat([{key:'agilidade',label:'Agilidade',type:'num'}]);
 return base.concat([{key:'peso',label:'Peso',type:'num'},{key:'altura',label:'Altura',type:'num'},{key:'predita',label:'Altura Predita',type:'num'},{key:'gordura',label:'% de Gordura',type:'num'},{key:'distancia',label:'Distância',type:'num'},{key:'melhorSalto',label:'Salto',type:'num'},{key:'aceleracao',label:'Aceleração',type:'num'},{key:'velocidade',label:'Velocidade',type:'num'},{key:'agilidade',label:'Agilidade',type:'num'}]);
}
function relatoriosLinha(row,evalNum){
 const aceleracao=relatoriosValorAvaliacao(row,'Aceleraçãofinal',evalNum)||relatoriosMediaCampo(row,'aceleração',evalNum);
 const velocidade=relatoriosValorAvaliacao(row,'Velocidadefinal',evalNum)||relatoriosMediaCampo(row,'velocidade',evalNum);
 return {
  ano:relatoriosAnoAtleta(row),
  nome:relatoriosNomeAtleta(row),
  nascimento:relatoriosNascimento(row),
  altura:relatoriosValorAvaliacao(row,'Altura',evalNum),
  peso:relatoriosValorAvaliacao(row,'peso',evalNum),
  predita:relatoriosAlturaPredita(row,evalNum),
  gordura:relatoriosGordura(row,evalNum),
  nivel:relatoriosValorAvaliacao(row,'nivel',evalNum),
  distancia:relatoriosDistancia(row,evalNum),
  salto1:relatoriosValorAvaliacao(row,'Salto1_',evalNum),
  salto2:relatoriosValorAvaliacao(row,'Salto2_',evalNum),
  salto3:relatoriosValorAvaliacao(row,'Salto3_',evalNum),
  melhorSalto:relatoriosMelhorSalto(row,evalNum),
  aceleracao:aceleracao,
  velocidade:velocidade,
  agilidade:relatoriosAgilidade(row,evalNum)
 };
}
function openRelatoriosModal(){
 document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active-screen');s.style.display='';});
 document.getElementById('home-screen')?.classList.add('active-screen');
 let m=document.getElementById('relatorios-modal');
 if(!m){m=document.createElement('div');m.className='relatorios-overlay';m.id='relatorios-modal';document.body.appendChild(m);}
 const tipos=relatoriosTipos();
 const maxEval=relatoriosMaxAvaliacao();
 window.__relatoriosSort={key:'anoNome',dir:'asc'};
 window.__relatorioAtletaSelecionadoIndex=null;
 m.innerHTML=`<div class="relatorios-card"><div class="relatorios-top"><div class="relatorios-left"><select id="relatorio-tipo-select" onchange="relatoriosResetSort();renderRelatoriosTabela()">${Object.keys(tipos).map(k=>`<option value="${k}">${tipos[k]}</option>`).join('')}</select></div><h2 id="relatorios-titulo">Medidas Antropométricas</h2><div class="relatorios-anos">${relatoriosAnosDisponiveis().map(a=>`<label><input type="checkbox" class="relatorio-ano-chk" value="${a}" onchange="renderRelatoriosTabela()"> ${a}</label>`).join('')}</div><div class="relatorios-actions"><button onclick="closeRelatoriosModal()">Fechar</button><button onclick="exportarRelatorioPDF()">PDF</button></div></div><div class="relatorios-table-wrap"><table id="relatorios-table"><thead><tr id="relatorios-head"></tr></thead><tbody id="relatorios-body"></tbody></table></div><div class="relatorios-bottom"><select id="relatorio-eval-select" onchange="renderRelatoriosTabela()">${Array.from({length:maxEval},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===maxEval?'selected':''}>Avaliação ${n}</option>`).join('')}</select><button id="btn-relatorio-individual" class="relatorio-individual-btn" onclick="gerarRelatorioFisicoIndividual()" disabled>Relatório Físico Individual</button></div></div>`;
 m.style.display='flex';
 renderRelatoriosTabela();
}
function closeRelatoriosModal(){const m=document.getElementById('relatorios-modal');if(m)m.style.display='none';}
function relatoriosResetSort(){window.__relatoriosSort={key:'anoNome',dir:'asc'};window.__relatorioAtletaSelecionadoIndex=null;}
function relatoriosSortBy(key){
 const s=window.__relatoriosSort||{key:'nome',dir:'asc'};
 if(s.key===key)s.dir=s.dir==='asc'?'desc':'asc'; else {s.key=key;s.dir='asc';}
 window.__relatoriosSort=s;renderRelatoriosTabela();
}
function relatoriosDadosAtuais(){
 const tipo=document.getElementById('relatorio-tipo-select')?.value||'antropometricas';
 const evalNum=document.getElementById('relatorio-eval-select')?.value||relatoriosMaxAvaliacao();
 const anosMarcados=Array.from(document.querySelectorAll('#relatorios-modal .relatorio-ano-chk:checked')).map(x=>x.value);
 const anosFiltro=anosMarcados.length?anosMarcados:relatoriosAnosDisponiveis();
 const cols=relatoriosColunas(tipo);
 let dados=(excelData||[]).map((row,index)=>({row,index})).filter(item=>anosFiltro.includes(relatoriosAnoAtleta(item.row))).map(item=>{const linha=relatoriosLinha(item.row,evalNum);linha.__index=item.index;return linha;});
 const sort=window.__relatoriosSort||{key:'anoNome',dir:'asc'};
 const col=cols.find(c=>c.key===sort.key);
 dados.sort((a,b)=>{
  let r=0;
  if(sort.key==='anoNome'||!col){
   const aa=parseInt(a.ano||'9999',10)||9999;
   const ab=parseInt(b.ano||'9999',10)||9999;
   r=aa-ab;
   if(r===0)r=String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR');
   return r;
  }
  let va=a[col.key], vb=b[col.key];
  if(col.type==='num'){
   const na=relatoriosNum(va), nb=relatoriosNum(vb);
   if(isNaN(na)&&isNaN(nb))r=0; else if(isNaN(na))r=1; else if(isNaN(nb))r=-1; else r=na-nb;
  }else if(col.type==='date')r=relatoriosDataSort(va)-relatoriosDataSort(vb);
  else r=String(va||'').localeCompare(String(vb||''),'pt-BR');
  return sort.dir==='asc'?r:-r;
 });
 return {tipo,evalNum,cols,dados,sort,anosMarcados,anosFiltro};
}
function renderRelatoriosTabela(){
 const state=relatoriosDadosAtuais();
 const tipos=relatoriosTipos();
 const titulo=document.getElementById('relatorios-titulo'); if(titulo)titulo.textContent=tipos[state.tipo]||'Relatórios';
 const head=document.getElementById('relatorios-head'), body=document.getElementById('relatorios-body'); if(!head||!body)return;
 head.innerHTML=state.cols.map(c=>`<th onclick="relatoriosSortBy('${c.key}')">${c.label}${state.sort.key===c.key?(state.sort.dir==='asc'?' ▲':' ▼'):''}</th>`).join('');
 const selecionavel=state.tipo==='todos';
 body.innerHTML=state.dados.map(row=>`<tr class="${selecionavel?'relatorio-row-selecionavel':''} ${window.__relatorioAtletaSelecionadoIndex===row.__index?'relatorio-row-selected':''}" ${selecionavel?`onclick="selecionarAtletaRelatorio(${row.__index})"`:''}>${state.cols.map(c=>`<td>${escapeHtmlJogos(row[c.key]||'')}</td>`).join('')}</tr>`).join('');
 atualizarBotaoRelatorioIndividual(state);
}
function selecionarAtletaRelatorio(index){
 window.__relatorioAtletaSelecionadoIndex=(window.__relatorioAtletaSelecionadoIndex===index)?null:index;
 renderRelatoriosTabela();
}
function atualizarBotaoRelatorioIndividual(state){
 const btn=document.getElementById('btn-relatorio-individual');
 if(!btn)return;
 const ativo=state&&state.tipo==='todos'&&window.__relatorioAtletaSelecionadoIndex!==null&&window.__relatorioAtletaSelecionadoIndex!==undefined;
 btn.style.display=state&&state.tipo==='todos'?'block':'none';
 btn.disabled=!ativo;
}
function relatoriosAnosTitulo(state){
 const anos=(state.anosMarcados&&state.anosMarcados.length)?state.anosMarcados:[];
 if(anos.length===0)return 'Todos os anos';
 return anos.join(' / ');
}
function relatoriosValorComUnidade(valor,unidade){
 if(valor===undefined||valor===null||String(valor).trim()==='')return '';
 return `${valor} ${unidade}`;
}
function relatoriosClasseGordura(valor){
 const n=relatoriosNum(valor);
 if(isNaN(n))return '';
 if(n<9)return 'gord-azul';
 if(n>=9 && n<=9.09)return 'gord-amarelo';
 if(n>=9.10 && n<=10.99)return 'gord-verde';
 if(n>=11 && n<12)return 'gord-amarelo';
 if(n>=12)return 'gord-vermelho';
 return '';
}
function relatorioIndividualMetricasAtleta(index){
 const row=excelData[index]||{};
 const max=relatoriosMaxAvaliacao();
 const avals=[];
 for(let n=1;n<=max;n++){
  const linha=relatoriosLinha(row,n);
  const data=convertExcelDate(relatoriosValorAvaliacao(row,'Data',n));
  const tem=['peso','altura','predita','gordura','distancia','melhorSalto','aceleracao','velocidade','agilidade'].some(k=>String(linha[k]||'').trim()!=='');
  if(tem)avals.push({eval:n,label:data&&data!=='-'?data:`Aval. ${n}`,...linha});
 }
 return avals;
}
function relatorioIndividualGrupoRows(atletaIndex){
 const atleta=excelData[atletaIndex]||{};
 const anosMarcados=Array.from(document.querySelectorAll('#relatorios-modal .relatorio-ano-chk:checked')).map(x=>x.value);
 const anos=anosMarcados.length?anosMarcados:[relatoriosAnoAtleta(atleta)];
 return (excelData||[]).filter(row=>anos.includes(relatoriosAnoAtleta(row)));
}
function relatorioIndividualMediaGrupoPorAvaliacao(atletaIndex,evalNum,key){
 const rows=relatorioIndividualGrupoRows(atletaIndex);
 const vals=rows.map(row=>relatoriosNum(relatoriosLinha(row,evalNum)[key])).filter(v=>!isNaN(v));
 if(!vals.length)return NaN;
 return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function relatorioIndividualCorPonto(key,valor,media){
 if(key==='gordura'){
  const cls=relatoriosClasseGordura(valor);
  if(cls==='gord-azul')return '#00b0f0';
  if(cls==='gord-amarelo')return '#ffff00';
  if(cls==='gord-verde')return '#00ff38';
  if(cls==='gord-vermelho')return '#ff0000';
  return '#999';
 }
 const tolerancia=key==='distancia'?100:0.10;
 const menorMelhor=['aceleracao','velocidade','agilidade'].includes(key);
 const cls=relatoriosClassePorMedia(valor,media,tolerancia,menorMelhor);
 if(cls==='media-verde')return '#00b050';
 if(cls==='media-amarelo')return '#ffff00';
 if(cls==='media-vermelho')return '#ff0000';
 return '#999';
}
function relatorioIndividualChartSVG(titulo,avals,key,unidade){
 const pontos=avals.map(a=>({label:`${a.eval}`,valor:relatoriosNum(a[key]),media:relatorioIndividualMediaGrupoPorAvaliacao(window.__relatorioAtletaSelecionadoIndex,a.eval,key)})).filter(p=>!isNaN(p.valor));
 if(!pontos.length)return `<div class="grafico-vazio"><h3>${titulo}</h3><p>Sem dados suficientes.</p></div>`;
 const w=430,h=185,padL=38,padR=14,padT=26,padB=36;
 let vals=pontos.flatMap(p=>[p.valor,isNaN(p.media)?p.valor:p.media]);
 if(key==='gordura')vals=vals.concat([8,14]);
 let min=Math.min(...vals),max=Math.max(...vals); if(min===max){min-=1;max+=1;}
 const margem=(max-min)*0.08; min-=margem; max+=margem;
 if(key==='gordura'){min=Math.min(min,8);max=Math.max(max,14);}
 const x=i=>padL+(pontos.length===1?(w-padL-padR)/2:i*(w-padL-padR)/(pontos.length-1));
 const y=v=>padT+(max-v)*(h-padT-padB)/(max-min);
 const fmtValor=(v)=>{
  if(isNaN(v))return '-';
  const casas=key==='distancia'?0:2;
  return v.toFixed(casas).replace('.',',')+(unidade||'');
 };
 const linha=pontos.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
 let bg='';
 if(key==='gordura'){
  const band=(low,high,color)=>{
   const a=Math.max(low,min), b=Math.min(high,max);
   if(b<=a)return '';
   return `<rect x="${padL}" y="${y(b)}" width="${w-padL-padR}" height="${Math.max(0,y(a)-y(b))}" fill="${color}" opacity="0.62"/>`;
  };
  bg=[
   band(min,9,'#8fd3ff'),
   band(9,9.10,'#fff176'),
   band(9.10,11,'#83f29b'),
   band(11,12,'#fff176'),
   band(12,max,'#ff8a80')
  ].join('');
 }
 const circles=pontos.map((p,i)=>{const cor=relatorioIndividualCorPonto(key,p.valor,p.media);return `<circle cx="${x(i)}" cy="${y(p.valor)}" r="5" fill="${cor}" stroke="#fff" stroke-width="1.5"/><text x="${x(i)}" y="${y(p.valor)-8}" text-anchor="middle" font-size="8" font-weight="700">${fmtValor(p.valor)}</text>`;}).join('');
 const grid=[0,1,2,3,4].map(i=>{const yy=padT+i*(h-padT-padB)/4;return `<line x1="${padL}" y1="${yy}" x2="${w-padR}" y2="${yy}" stroke="#e5e5e5"/>`;}).join('');
 const mediasLabels=pontos.map((p,i)=>{
  const anchor=i===0?'start':(i===pontos.length-1?'end':'middle');
  const dx=i===0?'-2':(i===pontos.length-1?'2':'0');
  const texto=key==='gordura'?`Avaliação ${p.label}`:`Média: ${fmtValor(p.media)}`;
  return `<text x="${x(i)}" dx="${dx}" y="${h-10}" text-anchor="${anchor}" font-size="8.5" font-weight="800" fill="#111">${texto}</text>`;
 }).join('');
 return `<svg class="grafico-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" fill="#fff"/><text x="${w/2}" y="18" text-anchor="middle" font-size="11" font-weight="800">${titulo}</text>${bg}${grid}<line x1="${padL}" y1="${h-padB}" x2="${w-padR}" y2="${h-padB}" stroke="#bbb"/><line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h-padB}" stroke="#bbb"/><path d="${linha}" fill="none" stroke="#0074d9" stroke-width="3"/>${circles}${mediasLabels}</svg>`;
}
async function relatorioIndividualBuscarEstatisticasJogos(atletaIndex){
 const row=excelData[atletaIndex]||{};
 const alvo={nomeCompleto:nomeCompletoAtletaJogos(row)||relatoriosNomeAtleta(row),ano:relatoriosAnoAtleta(row),nascimento:nascimentoAtletaJogos(row)};
 const stats={jogos:0,vitorias:0,empates:0,derrotas:0,minutos:0,gols:0,amarelo:0,vermelho:0};
 try{
  const {data,error}=await _supabase.from('jogos').select('professor,numero_jogo,nome,dados');
  if(error)throw error;
  (data||[]).forEach(j=>{
   const atleta=(j.dados?.atletas||[]).find(a=>String(a.nomeCompleto||'').trim()===alvo.nomeCompleto&&String(a.nascimento||'').trim()===alvo.nascimento&&String(a.ano||'').trim()===alvo.ano);
   if(!atleta)return;
   const minutos=parseInt(atleta.minutos||0,10)||0;
   if(minutos<=0)return;
   stats.jogos++; stats.minutos+=minutos; stats.gols+=parseInt(atleta.gols||0,10)||0; stats.amarelo+=parseInt(atleta.amarelo||0,10)||0; stats.vermelho+=parseInt(atleta.vermelho||0,10)||0;
   const gf=parseInt(j.dados?.placar?.cfa_prosol||0,10)||0, gs=parseInt(j.dados?.placar?.adversario||0,10)||0;
   if(gf>gs)stats.vitorias++; else if(gf<gs)stats.derrotas++; else stats.empates++;
  });
 }catch(e){console.error('Erro ao buscar jogos para relatório individual:',e);}
 return stats;
}
function relatorioIndividualValorUltima(avals,key){
 for(let i=avals.length-1;i>=0;i--){if(String(avals[i][key]||'').trim()!=='')return avals[i][key];}
 return '-';
}
async function gerarRelatorioFisicoIndividual(){
 const index=window.__relatorioAtletaSelecionadoIndex;
 if(index===null||index===undefined||!excelData[index])return alert('Selecione um atleta primeiro.');
 const row=excelData[index];
 const avals=relatorioIndividualMetricasAtleta(index);
 if(!avals.length)return alert('Este atleta não possui avaliações para gerar a ficha.');
 const jogos=await relatorioIndividualBuscarEstatisticasJogos(index);
 const nomeCompleto=nomeCompletoAtletaJogos(row)||relatoriosNomeAtleta(row);
 const apelido=apelidoAtletaJogos(row)||relatoriosNomeAtleta(row);
 const foto=relatoriosValorColunaFlex(row,['foto'])||'camiseta_linha.png';
 const logo='logo.png';
 const pos1=relatoriosValorColunaFlex(row,['posição 1','posicao 1','posição','posicao'])||'-';
 const pos2=relatoriosValorColunaFlex(row,['posição 2','posicao 2'])||'-';
 const ult=avals[avals.length-1], ant=avals.length>1?avals[avals.length-2]:null;
 const esc=v=>escapeHtmlJogos(v??'');
 const valor=(key,fallback='-')=>{for(let i=avals.length-1;i>=0;i--){if(String(avals[i][key]||'').trim()!=='')return avals[i][key];}return fallback;};
 const valorAnt=(key,fallback='-')=>ant&&String(ant[key]||'').trim()!==''?ant[key]:fallback;
 const delta=(key,menorMelhor=false,unit='')=>{
  if(!ant)return '';
  const a=relatoriosNum(ult[key]), b=relatoriosNum(ant[key]);
  if(isNaN(a)||isNaN(b))return '';
  const dif=a-b;
  const bom=menorMelhor?dif<0:dif>0;
  const ruim=menorMelhor?dif>0:dif<0;
  const cls=bom?'bom':(ruim?'ruim':'neutro');
  const sinal=dif>0?'+':'';
  return `<span class="delta ${cls}">${sinal}${dif.toFixed(2).replace('.',',')}${unit}</span>`;
 };
 const card=(label,key,unit='',menorMelhor=false)=>`<div class="res-card"><span>${label}</span><strong>${esc(valor(key))}${unit}</strong>${delta(key,menorMelhor,unit)}</div>`;
 const compRow=a=>`<tr><td>${esc(a.label)}</td><td>${esc(a.peso)}</td><td>${esc(a.altura)}</td><td>${esc(a.gordura)}</td><td>${esc(a.distancia)}</td><td>${esc(a.melhorSalto)}</td><td>${esc(a.aceleracao)}</td><td>${esc(a.velocidade)}</td><td>${esc(a.agilidade)}</td></tr>`;
 const charts=[
  relatorioIndividualChartSVG('% de Gordura',avals,'gordura','%'),
  relatorioIndividualChartSVG('Teste de Resistência',avals,'distancia','m'),
  relatorioIndividualChartSVG('Teste de Potência',avals,'melhorSalto','m'),
  relatorioIndividualChartSVG('Aceleração em 10 m',avals,'aceleracao','s'),
  relatorioIndividualChartSVG('Velocidade em 30 m',avals,'velocidade','s'),
  relatorioIndividualChartSVG('Circuito de Agilidade',avals,'agilidade','s')
 ].join('');
 const w=window.open('','_blank','width=1150,height=900'); if(!w)return alert('Permita pop-ups para gerar a ficha.');
 const html=`<!doctype html><html><head><meta charset="utf-8"><title>Ficha Física - ${esc(apelido)}</title><style>
 @page{size:A4 portrait;margin:4mm}
 *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
 body{margin:0;background:#f6f1e8;color:#171717;font-family:Arial,Helvetica,sans-serif}.page-strip{height:8px;background:#58111a;border-bottom:4px solid #f9c614}.ficha{width:100%;max-width:1040px;margin:6px auto 0}.header-card{background:#fff;border:1px solid #d8cfc2;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px #0001}.header-band{background:#58111a;color:#f9c614;text-align:center;padding:4px 10px 2px}.header-band h1{font-size:18px;margin:0;font-weight:900;letter-spacing:.4px}.header-band p{font-size:9px;margin:1px 0 0;color:#fff;font-weight:700}.header-body{display:grid;grid-template-columns:82px 1fr 70px;gap:10px;align-items:center;padding:8px 14px 9px}.foto-box{width:70px;height:105px;border:2px solid #58111a;border-radius:8px;background:#f7f7f7;display:flex;align-items:center;justify-content:center;overflow:hidden;margin:auto}.foto-box img{width:100%;height:100%;object-fit:cover}.logo-head{width:60px;display:block;margin:auto}.athlete-name{font-size:18px;line-height:1.05;margin:0;color:#58111a;font-weight:900}.athlete-sub{font-size:10px;font-weight:800;margin:4px 0;color:#222}.athlete-muted{font-size:9px;color:#666;margin-bottom:5px}.badges{display:flex;gap:5px;flex-wrap:wrap}.badge{min-width:54px;border-radius:6px;padding:4px 5px;text-align:center;color:#fff;font-weight:800}.badge span{display:block;font-size:6px;text-transform:uppercase}.badge strong{display:block;font-size:14px;line-height:1}.b-blue{background:#0984e3}.b-green{background:#27ae60}.b-yellow{background:#f9c614;color:#1c1c1c}.b-red{background:#d63031}.b-maroon{background:#58111a}.section-title{background:#58111a;color:#f9c614;text-align:center;font-size:12px;font-weight:900;padding:5px;margin:8px 0 6px;border-radius:6px;text-transform:uppercase;letter-spacing:.3px}.resumo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.res-card{background:#fff;border:1px solid #d8cfc2;border-radius:8px;padding:6px 8px;min-height:46px;position:relative;box-shadow:0 1px 3px #0001;border-left:5px solid #f9c614}.res-card:nth-child(2n){border-left-color:#58111a}.res-card span{display:block;color:#666;font-size:9px;font-weight:800}.res-card strong{display:block;font-size:15px;margin-top:3px}.delta{position:absolute;right:7px;top:24px;font-size:8px;font-weight:900}.delta.bom{color:#159957}.delta.ruim{color:#b30000}.delta.neutro{color:#58111a}.comparativo{width:100%;border-collapse:collapse;background:#fff;font-size:8px;border:1px solid #58111a}.comparativo th{background:#58111a;color:#fff;padding:3px 3px}.comparativo td{padding:2px 3px;text-align:center;border:1px solid #eadfd0}.comparativo td:first-child{font-weight:900}.comparativo tr:nth-child(even){background:#faf6ed}.graficos{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:0}.grafico-svg,.grafico-vazio{width:100%;background:#fff;border:1px solid #d8cfc2;border-radius:8px}.grafico-vazio{height:155px;display:flex;flex-direction:column;align-items:center;justify-content:center}.legenda{font-size:8px;text-align:center;color:#333;margin:4px 0;display:flex;justify-content:center;gap:14px;align-items:center;font-weight:800}.leg-item{display:inline-flex;align-items:center;gap:4px}.leg-dot{width:9px;height:9px;border-radius:50%;display:inline-block;border:1px solid #fff;box-shadow:0 0 0 1px #999}.leg-green{background:#00b050}.leg-yellow{background:#ffff00}.leg-red{background:#ff0000}.footer{border-top:1px solid #d8cfc2;color:#666;font-size:8px;margin-top:4px;padding-top:3px;display:flex;justify-content:space-between}@media print{.ficha{margin-top:4px}.grafico-svg{height:158px!important}.graficos{gap:5px}.section-title{margin:6px 0 4px}.header-card{break-inside:avoid}.resumo-grid,.comparativo,.graficos{break-inside:avoid}.footer{display:none}}
 </style></head><body><div class="page-strip"></div><div class="ficha"><div class="header-card"><div class="header-band"><h1>FICHA FÍSICA INDIVIDUAL</h1><p>Evolução dos Testes Físicos • CFA Prosol</p></div><div class="header-body"><div class="foto-box"><img src="${foto}" onerror="this.src='camiseta_linha.png'"></div><div><h2 class="athlete-name">${esc(nomeCompleto)}</h2><div class="athlete-sub">Ano: ${esc(relatoriosAnoAtleta(row))} &nbsp; • &nbsp; Nascimento: ${esc(nascimentoAtletaJogos(row))} &nbsp; • &nbsp; Posição: ${esc(pos1)}</div><div class="athlete-muted">Última avaliação: ${esc(ult.label)} &nbsp; • &nbsp; Avaliações comparadas: ${avals.length}</div><div class="badges"><div class="badge b-blue"><span>Jogos</span><strong>${jogos.jogos}</strong></div><div class="badge b-green"><span>Vitórias</span><strong>${jogos.vitorias}</strong></div><div class="badge b-yellow"><span>Empates</span><strong>${jogos.empates}</strong></div><div class="badge b-red"><span>Derrotas</span><strong>${jogos.derrotas}</strong></div><div class="badge b-maroon"><span>Minutos</span><strong>${jogos.minutos}</strong></div><div class="badge b-yellow"><span>Gols</span><strong>${jogos.gols}</strong></div></div></div><img class="logo-head" src="${logo}"></div></div><div class="section-title">Resumo da Última Avaliação</div><div class="resumo-grid">${card('Peso','peso',' Kg')}${card('Altura','altura',' m')}${card('Alt. Predita','predita',' m')}${card('% Gordura','gordura','',true)}${card('Resistência','distancia',' m')}${card('Potência','melhorSalto',' m')}${card('Aceleração','aceleracao',' s',true)}${card('Velocidade','velocidade',' s',true)}${card('Agilidade','agilidade',' s',true)}</div><div class="section-title">Comparativo das Avaliações</div><table class="comparativo"><thead><tr><th>Data</th><th>Peso</th><th>Altura</th><th>Gordura</th><th>Distância</th><th>Salto</th><th>Acel.</th><th>Veloc.</th><th>Agil.</th></tr></thead><tbody>${avals.map(compRow).join('')}</tbody></table><div class="section-title">Evolução dos Testes</div><div class="graficos">${charts}</div><div class="legenda"><span class="leg-item"><i class="leg-dot leg-green"></i>Acima da média</span><span class="leg-item"><i class="leg-dot leg-yellow"></i>Na média</span><span class="leg-item"><i class="leg-dot leg-red"></i>Abaixo da média</span></div><div class="footer"><span>CFA Prosol • Relatório gerado pelo Sistema de Organização Metodológica</span><span>Ficha Física Individual</span></div></div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`;
 w.document.write(html);w.document.close();
}
function relatoriosMediaValores(dados,key){
 const vals=(dados||[]).map(r=>relatoriosNum(r[key])).filter(v=>!isNaN(v));
 if(!vals.length)return NaN;
 return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function relatoriosMediasCategoria(state){
 return {
  distancia:relatoriosMediaValores(state.dados,'distancia'),
  melhorSalto:relatoriosMediaValores(state.dados,'melhorSalto'),
  aceleracao:relatoriosMediaValores(state.dados,'aceleracao'),
  velocidade:relatoriosMediaValores(state.dados,'velocidade'),
  agilidade:relatoriosMediaValores(state.dados,'agilidade')
 };
}
function relatoriosFormatoMedia(valor,sufixo=''){
 if(isNaN(valor))return '-';
 return valor.toFixed(2).replace('.',',')+sufixo;
}
function relatoriosClassePorMedia(valor,media,tolerancia,menorMelhor=false){
 const n=relatoriosNum(valor);
 if(isNaN(n)||isNaN(media))return '';
 if(n < media - tolerancia)return menorMelhor?'media-verde':'media-vermelho';
 if(n > media + tolerancia)return menorMelhor?'media-vermelho':'media-verde';
 return 'media-amarelo';
}
function relatoriosClasseCelula(key,valor,medias){
 if(key==='gordura')return relatoriosClasseGordura(valor);
 if(key==='distancia')return relatoriosClassePorMedia(valor,medias.distancia,100,false);
 if(key==='melhorSalto')return relatoriosClassePorMedia(valor,medias.melhorSalto,0.10,false);
 if(key==='aceleracao')return relatoriosClassePorMedia(valor,medias.aceleracao,0.10,true);
 if(key==='velocidade')return relatoriosClassePorMedia(valor,medias.velocidade,0.10,true);
 if(key==='agilidade')return relatoriosClassePorMedia(valor,medias.agilidade,0.10,true);
 return '';
}
function relatoriosColunasPDF(tipo){
 const base=[{key:'nome',label:'Nome'},{key:'nascimento',label:'Nasc.'}];
 if(tipo==='antropometricas')return base.concat([{key:'altura',label:'Altura',unit:' m'},{key:'peso',label:'Peso',unit:' Kg'},{key:'predita',label:'Altura Predita',unit:' m'},{key:'gordura',label:'% de Gordura'}]);
 if(tipo==='resistencia')return base.concat([{key:'nivel',label:'Nível'},{key:'distancia',label:'Distância'}]);
 if(tipo==='potencia')return base.concat([{key:'salto1',label:'Salto 1'},{key:'salto2',label:'Salto 2'},{key:'salto3',label:'Salto 3'},{key:'melhorSalto',label:'Melhor Salto'}]);
 if(tipo==='velocidade')return base.concat([{key:'aceleracao',label:'Aceleração'},{key:'velocidade',label:'Velocidade'}]);
 if(tipo==='agilidade')return base.concat([{key:'agilidade',label:'Agilidade'}]);
 return base.concat([{key:'peso',label:'Peso',unit:' Kg'},{key:'altura',label:'Altura',unit:' m'},{key:'predita',label:'Altura Predita',unit:' m'},{key:'gordura',label:'% de Gordura'},{key:'distancia',label:'Distância'},{key:'melhorSalto',label:'Salto'},{key:'aceleracao',label:'Aceleração'},{key:'velocidade',label:'Velocidade'},{key:'agilidade',label:'Agilidade'}]);
}
function relatoriosValorPDF(row,col){
 const v=row[col.key];
 if(v===undefined||v===null||String(v).trim()==='')return '';
 return String(v)+(col.unit||'');
}
function relatoriosTituloPDF(state){
 const tipos=relatoriosTipos();
 const nomeTitulo=state.tipo==='todos'?'Teste Físico':(tipos[state.tipo]||'Relatório');
 return `${nomeTitulo} - ${relatoriosAnosTitulo(state)}`;
}
function relatoriosRodapeMedias(state,medias){
 if(state.tipo==='antropometricas')return '';
 if(state.tipo==='resistencia')return `<div class="media-cat">Média da categoria: ${relatoriosFormatoMedia(medias.distancia,' m')}</div>`;
 if(state.tipo==='potencia')return `<div class="media-cat">Média da categoria: ${relatoriosFormatoMedia(medias.melhorSalto,' m')}</div>`;
 if(state.tipo==='velocidade')return `<div class="media-cat">Média da categoria: Aceleração ${relatoriosFormatoMedia(medias.aceleracao)} | Velocidade ${relatoriosFormatoMedia(medias.velocidade)}</div>`;
 if(state.tipo==='agilidade')return `<div class="media-cat">Média da categoria: ${relatoriosFormatoMedia(medias.agilidade)}</div>`;
 return `<div class="media-cat">Médias da categoria: Distância ${relatoriosFormatoMedia(medias.distancia,' m')} | Salto ${relatoriosFormatoMedia(medias.melhorSalto,' m')} | Aceleração ${relatoriosFormatoMedia(medias.aceleracao)} | Velocidade ${relatoriosFormatoMedia(medias.velocidade)} | Agilidade ${relatoriosFormatoMedia(medias.agilidade)}</div>`;
}
function exportarRelatorioEspecialPDF(state){
 const w=window.open('','_blank','width=1100,height=800');
 if(!w)return alert('Permita pop-ups para gerar o PDF.');
 const titulo=relatoriosTituloPDF(state);
 const cols=relatoriosColunasPDF(state.tipo);
 const medias=relatoriosMediasCategoria(state);
 const bodyClass=state.tipo==='todos'?'rel-todos':'';
 const pageOrientation=state.tipo==='todos'?'landscape':'portrait';
 const linhas=state.dados.map(r=>`<tr>${cols.map(c=>{
  const cls=relatoriosClasseCelula(c.key,r[c.key],medias);
  const extra=(c.key==='nome')?' class="nome"':` class="${cls}"`;
  return `<td${extra}>${escapeHtmlJogos(relatoriosValorPDF(r,c))}</td>`;
 }).join('')}</tr>`).join('');
 const html=`<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title><style>
 @page{size:A4 ${pageOrientation};margin:8mm 10mm}
 *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
 body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#000;background:#fff}.cab{display:grid;grid-template-columns:90px 1fr 90px;align-items:center;margin-bottom:10px}.cab img{width:64px;height:64px;object-fit:contain;margin:auto;display:block}.cab h1{text-align:center;font-size:22px;margin:0;font-weight:800}
 table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.15}th{background:#d60000;color:#fff;padding:3px 5px;text-align:left;font-weight:800}td{padding:2px 5px;border:0;text-align:left}td.nome{font-weight:800}td:not(.nome){text-align:center}.gord-azul{background:#00b0f0}.gord-amarelo,.media-amarelo{background:#ffff00}.gord-verde,.media-verde{background:#00ff38}.gord-vermelho,.media-vermelho{background:#ff0000;color:#000}.media-cat{margin-top:12px;font-size:15px;font-weight:800;text-align:center;border-top:2px solid #000;padding-top:8px}
 th:nth-child(1),td:nth-child(1){text-align:left}th:nth-child(2),td:nth-child(2){text-align:center;width:95px}
 body.rel-todos .cab{grid-template-columns:62px 1fr 62px;margin-bottom:6px}body.rel-todos .cab img{width:50px;height:50px}body.rel-todos .cab h1{font-size:18px}body.rel-todos table{font-size:10px;line-height:1.08;table-layout:auto}body.rel-todos th{padding:2.5px 2px;white-space:normal;text-align:center}body.rel-todos td{padding:2px 2px;white-space:nowrap}body.rel-todos td.nome{white-space:normal;min-width:80px}body.rel-todos th:nth-child(2),body.rel-todos td:nth-child(2){width:60px}body.rel-todos .media-cat{font-size:11px;margin-top:7px;padding-top:5px}
 </style></head><body class="${bodyClass}"><div class="cab"><img src="logo.png"><h1>${titulo}</h1><img src="logo.png"></div><table><thead><tr>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table>${relatoriosRodapeMedias(state,medias)}<script>window.onload=()=>setTimeout(()=>window.print(),400)<\/script></body></html>`;
 w.document.write(html);w.document.close();
}
function exportarRelatorioPDF(){
 const state=relatoriosDadosAtuais();
 exportarRelatorioEspecialPDF(state);
}


/* === PRANCHETA VIRTUAL - MINI CAMPO COM BOTÕES MÓVEIS === */
const pranchetaSistemasMini = {
 '4-3-3': [[8,50,'G'],[23,18,'2'],[23,38,'3'],[23,62,'4'],[23,82,'6'],[48,28,'5'],[48,50,'8'],[48,72,'10'],[76,18,'7'],[82,50,'9'],[76,82,'11']],
 '4-4-2': [[8,50,'G'],[23,18,'2'],[23,38,'3'],[23,62,'4'],[23,82,'6'],[50,15,'7'],[50,38,'5'],[50,62,'8'],[50,85,'11'],[78,38,'9'],[78,62,'10']],
 '4-2-3-1': [[8,50,'G'],[23,18,'2'],[23,38,'3'],[23,62,'4'],[23,82,'6'],[43,38,'5'],[43,62,'8'],[63,18,'7'],[63,50,'10'],[63,82,'11'],[82,50,'9']],
 '4-2-4': [[8,50,'G'],[23,18,'2'],[23,38,'3'],[23,62,'4'],[23,82,'6'],[45,38,'5'],[45,62,'8'],[76,14,'7'],[82,38,'9'],[82,62,'10'],[76,86,'11']],
 '3-5-2': [[8,50,'G'],[25,30,'3'],[25,50,'4'],[25,70,'5'],[48,12,'2'],[48,32,'6'],[48,50,'8'],[48,68,'10'],[48,88,'11'],[78,38,'9'],[78,62,'7']],
 '3-4-3': [[8,50,'G'],[25,30,'3'],[25,50,'4'],[25,70,'5'],[48,22,'2'],[48,42,'6'],[48,58,'8'],[48,78,'11'],[78,18,'7'],[82,50,'9'],[78,82,'10']],
 '5-3-2': [[8,50,'G'],[23,12,'2'],[23,31,'3'],[23,50,'4'],[23,69,'5'],[23,88,'6'],[51,32,'8'],[51,50,'10'],[51,68,'11'],[80,38,'9'],[80,62,'7']]
};
let pranchetaMiniContador = 12;
function openPranchetaModal() {
 let modal=document.getElementById('prancheta-modal');
 if(!modal){
  modal=document.createElement('div');
  modal.id='prancheta-modal';
  modal.className='mini-prancheta-overlay';
  modal.innerHTML='<div class="mini-prancheta-box"><div id="prancheta-modal-content"></div></div>';
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)closePranchetaModal();});
 }
 modal.style.display='flex';
 renderPranchetaVirtual();
}
function closePranchetaModal(){const modal=document.getElementById('prancheta-modal');if(modal)modal.style.display='none';}
function renderPranchetaVirtual(){
 const box=document.getElementById('prancheta-modal-content')||document.getElementById('prancheta-content');
 if(!box)return;
 box.innerHTML=`<div class="mini-board-toolbar"><strong>PRANCHETA VIRTUAL</strong><label>Sistema <select id="mini-tactical-system">${Object.keys(pranchetaSistemasMini).map(s=>`<option value="${s}">${s}</option>`).join('')}</select></label><button onclick="resetPrancheta()">Restaurar</button><button onclick="adicionarBotaoPrancheta()">+ Jogador</button><button onclick="adicionarBolaPrancheta()">Bola</button><button onclick="clearPrancheta()">Limpar</button><button class="mini-close" onclick="closePranchetaModal()">Fechar</button></div><div class="mini-board-area"><div id="mini-football-board"><div class="mini-field-line center"></div><div class="mini-center-circle"></div><div class="mini-center-dot"></div><div class="mini-box left big"></div><div class="mini-box left small"></div><div class="mini-box right big"></div><div class="mini-box right small"></div><div class="mini-goal left"></div><div class="mini-goal right"></div><div id="mini-board-players"></div></div></div><div class="mini-board-tip">Arraste os botões para movimentar. Clique duas vezes em um jogador para renomear.</div>`;
 document.getElementById('mini-tactical-system').onchange=resetPrancheta;
 resetPrancheta();
}
function resetPrancheta(){
 const area=document.getElementById('mini-board-players');
 const sel=document.getElementById('mini-tactical-system');
 if(!area||!sel)return;
 area.innerHTML='';
 pranchetaMiniContador=12;
 (pranchetaSistemasMini[sel.value]||[]).forEach(p=>criarBotaoPrancheta(p[0],p[1],p[2]));
}
function clearPrancheta(){const area=document.getElementById('mini-board-players');if(area)area.innerHTML='';}
function adicionarBotaoPrancheta(){criarBotaoPrancheta(50,50,String(pranchetaMiniContador++));}
function adicionarBolaPrancheta(){criarBotaoPrancheta(50,50,'⚽','ball');}
function criarBotaoPrancheta(x,y,texto,tipo='player'){
 const area=document.getElementById('mini-board-players');if(!area)return;
 const btn=document.createElement('button');
 btn.className='mini-tactical-player '+(tipo==='ball'?'mini-ball':'');
 btn.textContent=texto;
 btn.style.left=x+'%';
 btn.style.top=y+'%';
 btn.title='Arraste para mover';
 btn.ondblclick=()=>{if(tipo==='ball')return;const n=prompt('Nome, número ou função:',btn.textContent);if(n)btn.textContent=n;};
 makeTacticalDraggable(btn);
 area.appendChild(btn);
}
function makeTacticalDraggable(el){
 let dragging=false,dx=0,dy=0;
 el.addEventListener('pointerdown',e=>{
  e.preventDefault();dragging=true;
  const r=el.getBoundingClientRect();dx=e.clientX-(r.left+r.width/2);dy=e.clientY-(r.top+r.height/2);
  el.setPointerCapture?.(e.pointerId);el.classList.add('dragging');
 });
 el.addEventListener('pointermove',e=>{
  if(!dragging)return;
  const board=el.parentElement.parentElement.getBoundingClientRect();
  let x=((e.clientX-dx-board.left)/board.width)*100;
  let y=((e.clientY-dy-board.top)/board.height)*100;
  el.style.left=Math.max(2,Math.min(98,x))+'%';
  el.style.top=Math.max(4,Math.min(96,y))+'%';
 });
 const up=e=>{dragging=false;el.releasePointerCapture?.(e.pointerId);el.classList.remove('dragging');};
 el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
}


/* === CAMADA MOBILE: exportação e ajustes de interface sem alterar desktop === */
function prosolIsMobile(){
 return (window.matchMedia&&window.matchMedia('(max-width: 900px)').matches)||/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent||'');
}
function prosolSanitizeFilename(nome){
 return String(nome||'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_\-]+/gi,'_').replace(/_+/g,'_').replace(/^_|_$/g,'');
}
function prosolCloneComInputsComoTexto(elemento){
 const clone=elemento.cloneNode(true);
 const origInputs=elemento.querySelectorAll('input,textarea,select');
 const cloneInputs=clone.querySelectorAll('input,textarea,select');
 origInputs.forEach((inp,i)=>{
  const alvo=cloneInputs[i]; if(!alvo||!alvo.parentNode)return;
  const span=document.createElement('span');
  span.textContent=inp.tagName==='SELECT'?(inp.options[inp.selectedIndex]?.text||inp.value):inp.value;
  span.style.whiteSpace='pre-wrap';
  span.style.fontWeight='inherit';
  span.style.color='inherit';
  span.style.textAlign=getComputedStyle(inp).textAlign||'center';
  span.style.display='inline-block';
  span.style.width='100%';
  alvo.parentNode.replaceChild(span,alvo);
 });
 clone.querySelectorAll('.no-print,.campo-acoes,.close-btn,.campo-fechar,.novo-jogo-fechar').forEach(el=>el.remove());
 return clone;
}
function prosolExportElementPDF(elemento, filename, orientacao='portrait'){
 if(!elemento)return alert('Não encontrei o conteúdo para exportar.');
 if(typeof html2pdf==='undefined'){
  alert('Exportação em PDF indisponível neste dispositivo. Tente usar a opção de compartilhar/print do navegador.');
  return;
 }
 const wrapper=document.createElement('div');
 wrapper.style.background='#fff';
 wrapper.style.padding='0';
 wrapper.appendChild(prosolCloneComInputsComoTexto(elemento));
 const opt={
  margin:4,
  filename:prosolSanitizeFilename(filename)+'.pdf',
  image:{type:'jpeg',quality:0.98},
  html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},
  jsPDF:{unit:'mm',format:'a4',orientation:orientacao},
  pagebreak:{mode:['avoid-all','css','legacy']}
 };
 html2pdf().from(wrapper).set(opt).save();
}

function prosolPrepararWrapperPDF(elemento, orientacao='portrait', tipo='normal'){
 const wrapper=document.createElement('div');
 wrapper.style.background='#fff';
 wrapper.style.padding='0';
 wrapper.style.margin='0';
 wrapper.style.overflow='hidden';
 const clone=prosolCloneComInputsComoTexto(elemento);
 if(tipo==='convocacao-campo'){
  wrapper.style.width='297mm';
  wrapper.style.height='210mm';
  wrapper.style.maxHeight='210mm';
  clone.style.width='297mm';
  clone.style.height='210mm';
  clone.style.minHeight='210mm';
  clone.style.maxHeight='210mm';
  clone.style.overflow='hidden';
  clone.style.margin='0';
  clone.style.boxShadow='none';
 }
 wrapper.appendChild(clone);
 return wrapper;
}
function prosolOpcoesPDF(filename, orientacao='portrait', tipo='normal'){
 return {
  margin: tipo==='convocacao-campo' ? 0 : 4,
  filename:prosolSanitizeFilename(filename)+'.pdf',
  image:{type:'jpeg',quality:0.98},
  html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',scrollX:0,scrollY:0},
  jsPDF:{unit:'mm',format:'a4',orientation:orientacao},
  pagebreak:{mode: tipo==='convocacao-campo' ? ['avoid-all'] : ['avoid-all','css','legacy']}
 };
}
async function prosolCompartilharOuSalvarPDF(elemento, filename, orientacao='portrait', tipo='normal', titulo='CFA Prosol'){
 if(!elemento)return alert('Não encontrei o conteúdo para exportar.');
 if(typeof html2pdf==='undefined'){
  alert('Exportação em PDF indisponível neste dispositivo.');
  return;
 }
 const wrapper=prosolPrepararWrapperPDF(elemento,orientacao,tipo);
 const opt=prosolOpcoesPDF(filename,orientacao,tipo);
 try{
  const blob=await html2pdf().from(wrapper).set(opt).outputPdf('blob');
  const file=new File([blob],prosolSanitizeFilename(filename)+'.pdf',{type:'application/pdf'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
   await navigator.share({files:[file],title:titulo,text:'PDF gerado pelo CFA Prosol.'});
  }else{
   html2pdf().from(wrapper).set(opt).save();
  }
 }catch(e){
  console.error('Erro ao compartilhar PDF:',e);
  html2pdf().from(wrapper).set(opt).save();
 }
}
function prosolAjustarTextosMobileExportar(){
 if(!prosolIsMobile())return;
 document.querySelectorAll('button').forEach(btn=>{
  const t=(btn.textContent||'').trim();
  if(/imprimir/i.test(t)){
   const dentroConvocacao=btn.closest&&btn.closest('#campo-convocacao-modal');
   if(dentroConvocacao){
    btn.innerHTML=btn.innerHTML.replace(/IMPRIMIR/gi,'COMPARTILHAR PDF').replace(/Imprimir/gi,'Compartilhar PDF').replace(/🖨/g,'📤');
    btn.title='Compartilhar PDF';
   }else{
    btn.innerHTML=btn.innerHTML.replace(/IMPRIMIR/gi,'EXPORTAR PDF').replace(/Imprimir/gi,'Exportar PDF').replace(/🖨/g,'📄');
    btn.title='Exportar PDF';
   }
  }
 });
}
(function iniciarAjustesMobileProsol(){
 const start=()=>{
  prosolAjustarTextosMobileExportar();
  if(prosolIsMobile()){
   const obs=new MutationObserver(()=>prosolAjustarTextosMobileExportar());
   obs.observe(document.body,{childList:true,subtree:true});
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();

if(typeof imprimirFichasTreino==='function'){
 const imprimirFichasTreinoDesktop=imprimirFichasTreino;
 imprimirFichasTreino=function(){
  if(!prosolIsMobile())return imprimirFichasTreinoDesktop();
  const el=document.getElementById('fichas-render-container');
  prosolExportElementPDF(el,'fichas_treino_cfa_prosol','landscape');
 };
}
if(typeof imprimirConvocacaoCampo==='function'){
 const imprimirConvocacaoCampoDesktop=imprimirConvocacaoCampo;
 imprimirConvocacaoCampo=function(){
  if(!prosolIsMobile())return imprimirConvocacaoCampoDesktop();
  const card=document.querySelector('#campo-convocacao-modal .campo-card');
  prosolCompartilharOuSalvarPDF(card,'convocacao_cfa_prosol','landscape','convocacao-campo','Convocação CFA Prosol');
 };
}
if(typeof printFicha==='function'){
 const printFichaDesktop=printFicha;
 printFicha=function(){
  if(!prosolIsMobile())return printFichaDesktop();
  if(typeof shareFichaPDF==='function')return shareFichaPDF();
  const el=document.getElementById('fichaExportContent');
  prosolExportElementPDF(el,'ficha_atleta_cfa_prosol','portrait');
 };
}


/* === CONTROLE DE PESO - TESTES FÍSICOS === */
let controlePesoData = { atletas: [], datas: [], pesos: {} };
let controlePesoSaveTimer = null;
let controlePesoOrdenacaoSelecao = 'padrao';
let controlePesoGorduraDir = 'desc';
function normalizarTextoPeso(valor){return String(valor||'').trim().replace(/\s+/g,' ');}
function valorPesoColunaFlex(row, termos){
 const chave=Object.keys(row||{}).find(k=>termos.some(t=>String(k).toLowerCase().includes(String(t).toLowerCase())));
 return chave ? row[chave] : '';
}
function identidadeAtletaPeso(index){
 const row=excelData[index]||{};
 const nomeCompleto=normalizarTextoPeso(valorPesoColunaFlex(row,['nome completo'])||valorColunaExata(row,'NOME COMPLETO')||valorPesoColunaFlex(row,['nome']));
 const apelido=normalizarTextoPeso(valorPesoColunaFlex(row,['apelido']))||nomeCompleto;
 const nascimento=normalizarTextoPeso(convertExcelDate(valorPesoColunaFlex(row,['data de nascimento','nascimento']))||valorPesoColunaFlex(row,['data de nascimento','nascimento']));
 const ano=normalizarTextoPeso(valorColunaExata(row,'Ano'));
 return {nomeCompleto,apelido,nascimento,ano};
}
function chaveAtletaPeso(id){return normalizarTextoPeso(id?.nomeCompleto||'')+'||'+normalizarTextoPeso(id?.nascimento||'');}
function localizarAtletaPeso(id){
 const chave=chaveAtletaPeso(id);
 if(!chave||chave==='||')return -1;
 return (excelData||[]).findIndex((_,i)=>chaveAtletaPeso(identidadeAtletaPeso(i))===chave);
}
function garantirControlePesoData(){
 if(!controlePesoData||typeof controlePesoData!=='object')controlePesoData={atletas:[],datas:[],pesos:{}};
 if(!Array.isArray(controlePesoData.atletas))controlePesoData.atletas=[];
 if(!Array.isArray(controlePesoData.datas))controlePesoData.datas=[];
 if(!controlePesoData.pesos||typeof controlePesoData.pesos!=='object')controlePesoData.pesos={};
}
function anoControlePesoAtleta(id){
 const idx=localizarAtletaPeso(id);
 if(idx>=0)return identidadeAtletaPeso(idx).ano;
 const m=String(id?.nascimento||'').match(/(\d{4})$/);
 return m?m[1]:'';
}
function datasControlePesoOrdenadas(datas){
 return [...(datas||[])].sort((a,b)=>{
  const pa=String(a.label||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const pb=String(b.label||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const ta=pa?new Date(+pa[3],+pa[2]-1,+pa[1]).getTime():0;
  const tb=pb?new Date(+pb[3],+pb[2]-1,+pb[1]).getTime():0;
  return ta-tb;
 });
}
async function carregarControlePesoStorage(){
 try{
  const {data,error}=await _supabase.from('controle_peso').select('nome_completo,apelido,nascimento,pesos').order('apelido');
  if(error){console.warn('Controle de peso não carregado. Verifique se a tabela controle_peso existe:',error.message);return;}
  const atletas=[];
  const pesos={};
  const datasSet=new Set();
  (data||[]).forEach(r=>{
   const id={nomeCompleto:normalizarTextoPeso(r.nome_completo),apelido:normalizarTextoPeso(r.apelido),nascimento:normalizarTextoPeso(r.nascimento)};
   if(!id.nomeCompleto||!id.nascimento)return;
   atletas.push(id);
   const key=chaveAtletaPeso(id);
   pesos[key]=r.pesos&&typeof r.pesos==='object'?r.pesos:{};
   Object.keys(pesos[key]).forEach(d=>datasSet.add(d));
  });
  controlePesoData={
   atletas,
   datas:datasControlePesoOrdenadas(Array.from(datasSet).map(label=>({id:label,label}))),
   pesos
  };
  garantirControlePesoData();
 }catch(e){console.warn('Controle de peso não carregado:',e);}
}
async function salvarControlePesoStorage(){
 garantirControlePesoData();
 try{
  const rows=controlePesoData.atletas
   .filter(a=>a.nomeCompleto&&a.nascimento)
   .map(a=>{
    const key=chaveAtletaPeso(a);
    return {
     nome_completo:a.nomeCompleto,
     apelido:a.apelido||'',
     nascimento:a.nascimento,
     pesos:controlePesoData.pesos[key]||{},
     atualizado_em:new Date().toISOString()
    };
   });

  if(rows.length){
   const {error:upsertError}=await _supabase.from('controle_peso').upsert(rows,{onConflict:'nome_completo,nascimento'});
   if(upsertError){console.error('Erro ao salvar controle de peso:',upsertError);alert('Erro ao salvar controle de peso no Supabase.');return false;}
  }

  // Remove da tabela própria os atletas que foram removidos do controle.
  const ativos=new Set(rows.map(r=>normalizarTextoPeso(r.nome_completo)+'||'+normalizarTextoPeso(r.nascimento)));
  const {data:atuais,error:selectError}=await _supabase.from('controle_peso').select('id,nome_completo,nascimento');
  if(!selectError){
   const remover=(atuais||[]).filter(r=>!ativos.has(normalizarTextoPeso(r.nome_completo)+'||'+normalizarTextoPeso(r.nascimento)));
   for(const r of remover){await _supabase.from('controle_peso').delete().eq('id',r.id);}
  }
  return true;
 }catch(e){console.error(e);alert('Erro de conexão ao salvar controle de peso.');return false;}
}
function salvarControlePesoDebounced(){
 clearTimeout(controlePesoSaveTimer);
 controlePesoSaveTimer=setTimeout(()=>salvarControlePesoStorage(),700);
}
function ensurePesoButton(){
 let b=document.getElementById('btn-peso-pf-fab');
 if(!b){
  b=document.createElement('div');
  b.id='btn-peso-pf-fab';
  b.textContent='Peso';
  b.style.cssText='position:fixed;bottom:255px;right:30px;width:65px;height:65px;border-radius:50%;background:#8e44ad;color:#fff;display:none;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.4);cursor:pointer;font-weight:bold;font-size:12px;z-index:9999;text-align:center;user-select:none;transition:.2s;';
  b.onmouseover=()=>{b.style.transform='scale(1.1)';b.style.background='#783993';};
  b.onmouseout=()=>{b.style.transform='scale(1.0)';b.style.background='#8e44ad';};
  b.onclick=abrirControlePesoModal;
  document.body.appendChild(b);
 }
}
function abrirControlePesoModal(){
 garantirControlePesoData();
 let m=document.getElementById('controle-peso-modal');
 if(!m){m=document.createElement('div');m.className='escalacao-overlay';m.id='controle-peso-modal';document.body.appendChild(m)}
 const anos=['2009','2010','2011','2012','2013','2014','2015','2016','2017','2018'];
 m.innerHTML=`<div class="controle-peso-card"><div class="controle-peso-title"><b>Controle de Peso</b><button onclick="document.getElementById('controle-peso-modal').style.display='none'">×</button></div><div class="controle-peso-top"><input id="controle-peso-busca" placeholder="Buscar atleta..." oninput="renderControlePesoSelecao()"><div class="controle-peso-anos">${anos.map(a=>`<label><input type="checkbox" class="controle-peso-ano" value="${a}" onchange="renderControlePesoSelecao()"> ${a}</label>`).join('')}</div><div class="controle-peso-acoes"><button onclick="adicionarSelecionadosControlePeso()">Adicionar selecionados</button><button onclick="adicionarDataControlePeso()">Adicionar data</button><select id="controle-peso-data-excluir"><option value="">Excluir data...</option>${controlePesoData.datas.map(d=>`<option value="${d.id}">${d.label}</option>`).join('')}</select><button class="perigo" onclick="excluirDataControlePeso()">Excluir data</button></div></div><div class="controle-peso-layout"><div class="controle-peso-selecao"><h4 class="controle-peso-selecao-header"><button type="button" id="peso-sort-padrao" onclick="ordenarControlePesoSelecao('padrao')">Selecionar atletas</button><button type="button" id="peso-sort-gordura" onclick="ordenarControlePesoSelecao('gordura')">% de Gordura</button></h4><div id="controle-peso-lista-selecao"></div></div><div class="controle-peso-tabela-wrap"><h4>Pesagens</h4><div id="controle-peso-tabela"></div></div></div></div>`;
 m.style.display='flex';
 renderControlePesoSelecao();
 renderControlePesoTabela();
}
function controlePesoAtletasAtivosKeys(){garantirControlePesoData();return new Set(controlePesoData.atletas.map(chaveAtletaPeso));}
function gorduraControlePesoNum(index){
 const gordura=getUltimaAvaliacao(excelData[index]||{}).gordura;
 const n=parseFloat(String(gordura||'').replace('%','').replace(',','.'));
 return isNaN(n)?NaN:n;
}
function ordenarControlePesoSelecao(tipo){
 if(tipo==='gordura'){
  if(controlePesoOrdenacaoSelecao==='gordura') controlePesoGorduraDir = controlePesoGorduraDir === 'desc' ? 'asc' : 'desc';
  else { controlePesoOrdenacaoSelecao='gordura'; controlePesoGorduraDir='desc'; }
 }else{
  controlePesoOrdenacaoSelecao='padrao';
 }
 renderControlePesoSelecao();
}
function atualizarHeaderOrdenacaoControlePeso(){
 const bPadrao=document.getElementById('peso-sort-padrao');
 const bGordura=document.getElementById('peso-sort-gordura');
 if(bPadrao)bPadrao.classList.toggle('active',controlePesoOrdenacaoSelecao==='padrao');
 if(bGordura){
  bGordura.classList.toggle('active',controlePesoOrdenacaoSelecao==='gordura');
  bGordura.textContent=controlePesoOrdenacaoSelecao==='gordura' ? `% de Gordura ${controlePesoGorduraDir==='desc'?'▼':'▲'}` : '% de Gordura';
 }
}
function getAtletasFiltradosControlePeso(){
 const anosSel=Array.from(document.querySelectorAll('#controle-peso-modal .controle-peso-ano:checked')).map(x=>x.value);
 const busca=(document.getElementById('controle-peso-busca')?.value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
 return (excelData||[]).map((row,index)=>({index,id:identidadeAtletaPeso(index)})).filter(item=>{
  if(anosSel.length&&!anosSel.includes(item.id.ano))return false;
  if(busca){
   const texto=`${item.id.nomeCompleto} ${item.id.apelido} ${item.id.ano}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
   if(!texto.includes(busca))return false;
  }
  return item.id.nomeCompleto&&item.id.nascimento;
 }).sort((a,b)=>{
  if(controlePesoOrdenacaoSelecao==='gordura'){
   const ga=gorduraControlePesoNum(a.index), gb=gorduraControlePesoNum(b.index);
   let r=0;
   if(isNaN(ga)&&isNaN(gb))r=0; else if(isNaN(ga))r=1; else if(isNaN(gb))r=-1; else r=ga-gb;
   if(controlePesoGorduraDir==='desc')r=-r;
   return r || parseInt(a.id.ano||9999)-parseInt(b.id.ano||9999) || a.id.apelido.localeCompare(b.id.apelido,'pt-BR');
  }
  return parseInt(a.id.ano||9999)-parseInt(b.id.ano||9999)||a.id.apelido.localeCompare(b.id.apelido,'pt-BR');
 });
}
function renderControlePesoSelecao(){
 atualizarHeaderOrdenacaoControlePeso();
 const box=document.getElementById('controle-peso-lista-selecao');if(!box)return;
 const ativos=controlePesoAtletasAtivosKeys();
 const atletas=getAtletasFiltradosControlePeso();
 if(!atletas.length){box.innerHTML='<p class="controle-peso-vazio">Nenhum atleta encontrado.</p>';return;}
 box.innerHTML=atletas.map(a=>{const gordura=(getUltimaAvaliacao(excelData[a.index]||{}).gordura||'-');return `<label class="controle-peso-athlete-option"><input type="checkbox" class="controle-peso-select-athlete" data-index="${a.index}" ${ativos.has(chaveAtletaPeso(a.id))?'checked':''}> <span class="peso-athlete-name">${escapeHtmlJogos(a.id.apelido)} <small>${escapeHtmlJogos(a.id.ano)}</small></span><span class="peso-athlete-gordura">${escapeHtmlJogos(gordura)}</span></label>`;}).join('');
}
function adicionarSelecionadosControlePeso(){
 garantirControlePesoData();
 const existentes=controlePesoAtletasAtivosKeys();
 document.querySelectorAll('#controle-peso-modal .controle-peso-select-athlete:checked').forEach(chk=>{
  const index=parseInt(chk.dataset.index,10);const id=identidadeAtletaPeso(index);const key=chaveAtletaPeso(id);
  if(id.nomeCompleto&&id.nascimento&&!existentes.has(key)){controlePesoData.atletas.push(id);existentes.add(key);}
 });
 renderControlePesoSelecao();renderControlePesoTabela();salvarControlePesoDebounced();
}
function removerSelecionadosControlePeso(){
 garantirControlePesoData();
 const remover=new Set();
 document.querySelectorAll('#controle-peso-modal .controle-peso-select-athlete:checked').forEach(chk=>{const id=identidadeAtletaPeso(parseInt(chk.dataset.index,10));remover.add(chaveAtletaPeso(id));});
 if(!remover.size)return alert('Marque atletas para remover do controle.');
 if(!confirm('Remover os atletas marcados do controle de peso? Os pesos lançados para eles também serão removidos.'))return;
 controlePesoData.atletas=controlePesoData.atletas.filter(a=>!remover.has(chaveAtletaPeso(a)));
 remover.forEach(k=>delete controlePesoData.pesos[k]);
 renderControlePesoSelecao();renderControlePesoTabela();salvarControlePesoDebounced();
}
function formatarDataPesoLabel(valor){
 const s=String(valor||'').trim();
 const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/); if(m)return `${m[3]}/${m[2]}/${m[1]}`;
 const m2=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/); if(m2)return `${String(m2[1]).padStart(2,'0')}/${String(m2[2]).padStart(2,'0')}/${m2[3]}`;
 return s;
}
function adicionarDataControlePeso(){
 garantirControlePesoData();
 const hoje=new Date().toISOString().slice(0,10);
 const entrada=prompt('Informe a data da pesagem (DD/MM/AAAA ou AAAA-MM-DD):',hoje);
 if(!entrada)return;
 const label=formatarDataPesoLabel(entrada);
 if(!label)return alert('Data inválida.');
 if(controlePesoData.datas.some(d=>d.label===label))return alert('Esta data já existe no controle.');
 controlePesoData.datas.push({id:label,label});
 controlePesoData.datas=datasControlePesoOrdenadas(controlePesoData.datas);
 controlePesoData.atletas.forEach(a=>{const key=chaveAtletaPeso(a);if(!controlePesoData.pesos[key])controlePesoData.pesos[key]={};if(controlePesoData.pesos[key][label]===undefined)controlePesoData.pesos[key][label]='';});
 renderControlePesoTabela();
 const sel=document.getElementById('controle-peso-data-excluir');if(sel)sel.innerHTML='<option value="">Excluir data...</option>'+controlePesoData.datas.map(d=>`<option value="${d.id}">${d.label}</option>`).join('');
 salvarControlePesoDebounced();
}
function excluirDataControlePeso(){
 garantirControlePesoData();
 const sel=document.getElementById('controle-peso-data-excluir');const id=sel?.value;
 if(!id)return alert('Selecione uma data para excluir.');
 const data=controlePesoData.datas.find(d=>d.id===id);
 if(!confirm('Excluir a data '+(data?.label||'selecionada')+' e todos os pesos dela?'))return;
 controlePesoData.datas=controlePesoData.datas.filter(d=>d.id!==id);
 Object.keys(controlePesoData.pesos).forEach(k=>{if(controlePesoData.pesos[k])delete controlePesoData.pesos[k][id];});
 renderControlePesoTabela();
 if(sel)sel.innerHTML='<option value="">Excluir data...</option>'+controlePesoData.datas.map(d=>`<option value="${d.id}">${d.label}</option>`).join('');
 salvarControlePesoDebounced();
}
function atualizarPesoControleAtleta(chave,dataId,valor){
 garantirControlePesoData();
 if(!controlePesoData.pesos[chave])controlePesoData.pesos[chave]={};
 controlePesoData.pesos[chave][dataId]=String(valor||'').trim();
 salvarControlePesoDebounced();
}
function removerAtletaControlePeso(chave){
 garantirControlePesoData();
 const atleta=controlePesoData.atletas.find(a=>chaveAtletaPeso(a)===chave);
 if(!atleta)return;
 const nome=atleta.apelido||atleta.nomeCompleto||'atleta';
 if(!confirm('Remover '+nome+' do controle de peso? Os pesos lançados para este atleta também serão removidos.'))return;
 controlePesoData.atletas=controlePesoData.atletas.filter(a=>chaveAtletaPeso(a)!==chave);
 delete controlePesoData.pesos[chave];
 renderControlePesoSelecao();
 renderControlePesoTabela();
 salvarControlePesoDebounced();
}
function renderControlePesoTabela(){
 garantirControlePesoData();
 const box=document.getElementById('controle-peso-tabela');if(!box)return;
 if(!controlePesoData.atletas.length){box.innerHTML='<p class="controle-peso-vazio">Nenhum atleta adicionado ao controle de peso.</p>';return;}
 const datas=controlePesoData.datas;
 const head=`<tr><th>Atleta</th><th>Ano</th>${datas.map(d=>`<th>${d.label}</th>`).join('')}</tr>`;
 const rows=controlePesoData.atletas.map(a=>{
  const key=chaveAtletaPeso(a); const pesos=controlePesoData.pesos[key]||{};
  const keyEncoded=encodeURIComponent(key);
  return `<tr><td><button type="button" class="controle-peso-remove-row" title="Remover atleta" onclick="removerAtletaControlePeso(decodeURIComponent('${keyEncoded}'))">×</button><span>${escapeHtmlJogos(a.apelido||a.nomeCompleto)}</span></td><td>${escapeHtmlJogos(anoControlePesoAtleta(a))}</td>${datas.map(d=>`<td><input type="number" step="0.1" value="${escapeHtmlJogos(pesos[d.id]||'')}" onchange="atualizarPesoControleAtleta(decodeURIComponent('${keyEncoded}'),'${d.id}',this.value)" placeholder="Kg"></td>`).join('')}</tr>`;
 }).join('');
 box.innerHTML=`<table class="controle-peso-table"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}


/* === GALERIA DE FOTOS DOS ATLETAS === */
function fotosCategoriasConfig(){
 return {
  sub11:{label:'Sub 11',anos:['2015','2016','2017','2018']},
  sub12:{label:'Sub 12',anos:['2014']},
  sub13:{label:'Sub 13',anos:['2013']},
  sub14:{label:'Sub 14',anos:['2012']},
  sub16:{label:'Sub 16',anos:['2009','2010','2011']}
 };
}

let fotosFiltrosAno = {};
function fotosFiltroAtual(catKey){
 const cat=fotosCategoriasConfig()[catKey];
 if(!cat)return {all:true,anos:[]};
 const filtro=fotosFiltrosAno[catKey];
 if(!filtro||filtro.all)return {all:true,anos:[...cat.anos]};
 const anos=(filtro.anos||[]).filter(a=>cat.anos.includes(a));
 return anos.length?{all:false,anos}:{all:true,anos:[...cat.anos]};
}
function fotosSetFiltroTodos(catKey){
 fotosFiltrosAno[catKey]={all:true,anos:[...((fotosCategoriasConfig()[catKey]||{}).anos||[])]};
 renderFotosCategoria(catKey);
}
function fotosToggleAno(catKey,ano){
 const cat=fotosCategoriasConfig()[catKey]; if(!cat)return;
 const atual=fotosFiltroAtual(catKey);
 let anos=atual.all?[ano]:[...atual.anos];
 if(!atual.all){
  if(anos.includes(ano)) anos=anos.filter(a=>a!==ano);
  else anos.push(ano);
 }
 anos=anos.filter(a=>cat.anos.includes(a));
 if(!anos.length || anos.length===cat.anos.length) fotosFiltrosAno[catKey]={all:true,anos:[...cat.anos]};
 else fotosFiltrosAno[catKey]={all:false,anos};
 renderFotosCategoria(catKey);
}
function iniciarLazyFotosAtletas(){
 // As fotos agora são exibidas diretamente em tamanho reduzido pelo CSS.
 // Não geramos miniatura via canvas porque isso exige carregar a imagem grande primeiro
 // e pode ficar mais lento em celulares.
 document.querySelectorAll('#fotos-atletas-modal img[data-index]').forEach(img=>img.removeAttribute('data-index'));
}

function fotosValorFlex(row, termos){
 const chave=Object.keys(row||{}).find(k=>termos.some(t=>String(k).toLowerCase().includes(String(t).toLowerCase())));
 return chave ? row[chave] : '';
}
function fotosAnoAtleta(row){return String(valorColunaExata(row,'Ano')||fotosValorFlex(row,['ano'])||'').trim();}
function fotosNomeCompleto(row){return String(fotosValorFlex(row,['nome completo'])||valorColunaExata(row,'NOME COMPLETO')||fotosValorFlex(row,['nome'])||'Sem Nome').trim();}
function fotosNascimento(row){return convertExcelDate(fotosValorFlex(row,['data de nascimento','nascimento'])||'');}
function fotosApelido(row){return String(fotosValorFlex(row,['apelido'])||'').trim();}
function fotosPosicao(row){return String(fotosValorFlex(row,['posição','posicao'])||'').toLowerCase();}
function fotosFotoOriginalAtleta(row){
 return String(fotosValorFlex(row,['foto','imagem'])||'').trim();
}
function fotosTemFotoAtleta(row){
 return fotosFotoOriginalAtleta(row).length > 0;
}
function fotosImagemAtleta(row){
 const foto=fotosFotoOriginalAtleta(row);
 if(foto)return foto;
 const pos=fotosPosicao(row);
 return pos.includes('goleiro')?'camiseta_goleiro.png':'camiseta_linha.png';
}
function fotosPlaceholderMiniatura(){
 return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="190"><rect width="100%" height="100%" fill="#f1f1f1"/><circle cx="80" cy="76" r="24" fill="#d0d0d0"/><rect x="38" y="114" width="84" height="44" rx="20" fill="#d0d0d0"/></svg>');
}

const fotosThumbCache = new Map();
const fotosThumbEmProcesso = new Map();
function fotosFallbackAtleta(row){return fotosPosicao(row).includes('goleiro')?'camiseta_goleiro.png':'camiseta_linha.png';}
function fotosChaveThumb(index){
 const row=excelData[index]||{};
 return `${fotosNomeCompleto(row)}|${fotosNascimento(row)}|${index}`;
}
function criarThumbnailFoto(src, maxW=160, maxH=190){
 return new Promise(resolve=>{
  if(!src || (!src.startsWith('data:image') && !src.startsWith('blob:'))){resolve(src);return;}
  const img=new Image();
  img.onload=()=>{
   try{
    const ratio=Math.min(maxW/img.naturalWidth, maxH/img.naturalHeight, 1);
    const w=Math.max(1, Math.round(img.naturalWidth*ratio));
    const h=Math.max(1, Math.round(img.naturalHeight*ratio));
    const canvas=document.createElement('canvas');
    canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d', {alpha:false});
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,w,h);
    ctx.drawImage(img,0,0,w,h);
    resolve(canvas.toDataURL('image/jpeg',0.72));
   }catch(e){console.warn('Falha ao gerar miniatura:',e);resolve(src);}
  };
  img.onerror=()=>resolve(src);
  img.src=src;
 });
}
async function obterThumbnailAtleta(index){
 const row=excelData[index]||{};
 const fallback=fotosFallbackAtleta(row);
 const foto=fotosFotoOriginalAtleta(row);
 if(!foto)return fallback;
 const chave=fotosChaveThumb(index);
 if(fotosThumbCache.has(chave))return fotosThumbCache.get(chave);
 if(fotosThumbEmProcesso.has(chave))return fotosThumbEmProcesso.get(chave);
 const promessa=criarThumbnailFoto(foto).then(thumb=>{const final=thumb||foto||fallback;fotosThumbCache.set(chave,final);fotosThumbEmProcesso.delete(chave);return final;});
 fotosThumbEmProcesso.set(chave,promessa);
 return promessa;
}
function fotosGrupoPosicao(row){
 const p=fotosPosicao(row);
 if(p.includes('goleiro'))return 'Goleiro';
 if(p.includes('zagueiro'))return 'Zagueiro';
 if(p.includes('lateral'))return 'Lateral';
 if(p.includes('volante'))return 'Volante';
 if(p.includes('meia'))return 'Meia';
 if(p.includes('atacante'))return 'Atacante';
 if(p.includes('extremo')||p.includes('ponta'))return 'Extremo';
 return 'Outros';
}
function fotosOrdemGrupo(label){
 return ['Goleiro','Zagueiro','Lateral','Volante','Meia','Atacante','Extremo','Outros'].indexOf(label);
}
function openFotosModal(){
 let modal=document.getElementById('fotos-atletas-modal');
 if(!modal){
  modal=document.createElement('div');
  modal.id='fotos-atletas-modal';
  modal.className='fotos-overlay';
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeFotosModal();});
 }
 modal.style.display='flex';
 renderFotosCategorias();
}
function closeFotosModal(){const modal=document.getElementById('fotos-atletas-modal');if(modal)modal.style.display='none';}

let fotosPreloadEmAndamento = false;
let fotosPreloadConcluido = false;
let fotosPreloadTotal = 0;
let fotosPreloadAtual = 0;
const fotosPreloadCache = new Map();
function fotosAtualizarStatusPreload(){
 const el=document.getElementById('fotos-preload-status');
 const btn=document.getElementById('fotos-preload-btn');
 if(el){
  if(fotosPreloadEmAndamento)el.textContent=`Carregando fotos... ${fotosPreloadAtual}/${fotosPreloadTotal}`;
  else if(fotosPreloadConcluido)el.textContent=`Fotos carregadas: ${fotosPreloadAtual}/${fotosPreloadTotal}`;
  else el.textContent='';
 }
 if(btn){
  btn.disabled=fotosPreloadEmAndamento;
  btn.textContent=fotosPreloadEmAndamento?'Carregando...':'Carregar fotos';
 }
}
function fotosPreloadUmaImagem(src){
 return new Promise(resolve=>{
  if(!src){resolve(false);return;}
  const img=new Image();
  img.onload=async()=>{
   try{ if(img.decode) await img.decode(); }catch(e){}
   resolve(true);
  };
  img.onerror=()=>resolve(false);
  img.src=src;
 });
}
async function carregarFotosAtletasAntecipado(){
 if(fotosPreloadEmAndamento)return;
 const itens=(excelData||[]).map((row,index)=>({row,index,src:fotosFotoOriginalAtleta(row)})).filter(x=>x.src);
 fotosPreloadTotal=itens.length;
 fotosPreloadAtual=0;
 fotosPreloadConcluido=false;
 fotosPreloadEmAndamento=true;
 fotosAtualizarStatusPreload();
 let cursor=0;
 const concorrencia=3;
 async function worker(){
  while(cursor<itens.length){
   const item=itens[cursor++];
   const key=fotosChaveThumb(item.index);
   if(!fotosPreloadCache.has(key)){
    await fotosPreloadUmaImagem(item.src);
    fotosPreloadCache.set(key,item.src);
   }
   fotosPreloadAtual++;
   fotosAtualizarStatusPreload();
   await new Promise(r=>setTimeout(r,10));
  }
 }
 await Promise.all(Array.from({length:Math.min(concorrencia,itens.length)},worker));
 fotosPreloadEmAndamento=false;
 fotosPreloadConcluido=true;
 fotosAtualizarStatusPreload();
}
function renderFotosCategorias(){
 const modal=document.getElementById('fotos-atletas-modal');if(!modal)return;
 const cats=fotosCategoriasConfig();
 modal.innerHTML=`<div class="fotos-categorias-card"><button class="fotos-close" onclick="closeFotosModal()">×</button><img src="logo.png" class="fotos-logo-main"><h2>CFA Prosol</h2><p>Fotos dos atletas</p><button id="fotos-preload-btn" class="fotos-preload-btn" onclick="carregarFotosAtletasAntecipado()">Carregar fotos</button><div id="fotos-preload-status" class="fotos-preload-status"></div><div class="fotos-cat-buttons">${Object.keys(cats).map(k=>`<button onclick="renderFotosCategoria('${k}')">${cats[k].label}</button>`).join('')}</div></div>`;
 fotosAtualizarStatusPreload();
}
function fotosAtletasCategoria(catKey, anosFiltro){
 const cat=fotosCategoriasConfig()[catKey];
 if(!cat)return [];
 const anos=(anosFiltro&&anosFiltro.length)?anosFiltro:cat.anos;
 return (excelData||[]).map((row,index)=>({row,index})).filter(item=>anos.includes(fotosAnoAtleta(item.row))).sort((a,b)=>{
  const ga=fotosOrdemGrupo(fotosGrupoPosicao(a.row)), gb=fotosOrdemGrupo(fotosGrupoPosicao(b.row));
  if(ga!==gb)return ga-gb;
  return fotosNomeCompleto(a.row).localeCompare(fotosNomeCompleto(b.row),'pt-BR');
 });
}
function renderFotosCategoria(catKey){
 const modal=document.getElementById('fotos-atletas-modal');if(!modal)return;
 const cat=fotosCategoriasConfig()[catKey];if(!cat)return;
 const filtro=fotosFiltroAtual(catKey);
 const atletas=fotosAtletasCategoria(catKey,filtro.anos);
 const grupos={};
 atletas.forEach(item=>{const g=fotosGrupoPosicao(item.row);if(!grupos[g])grupos[g]=[];grupos[g].push(item);});
 const filtrosAnos=cat.anos.length>1?`<div class="fotos-year-pills"><button class="${filtro.all?'active':''}" onclick="fotosSetFiltroTodos('${catKey}')">${cat.anos.join('/')}</button>${cat.anos.map(a=>`<button class="${(!filtro.all&&filtro.anos.includes(a))?'active':''}" onclick="fotosToggleAno('${catKey}','${a}')">${a}</button>`).join('')}</div>`:'';
 const conteudo=Object.keys(grupos).sort((a,b)=>fotosOrdemGrupo(a)-fotosOrdemGrupo(b)).map(grupo=>`<section class="fotos-pos-section"><h3>${grupo}</h3><div class="fotos-grid">${grupos[grupo].map(({row,index})=>{
  const nome=fotosNomeCompleto(row);
  const apelido=fotosApelido(row);
  const nasc=fotosNascimento(row);
  const ano=fotosAnoAtleta(row);
  const fallback=fotosFallbackAtleta(row);
  const temFoto=fotosTemFotoAtleta(row);
  const preloadKey=fotosChaveThumb(index);
  const srcInicial=temFoto?(fotosPreloadCache.get(preloadKey)||fotosFotoOriginalAtleta(row)):fallback;
  return `<article class="foto-atleta-card"><button type="button" class="foto-img-box" onclick="abrirFotoAtletaDetalhe(${index})" title="Ampliar foto"><img src="${escapeHtmlJogos(srcInicial)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${fallback}'" alt="${escapeHtmlJogos(nome)}"></button>${apelido?`<strong class="foto-apelido">${escapeHtmlJogos(apelido)}</strong>`:''}<b>${escapeHtmlJogos(nome)}</b><span>${escapeHtmlJogos(nasc)}</span><small>${escapeHtmlJogos(ano)}</small></article>`;
 }).join('')}</div></section>`).join('')||'<p class="fotos-empty">Nenhum atleta encontrado nesta categoria/filtro.</p>';
 modal.innerHTML=`<div class="fotos-list-card"><div class="fotos-list-top"><button onclick="renderFotosCategorias()"><i class="fa-solid fa-arrow-left"></i> Voltar</button><strong>${cat.label}</strong><button onclick="closeFotosModal()">×</button></div>${filtrosAnos}<div class="fotos-list-body">${conteudo}</div></div>`;
 iniciarLazyFotosAtletas();
}


function abrirFotoAtletaDetalhe(index){
 const row=excelData[index]||{};
 const nome=fotosNomeCompleto(row);
 const apelido=fotosApelido(row);
 const nasc=fotosNascimento(row);
 const ano=fotosAnoAtleta(row);
 const pos=fotosValorFlex(row,['posição 1','posicao 1','posição','posicao'])||'-';
 const cidade=fotosValorFlex(row,['cidade'])||'-';
 const foto=fotosImagemAtleta(row)||fotosFallbackAtleta(row);
 const avals=(typeof relatorioIndividualMetricasAtleta==='function')?relatorioIndividualMetricasAtleta(index):[];
 const ult=avals[avals.length-1]||null;
 const ant=avals.length>1?avals[avals.length-2]:null;
 const fmt=(v)=>escapeHtmlJogos(v===undefined||v===null||String(v).trim()===''?'-':v);
 const delta=(key,menorMelhor=false,unit='')=>{
  if(!ult||!ant)return '';
  const a=relatoriosNum(ult[key]), b=relatoriosNum(ant[key]);
  if(isNaN(a)||isNaN(b))return '';
  const dif=a-b;
  if(Math.abs(dif)<0.0001)return '<em class="fd-delta neutro">0</em>';
  const bom=menorMelhor?dif<0:dif>0;
  const cls=bom?'bom':'ruim';
  const sinal=dif>0?'+':'';
  return `<em class="fd-delta ${cls}">${sinal}${dif.toFixed(2).replace('.',',')}${unit}</em>`;
 };
 const card=(label,key,unit='',menorMelhor=false)=>`<div class="fd-res-card"><span>${label}</span><strong>${fmt(ult?ult[key]:'')}${ult&&ult[key]?unit:''}</strong>${delta(key,menorMelhor,unit)}</div>`;
 const resumo=ult?`<div class="fd-section-title">Resumo da Última Avaliação</div><div class="fd-resumo-grid">${card('Peso','peso',' Kg')}${card('Altura','altura',' m')}${card('Alt. Predita','predita',' m')}${card('% Gordura','gordura','',true)}${card('Resistência','distancia',' m')}${card('Potência','melhorSalto',' m')}${card('Aceleração','aceleracao',' s',true)}${card('Velocidade','velocidade',' s',true)}${card('Agilidade','agilidade',' s',true)}</div>`:'<div class="fd-empty">Sem avaliações físicas cadastradas.</div>';
 const comparativo=avals.length?`<div class="fd-section-title">Comparativo das Avaliações</div><div class="fd-comp-wrap"><table class="fd-comparativo"><thead><tr><th>Data</th><th>Peso</th><th>Altura</th><th>Gordura</th><th>Dist.</th><th>Salto</th><th>Acel.</th><th>Veloc.</th><th>Agil.</th></tr></thead><tbody>${avals.map(a=>`<tr><td>${fmt(a.label)}</td><td>${fmt(a.peso)}</td><td>${fmt(a.altura)}</td><td>${fmt(a.gordura)}</td><td>${fmt(a.distancia)}</td><td>${fmt(a.melhorSalto)}</td><td>${fmt(a.aceleracao)}</td><td>${fmt(a.velocidade)}</td><td>${fmt(a.agilidade)}</td></tr>`).join('')}</tbody></table></div>`:'';
 let modal=document.getElementById('foto-detalhe-modal');
 if(!modal){modal=document.createElement('div');modal.id='foto-detalhe-modal';modal.className='foto-detalhe-overlay';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)fecharFotoAtletaDetalhe();});}
 modal.innerHTML=`<div class="foto-detalhe-card foto-detalhe-card-completo"><button class="foto-detalhe-close" onclick="fecharFotoAtletaDetalhe()">×</button><div class="foto-detalhe-img"><img src="${foto}" onerror="this.src='${fotosFallbackAtleta(row)}'" alt="${escapeHtmlJogos(nome)}"></div><div class="foto-detalhe-info"><h2>${escapeHtmlJogos(apelido||nome)}</h2><h3>${escapeHtmlJogos(nome)}</h3><div class="fd-basic-grid"><p><strong>Ano:</strong> ${escapeHtmlJogos(ano)}</p><p><strong>Nascimento:</strong> ${escapeHtmlJogos(nasc)}</p><p><strong>Posição:</strong> ${escapeHtmlJogos(pos)}</p><p><strong>Cidade:</strong> ${escapeHtmlJogos(cidade)}</p></div>${resumo}${comparativo}</div></div>`;
 modal.style.display='flex';
}
function fecharFotoAtletaDetalhe(){const modal=document.getElementById('foto-detalhe-modal');if(modal)modal.style.display='none';}


/* === Tooltips flutuantes das estatísticas de jogos === */
function inicializarTooltipFlutuanteEstatisticasJogos(){
    if (window.__tooltipEstatisticasJogosInicializado) return;
    window.__tooltipEstatisticasJogosInicializado = true;

    let tooltip = document.getElementById('estat-tooltip-flutuante');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'estat-tooltip-flutuante';
        tooltip.className = 'estat-tooltip-flutuante';
        document.body.appendChild(tooltip);
    }

    function posicionarTooltip(event) {
        if (!tooltip || tooltip.style.display !== 'block') return;
        const margem = 12;
        const rect = tooltip.getBoundingClientRect();
        let x = event.clientX + margem;
        let y = event.clientY + margem;

        if (x + rect.width > window.innerWidth - 8) {
            x = event.clientX - rect.width - margem;
        }
        if (y + rect.height > window.innerHeight - 8) {
            y = event.clientY - rect.height - margem;
        }
        tooltip.style.left = Math.max(8, x) + 'px';
        tooltip.style.top = Math.max(8, y) + 'px';
    }

    document.addEventListener('mouseover', (event) => {
        const alvo = event.target.closest && event.target.closest('.estat-tooltip');
        if (!alvo || !alvo.dataset.tooltip) return;
        tooltip.textContent = alvo.dataset.tooltip;
        tooltip.style.display = 'block';
        posicionarTooltip(event);
    });

    document.addEventListener('mousemove', (event) => {
        if (tooltip.style.display === 'block') posicionarTooltip(event);
    });

    document.addEventListener('mouseout', (event) => {
        const alvo = event.target.closest && event.target.closest('.estat-tooltip');
        if (!alvo) return;
        tooltip.style.display = 'none';
    });

    // No celular/tablet, toque para mostrar e toque fora para fechar.
    document.addEventListener('click', (event) => {
        const alvo = event.target.closest && event.target.closest('.estat-tooltip');
        if (!alvo) {
            if (tooltip) tooltip.style.display = 'none';
            return;
        }
        if (!alvo.dataset.tooltip) return;
        tooltip.textContent = alvo.dataset.tooltip;
        tooltip.style.display = 'block';
        posicionarTooltip(event);
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarTooltipFlutuanteEstatisticasJogos);
} else {
    inicializarTooltipFlutuanteEstatisticasJogos();
}
