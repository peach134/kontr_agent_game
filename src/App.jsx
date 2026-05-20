import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  FileSearch,
  Flag,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { ANSWER_OPTIONS, FINAL_RANKS, GAME_RULE, ROUNDS, validateGameData } from './data/gameData.js';

const PASS_SCORE = 5;
const QUESTIONS_PER_ROUND = 10;
const STORAGE_KEY = 'counterparty-risk-game-state-v1';
const VALID_SCREENS = new Set(['start', 'roundIntro', 'question', 'roundResult', 'final']);
const VALID_ANSWERS = new Set(ANSWER_OPTIONS.map((option) => option.label));

function createInitialGameState() {
  return {
    screen: 'start',
    currentRoundIndex: 0,
    currentQuestionIndex: 0,
    selectedAnswer: null,
    roundScore: 0,
    passedRoundScores: {},
  };
}

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function sanitizePassedScores(passedRoundScores) {
  if (!passedRoundScores || typeof passedRoundScores !== 'object' || Array.isArray(passedRoundScores)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(passedRoundScores).filter(([roundId, score]) => {
      const knownRound = ROUNDS.some((round) => String(round.id) === String(roundId));
      return knownRound && isIntegerInRange(score, PASS_SCORE, QUESTIONS_PER_ROUND);
    }),
  );
}

function normalizeSavedGameState(value) {
  if (!value || typeof value !== 'object') {
    return createInitialGameState();
  }

  const state = {
    screen: VALID_SCREENS.has(value.screen) ? value.screen : 'start',
    currentRoundIndex: isIntegerInRange(value.currentRoundIndex, 0, ROUNDS.length - 1) ? value.currentRoundIndex : 0,
    currentQuestionIndex: isIntegerInRange(value.currentQuestionIndex, 0, QUESTIONS_PER_ROUND - 1)
      ? value.currentQuestionIndex
      : 0,
    selectedAnswer: value.selectedAnswer === null || VALID_ANSWERS.has(value.selectedAnswer) ? value.selectedAnswer : null,
    roundScore: isIntegerInRange(value.roundScore, 0, QUESTIONS_PER_ROUND) ? value.roundScore : 0,
    passedRoundScores: sanitizePassedScores(value.passedRoundScores),
  };

  if (state.screen === 'final' && Object.keys(state.passedRoundScores).length < ROUNDS.length) {
    return createInitialGameState();
  }

  return state;
}

function getGameStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function readGameCookie() {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${STORAGE_KEY}=`));

  if (!cookie) {
    return null;
  }

  try {
    return decodeURIComponent(cookie.slice(STORAGE_KEY.length + 1));
  } catch {
    return null;
  }
}

function writeGameCookie(value) {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(value)}; max-age=2592000; path=/; SameSite=Lax`;
}

function readSavedGameState() {
  const storage = getGameStorage();

  if (storage) {
    try {
      const value = storage.getItem(STORAGE_KEY);

      if (value) {
        return value;
      }
    } catch {
      return readGameCookie();
    }
  }

  return readGameCookie();
}

function writeSavedGameState(value) {
  const storage = getGameStorage();

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, value);
      return;
    } catch {
      writeGameCookie(value);
      return;
    }
  }

  writeGameCookie(value);
}

function loadSavedGameState() {
  try {
    return normalizeSavedGameState(JSON.parse(readSavedGameState()));
  } catch {
    return createInitialGameState();
  }
}

function getRoundResult(score) {
  if (score <= 4) {
    return {
      passed: false,
      label: 'Раунд не пройден',
      text: 'Пока рано переходить дальше. Повтори признаки риска и попробуй ещё раз.',
    };
  }

  if (score <= 7) {
    return {
      passed: true,
      label: 'Раунд пройден',
      text: 'Неплохо! Ты прошёл раунд, но в спорных ситуациях ещё можно ошибиться.',
    };
  }

  if (score <= 9) {
    return {
      passed: true,
      label: 'Раунд пройден хорошо',
      text: 'Отлично! Ты уверенно распознаёшь признаки риска.',
    };
  }

  return {
    passed: true,
    label: 'Идеальный раунд',
    text: 'Идеально! Раунд пройден без ошибок.',
  };
}

function getRank(totalScore) {
  return FINAL_RANKS.find((rank) => totalScore >= rank.min && totalScore <= rank.max) ?? FINAL_RANKS[0];
}

function App() {
  const [gameState, setGameState] = useState(loadSavedGameState);
  const { screen, currentRoundIndex, currentQuestionIndex, selectedAnswer, roundScore, passedRoundScores } = gameState;

  const dataCheck = useMemo(() => validateGameData(), []);
  const currentRound = ROUNDS[currentRoundIndex];
  const currentQuestion = currentRound.questions[currentQuestionIndex];
  const finalScore = Object.values(passedRoundScores).reduce((sum, score) => sum + score, 0);

  useEffect(() => {
    try {
      writeSavedGameState(JSON.stringify(gameState));
    } catch {
      // If a browser blocks all client storage, the game should still work normally for the current session.
    }
  }, [gameState]);

  const startGame = () => {
    setGameState({
      ...createInitialGameState(),
      screen: 'roundIntro',
    });
  };

  const startRound = (roundIndex = currentRoundIndex) => {
    setGameState((state) => ({
      ...state,
      screen: 'question',
      currentRoundIndex: roundIndex,
      currentQuestionIndex: 0,
      selectedAnswer: null,
      roundScore: 0,
    }));
  };

  const handleAnswer = (answer) => {
    if (selectedAnswer) {
      return;
    }

    setGameState((state) => ({
      ...state,
      selectedAnswer: answer,
      roundScore: answer === currentQuestion.correctAnswer ? state.roundScore + 1 : state.roundScore,
    }));
  };

  const goNext = () => {
    if (currentQuestionIndex < QUESTIONS_PER_ROUND - 1) {
      setGameState((state) => ({
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        selectedAnswer: null,
      }));
      return;
    }

    setGameState((state) => ({
      ...state,
      screen: 'roundResult',
    }));
  };

  const goNextRound = () => {
    const successfulScores = {
      ...passedRoundScores,
      [currentRound.id]: roundScore,
    };

    if (currentRoundIndex === ROUNDS.length - 1) {
      setGameState((state) => ({
        ...state,
        screen: 'final',
        passedRoundScores: successfulScores,
      }));
      return;
    }

    setGameState((state) => ({
      ...state,
      screen: 'roundIntro',
      currentRoundIndex: state.currentRoundIndex + 1,
      currentQuestionIndex: 0,
      selectedAnswer: null,
      roundScore: 0,
      passedRoundScores: successfulScores,
    }));
  };

  const repeatCurrentRound = () => {
    startRound(currentRoundIndex);
  };

  const repeatLastRound = () => {
    const lastRoundIndex = ROUNDS.length - 1;
    const updatedScores = { ...passedRoundScores };
    delete updatedScores[ROUNDS[lastRoundIndex].id];
    setGameState((state) => ({
      ...state,
      screen: 'question',
      currentRoundIndex: lastRoundIndex,
      currentQuestionIndex: 0,
      selectedAnswer: null,
      roundScore: 0,
      passedRoundScores: updatedScores,
    }));
  };

  return (
    <main className="app-shell">
      <div className="background-grid" aria-hidden="true" />
      <section className="game-stage">
        {screen === 'start' && <StartScreen dataCheck={dataCheck} onStart={startGame} />}
        {screen === 'roundIntro' && <RoundIntroScreen round={currentRound} onStart={() => startRound()} />}
        {screen === 'question' && (
          <QuestionScreen
            question={currentQuestion}
            round={currentRound}
            questionIndex={currentQuestionIndex}
            score={roundScore}
            selectedAnswer={selectedAnswer}
            onAnswer={handleAnswer}
            onNext={goNext}
          />
        )}
        {screen === 'roundResult' && (
          <RoundResultScreen
            round={currentRound}
            score={roundScore}
            onRepeat={repeatCurrentRound}
            onNextRound={goNextRound}
          />
        )}
        {screen === 'final' && (
          <FinalScreen
            totalScore={finalScore}
            onRestart={startGame}
            onRepeatLastRound={repeatLastRound}
          />
        )}
      </section>
    </main>
  );
}

function StartScreen({ dataCheck, onStart }) {
  const allDataValid =
    dataCheck.hasFourRounds &&
    dataCheck.invalidAnswers.length === 0 &&
    dataCheck.roundQuestionCounts.every((round) => round.valid);

  return (
    <div className="screen start-screen fade-in">
      <div className="eyebrow">
        <ShieldCheck size={18} />
        Учебная мини-игра
      </div>
      <div className="hero-layout">
        <div className="hero-copy">
          <h1>Красный флаг или рабочая ситуация?</h1>
          <p className="subtitle">Мини-игра по проверке контрагентов и налоговым рискам</p>
          <p className="intro">
            Пройди четыре раунда и потренируйся оценивать ситуации, которые могут встретиться при выборе
            контрагента.
          </p>
          <div className="notice">
            <AlertTriangle size={20} />
            <p>{GAME_RULE}</p>
          </div>
          <button className="primary-button" type="button" onClick={onStart}>
            Начать игру
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="rules-panel">
          <div className="panel-header">
            <BookOpenCheck size={22} />
            <h2>Правила игры</h2>
          </div>
          <p>
            В каждом раунде 10 вопросов. Выберите один из четырёх вариантов оценки. После ответа появится
            объяснение, а переход к следующему раунду откроется с 5 баллов из 10.
          </p>
          <div className="data-status data-status-ok">
            <CheckCircle2 size={18} />
            {allDataValid ? 'Проверено: 4 раунда по 10 вопросов' : 'Нужно проверить данные вопросов'}
          </div>
        </div>
      </div>

      <div className="answer-guide">
        {ANSWER_OPTIONS.map((option, index) => (
          <article className="guide-card" key={option.label}>
            <span className="guide-number">{index + 1}</span>
            <h3>{option.label}</h3>
            <p>{option.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function RoundIntroScreen({ round, onStart }) {
  return (
    <div className="screen centered-screen fade-in">
      <div className="round-kicker">
        <Flag size={20} />
        Раунд {round.id} из {ROUNDS.length}
      </div>
      <h1>{round.title}</h1>
      <p className="round-description">{round.difficultyDescription}</p>
      <div className="round-meta">
        <span>10 вопросов</span>
        <span>Проходной балл: 5 из 10</span>
      </div>
      <button className="primary-button" type="button" onClick={onStart}>
        Начать раунд
        <ArrowRight size={20} />
      </button>
    </div>
  );
}

function QuestionScreen({ question, round, questionIndex, score, selectedAnswer, onAnswer, onNext }) {
  const isAnswered = Boolean(selectedAnswer);
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <div className="screen question-screen fade-in">
      <header className="question-header">
        <div>
          <p className="round-name">Раунд {round.id} — {round.title}</p>
          <h1>Вопрос {questionIndex + 1} из {QUESTIONS_PER_ROUND}</h1>
        </div>
        <div className="score-pill">
          <ShieldCheck size={18} />
          {score} / {QUESTIONS_PER_ROUND}
        </div>
      </header>

      <ProgressBar value={questionIndex + (isAnswered ? 1 : 0)} max={QUESTIONS_PER_ROUND} />

      <article className="question-card">
        <div className="question-title">
          <CircleHelp size={22} />
          <h2>{question.title}</h2>
        </div>
        <p>{question.situation}</p>
      </article>

      <div className="answers-grid">
        {ANSWER_OPTIONS.map((option) => (
          <AnswerButton
            key={option.label}
            option={option}
            selectedAnswer={selectedAnswer}
            correctAnswer={question.correctAnswer}
            onClick={() => onAnswer(option.label)}
          />
        ))}
      </div>

      {isAnswered && (
        <section className={`feedback-card ${isCorrect ? 'feedback-good' : 'feedback-bad'}`}>
          <div className="feedback-title">
            {isCorrect ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
            <h2>{isCorrect ? 'Верно' : 'Не совсем'}</h2>
          </div>
          <p>
            Правильный ответ: <strong>{question.correctAnswer}</strong>
          </p>
          <p>{question.explanation}</p>
          <button className="primary-button compact-button" type="button" onClick={onNext}>
            Дальше
            <ArrowRight size={20} />
          </button>
        </section>
      )}
    </div>
  );
}

function AnswerButton({ option, selectedAnswer, correctAnswer, onClick }) {
  const isAnswered = Boolean(selectedAnswer);
  const isSelected = selectedAnswer === option.label;
  const isCorrect = correctAnswer === option.label;
  const stateClass = isAnswered && isCorrect ? 'answer-correct' : isAnswered && isSelected ? 'answer-wrong' : '';

  return (
    <button className={`answer-button ${stateClass}`} type="button" disabled={isAnswered} onClick={onClick}>
      <span>{option.label}</span>
      {isAnswered && isCorrect && <CheckCircle2 size={20} />}
      {isAnswered && isSelected && !isCorrect && <XCircle size={20} />}
    </button>
  );
}

function ProgressBar({ value, max }) {
  const percent = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="progress-shell" aria-label={`Прогресс раунда: ${percent}%`}>
      <div className="progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

function RoundResultScreen({ round, score, onRepeat, onNextRound }) {
  const result = getRoundResult(score);

  return (
    <div className="screen centered-screen fade-in">
      <div className={`result-icon ${result.passed ? 'result-icon-good' : 'result-icon-bad'}`}>
        {result.passed ? <Award size={34} /> : <RotateCcw size={34} />}
      </div>
      <p className="round-name">Раунд {round.id} — {round.title}</p>
      <h1>{score} из 10</h1>
      <h2>{result.label}</h2>
      <p className="round-description">{result.text}</p>
      <div className="result-actions">
        {!result.passed && (
          <button className="primary-button" type="button" onClick={onRepeat}>
            Повторить раунд
            <RotateCcw size={20} />
          </button>
        )}
        {result.passed && (
          <button className="primary-button" type="button" onClick={onNextRound}>
            {round.id === ROUNDS.length ? 'К финалу' : 'Перейти к следующему раунду'}
            <ArrowRight size={20} />
          </button>
        )}
      </div>
      {score < PASS_SCORE && <p className="locked-note">Переход дальше откроется после 5 правильных ответов.</p>}
    </div>
  );
}

function FinalScreen({ totalScore, onRestart, onRepeatLastRound }) {
  const rank = getRank(totalScore);
  const isSherlock = rank.title === 'Налоговый Шерлок';

  return (
    <div className="screen final-screen fade-in">
      <div className="final-badge">
        <Sparkles size={28} />
        Финал
      </div>
      <h1>{totalScore} из 40</h1>
      <div className="rank-card">
        <FileSearch size={30} />
        <div>
          <p>Твоё звание</p>
          <h2>{rank.title}</h2>
        </div>
      </div>
      <p className="rank-message">{rank.message}</p>
      <div className="final-message">
        <p>
          Поздравляем! Ты прошёл все 4 раунда игры “Красный флаг или рабочая ситуация?”. Теперь ты не просто
          слушатель презентации, а настоящий специалист по выявлению рискованных признаков контрагента.
        </p>
        <p>
          Ты научился замечать массовые адреса, сомнительные условия сделки, отсутствие ресурсов, несоответствие
          деятельности и другие признаки, которые могут привести к налоговым рискам.
        </p>
        <p>
          Главное правило: контрагента нельзя оценивать по одному признаку. Надёжный вывод появляется только при
          проверке совокупности обстоятельств: документов, ресурсов, деловой цели, условий сделки и реальности
          исполнения.
        </p>
        {isSherlock && <p className="sherlock-line">Великолепный результат! Ты настоящий Налоговый Шерлок.</p>}
      </div>
      <div className="final-actions">
        <button className="primary-button" type="button" onClick={onRestart}>
          Пройти игру заново
          <RotateCcw size={20} />
        </button>
        <button className="secondary-button" type="button" onClick={onRepeatLastRound}>
          Повторить последний раунд
        </button>
      </div>
    </div>
  );
}

export default App;
