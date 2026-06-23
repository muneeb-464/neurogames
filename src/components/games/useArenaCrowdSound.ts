"use client";

import { useCallback, useRef } from "react";

type CrowdNodes = {
  master: GainNode;
  rumble: GainNode;
  voices: GainNode;
  noiseSrc: AudioBufferSourceNode;
  voiceSrc: AudioBufferSourceNode;
  waveTimer: ReturnType<typeof setInterval>;
  animId: number;
};

function getCtxCtor() {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    webkitAudioContext?: typeof AudioContext;
  };
  return window.AudioContext || w.webkitAudioContext || null;
}

function makeNoiseBuffer(ctx: AudioContext, seconds: number, brown = true) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = white * 0.35;
      }
    }
  }
  return buf;
}

export function useArenaCrowdSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<CrowdNodes | null>(null);

  const ensure = useCallback(() => {
    const Ctor = getCtxCtor();
    if (!Ctor) return null;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }, []);

  const stop = useCallback(() => {
    const nodes = nodesRef.current;
    if (!nodes) return;
    clearInterval(nodes.waveTimer);
    cancelAnimationFrame(nodes.animId);
    try {
      nodes.noiseSrc.stop();
      nodes.voiceSrc.stop();
    } catch {
      /* already stopped */
    }
    nodes.master.disconnect();
    nodesRef.current = null;
  }, []);

  const start = useCallback(() => {
    stop();
    const ctx = ensure();
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);

    const rumble = ctx.createGain();
    rumble.gain.value = 0.55;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = 280;
    rumbleFilter.Q.value = 0.7;

    const voices = ctx.createGain();
    voices.gain.value = 0.35;
    const voiceFilter = ctx.createBiquadFilter();
    voiceFilter.type = "bandpass";
    voiceFilter.frequency.value = 520;
    voiceFilter.Q.value = 1.2;

    const noiseBuf = makeNoiseBuffer(ctx, 4, true);
    const voiceBuf = makeNoiseBuffer(ctx, 3, false);

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;
    noiseSrc.connect(rumbleFilter);
    rumbleFilter.connect(rumble);
    rumble.connect(master);

    const voiceSrc = ctx.createBufferSource();
    voiceSrc.buffer = voiceBuf;
    voiceSrc.loop = true;
    voiceSrc.connect(voiceFilter);
    voiceFilter.connect(voices);
    voices.connect(master);

    const t0 = ctx.currentTime;
    noiseSrc.start(t0);
    voiceSrc.start(t0);

    const wave = () => {
      const n = nodesRef.current;
      if (!n || !ctxRef.current) return;
      const t = ctxRef.current.currentTime;
      const base = 0.18 + Math.random() * 0.08;
      n.rumble.gain.cancelScheduledValues(t);
      n.rumble.gain.setValueAtTime(n.rumble.gain.value, t);
      n.rumble.gain.linearRampToValueAtTime(base + 0.12, t + 0.35);
      n.rumble.gain.linearRampToValueAtTime(base, t + 1.1);
      n.voices.gain.cancelScheduledValues(t);
      n.voices.gain.setValueAtTime(n.voices.gain.value, t);
      n.voices.gain.linearRampToValueAtTime(0.5 + Math.random() * 0.15, t + 0.2);
      n.voices.gain.linearRampToValueAtTime(0.28, t + 0.9);
    };

    const waveTimer = setInterval(wave, 2200 + Math.random() * 1800);
    wave();

    let animId = 0;
    const pulse = () => {
      const n = nodesRef.current;
      if (!n || !ctxRef.current) return;
      const t = ctxRef.current.currentTime;
      const wobble = 0.2 + Math.sin(t * 2.3) * 0.04;
      n.master.gain.setTargetAtTime(wobble, t, 0.15);
      animId = requestAnimationFrame(pulse);
    };
    animId = requestAnimationFrame(pulse);

    nodesRef.current = {
      master,
      rumble,
      voices,
      noiseSrc,
      voiceSrc,
      waveTimer,
      animId,
    };
  }, [ensure, stop]);

  const cheerBurst = useCallback(() => {
    const ctx = ensure();
    const nodes = nodesRef.current;
    if (!ctx || !nodes) return;
    const t = ctx.currentTime;
    nodes.master.gain.cancelScheduledValues(t);
    nodes.master.gain.setValueAtTime(nodes.master.gain.value, t);
    nodes.master.gain.linearRampToValueAtTime(0.42, t + 0.08);
    nodes.master.gain.linearRampToValueAtTime(0.24, t + 0.55);
    nodes.rumble.gain.linearRampToValueAtTime(0.75, t + 0.05);
    nodes.rumble.gain.linearRampToValueAtTime(0.5, t + 0.5);
    nodes.voices.gain.linearRampToValueAtTime(0.65, t + 0.04);
    nodes.voices.gain.linearRampToValueAtTime(0.32, t + 0.45);

    const pop = ctx.createOscillator();
    const popG = ctx.createGain();
    pop.type = "sawtooth";
    pop.frequency.setValueAtTime(180, t);
    pop.frequency.exponentialRampToValueAtTime(90, t + 0.15);
    popG.gain.setValueAtTime(0.0001, t);
    popG.gain.exponentialRampToValueAtTime(0.06, t + 0.03);
    popG.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    pop.connect(popG);
    popG.connect(nodes.master);
    pop.start(t);
    pop.stop(t + 0.22);
  }, [ensure]);

  const prime = useCallback(() => {
    ensure();
  }, [ensure]);

  return { start, stop, cheerBurst, prime };
}
