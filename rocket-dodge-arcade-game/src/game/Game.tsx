import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  createGame, update, render,
  type InputState, type GameState,
} from './engine';
import { initAudio } from './audio';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ReturnType<typeof createGame> | null>(null);
  const inputRef = useRef<InputState>({
    left: false, right: false, up: false, down: false,
    pause: false, restart: false, start: false,
  });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [gameState, setGameState] = useState<GameState>('menu');

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    if (gameRef.current) {
      gameRef.current.width = w;
      gameRef.current.height = h;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const game = createGame(w, h);
    gameRef.current = game;

    // ── Keyboard ──
    const keyDown = (e: KeyboardEvent) => {
      initAudio();
      const inp = inputRef.current;
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': inp.left = true; break;
        case 'ArrowRight': case 'KeyD': inp.right = true; break;
        case 'ArrowUp': case 'KeyW': inp.up = true; break;
        case 'ArrowDown': case 'KeyS': inp.down = true; break;
        case 'Escape': case 'KeyP': inp.pause = true; break;
        case 'Enter': case 'Space':
          inp.start = true;
          inp.restart = true;
          break;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    };

    const keyUp = (e: KeyboardEvent) => {
      const inp = inputRef.current;
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': inp.left = false; break;
        case 'ArrowRight': case 'KeyD': inp.right = false; break;
        case 'ArrowUp': case 'KeyW': inp.up = false; break;
        case 'ArrowDown': case 'KeyS': inp.down = false; break;
      }
    };

    // ── Global mouse click for menus ──
    const mouseDown = (_e: MouseEvent) => {
      initAudio();
      const g = gameRef.current;
      if (!g) return;
      if (g.state === 'menu' || g.state === 'gameover') {
        inputRef.current.start = true;
        inputRef.current.restart = true;
      }
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    canvas.addEventListener('mousedown', mouseDown);
    window.addEventListener('resize', resize);

    // ── Game Loop ──
    const loop = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      let dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      if (dt > 0.1) dt = 0.016;

      const g = gameRef.current!;
      const inp = inputRef.current;

      update(g, dt, inp);

      if (g.state !== gameState) setGameState(g.state);

      inp.pause = false;
      inp.restart = false;
      inp.start = false;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      render(ctx, g);
      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      canvas.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('resize', resize);
    };
  }, [resize, gameState]);

  const press = (dir: 'up' | 'down' | 'left' | 'right') => {
    initAudio();
    setPressed(prev => new Set(prev).add(dir));
    const inp = inputRef.current;
    const g = gameRef.current;
    inp[dir] = true;

    if (g && (g.state === 'menu' || g.state === 'gameover')) {
      inp.start = true;
      inp.restart = true;
    }
  };

  const release = (dir: 'up' | 'down' | 'left' | 'right') => {
    setPressed(prev => {
      const next = new Set(prev);
      next.delete(dir);
      return next;
    });
    inputRef.current[dir] = false;
  };

  const pauseGame = () => {
    initAudio();
    inputRef.current.pause = true;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          touchAction: 'none',
          background: '#0a0a1a',
        }}
      />

      {(gameState === 'playing' || gameState === 'paused') && (
      <>
      <button
        onClick={pauseGame}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 48,
          height: 48,
          borderRadius: 14,
          border: '2px solid rgba(255,255,255,0.25)',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        ⏸
      </button>

      <div
        style={{
          position: 'absolute',
          bottom: 50,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 200,
          height: 200,
          zIndex: 10,
        }}
      >
        <DpadBtn dir="up" pressed={pressed.has('up')} onDown={press} onUp={release} style={{ top: 0, left: '50%', transform: 'translateX(-50%)' }}>▲</DpadBtn>
        <DpadBtn dir="down" pressed={pressed.has('down')} onDown={press} onUp={release} style={{ bottom: 0, left: '50%', transform: 'translateX(-50%)' }}>▼</DpadBtn>
        <DpadBtn dir="left" pressed={pressed.has('left')} onDown={press} onUp={release} style={{ top: '50%', left: 0, transform: 'translateY(-50%)' }}>◀</DpadBtn>
        <DpadBtn dir="right" pressed={pressed.has('right')} onDown={press} onUp={release} style={{ top: '50%', right: 0, transform: 'translateY(-50%)' }}>▶</DpadBtn>

        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }} />
      </div>
      </>
      )}
    </div>
  );
}

function DpadBtn({
  dir,
  pressed,
  onDown,
  onUp,
  style,
  children,
}: {
  dir: 'up' | 'down' | 'left' | 'right';
  pressed: boolean;
  onDown: (dir: 'up' | 'down' | 'left' | 'right') => void;
  onUp: (dir: 'up' | 'down' | 'left' | 'right') => void;
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 18,
    border: pressed ? '2px solid #4fc3f7' : '2px solid rgba(255,255,255,0.2)',
    background: pressed ? 'rgba(79, 195, 247, 0.35)' : 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(8px)',
    color: pressed ? '#4fc3f7' : 'rgba(255,255,255,0.7)',
    fontSize: 26,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    touchAction: 'none',
    transition: 'transform 0.08s, background 0.08s',
    transform: style.transform ? `${style.transform} scale(${pressed ? 0.9 : 1})` : `scale(${pressed ? 0.9 : 1})`,
    ...style,
  };

  return (
    <div
      style={baseStyle}
      // THE FIX: Using Pointer Capture to prevent sticking
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onDown(dir);
      }}
      onPointerUp={() => onUp(dir)}
      onPointerCancel={() => onUp(dir)}
      onPointerLeave={() => onUp(dir)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}
