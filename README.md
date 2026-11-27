# Central de Estudos · Agente de Polícia · PCPE (Cebraspe)

Página única (`index.html`), sem servidor. Os dados ficam no navegador (`localStorage`) e podem ser exportados em **Backup & Segurança**.

## Estrutura
- `index.html`: o app inteiro.
- `edital/conteudo-pcpe.txt`: fonte dos tópicos (disciplinas em MAIÚSCULAS; tópicos como `1.1 Texto`). O nível vem da numeração.
- `tools/gerar-edital.js`: copia o `.txt` para o bloco `EDITAL_DADOS` do `index.html`. Depois de editar o `.txt`: `node tools/gerar-edital.js`.
- `tools/verificar.js`: conferências estáticas (disciplinas, textos proibidos, chaves de armazenamento, edital em dia).
- `tools/teste-navegador.js`: teste no navegador (Playwright): layout em 390 px nos dois temas, data da prova, peso, estrela e backup. Onde os CDNs estiverem bloqueados, use `CDN_LOCAL` (veja o comentário no arquivo).

## Chaves de armazenamento
`central_estudos_izabela_v1`, `central_cronometro_izabela_v1`, `central_ui_prefs_izabela_v1`, IndexedDB `central_estudos_izabela_imgs`, além de `central_tema` e `central_bilhete`. A versão começa vazia: nenhuma chave de outra versão é lida.

## Data da prova
Vazia por padrão. A Izabela define no Painel (campo "Data da prova"). Sem data, não há contagem de dias e o Montar ciclo pede a data.

## Fotos
- Topo do Painel: `img/painel.jpg`. Faixa lateral: `img/lateral.jpg`. Para trocar, substitua o arquivo mantendo o nome (otimizar antes: JPEG ou WebP, até 1600 px, de preferência abaixo de 200 KB). O véu escuro já está nos dois lugares; `tools/teste-navegador.js` mede o contraste do texto sobre a foto.
- Foto de perfil: `img/perfil.png` (brasão da Polícia Civil de Pernambuco, fundo transparente); se faltar, aparece uma silhueta.
- Minha Força & Inspiração: `foto1.jpg` a `foto4.jpg` na raiz (JPEG até 1200 px, sem metadados). Sem os arquivos a seção mostra um aviso.

## Fases do concurso (confirmadas no Edital nº 1/2026, retificado até o Edital nº 3)
Agente de Polícia: provas objetivas (20 questões de Noções de Direito e 40 de Conhecimentos Específicos), prova discursiva (redação, com Atualidades, que só cai nela), exames médicos, prova de capacidade física, investigação social e avaliação psicológica (todas eliminatórias); depois, curso de formação (ACADEPOL). A prova oral é só do cargo de Delegado. O app não tem funções para essas fases.

## Backup
A restauração só aceita arquivos exportados por esta versão (campo `app` = `Central_Estudos_Izabela_PCPE`); qualquer outro é recusado sem alterar nada.
