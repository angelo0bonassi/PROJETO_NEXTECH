/* =====================================================
  TERMO — Lógica do Jogo (Modo Normal)
  ===================================================== */

// ---------- ESTADO GLOBAL ----------
let modoAtual = 'normal';
let temaAtual = 'Geral';
let palavraSecreta = "";
let tentativas = [];
let tentativaAtual = "";
let cursorPos = 0;
let jogoTerminado = false;

// Cronômetro e estatísticas
let tempoInicial = null;
let intervaloTempo = null;
let segundosDecorridos = 0;

let estatisticas = {
  vitorias: 0,
  jogos: 0,
  sequencia: 0
};

const LIMITE_TENTATIVAS = 6;

// ---------- CONJUNTO DE PALAVRAS PERMITIDAS ----------
let dicionarioCompletoSet = new Set();

/**
 * Carrega exclusivamente as palavras registradas em temas.js e dicionario.js
 */
function inicializarDicionario() {
  dicionarioCompletoSet.clear();

  // 1. Adiciona todas as palavras cadastradas nos temas (temas.js)
  if (typeof palavrasPorTema !== 'undefined') {
    Object.values(palavrasPorTema).forEach(lista => {
      if (Array.isArray(lista)) {
        lista.forEach(p => {
          if (p) dicionarioCompletoSet.add(removerAcentos(p.trim().toLowerCase()));
        });
      }
    });
  }

  // 2. Adiciona todas as palavras do dicionário local de 5 letras (dicionario.js)
  if (typeof dicionario5Letras !== 'undefined' && Array.isArray(dicionario5Letras)) {
    dicionario5Letras.forEach(p => {
      if (p) dicionarioCompletoSet.add(removerAcentos(p.trim().toLowerCase()));
    });
  }
}

// ---------- FUNÇÃO DE SORTEIO ----------
function sortearPalavra(tema) {
  const palavras = palavrasPorTema[tema];
  const listaNormalizada = palavras.filter(p => removerAcentos(p.trim()).length === 5);
  const listaParaUsar = listaNormalizada.length > 0 ? listaNormalizada : palavras;
  const indiceAleatorio = Math.floor(Math.random() * listaParaUsar.length);
  return listaParaUsar[indiceAleatorio];
}

// ---------- ELEMENTOS DO DOM ----------
const telas = {
  menu: document.getElementById('tela-menu'),
  temas: document.getElementById('tela-temas'),
  jogo: document.getElementById('tela-jogo')
};

const btns = {
  normal: document.getElementById('btn-normal'),
  voltarTemas: document.getElementById('btn-voltar-temas'),
  voltarMenu: document.getElementById('btn-voltar'),
  ajuda: document.getElementById('btn-ajuda'),
  estatisticas: document.getElementById('btn-estatisticas'),
  jogarNovamente: document.getElementById('btn-jogar-novamente'),
  btnMenuModal: document.getElementById('btn-menu')
};

const elModal = document.getElementById('modal-fim');
const elAvisos = document.getElementById('avisos');
const elTabuleiro = document.getElementById('tabuleiro');
const elTeclado = document.getElementById('teclado');

// ---------- INICIALIZAÇÃO ----------
document.addEventListener('DOMContentLoaded', () => {
  carregarEstatisticas();
  configurarEventos();
  inicializarDicionario();
});

function configurarEventos() {
  if (btns.normal) {
    btns.normal.addEventListener('click', () => abrirTelaTemas());
  }

  btns.voltarTemas.addEventListener('click', () => trocarTela('menu'));
  btns.voltarMenu.addEventListener('click', () => trocarTela('menu'));

  btns.ajuda.addEventListener('click', () => {
    mostrarAviso("Adivinhe a palavra secreta em 6 tentativas!");
  });
  btns.estatisticas.addEventListener('click', mostrarEstatisticasModal);

  btns.jogarNovamente.addEventListener('click', () => {
    fecharModal();
    iniciarJogo(temaAtual);
  });

  btns.btnMenuModal.addEventListener('click', () => {
    fecharModal();
    trocarTela('menu');
  });

  elTeclado.addEventListener('click', (e) => {
    const btn = e.target.closest('.tecla');
    if (!btn) return;
    const tecla = btn.dataset.tecla;
    tratarEntrada(tecla);
  });

  // Clique nas caixas do tabuleiro para reposicionar o cursor
  elTabuleiro.addEventListener('click', (e) => {
    const bloco = e.target.closest('.letra');
    if (!bloco || jogoTerminado) return;
    const linhaIndex = tentativas.length;
    const linhaAtualEl = elTabuleiro.children[linhaIndex];
    
    if (linhaAtualEl && linhaAtualEl.contains(bloco)) {
      const index = Array.from(linhaAtualEl.children).indexOf(bloco);
      if (index !== -1 && index <= palavraSecreta.length - 1) {
        cursorPos = index;
        atualizarLinhaAtiva();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!telas.jogo.classList.contains('ativa') || jogoTerminado) return;

    const numColunas = palavraSecreta.length;
  
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      cursorPos = Math.max(0, cursorPos - 1);
      atualizarLinhaAtiva();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      cursorPos = Math.min(numColunas - 1, cursorPos + 1);
      atualizarLinhaAtiva();
    } else if (e.key === 'Enter') {
      tratarEntrada('ENTER');
    } else if (e.key === 'Backspace') {
      tratarEntrada('APAGAR');
    } else {
      const letra = e.key.toUpperCase();
      if (/^[A-ZÃÁÂÀÉÊÍÓÔÕÚÇ]$/.test(letra)) {
        tratarEntrada(letra);
      }
    }
  });
}

// ---------- NAVEGAÇÃO ENTRE TELAS ----------
function trocarTela(nomeTela) {
  Object.values(telas).forEach(t => t.classList.remove('ativa'));
  telas[nomeTela].classList.add('ativa');

  if (nomeTela !== 'jogo') {
    pararCronometro();
  }
}

function abrirTelaTemas() {
  modoAtual = 'normal';
  const elModoTemas = document.getElementById('modo-temas');
  if (elModoTemas) {
    elModoTemas.textContent = 'Normal';
    elModoTemas.className = 'etiqueta-modo modo-normal';
  }
  const elTextoTemas = document.getElementById('texto-temas');
  if (elTextoTemas) {
    elTextoTemas.textContent = "Escolha um tema para jogar palavras de 5 letras.";
  }

  renderizarListaTemas();
  trocarTela('temas');
}

function renderizarListaTemas() {
  const container = document.getElementById('lista-temas');
  container.innerHTML = '';

  const emojis = {
    Geral: '🌟',
    Verbos: '⚡',
    Alimentos: '🍎',
    Objetos: '📦',
    Animais: '🐾',
    Verbos2: '🔥'
  };

  const lista = Object.keys(palavrasPorTema);

  lista.forEach(tema => {
    const btn = document.createElement('button');
    btn.className = 'tema tema-botao';
    btn.innerHTML = `
      <span class="emoji">${emojis[tema] || '🎯'}</span>
      <span>${tema}</span>
    `;
    btn.addEventListener('click', () => {
      iniciarJogo(tema);
      trocarTela('jogo');
    });
    container.appendChild(btn);
  });
}

// ---------- LÓGICA DE JOGO ----------
function iniciarJogo(tema) {
  modoAtual = 'normal';
  temaAtual = tema;
  tentativas = [];
  tentativaAtual = "";
  cursorPos = 0;
  jogoTerminado = false;

  let palavraCrua = sortearPalavra(tema);
  palavraSecreta = removerAcentos(palavraCrua.trim().toUpperCase());

  document.getElementById('tema-atual').textContent = tema;
  
  const elModoAtual = document.getElementById('modo-atual');
  if (elModoAtual) elModoAtual.textContent = 'Normal';
  
  document.getElementById('tela-jogo').className = 'tela ativa jogo-normal';
  
  document.getElementById('contador-tentativas').textContent = `0/${LIMITE_TENTATIVAS}`;
  document.getElementById('vitorias').textContent = estatisticas.vitorias;

  const dicaTamanho = document.getElementById('dica-tamanho');
  if (dicaTamanho) {
    dicaTamanho.textContent = `Palavra de ${palavraSecreta.length} letras`;
  }
  elTabuleiro.classList.remove('oculto');

  montarTabuleiro();
  resetarTeclado();
  iniciarCronometro();
}

function removerAcentos(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ---------- VALIDAÇÃO DE PALAVRAS ----------
function palavraExiste(palavra) {
  if (!palavra) return false;
  const palFormatada = removerAcentos(palavra.trim().toLowerCase());
  return dicionarioCompletoSet.has(palFormatada);
}

// ---------- TABULEIRO ----------
function montarTabuleiro() {
  elTabuleiro.innerHTML = '';
  const numColunas = palavraSecreta.length;
  elTabuleiro.style.setProperty('--colunas', numColunas);

  for (let i = 0; i < LIMITE_TENTATIVAS; i++) {
    const linha = document.createElement('div');
    linha.className = 'linha';

    for (let j = 0; j < numColunas; j++) {
      const letra = document.createElement('div');
      letra.className = 'letra';
      linha.appendChild(letra);
    }
    elTabuleiro.appendChild(linha);
  }
  atualizarLinhaAtiva();
}

function atualizarLinhaAtiva() {
  if (jogoTerminado) return;
  
  const linhaIndex = tentativas.length;
  if (linhaIndex >= LIMITE_TENTATIVAS) return;

  const linhaAtual = elTabuleiro.children[linhaIndex];
  if (!linhaAtual) return;

  const letras = linhaAtual.children;
  const numColunas = palavraSecreta.length;

  for (let i = 0; i < numColunas; i++) {
    const char = tentativaAtual[i] || '';
    letras[i].textContent = char;

    letras[i].className = 'letra';
    if (char && char !== ' ') {
      letras[i].classList.add('preenchida');
    }
    if (i === cursorPos && i < numColunas) {
      letras[i].classList.add('ativa');
    }
  }
}

// ---------- ENTRADA ----------
function tratarEntrada(tecla) {
  if (jogoTerminado) return;

  const numColunas = palavraSecreta.length;

  if (tecla === 'APAGAR') {
    if (tentativaAtual.length > 0) {
      if (cursorPos < tentativaAtual.length) {
        tentativaAtual = tentativaAtual.slice(0, cursorPos) + tentativaAtual.slice(cursorPos + 1);
      } else {
        tentativaAtual = tentativaAtual.slice(0, -1);
        cursorPos = Math.max(0, tentativaAtual.length);
      }
      atualizarLinhaAtiva();
    }
  } else if (tecla === 'ENTER') {
    if (tentativaAtual.length < numColunas) {
      tremerLinha();
      mostrarAviso(`A palavra precisa ter ${numColunas} letras!`);
      return;
    }
    submeterTentativa();
  } else {
    let arrayLetras = tentativaAtual.split('');
    
    while (arrayLetras.length < cursorPos) {
      arrayLetras.push(' ');
    }

    arrayLetras[cursorPos] = tecla;
    tentativaAtual = arrayLetras.join('');

    cursorPos = Math.min(cursorPos + 1, numColunas - 1);
    atualizarLinhaAtiva();
  }
}

function tremerLinha() {
  const linhaIndex = tentativas.length;
  const linha = elTabuleiro.children[linhaIndex];
  if (linha) {
    linha.classList.add('tremer');
    setTimeout(() => linha.classList.remove('tremer'), 400);
  }
}

function submeterTentativa() {
  if (jogoTerminado) return;

  const pal = removerAcentos(tentativaAtual.trim().toUpperCase());

  if (pal.length !== palavraSecreta.length || pal.includes(' ')) {
    tremerLinha();
    mostrarAviso("A palavra está incompleta!");
    return;
  }

  if (!palavraExiste(pal)) {
    tremerLinha();
    mostrarAviso("Essa palavra não é aceita!");
    return;
  }

  tentativas.push(pal);

  const linhaIndex = tentativas.length - 1;
  const linha = elTabuleiro.children[linhaIndex];

  if (!linha) {
    tentativas.pop();
    mostrarAviso("Não foi possível registrar a tentativa.");
    return;
  }

  const letrasEl = linha.children;

  document.getElementById('contador-tentativas').textContent =
    `${tentativas.length}/${LIMITE_TENTATIVAS}`;

  const segredoArray = palavraSecreta.split('');
  const resultado = new Array(palavraSecreta.length).fill('errada');

  // 1. Identifica posições corretas (Verde)
  for (let i = 0; i < palavraSecreta.length; i++) {
    if (pal[i] === segredoArray[i]) {
      resultado[i] = 'correta';
      segredoArray[i] = null;
    }
  }

  // 2. Identifica letras existentes (Amarelo)
  for (let i = 0; i < palavraSecreta.length; i++) {
    if (resultado[i] !== 'correta') {
      const pos = segredoArray.indexOf(pal[i]);
      if (pos !== -1) {
        resultado[i] = 'existe';
        segredoArray[pos] = null;
      }
    }
  }

  for (let i = 0; i < palavraSecreta.length; i++) {
    setTimeout(() => {
      letrasEl[i].classList.add('revelando', resultado[i]);
      atualizarTeclado(pal[i], resultado[i]);
    }, i * 120);
  }

  setTimeout(() => {
    if (pal === palavraSecreta) {
      finalizarJogo(true);
    } else if (tentativas.length >= LIMITE_TENTATIVAS) {
      finalizarJogo(false);
    } else {
      tentativaAtual = "";
      cursorPos = 0;
      atualizarLinhaAtiva();
    }
  }, palavraSecreta.length * 120 + 200);
}

function atualizarTeclado(letra, estado) {
  const btnTecla = elTeclado.querySelector(`[data-tecla="${letra}"]`);
  if (!btnTecla) return;

  if (estado === 'correta') {
    btnTecla.className = 'tecla correta';
  } else if (estado === 'existe' && !btnTecla.classList.contains('correta')) {
    btnTecla.className = 'tecla existe';
  } else if (estado === 'errada' && !btnTecla.classList.contains('correta') && !btnTecla.classList.contains('existe')) {
    btnTecla.className = 'tecla errada';
  }
}

function resetarTeclado() {
  const teclas = elTeclado.querySelectorAll('.tecla');
  teclas.forEach(t => {
    if (t.classList.contains('enviar')) {
      t.className = 'tecla especial enviar';
    } else if (t.classList.contains('especial')) {
      t.className = 'tecla especial';
    } else {
      t.className = 'tecla';
    }
  });
}

// ---------- CRONÔMETRO ----------
function iniciarCronometro() {
  pararCronometro();
  segundosDecorridos = 0;
  document.getElementById('tempo').textContent = "00:00";

  intervaloTempo = setInterval(() => {
    segundosDecorridos++;
    const mins = String(Math.floor(segundosDecorridos / 60)).padStart(2, '0');
    const segs = String(segundosDecorridos % 60).padStart(2, '0');
    document.getElementById('tempo').textContent = `${mins}:${segs}`;
  }, 1000);
}

function pararCronometro() {
  if (intervaloTempo) clearInterval(intervaloTempo);
}

// ---------- ESTATÍSTICAS E MODAL ----------
function finalizarJogo(vitoria) {
  jogoTerminado = true;
  pararCronometro();

  estatisticas.jogos++;
  if (vitoria) {
    estatisticas.vitorias++;
    estatisticas.sequencia++;
    
    const linhaIndex = tentativas.length - 1;
    if (elTabuleiro.children[linhaIndex]) {
      elTabuleiro.children[linhaIndex].classList.add('vitoria');
    }
  } else {
    estatisticas.sequencia = 0;
  }

  salvarEstatisticas();
  document.getElementById('vitorias').textContent = estatisticas.vitorias;

  setTimeout(() => {
    abrirModalResultado(vitoria);
  }, 600);
}

function abrirModalResultado(vitoria) {
  const elTitulo = document.getElementById('resultado-titulo');
  const elTexto = document.getElementById('resultado-texto');
  const elPalavra = document.getElementById('resultado-palavra');

  if (vitoria) {
    elTitulo.textContent = "Você acertou! 🎉";
    elTexto.textContent = "Parabéns, a palavra era:";
  } else {
    elTitulo.textContent = "Que pena! 😢";
    elTexto.textContent = "A palavra correta era:";
  }

  elPalavra.textContent = palavraSecreta;
  elModal.classList.add('aberto');
}

function fecharModal() {
  elModal.classList.remove('aberto');
}

function carregarEstatisticas() {
  const dados = localStorage.getItem('termo_estatisticas');
  if (dados) {
    try {
      estatisticas = JSON.parse(dados);
    } catch (e) {
      console.error(e);
    }
  }
}

function salvarEstatisticas() {
  localStorage.setItem('termo_estatisticas', JSON.stringify(estatisticas));
}

function mostrarEstatisticasModal() {
  const percentual = estatisticas.jogos > 0 
    ? Math.round((estatisticas.vitorias / estatisticas.jogos) * 100) 
    : 0;

  const elTitulo = document.getElementById('resultado-titulo');
  const elTexto = document.getElementById('resultado-texto');
  const elPalavra = document.getElementById('resultado-palavra');

  elTitulo.textContent = "Sua Estatísticas";
  elTexto.textContent = "";
  elPalavra.style.display = 'none';

  let container = document.querySelector('.estatisticas');
  if (!container) {
    container = document.createElement('div');
    container.className = 'estatisticas';
    elPalavra.parentNode.insertBefore(container, elPalavra.nextSibling);
  }

  container.innerHTML = `
    <div class="estatistica"><strong>${estatisticas.jogos}</strong><span>Jogos</span></div>
    <div class="estatistica"><strong>${percentual}%</strong><span>Vitórias</span></div>
    <div class="estatistica"><strong>${estatisticas.sequencia}</strong><span>Sequência</span></div>
  `;

  elModal.classList.add('aberto');

  const fecharEstat = () => {
    elPalavra.style.display = 'inline-block';
    if (container) container.remove();
    btns.jogarNovamente.removeEventListener('click', fecharEstat);
  };
  btns.jogarNovamente.addEventListener('click', fecharEstat);
}

// ---------- AVISOS ----------
function mostrarAviso(texto) {
  const aviso = document.createElement('div');
  aviso.className = 'aviso';
  aviso.textContent = texto;

  elAvisos.appendChild(aviso);

  setTimeout(() => {
    aviso.classList.add('saindo');
    setTimeout(() => aviso.remove(), 300);
  }, 2500);
}

// =====================================================
// ANIMAÇÃO DE BLOCOS DO TERMO CAINDO (CORES ALTERNADAS)
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas-fundo');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // Paleta de cores fiéis ao jogo Termo
  const estilosCores = [
    { bg: 'rgba(34, 197, 94, 0.75)', border: 'rgba(52, 211, 153, 0.9)', texto: '#042f2e' }, // Verde (Correta)
    { bg: 'rgba(234, 179, 8, 0.75)', border: 'rgba(253, 224, 71, 0.9)', texto: '#422006' }, // Amarelo (Existe)
    { bg: 'rgba(51, 65, 85, 0.75)', border: 'rgba(148, 163, 184, 0.4)', texto: '#cbd5e1' } // Cinza/Preto (Errada)
  ];

  const tamanhoBloco = 38;
  const espacamento = 12;
  const larguraColuna = tamanhoBloco + espacamento;
  let colunas = 0;
  let gotas = [];
  let letrasFixas = [];
  let estilosFixos = [];

  function ajustarTamanho() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    colunas = Math.floor(canvas.width / larguraColuna);
    
    gotas = Array(colunas).fill(1).map(() => Math.floor(Math.random() * -30));
    letrasFixas = Array(colunas).fill('').map(() => letras[Math.floor(Math.random() * letras.length)]);
    // Sorteia uma cor inicial para cada coluna
    estilosFixos = Array(colunas).fill(0).map(() => estilosCores[Math.floor(Math.random() * estilosCores.length)]);
  }

  ajustarTamanho();
  window.addEventListener('resize', ajustarTamanho);

  function desenharBlocoTermo(x, y, letra, estilo, opacidade) {
    const raioBorda = 9;

    ctx.save();
    ctx.globalAlpha = opacidade;

    // 1. Fundo colorido do bloco
    ctx.fillStyle = estilo.bg;
    ctx.beginPath();
    ctx.roundRect(x, y, tamanhoBloco, tamanhoBloco, raioBorda);
    ctx.fill();

    // 2. Borda do bloco
    ctx.strokeStyle = estilo.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Letra centralizada
    ctx.fillStyle = estilo.texto;
    ctx.font = `bold 19px 'Bricolage Grotesque', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letra, x + tamanhoBloco / 2, y + tamanhoBloco / 2);

    ctx.restore();
  }

  function animarBlocos() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < colunas; i++) {
      const x = i * larguraColuna + espacamento / 2;
      const y = gotas[i] * (tamanhoBloco + espacamento);
      const letra = letrasFixas[i];
      const estilo = estilosFixos[i];

      // Opacidade suave para não atrapalhar a leitura do jogo
      let opacidade = 0.45;
      if (y < 100) {
        opacidade = (y / 100) * 0.45;
      } else if (y > canvas.height - 150) {
        opacidade = ((canvas.height - y) / 150) * 0.45;
      }

      if (opacidade > 0 && y > -tamanhoBloco) {
        desenharBlocoTermo(x, y, letra, estilo, Math.max(0, opacidade));
      }

      // Quando o bloco sai da tela, reinicia sorteando nova letra e nova cor
      if (y > canvas.height && Math.random() > 0.96) {
        gotas[i] = -2;
        letrasFixas[i] = letras[Math.floor(Math.random() * letras.length)];
        estilosFixos[i] = estilosCores[Math.floor(Math.random() * estilosCores.length)];
      }
      
      gotas[i] += 0.07; // Velocidade de queda constante e suave
    }

    requestAnimationFrame(animarBlocos);
  }

  animarBlocos();
});

// =====================================================
// MÚSICA DE FUNDO E CONTROLE DE ÁUDIO
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  // Cria o elemento de áudio via JS (pode trocar a URL por um MP3 seu se preferir)
  const musica = new Audio('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3');
  musica.loop = true;
  musica.volume = 0.2; // Volume suave (20%)

  let tocando = false;
  const btnMusica = document.getElementById('btn-musica');

  function alternarMusica() {
    if (tocando) {
      musica.pause();
      tocando = false;
      if (btnMusica) btnMusica.textContent = '🔇';
    } else {
      musica.play().then(() => {
        tocando = true;
        if (btnMusica) btnMusica.textContent = '🎵';
      }).catch(e => console.log("Aguardando interação para tocar áudio."));
    }
  }

  // Botão de mutar/tocar no topo
  if (btnMusica) {
    btnMusica.addEventListener('click', (e) => {
      e.stopPropagation();
      alternarMusica();
    });
  }

  // Inicia a música suavemente na primeira interação do jogador na página
  const iniciarNoPrimeiroClique = () => {
    if (!tocando) {
      alternarMusica();
    }
    document.removeEventListener('click', iniciarNoPrimeiroClique);
    document.removeEventListener('keydown', iniciarNoPrimeiroClique);
  };

  document.addEventListener('click', iniciarNoPrimeiroClique);
  document.addEventListener('keydown', iniciarNoPrimeiroClique);
});





css

@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700&display=swap');

/* =====================================================
  TERMO — Estilo com Chuva de Letras no Fundo
  ===================================================== */

:root {
  --bg-base: #06090e;
  --surface: rgba(18, 24, 36, 0.85);
  --surface-2: rgba(26, 34, 50, 0.9);
  --surface-3: #263147;
  --border: rgba(255, 255, 255, 0.08);
  --border-forte: rgba(255, 255, 255, 0.18);
  --text: #f0f4f9;
  --muted: #94a3b8;

  --verde: #22c55e;
  --verde-glow: rgba(34, 197, 94, 0.45);
  --amarelo: #eab308;
  --amarelo-glow: rgba(234, 179, 8, 0.45);
  --cinza: #334155;

  --normal: #10b981;
  --destaque: var(--normal);

  --radius: 16px;
  --radius-sm: 10px;
  --brilho: inset 0 1px 1px rgba(255, 255, 255, 0.15);
  --fonte-titulo: 'Bricolage Grotesque', system-ui, sans-serif;
  --fonte-texto: 'Figtree', system-ui, sans-serif;
  --suave: cubic-bezier(0.16, 1, 0.3, 1);
}

/* Canvas fixo no fundo de TODAS as abas */
#canvas-fundo {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  opacity: 0.85;
}

/* Garante que o conteúdo do jogo fique acima do canvas em todas as telas */
.app,
.container {
  width: min(100% - 32px, 520px);
  margin: 0 auto;
  padding: 24px 0 40px;
  position: relative;
  z-index: 1;
}

/* Transição suave entre telas mantendo o fundo contínuo */
.tela { display: none; }

.tela.ativa {
  display: block;
  animation: entrar 0.45s var(--suave);
}

/* ---------- BASE ---------- */

* { margin: 0; padding: 0; box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }

body {
  min-height: 100vh;
  background-color: var(--bg-base);
  color: var(--text);
  font-family: var(--fonte-texto);
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  position: relative;
}

/* Canvas fixo no fundo da página */
#canvas-fundo {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
  opacity: 0.85;
}

button {
  font: inherit;
  color: inherit;
  border: 0;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

button:focus-visible {
  outline: 2px solid var(--destaque);
  outline-offset: 3px;
}

/* ---------- LAYOUT E CARDS COM GLASSMORPHISM ---------- */

.app,
.container {
  width: min(100% - 32px, 520px);
  margin: 0 auto;
  padding: 24px 0 40px;
  position: relative;
  z-index: 1;
}

.tela { display: none; }

.tela.ativa {
  display: block;
  animation: entrar 0.45s var(--suave);
}

@keyframes entrar {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ---------- TOPO ---------- */

.topo,
header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 20px;
  margin-bottom: 32px;
}

.topo::after,
header::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border-forte), transparent);
}

.logo { display: flex; gap: 6px; }

.logo span {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(145deg, #34d399, var(--verde));
  box-shadow: var(--brilho), 0 6px 20px -4px var(--verde-glow);
  color: #042f2e;
  font-family: var(--fonte-titulo);
  font-size: 20px;
  font-weight: 800;
  animation: virar 0.6s var(--suave) both;
}

.logo span:nth-child(2) { background: linear-gradient(145deg, #fde047, var(--amarelo)); color: #422006; box-shadow: var(--brilho), 0 6px 20px -4px var(--amarelo-glow); animation-delay: 0.08s; }
.logo span:nth-child(3) { background: rgba(255, 255, 255, 0.08); color: var(--text); backdrop-filter: blur(8px); box-shadow: var(--brilho); animation-delay: 0.16s; }
.logo span:nth-child(4) { animation-delay: 0.24s; }
.logo span:nth-child(5) { background: rgba(255, 255, 255, 0.08); color: var(--text); backdrop-filter: blur(8px); box-shadow: var(--brilho); animation-delay: 0.32s; }

.topo-acoes { display: flex; gap: 10px; }

.icone-botao {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  backdrop-filter: blur(12px);
  box-shadow: var(--brilho), 0 4px 14px rgba(0, 0, 0, 0.3);
  color: var(--muted);
  font-size: 16px;
  font-weight: 700;
  transition: all 0.25s var(--suave);
}

.icone-botao:hover {
  color: var(--text);
  border-color: var(--border-forte);
  transform: translateY(-2px);
  box-shadow: var(--brilho), 0 8px 20px rgba(0, 0, 0, 0.4);
}
.icone-botao:active { transform: scale(0.93); }

/* ---------- INTRODUÇÃO ---------- */

.hero { margin-bottom: 32px; text-align: center; }

.hero h1 {
  margin-bottom: 12px;
  font-family: var(--fonte-titulo);
  font-size: clamp(32px, 8vw, 44px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  background: linear-gradient(180deg, #ffffff 30%, #94a3b8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero p { margin: 0 auto; max-width: 44ch; color: var(--muted); font-size: 15px; }

.secao-titulo {
  margin: 32px 0 14px;
  font-family: var(--fonte-titulo);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text);
  text-transform: uppercase;
}

/* ---------- EXEMPLO PRÉVIA ---------- */

.tabuleiro.previa {
  --gap: 8px;
  width: 280px;
  margin: 0 auto 36px;
  padding: 20px;
  box-sizing: content-box;
  border: 1px solid var(--border-forte);
  border-radius: 22px;
  background: var(--surface-2);
  backdrop-filter: blur(16px);
  box-shadow: var(--brilho), 0 20px 40px -15px rgba(0, 0, 0, 0.6);
  max-width: calc(100% - 40px);
}

.tabuleiro.previa .letra {
  animation: revelar 0.55s var(--suave) both;
  animation-delay: calc(0.4s + var(--i) * 0.1s);
}

/* ---------- COMO JOGAR ---------- */

.legenda {
  list-style: none;
  display: grid;
  gap: 10px;
}

.legenda li {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  backdrop-filter: blur(12px);
  color: var(--muted);
  font-size: 14px;
  box-shadow: var(--brilho);
}

.legenda strong {
  display: block;
  color: var(--text);
  font-size: 14px;
}

.amostra {
  display: grid;
  place-items: center;
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 9px;
  color: #fff;
  font-family: var(--fonte-titulo);
  font-size: 18px;
  font-weight: 800;
}

.amostra.correta { background: linear-gradient(145deg, #34d399, var(--verde)); box-shadow: 0 4px 14px var(--verde-glow); color: #042f2e; }
.amostra.existe { background: linear-gradient(145deg, #fde047, var(--amarelo)); box-shadow: 0 4px 14px var(--amarelo-glow); color: #422006; }
.amostra.errada { background: var(--cinza); color: #cbd5e1; }

/* ---------- BOTÃO MODOS ---------- */

.modos { display: grid; gap: 14px; }

.modo {
  position: relative;
  overflow: hidden;
  padding: 22px 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  backdrop-filter: blur(12px);
  box-shadow: var(--brilho), 0 10px 24px -10px rgba(0, 0, 0, 0.4);
  text-align: left;
  transition: all 0.3s var(--suave);
}

.modo::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(300px at 0% 0%, rgba(16, 185, 129, 0.25), transparent 70%);
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.modo:hover {
  border-color: var(--destaque);
  transform: translateY(-3px);
  box-shadow: var(--brilho), 0 16px 32px -12px var(--verde-glow);
}

.modo:hover::before { opacity: 1; }

.modo .icone {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: 14px;
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.12);
  color: var(--destaque);
  font-family: var(--fonte-titulo);
  font-size: 22px;
  font-weight: 800;
}

.modo h2 {
  margin-bottom: 4px;
  font-family: var(--fonte-titulo);
  font-size: 20px;
  font-weight: 800;
}

.modo p { color: var(--muted); font-size: 14px; }

/* ---------- TEMAS ---------- */

.temas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
  gap: 12px;
}

.tema {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 10px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  backdrop-filter: blur(12px);
  box-shadow: var(--brilho), 0 8px 16px -8px rgba(0, 0, 0, 0.3);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
}

.tema .emoji {
  font-size: 30px;
  line-height: 1;
  transition: transform 0.3s var(--suave);
}

.tema-botao {
  cursor: pointer;
  transition: all 0.25s var(--suave);
}

.tema-botao:hover {
  border-color: var(--destaque);
  transform: translateY(-4px);
  box-shadow: var(--brilho), 0 14px 28px -10px var(--verde-glow);
}

.tema-botao:hover .emoji { transform: scale(1.2) rotate(-6deg); }
.tema-botao:active { transform: scale(0.96); }

/* ---------- BARRA DO JOGO ---------- */

.barra-jogo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
}

.voltar {
  padding: 9px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  backdrop-filter: blur(12px);
  box-shadow: var(--brilho);
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  transition: all 0.2s var(--suave);
}

.voltar:hover { color: var(--text); border-color: var(--border-forte); transform: translateX(-3px); }

.etiqueta-tema {
  padding: 6px 14px;
  border: 1px solid var(--border-forte);
  border-radius: 999px;
  background: var(--surface-2);
  backdrop-filter: blur(8px);
  font-size: 13px;
  font-weight: 700;
  color: var(--destaque);
}

.placar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  backdrop-filter: blur(12px);
  box-shadow: var(--brilho);
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

.placar > div { padding: 12px 8px; }
.placar > div + div { border-left: 1px solid var(--border); }

.placar strong {
  display: block;
  color: var(--text);
  font-family: var(--fonte-titulo);
  font-size: 22px;
  font-weight: 800;
}

.dica-tamanho {
  margin: 0 0 18px;
  color: var(--muted);
  font-size: 14px;
  text-align: center;
  font-weight: 600;
}

/* ---------- TABULEIRO ---------- */

.tabuleiro {
  --colunas: 5;
  --gap: 7px;
  display: flex;
  flex-direction: column;
  gap: var(--gap);
  width: min(100%, calc(var(--colunas) * 64px));
  margin: 0 auto 28px;
  container-type: inline-size;
}

.linha {
  display: grid;
  grid-template-columns: repeat(var(--colunas, 5), minmax(0, 1fr));
  gap: var(--gap);
}

.letra {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  min-width: 0;
  border: 2px solid var(--border);
  border-radius: 10px;
  background: rgba(18, 24, 36, 0.4);
  backdrop-filter: blur(8px);
  color: var(--text);
  font-family: var(--fonte-titulo);
  font-size: clamp(16px, calc(48cqw / var(--colunas, 5)), 32px);
  font-weight: 800;
  text-transform: uppercase;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.letra.preenchida {
  border-color: var(--border-forte);
  background: var(--surface-2);
  animation: pop 0.14s var(--suave);
}

.letra.ativa {
  border-color: var(--destaque);
  box-shadow: 0 0 14px var(--verde-glow);
  animation: respirar 1.4s ease-in-out infinite;
}

.letra.correta {
  background: linear-gradient(145deg, #34d399, var(--verde));
  border-color: var(--verde);
  color: #042f2e;
  box-shadow: 0 4px 18px var(--verde-glow);
}

.letra.existe {
  background: linear-gradient(145deg, #fde047, var(--amarelo));
  border-color: var(--amarelo);
  color: #422006;
  box-shadow: 0 4px 18px var(--amarelo-glow);
}

.letra.errada {
  background: var(--cinza);
  border-color: var(--cinza);
  color: #94a3b8;
}

.letra.revelando { animation: revelar 0.5s ease both; }
.linha.tremer { animation: tremer 0.4s ease; }

.linha.vitoria .letra { animation: pular 0.7s var(--suave) both; }
.linha.vitoria .letra:nth-child(2) { animation-delay: 0.08s; }
.linha.vitoria .letra:nth-child(3) { animation-delay: 0.16s; }
.linha.vitoria .letra:nth-child(4) { animation-delay: 0.24s; }
.linha.vitoria .letra:nth-child(5) { animation-delay: 0.32s; }

@keyframes pop {
  from { transform: scale(0.84); }
  to { transform: scale(1); }
}

@keyframes respirar {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50%   { box-shadow: 0 0 14px 2px var(--verde-glow); }
}

@keyframes virar {
  from { opacity: 0; transform: rotateX(90deg); }
  to { opacity: 1; transform: rotateX(0); }
}

@keyframes revelar {
  0% { transform: rotateX(0); }
  50% { transform: rotateX(90deg); }
  100% { transform: rotateX(0); }
}

@keyframes tremer {
  0%, 100% { transform: translateX(0); }
  20%   { transform: translateX(-8px); }
  40%   { transform: translateX(8px); }
  60%   { transform: translateX(-5px); }
  80%   { transform: translateX(5px); }
}

@keyframes pular {
  0%, 100% { transform: translateY(0); }
  40%   { transform: translateY(-16px); }
  70%   { transform: translateY(2px); }
}

/* ---------- TECLADO ---------- */

.teclado {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin: 0 auto 20px;
}

.linha-teclado { display: flex; justify-content: center; gap: 6px; }

.tecla {
  flex: 1;
  min-width: 0;
  min-height: 54px;
  padding: 0 2px;
  border-radius: 99px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  backdrop-filter: blur(8px);
  box-shadow: var(--brilho), 0 4px 0 #030508;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  transition: all 0.1s ease;
}

.tecla:hover {
  background: #2a374e;
  color: #fff;
}

.tecla:active {
  transform: translateY(4px);
  box-shadow: var(--brilho), 0 0 0 #030508;
}

.tecla.especial {
  flex: 1.5;
  background: var(--surface);
  font-size: 13px;
}

.tecla.especial.enviar {
  background: linear-gradient(180deg, #34d399, var(--verde));
  box-shadow: var(--brilho), 0 4px 0 #047857;
  color: #042f2e;
  font-weight: 800;
}

.tecla.correta { background: linear-gradient(180deg, #34d399, var(--verde)); color: #042f2e; border-color: var(--verde); }
.tecla.existe { background: linear-gradient(180deg, #fde047, var(--amarelo)); color: #422006; border-color: var(--amarelo); }
.tecla.errada { background: var(--cinza); color: #64748b; border-color: transparent; opacity: 0.6; }

/* ---------- BOTÕES E MODAIS ---------- */

.botao {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 52px;
  padding: 12px 24px;
  border-radius: 12px;
  background: linear-gradient(145deg, #34d399, var(--verde));
  box-shadow: 0 10px 24px -8px var(--verde-glow);
  color: #042f2e;
  font-size: 16px;
  font-weight: 800;
  transition: all 0.25s var(--suave);
}

.botao:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px -6px var(--verde-glow);
}

.botao-secundario {
  background: transparent;
  border: 1px solid var(--border-forte);
  box-shadow: none;
  color: var(--text);
}
.botao-secundario:hover { background: var(--surface-2); }

.botoes-linha { display: flex; gap: 12px; }

/* ---------- JANELA MODAL ---------- */

.modal-fundo {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(3, 5, 8, 0.8);
  backdrop-filter: blur(12px);
}

.modal-fundo.aberto { display: flex; animation: fade 0.25s ease-out; }

.modal {
  position: relative;
  width: min(100%, 420px);
  padding: 34px 24px 24px;
  border: 1px solid var(--border-forte);
  border-radius: 22px;
  background: var(--surface-2);
  backdrop-filter: blur(16px);
  box-shadow: var(--brilho), 0 30px 60px -15px rgba(0, 0, 0, 0.8);
  text-align: center;
  animation: surgir 0.45s var(--suave);
}

.modal h2 { font-family: var(--fonte-titulo); font-size: 28px; font-weight: 800; }
.modal p { margin-bottom: 20px; color: var(--muted); font-size: 15px; }

.modal .palavra-resposta {
  display: inline-block;
  margin-bottom: 24px;
  padding: 12px 24px;
  border-radius: 12px;
  background: linear-gradient(145deg, #34d399, var(--verde));
  box-shadow: 0 10px 25px -5px var(--verde-glow);
  color: #042f2e;
  font-family: var(--fonte-titulo);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-indent: 0.2em;
}

.estatisticas {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}

.estatistica {
  padding: 14px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  backdrop-filter: blur(8px);
}

.estatistica strong { display: block; font-family: var(--fonte-titulo); font-size: 24px; }
.estatistica span { color: var(--muted); font-size: 12px; }

/* ---------- AVISOS ---------- */

.avisos {
  position: fixed;
  top: 20px;
  left: 50%;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transform: translateX(-50%);
  width: min(92vw, 380px);
  pointer-events: none;
}

.aviso {
  padding: 12px 18px;
  border-radius: 12px;
  background: #f1f5f9;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 12px 30px -6px rgba(0, 0, 0, 0.4);
}

footer {
  padding-top: 32px;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}





html


<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0c1016">
  <meta name="description" content="Jogo de adivinhar palavras em 6 tentativas.">
  <title>Termo</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%233f9564'/%3E%3Ctext x='50' y='70' font-size='62' font-weight='800' text-anchor='middle' fill='white' font-family='sans-serif'%3ET%3C/text%3E%3C/svg%3E">
  <link rel="stylesheet" href="style.css">
</head>
<body>

  

  <canvas id="canvas-fundo"></canvas>
<div class="avisos" id="avisos" role="status" aria-live="polite"></div>

<div class="app">

  <!-- TOPO -->
  <header class="topo">
    <div class="logo">
      <span>T</span><span>E</span><span>R</span><span>M</span><span>O</span>
    </div>
    <div class="topo-acoes">
      <button class="icone-botao" id="btn-musica" aria-label="Música">🎵</button>
      <button class="icone-botao" id="btn-ajuda" aria-label="Ajuda">?</button>
      <button class="icone-botao" id="btn-estatisticas" aria-label="Estatísticas">▦</button>
    </div>
  </header>


  <!-- TELA INICIAL -->
  <section class="tela ativa" id="tela-menu">
    <div class="hero">
      <h1>Descubra a palavra em 6 tentativas</h1>
      <p>Escolha um tema para começar a jogar.</p>
    </div>

    <div class="tabuleiro previa" aria-hidden="true">
      <div class="linha">
        <div class="letra correta" style="--i:0">T</div>
        <div class="letra existe" style="--i:1">R</div>
        <div class="letra errada" style="--i:2">A</div>
        <div class="letra errada" style="--i:3">T</div>
        <div class="letra correta" style="--i:4">O</div>
      </div>
      <div class="linha">
        <div class="letra correta" style="--i:6">T</div>
        <div class="letra correta" style="--i:7">E</div>
        <div class="letra correta" style="--i:8">R</div>
        <div class="letra correta" style="--i:9">M</div>
        <div class="letra correta" style="--i:10">O</div>
      </div>
    </div>

    <div class="modos">
      <button class="modo modo-normal" id="btn-normal" data-modo="normal" style="grid-column: 1 / -1;">
        <div class="icone">N</div>
        <h2>Jogar</h2>
        <p>Palavras de 5 letras com o tema que você escolher.</p>
      </button>
    </div>

    <h2 class="secao-titulo">Como jogar</h2>
    <ul class="legenda">
      <li><span class="amostra correta">A</span><div><strong>Verde</strong>Letra no lugar certo</div></li>
      <li><span class="amostra existe">A</span><div><strong>Amarelo</strong>Letra em outro lugar</div></li>
      <li><span class="amostra errada">A</span><div><strong>Cinza</strong>A palavra não tem a letra</div></li>
    </ul>
  </section>

  <!-- TELA DE ESCOLHA DO TEMA -->
  <section class="tela" id="tela-temas">
    <div class="barra-jogo">
      <button class="voltar" id="btn-voltar-temas">← Menu</button>
    </div>

    <div class="hero">
      <h1>Escolha o tema</h1>
      <p id="texto-temas">Escolha um tema para jogar palavras de 5 letras.</p>
    </div>

    <div class="temas" id="lista-temas"></div>
  </section>

  <!-- TELA DO JOGO -->
  <section class="tela" id="tela-jogo">

    <div class="barra-jogo">
      <button class="voltar" id="btn-voltar">← Menu</button>
      <div class="info-rodada">
        <span class="etiqueta-tema" id="tema-atual">Geral</span>
      </div>
    </div>

    <div class="placar">
      <div><strong id="contador-tentativas">0/6</strong>tentativas</div>
      <div><strong id="tempo">00:00</strong>tempo</div>
      <div><strong id="vitorias">0</strong>vitórias</div>
    </div>

    <p class="dica-tamanho" id="dica-tamanho">Palavra de 5 letras</p>

    <div class="tabuleiro" id="tabuleiro"></div>

    <div class="teclado" id="teclado">
      <div class="linha-teclado">
        <button class="tecla" data-tecla="Q">q</button>
        <button class="tecla" data-tecla="W">w</button>
        <button class="tecla" data-tecla="E">e</button>
        <button class="tecla" data-tecla="R">r</button>
        <button class="tecla" data-tecla="T">t</button>
        <button class="tecla" data-tecla="Y">y</button>
        <button class="tecla" data-tecla="U">u</button>
        <button class="tecla" data-tecla="I">i</button>
        <button class="tecla" data-tecla="O">o</button>
        <button class="tecla" data-tecla="P">p</button>
      </div>
      <div class="linha-teclado">
        <button class="tecla" data-tecla="A">a</button>
        <button class="tecla" data-tecla="S">s</button>
        <button class="tecla" data-tecla="D">d</button>
        <button class="tecla" data-tecla="F">f</button>
        <button class="tecla" data-tecla="G">g</button>
        <button class="tecla" data-tecla="H">h</button>
        <button class="tecla" data-tecla="J">j</button>
        <button class="tecla" data-tecla="K">k</button>
        <button class="tecla" data-tecla="L">l</button>
      </div>
      <div class="linha-teclado">
        <button class="tecla especial enviar" data-tecla="ENTER">Enter</button>
        <button class="tecla" data-tecla="Z">z</button>
        <button class="tecla" data-tecla="X">x</button>
        <button class="tecla" data-tecla="C">c</button>
        <button class="tecla" data-tecla="V">v</button>
        <button class="tecla" data-tecla="B">b</button>
        <button class="tecla" data-tecla="N">n</button>
        <button class="tecla" data-tecla="M">m</button>
        <button class="tecla especial" data-tecla="APAGAR">⌫</button>
      </div>
    </div>
  </section>

  <footer>Termo · feito por você</footer>
</div>

<!-- FIM DE RODADA -->
<div class="modal-fundo" id="modal-fim">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="resultado-titulo">
    <h2 id="resultado-titulo">Você acertou!</h2>
    <p id="resultado-texto">A palavra era:</p>
    <div class="palavra-resposta" id="resultado-palavra">TERMO</div>
    <div class="botoes-linha">
      <button class="botao" id="btn-jogar-novamente">Jogar de novo</button>
      <button class="botao botao-secundario" id="btn-menu">Menu</button>
    </div>
  </div>
</div>

<noscript>Ative o JavaScript para jogar.</noscript>

<script src="temas.js"></script>
<script src="dicionario.js"></script>
<script src="script.js"></script>
</body>
</html>
