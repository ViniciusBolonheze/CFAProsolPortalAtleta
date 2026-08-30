const SUPABASE_URL = 'https://jrudgjopfxfyyhnvgidz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VScGEvhYLgQSDGll2IQIsw_bsTQXRCO';
const SENHA_RECUPERACAO_PADRAO = 'CFAPROSOL';
const SENHAS_COORDENACAO_PADRAO = ['cfaprosol2023','blucxj123'];
const TEMPO_INATIVIDADE_PORTAL = 5 * 60 * 1000;
const PORTAL_LOGIN_PERSIST_KEY = 'portal_atleta_login_salvo_v1';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let atletasBanco = [];
let atletaLogado = null;
let documentosPortalAtleta = { trabalho: null, planejamento: null };
let goleiroInfoPortalAtleta = null;
let goleiroJogosPortalAtleta = [];
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
    const el=document.documentElement;
    const pedido=el.requestFullscreen({navigationUI:'hide'});
    if(pedido&&pedido.catch) pedido.catch(()=>el.requestFullscreen?.().catch(()=>{}));
  }else{
    document.exitFullscreen?.();
  }
}
function resetarOlhoSenhaPortal(){
  const input=document.getElementById('login-senha');
  const btn=document.getElementById('login-senha-olho');
  if(input) input.type='password';
  if(btn){
    btn.classList.remove('visivel');
    btn.setAttribute('aria-label','Mostrar senha');
    btn.title='Mostrar senha';
  }
}
function toggleVisibilidadeSenhaPortal(){
  const input=document.getElementById('login-senha');
  const btn=document.getElementById('login-senha-olho');
  if(!input)return;
  const mostrar=input.type==='password';
  input.type=mostrar?'text':'password';
  if(btn){
    btn.classList.toggle('visivel',mostrar);
    btn.setAttribute('aria-label',mostrar?'Ocultar senha':'Mostrar senha');
    btn.title=mostrar?'Ocultar senha':'Mostrar senha';
  }
}
function iniciarEnterLoginPortal(){
  ['login-ano','login-atleta','login-senha'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el)return;
    el.addEventListener('keydown',e=>{
      if(e.key==='Enter'){ e.preventDefault(); entrarPortalAtleta(); }
    });
  });
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

function portalManterConectadoMarcado(){return !!document.getElementById('login-manter-conectado')?.checked;}
function portalSalvarLoginLocal(row, senha){
  if(!row||!senha)return;
  try{
    localStorage.setItem(PORTAL_LOGIN_PERSIST_KEY, JSON.stringify({
      nomeCompleto:nomeCompleto(row),
      nascimento:nascimento(row),
      ano:anoAtleta(row),
      senha,
      salvo_em:new Date().toISOString()
    }));
  }catch(e){console.warn('Não foi possível salvar login neste aparelho:',e);}
}
function portalLimparLoginLocal(){try{localStorage.removeItem(PORTAL_LOGIN_PERSIST_KEY);}catch(e){}}
function portalLoginLocalSalvo(){try{return JSON.parse(localStorage.getItem(PORTAL_LOGIN_PERSIST_KEY)||'null');}catch(e){return null;}}
function portalSelecionarAtletaNoLogin(row){
  if(!row)return;
  const ano=anoAtleta(row);
  const anoSelect=document.getElementById('login-ano');
  if(anoSelect){anoSelect.value=ano;preencherAtletas();}
  const atletaSelect=document.getElementById('login-atleta');
  if(atletaSelect)atletaSelect.value=chaveAtleta(row);
}
async function tentarLoginLocalSalvo(){
  const salvo=portalLoginLocalSalvo();
  if(!salvo||!salvo.nomeCompleto||!salvo.nascimento||!salvo.senha)return false;
  const row=atletasBanco.find(r=>nomeCompleto(r)===salvo.nomeCompleto&&nascimento(r)===salvo.nascimento);
  if(!row){portalLimparLoginLocal();return false;}
  portalSelecionarAtletaNoLogin(row);
  const chk=document.getElementById('login-manter-conectado');if(chk)chk.checked=true;
  msgLogin('Entrando automaticamente...');
  try{
    const {data,error}=await sb.from('portal_atletas_acesso').select('*').eq('nome_completo',salvo.nomeCompleto).eq('nascimento',salvo.nascimento).maybeSingle();
    if(error||!data||data.ativo===false||data.senha!==salvo.senha){portalLimparLoginLocal();msgLogin('');return false;}
    atletaLogado={nomeCompleto:salvo.nomeCompleto,nascimento:salvo.nascimento,row,coordenacao:false};
    mostrarFicha(row);
    return true;
  }catch(e){console.warn('Erro ao restaurar login salvo:',e);msgLogin('');return false;}
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
  let senhaParaSalvar=senha;

  // Senha da coordenação: entra em qualquer atleta sem criar/alterar cadastro e não fica salva no aparelho.
  if(SENHAS_COORDENACAO_PADRAO.includes(senha)){
    portalLimparLoginLocal();
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
    if(senha===SENHA_RECUPERACAO_PADRAO){
      const nova=prompt('Senha de recuperação aceita. Digite uma nova senha:');
      if(!nova||nova.length<4){msgLogin('Nova senha inválida.');return}
      await sb.from('portal_atletas_acesso').update({senha:nova,primeiro_acesso:false,atualizado_em:new Date().toISOString()}).eq('nome_completo',nome).eq('nascimento',nasc);
      senhaParaSalvar=nova;
    }else{msgLogin('Senha incorreta.');return}
  }

  if(portalManterConectadoMarcado()) portalSalvarLoginLocal(row, senhaParaSalvar);
  else portalLimparLoginLocal();
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
function respostaQuestionarioPreenchidaPortal(tipo,resposta){
  const obj=resposta&&resposta[tipo];
  if(!obj||typeof obj!=='object')return false;
  if(obj.preenchido_em)return true;
  if(tipo==='psr'){
    return ['sono','fadiga','dor_muscular','estresse_mental','motivacao'].every(k=>obj[k]!==undefined&&obj[k]!==null&&obj[k]!=='');
  }
  return obj.valor!==undefined&&obj.valor!==null&&obj.valor!=='';
}
function aplicarEstadoQuestionarioPortal(botao,enviado,tituloNovo,tituloEnviado){
  if(!botao)return;
  botao.classList.remove('questionario-pendente','questionario-enviado');
  botao.classList.add(enviado?'questionario-enviado':'questionario-pendente');
  botao.title=enviado?tituloEnviado:tituloNovo;
}
async function atualizarBotoesQuestionariosPortal(){
  const panel=document.getElementById('portal-action-panel');
  const psrBtn=document.getElementById('portal-btn-psr');
  const pseBtn=document.getElementById('portal-btn-pse');
  const info=document.getElementById('portal-horario-info');
  if(!panel)return;
  if(!atletaLogado){
    panel.style.display='none';
    if(info)info.style.display='none';
    aplicarEstadoQuestionarioPortal(psrBtn,false,'Percepção Subjetiva de Recuperação','PSR já enviado hoje');
    aplicarEstadoQuestionarioPortal(pseBtn,false,'Percepção Subjetiva de Esforço','PSE já enviado hoje');
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
  let respostaHoje=null;
  try{respostaHoje=await buscarRespostaDiariaPortal(dataHojePortalISO());}catch(e){console.warn('Não foi possível verificar PSR/PSE enviados:',e);}
  aplicarEstadoQuestionarioPortal(psrBtn,respostaQuestionarioPreenchidaPortal('psr',respostaHoje),'Preencher PSR','PSR já enviado hoje');
  aplicarEstadoQuestionarioPortal(pseBtn,respostaQuestionarioPreenchidaPortal('pse',respostaHoje),'Preencher PSE','PSE já enviado hoje');
}
function normalizarPortalDocumento(v){return String(v||'').trim().replace(/\s+/g,' ');}
function registroTemArquivoPortal(reg){return !!(reg && (reg.public_url || reg.storage_path));}
function atletaExtraNoRegistroPortal(reg){
  if(!atletaLogado||!reg||!Array.isArray(reg.atletas))return false;
  const nome=normalizarPortalDocumento(atletaLogado.nomeCompleto);
  const ano=normalizarPortalDocumento(anoAtleta(atletaLogado.row));
  return reg.atletas.some(a=>normalizarPortalDocumento(a.nomeCompleto||a.nome_completo||a.nome)===nome && normalizarPortalDocumento(a.ano)===ano);
}
function registroPadraoAnoPortal(reg){
  if(!atletaLogado||!reg)return false;
  const ano=normalizarPortalDocumento(anoAtleta(atletaLogado.row));
  const anos=Array.isArray(reg.anos_padrao)?reg.anos_padrao.map(normalizarPortalDocumento):[];
  return anos.includes(ano);
}
function escolherRegistroDocumentoPortal(registros){
  const validos=(registros||[]).filter(registroTemArquivoPortal).sort((a,b)=>new Date(b.atualizado_em||0)-new Date(a.atualizado_em||0));
  const extras=validos.filter(atletaExtraNoRegistroPortal);
  if(extras.length)return extras[0];
  return validos.find(registroPadraoAnoPortal)||null;
}
function documentoEstaVistoNoAcessoPortal(acessos, reg){
  const chave=chaveDocumentoPortal(reg);
  if(!chave||!Array.isArray(acessos))return false;
  return acessos.some(a=>String(a.chave_documento||a.storage_path||'')===chave);
}
async function documentoAtualVistoPortal(tipo, reg){
  if(!atletaLogado||!reg)return false;
  try{
    const {data,error}=await sb.from('portal_documentos_acessos')
      .select('acessos')
      .eq('nome_completo',atletaLogado.nomeCompleto)
      .eq('nascimento',atletaLogado.nascimento)
      .eq('tipo',tipo)
      .eq('categoria_id',reg.categoria_id||'')
      .maybeSingle();
    if(error){console.warn('Não foi possível verificar visualização do documento:',error);return false;}
    return documentoEstaVistoNoAcessoPortal(data&&data.acessos,data?reg:null);
  }catch(e){
    console.warn('Erro ao verificar visualização do documento:',e);
    return false;
  }
}
function aplicarEstadoBotaoDocumentoPortal(tipo){
  const btn = tipo==='trabalho' ? document.getElementById('portal-btn-trabalho') : document.getElementById('portal-btn-planejamento');
  const reg = tipo==='trabalho' ? documentosPortalAtleta.trabalho : documentosPortalAtleta.planejamento;
  const visto = tipo==='trabalho' ? !!documentosPortalAtleta.trabalhoVisto : !!documentosPortalAtleta.planejamentoVisto;
  if(!btn)return;
  btn.classList.remove('documento-visto','documento-novo');
  if(!reg){btn.style.display='none';return;}
  btn.style.display='inline-flex';
  btn.classList.add(visto?'documento-visto':'documento-novo');
  btn.title = visto ? 'Documento já visualizado' : 'Novo documento disponível';
}
async function carregarDocumentosPortalAtleta(){
  const box=document.getElementById('portal-documentos-buttons');
  const btnTrabalho=document.getElementById('portal-btn-trabalho');
  const btnPlanejamento=document.getElementById('portal-btn-planejamento');
  documentosPortalAtleta={trabalho:null,planejamento:null,trabalhoVisto:false,planejamentoVisto:false};
  if(!box||!atletaLogado){if(box)box.style.display='none';return;}
  box.style.display='none';
  if(btnTrabalho){btnTrabalho.style.display='none';btnTrabalho.classList.remove('documento-visto','documento-novo');}
  if(btnPlanejamento){btnPlanejamento.style.display='none';btnPlanejamento.classList.remove('documento-visto','documento-novo');}
  try{
    const [td,ps]=await Promise.all([
      sb.from('trabalhos_diarios').select('*'),
      sb.from('planejamentos_semanais').select('*')
    ]);
    if(!td.error) documentosPortalAtleta.trabalho=escolherRegistroDocumentoPortal(td.data||[]);
    if(!ps.error) documentosPortalAtleta.planejamento=escolherRegistroDocumentoPortal(ps.data||[]);

    const [trabalhoVisto, planejamentoVisto] = await Promise.all([
      documentosPortalAtleta.trabalho ? documentoAtualVistoPortal('trabalho_diario', documentosPortalAtleta.trabalho) : Promise.resolve(false),
      documentosPortalAtleta.planejamento ? documentoAtualVistoPortal('planejamento_semanal', documentosPortalAtleta.planejamento) : Promise.resolve(false)
    ]);
    documentosPortalAtleta.trabalhoVisto=trabalhoVisto;
    documentosPortalAtleta.planejamentoVisto=planejamentoVisto;

    aplicarEstadoBotaoDocumentoPortal('trabalho');
    aplicarEstadoBotaoDocumentoPortal('planejamento');
    box.style.display=(documentosPortalAtleta.trabalho||documentosPortalAtleta.planejamento)?'flex':'none';
  }catch(e){
    console.warn('Erro ao carregar trabalhos/planejamentos do atleta:',e);
    box.style.display='none';
  }
}
function urlDocumentoPortal(reg,bucket){
  if(!reg)return '';
  if(reg.public_url)return reg.public_url;
  if(reg.storage_path){
    try{const {data}=sb.storage.from(bucket).getPublicUrl(reg.storage_path);return data&&data.publicUrl?data.publicUrl:'';}catch(e){return '';}
  }
  return '';
}
function dataDocumentoPortal(reg){
  // Usa a data de referência salva pelo Sistema Principal.
  // Assim, abrir o PDF em outro dia continua contando para o dia/semana correta do treino.
  const referencia=String(reg?.data_referencia||'');
  let m=referencia.match(/^(\d{4}-\d{2}-\d{2})/);
  if(m)return m[1];
  const base=String(reg?.atualizado_em||reg?.criado_em||'');
  m=base.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?m[1]:dataHojePortalISO();
}
function chaveDocumentoPortal(reg){
  return String(reg?.storage_path||reg?.public_url||reg?.arquivo_nome||'');
}
function atualizarListaAcessosPortal(acessos, novoAcesso){
  const lista=Array.isArray(acessos)?[...acessos]:[];
  const chave=novoAcesso.chave_documento;
  const idx=lista.findIndex(a=>String(a.chave_documento||a.storage_path||'')===chave);
  if(idx>=0){
    const item={...lista[idx]};
    const dias=Array.isArray(item.dias)?[...item.dias]:[];
    if(!dias.includes(novoAcesso.data_abertura)) dias.push(novoAcesso.data_abertura);
    item.dias=dias;
    item.ultimo_acesso_em=novoAcesso.ultimo_acesso_em;
    item.quantidade=(Number(item.quantidade)||0)+1;
    item.arquivo_nome=novoAcesso.arquivo_nome;
    item.storage_path=novoAcesso.storage_path;
    item.public_url=novoAcesso.public_url;
    item.data_documento=novoAcesso.data_documento;
    item.data_referencia=novoAcesso.data_referencia||novoAcesso.data_documento;
    lista[idx]=item;
  }else{
    lista.push({
      chave_documento:novoAcesso.chave_documento,
      arquivo_nome:novoAcesso.arquivo_nome,
      storage_path:novoAcesso.storage_path,
      public_url:novoAcesso.public_url,
      categoria_label:novoAcesso.categoria_label,
      data_documento:novoAcesso.data_documento,
      data_referencia:novoAcesso.data_referencia||novoAcesso.data_documento,
      dias:[novoAcesso.data_abertura],
      primeiro_acesso_em:novoAcesso.ultimo_acesso_em,
      ultimo_acesso_em:novoAcesso.ultimo_acesso_em,
      quantidade:1
    });
  }
  return lista;
}
async function registrarAcessoDocumentoPortal(tipo, reg, bucket){
  if(!atletaLogado || !reg) return;
  try{
    const agora=new Date().toISOString();
    const dataReferenciaDocumento=dataDocumentoPortal(reg);
    const url=urlDocumentoPortal(reg,bucket);
    const categoria=reg.categoria_id||'';
    const chaveDoc=chaveDocumentoPortal(reg);
    if(!chaveDoc) return;

    const {data:existente,error:selectError}=await sb.from('portal_documentos_acessos')
      .select('*')
      .eq('nome_completo',atletaLogado.nomeCompleto)
      .eq('nascimento',atletaLogado.nascimento)
      .eq('tipo',tipo)
      .eq('categoria_id',categoria)
      .maybeSingle();
    if(selectError){console.warn('Erro ao buscar acesso existente:',selectError);}

    const novoAcesso={
      chave_documento:chaveDoc,
      arquivo_nome:reg.arquivo_nome||'',
      storage_path:reg.storage_path||'',
      public_url:url||'',
      categoria_label:reg.categoria_label||'',
      data_documento:dataReferenciaDocumento,
      data_referencia:dataReferenciaDocumento,
      data_abertura:dataReferenciaDocumento,
      ultimo_acesso_em:agora
    };

    const acessos=atualizarListaAcessosPortal(existente?.acessos,novoAcesso);
    const payload={
      nome_completo:atletaLogado.nomeCompleto,
      nascimento:atletaLogado.nascimento,
      ano:anoAtleta(atletaLogado.row),
      tipo,
      categoria_id:categoria,
      categoria_label:reg.categoria_label||'',
      acessos,
      atualizado_em:agora
    };

    const {error}=await sb.from('portal_documentos_acessos').upsert(payload,{onConflict:'nome_completo,nascimento,tipo,categoria_id'});
    if(error)console.warn('Não foi possível registrar abertura do documento:',error);
  }catch(e){
    console.warn('Não foi possível registrar abertura do documento:', e);
  }
}
function abrirTrabalhoDiarioPortal(){
  const reg=documentosPortalAtleta.trabalho;
  const url=urlDocumentoPortal(reg,'trabalhos-diarios');
  if(!url)return alert('Nenhum trabalho diário disponível.');
  window.open(url,'_blank','noopener,noreferrer');
  registrarAcessoDocumentoPortal('trabalho_diario', reg, 'trabalhos-diarios').then(()=>{
    documentosPortalAtleta.trabalhoVisto=true;
    aplicarEstadoBotaoDocumentoPortal('trabalho');
  });
}
function abrirPlanejamentoSemanalPortal(){
  const reg=documentosPortalAtleta.planejamento;
  const url=urlDocumentoPortal(reg,'planejamentos-semanais');
  if(!url)return alert('Nenhum planejamento semanal disponível.');
  window.open(url,'_blank','noopener,noreferrer');
  registrarAcessoDocumentoPortal('planejamento_semanal', reg, 'planejamentos-semanais').then(()=>{
    documentosPortalAtleta.planejamentoVisto=true;
    aplicarEstadoBotaoDocumentoPortal('planejamento');
  });
}

function dataJogoGoleiroBR(v){
  const s=String(v||'').slice(0,10);
  const m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?`${m[3]}/${m[2]}/${m[1]}`:s;
}
function rotuloJogoGoleiroPortal(jogo){
  const data=dataJogoGoleiroBR(jogo?.data_jogo);
  const adv=String(jogo?.adversario||'').trim()||'Adversário';
  return `${data} – ${adv}`;
}
async function carregarGoleiroInfoPortalAtleta(){
  goleiroInfoPortalAtleta=null;
  goleiroJogosPortalAtleta=[];
  const alvo=document.getElementById('portal-goleiro-info-inline');
  if(alvo)alvo.innerHTML='';
  if(!atletaLogado||!atletaLogado.nomeCompleto||!atletaLogado.nascimento)return;
  try{
    const [tec,jogos]=await Promise.all([
      sb.from('goleiros_informacoes_tecnicas')
        .select('*')
        .eq('nome_completo',atletaLogado.nomeCompleto)
        .eq('nascimento',atletaLogado.nascimento)
        .maybeSingle(),
      sb.from('goleiros_informacoes_jogos')
        .select('*')
        .eq('nome_completo',atletaLogado.nomeCompleto)
        .eq('nascimento',atletaLogado.nascimento)
        .order('data_jogo',{ascending:false})
        .order('atualizado_em',{ascending:false})
    ]);
    if(tec.error) console.warn('Informações técnicas de goleiro não carregadas:',tec.error.message);
    if(jogos.error) console.warn('Jogos do goleiro não carregados:',jogos.error.message);
    goleiroInfoPortalAtleta=tec.data||null;
    goleiroJogosPortalAtleta=Array.isArray(jogos.data)?jogos.data:[];
    renderGoleiroInfoInlinePortal();
  }catch(e){console.warn('Erro ao carregar informações de goleiro:',e);}
}
function renderGoleiroInfoInlinePortal(){
  const alvo=document.getElementById('portal-goleiro-info-inline');
  if(!alvo)return;
  const infoTecnica=String(goleiroInfoPortalAtleta?.informacoes_tecnicas||'').trim();
  const jogos=goleiroJogosPortalAtleta||[];
  if(!infoTecnica&&!jogos.length){alvo.innerHTML='';return;}
  const atualizado=goleiroInfoPortalAtleta?.atualizado_em?new Date(goleiroInfoPortalAtleta.atualizado_em).toLocaleDateString('pt-BR'):'';
  const blocoTecnica=infoTecnica?`<div class="portal-goleiro-info-bloco"><b>Informações Técnicas:</b><p>${escapeHTML(infoTecnica).replace(/\n/g,'<br>')}</p></div>`:'';
  let blocoJogo='';
  if(jogos.length){
    const primeiro=jogos[0];
    const opcoes=jogos.map((j,i)=>`<option value="${escapeHTML(String(j.id||i))}" ${i===0?'selected':''}>${escapeHTML(rotuloJogoGoleiroPortal(j))}</option>`).join('');
    blocoJogo=`<div class="portal-goleiro-info-bloco jogo"><b>Informações de jogo:</b><label class="portal-goleiro-jogo-select-wrap">Selecionar o jogo<select id="portal-goleiro-jogo-select" onchange="atualizarTextoJogoGoleiroPortal()">${opcoes}</select></label><p id="portal-goleiro-jogo-texto">${escapeHTML(String(primeiro.informacoes||'')).replace(/\n/g,'<br>')||'Sem texto neste jogo.'}</p></div>`;
  }
  alvo.innerHTML=`<section class="portal-goleiro-inline-card"><div class="portal-goleiro-inline-title"><strong>Goleiros</strong>${atualizado?`<small>Atualizado em ${escapeHTML(atualizado)}</small>`:''}</div>${blocoTecnica}${blocoJogo}</section>`;
}
function atualizarTextoJogoGoleiroPortal(){
  const sel=document.getElementById('portal-goleiro-jogo-select');
  const texto=document.getElementById('portal-goleiro-jogo-texto');
  if(!sel||!texto)return;
  const jogo=(goleiroJogosPortalAtleta||[]).find(j=>String(j.id)===String(sel.value))||goleiroJogosPortalAtleta[0];
  const body=String(jogo?.informacoes||'').trim();
  texto.innerHTML=body?escapeHTML(body).replace(/\n/g,'<br>'):'Sem texto neste jogo.';
}
const PREPARACAO_FISICA_TABELA = 'portal_preparacao_fisica';
let preparacaoFisicaRespostasAtuais = [];
function preparacaoFisicaDataISO(){return dataHojePortalISO ? dataHojePortalISO() : new Date().toISOString().slice(0,10);}
async function carregarRespostaPreparacaoFisicaPortal(){
  preparacaoFisicaRespostasAtuais=[];
  const alvo=document.getElementById('preparacao-fisica-resposta-inline');
  if(alvo)alvo.innerHTML='';
  if(!atletaLogado||!atletaLogado.nomeCompleto||!atletaLogado.nascimento)return;
  try{
    const hoje=preparacaoFisicaDataISO();
    const {data,error}=await sb.from(PREPARACAO_FISICA_TABELA)
      .select('*')
      .eq('nome_completo',atletaLogado.nomeCompleto)
      .eq('nascimento',atletaLogado.nascimento)
      .gte('resposta_ate',hoje)
      .order('atualizado_em',{ascending:false})
      .limit(20);
    if(error){console.warn('Resposta da preparação física não carregada:',error.message);return;}
    preparacaoFisicaRespostasAtuais=(data||[]).filter(r=>String(r.resposta||'').trim());
    renderRespostaPreparacaoFisicaPortal();
  }catch(e){console.warn('Erro ao carregar resposta da preparação física:',e);}
}
function renderRespostaPreparacaoFisicaPortal(){
  const alvo=document.getElementById('preparacao-fisica-resposta-inline');
  if(!alvo)return;
  const respostas=(preparacaoFisicaRespostasAtuais||[]).filter(r=>String(r.resposta||'').trim());
  if(!respostas.length){alvo.innerHTML='';return;}
  const cards=respostas.map((r,idx)=>{
    const resposta=String(r.resposta||'').trim();
    const ate=r.resposta_ate?String(r.resposta_ate).slice(0,10).split('-').reverse().join('/'):'';
    const enviado=r.atualizado_em?new Date(r.atualizado_em).toLocaleDateString('pt-BR'):'';
    return `<section class="preparacao-resposta-card ${idx===0?'principal':''}"><strong>${idx===0?'Orientação da Preparação Física':'Orientação anterior '+(idx+1)}</strong><p>${escapeHTML(resposta).replace(/\n/g,'<br>')}</p><div class="preparacao-resposta-meta">${enviado?`<small>Respondido em ${escapeHTML(enviado)}</small>`:''}${ate?`<small>Visível até ${escapeHTML(ate)}</small>`:''}</div></section>`;
  }).join('');
  alvo.innerHTML=`<div class="preparacao-respostas-lista">${cards}</div>`;
}
function criarModalPreparacaoFisicaPortal(){
  let modal=document.getElementById('portal-preparacao-modal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='portal-preparacao-modal';
    modal.className='portal-preparacao-overlay';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)fecharPreparacaoFisicaPortal();});
  }
  return modal;
}
function fecharPreparacaoFisicaPortal(){const modal=document.getElementById('portal-preparacao-modal');if(modal)modal.style.display='none';}
function abrirPreparacaoFisicaPortal(){
  if(!garantirAtletaLogado())return;
  const modal=criarModalPreparacaoFisicaPortal();
  const respostas=(preparacaoFisicaRespostasAtuais||[]).filter(r=>String(r.resposta||'').trim());
  const respostaHtml=respostas.length?`<div class="preparacao-modal-resposta"><strong>Orientações atuais</strong>${respostas.map((r,i)=>`<p><b>${i+1}.</b> ${escapeHTML(String(r.resposta||'')).replace(/\n/g,'<br>')}</p>`).join('')}</div>`:'';
  modal.innerHTML=`<div class="portal-preparacao-card"><button class="portal-preparacao-close" onclick="fecharPreparacaoFisicaPortal()">×</button><div class="portal-preparacao-head"><img src="logo.png" alt="CFA Prosol"><div><h2>Preparação Física</h2><p>Queixas de dores e observações para o preparador físico</p></div></div><div class="portal-preparacao-body">${respostaHtml}<label for="preparacao-queixa-texto">Descreva sua queixa de dor:</label><textarea id="preparacao-queixa-texto" placeholder="Ex: Estou com dor na coluna, joelho, posterior... Descreva quando começou e o que sente."></textarea><button onclick="salvarQueixaPreparacaoFisicaPortal()">Enviar para preparação física</button><div id="preparacao-fisica-msg" class="portal-diario-msg"></div></div></div>`;
  modal.style.display='flex';
}
async function salvarQueixaPreparacaoFisicaPortal(){
  if(!garantirAtletaLogado())return;
  const texto=String(document.getElementById('preparacao-queixa-texto')?.value||'').trim();
  const msg=document.getElementById('preparacao-fisica-msg');
  if(!texto){if(msg)msg.textContent='Descreva a queixa antes de enviar.';return;}
  const btn=document.querySelector('#portal-preparacao-modal .portal-preparacao-body button');
  if(btn){btn.disabled=true;btn.textContent='Enviando...';}
  const payload={
    nome_completo:atletaLogado.nomeCompleto,
    nascimento:atletaLogado.nascimento,
    apelido:apelido(atletaLogado.row),
    ano:anoAtleta(atletaLogado.row),
    queixa:texto,
    status:'pendente',
    visto_atleta:false,
    atualizado_em:new Date().toISOString()
  };
  try{
    const {error}=await sb.from(PREPARACAO_FISICA_TABELA).insert(payload);
    if(error)throw error;
    if(msg)msg.textContent='Queixa enviada com sucesso.';
    setTimeout(fecharPreparacaoFisicaPortal,700);
  }catch(e){console.error(e);if(msg)msg.textContent='Erro ao enviar. Tente novamente.';}
  finally{if(btn){btn.disabled=false;btn.textContent='Enviar para preparação física';}}
}
function mostrarFicha(row){document.getElementById('login-screen').classList.remove('active');document.getElementById('ficha-screen').classList.add('active');atualizarBotoesQuestionariosPortal();carregarDocumentosPortalAtleta();setTimeout(()=>{carregarGoleiroInfoPortalAtleta();carregarRespostaPreparacaoFisicaPortal();},0);document.getElementById('portal-atleta-logado').textContent=apelido(row);const avals=avaliacoesAtleta(row);const resumo=avals.length?`<div class="section-title">Resumo da Última Avaliação</div><div class="resumo-grid">${card('Peso','peso',avals,' Kg',false,null,'sem-cor')}${card('Altura','altura',avals,' m',false,null,'sem-cor')}${card('Alt. Predita','predita',avals,' m',false,null,'sem-cor')}${card('% Gordura','gordura',avals,'',true,row)}${card('Resistência','distancia',avals,' m',false,row)}${card('Potência','salto',avals,' m',false,row)}${card('Aceleração','aceleracao',avals,' s',true,row)}${card('Velocidade','velocidade',avals,' s',true,row)}${card('Agilidade','agilidade',avals,' s',true,row)}</div><div class="section-title">Comparativo das Avaliações</div><div class="comp-wrap"><table class="comparativo"><thead><tr><th>Data</th><th>Peso</th><th>Altura</th><th>Gordura</th><th>Dist.</th><th>Salto</th><th>Acel.</th><th>Veloc.</th><th>Agil.</th></tr></thead><tbody>${avals.map(a=>`<tr><td>${escapeHTML(a.data)}</td><td>${escapeHTML(a.peso)}</td><td>${escapeHTML(a.altura)}</td><td>${escapeHTML(a.gordura)}</td><td>${escapeHTML(a.distancia)}</td><td>${escapeHTML(a.salto)}</td><td>${escapeHTML(a.aceleracao)}</td><td>${escapeHTML(a.velocidade)}</td><td>${escapeHTML(a.agilidade)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="aviso">Nenhuma avaliação física encontrada.</div>';document.getElementById('ficha-container').innerHTML=`<div class="ficha-wrap"><div class="foto-area"><img src="${foto(row)}" onerror="this.src='logo.png'" alt="${escapeHTML(nomeCompleto(row))}"></div><div class="dados-area"><h1 class="apelido">${escapeHTML(apelido(row))}</h1><div class="nome-completo">${escapeHTML(nomeCompleto(row))}</div><div class="info-grid"><p><strong>Ano:</strong> ${escapeHTML(anoAtleta(row))}</p><p><strong>Nascimento:</strong> ${escapeHTML(nascimento(row))}</p><p><strong>Posição:</strong> ${escapeHTML(posicao(row))}</p><p><strong>Cidade:</strong> ${escapeHTML(cidade(row))}</p></div><div id="portal-goleiro-info-inline" class="portal-goleiro-inline"></div><div id="preparacao-fisica-resposta-inline"></div>${resumo}<div class="preparacao-fisica-area"><button type="button" class="preparacao-fisica-btn" onclick="abrirPreparacaoFisicaPortal()">Preparação Física</button></div></div></div>`;}
function sairPortalAtleta(){sessionStorage.removeItem('portal_atleta_logado');portalLimparLoginLocal();atletaLogado=null;const actionPanel=document.getElementById('portal-action-panel');if(actionPanel)actionPanel.style.display='none';const docs=document.getElementById('portal-documentos-buttons');if(docs)docs.style.display='none';goleiroInfoPortalAtleta=null;preparacaoFisicaRespostasAtuais=[];fecharPreparacaoFisicaPortal();document.getElementById('ficha-screen').classList.remove('active');document.getElementById('login-screen').classList.add('active');document.getElementById('login-senha').value='';resetarOlhoSenhaPortal();const chk=document.getElementById('login-manter-conectado');if(chk)chk.checked=false;}
async function tentarRestaurarSessao(){const s=sessionStorage.getItem('portal_atleta_logado');if(!s)return;try{const obj=JSON.parse(s);const row=atletasBanco.find(r=>nomeCompleto(r)===obj.nomeCompleto&&nascimento(r)===obj.nascimento);if(row)mostrarFicha(row);}catch(e){}}
window.addEventListener('DOMContentLoaded',async()=>{sessionStorage.removeItem('portal_atleta_logado');resetarOlhoSenhaPortal();iniciarEnterLoginPortal();iniciarInatividadePortal();await carregarAtletas();await tentarLoginLocalSalvo();});


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
    // PSR/PSE: fecha so no X ou ao salvar
  }
  return modal;
}
function portalModalDiarioAberto(){
  const modal=document.getElementById('portal-diario-modal');
  return !!(modal && modal.style.display !== 'none' && getComputedStyle(modal).display !== 'none');
}
function registrarHistoricoModalDiarioPortal(){
  if(!window.history || !history.pushState)return;
  if(window.__portalDiarioHistoryPushed)return;
  try{
    history.pushState({portalModalDiario:true},'',location.href);
    window.__portalDiarioHistoryPushed=true;
  }catch(e){console.warn('Histórico do modal indisponível:',e);}
}
function fecharModalDiario(){
  const modal=document.getElementById('portal-diario-modal');
  if(modal)modal.style.display='none';
}
if(!window.__portalBackModalReady){
  window.__portalBackModalReady=true;
  window.addEventListener('popstate',()=>{
    if(portalModalDiarioAberto()){
      fecharModalDiario();
      window.__portalDiarioHistoryPushed=false;
    }
  });
}

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
function psrEscalaMelhorNoAlto(nome){
  return ['psr_sono','psr_motivacao'].includes(nome);
}
function psrRotulosEscala(nome){
  const positivos = ['Muito ruim','Ruim','Regular','Médio','Bom','Muito bom'];
  const carga = ['Nenhuma','Muito pouco','Pouco','Médio','Alto','Muito alto'];
  if(psrEscalaMelhorNoAlto(nome)) return positivos;
  return carga;
}
function psrCarinhaSVG(nota, melhorNoAlto){
  const cores = ['#dc2626','#f97316','#f59e0b','#eab308','#65a30d','#16a34a'];
  const nivel = melhorNoAlto ? nota : (5 - nota);
  const cor = cores[nivel];
  const olhos = nivel <= 1 ? 'x' : 'o';
  const boca = nivel <= 1 ? 'sad' : (nivel === 2 ? 'meh' : (nivel === 3 ? 'ok' : 'smile'));
  let bocaPath = 'M10 21 Q16 26 22 21';
  if(boca === 'ok') bocaPath = 'M10 21 Q16 24 22 21';
  if(boca === 'meh') bocaPath = 'M10 22 H22';
  if(boca === 'sad') bocaPath = 'M10 24 Q16 19 22 24';
  const olhoEsq = olhos === 'x'
    ? '<path d="M9 11 L13 15 M13 11 L9 15" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'
    : '<circle cx="11" cy="13" r="1.7" fill="#fff"/>';
  const olhoDir = olhos === 'x'
    ? '<path d="M19 11 L23 15 M23 11 L19 15" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'
    : '<circle cx="21" cy="13" r="1.7" fill="#fff"/>';
  return `<svg class="psr-face" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="${cor}"></circle>${olhoEsq}${olhoDir}<path d="${bocaPath}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
}
function togglePsrAjuda(ev){
  ev.preventDefault();
  ev.stopPropagation();
  const wrap = ev.currentTarget.closest('.psr-ajuda');
  if(!wrap) return;
  const aberto = wrap.classList.contains('aberta');
  document.querySelectorAll('.psr-ajuda.aberta').forEach(el => el.classList.remove('aberta'));
  if(!aberto) wrap.classList.add('aberta');
}
if(!window.__psrAjudaFora){
  window.__psrAjudaFora = true;
  document.addEventListener('click', function(e){
    if(e.target.closest && e.target.closest('.psr-ajuda')) return;
    document.querySelectorAll('.psr-ajuda.aberta').forEach(el => el.classList.remove('aberta'));
  });
}
function psrEscalaHTML(nome,label,valorAtual){
  const rotulos = psrRotulosEscala(nome);
  const melhorNoAlto = psrEscalaMelhorNoAlto(nome);
  const polaridade = melhorNoAlto ? 'melhor' : 'pior';
  const ajuda = nome === 'psr_fadiga'
    ? `<span class="psr-ajuda"><button type="button" class="psr-ajuda-btn" onclick="togglePsrAjuda(event)" aria-label="O que é fadiga?">?</button><span class="psr-ajuda-texto"><b>Sensação de desgaste:</b> Representa o nível de cansaço físico e mental acumulado que o corpo ainda carrega de esforços anteriores.</span></span>`
    : '';
  return `<div class="psr-scale-row"><div class="psr-scale-title">${label}${ajuda}</div><div class="psr-scale-options psr-pol-${polaridade}">${[0,1,2,3,4,5].map(v=>`<label><input type="radio" name="${nome}" value="${v}" ${String(valorAtual)===String(v)?'checked':''}><span class="psr-opt psr-n${v}">${psrCarinhaSVG(v,melhorNoAlto)}<strong>${v}</strong><small>${rotulos[v]}</small></span></label>`).join('')}</div></div>`;
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
  modal.innerHTML=`<div class="portal-diario-card portal-psr-card"><button class="portal-diario-close" onclick="fecharModalDiario()">×</button><h2>PSR</h2><p class="portal-diario-sub">Percepção Subjetiva de Recuperação - ${dataHojePortalBR()}</p><div class="psr-scale-list">${psrEscalaHTML('psr_sono','Qualidade do sono',psr.sono)}${psrEscalaHTML('psr_fadiga','Fadiga',psr.fadiga)}${psrEscalaHTML('psr_dor','Dor muscular',psr.dor_muscular)}<label class="psr-dor-desc">Caso tenha dor, descreva<textarea id="psr-dor-desc" placeholder="Ex: panturrilha, posterior, joelho...">${escapeHTML(psr.dor_descricao||'')}</textarea></label>${psrEscalaHTML('psr_estresse','Estresse mental',psr.estresse_mental)}${psrEscalaHTML('psr_motivacao','Motivação para o treino',psr.motivacao)}</div><button class="portal-diario-save" onclick="salvarPSRPortal()">Salvar PSR</button><div id="portal-diario-msg" class="portal-diario-msg"></div></div>`;
  modal.style.display='flex';
  registrarHistoricoModalDiarioPortal();
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
    atualizarBotoesQuestionariosPortal();
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
  registrarHistoricoModalDiarioPortal();
  if(pse.valor!==undefined&&pse.valor!==null){const r=modal.querySelector(`input[name="pse-valor"][value="${pse.valor}"]`);if(r)r.checked=true;}
}
async function salvarPSEPortal(){
  const sel=document.querySelector('input[name="pse-valor"]:checked');
  if(!sel){document.getElementById('portal-diario-msg').textContent='Selecione uma opção.';return;}
  const textos=['Repouso absoluto','Muito leve','Leve','Moderado','Um pouco pesado','Pesado','Muito pesado','Esforço máximo'];
  const valor={valor:Number(sel.value),descricao:textos[Number(sel.value)]||'',preenchido_em:new Date().toISOString()};
  if(await salvarRespostaDiariaPortal('pse',valor)){
    document.getElementById('portal-diario-msg').textContent='PSE salvo com sucesso.';
    atualizarBotoesQuestionariosPortal();
    setTimeout(fecharModalDiario,650);
  }
}
