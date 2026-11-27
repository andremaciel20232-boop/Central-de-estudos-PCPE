#!/usr/bin/env node
// Conferências estáticas do index.html e do edital. Uso: node tools/verificar.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const raiz = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const txt = fs.readFileSync(path.join(raiz, 'edital', 'conteudo-pcpe.txt'), 'utf8');
let falhas = 0;
const ok = (c, msg) => { console.log((c ? 'OK    ' : 'FALHA ') + msg); if (!c) falhas++; };

// 1. Disciplinas e tópicos batem com a lista pedida e com o .txt
const m = html.match(/const EDITAL_DADOS = (\[[\s\S]*?\n  \]);\n  \/\/ <<< EDITAL_DADOS/);
const EDITAL = vm.runInNewContext(m[1]);
const esperadas = ['Legislação Estadual', 'Direito Constitucional', 'Direito Administrativo', 'Direito Penal', 'Direito Processual Penal',
  'Língua Portuguesa', 'Informática', 'Raciocínio Lógico', 'Contabilidade Geral', 'Estatística'];
ok(JSON.stringify(EDITAL.map(d => d.nome)) === JSON.stringify(esperadas), 'disciplinas = lista da seção 3 (' + EDITAL.map(d => d.nome).join(' | ') + ')');
ok(!EDITAL.some(d => /atualidades/i.test(d.nome)), 'não existe a disciplina Atualidades');
const topicosTxt = txt.split(/\r?\n/).map(l => l.trim()).filter(l => /^\d/.test(l));
const topicosApp = EDITAL.flatMap(d => d.linhas.map(l => l.replace(/^\d /, '')));
ok(topicosTxt.length === topicosApp.length && topicosTxt.every(t => topicosApp.includes(t)), `tópicos do app = tópicos do .txt (${topicosApp.length})`);
ok(EDITAL.every(d => d.linhas.length > 0), 'nenhuma disciplina vazia');
ok(!/\[guia/.test(html + txt), 'sem sufixo [guia: ...]');

// 2. Pesos e estrelas nunca vêm preenchidos nos dados-base
ok(/diagnostico: '', estrela: '', peso: ''/.test(html), 'tópicos nascem com peso e estrela vazios');
ok(!/EDITAL_DADOS[\s\S]{0,200000}"(peso|estrela)"/.test(m[1]), 'edital embutido não traz peso nem estrela');

// 3. Textos proibidos
const alvo = html + '\n' + txt;
// Padrões montados em pedaços para que este arquivo não contenha as próprias palavras proibidas.
const J = (...p) => p.join(''), R = (src, f = '') => new RegExp(src, f);
const proibidos = [R(J('Sol', 'dado')), R(J('J', 'éssica|Jess', 'ica'), 'i'), R(J('Ama', 'nda'), 'i'), R(J('AO', 'CP'), 'i'), R(J('PM', 'PE'), 'i'), R(J('CB', 'MPE'), 'i'),
  R(J('\\bOfi', 'cial\\b')), R(J('pm', 'pe-fundo|pm', 'pe-banner|lo', 'go\\.png')), R(J('21/', '02|20', '27-02-21')), R(J('place', 'hold\\.co'))];
proibidos.forEach(r => ok(!r.test(alvo), 'não contém ' + r));

// 4. Sem alerta de eliminação de 30%
ok(!/elimin/i.test(html) && !/\b30 ?%/.test(html), 'sem alerta de eliminação de 30%');

// 5. Chaves de armazenamento
['central_estudos_izabela_v1', 'central_cronometro_izabela_v1', 'central_ui_prefs_izabela_v1', 'central_estudos_izabela_imgs', 'central_tema'].forEach(k => ok(html.includes(k), 'usa a chave ' + k));
[J('central_estudos_', 'jess', 'ica_v1'), J('central_cronometro_', 'jess', 'ica_v1'), J('central_ui_prefs_', 'jess', 'ica_v1'), J('central_estudos_', 'jess', 'ica_imgs'), J('estudei_', 'cb', 'mpe_', 'ama', 'nda_v9')].forEach(k => ok(!html.includes(k), 'não aparece a chave antiga ' + k));
const lidas = [...html.matchAll(/(?:localStorage\.(?:getItem|setItem|removeItem)|indexedDB\.open)\(\s*'([^']+)'/g)].map(x => x[1]);
console.log('      chaves usadas literalmente:', [...new Set(lidas)].join(', '));

// 5b. Fotos de Minha Força & Inspiração presentes e leves
[1, 2, 3, 4].forEach(n => { const f = path.join(raiz, `foto${n}.jpg`); const t = fs.existsSync(f) ? fs.statSync(f).size : 0; ok(t > 0 && t < 400 * 1024, `foto${n}.jpg existe e é leve (${Math.round(t / 1024)} KB)`); });

['img/painel.jpg', 'img/lateral.jpg', 'img/perfil.png'].forEach(f => { const a = path.join(raiz, f); const t = fs.existsSync(a) ? fs.statSync(a).size : 0; ok(t > 0 && t < 300 * 1024 && html.includes(f), `${f} existe, é leve (${Math.round(t / 1024)} KB) e é usada no index.html`); });

// 6. Marcador das fases pendentes
ok(/FASES CONFIRMADAS \(Edital nº 1\/2026 PCPE/.test(html) && !/A CONFIRMAR/.test(html), 'fases do edital confirmadas (sem marcador pendente)');
ok(/parsed\.app !== APP_BACKUP/.test(html), 'restauração bloqueia backup de outra versão');

// 7. Edital gerado em dia
const { status } = require('child_process').spawnSync('node', [path.join(__dirname, 'gerar-edital.js'), '--check'], { stdio: 'inherit' });
ok(status === 0, 'index.html em dia com edital/conteudo-pcpe.txt');
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo nas conferências estáticas');
process.exit(falhas ? 1 : 0);
