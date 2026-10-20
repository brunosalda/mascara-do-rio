// Atualiza a versão do site antes de cada publicação: node ferramentas/versao.mjs
// O navegador guarda os módulos ES (o GitHub Pages manda max-age=600, e o navegador do iPhone segura mais).
// Por isso o index.html leva um mapa de importação com a versão em todos os módulos: cada import
// './banco.js' vira './js/banco.js?v=<versão>', e uma publicação nova chega inteira, sem cache velho.
// A mesma versão vai no estilo, no script de entrada e na meta "versao" (que o aviso de versão nova lê).
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(fileURLToPath(import.meta.url), '..', '..');
const agora = new Date();
const doisDigitos = (n) => String(n).padStart(2, '0');
const versao = `${agora.getFullYear()}${doisDigitos(agora.getMonth() + 1)}${doisDigitos(agora.getDate())}${doisDigitos(agora.getHours())}${doisDigitos(agora.getMinutes())}`;

// Os arquivos que o git ignora (os segredos do Carmen) nunca entram no mapa público do site.
const ignorados = new Set(execSync('git ls-files --others --ignored --exclude-standard js', { cwd: raiz }).toString().split(String.fromCharCode(10)).map((l) => l.trim()).filter(Boolean));

function modulos(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return modulos(caminho);
    return nome.endsWith('.js') && !ignorados.has(relative(raiz, caminho).split(sep).join('/')) ? [caminho] : [];
  });
}

const mapa = Object.fromEntries(
  modulos(join(raiz, 'js'))
    .map((c) => `./${relative(raiz, c).split(sep).join('/')}`)
    .sort()
    .map((u) => [u, `${u}?v=${versao}`]),
);
const json = JSON.stringify({ imports: mapa }, null, 2).replace(/\n/g, '\n  ');
const indice = join(raiz, 'index.html');
let html = readFileSync(indice, 'utf8');
const bloco = `<!-- versao:inicio (gerado por ferramentas/versao.mjs; não editar à mão) -->
  <meta name="versao" content="${versao}">
  <script type="importmap">
  ${json}
  </script>
  <!-- versao:fim -->`;
if (/<!-- versao:inicio[\s\S]*?versao:fim -->/.test(html)) html = html.replace(/<!-- versao:inicio[\s\S]*?versao:fim -->/, bloco);
else html = html.replace('</head>', `  ${bloco}\n</head>`);
html = html.replace(/css\/estilo\.css\?v=\d+/, `css/estilo.css?v=${versao}`);
html = html.replace(/<script type="module" src="[^"]*"><\/script>/, `<script type="module" src="./js/app.js?v=${versao}"></script>`);
writeFileSync(indice, html);
console.log(`versão ${versao}: ${Object.keys(mapa).length} módulos`);
