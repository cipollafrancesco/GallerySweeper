import { LinearGradient } from 'expo-linear-gradient';
import React, { createRef, useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueueProvider, useQueue } from './domain/queueManager';
import { EmptyDeck } from './features/deck/EmptyDeck';
import { SwipeDeck, SwipeDeckRef } from './features/deck/SwipeDeck';
import { DuplicatesScreen } from './features/duplicates/DuplicatesScreen';
import { Hud } from './features/hud/Hud';
import { BottomTabBar, TabKey } from './features/navigation/BottomTabBar';
import { OverlayManager } from './features/onboarding/OverlayManager';
import { Prefetcher } from './features/prefetch/Prefetcher';
import { ModalProvider } from './providers/ModalProvider';
import { theme } from './ui/theme';

const AppContent: React.FC = () => {
  const { queue, access, reload, ensureBuffer, keepTop, markTopForDeletion, hasNextPage, loading } = useQueue();
  const deckRef = createRef<SwipeDeckRef | null>();

  const [tab, setTab] = useState<TabKey>('review');
  // Mount the Duplicates tab only on first visit so its scan doesn't run at
  // launch; keep it mounted afterwards so results survive tab switches.
  const [duplicatesMounted, setDuplicatesMounted] = useState(false);

  useEffect(() => {
    reload(false); // Continue from last position on app startup
  }, []);

  useEffect(() => {
    ensureBuffer();
  }, [queue.length]);

  useEffect(() => {
    if (tab === 'duplicates') setDuplicatesMounted(true);
  }, [tab]);

  const showDeck = access === 'all' || access === 'undetermined';
  const topAsset = queue[0];
  const prefetchUris = queue.slice(1, 5).map((asset) => asset.uri);
  const showEmptyDeck = !topAsset && !hasNextPage && !loading;

  return (
    <LinearGradient
      colors={[theme.colors.backgroundStart, theme.colors.backgroundEnd]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.systemBackground} />

      <View style={styles.content}>
        <View style={[styles.tabView, tab !== 'review' && styles.hidden]} pointerEvents={tab === 'review' ? 'auto' : 'none'}>
          {showDeck && topAsset && (
            <SwipeDeck ref={deckRef} asset={topAsset} onLeft={markTopForDeletion} onRight={keepTop} />
          )}
          {showEmptyDeck && <EmptyDeck onRefresh={() => reload(true)} />}
          {showDeck && <Hud deckRef={deckRef} />}
          {showDeck && <Prefetcher uris={prefetchUris} />}
        </View>

        {duplicatesMounted && (
          <View style={[styles.tabView, tab !== 'duplicates' && styles.hidden]} pointerEvents={tab === 'duplicates' ? 'auto' : 'none'}>
            <DuplicatesScreen />
          </View>
        )}
      </View>

      <BottomTabBar active={tab} onChange={setTab} />
      <OverlayManager />
    </LinearGradient>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ModalProvider>
          <QueueProvider>
            <AppContent />
          </QueueProvider>
        </ModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabView: {
    ...StyleSheet.absoluteFillObject,
  },
  hidden: {
    display: 'none',
  },
});
