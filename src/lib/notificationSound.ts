"use client";

// Alertas sonoros das telas de equipe (cozinha e PDV) — itens 1 e 2 do
// roadmap. Bipes curtos sintetizados via Web Audio API, sem arquivo de
// áudio pra manter no repositório e sem request de rede.

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!ctx) ctx = new AudioContextCtor();
  return ctx;
}

// Navegadores só liberam áudio depois de alguma interação do usuário na
// página (clique, toque). Chame isso uma vez em qualquer gesto (ex: no
// primeiro clique na tela da cozinha) pra "destravar" o contexto — se não
// chamar, o primeiro bipe pode falhar silenciosamente, mas os próximos
// funcionam normalmente assim que houver qualquer clique.
export function primeNotificationSound() {
  const audioCtx = getContext();
  if (audioCtx?.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

function tone(
  audioCtx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number
) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.18, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

/** Bipe de duas notas (tipo "novo pedido") — curto e perceptível sem ser
 * irritante numa tela que pode tocar dezenas de vezes por turno. Usado na
 * cozinha quando um pedido novo chega. */
export function playNewOrderChime() {
  const audioCtx = getContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  const now = audioCtx.currentTime;
  tone(audioCtx, 880, now, 0.16);
  tone(audioCtx, 1318.5, now + 0.13, 0.22);
}

/** Alerta de "mesa chamando" no PDV — três batidas na mesma nota, mais
 * insistente que o bipe de pedido novo, porque um cliente parado esperando
 * ajuda é mais urgente que um item na fila da cozinha. */
export function playHelpCallChime() {
  const audioCtx = getContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  const now = audioCtx.currentTime;
  tone(audioCtx, 987.77, now, 0.13);
  tone(audioCtx, 987.77, now + 0.18, 0.13);
  tone(audioCtx, 987.77, now + 0.36, 0.2);
}
