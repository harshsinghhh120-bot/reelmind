import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Spinner } from '../components/Spinner';
import { Chip, ChipRow } from '../components/Chip';
import { chat, Quiz, QuizResult } from '../lib/api';
import { Focusable } from '../lib/focus';
import { colors, sizes } from '../theme/tv';

type Phase = 'question' | 'answering' | 'result' | 'done';

export function QuizScreen({
  title,
  quiz,
  onRegenerate,
  onExit,
}: {
  title: string;
  quiz: Quiz;
  onRegenerate: () => void;
  onExit: () => void;
}) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [result, setResult] = useState<QuizResult | null>(null);
  const q = quiz.questions[i];
  const total = quiz.questions.length;

  const answer = async (choice: string) => {
    if (phase !== 'question') return;
    setPhase('answering');
    const reply = await chat(
      `Quiz answer for "${q.question}"`,
      'quiz_answer',
      { question_id: q.id, choice },
    );
    if (reply.quiz_result) {
      setResult(reply.quiz_result);
      if (reply.quiz_result.correct) setScore((s) => s + 1);
      setPhase('result');
    } else {
      setResult({ correct: false, explanation: reply.text });
      setPhase('result');
    }
  };

  const next = () => {
    if (i + 1 < total) {
      setI(i + 1);
      setResult(null);
      setPhase('question');
    } else {
      setPhase('done');
    }
  };

  if (phase === 'done') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textDim, fontSize: sizes.title, fontWeight: '700' }}>{quiz.topic}</Text>
        <Text style={{ color: colors.accent, fontSize: 72, fontWeight: '800', marginVertical: 24 }}>
          {score} / {total}
        </Text>
        <Text style={{ color: colors.text, fontSize: sizes.body, marginBottom: 40 }}>
          {score === total ? 'Flawless. The couch is in your debt.' : score >= total / 2 ? 'Respectable. The remote stays where it is.' : 'The couch wins this round. Revenge quiz available.'}
        </Text>
        <ChipRow row={1}>
          <Chip id="qz-replay" row={1} col={0} label="Play again" onEnter={onRegenerate} />
          <Chip id="qz-done" row={1} col={1} label="Back to the show" onEnter={onExit} />
        </ChipRow>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: sizes.title, fontWeight: '800' }}>
          Pop quiz: {quiz.topic}
        </Text>
        <Text style={{ color: colors.textDim, fontSize: sizes.body }}>
          {quiz.difficulty} · Q{i + 1}/{total} · Score {score}
        </Text>
      </View>

      {/* Question */}
      <View>
        <Text style={{ color: colors.text, fontSize: sizes.title, fontWeight: '700', marginBottom: 26 }}>
          {q.question}
        </Text>
        {phase === 'answering' ? (
          <Spinner label="Grading…" />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
            {q.options.map((opt, oi) => {
              const row = 2 + Math.floor(oi / 2);
              const col = oi % 2;
              let state: 'normal' | 'correct' | 'wrong' | 'missed' = 'normal';
              if (phase === 'result' && result) {
                if (oi === q.correct_index) state = 'correct';
                else if (opt === result.correct_answer && oi !== q.correct_index) state = 'normal';
                else state = 'wrong';
              }
              return (
                <Focusable
                  key={oi}
                  id={`opt-${oi}`}
                  row={row}
                  col={col}
                  onEnter={() => void answer(opt)}
                  style={{
                    flexBasis: '48%',
                    flexGrow: 1,
                    backgroundColor:
                      state === 'correct' ? '#123524' : state === 'wrong' ? '#3A1520' : colors.bgCard,
                    borderRadius: 16,
                    padding: sizes.cardPad,
                    marginRight: 20,
                  }}
                  focusStyle={{
                    backgroundColor: state === 'correct' ? '#174A30' : state === 'wrong' ? '#4A1A28' : colors.bgElevated,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: sizes.body, fontWeight: '600' }}>
                    {String.fromCharCode(65 + oi)}. {opt}
                  </Text>
                </Focusable>
              );
            })}
          </View>
        )}
      </View>

      {/* Result / next */}
      <View style={{ minHeight: 92 }}>
        {phase === 'result' && result ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24 }}>
            <Text style={{ color: result.correct ? colors.ok : colors.bad, fontSize: sizes.body, fontWeight: '800' }}>
              {result.correct ? '✓ Correct!' : '✗ Not quite.'}
            </Text>
            {(result.explanation || result.correct_answer) && (
              <Text style={{ color: colors.textDim, fontSize: sizes.body, flexShrink: 1 }} numberOfLines={2}>
                {result.explanation || `It's ${result.correct_answer}.`}
              </Text>
            )}
            <Chip id="qz-next" row={4} col={0} label={i + 1 < total ? 'Next question ▸' : 'See score ▸'} onEnter={next} />
          </View>
        ) : (
          <Text style={{ color: colors.textDim, fontSize: sizes.small }}>
            Pick an answer with the remote — A–D or the text.
          </Text>
        )}
      </View>
    </View>
  );
}
