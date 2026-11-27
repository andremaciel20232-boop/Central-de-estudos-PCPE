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

## Fotos (placeholders até as imagens chegarem)
- Lateral: definir `--foto-lateral: url(img/lateral.webp)` em `:root`.
- Topo do Painel: definir `--hr-img: url(img/painel.webp)` em `.hr`.
- Foto de perfil: `perfil.jpg` na raiz; sem ela aparece uma silhueta.
- Minha Força & Inspiração: `foto1.jpg` a `foto4.jpg` na raiz; sem elas a seção mostra um aviso.
- Otimizar antes de subir (WebP ou JPEG, até 1600 px de largura, de preferência abaixo de 200 KB). O véu escuro já está nos dois lugares para o texto passar em AA nos dois temas.

## A confirmar
Fases do edital PCPE (prova discursiva, prova oral do Delegado, exames médicos, capacidade física, avaliação psicológica e investigação social): marcador `A CONFIRMAR` no `index.html`. Nada foi implementado nem removido.
