const SUPABASE_URL = 'https://jrudgjopfxfyyhnvgidz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VScGEvhYLgQSDGll2IQIsw_bsTQXRCO';
const SENHA_RECUPERACAO_PADRAO = 'blucxj';
const SENHA_COORDENACAO_PADRAO = 'blucxj123';
const TEMPO_INATIVIDADE_PORTAL = 5 * 60 * 1000;

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let atletasBanco = [];
let atletaLogado = null;
let inicioInatividadePortal = Date.now();
let timerInatividadePortal = null;

function msgLogin(texto){document.getElementById('login-msg').textContent=texto||'';}
function norm(v){return String(v??'').trim().replace(/\s+/g,' ')}
function valorFlex(row, termos){const k=Object.keys(row||{}).find(c=>termos.some(t=>String(c).toLowerCase().includes(String(t).toLowerCase())));return k?row[k]:'';}
function convertExcelDate(value){if(!value)return'';if(typeof value==='string'&&(value.includes('/')||value.includes('-')))return value;let num=Number(value);if(!isNaN(num)&&num>1000&&num<60000){let d=new Date(Math.floor(num-25569)*86400*1000);return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;}return String(value);}
function anoAtleta(row){return norm(row['Ano']||valorFlex(row,['ano']));}
function nomeCompleto(row){return norm(row['NOME COMPLETO']||valorFlex(row,['nome completo'])||valorFlex(row,['nome']));}
function apelido(row){return norm(row['APELIDO']||valorFlex(row,['apelido']))||nomeCompleto(row);}
function nascimento(row){return norm(convertExcelDate(row['Data de nascimento']||valorFlex(row,['nascimento'])));}
function foto(row){return norm(row['Foto']||valorFlex(row,['foto']))||'logo.png';}
function posicao(row){return norm(row['Posição 1']||valorFlex(row,['posição 1','posicao 1','posição','posicao']))||'-';}
function cidade(row){return norm(row['CIDADE']||valorFlex(row,['cidade']))||'-';}
function chaveAtleta(row){return nomeCompleto(row)+'||'+nascimento(row);}
function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
function num(v){if(v===undefined||v===null||v==='')return NaN;const n=parseFloat(String(v).replace('%','').replace(',','.'));return isNaN(n)?NaN:n;}
function formatGordura(v){const n=num(v);if(isNaN(n))return v||'';const x=n>0&&n<=1?n*100:n;return x.toFixed(2).replace('.',',')+'%';}
function valorAvaliacao(row,base,n){const nomes=[base+n,base+'_'+n];const k=Object.keys(row||{}).find(c=>nomes.some(nn=>c.toLowerCase()===nn.toLowerCase()));return k?row[k]:'';}
function melhorSalto(row,n){const salvo=valorAvaliacao(row,'MelhorSalto',n);if(norm(salvo))return salvo;const vals=['Salto1_','Salto2_','Salto3_'].map(b=>num(valorAvaliacao(row,b,n))).filter(x=>!isNaN(x));return vals.length?String(Math.max(...vals)).replace('.',','):'';}
function agilidade(row,n){const salvo=valorAvaliacao(row,'Agilidade',n);if(norm(salvo))return salvo;const vals=['Volta1_','Volta2_'].map(b=>num(valorAvaliacao(row,b,n))).filter(x=>!isNaN(x));return vals.length?String(Math.min(...vals)).replace('.',','):'';}
function distancia(row,n){return valorAvaliacao(row,'distancia',n)||'';}
function mediaCampo(row,prefixo,n){const vals=[];for(let i=1;i<=7;i++){const v=num(valorAvaliacao(row,prefixo+i+'_',n)||valorAvaliacao(row,prefixo+i,n));if(!isNaN(v))vals.push(v)}return vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2).replace('.',','):'';}
function linhaAvaliacao(row,n){return {eval:n,data:convertExcelDate(valorAvaliacao(row,'Data',n))||`Aval. ${n}`,peso:valorAvaliacao(row,'peso',n),altura:valorAvaliacao(row,'Altura',n),predita:valorAvaliacao(row,'alturapredita',n),gordura:formatGordura(valorAvaliacao(row,'PercentualGordura',n)),distancia:distancia(row,n),salto:melhorSalto(row,n),aceleracao:valorAvaliacao(row,'Aceleraçãofinal',n)||mediaCampo(row,'aceleração',n),velocidade:valorAvaliacao(row,'Velocidadefinal',n)||mediaCampo(row,'velocidade',n),agilidade:agilidade(row,n)}}
function avaliacoesAtleta(row){const out=[];for(let i=1;i<=20;i++){const l=linhaAvaliacao(row,i);const tem=['peso','altura','predita','gordura','distancia','salto','aceleracao','velocidade','agilidade'].some(k=>norm(l[k]));if(tem)out.push(l)}return out;}
function delta(avals,key,menorMelhor=false,unit=''){if(avals.length<2)return'';const a=num(avals[avals.length-1][key]),b=num(avals[avals.length-2][key]);if(isNaN(a)||isNaN(b))return'';const d=a-b;if(Math.abs(d)<.001)return'<em class="delta neutro">0</em>';const bom=menorMelhor?d<0:d>0;return `<em class="delta ${bom?'bom':'ruim'}">${d>0?'+':''}${d.toFixed(2).replace('.',',')}${unit}</em>`}

function mediaCategoria(ano, evalNum, key){
  const vals = atletasBanco
    .filter(r => anoAtleta(r) === ano)
    .map(r => num(linhaAvaliacao(r, evalNum)[key]))
    .filter(v => !isNaN(v));
  if(!vals.length) return NaN;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function classePorMedia(valor, media, tolerancia, menorMelhor=false){
  const v = num(valor);
  if(isNaN(v) || isNaN(media)) return '';
  if(v < media - tolerancia) return menorMelhor ? 'desempenho-verde' : 'desempenho-vermelho';
  if(v > media + tolerancia) return menorMelhor ? 'desempenho-vermelho' : 'desempenho-verde';
  return 'desempenho-amarelo';
}
function classeGordura(valor){
  const v=num(valor);
  if(isNaN(v)) return '';
  if(v<9) return 'desempenho-azul';
  if(v>=9 && v<=9.09) return 'desempenho-amarelo';
  if(v>=9.10 && v<=10.99) return 'desempenho-verde';
  if(v>=11 && v<12) return 'desempenho-amarelo';
  if(v>=12) return 'desempenho-vermelho';
  return '';
}
function classeDesempenho(row, aval, key){
  if(!aval || !key) return '';
  if(key==='gordura') return classeGordura(aval[key]);
  const ano=anoAtleta(row);
  const media=mediaCategoria(ano, aval.eval, key);
  if(key==='distancia') return classePorMedia(aval[key], media, 100, false);
  if(key==='salto') return classePorMedia(aval[key], media, .10, false);
  if(['aceleracao','velocidade','agilidade'].includes(key)) return classePorMedia(aval[key], media, .10, true);
  return '';
}

function togglePortalFullScreen(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen?.().catch(()=>{});
  }else{
    document.exitFullscreen?.();
  }
}
function atualizarRelogioInatividadePortal(){
  const el=document.getElementById('portal-inactivity-clock');
  const restante=Math.max(0,TEMPO_INATIVIDADE_PORTAL-(Date.now()-inicioInatividadePortal));
  const m=String(Math.floor(restante/60000)).padStart(2,'0');
  const s=String(Math.floor((restante%60000)/1000)).padStart(2,'0');
  if(el)el.textContent='↻ '+m+':'+s;
}
function resetarInatividadePortal(){
  inicioInatividadePortal=Date.now();
  clearTimeout(timerInatividadePortal);
  timerInatividadePortal=setTimeout(()=>window.location.reload(),TEMPO_INATIVIDADE_PORTAL);
  atualizarRelogioInatividadePortal();
}
function iniciarInatividadePortal(){
  ['mousedown','keydown','input','change','scroll','touchstart','pointerdown'].forEach(evt=>document.addEventListener(evt,resetarInatividadePortal,{passive:true}));
  resetarInatividadePortal();
  setInterval(atualizarRelogioInatividadePortal,1000);
}

async function carregarAtletas(){msgLogin('Carregando atletas...');const {data,error}=await sb.from('sistema_config').select('dados').eq('chave','principal').single();if(error||!data){msgLogin('Erro ao carregar banco de atletas.');return}atletasBanco=(data.dados||[]).filter(r=>nomeCompleto(r)&&nascimento(r)).sort((a,b)=>anoAtleta(a).localeCompare(anoAtleta(b))||apelido(a).localeCompare(apelido(b),'pt-BR'));preencherAnos();preencherAtletas();msgLogin('');}
function preencherAnos(){const anos=[...new Set(atletasBanco.map(anoAtleta).filter(Boolean))].sort();document.getElementById('login-ano').innerHTML='<option value="">Todos os anos</option>'+anos.map(a=>`<option>${a}</option>`).join('');document.getElementById('login-ano').onchange=preencherAtletas;}
function preencherAtletas(){const ano=document.getElementById('login-ano').value;const lista=atletasBanco.filter(r=>!ano||anoAtleta(r)===ano);document.getElementById('login-atleta').innerHTML=lista.map(r=>`<option value="${escapeHTML(chaveAtleta(r))}">${escapeHTML(apelido(r))} - ${escapeHTML(anoAtleta(r))}</option>`).join('');}
async function entrarPortalAtleta(){
  const chave=document.getElementById('login-atleta').value;
  const senha=document.getElementById('login-senha').value.trim();
  if(!chave)return msgLogin('Selecione o atleta.');
  if(!senha)return msgLogin('Digite a senha.');
  const row=atletasBanco.find(r=>chaveAtleta(r)===chave);
  if(!row)return msgLogin('Atleta não encontrado.');
  const nome=nomeCompleto(row), nasc=nascimento(row);

  // Senha da coordenação: entra em qualquer atleta sem criar/alterar cadastro.
  if(senha === SENHA_COORDENACAO_PADRAO){
    atletaLogado={nomeCompleto:nome,nascimento:nasc,row,coordenacao:true};
    mostrarFicha(row);
    return;
  }

  let {data,error}=await sb.from('portal_atletas_acesso').select('*').eq('nome_completo',nome).eq('nascimento',nasc).maybeSingle();
  if(error){msgLogin('Erro ao validar acesso.');return}

  if(!data||data.primeiro_acesso||!data.senha){
    if(senha===SENHA_RECUPERACAO_PADRAO){msgLogin('Use uma senha pessoal diferente da senha de recuperação.');return;}
    if(senha.length<4)return msgLogin('No primeiro acesso, crie uma senha com pelo menos 4 caracteres.');
    const payload={nome_completo:nome,nascimento:nasc,senha,senha_recuperacao:SENHA_RECUPERACAO_PADRAO,primeiro_acesso:false,ativo:true,atualizado_em:new Date().toISOString()};
    const res=await sb.from('portal_atletas_acesso').upsert(payload,{onConflict:'nome_completo,nascimento'});
    if(res.error){msgLogin('Erro ao criar senha.');return}
    data=payload;
  }else if(data.senha!==senha){
    if(senha===SENHA_RECUPERACAO_PADRAO||senha===data.senha_recuperacao){
      const nova=prompt('Senha de recuperação aceita. Digite uma nova senha:');
      if(!nova||nova.length<4){msgLogin('Nova senha inválida.');return}
      await sb.from('portal_atletas_acesso').update({senha:nova,primeiro_acesso:false,atualizado_em:new Date().toISOString()}).eq('nome_completo',nome).eq('nascimento',nasc);
    }else{msgLogin('Senha incorreta.');return}
  }

  atletaLogado={nomeCompleto:nome,nascimento:nasc,row,coordenacao:false};
  mostrarFicha(row);
}
function card(label,key,avals,unit='',menor=false,row=null,extraClass=''){const ult=avals[avals.length-1]||{};const classe=row?classeDesempenho(row,ult,key):'';return `<div class="res-card ${extraClass} ${classe}"><span>${label}</span><strong>${escapeHTML(ult[key]||'-')}${ult[key]?unit:''}</strong>${delta(avals,key,menor,unit)}</div>`}
function portalDentroHorario(tipo){
  if(atletaLogado&&atletaLogado.coordenacao)return true;
  const agora=new Date();
  const dia=agora.getDay(); // 0 domingo, 6 sábado
  const hora=agora.getHours()+agora.getMinutes()/60;
  const diaUtil=dia>=1&&dia<=5;
  if(!diaUtil)return false;
  if(tipo==='psr')return hora>=6&&hora<15;
  if(tipo==='pse')return hora>=16&&hora<23;
  return false;
}
function atualizarBotoesQuestionariosPortal(){
  const panel=document.getElementById('portal-action-panel');
  const psrBtn=document.getElementById('portal-btn-psr');
  const pseBtn=document.getElementById('portal-btn-pse');
  const info=document.getElementById('portal-horario-info');
  if(!panel)return;
  if(!atletaLogado){
    panel.style.display='none';
    if(info)info.style.display='none';
    return;
  }
  const podePSR=portalDentroHorario('psr');
  const podePSE=portalDentroHorario('pse');
  if(psrBtn)psrBtn.style.display=podePSR?'inline-flex':'none';
  if(pseBtn)pseBtn.style.display=podePSE?'inline-flex':'none';
  panel.style.display=(podePSR||podePSE)?'flex':'none';
  if(info){
    info.style.display='inline-flex';
    info.textContent=atletaLogado.coordenacao
      ? 'Coordenação: PSR e PSE liberados'
      : 'PSR - 06:00 as 15:00  PSE: 16:00 as 23:00';
  }
}
function mostrarFicha(row){document.getElementById('login-screen').classList.remove('active');document.getElementById('ficha-screen').classList.add('active');atualizarBotoesQuestionariosPortal();document.getElementById('portal-atleta-logado').textContent=apelido(row);const avals=avaliacoesAtleta(row);const resumo=avals.length?`<div class="section-title">Resumo da Última Avaliação</div><div class="resumo-grid">${card('Peso','peso',avals,' Kg',false,null,'sem-cor')}${card('Altura','altura',avals,' m',false,null,'sem-cor')}${card('Alt. Predita','predita',avals,' m',false,null,'sem-cor')}${card('% Gordura','gordura',avals,'',true,row)}${card('Resistência','distancia',avals,' m',false,row)}${card('Potência','salto',avals,' m',false,row)}${card('Aceleração','aceleracao',avals,' s',true,row)}${card('Velocidade','velocidade',avals,' s',true,row)}${card('Agilidade','agilidade',avals,' s',true,row)}</div><div class="section-title">Comparativo das Avaliações</div><div class="comp-wrap"><table class="comparativo"><thead><tr><th>Data</th><th>Peso</th><th>Altura</th><th>Gordura</th><th>Dist.</th><th>Salto</th><th>Acel.</th><th>Veloc.</th><th>Agil.</th></tr></thead><tbody>${avals.map(a=>`<tr><td>${escapeHTML(a.data)}</td><td>${escapeHTML(a.peso)}</td><td>${escapeHTML(a.altura)}</td><td>${escapeHTML(a.gordura)}</td><td>${escapeHTML(a.distancia)}</td><td>${escapeHTML(a.salto)}</td><td>${escapeHTML(a.aceleracao)}</td><td>${escapeHTML(a.velocidade)}</td><td>${escapeHTML(a.agilidade)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="aviso">Nenhuma avaliação física encontrada.</div>';document.getElementById('ficha-container').innerHTML=`<div class="ficha-wrap"><div class="foto-area"><img src="${foto(row)}" onerror="this.src='logo.png'" alt="${escapeHTML(nomeCompleto(row))}"></div><div class="dados-area"><h1 class="apelido">${escapeHTML(apelido(row))}</h1><div class="nome-completo">${escapeHTML(nomeCompleto(row))}</div><div class="info-grid"><p><strong>Ano:</strong> ${escapeHTML(anoAtleta(row))}</p><p><strong>Nascimento:</strong> ${escapeHTML(nascimento(row))}</p><p><strong>Posição:</strong> ${escapeHTML(posicao(row))}</p><p><strong>Cidade:</strong> ${escapeHTML(cidade(row))}</p></div>${resumo}</div></div>`;}
function sairPortalAtleta(){sessionStorage.removeItem('portal_atleta_logado');atletaLogado=null;const actionPanel=document.getElementById('portal-action-panel');if(actionPanel)actionPanel.style.display='none';document.getElementById('ficha-screen').classList.remove('active');document.getElementById('login-screen').classList.add('active');document.getElementById('login-senha').value='';}
async function tentarRestaurarSessao(){const s=sessionStorage.getItem('portal_atleta_logado');if(!s)return;try{const obj=JSON.parse(s);const row=atletasBanco.find(r=>nomeCompleto(r)===obj.nomeCompleto&&nascimento(r)===obj.nascimento);if(row)mostrarFicha(row);}catch(e){}}
window.addEventListener('DOMContentLoaded',async()=>{sessionStorage.removeItem('portal_atleta_logado');iniciarInatividadePortal();await carregarAtletas();});


/* === PSR / PSE - Relatório diário do atleta === */
function dataHojePortalISO(){
  const d=new Date();
  const off=d.getTimezoneOffset();
  const local=new Date(d.getTime()-off*60000);
  return local.toISOString().slice(0,10);
}
function dataHojePortalBR(){
  const iso=dataHojePortalISO();
  const [a,m,d]=iso.split('-');
  return `${d}/${m}/${a}`;
}
function garantirAtletaLogado(){
  if(!atletaLogado||!atletaLogado.nomeCompleto||!atletaLogado.nascimento){
    alert('Faça login novamente para preencher.');
    return false;
  }
  return true;
}
function criarModalPortalDiario(){
  let modal=document.getElementById('portal-diario-modal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='portal-diario-modal';
    modal.className='portal-diario-overlay';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)fecharModalDiario();});
  }
  return modal;
}
function fecharModalDiario(){const modal=document.getElementById('portal-diario-modal');if(modal)modal.style.display='none';}
function opcoesNota(max){
  let html='<option value="">Selecione...</option>';
  for(let i=0;i<=max;i++)html+=`<option value="${i}">${i}</option>`;
  return html;
}
async function buscarRespostaDiariaPortal(data=dataHojePortalISO()){
  if(!garantirAtletaLogado())return null;
  const {data:res,error}=await sb.from('portal_respostas_diarias')
    .select('*')
    .eq('nome_completo',atletaLogado.nomeCompleto)
    .eq('nascimento',atletaLogado.nascimento)
    .eq('data',data)
    .maybeSingle();
  if(error){console.error(error);return null;}
  return res;
}
async function salvarRespostaDiariaPortal(tipo,valor){
  if(!garantirAtletaLogado())return false;
  const data=dataHojePortalISO();
  const existente=await buscarRespostaDiariaPortal(data);
  const payload={
    nome_completo:atletaLogado.nomeCompleto,
    nascimento:atletaLogado.nascimento,
    data,
    psr:(existente&&existente.psr)||{},
    pse:(existente&&existente.pse)||{},
    atualizado_em:new Date().toISOString()
  };
  payload[tipo]=valor;
  const {error}=await sb.from('portal_respostas_diarias').upsert(payload,{onConflict:'nome_completo,nascimento,data'});
  if(error){console.error(error);alert('Erro ao salvar. Tente novamente.');return false;}
  return true;
}
function psrRotulosEscala(nome){
  const positivos = ['Muito ruim','Ruim','Regular','Médio','Bom','Muito bom'];
  const carga = ['Nenhuma','Muito pouco','Pouco','Médio','Alto','Muito alto'];
  if(['psr_sono','psr_motivacao'].includes(nome)) return positivos;
  return carga;
}
function psrEscalaHTML(nome,label,valorAtual){
  const rotulos = psrRotulosEscala(nome);
  return `<div class="psr-scale-row"><div class="psr-scale-title">${label}</div><div class="psr-scale-options">${[0,1,2,3,4,5].map(v=>`<label><input type="radio" name="${nome}" value="${v}" ${String(valorAtual)===String(v)?'checked':''}><span><strong>${v}</strong><small>${rotulos[v]}</small></span></label>`).join('')}</div></div>`;
}
function psrValorSelecionado(nome){
  const el=document.querySelector(`input[name="${nome}"]:checked`);
  return el?Number(el.value):null;
}
async function abrirModalPSR(){
  if(!garantirAtletaLogado())return;
  if(!portalDentroHorario('psr')){alert('O PSR pode ser preenchido de segunda a sexta, das 06:00 às 15:00.');return;}
  const existente=await buscarRespostaDiariaPortal();
  const psr=(existente&&existente.psr)||{};
  const modal=criarModalPortalDiario();
  modal.innerHTML=`<div class="portal-diario-card portal-psr-card"><button class="portal-diario-close" onclick="fecharModalDiario()">×</button><h2>PSR</h2><p class="portal-diario-sub">Percepção Subjetiva de Recuperação - ${dataHojePortalBR()}</p><div class="portal-diario-info">0 = pior / 5 = melhor</div><div class="psr-scale-list">${psrEscalaHTML('psr_sono','Qualidade do sono',psr.sono)}${psrEscalaHTML('psr_fadiga','Fadiga',psr.fadiga)}${psrEscalaHTML('psr_dor','Dor muscular',psr.dor_muscular)}<label class="psr-dor-desc">Caso tenha dor, descreva<textarea id="psr-dor-desc" placeholder="Ex: panturrilha, posterior, joelho...">${escapeHTML(psr.dor_descricao||'')}</textarea></label>${psrEscalaHTML('psr_estresse','Estresse mental',psr.estresse_mental)}${psrEscalaHTML('psr_motivacao','Motivação para o treino',psr.motivacao)}</div><button class="portal-diario-save" onclick="salvarPSRPortal()">Salvar PSR</button><div id="portal-diario-msg" class="portal-diario-msg"></div></div>`;
  modal.style.display='flex';
}
async function salvarPSRPortal(){
  const sono=psrValorSelecionado('psr_sono');
  const fadiga=psrValorSelecionado('psr_fadiga');
  const dor=psrValorSelecionado('psr_dor');
  const estresse=psrValorSelecionado('psr_estresse');
  const motivacao=psrValorSelecionado('psr_motivacao');
  if([sono,fadiga,dor,estresse,motivacao].some(v=>v===null)){
    document.getElementById('portal-diario-msg').textContent='Preencha todas as notas.';
    return;
  }
  const valor={
    sono,
    fadiga,
    dor_muscular:dor,
    dor_descricao:document.getElementById('psr-dor-desc').value.trim(),
    estresse_mental:estresse,
    motivacao,
    preenchido_em:new Date().toISOString()
  };
  if(await salvarRespostaDiariaPortal('psr',valor)){
    document.getElementById('portal-diario-msg').textContent='PSR salvo com sucesso.';
    setTimeout(fecharModalDiario,650);
  }
}
async function abrirModalPSE(){
  if(!garantirAtletaLogado())return;
  if(!portalDentroHorario('pse')){alert('O PSE pode ser preenchido de segunda a sexta, das 16:00 às 23:00.');return;}
  const existente=await buscarRespostaDiariaPortal();
  const pse=(existente&&existente.pse)||{};
  const modal=criarModalPortalDiario();
  modal.innerHTML=`<div class="portal-diario-card portal-pse-card"><button class="portal-diario-close" onclick="fecharModalDiario()">×</button><h2>PSE</h2><p class="portal-diario-sub">Percepção Subjetiva de Esforço - ${dataHojePortalBR()}</p><div class="portal-diario-question">Como foi seu treino hoje?</div><div class="pse-options">${[
    ['0','Repouso absoluto'],['1','Muito leve'],['2','Leve'],['3','Moderado'],['4','Um pouco pesado'],['5','Pesado'],['6','Muito pesado'],['7','Esforço máximo']
  ].map(([v,t])=>`<label><input type="radio" name="pse-valor" value="${v}"><span><strong>${v}</strong>${t}</span></label>`).join('')}</div><button class="portal-diario-save" onclick="salvarPSEPortal()">Salvar PSE</button><div id="portal-diario-msg" class="portal-diario-msg"></div></div>`;
  modal.style.display='flex';
  if(pse.valor!==undefined&&pse.valor!==null){const r=modal.querySelector(`input[name="pse-valor"][value="${pse.valor}"]`);if(r)r.checked=true;}
}
async function salvarPSEPortal(){
  const sel=document.querySelector('input[name="pse-valor"]:checked');
  if(!sel){document.getElementById('portal-diario-msg').textContent='Selecione uma opção.';return;}
  const textos=['Repouso absoluto','Muito leve','Leve','Moderado','Um pouco pesado','Pesado','Muito pesado','Esforço máximo'];
  const valor={valor:Number(sel.value),descricao:textos[Number(sel.value)]||'',preenchido_em:new Date().toISOString()};
  if(await salvarRespostaDiariaPortal('pse',valor)){
    document.getElementById('portal-diario-msg').textContent='PSE salvo com sucesso.';
    setTimeout(fecharModalDiario,650);
  }
}
