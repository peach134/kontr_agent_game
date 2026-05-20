import { useMemo, useState } from 'react';
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
  const [screen, setScreen] = useState('start');
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [roundScore, setRoundScore] = useState(0);
  const [passedRoundScores, setPassedRoundScores] = useState({});

  const dataCheck = useMemo(() => validateGameData(), []);
  const currentRound = ROUNDS[currentRoundIndex];
  const currentQuestion = currentRound.questions[currentQuestionIndex];
  const finalScore = Object.values(passedRoundScores).reduce((sum, score) => sum + score, 0);

  const startGame = () => {
    setCurrentRoundIndex(0);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setRoundScore(0);
    setPassedRoundScores({});
    setScreen('roundIntro');
  };

  const startRound = (roundIndex = currentRoundIndex) => {
    setCurrentRoundIndex(roundIndex);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setRoundScore(0);
    setScreen('question');
  };

  const handleAnswer = (answer) => {
    if (selectedAnswer) {
      return;
    }

    setSelectedAnswer(answer);
    if (answer === currentQuestion.correctAnswer) {
      setRoundScore((score) => score + 1);
    }
  };

  const goNext = () => {
    if (currentQuestionIndex < QUESTIONS_PER_ROUND - 1) {
      setCurrentQuestionIndex((index) => index + 1);
      setSelectedAnswer(null);
      return;
    }

    setScreen('roundResult');
  };

  const goNextRound = () => {
    const successfulScores = {
      ...passedRoundScores,
      [currentRound.id]: roundScore,
    };

    setPassedRoundScores(successfulScores);

    if (currentRoundIndex === ROUNDS.length - 1) {
      setScreen('final');
      return;
    }

    setCurrentRoundIndex((index) => index + 1);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setRoundScore(0);
    setScreen('roundIntro');
  };

  const repeatCurrentRound = () => {
    startRound(currentRoundIndex);
  };

  const repeatLastRound = () => {
    const lastRoundIndex = ROUNDS.length - 1;
    const updatedScores = { ...passedRoundScores };
    delete updatedScores[ROUNDS[lastRoundIndex].id];
    setPassedRoundScores(updatedScores);
    startRound(lastRoundIndex);
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
