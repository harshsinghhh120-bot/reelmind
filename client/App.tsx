import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, SafeAreaView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FocusProvider, FocusScope, useFocusSystem, Direction } from './lib/focus';
import { consumeVoiceQuery, enableKeyEvents, onKeyEvent } from 'reelmind-remote';
import { chat, Progress, Reply } from './lib/api';
import { colors } from './theme/tv';
import { keyOf, ProgressMap, Screen, TITLES } from './state/types';
import { HomeScreen } from './screens/HomeScreen';
import { AskScreen } from './screens/AskScreen';
import { BriefingScreen } from './screens/BriefingScreen';
import { QuizScreen } from './screens/QuizScreen';
import { ExplainScreen } from './screens/ExplainScreen';
import { WatchPartyScreen } from './screens/WatchPartyScreen';

const EMPTY_REPLY: Reply = { kind: 'answer', text: '' };

function AppInner() {
  const { manager } = useFocusSystem();
  const [stack, setStack] = useState<Screen[]>([{ name: 'home' }]);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const topIndex = stack.length - 1;
  const top = stack[topIndex];
  const currentTitle: string =
    top.name === 'ask' || top.name === 'briefing' || top.name === 'quiz' || top.name === 'watchparty'
      ? top.title
      : 'General';

  // --- navigation -----------------------------------------------------------

  const go = useCallback((screen: Screen) => {
    setStack((s) => [...s, screen]);
  }, []);

  const pop = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ name: 'home' }]));
  }, []);

  // --- agent flows ----------------------------------------------------------

  const askBriefing = useCallback(
    async (title: string, voiceMessage?: string) => {
      const t = title || 'General';
      go({ name: 'briefing', title: t, reply: EMPTY_REPLY });
      const message = voiceMessage ?? `What's this: ${t}? Give me the briefing.`;
      const reply = await chat(message);
      setStack((s) => {
        const i = s.findIndex(
          (x) => x.name === 'briefing' && x.title === t && x.reply.text === '' && !x.reply.sections,
        );
        if (i === -1) return s;
        const next = [...s];
        next[i] = { name: 'briefing', title: t, reply };
        return next;
      });
    },
    [go],
  );

  const askQuiz = useCallback(
    async (topic: string) => {
      const reply = await chat(`Pop quiz about ${topic}! 3 questions, medium.`);
      if (reply.quiz) {
        go({ name: 'quiz', title: topic, quiz: reply.quiz });
      } else {
        go({ name: 'ask', title: topic, initialMessage: `Give me a pop quiz about ${topic}!` });
      }
    },
    [go],
  );

  // --- input: remote keys ----------------------------------------------------

  const handleKey = useCallback(
    (key: string) => {
      if (key === 'back') {
        pop();
        return;
      }
      if (key === 'enter') {
        manager.select();
        return;
      }
      manager.move(key as Direction);
    },
    [manager, pop],
  );

  const handleKeyRef = useRef(handleKey);
  handleKeyRef.current = handleKey;

  useEffect(() => {
    enableKeyEvents();
    const sub = onKeyEvent((ev) => handleKeyRef.current(ev.key));
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      pop();
      return true; // absorb: the TV menu can still leave the app
    });
    return () => {
      sub.remove();
      backSub.remove();
    };
  }, [manager, pop]);

  // --- input: voice (Fire OS custom voice intent) ----------------------------

  const handleVoice = useCallback(
    (text: string) => {
      const lower = text.toLowerCase();
      const title = TITLES.find((t) => lower.includes(t.toLowerCase())) ?? currentTitle;
      go({ name: 'ask', title: title || 'General', initialMessage: text });
    },
    [currentTitle, go],
  );

  const handleVoiceRef = useRef(handleVoice);
  handleVoiceRef.current = handleVoice;

  const checkVoice = useCallback(() => {
    const q = consumeVoiceQuery();
    if (q) handleVoiceRef.current(q);
  }, []);

  useEffect(() => {
    checkVoice();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkVoice();
    });
    return () => sub.remove();
  }, [checkVoice]);

  // --- progress map -----------------------------------------------------------

  const rememberProgress = useCallback((p: Progress) => {
    setProgressMap((m) => ({ ...m, [keyOf(p.title)]: p }));
  }, []);

  const progressFor = (title: string) => progressMap[keyOf(title)];

  // --- render ----------------------------------------------------------------

  const renderScreen = (screen: Screen, index: number) => {
    switch (screen.name) {
      case 'home':
        return (
          <HomeScreen
            onPickTitle={(t) => {
              if (t) void askBriefing(t);
              else
                go({
                  name: 'ask',
                  title: 'General',
                  initialMessage:
                    "I'm watching something that isn't on your list. Tell me the title and I'll brief you on it.",
                });
            }}
            onAction={(a) => {
              if (a === 'ask') go({ name: 'ask', title: currentTitle });
              if (a === 'quiz') void askQuiz(currentTitle);
              if (a === 'explain') go({ name: 'explain' });
              if (a === 'watchparty') go({ name: 'watchparty', title: currentTitle });
            }}
          />
        );
      case 'ask':
        return (
          <AskScreen
            title={screen.title}
            initialMessage={screen.initialMessage}
            progress={progressFor(screen.title)}
            onOpenQuiz={(quiz) => go({ name: 'quiz', title: screen.title, quiz })}
            onProgress={rememberProgress}
            onOpenParty={() => go({ name: 'watchparty', title: screen.title })}
          />
        );
      case 'briefing':
        return (
          <BriefingScreen
            title={screen.title}
            reply={screen.reply}
            loading={screen.reply.text === '' && !screen.reply.sections}
            onAsk={() => go({ name: 'ask', title: screen.title })}
            onQuiz={() => void askQuiz(screen.title)}
            onExplain={() => go({ name: 'explain' })}
            onParty={() => go({ name: 'watchparty', title: screen.title })}
          />
        );
      case 'quiz':
        return (
          <QuizScreen
            title={screen.title}
            quiz={screen.quiz}
            onRegenerate={() => void askQuiz(screen.title)}
            onExit={() => pop()}
          />
        );
      case 'explain':
        return <ExplainScreen />;
      case 'watchparty':
        return (
          <WatchPartyScreen title={screen.title} progress={progressFor(screen.title)} />
        );
    }
  };

  // Whole stack stays mounted (state survives navigation); only the top screen
  // is visible and only the top screen participates in the focus grid.
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" />
        {stack.map((screen, i) => (
          <View key={`screen-${i}`} style={{ flex: 1, display: i === topIndex ? 'flex' : 'none' }}>
            <FocusScope active={i === topIndex}>{renderScreen(screen, i)}</FocusScope>
          </View>
        ))}
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  return (
    <FocusProvider>
      <AppInner />
    </FocusProvider>
  );
}
