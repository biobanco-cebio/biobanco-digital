let REGISTROS=[],CULTURAS=[],INDICES=[],filtered=[],page=1;const PAGE_SIZE=16,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],unique=a=>[...new Set(a.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true}));
async function loadData(){[REGISTROS,CULTURAS,INDICES]=await Promise.all([fetch('dados/registros.json').then(r=>r.json()),fetch('dados/culturas.json').then(r=>r.json()),fetch('dados/indices.json').then(r=>r.json())]);init()}
function init(){$('#kpiTotal').textContent=REGISTROS.length;$('#aboutTotal').textContent=`${REGISTROS.length} registros em ${CULTURAS.length} culturas`;$('#kpiCategorias').textContent=unique(REGISTROS.map(r=>r.categoria_funcional)).length;fill('#fCultura',unique(REGISTROS.map(r=>r.cultura)));fill('#fOrdem',unique(REGISTROS.map(r=>r.ordem)));fill('#fFamilia',unique(REGISTROS.map(r=>r.familia)));fill('#fCategoria',unique(REGISTROS.map(r=>r.categoria_funcional)));fill('#fResolucao',unique(REGISTROS.map(r=>r.resolucao_taxonomica)));fill('#statsCrop',CULTURAS.map(c=>c.cultura),false);renderCrops();applyFilters();renderStats(CULTURAS[0]?.cultura);['#fCodigo','#fCultura','#fOrdem','#fFamilia','#fCategoria','#fResolucao'].forEach(id=>$(id).addEventListener(id==='#fCodigo'?'input':'change',()=>{page=1;applyFilters()}));$('#clearFilters').onclick=()=>{['#fCodigo','#fCultura','#fOrdem','#fFamilia','#fCategoria','#fResolucao'].forEach(id=>$(id).value='');page=1;applyFilters()};$('#statsCrop').onchange=e=>renderStats(e.target.value);$('#menuBtn').onclick=()=>$('#nav').classList.toggle('open');$$('#nav a').forEach(a=>a.onclick=()=>$('#nav').classList.remove('open'));$('#closeDialog').onclick=()=>$('#recordDialog').close();$('#recordDialog').onclick=e=>{if(e.target===$('#recordDialog'))$('#recordDialog').close()}}
function fill(sel,vals,keep=true){const e=$(sel);if(!keep)e.innerHTML='';vals.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;e.appendChild(o)})}
function applyFilters(){const c=$('#fCodigo').value.trim().toLowerCase(),cu=$('#fCultura').value,o=$('#fOrdem').value,f=$('#fFamilia').value,cat=$('#fCategoria').value,res=$('#fResolucao').value;filtered=REGISTROS.filter(r=>(!c||r.codigo.toLowerCase().includes(c))&&(!cu||r.cultura===cu)&&(!o||r.ordem===o)&&(!f||r.familia===f)&&(!cat||r.categoria_funcional===cat)&&(!res||r.resolucao_taxonomica===res));$('#resultCount').textContent=filtered.length;renderRecords()}
function candidate(img,r){const ext=['.jpg','.jpeg','.png','.webp'];let i=0;img.src=r.imagem_base+ext[i];img.onerror=()=>{i++;if(i<ext.length)img.src=r.imagem_base+ext[i];else img.parentElement.innerHTML=`<div class="image-fallback">${esc(r.codigo)}<br><small>adicione a imagem</small></div>`}}
function taxon(r){const g=(r.genero_taxon_validado||'').trim();return g&&!/^indeterminado$/i.test(g)?g:(r.taxonomia_validada||r.familia||r.ordem||'Táxon não determinado')}
function formatTaxonHTML(text,resolucao=''){
  const raw=String(text||'').trim();
  if(!raw)return '';

  const formatParte=parte=>{
    const p=parte.trim();

    // Gênero + sp.
    let m=p.match(/^([A-Z][a-zA-Z-]+)\s+(sp\.)$/);
    if(m)return `<em>${esc(m[1])}</em> ${esc(m[2])}`;

    // Espécie, com autoria opcional
    m=p.match(/^([A-Z][a-zA-Z-]+)\s+([a-z][a-zA-Z-]+)(.*)$/);
    if(m)return `<em>${esc(m[1])} ${esc(m[2])}</em>${esc(m[3])}`;

    // Ordem, família, subfamília etc.
    return esc(p);
  };

  return raw.split(';').map(formatParte).join('; ');
}
function renderRecords(){
  const total=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));

  if(page>total) page=total;

  const s=filtered.slice(
    (page-1)*PAGE_SIZE,
    page*PAGE_SIZE
  );

  $('#recordsGrid').innerHTML=s.map(r=>{

    const temGenero=
      r.genero_taxon_validado &&
      !/^indeterminado$/i.test(r.genero_taxon_validado);

    const taxonPrincipal=
      temGenero
        ? r.genero_taxon_validado
        : r.ordem;

    const taxonSecundario=
      temGenero
        ? (r.familia || '')
        : (
            r.familia &&
            r.familia !== 'Indeterminado'
              ? r.familia
              : ''
          );

    return `
      <article class="record-card">

        <div class="record-image-wrap">
          <img
            class="record-image"
            alt="Registro ${esc(r.codigo)}"
            data-img="${esc(r.codigo)}"
          >
        </div>

        <div class="record-body">

          <div class="record-code">
            ${esc(r.codigo)}
          </div>

          <div class="taxon">
            ${formatTaxonHTML(
              taxonPrincipal,
              r.resolucao_taxonomica
            )}
          </div>

          <div class="meta">
            ${taxonSecundario ? esc(taxonSecundario) + '<br>' : ''}
            ${esc(r.cultura)}
          </div>

          <span class="pill">
            ${esc(r.categoria_funcional || 'Indeterminado')}
          </span>

          <button
            class="btn primary"
            data-open="${esc(r.codigo)}"
          >
            Ver registro
          </button>

        </div>
      </article>
    `;
  }).join('') ||
  '<div class="card">Nenhum registro encontrado.</div>';

  $$('[data-img]').forEach(img=>{
    const r=REGISTROS.find(
      x=>x.codigo===img.dataset.img
    );

    if(r) candidate(img,r);
  });

  $$('[data-open]').forEach(btn=>{
    btn.onclick=()=>openRecord(btn.dataset.open);
  });

  pager(total);
}
function pager(t){const p=$('#pagination');p.innerHTML='';if(t<=1)return;const mk=(x,n,a)=>{const b=document.createElement('button');b.textContent=x;if(a)b.classList.add('active');b.onclick=()=>{page=n;renderRecords();location.hash='pesquisar'};return b};if(page>1)p.appendChild(mk('‹',page-1));let st=Math.max(1,page-2),en=Math.min(t,st+4);for(let n=st;n<=en;n++)p.appendChild(mk(n,n,n===page));if(page<t)p.appendChild(mk('›',page+1))}
function openRecord(code){const r=REGISTROS.find(x=>x.codigo===code);if(!r)return;const rows=[['Código',r.codigo],['Cultura',r.cultura],['Ordem',r.ordem],['Família / grupo',r.familia],['Táxon validado',r.taxonomia_validada],['Resolução taxonômica',r.resolucao_taxonomica],['Categoria funcional',r.categoria_funcional],['Nicho ecológico',r.nicho_ecologico],['Fonte taxonômica',r.fonte_taxonomica]];$('#recordDetail').innerHTML=`<div class="detail"><div class="detail-media"><img id="detailImg" alt="Registro ${esc(r.codigo)}"></div><div class="detail-copy"><span class="eyebrow">REGISTRO</span><h2>${esc(r.codigo)}</h2><div class="detail-grid">${rows.map(([a,b])=>`<div class="label">${esc(a)}</div><div>${a==='Táxon validado'?formatTaxonHTML(b,r.resolucao_taxonomica):esc(b||'—')}</div>`).join('')}</div>${r.observacao_funcional?`<div class="detail-note"><strong>Observação funcional</strong><br>${esc(r.observacao_funcional)}</div>`:''}</div></div>`;candidate($('#detailImg'),r);$('#recordDialog').showModal()}
function renderCrops(){$('#cropGrid').innerHTML=CULTURAS.map(c=>`<article class="crop-card"><span class="eyebrow">${esc(c.cultura.toUpperCase())}</span><h3>${esc(c.cultura)}</h3><div class="crop-total">${c.total}</div><small>registros</small><div class="crop-stats">${Object.entries(c.categorias).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`<span>${esc(k)}: ${v}</span>`).join('')}</div><button class="btn primary" data-crop="${esc(c.cultura)}">Explorar registros</button></article>`).join('');$$('[data-crop]').forEach(b=>b.onclick=()=>{$('#fCultura').value=b.dataset.crop;page=1;applyFilters();location.hash='pesquisar'})}
function renderStats(cultura){const c=CULTURAS.find(x=>x.cultura===cultura);if(!c)return;const es=Object.entries(c.categorias).sort((a,b)=>b[1]-a[1]),mx=Math.max(...es.map(x=>x[1]),1);$('#functionalBars').innerHTML=es.map(([k,v])=>`<div class="bar-row"><span>${esc(k)}</span><div class="bar-track"><div class="bar-fill" style="width:${v/mx*100}%"></div></div><strong>${v}</strong></div>`).join('');const idx=findIdx(cultura),pairs=[];if(idx)Object.entries(idx).forEach(([k,v])=>{if(!k.toLowerCase().includes('cultura')&&v!==null&&v!=='')pairs.push([k,v])});$('#indicesTable').innerHTML=(pairs.length?pairs:[['Cultura',cultura]]).map(([k,v])=>`<div>${esc(k)}</div><div class="v">${fmt(v)}</div>`).join('')}
function findIdx(c){const n=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return INDICES.find(r=>Object.values(r).some(v=>n(v)===n(c)))}
function fmt(v){return typeof v==='number'?v.toLocaleString('pt-BR',{maximumFractionDigits:3}):esc(v)}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
loadData().catch(e=>{document.body.innerHTML=`<main class="section"><h1>Erro ao carregar</h1><p>${esc(e.message)}</p><p>Publique pelo GitHub Pages; não abra apenas o arquivo local.</p></main>`});
