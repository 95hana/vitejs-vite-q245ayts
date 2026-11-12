import React, { useState, useCallback, useMemo } from 'react';
import './App.css';

type Hand = 'rock' | 'scissors' | 'paper';
type RoundOutcome = 'panda' | 'tiger' | 'draw' | null;
type GamePhase = 'ready' | 'shaking' | 'roundResult' | 'matchEnd';

interface HandOption {
  id: Hand;
  label: string;
  emoji: string;
}

const HANDS: HandOption[] = [
  { id: 'rock', label: 'グー', emoji: '✊' },
  { id: 'scissors', label: 'チョキ', emoji: '✌️' },
  { id: 'paper', label: 'パー', emoji: '🖐️' },
];

const WIN_TARGET = 2; // 3回勝負（2本先取）

// Web Audio API による簡易効果音生成（外部ファイル不要）
const playTone = (type: 'tap' | 'win' | 'lose' | 'draw' | 'fanfare', enabled: boolean) => {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const beep = (freq: number, start: number, duration: number, wave: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.12, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration);
    };

    if (type === 'tap') {
      beep(523.25, 0, 0.12, 'triangle');
    } else if (type === 'win') {
      beep(523.25, 0, 0.12);
      beep(659.25, 0.1, 0.12);
      beep(783.99, 0.2, 0.22);
    } else if (type === 'lose') {
      beep(392.0, 0, 0.18, 'triangle');
      beep(311.13, 0.16, 0.25, 'triangle');
    } else if (type === 'draw') {
      beep(440, 0, 0.12);
      beep(440, 0.15, 0.12);
    } else if (type === 'fanfare') {
      beep(523.25, 0, 0.14);
      beep(659.25, 0.12, 0.14);
      beep(783.99, 0.24, 0.14);
      beep(1046.5, 0.36, 0.45);
    }
  } catch {
    // ブラウザの自動再生制限時は無視
  }
};

// 可愛いちびパンダ SVG
const ChibiPanda: React.FC<{ mood: 'normal' | 'happy' | 'sad' }> = ({ mood }) => (
  <svg viewBox="0 0 140 140" width="100%" height="100%" aria-label="パンダ">
    {/* 耳 */}
    <circle cx="36" cy="36" r="18" fill="#3a3a4a" />
    <circle cx="104" cy="36" r="18" fill="#3a3a4a" />
    {/* 体 */}
    <ellipse cx="70" cy="112" rx="34" ry="24" fill="#ffffff" stroke="#3a3a4a" strokeWidth="3.5" />
    <path d="M42 104 Q70 118 98 104" fill="none" stroke="#3a3a4a" strokeWidth="10" strokeLinecap="round" />
    {/* 顔 */}
    <ellipse cx="70" cy="70" rx="44" ry="38" fill="#ffffff" stroke="#3a3a4a" strokeWidth="3.5" />
    {/* 目の周りのタレ目模様 */}
    <ellipse cx="50" cy="68" rx="13" ry="10" transform="rotate(-18 50 68)" fill="#3a3a4a" />
    <ellipse cx="90" cy="68" rx="13" ry="10" transform="rotate(18 90 68)" fill="#3a3a4a" />
    {/* 瞳 */}
    {mood === 'happy' ? (
      <>
        <path d="M45 67 Q50 61 55 67" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        <path d="M85 67 Q90 61 95 67" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      </>
    ) : mood === 'sad' ? (
      <>
        <path d="M45 64 L54 70 M54 64 L45 70" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M86 64 L95 70 M95 64 L86 70" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="51" cy="67" r="4.5" fill="#ffffff" />
        <circle cx="52.5" cy="65.5" r="1.8" fill="#3a3a4a" />
        <circle cx="89" cy="67" r="4.5" fill="#ffffff" />
        <circle cx="90.5" cy="65.5" r="1.8" fill="#3a3a4a" />
      </>
    )}
    {/* ほっぺ */}
    <ellipse cx="38" cy="80" rx="7" ry="4.5" fill="#ff9ebb" opacity="0.75" />
    <ellipse cx="102" cy="80" rx="7" ry="4.5" fill="#ff9ebb" opacity="0.75" />
    {/* 鼻と口 */}
    <ellipse cx="70" cy="77" rx="5.5" ry="3.8" fill="#3a3a4a" />
    {mood === 'happy' ? (
      <path d="M61 83 Q70 94 79 83 Z" fill="#ff758f" stroke="#3a3a4a" strokeWidth="2" />
    ) : mood === 'sad' ? (
      <path d="M62 89 Q70 82 78 89" fill="none" stroke="#3a3a4a" strokeWidth="2.5" strokeLinecap="round" />
    ) : (
      <path d="M63 83 Q70 89 77 83" fill="none" stroke="#3a3a4a" strokeWidth="2.5" strokeLinecap="round" />
    )}
  </svg>
);

// 可愛いちびトラ SVG
const ChibiTiger: React.FC<{ mood: 'normal' | 'happy' | 'sad' }> = ({ mood }) => (
  <svg viewBox="0 0 140 140" width="100%" height="100%" aria-label="トラ">
    {/* 耳 */}
    <circle cx="36" cy="36" r="17" fill="#ffb703" stroke="#5c3a21" strokeWidth="3.5" />
    <circle cx="36" cy="36" r="9" fill="#ffe599" />
    <circle cx="104" cy="36" r="17" fill="#ffb703" stroke="#5c3a21" strokeWidth="3.5" />
    <circle cx="104" cy="36" r="9" fill="#ffe599" />
    {/* 体 */}
    <ellipse cx="70" cy="112" rx="34" ry="24" fill="#ffb703" stroke="#5c3a21" strokeWidth="3.5" />
    <ellipse cx="70" cy="114" rx="20" ry="15" fill="#fff3cc" />
    {/* 顔 */}
    <ellipse cx="70" cy="70" rx="44" ry="38" fill="#ffb703" stroke="#5c3a21" strokeWidth="3.5" />
    {/* 額のトラ模様 */}
    <path d="M70 34 L70 48 M59 38 L62 47 M81 38 L78 47" stroke="#5c3a21" strokeWidth="4" strokeLinecap="round" />
    {/* 頬のシマ模様 */}
    <path d="M28 68 L38 70 M29 77 L39 76" stroke="#5c3a21" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M112 68 L102 70 M111 77 L101 76" stroke="#5c3a21" strokeWidth="3.5" strokeLinecap="round" />
    {/* 口周りの白い部分 */}
    <ellipse cx="70" cy="82" rx="18" ry="13" fill="#fff8e7" />
    {/* 瞳 */}
    {mood === 'happy' ? (
      <>
        <path d="M46 66 Q52 59 58 66" fill="none" stroke="#5c3a21" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M82 66 Q88 59 94 66" fill="none" stroke="#5c3a21" strokeWidth="3.2" strokeLinecap="round" />
      </>
    ) : mood === 'sad' ? (
      <>
        <path d="M47 62 L56 68 M56 62 L47 68" stroke="#5c3a21" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M84 62 L93 68 M93 62 L84 68" stroke="#5c3a21" strokeWidth="2.8" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="52" cy="65" r="5" fill="#5c3a21" />
        <circle cx="53.5" cy="63.5" r="2" fill="#ffffff" />
        <circle cx="88" cy="65" r="5" fill="#5c3a21" />
        <circle cx="89.5" cy="63.5" r="2" fill="#ffffff" />
      </>
    )}
    {/* ほっぺ */}
    <ellipse cx="40" cy="78" rx="6.5" ry="4" fill="#ff8fa3" opacity="0.7" />
    <ellipse cx="100" cy="78" rx="6.5" ry="4" fill="#ff8fa3" opacity="0.7" />
    {/* 鼻と口 */}
    <polygon points="65,75 75,75 70,81" fill="#ff758f" />
    {mood === 'happy' ? (
      <path d="M61 84 Q70 95 79 84 Z" fill="#ff758f" stroke="#5c3a21" strokeWidth="2" />
    ) : mood === 'sad' ? (
      <path d="M62 90 Q70 83 78 90" fill="none" stroke="#5c3a21" strokeWidth="2.5" strokeLinecap="round" />
    ) : (
      <path d="M62 84 Q66 89 70 84 Q74 89 78 84" fill="none" stroke="#5c3a21" strokeWidth="2.5" strokeLinecap="round" />
    )}
  </svg>
);

// 勝利時のパステル虹 SVG
const PastelRainbow: React.FC = () => (
  <div className="rainbow-overlay" aria-hidden="true">
    <svg viewBox="0 0 600 320" width="100%" height="100%">
      <path d="M 40 300 A 260 260 0 0 1 560 300" fill="none" stroke="#ffadad" strokeWidth="22" strokeLinecap="round" />
      <path d="M 62 300 A 238 238 0 0 1 538 300" fill="none" stroke="#ffd6a5" strokeWidth="22" strokeLinecap="round" />
      <path d="M 84 300 A 216 216 0 0 1 516 300" fill="none" stroke="#fdffb6" strokeWidth="22" strokeLinecap="round" />
      <path d="M 106 300 A 194 194 0 0 1 494 300" fill="none" stroke="#caffbf" strokeWidth="22" strokeLinecap="round" />
      <path d="M 128 300 A 172 172 0 0 1 472 300" fill="none" stroke="#9bf6ff" strokeWidth="22" strokeLinecap="round" />
      <path d="M 150 300 A 150 150 0 0 1 450 300" fill="none" stroke="#bdb2ff" strokeWidth="22" strokeLinecap="round" />
      <path d="M 172 300 A 128 128 0 0 1 428 300" fill="none" stroke="#ffc6ff" strokeWidth="22" strokeLinecap="round" />
    </svg>
  </div>
);

// キラキラ舞う紙吹雪テープ
const GlitterConfetti: React.FC = () => {
  const pieces = useMemo(() => {
    const colors = [
      'linear-gradient(135deg, #ff758f, #ffb3c1)',
      'linear-gradient(135deg, #ffd166, #fff3b0)',
      'linear-gradient(135deg, #4cc9f0, #bde0fe)',
      'linear-gradient(135deg, #80ed99, #c7f9cc)',
      'linear-gradient(135deg, #c77dff, #e0aaff)',
      'linear-gradient(135deg, #ffffff, #ffe5ec)',
    ];
    return Array.from({ length: 48 }).map((_, idx) => ({
      id: idx,
      left: `${(idx * 2.1 + (idx % 7) * 3) % 100}%`,
      width: `${8 + (idx % 5) * 2}px`,
      height: `${18 + (idx % 4) * 5}px`,
      bg: colors[idx % colors.length],
      duration: `${2.6 + (idx % 5) * 0.45}s`,
      delay: `${(idx % 10) * 0.22}s`,
    }));
  }, []);

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-tape"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            background: p.bg,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
};

export function App() {
  const [pandaScore, setPandaScore] = useState<number>(0);
  const [tigerScore, setTigerScore] = useState<number>(0);
  const [roundNum, setRoundNum] = useState<number>(1);
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [pandaHand, setPandaHand] = useState<Hand | null>(null);
  const [tigerHand, setTigerHand] = useState<Hand | null>(null);
  const [lastOutcome, setLastOutcome] = useState<RoundOutcome>(null);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  const matchWinner: 'panda' | 'tiger' | null =
    pandaScore >= WIN_TARGET ? 'panda' : tigerScore >= WIN_TARGET ? 'tiger' : null;

  const judgeHand = (p: Hand, t: Hand): RoundOutcome => {
    if (p === t) return 'draw';
    if (
      (p === 'rock' && t === 'scissors') ||
      (p === 'scissors' && t === 'paper') ||
      (p === 'paper' && t === 'rock')
    ) {
      return 'panda';
    }
    return 'tiger';
  };

  const handlePlay = useCallback(
    (selectedHand: Hand) => {
      if (phase === 'shaking' || phase === 'matchEnd') return;

      playTone('tap', soundOn);
      setPhase('shaking');
      setPandaHand(null);
      setTigerHand(null);
      setLastOutcome(null);

      setTimeout(() => {
        const choices: Hand[] = ['rock', 'scissors', 'paper'];
        const cpuHand = choices[Math.floor(Math.random() * choices.length)];
        const outcome = judgeHand(selectedHand, cpuHand);

        setPandaHand(selectedHand);
        setTigerHand(cpuHand);
        setLastOutcome(outcome);

        let nextPanda = pandaScore;
        let nextTiger = tigerScore;

        if (outcome === 'panda') {
          nextPanda += 1;
          setPandaScore(nextPanda);
        } else if (outcome === 'tiger') {
          nextTiger += 1;
          setTigerScore(nextTiger);
        }

        if (nextPanda >= WIN_TARGET || nextTiger >= WIN_TARGET) {
          setPhase('matchEnd');
          playTone('fanfare', soundOn);
        } else {
          setPhase('roundResult');
          if (outcome === 'panda') playTone('win', soundOn);
          else if (outcome === 'tiger') playTone('lose', soundOn);
          else playTone('draw', soundOn);

          if (outcome !== 'draw') {
            setRoundNum((prev) => prev + 1);
          }
        }
      }, 650);
    },
    [phase, pandaScore, tigerScore, soundOn]
  );

  const resetGame = () => {
    playTone('tap', soundOn);
    setPandaScore(0);
    setTigerScore(0);
    setRoundNum(1);
    setPhase('ready');
    setPandaHand(null);
    setTigerHand(null);
    setLastOutcome(null);
  };

  const getHandOption = (hand: Hand | null) => HANDS.find((h) => h.id === hand);

  // キャラクターの表情判定
  const pandaMood: 'normal' | 'happy' | 'sad' =
    phase === 'matchEnd'
      ? matchWinner === 'panda'
        ? 'happy'
        : 'sad'
      : lastOutcome === 'panda'
      ? 'happy'
      : lastOutcome === 'tiger'
      ? 'sad'
      : 'normal';

  const tigerMood: 'normal' | 'happy' | 'sad' =
    phase === 'matchEnd'
      ? matchWinner === 'tiger'
        ? 'happy'
        : 'sad'
      : lastOutcome === 'tiger'
      ? 'happy'
      : lastOutcome === 'panda'
      ? 'sad'
      : 'normal';

  // ステータスメッセージ生成
  const getStatusMessage = () => {
    if (phase === 'shaking') {
      return {
        main: 'ジャン・ケン・ポン！',
        sub: 'どっちが勝つかな…？',
      };
    }
    if (phase === 'matchEnd') {
      return matchWinner === 'panda'
        ? {
            main: '🎉 パンダの優勝！！おめでとう！ 🎉',
            sub: 'きれいな虹とキラキラテープでお祝い！',
          }
        : {
            main: '🏆 トラの優勝！！やったね！ 🏆',
            sub: 'きれいな虹とキラキラテープでお祝い！',
          };
    }
    if (phase === 'roundResult') {
      if (lastOutcome === 'panda') {
        return {
          main: '✨ パンダの勝ち！1ポイントゲット！',
          sub: 'つぎの手をえらんでね！',
        };
      }
      if (lastOutcome === 'tiger') {
        return {
          main: '🔥 トラの勝ち！1ポイントゲット！',
          sub: 'つぎの手をえらんでね！',
        };
      }
      return {
        main: '🤝 あいこでしょ！',
        sub: 'もういちど手をえらんでね！',
      };
    }
    return {
      main: '3回勝負（2本先取）ジャンケン！',
      sub: '下のボタンからパンダの手をえらんでね',
    };
  };

  const status = getStatusMessage();

  return (
    <div className="app-wrapper">
      {/* 勝者が決まったら虹とキラキラテープが出現 */}
      {phase === 'matchEnd' && (
        <>
          <PastelRainbow />
          <GlitterConfetti />
        </>
      )}

      <main className="game-card">
        <button
          type="button"
          className="sound-toggle"
          onClick={() => setSoundOn((prev) => !prev)}
          title={soundOn ? '効果音オフ' : '効果音オン'}
          aria-label="効果音切り替え"
        >
          {soundOn ? '🔊' : '🔇'}
        </button>

        <header className="game-header">
          <h1 className="game-title">🐼 パンダ vs トラ ジャンケン 🐯</h1>
          <div className="round-badge">
            {phase === 'matchEnd' ? '✨ 決着！ ✨' : `第 ${roundNum} 回戦（2本先取）`}
          </div>
        </header>

        {/* スコアボード */}
        <section className="scoreboard" aria-label="スコアボード">
          <div className="player-score-box">
            <span className="player-name">🐼 パンダ（あなた）</span>
            <div className="stars-row">
              {[1, 2].map((star) => (
                <span
                  key={star}
                  className={`star-icon ${pandaScore >= star ? 'active' : 'inactive'}`}
                >
                  ⭐
                </span>
              ))}
            </div>
          </div>

          <div className="vs-badge">VS</div>

          <div className="player-score-box">
            <span className="player-name">🐯 トラ（あいて）</span>
            <div className="stars-row">
              {[1, 2].map((star) => (
                <span
                  key={star}
                  className={`star-icon ${tigerScore >= star ? 'active' : 'inactive'}`}
                >
                  ⭐
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 対戦ステージ */}
        <section className="battle-stage">
          {/* パンダ側 */}
          <div
            className={`fighter-card ${
              (phase === 'matchEnd' && matchWinner === 'panda') || lastOutcome === 'panda'
                ? 'winner'
                : ''
            }`}
          >
            <div
              className={`character-svg-wrap ${
                phase === 'shaking'
                  ? 'anim-shake'
                  : pandaMood === 'happy'
                  ? 'anim-bounce'
                  : 'anim-idle'
              }`}
            >
              <ChibiPanda mood={pandaMood} />
            </div>
            <div className="hand-bubble">
              {phase === 'shaking' ? (
                <span className="hand-emoji">✊</span>
              ) : pandaHand ? (
                <>
                  <span className="hand-emoji">{getHandOption(pandaHand)?.emoji}</span>
                  <span className="hand-label">{getHandOption(pandaHand)?.label}</span>
                </>
              ) : (
                <span className="hand-label">じゅんび中…</span>
              )}
            </div>
          </div>

          <div style={{ fontWeight: 800, color: '#90caf9', fontSize: '1.2rem' }}>⚡</div>

          {/* トラ側 */}
          <div
            className={`fighter-card ${
              (phase === 'matchEnd' && matchWinner === 'tiger') || lastOutcome === 'tiger'
                ? 'winner'
                : ''
            }`}
          >
            <div
              className={`character-svg-wrap ${
                phase === 'shaking'
                  ? 'anim-shake'
                  : tigerMood === 'happy'
                  ? 'anim-bounce'
                  : 'anim-idle'
              }`}
            >
              <ChibiTiger mood={tigerMood} />
            </div>
            <div className="hand-bubble">
              {phase === 'shaking' ? (
                <span className="hand-emoji">✊</span>
              ) : tigerHand ? (
                <>
                  <span className="hand-emoji">{getHandOption(tigerHand)?.emoji}</span>
                  <span className="hand-label">{getHandOption(tigerHand)?.label}</span>
                </>
              ) : (
                <span className="hand-label">じゅんび中…</span>
              )}
            </div>
          </div>
        </section>

        {/* メッセージ表示 */}
        <div className="status-banner" role="status" aria-live="polite">
          <div className="status-text">{status.main}</div>
          <div className="status-subtext">{status.sub}</div>
        </div>

        {/* 操作エリア */}
        {phase === 'matchEnd' ? (
          <button type="button" className="replay-btn" onClick={resetGame}>
            🌈 もういちど勝負する！
          </button>
        ) : (
          <div className="controls-grid">
            {HANDS.map((hand) => (
              <button
                key={hand.id}
                type="button"
                className={`hand-btn ${hand.id}`}
                disabled={phase === 'shaking'}
                onClick={() => handlePlay(hand.id)}
              >
                <span className="btn-emoji">{hand.emoji}</span>
                <span className="btn-name">{hand.label}</span>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;