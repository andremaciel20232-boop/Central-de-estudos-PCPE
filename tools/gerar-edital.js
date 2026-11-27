#!/usr/bin/env node
// Gera o bloco EDITAL_DADOS do index.html a partir de edital/conteudo-pcpe.txt.
// Uso: node tools/gerar-edital.js          (grava no index.html)
//      node tools/gerar-edital.js --check  (só confere se o index.html está em dia com o .txt)
// Formato do .txt: linha em MAIÚSCULAS = disciplina; "<numeração> <texto>" = tópico.
// O nível do tópico vem da numeração (1 = nível 1, 1.1 = nível 2, 2.1.1 = nível 3).
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const TXT = path.join(raiz, 'edital', 'conteudo-pcpe.txt'), HTML = path.join(raiz, 'index.html');

// Ordem de exibição = ordem da lista de disciplinas pedida (Noções de Direito, depois Conhecimentos específicos).
const DISCIPLINAS = [
  { cab: 'NOÇÕES DE DIREITO – LEGISLAÇÃO ESTADUAL', id: 'legislacao_estadual', nome: 'Legislação Estadual' },
  { cab: 'NOÇÕES DE DIREITO CONSTITUCIONAL',        id: 'constitucional',      nome: 'Direito Constitucional' },
  { cab: 'NOÇÕES DE DIREITO ADMINISTRATIVO',        id: 'administrativo',      nome: 'Direito Administrativo' },
  { cab: 'NOÇÕES DE DIREITO PENAL',                 id: 'penal',               nome: 'Direito Penal' },
  { cab: 'NOÇÕES DE DIREITO PROCESSUAL PENAL',      id: 'processual_penal',    nome: 'Direito Processual Penal' },
  { cab: 'LÍNGUA PORTUGUESA',                       id: 'portugues',           nome: 'Língua Portuguesa' },
  { cab: 'INFORMÁTICA',                             id: 'informatica',         nome: 'Informática' },
  { cab: 'RACIOCÍNIO LÓGICO',                       id: 'raciocinio',          nome: 'Raciocínio Lógico' },
  { cab: 'CONTABILIDADE GERAL',                     id: 'contabilidade',       nome: 'Contabilidade Geral' },
  { cab: 'ESTATÍSTICA',                             id: 'estatistica',         nome: 'Estatística' }
];

function lerTxt() {
  const mapa = new Map(DISCIPLINAS.map(d => [d.cab, { ...d, linhas: [] }]));
  let atual = null;
  fs.readFileSync(TXT, 'utf8').split(/\r?\n/).forEach((bruta, i) => {
    const l = bruta.trim();
    if (!l) return;
    if (mapa.has(l)) { atual = mapa.get(l); return; }
    const m = l.match(/^(\d+(?:\.\d+)*)\s+\S/);
    if (!m) throw new Error(`Linha ${i + 1} do .txt não é cabeçalho conhecido nem tópico numerado: "${l}"`);
    if (!atual) throw new Error(`Linha ${i + 1}: tópico antes de qualquer disciplina`);
    atual.linhas.push(`${m[1].split('.').length} ${l}`);
  });
  const vazias = [...mapa.values()].filter(d => !d.linhas.length).map(d => d.cab);
  if (vazias.length) throw new Error('Disciplina sem tópicos no .txt: ' + vazias.join('; '));
  return DISCIPLINAS.map(d => mapa.get(d.cab));
}

function bloco(discs) {
  const corpo = discs.map(d => `    { id: ${JSON.stringify(d.id)}, nome: ${JSON.stringify(d.nome)}, linhas: [\n${d.linhas.map(l => '      ' + JSON.stringify(l)).join(',\n')}\n    ]}`).join(',\n');
  return `  // >>> EDITAL_DADOS (gerado por tools/gerar-edital.js a partir de edital/conteudo-pcpe.txt; não editar à mão)\n  const EDITAL_DADOS = [\n${corpo}\n  ];\n  // <<< EDITAL_DADOS`;
}

const novo = bloco(lerTxt());
const html = fs.readFileSync(HTML, 'utf8');
const re = /  \/\/ >>> EDITAL_DADOS[\s\S]*?\/\/ <<< EDITAL_DADOS/;
if (!re.test(html)) throw new Error('Marcadores EDITAL_DADOS não encontrados no index.html');
const saida = html.replace(re, () => novo);
if (process.argv.includes('--check')) {
  if (saida !== html) { console.error('index.html está desatualizado em relação a edital/conteudo-pcpe.txt. Rode: node tools/gerar-edital.js'); process.exit(1); }
  console.log('OK: index.html em dia com edital/conteudo-pcpe.txt'); process.exit(0);
}
fs.writeFileSync(HTML, saida);
console.log('EDITAL_DADOS gerado: ' + lerTxt().map(d => `${d.nome} (${d.linhas.length})`).join(', '));
