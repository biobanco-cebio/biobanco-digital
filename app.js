let REGISTROS=[],CULTURAS=[],INDICES=[],DESCRICOES={},filtered=[],page=1;const PAGE_SIZE=16,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],unique=a=>[...new Set(a.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR',{numeric:true}));
async function loadData(){
  [REGISTROS,CULTURAS,INDICES,DESCRICOES]=await Promise.all([
    fetch('dados/registros.json').then(r=>r.json()),
    fetch('dados/culturas.json').then(r=>r.json()),
    fetch('dados/indices.json').then(r=>r.json()),
    fetch('dados/descricoes-ecologicas.json').then(r=>r.json())
  ]);

  init();
}
function init(){$('#kpiTotal').textContent=REGISTROS.length;$('#aboutTotal').textContent=`${REGISTROS.length} registros em ${CULTURAS.length} culturas`;$('#kpiCategorias').textContent=unique(REGISTROS.map(r=>r.categoria_funcional)).length;fill('#fCultura',unique(REGISTROS.map(r=>r.cultura)));fill('#fOrdem',unique(REGISTROS.map(r=>r.ordem)));fill('#fFamilia',unique(REGISTROS.map(r=>r.familia)));fill('#fCategoria',unique(REGISTROS.map(r=>r.categoria_funcional)));fill('#fResolucao',unique(REGISTROS.map(r=>r.resolucao_taxonomica)));fill('#statsCrop',CULTURAS.map(c=>c.cultura),false);renderCrops();applyFilters();renderStats(CULTURAS[0]?.cultura);renderComparacaoGeral();['#fCodigo','#fCultura','#fOrdem','#fFamilia','#fCategoria','#fResolucao'].forEach(id=>$(id).addEventListener(id==='#fCodigo'?'input':'change',()=>{page=1;applyFilters()}));$('#clearFilters').onclick=()=>{['#fCodigo','#fCultura','#fOrdem','#fFamilia','#fCategoria','#fResolucao'].forEach(id=>$(id).value='');page=1;applyFilters()};$('#statsCrop').onchange=e=>renderStats(e.target.value);$('#menuBtn').onclick=()=>$('#nav').classList.toggle('open');$$('#nav a').forEach(a=>a.onclick=()=>$('#nav').classList.remove('open'));$('#closeDialog').onclick=()=>$('#recordDialog').close();$('#recordDialog').onclick=e=>{if(e.target===$('#recordDialog'))$('#recordDialog').close()}}
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


function formatObservationHTML(text,generoTaxon=''){
  const raw=String(text||'').trim();
  if(!raw)return '';

  let html=esc(raw);

  const taxon=String(generoTaxon||'').trim();

  if(!taxon || /^indeterminado$/i.test(taxon)){
    return html;
  }

  const genero=taxon.split(/\s+/)[0];

  if(!genero){
    return html;
  }

  const generoSeguro=genero.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  // Gênero + sp.
  const regexSp=new RegExp(
    `\\b${generoSeguro}\\s+sp\\.`,
    'g'
  );

  html=html.replace(
    regexSp,
    `<em>${genero}</em> sp.`
  );

  // Gênero + espécie
  const regexEspecie=new RegExp(
    `\\b${generoSeguro}\\s+([a-zA-Z-]+)`,
    'g'
  );

  html=html.replace(
    regexEspecie,
    `<em>${genero} $1</em>`
  );

  return html;
}
function getDescricaoEcologica(r){
  if(!r || !DESCRICOES)return '';

  const taxonomia=String(r.taxonomia_validada||'').trim();
  const generoValidado=String(r.genero_taxon_validado||'').trim();
  const familia=String(r.familia||'').trim();
  const categoria=String(r.categoria_funcional||'').trim();

  // 1. Procura espécie ou gênero específico
  if(DESCRICOES.taxons){

    for(const chave of Object.keys(DESCRICOES.taxons)){
      if(
        taxonomia.toLowerCase().includes(chave.toLowerCase()) ||
        generoValidado.toLowerCase().includes(chave.toLowerCase())
      ){
        return DESCRICOES.taxons[chave];
      }
    }

    // Se houver gênero validado, procura apenas pelo primeiro nome
    if(generoValidado){
      const genero=generoValidado.split(/\s+/)[0];

      if(DESCRICOES.taxons[genero]){
        return DESCRICOES.taxons[genero];
      }
    }
  }

  // 2. Procura descrição da família
  if(
    familia &&
    DESCRICOES.familias &&
    DESCRICOES.familias[familia]
  ){
    return DESCRICOES.familias[familia];
  }

  // 3. Usa categoria funcional como descrição geral
  if(DESCRICOES.categorias){

    if(DESCRICOES.categorias[categoria]){
      return DESCRICOES.categorias[categoria];
    }

    if(/indeterminado/i.test(categoria)){
      return DESCRICOES.categorias.Indeterminado || '';
    }

    if(/outros/i.test(categoria)){
      return DESCRICOES.categorias.Outros || '';
    }
  }

  return '';
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
function openRecord(code){
  const r=REGISTROS.find(x=>x.codigo===code);
  if(!r)return;

  const categoria=r.categoria_funcional || 'Indeterminado';
  const resolucao=r.resolucao_taxonomica || 'Não determinada';

  $('#recordDetail').innerHTML=`
    <div class="detail detail-v2">

      <div class="detail-media detail-media-v2">
        <img
          id="detailImg"
          alt="Registro ${esc(r.codigo)}"
        >
      </div>

      <div class="detail-copy detail-copy-v2">

        <span class="eyebrow">REGISTRO</span>

        <h2 class="detail-code">
          ${esc(r.codigo)}
        </h2>

        <div class="detail-badges">
          <span class="detail-badge categoria">
            ${esc(categoria)}
          </span>

          <span class="detail-badge">
            ${esc(resolucao)}
          </span>

          <span class="detail-badge validado">
            ✓ Validado
          </span>
        </div>


        <section class="detail-section">

          <h3>
            Identificação taxonômica
          </h3>

          <div class="detail-info">

            <div>
              <span>Ordem</span>
              <strong>${esc(r.ordem || '—')}</strong>
            </div>

            <div>
              <span>Família / grupo</span>
              <strong>${esc(r.familia || '—')}</strong>
            </div>

            <div>
              <span>Táxon validado</span>
              <strong>
                ${formatTaxonHTML(
                  r.taxonomia_validada || '',
                  r.resolucao_taxonomica
                )}
              </strong>
            </div>

            <div>
              <span>Nível de identificação</span>
              <strong>${esc(resolucao)}</strong>
            </div>

          </div>

        </section>


        <section class="detail-section">

          <h3>
            Função ecológica
          </h3>

          <div class="detail-info">

            <div>
              <span>Categoria funcional</span>
              <strong>${esc(categoria)}</strong>
            </div>

            <div>
              <span>Nicho ecológico</span>
              <strong>${esc(r.nicho_ecologico || '—')}</strong>
            </div>

          </div>

        </section>


        <section class="detail-section">

          <h3>
            Validação taxonômica
          </h3>

          <div class="detail-info">

            <div>
              <span>Fonte taxonômica</span>
              <strong>${esc(r.fonte_taxonomica || '—')}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong class="status-validado">
                ✓ Validado
              </strong>
            </div>

          </div>

        </section>


      ${
  getDescricaoEcologica(r)
  ? `
    <section class="detail-section observacao">
      <h3>Descrição ecológica</h3>

      <p>
        ${formatObservationHTML(
          getDescricaoEcologica(r),
          r.genero_taxon_validado
        )}
      </p>
    </section>
  `
  : ''
}

      </div>

    </div>
  `;

  candidate($('#detailImg'),r);

  $('#recordDialog').showModal();
}
function renderCrops(){$('#cropGrid').innerHTML=CULTURAS.map(c=>`<article class="crop-card"><span class="eyebrow">${esc(c.cultura.toUpperCase())}</span><h3>${esc(c.cultura)}</h3><div class="crop-total">${c.total}</div><small>registros</small><div class="crop-stats">${Object.entries(c.categorias).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`<span>${esc(k)}: ${v}</span>`).join('')}</div><button class="btn primary" data-crop="${esc(c.cultura)}">Explorar registros</button></article>`).join('');$$('[data-crop]').forEach(b=>b.onclick=()=>{$('#fCultura').value=b.dataset.crop;page=1;applyFilters();location.hash='pesquisar'})}
function renderStats(cultura){const c=CULTURAS.find(x=>x.cultura===cultura);if(!c)return;const es=Object.entries(c.categorias).sort((a,b)=>b[1]-a[1]),mx=Math.max(...es.map(x=>x[1]),1);$('#functionalBars').innerHTML=es.map(([k,v])=>`<div class="bar-row"><span>${esc(k)}</span><div class="bar-track"><div class="bar-fill" style="width:${v/mx*100}%"></div></div><strong>${v}</strong></div>`).join('');const idx=findIdx(cultura),pairs=[];if(idx)Object.entries(idx).forEach(([k,v])=>{if(!k.toLowerCase().includes('cultura')&&v!==null&&v!=='')pairs.push([k,v])});$('#indicesTable').innerHTML=(pairs.length?pairs:[['Cultura',cultura]]).map(([k,v])=>`<div>${esc(k)}</div><div class="v">${fmt(v)}</div>`).join('')}
function renderComparacaoGeral(){

  const culturas=CULTURAS || [];

  /* =========================
     1. NÚMERO DE REGISTROS
  ========================= */

  const maxReg=Math.max(
    ...culturas.map(c=>Number(c.total)||0),
    1
  );

  const elReg=$("#registrosComparacao");

  if(elReg){
    elReg.innerHTML=culturas.map(c=>{

      const total=Number(c.total)||0;

      return `
        <div class="comparison-row">

          <div class="comparison-label">
            ${esc(c.cultura)}
          </div>

          <div class="comparison-track">
            <div
              class="comparison-fill"
              style="width:${(total/maxReg)*100}%"
            ></div>
          </div>

          <strong>${total}</strong>

        </div>
      `;
    }).join('');
  }


  /* =========================
     2. RIQUEZA DE UTOs
  ========================= */

  const riquezaDados=culturas.map(c=>{

    const idx=findIdx(c.cultura);

    if(!idx){
      return {
        cultura:c.cultura,
        riqueza:0
      };
    }

    const chave=Object.keys(idx).find(k=>{
      const n=String(k)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'')
        .toLowerCase();

      return (
        n.includes('riqueza') ||
        n.includes('utos')
      );
    });

    return {
      cultura:c.cultura,
      riqueza:chave ? Number(idx[chave])||0 : 0
    };

  });

  const maxRiqueza=Math.max(
    ...riquezaDados.map(x=>x.riqueza),
    1
  );

  const elRiqueza=$("#riquezaComparacao");

  if(elRiqueza){
    elRiqueza.innerHTML=riquezaDados.map(x=>`

      <div class="comparison-row">

        <div class="comparison-label">
          ${esc(x.cultura)}
        </div>

        <div class="comparison-track">
          <div
            class="comparison-fill"
            style="width:${(x.riqueza/maxRiqueza)*100}%"
          ></div>
        </div>

        <strong>${fmt(x.riqueza)}</strong>

      </div>

    `).join('');
  }


  /* =========================
     3. COMPOSIÇÃO FUNCIONAL %
  ========================= */

  const categorias=[
    'Parasitoide',
    'Predador',
    'Polinizador',
    'Fitófago',
    'Outros',
    'Indeterminado'
  ];

  const elComp=$("#composicaoComparativa");

  if(elComp){

    elComp.innerHTML=culturas.map(c=>{

      const total=Number(c.total)||1;
      const cats=c.categorias || {};

      const segmentos=categorias.map(cat=>{

        let valor=Number(cats[cat])||0;

        /*
          Compatibilidade com possíveis nomes
          ligeiramente diferentes no JSON
        */

        if(cat==='Indeterminado' && !valor){

          const chave=Object.keys(cats).find(k=>
            /indetermin/i.test(k)
          );

          if(chave){
            valor=Number(cats[chave])||0;
          }
        }

        if(cat==='Outros' && !valor){

          const chave=Object.keys(cats).find(k=>
            /outro/i.test(k)
          );

          if(chave){
            valor=Number(cats[chave])||0;
          }
        }

        const pct=(valor/total)*100;

        if(valor===0)return '';

        return `
          <div
            class="functional-segment"
            data-category="${esc(cat)}"
            style="width:${pct}%"
            title="${esc(cat)}: ${valor} (${pct.toFixed(1)}%)"
          >
          </div>
        `;

      }).join('');

      return `
        <div class="functional-comparison-row">

          <div class="functional-crop">
            ${esc(c.cultura)}
          </div>

          <div class="functional-stack">
            ${segmentos}
          </div>

        </div>
      `;

    }).join('');

  }


  /* =========================
     4. DIVERSIDADE
  ========================= */

  const elDiv=$("#diversidadeComparativa");

  if(elDiv){

    const procurarIndice=(idx,termos)=>{

      if(!idx)return '';

      const chave=Object.keys(idx).find(k=>{

        const n=String(k)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g,'')
          .toLowerCase();

        return termos.some(t=>n.includes(t));

      });

      return chave ? idx[chave] : '';
    };


    const linhas=culturas.map(c=>{

      const idx=findIdx(c.cultura);

      const shannon=procurarIndice(
        idx,
        ['shannon']
      );

      const simpson=procurarIndice(
        idx,
        ['simpson_1_d','simpson 1-d','1-d']
      );

      const pielou=procurarIndice(
        idx,
        ['pielou']
      );

      return `
        <tr>
          <td><strong>${esc(c.cultura)}</strong></td>
          <td>${fmt(shannon)}</td>
          <td>${fmt(simpson)}</td>
          <td>${fmt(pielou)}</td>
        </tr>
      `;

    }).join('');


    elDiv.innerHTML=`
      <div class="comparison-table-wrap">

        <table class="comparison-table">

          <thead>
            <tr>
              <th>Cultura</th>
              <th>Shannon (H')</th>
              <th>Simpson (1-D)</th>
              <th>Pielou (J')</th>
            </tr>
          </thead>

          <tbody>
            ${linhas}
          </tbody>

        </table>

      </div>
    `;

  }

}
function findIdx(c){const n=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return INDICES.find(r=>Object.values(r).some(v=>n(v)===n(c)))}
function fmt(v){return typeof v==='number'?v.toLocaleString('pt-BR',{maximumFractionDigits:3}):esc(v)}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
loadData().catch(e=>{document.body.innerHTML=`<main class="section"><h1>Erro ao carregar</h1><p>${esc(e.message)}</p><p>Publique pelo GitHub Pages; não abra apenas o arquivo local.</p></main>`});
