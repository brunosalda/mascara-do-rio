// Rolagens da V5. Usado só pelos scripts do Narrador: o site nunca rola dados.
//
// Regras:
//   - parada de d10; cada dado de 6 a 10 é um sucesso;
//   - cada par de 10 vale 4 sucessos (crítico);
//   - dados de Fome substituem dados normais (até o tamanho da parada);
//   - crítico com 10 num dado de Fome = crítico sangrento;
//   - falha com 1 num dado de Fome = falha bestial.

function d10() {
  // Amostragem por rejeição para não viciar o resultado.
  const buf = new Uint8Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < 250) return (buf[0] % 10) + 1;
  }
}

function rolarN(n) {
  return Array.from({ length: Math.max(0, n) }, d10);
}

export function avaliar({ normais, dadosFome, dificuldade = 0 }) {
  const todos = [...normais, ...dadosFome];
  const dez = todos.filter((x) => x === 10).length;
  const pares = Math.floor(dez / 2);
  const sucessos = todos.filter((x) => x >= 6).length + pares * 2;
  const critico = pares > 0;
  const sangrento = critico && dadosFome.includes(10);
  const umNaFome = dadosFome.includes(1);
  let resultado;
  if (dificuldade <= 0) {
    resultado = 'contagem';
  } else if (sucessos >= dificuldade) {
    resultado = sangrento ? 'critico-sangrento' : critico ? 'critico' : 'sucesso';
  } else if (umNaFome) {
    resultado = 'falha-bestial';
  } else if (sucessos === 0) {
    resultado = 'falha-total';
  } else {
    resultado = 'falha';
  }
  return {
    normais,
    dadosFome,
    dificuldade,
    sucessos,
    margem: sucessos - dificuldade,
    critico,
    sangrento,
    resultado,
  };
}

export function rolarParada({ parada, fome = 0, dificuldade = 0 }) {
  const total = Math.max(1, parada | 0);
  const nFome = Math.max(0, Math.min(fome | 0, total));
  return {
    parada: total,
    fome: nFome,
    ...avaliar({ normais: rolarN(total - nFome), dadosFome: rolarN(nFome), dificuldade }),
  };
}

// Força de Vontade: rerrola até 3 dados normais que falharam (nunca os de Fome).
export function rerrolarComVontade(anterior, quantos = 3) {
  const normais = [...anterior.normais];
  const falhos = normais
    .map((v, i) => ({ v, i }))
    .filter((x) => x.v < 6)
    .sort((a, b) => a.v - b.v)
    .slice(0, quantos);
  for (const { i } of falhos) normais[i] = d10();
  return {
    parada: anterior.parada,
    fome: anterior.fome,
    vontadeGasta: true,
    rerrolados: falhos.length,
    ...avaliar({ normais, dadosFome: anterior.dadosFome, dificuldade: anterior.dificuldade }),
  };
}

// Teste de Despertar: 6+ não aumenta a Fome.
export function testeDespertar() {
  const dado = d10();
  return { dado, fomeSobe: dado < 6 };
}

// Remorso no fim da noite: dados = caixas de Humanidade sem mancha (mínimo 1).
export function testeRemorso(humanidade, manchas) {
  const n = Math.max(1, 10 - humanidade - manchas);
  const dados = rolarN(n);
  const passou = dados.some((x) => x >= 6);
  return {
    dados,
    passou,
    novaHumanidade: passou ? humanidade : Math.max(0, humanidade - 1),
    manchas: 0,
  };
}

// Teste oposto: quem tem mais sucessos vence; empate = ninguém avança.
export function testeOposto(a, b) {
  const ra = rolarParada(a);
  const rb = rolarParada(b);
  const diferenca = ra.sucessos - rb.sucessos;
  return {
    a: ra,
    b: rb,
    vencedor: diferenca > 0 ? 'a' : diferenca < 0 ? 'b' : 'empate',
    margem: Math.abs(diferenca),
  };
}
