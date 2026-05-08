/**
 * ═══════════════════════════════════════════════════════════════
 *  ALGORITMO GENÉTICO · OTIMIZAÇÃO DE ROTAS DE ENTREGA
 *  script.js — Lógica completa do algoritmo e da interface
 * ═══════════════════════════════════════════════════════════════
 *
 *  Estrutura principal:
 *  1. Variáveis de estado global
 *  2. Funções de geração e desenho
 *  3. Funções do Algoritmo Genético
 *  4. Loop de evolução
 *  5. Funções de interface (estatísticas, log, gráfico)
 *  6. Event listeners
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   1. VARIÁVEIS GLOBAIS DE ESTADO
───────────────────────────────────────────────────────────── */

// Pontos de entrega: cada um tem { x, y, id }
let pontos = [];

// Configurações do algoritmo
let tamPopulacao   = 80;
let maxGeracoes    = 300;
let taxaMutacao    = 0.02;

// Estado da execução
let populacao        = [];       // array de indivíduos (cada um é um array de índices)
let melhorRota       = null;     // melhor rota encontrada até agora
let melhorDistancia  = Infinity; // distância dessa melhor rota
let rotaInicial      = null;     // rota da geração 0 (para comparação)
let distanciaInicial = Infinity; // distância da rota inicial
let geracaoAtual     = 0;
let executando       = false;
let intervalId       = null;
let historicoMelhor  = [];       // [ distância ] por geração

// Mapa de velocidades: nível 1-5 → { intervalo(ms), gerPorTick }
// intervalo: tempo entre ticks do setInterval
// gerPorTick: quantas gerações calcular por tick (sem redesenhar as intermediárias)
const VELOCIDADES = {
  1: { intervalo: 900,  gerPorTick: 1  },  // ~1 geração/s  — muito lento
  2: { intervalo: 300,  gerPorTick: 1  },  // ~3 gerações/s — lento
  3: { intervalo: 120,  gerPorTick: 1  },  // ~8 gerações/s — médio
  4: { intervalo: 50,   gerPorTick: 3  },  // ~60/s         — rápido
  5: { intervalo: 16,   gerPorTick: 8  },  // ~500/s        — muito rápido
};
let nivelVelocidade = 2; // padrão: lento

// Controle de animação da rota (desenho segmento a segmento)
let animacaoId   = null;  // requestAnimationFrame handle
let rotaAnimando = null;  // rota sendo animada
let segmentoAtual = 0;    // índice do segmento em animação


const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

// Canvas do gráfico de evolução
const canvasGrafico = document.getElementById('canvasGrafico');
const ctxGrafico    = canvasGrafico.getContext('2d');

/* ─────────────────────────────────────────────────────────────
   2. FUNÇÕES DE GERAÇÃO E DESENHO
───────────────────────────────────────────────────────────── */

/**
 * gerarPontos()
 * Cria N pontos aleatórios dentro do canvas.
 * O ponto 0 é o depósito (centro de distribuição).
 */
function gerarPontos() {
  const n = parseInt(document.getElementById('inputPontos').value);

  // Validação de entrada
  if (isNaN(n) || n < 3) {
    adicionarLog('⚠ Número de pontos inválido. Use pelo menos 3.', 'warning');
    return;
  }
  if (n > 40) {
    adicionarLog('⚠ Máximo de 40 pontos permitido.', 'warning');
    return;
  }

  // Reinicia estado ao gerar novos pontos
  reiniciarSimulacao(false); // false = não gera pontos novamente

  pontos = [];
  const margem = 48;
  const largura = canvas.width  - margem * 2;
  const altura  = canvas.height - margem * 2;

  for (let i = 0; i < n; i++) {
    pontos.push({
      id: i,
      x: margem + Math.random() * largura,
      y: margem + Math.random() * altura
    });
  }

  adicionarLog(`🗺 ${n} pontos de entrega gerados.`, 'info');
  desenharCanvas();
}

/**
 * desenharCanvas(segmentosVisiveis)
 * Limpa o canvas e redesenha tudo.
 * segmentosVisiveis: se definido, desenha apenas os primeiros N
 * segmentos da melhor rota (usado na animação progressiva).
 */
function desenharCanvas(segmentosVisiveis) {
  const w = canvas.width;
  const h = canvas.height;

  // Fundo
  ctx.fillStyle = '#0b0e18';
  ctx.fillRect(0, 0, w, h);

  if (pontos.length === 0) return;

  // Grade de fundo sutil
  ctx.strokeStyle = 'rgba(255,255,255,.03)';
  ctx.lineWidth = 1;
  for (let x = 40; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 40; y < h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Rota inicial (tracejada, azul escuro)
  if (rotaInicial) {
    desenharRota(rotaInicial, 'rgba(60,100,180,.55)', 1.5, [8, 6], null);
  }

  // Melhor rota (verde) — parcial se em animação
  if (melhorRota) {
    const limite = (segmentosVisiveis !== undefined) ? segmentosVisiveis : null;
    desenharRota(melhorRota, '#4cde8c', 2.2, null, limite);
  }

  // Pontos de entrega
  desenharPontos();
}

/**
 * desenharRota(rota, cor, espessura, tracejado, limiteSegmentos)
 * Desenha linhas conectando os pontos na ordem da rota.
 * limiteSegmentos: se definido, desenha apenas os primeiros N segmentos
 * (útil para animação progressiva). null = desenha tudo.
 */
function desenharRota(rota, cor, espessura, tracejado, limiteSegmentos) {
  if (!rota || rota.length < 2) return;

  // Total de segmentos = pontos + fechamento do ciclo
  const totalSegmentos = rota.length; // N pontos = N segmentos (último fecha p/ início)
  const limite = (limiteSegmentos !== null && limiteSegmentos !== undefined)
    ? Math.min(limiteSegmentos, totalSegmentos)
    : totalSegmentos;

  ctx.beginPath();
  ctx.strokeStyle = cor;
  ctx.lineWidth   = espessura;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';

  if (tracejado) {
    ctx.setLineDash(tracejado);
  } else {
    ctx.setLineDash([]);
  }

  ctx.moveTo(pontos[rota[0]].x, pontos[rota[0]].y);

  for (let i = 1; i <= limite; i++) {
    // No último segmento (i === rota.length), fecha o ciclo para o depósito
    const destIdx = (i < rota.length) ? rota[i] : rota[0];
    ctx.lineTo(pontos[destIdx].x, pontos[destIdx].y);
  }

  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * desenharPontos()
 * Desenha cada ponto de entrega com seu número.
 * O ponto 0 (depósito) recebe destaque especial.
 */
function desenharPontos() {
  pontos.forEach((p, i) => {
    const isDepot = (i === 0);
    const raio    = isDepot ? 10 : 7;

    // Sombra/brilho para o depósito
    if (isDepot) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
      const grd = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 18);
      grd.addColorStop(0, 'rgba(245,166,35,.4)');
      grd.addColorStop(1, 'rgba(245,166,35,0)');
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // Círculo do ponto
    ctx.beginPath();
    ctx.arc(p.x, p.y, raio, 0, Math.PI * 2);
    ctx.fillStyle = isDepot ? '#f5a623' : '#3ecfcf';
    ctx.fill();

    // Borda branca
    ctx.strokeStyle = isDepot ? '#fff' : 'rgba(255,255,255,.4)';
    ctx.lineWidth   = isDepot ? 2 : 1;
    ctx.stroke();

    // Label com o número
    ctx.fillStyle = '#0b0e18';
    ctx.font      = `bold ${isDepot ? 11 : 10}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i === 0 ? 'D' : String(i), p.x, p.y);
  });
}

/* ─────────────────────────────────────────────────────────────
   3. FUNÇÕES DO ALGORITMO GENÉTICO
───────────────────────────────────────────────────────────── */

/**
 * criarPopulacaoInicial()
 * Gera `tamPopulacao` indivíduos com rotas aleatórias.
 * Cada indivíduo é um array representando a ordem de visita.
 * O ponto 0 (depósito) é sempre o ponto de partida/chegada;
 * porém internamente a rota armazena apenas a permutação dos
 * índices 0..N-1 — o retorno ao início é calculado na distância.
 */
function criarPopulacaoInicial() {
  populacao = [];
  const n = pontos.length;

  // Cria os índices base (excluindo o depósito da permutação)
  const base = Array.from({ length: n - 1 }, (_, i) => i + 1);

  for (let i = 0; i < tamPopulacao; i++) {
    const rota = embaralhar([...base]);
    rota.unshift(0); // depósito sempre no início
    populacao.push(rota);
  }

  adicionarLog('🧬 População inicial criada.', 'info');
  ativarEtapa('etapa-populacao');
}

/**
 * embaralhar(arr)
 * Fisher-Yates shuffle — embaralha array in-place e retorna.
 */
function embaralhar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * calcularDistanciaRota(rota)
 * Soma das distâncias euclidianas entre pontos consecutivos,
 * incluindo o retorno ao ponto inicial.
 */
function calcularDistanciaRota(rota) {
  let total = 0;
  const n = rota.length;
  for (let i = 0; i < n - 1; i++) {
    total += distanciaEuclidiana(pontos[rota[i]], pontos[rota[i + 1]]);
  }
  // Retorno ao depósito
  total += distanciaEuclidiana(pontos[rota[n - 1]], pontos[rota[0]]);
  return total;
}

/**
 * distanciaEuclidiana(a, b)
 * Distância entre dois pontos { x, y }.
 */
function distanciaEuclidiana(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * calcularFitness(distancia)
 * Fitness = 1 / distância. Quanto menor a distância, maior o fitness.
 */
function calcularFitness(distancia) {
  return 1 / distancia;
}

/**
 * selecionarPai()
 * Seleção por torneio:
 * - Sorteia `k` indivíduos aleatórios da população.
 * - Retorna o de menor distância (maior fitness).
 */
function selecionarPai(distancias, k = 5) {
  let melhorIdx = -1;
  let melhorDist = Infinity;

  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * populacao.length);
    if (distancias[idx] < melhorDist) {
      melhorDist = distancias[idx];
      melhorIdx  = idx;
    }
  }
  return populacao[melhorIdx];
}

/**
 * cruzarRotas(pai1, pai2)
 * Order Crossover (OX1):
 * 1. Escolhe um segmento aleatório do pai1.
 * 2. Copia esse segmento para o filho.
 * 3. Preenche o restante com os genes do pai2
 *    na ordem em que aparecem, sem repetição.
 *
 * O depósito (índice 0) é fixo na primeira posição.
 */
function cruzarRotas(pai1, pai2) {
  const n     = pai1.length;
  const filho = new Array(n).fill(-1);

  // Fixar depósito na posição 0
  filho[0] = 0;

  // Trabalhar apenas com os pontos de entrega (índice 1..n-1)
  const tamanhoSeg = n - 1;
  const inicio = 1 + Math.floor(Math.random() * Math.floor(tamanhoSeg / 2));
  const fim    = inicio + Math.floor(Math.random() * Math.floor(tamanhoSeg / 2)) + 1;

  // Copia segmento do pai1
  for (let i = inicio; i <= Math.min(fim, n - 1); i++) {
    filho[i] = pai1[i];
  }

  // Preenche restante com ordem do pai2
  const usados = new Set(filho.filter(v => v !== -1));
  let posFilho = 1;
  for (let i = 1; i < n; i++) {
    const gene = pai2[i];
    if (!usados.has(gene)) {
      // Avança até próxima posição vazia
      while (filho[posFilho] !== -1) posFilho++;
      if (posFilho >= n) break;
      filho[posFilho] = gene;
      usados.add(gene);
    }
  }

  return filho;
}

/**
 * mutarRota(rota)
 * Mutação por troca (swap):
 * Para cada par de posições (exceto depósito), com probabilidade
 * `taxaMutacao`, troca os dois pontos de posição.
 * Retorna uma nova rota (não modifica o original).
 */
function mutarRota(rota) {
  const novaRota = [...rota];
  const n = novaRota.length;

  for (let i = 1; i < n; i++) {
    if (Math.random() < taxaMutacao) {
      const j = 1 + Math.floor(Math.random() * (n - 1));
      [novaRota[i], novaRota[j]] = [novaRota[j], novaRota[i]];
    }
  }
  return novaRota;
}

/**
 * animarMelhorRota(rota)
 * Desenha a nova melhor rota segmento a segmento usando
 * requestAnimationFrame, criando um efeito visual de "traçado".
 * A velocidade da animação é proporcional ao nível selecionado:
 * em níveis lentos (1-2), cada segmento aparece com pausa;
 * em níveis rápidos (4-5), a animação é instantânea.
 */
function animarMelhorRota(rota) {
  // Cancela animação anterior se existir
  if (animacaoId) {
    cancelAnimationFrame(animacaoId);
    animacaoId = null;
  }

  // Em velocidades altas, não anima — desenha direto
  if (nivelVelocidade >= 4) {
    desenharCanvas();
    return;
  }

  rotaAnimando  = rota;
  segmentoAtual = 0;

  // Tempo por segmento: distribui 1.2s (nível 1) ou 0.5s (nível 3) entre todos os segmentos
  const temposTotal = nivelVelocidade === 1 ? 1800
                    : nivelVelocidade === 2 ? 900
                    : 400; // nível 3
  const totalSegs   = rota.length; // inclui fechamento do ciclo
  const msPorSeg    = temposTotal / totalSegs;

  let ultimoTimestamp = null;
  let acumulado = 0;

  function frame(timestamp) {
    if (!ultimoTimestamp) ultimoTimestamp = timestamp;
    acumulado += timestamp - ultimoTimestamp;
    ultimoTimestamp = timestamp;

    // Quantos segmentos novos devem aparecer neste frame
    const novosSegs = Math.floor(acumulado / msPorSeg);
    if (novosSegs > 0) {
      segmentoAtual = Math.min(segmentoAtual + novosSegs, totalSegs);
      acumulado -= novosSegs * msPorSeg;

      // Redesenha com os segmentos visíveis até agora
      desenharCanvas(segmentoAtual);
    }

    if (segmentoAtual < totalSegs) {
      animacaoId = requestAnimationFrame(frame);
    } else {
      // Animação concluída — garante desenho final completo
      animacaoId = null;
      desenharCanvas();
    }
  }

  animacaoId = requestAnimationFrame(frame);
}


/**
 * executarGeracao()
 * Executa um ciclo completo do algoritmo genético:
 * 1. Calcula fitness de todos os indivíduos.
 * 2. Identifica o melhor (elitismo).
 * 3. Gera nova população por seleção + cruzamento + mutação.
 * 4. Injeta o elite na nova população.
 *
 * Respeita `gerPorTick`: em velocidades altas, processa múltiplas
 * gerações por tick sem redesenhar as intermediárias.
 */
function executarGeracao() {
  const { gerPorTick } = VELOCIDADES[nivelVelocidade];

  for (let t = 0; t < gerPorTick; t++) {
    if (!executando || geracaoAtual >= maxGeracoes) break;
    geracaoAtual++;

    // ── Passo 1: Calcula distâncias ──────────────────
    const distancias = populacao.map(calcularDistanciaRota);
    ativarEtapa('etapa-fitness');

    // ── Passo 2: Elitismo — encontra o melhor ────────
    let idxElite = 0;
    for (let i = 1; i < distancias.length; i++) {
      if (distancias[i] < distancias[idxElite]) idxElite = i;
    }
    const elite     = [...populacao[idxElite]];
    const distElite = distancias[idxElite];

    // Atualiza o melhor global e dispara animação
    let novaRota = false;
    if (distElite < melhorDistancia) {
      melhorDistancia = distElite;
      melhorRota      = [...elite];
      novaRota        = true;
      adicionarLog(`🏆 Nova melhor rota! Distância: ${melhorDistancia.toFixed(1)}`, 'success');
      ativarEtapa('etapa-elitismo');
    }

    // Guarda histórico para o gráfico
    historicoMelhor.push(melhorDistancia);

    // ── Passo 3: Seleção ─────────────────────────────
    ativarEtapa('etapa-selecao');

    // ── Passo 4: Nova população ───────────────────────
    const novaPopulacao = [elite];
    while (novaPopulacao.length < tamPopulacao) {
      const pai1  = selecionarPai(distancias);
      const pai2  = selecionarPai(distancias);
      let   filho = cruzarRotas(pai1, pai2);
      filho       = mutarRota(filho);
      novaPopulacao.push(filho);
    }
    ativarEtapa('etapa-cruzamento');
    ativarEtapa('etapa-mutacao');

    populacao = novaPopulacao;

    // Anima visualmente se encontrou rota melhor (apenas no último tick)
    if (novaRota && t === gerPorTick - 1) {
      animarMelhorRota(melhorRota);
    }
  }

  // ── Atualiza interface (uma vez por tick) ─────────
  atualizarEstatisticas();

  // Só redesenha canvas se não há animação de rota em andamento
  if (!animacaoId) {
    desenharCanvas();
  }
  desenharGrafico();

  // ── Verifica fim ──────────────────────────────────
  if (geracaoAtual >= maxGeracoes) {
    pausarAlgoritmo();
    adicionarLog(`✅ Evolução concluída! ${maxGeracoes} gerações.`, 'success');
    document.getElementById('statStatus').textContent = 'Concluído';
  }
}

/* ─────────────────────────────────────────────────────────────
   4. CONTROLE DO ALGORITMO
───────────────────────────────────────────────────────────── */

/**
 * iniciarAlgoritmo()
 * Valida entradas, inicializa estado e inicia o loop de gerações.
 */
function iniciarAlgoritmo() {
  if (pontos.length < 3) {
    adicionarLog('⚠ Gere pontos de entrega antes de iniciar.', 'warning');
    return;
  }

  // Lê e valida parâmetros
  tamPopulacao = parseInt(document.getElementById('inputPopulacao').value);
  maxGeracoes  = parseInt(document.getElementById('inputGeracoes').value);
  taxaMutacao  = parseFloat(document.getElementById('inputMutacao').value);

  if (isNaN(tamPopulacao) || tamPopulacao < 10) {
    adicionarLog('⚠ Tamanho de população inválido (mínimo 10).', 'warning'); return;
  }
  if (isNaN(maxGeracoes) || maxGeracoes < 10) {
    adicionarLog('⚠ Número de gerações inválido (mínimo 10).', 'warning'); return;
  }
  if (isNaN(taxaMutacao) || taxaMutacao < 0.001 || taxaMutacao > 0.5) {
    adicionarLog('⚠ Taxa de mutação inválida (0.001 – 0.5).', 'warning'); return;
  }

  // Reinicia estado (preserva pontos)
  geracaoAtual    = 0;
  melhorRota      = null;
  melhorDistancia = Infinity;
  historicoMelhor = [];

  // Cria população inicial
  criarPopulacaoInicial();

  // Registra rota inicial (primeiro indivíduo) para comparação
  rotaInicial      = [...populacao[0]];
  distanciaInicial = calcularDistanciaRota(rotaInicial);
  adicionarLog(`📏 Distância inicial: ${distanciaInicial.toFixed(1)}`, 'info');

  // Botões
  document.getElementById('btnIniciar').disabled  = true;
  document.getElementById('btnPausar').disabled   = false;
  document.getElementById('btnGerar').disabled    = true;
  document.getElementById('statStatus').textContent = 'Executando';

  executando = true;

  // Lê nível de velocidade e calcula intervalo
  nivelVelocidade = parseInt(document.getElementById('inputVelocidade').value);
  const { intervalo } = VELOCIDADES[nivelVelocidade];

  // Inicia o loop com o intervalo correspondente à velocidade escolhida
  intervalId = setInterval(() => {
    if (executando) executarGeracao();
  }, intervalo);

  adicionarLog('▶ Algoritmo iniciado.', 'info');
}

/**
 * pausarAlgoritmo()
 * Para o intervalo. Pode ser retomado clicando em Iniciar
 * (que neste caso retoma do ponto atual).
 */
function pausarAlgoritmo() {
  executando = false;
  clearInterval(intervalId);
  intervalId = null;

  document.getElementById('btnIniciar').disabled  = false;
  document.getElementById('btnPausar').disabled   = true;
  document.getElementById('btnGerar').disabled    = false;

  if (geracaoAtual > 0 && geracaoAtual < maxGeracoes) {
    document.getElementById('statStatus').textContent = 'Pausado';
    adicionarLog('⏸ Simulação pausada.', 'warning');

    // Permite retomar: reatribui o handler do botão Iniciar para continuar
    document.getElementById('btnIniciar').onclick = retomarAlgoritmo;
    document.getElementById('btnIniciar').textContent = '▶ Retomar';
  }
}

/**
 * retomarAlgoritmo()
 * Retoma a execução de onde parou.
 */
function retomarAlgoritmo() {
  if (populacao.length === 0) { iniciarAlgoritmo(); return; }

  executando = true;
  document.getElementById('btnIniciar').disabled  = true;
  document.getElementById('btnPausar').disabled   = false;
  document.getElementById('btnGerar').disabled    = true;
  document.getElementById('statStatus').textContent = 'Executando';

  // Restaura handler padrão
  document.getElementById('btnIniciar').onclick   = iniciarAlgoritmo;
  document.getElementById('btnIniciar').textContent = '▶ Iniciar';

  nivelVelocidade = parseInt(document.getElementById('inputVelocidade').value);
  const { intervalo } = VELOCIDADES[nivelVelocidade];

  intervalId = setInterval(() => {
    if (executando) executarGeracao();
  }, intervalo);

  adicionarLog('▶ Simulação retomada.', 'info');
}

/**
 * reiniciarSimulacao(gerarNovos)
 * Zera todo o estado. Se gerarNovos = true, também gera novos pontos.
 */
function reiniciarSimulacao(gerarNovos = true) {
  // Para o loop se estiver rodando
  executando = false;
  clearInterval(intervalId);
  intervalId = null;

  // Zera estado
  populacao        = [];
  melhorRota       = null;
  melhorDistancia  = Infinity;
  rotaInicial      = null;
  distanciaInicial = Infinity;
  geracaoAtual     = 0;
  historicoMelhor  = [];

  // Restaura botões
  document.getElementById('btnIniciar').disabled      = false;
  document.getElementById('btnPausar').disabled       = true;
  document.getElementById('btnGerar').disabled        = false;
  document.getElementById('btnIniciar').onclick       = iniciarAlgoritmo;
  document.getElementById('btnIniciar').textContent   = '▶ Iniciar';

  // Limpa estatísticas
  ['statGeracao','statDistInicial','statMelhorDist',
   'statMelhoria','statPontos','statPopulacao','statMutacao'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
  document.getElementById('statStatus').textContent = 'Aguardando';

  // Limpa canvas
  if (gerarNovos) {
    pontos = [];
    ctx.fillStyle = '#0b0e18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    desenharCanvas();
  }

  // Limpa gráfico
  ctxGrafico.fillStyle = '#0b0e18';
  ctxGrafico.fillRect(0, 0, canvasGrafico.width, canvasGrafico.height);

  // Limpa log
  document.getElementById('logBox').innerHTML =
    '<p class="log-welcome">Configure e clique em <strong>Gerar Pontos</strong> para começar.</p>';

  // Desativa etapas
  document.querySelectorAll('.etapa').forEach(e => e.classList.remove('ativa'));

  if (gerarNovos) adicionarLog('↺ Simulação reiniciada.', 'warning');
}

/* ─────────────────────────────────────────────────────────────
   5. FUNÇÕES DE INTERFACE
───────────────────────────────────────────────────────────── */

/**
 * atualizarEstatisticas()
 * Atualiza os cards de estatísticas na tela.
 */
function atualizarEstatisticas() {
  document.getElementById('statGeracao').textContent    = geracaoAtual;
  document.getElementById('statMelhorDist').textContent = melhorDistancia.toFixed(1);
  document.getElementById('statPontos').textContent     = pontos.length;
  document.getElementById('statPopulacao').textContent  = tamPopulacao;
  document.getElementById('statMutacao').textContent    = (taxaMutacao * 100).toFixed(1) + '%';

  if (distanciaInicial < Infinity) {
    document.getElementById('statDistInicial').textContent = distanciaInicial.toFixed(1);
  }

  if (distanciaInicial < Infinity && melhorDistancia < Infinity) {
    const melhoria = ((distanciaInicial - melhorDistancia) / distanciaInicial) * 100;
    document.getElementById('statMelhoria').textContent = melhoria.toFixed(1) + '%';
  }
}

/**
 * adicionarLog(msg, tipo)
 * Adiciona uma mensagem ao painel de log.
 * Tipos: 'info' | 'success' | 'warning' | padrão
 */
function adicionarLog(msg, tipo = '') {
  const logBox = document.getElementById('logBox');

  // Remove a mensagem de boas-vindas se existir
  const bv = logBox.querySelector('.log-welcome');
  if (bv) bv.remove();

  const entrada = document.createElement('div');
  entrada.className = `log-entry log-${tipo}`;

  const hora = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  entrada.innerHTML = `<span class="log-time">${hora}</span><span>${msg}</span>`;
  logBox.appendChild(entrada);

  // Rola para o final
  logBox.scrollTop = logBox.scrollHeight;

  // Limita o log a 200 entradas
  while (logBox.children.length > 200) {
    logBox.removeChild(logBox.firstChild);
  }
}

/**
 * ativarEtapa(id)
 * Destaca temporariamente a etapa correspondente no painel didático.
 */
function ativarEtapa(id) {
  document.querySelectorAll('.etapa').forEach(e => e.classList.remove('ativa'));
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('ativa');
    // Remove o destaque após 800ms
    setTimeout(() => el.classList.remove('ativa'), 800);
  }
}

/**
 * desenharGrafico()
 * Desenha o gráfico de linha com a evolução da melhor distância
 * ao longo das gerações.
 */
function desenharGrafico() {
  const w = canvasGrafico.width;
  const h = canvasGrafico.height;
  const dados = historicoMelhor;

  // Fundo
  ctxGrafico.fillStyle = '#0b0e18';
  ctxGrafico.fillRect(0, 0, w, h);

  if (dados.length < 2) return;

  const padL = 48, padR = 16, padT = 14, padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  // Escala
  const maxVal  = dados[0];        // primeira (pior) distância
  const minVal  = Math.min(...dados);
  const rng     = maxVal - minVal || 1;

  const xEscala = (i)   => padL + (i / (dados.length - 1)) * plotW;
  const yEscala = (val) => padT + plotH - ((val - minVal) / rng) * plotH;

  // Linhas de grade horizontais
  ctxGrafico.strokeStyle = 'rgba(255,255,255,.04)';
  ctxGrafico.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (i / 4) * plotH;
    ctxGrafico.beginPath();
    ctxGrafico.moveTo(padL, y);
    ctxGrafico.lineTo(padL + plotW, y);
    ctxGrafico.stroke();

    // Labels
    const val = maxVal - (i / 4) * rng;
    ctxGrafico.fillStyle = 'rgba(120,130,160,.6)';
    ctxGrafico.font = '9px system-ui';
    ctxGrafico.textAlign = 'right';
    ctxGrafico.fillText(val.toFixed(0), padL - 4, y + 3);
  }

  // Rótulos eixo X
  ctxGrafico.fillStyle = 'rgba(120,130,160,.6)';
  ctxGrafico.font = '9px system-ui';
  ctxGrafico.textAlign = 'center';
  const nLabels = Math.min(6, dados.length);
  for (let i = 0; i < nLabels; i++) {
    const idx = Math.round((i / (nLabels - 1)) * (dados.length - 1));
    ctxGrafico.fillText(String(idx), xEscala(idx), padT + plotH + 14);
  }

  // Label "Geração"
  ctxGrafico.fillStyle = 'rgba(120,130,160,.4)';
  ctxGrafico.font = '9px system-ui';
  ctxGrafico.textAlign = 'center';
  ctxGrafico.fillText('geração', padL + plotW / 2, h - 2);

  // Área preenchida sob a curva
  ctxGrafico.beginPath();
  ctxGrafico.moveTo(xEscala(0), yEscala(dados[0]));
  for (let i = 1; i < dados.length; i++) {
    ctxGrafico.lineTo(xEscala(i), yEscala(dados[i]));
  }
  ctxGrafico.lineTo(xEscala(dados.length - 1), padT + plotH);
  ctxGrafico.lineTo(xEscala(0), padT + plotH);
  ctxGrafico.closePath();
  const grad = ctxGrafico.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, 'rgba(76,222,140,.25)');
  grad.addColorStop(1, 'rgba(76,222,140,.0)');
  ctxGrafico.fillStyle = grad;
  ctxGrafico.fill();

  // Linha principal
  ctxGrafico.beginPath();
  ctxGrafico.strokeStyle = '#4cde8c';
  ctxGrafico.lineWidth   = 1.8;
  ctxGrafico.lineJoin    = 'round';
  ctxGrafico.moveTo(xEscala(0), yEscala(dados[0]));
  for (let i = 1; i < dados.length; i++) {
    ctxGrafico.lineTo(xEscala(i), yEscala(dados[i]));
  }
  ctxGrafico.stroke();

  // Ponto na posição atual
  const ultimo = dados.length - 1;
  ctxGrafico.beginPath();
  ctxGrafico.arc(xEscala(ultimo), yEscala(dados[ultimo]), 3.5, 0, Math.PI * 2);
  ctxGrafico.fillStyle = '#4cde8c';
  ctxGrafico.fill();
}

/* ─────────────────────────────────────────────────────────────
   6. EVENT LISTENERS
───────────────────────────────────────────────────────────── */

document.getElementById('btnGerar').addEventListener('click',    gerarPontos);
document.getElementById('btnIniciar').addEventListener('click',  iniciarAlgoritmo);
document.getElementById('btnPausar').addEventListener('click',   pausarAlgoritmo);
document.getElementById('btnReiniciar').addEventListener('click', () => reiniciarSimulacao(true));

// Slider de velocidade — atualiza hint e, se rodando, reinicia o intervalo
const sliderVel   = document.getElementById('inputVelocidade');
const hintVel     = document.getElementById('hintVelocidade');
const labelVel    = ['Muito lento (~1 geração/s)', 'Lento (~3 gerações/s)',
                     'Médio (~8 gerações/s)', 'Rápido (~60 gerações/s)', 'Muito rápido (~500 gerações/s)'];

sliderVel.addEventListener('input', () => {
  const nivel = parseInt(sliderVel.value);
  hintVel.textContent = labelVel[nivel - 1];

  // Se o algoritmo estiver rodando, reinicia o intervalo com a nova velocidade
  if (executando && intervalId) {
    clearInterval(intervalId);
    nivelVelocidade = nivel;
    const { intervalo } = VELOCIDADES[nivel];
    intervalId = setInterval(() => {
      if (executando) executarGeracao();
    }, intervalo);
  }
});

/* ─────────────────────────────────────────────────────────────
   7. INICIALIZAÇÃO
───────────────────────────────────────────────────────────── */

// Ao carregar a página, desenha o canvas vazio com a grade
(function init() {
  ctx.fillStyle = '#0b0e18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctxGrafico.fillStyle = '#0b0e18';
  ctxGrafico.fillRect(0, 0, canvasGrafico.width, canvasGrafico.height);

  // Gera pontos padrão ao carregar para uma experiência imediata
  gerarPontos();
})();
