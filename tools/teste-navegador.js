#!/usr/bin/env node
// Teste no navegador (Playwright): layout a 390 px nos dois temas, data da prova, peso por disciplina,
// estrela, backup e chaves de armazenamento. Uso: node tools/teste-navegador.js
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const URL = 'file://' + path.join(__dirname, '..', 'index.html');
let falhas = 0;
const ok = (c, msg, extra = '') => { console.log((c ? 'OK    ' : 'FALHA ') + msg + (extra ? ' ' + extra : '')); if (!c) falhas++; };

// Onde os CDNs (Tailwind e Font Awesome) não são acessíveis, CDN_LOCAL aponta uma pasta com tailwind.css
// (gerado com o CLI do Tailwind 3 sobre o index.html) e node_modules/@fortawesome/fontawesome-free 6.4.0.
async function servirCDNLocal(ctx) {
  const dir = process.env.CDN_LOCAL; if (!dir) return;
  const fa = path.join(dir, 'node_modules', '@fortawesome', 'fontawesome-free');
  await ctx.route('https://cdn.tailwindcss.com/**', r => r.fulfill({ contentType: 'application/javascript', body: `(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(fs.readFileSync(path.join(dir, 'tailwind.css'), 'utf8'))};document.head.appendChild(s);})();` }));
  await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', r => r.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(fa, 'css', 'all.min.css')) }));
  await ctx.route('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/*', r => { const f = path.join(fa, 'webfonts', r.request().url().split('/').pop()); fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f), contentType: 'font/woff2' }) : r.abort(); });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await servirCDNLocal(ctx);
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', e => erros.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|ERR_/.test(m.text())) erros.push(m.text()); });
  await page.goto(URL); await page.waitForTimeout(800);
  ok(await page.evaluate(() => getComputedStyle(document.body).display === 'flex' && !!document.querySelector('i.fa-solid') && getComputedStyle(document.querySelector('i.fa-solid'), '::before').content !== 'none'), 'Tailwind e Font Awesome carregaram (CDN acessível), então a medida de layout vale');

  // estado inicial vazio
  const ini = await page.evaluate(() => ({
    discs: meusDados.map(d => d.nome),
    pesoOuEstrela: meusDados.flatMap(d => listarTodosNosDisciplina(d)).filter(n => n.peso || n.estrela).length,
    registros: registrosEstudo.length, revisoes: minhasRevisoes.length, erros: cadernoErros.length, dataProva: preferencias.dataProva,
    questoes: Object.keys(planoAtual().questoes).length, titulo: document.title,
    cab: document.querySelector('.lat-foto').innerText.replace(/\s+/g, ' '), ola: document.querySelector('.hr-ola').innerText,
    contagem: document.querySelector('.hr-cont').innerText.replace(/\s+/g, ' ')
  }));
  ok(ini.discs.length === 10, 'app carrega 10 disciplinas', ini.discs.join(' | '));
  ok(ini.pesoOuEstrela === 0, 'nenhum peso nem estrela preenchido nos tópicos');
  ok(ini.registros + ini.revisoes + ini.erros === 0, 'dados começam vazios');
  ok(ini.questoes === 0, 'Montar ciclo sem pesos nem questões pré-preenchidos');
  ok(ini.cab.includes('Central de Estudos') && ini.cab.includes('Agente de Polícia · PCPE (Cebraspe)'), 'cabeçalho', ini.cab);
  ok(ini.ola === 'Olá, Izabela.', 'saudação', ini.ola);
  ok(/data a definir/.test(ini.contagem) && !/\d+\s*dias/i.test(ini.contagem) && !/faltam/i.test(ini.contagem), 'sem data: "data a definir" e sem contagem', ini.contagem);

  // chaves de armazenamento no uso normal
  await page.evaluate(() => { registrarEstudo({ id: 1, data: hojeISO(), discId: 'penal', topicoId: 't_0', minutos: 30, segundos: 1800, tipo: 'Teoria' }); salvarTudo(); });

  for (const tema of ['dark', 'light']) {
    await page.evaluate(t => { document.body.classList.toggle('light-mode', t === 'light'); }, tema);
    const telas = ['dashboard', 'edital', 'cronograma', 'revisoes', 'erros', 'historico'];
    for (const t of telas) {
      await page.evaluate(x => navigate(x), t); await page.waitForTimeout(250);
      const r = await page.evaluate(() => { const m = document.getElementById('main-content'); return { sw: m.scrollWidth, cw: m.clientWidth, dw: document.documentElement.scrollWidth, iw: innerWidth, bw: document.body.scrollWidth }; });
      ok(r.sw <= r.cw && r.dw <= r.iw && r.bw <= r.iw, `390px ${tema} · ${t}: sem rolagem lateral`, JSON.stringify(r));
    }
    // Montar ciclo sem data
    await page.evaluate(() => { navigate('cronograma'); abrirMontarCiclo(); }); await page.waitForTimeout(250);
    let txt = await page.evaluate(() => document.getElementById('cron-montar').innerText);
    ok(/Defina a data da prova/.test(txt), `Montar ciclo sem data pede a data (${tema})`);
    let r = await page.evaluate(() => { const m = document.getElementById('main-content'); return [m.scrollWidth, m.clientWidth]; });
    ok(r[0] <= r[1], `390px ${tema} · Montar ciclo sem data: sem rolagem lateral`, JSON.stringify(r));
  }

  // data da prova pelo Painel
  await page.evaluate(() => { fecharMontarCiclo(); navigate('dashboard'); });
  const futuro = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + 100); return isoLocal(d); });
  await page.fill('#hr-data-prova', futuro); await page.waitForTimeout(300);
  const c1 = await page.evaluate(() => document.querySelector('.hr-cont').innerText.replace(/\s+/g, ' '));
  ok(/faltam 100 dias para a prova/i.test(c1), 'com data: contagem aparece', c1);
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('central_estudos_izabela_v1')).preferencias.dataProva) === futuro, 'data gravada em preferencias (vai no backup)');

  // Montar ciclo com data: peso por disciplina
  for (const tema of ['dark', 'light']) {
    await page.evaluate(t => { document.body.classList.toggle('light-mode', t === 'light'); navigate('cronograma'); abrirMontarCiclo(); }, tema); await page.waitForTimeout(300);
    const info = await page.evaluate(() => ({ botoes: document.querySelectorAll('#cron-montar .mc-seg').length, pressed: document.querySelectorAll('#cron-montar .mc-seg [aria-pressed="true"]').length, aviso: /Nenhum peso foi escolhido/.test(document.getElementById('cron-montar').innerText) }));
    ok(info.botoes === 10 && info.pressed === 0 && info.aviso, `Montar ciclo (${tema}): 10 disciplinas, nenhum peso selecionado`, JSON.stringify(info));
    const r = await page.evaluate(() => { const m = document.getElementById('main-content'); return [m.scrollWidth, m.clientWidth]; });
    ok(r[0] <= r[1], `390px ${tema} · Montar ciclo com data: sem rolagem lateral`, JSON.stringify(r));
  }
  await page.click('#cron-montar [data-mc="peso"][data-k="penal"][data-d="1"]'); await page.waitForTimeout(200);
  let st = await page.evaluate(() => JSON.stringify(planoAtual().questoes.penal));
  ok(st === '{"q":null,"p":"alto"}', 'peso alto marcado em Direito Penal', st);
  await page.click('#cron-montar [data-mc="peso"][data-k="penal"][data-d="1"]'); await page.waitForTimeout(200);
  st = await page.evaluate(() => JSON.stringify(planoAtual().questoes.penal));
  ok(st === '{"q":null,"p":""}', 'tocar de novo desmarca o peso', st);
  await page.evaluate(() => fecharMontarCiclo());

  // estrela: nome, liga e desliga
  await page.evaluate(() => { navigate('edital'); alternarEstrela('penal', 't_0'); });
  const est = await page.evaluate(() => ({ marcado: encontrarNoPorId(meusDados.find(d => d.id === 'penal').topicos, 't_0').estrela, titulos: [...document.querySelectorAll('.edt-estrela')].map(e => e.title), html: document.getElementById('view-edital').innerText }));
  ok(est.marcado && est.titulos.some(t => /^Estrela/.test(t)) && !new RegExp(['AO', 'CP'].join(''), 'i').test(est.html), 'estrela liga e aparece como "Estrela"', est.titulos.slice(0, 2).join(' / '));
  await page.evaluate(() => alternarEstrela('penal', 't_0'));
  ok(!(await page.evaluate(() => encontrarNoPorId(meusDados.find(d => d.id === 'penal').topicos, 't_0').estrela)), 'estrela desliga');
  ok(await page.evaluate(() => /Estrela/.test(document.getElementById('edital-diag-resumo').innerText)), 'filtro do Edital chama-se Estrela');

  // timer e modais a 390 px
  await page.evaluate(() => { navigate('dashboard'); toggleFloatingTimer(true); }); await page.waitForTimeout(300);
  let r = await page.evaluate(() => ({ dw: document.documentElement.scrollWidth, iw: innerWidth, p: document.getElementById('timer-panel').getBoundingClientRect().right }));
  ok(r.dw <= r.iw && r.p <= r.iw, 'cronômetro aberto cabe em 390px', JSON.stringify(r));
  await page.evaluate(() => toggleFloatingTimer(false));

  // backup
  await page.evaluate(() => abrirModalBackup());
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#modal-backup button[onclick="exportarBackup()"]')]);
  const arq = path.join(os.tmpdir(), 'backup-teste-pcpe.json'); await dl.saveAs(arq);
  const bk = JSON.parse(fs.readFileSync(arq, 'utf8')), bruto = fs.readFileSync(arq, 'utf8');
  ok(/^backup_central_estudos_\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), 'backup baixado', dl.suggestedFilename());
  ok(bk.app === 'Central_Estudos_Izabela_PCPE' && bk.dados.length === 10 && bk.registrosEstudo.length === 1 && bk.preferencias.dataProva === futuro, 'backup traz app, 10 disciplinas, registro e data da prova', `app=${bk.app}`);
  ok(!new RegExp(['jess', 'ica|jé', 'ssica|ama', 'nda|ao', 'cp|pm', 'pe|cb', 'mpe|sol', 'dado'].join(''), 'i').test(bruto), 'backup sem textos antigos');
  await page.evaluate(() => fecharModalBackup());

  // chaves
  const chaves = await page.evaluate(() => Object.keys(localStorage).sort());
  console.log('      localStorage:', chaves.join(', '));
  ok(chaves.every(k => ['central_estudos_izabela_v1', 'central_cronometro_izabela_v1', 'central_ui_prefs_izabela_v1', 'central_tema', 'central_bilhete', 'central_cronometro_abas'].includes(k)) && chaves.includes('central_estudos_izabela_v1'), 'só chaves novas no localStorage');

  // restaurar o backup num contexto limpo mantém tudo
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await servirCDNLocal(ctx2);
  const p2 = await ctx2.newPage(); await p2.goto(URL); await p2.waitForTimeout(500);
  p2.on('dialog', d => d.accept());
  await p2.setInputFiles('#modal-backup input[type=file]', arq); await p2.waitForTimeout(1500);
  const rest = await p2.evaluate(() => ({ n: registrosEstudo.length, d: preferencias.dataProva, discs: meusDados.length }));
  ok(rest.n === 1 && rest.d === futuro && rest.discs === 10, 'restaurar o backup devolve os dados', JSON.stringify(rest));

  ok(erros.length === 0, 'sem erros de JavaScript', erros.slice(0, 3).join(' | '));
  await browser.close();
  console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo no teste de navegador'); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
