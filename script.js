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

function inicializarDicionario() {
  dicionarioCompletoSet.clear();

  if (typeof palavrasPorTema !== 'undefined') {
    Object.values(palavrasPorTema).forEach(lista => {
      if (Array.isArray(lista)) {
        lista.forEach(p => {
          if (p) dicionarioCompletoSet.add(removerAcentos(p.trim().toLowerCase()));
        });
      }
    });
  }

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
  btnMenuModal: document.getElementById('btn-menu'),
  fecharModalFim: document.getElementById('btn-fechar-modal'),
  fecharAjuda: document.getElementById('btn-fechar-ajuda')
};

const elModal = document.getElementById('modal-fim');
const elModalAjuda = document.getElementById('modal-ajuda');
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

  // Abertura e fechamento do Modal de Ajuda (?)
  btns.ajuda.addEventListener('click', () => {
    elModalAjuda.classList.add('aberto');
  });

  btns.fecharAjuda.addEventListener('click', () => {
    elModalAjuda.classList.remove('aberto');
  });

  elModalAjuda.addEventListener('click', (e) => {
    if (e.target === elModalAjuda) {
      elModalAjuda.classList.remove('aberto');
    }
  });

  // Abertura e fechamento do Modal de Estatísticas / Fim
  btns.estatisticas.addEventListener('click', mostrarEstatisticasModal);

  btns.fecharModalFim.addEventListener('click', () => {
    fecharModal();
  });

  elModal.addEventListener('click', (e) => {
    if (e.target === elModal) {
      fecharModal();
    }
  });

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
    Animais: '🐾'
  };

  const lista = Object.keys(palavrasPorTema);

  lista.forEach(tema => {
    if (tema === 'Verbos2') return;

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

  // 1. Posicoes corretas (Verde)
  for (let i = 0; i < palavraSecreta.length; i++) {
    if (pal[i] === segredoArray[i]) {
      resultado[i] = 'correta';
      segredoArray[i] = null;
    }
  }

  // 2. Letras existentes (Amarelo)
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

  limparContainerEstatisticas();

  if (vitoria) {
    elTitulo.textContent = "Você acertou! 🎉";
    elTexto.textContent = "Parabéns, a palavra era:";
  } else {
    elTitulo.textContent = "Que pena! 😢";
    elTexto.textContent = "A palavra correta era:";
  }

  elPalavra.style.display = 'inline-block';
  elPalavra.textContent = palavraSecreta;
  elModal.classList.add('aberto');
}

function fecharModal() {
  elModal.classList.remove('aberto');
  limparContainerEstatisticas();
}

function limparContainerEstatisticas() {
  const container = elModal.querySelector('.estatisticas');
  if (container) container.remove();
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

  elTitulo.textContent = "Suas Estatísticas";
  elTexto.textContent = "";
  elPalavra.style.display = 'none';

  limparContainerEstatisticas();

  const container = document.createElement('div');
  container.className = 'estatisticas';
  container.innerHTML = `
    <div class="estatistica"><strong>${estatisticas.jogos}</strong><span>Jogos</span></div>
    <div class="estatistica"><strong>${percentual}%</strong><span>Vitórias</span></div>
    <div class="estatistica"><strong>${estatisticas.sequencia}</strong><span>Sequência</span></div>
  `;

  elPalavra.parentNode.insertBefore(container, elPalavra.nextSibling);
  elModal.classList.add('aberto');
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
// ANIMAÇÃO DE BLOCOS DO TERMO CAINDO (CANVAS TOTAL)
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas-fundo');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  const estilosCores = [
    { bg: 'rgba(35, 134, 54, 0.75)', border: 'rgba(46, 160, 67, 0.9)', texto: '#ffffff' },
    { bg: 'rgba(158, 106, 3, 0.75)', border: 'rgba(187, 128, 9, 0.9)', texto: '#ffffff' },
    { bg: 'rgba(48, 54, 61, 0.75)', border: 'rgba(139, 148, 158, 0.4)', texto: '#8b949e' }
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
    estilosFixos = Array(colunas).fill(0).map(() => estilosCores[Math.floor(Math.random() * estilosCores.length)]);
  }

  ajustarTamanho();
  window.addEventListener('resize', ajustarTamanho);

  function desenharBlocoTermo(x, y, letra, estilo, opacidade) {
    const raioBorda = 8;

    ctx.save();
    ctx.globalAlpha = opacidade;

    ctx.fillStyle = estilo.bg;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, tamanhoBloco, tamanhoBloco, raioBorda);
    } else {
      ctx.rect(x, y, tamanhoBloco, tamanhoBloco);
    }
    ctx.fill();

    ctx.strokeStyle = estilo.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = estilo.texto;
    ctx.font = `bold 18px 'Bricolage Grotesque', sans-serif`;
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

      let opacidade = 0.35;
      if (y < 100) {
        opacidade = (y / 100) * 0.35;
      } else if (y > canvas.height - 150) {
        opacidade = ((canvas.height - y) / 150) * 0.35;
      }

      if (opacidade > 0 && y > -tamanhoBloco) {
        desenharBlocoTermo(x, y, letra, estilo, Math.max(0, opacidade));
      }

      if (y > canvas.height && Math.random() > 0.96) {
        gotas[i] = -2;
        letrasFixas[i] = letras[Math.floor(Math.random() * letras.length)];
        estilosFixos[i] = estilosCores[Math.floor(Math.random() * estilosCores.length)];
      }
      
      gotas[i] += 0.07;
    }

    requestAnimationFrame(animarBlocos);
  }

  animarBlocos();
});

// =====================================================
// MÚSICA DE FUNDO LO-FI HIP-HOP
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  const musica = new Audio('https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3');
  musica.loop = true;
  musica.volume = 0.2;

  let tocando = false;
  const btnMusica = document.getElementById('btn-musica');

  function tocarAudio() {
    return musica.play().then(() => {
      tocando = true;
      if (btnMusica) btnMusica.textContent = '🎵';
    }).catch(err => {
      tocando = false;
      if (btnMusica) btnMusica.textContent = '🔇';
    });
  }

  function pausarAudio() {
    musica.pause();
    tocando = false;
    if (btnMusica) btnMusica.textContent = '🔇';
  }

  function alternarMusica() {
    if (tocando) {
      pausarAudio();
    } else {
      tocarAudio();
    }
  }

  if (btnMusica) {
    btnMusica.addEventListener('click', (e) => {
      e.stopPropagation();
      alternarMusica();
    });
  }

  tocarAudio();

  const iniciarGarantido = () => {
    if (!tocando) {
      tocarAudio();
    }
    document.removeEventListener('pointerdown', iniciarGarantido);
    document.removeEventListener('click', iniciarGarantido);
    document.removeEventListener('keydown', iniciarGarantido);
  };

  document.addEventListener('pointerdown', iniciarGarantido);
  document.addEventListener('click', iniciarGarantido);
  document.addEventListener('keydown', iniciarGarantido);
});
