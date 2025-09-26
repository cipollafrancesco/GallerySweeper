import { LinearGradient } from 'expo-linear-gradient';
import React, { createRef, useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueueProvider, useQueue } from './domain/queueManager';
import { EmptyDeck } from './features/deck/EmptyDeck';
import { SwipeDeck, SwipeDeckRef } from './features/deck/SwipeDeck';
import { Hud } from './features/hud/Hud';
import { OverlayManager } from './features/onboarding/OverlayManager';
import { Prefetcher } from './features/prefetch/Prefetcher';
import { ModalProvider } from './providers/ModalProvider';
import { theme } from './ui/theme';

const AppContent: React.FC = () => {
  const { queue, access, reload, ensureBuffer, keepTop, markTopForDeletion, hasNextPage, loading } = useQueue();
  const deckRef = createRef<SwipeDeckRef | null>();

  useEffect(() => {
    reload(false); // Continue from last position on app startup
  }, []);

  useEffect(() => {
    ensureBuffer();
  }, [queue.length]);

  const showDeck = access === 'all' || access === 'undetermined';
  const topAsset = queue[0];
  const prefetchUris = queue.slice(1, 5).map((asset) => asset.uri);
  const showEmptyDeck = !topAsset && !hasNextPage && !loading;

  // console.log('>>> ', { queue: queue.map((asset) => asset.filename), access, hasNextPage, loading })

  return (
    <LinearGradient
      colors={[theme.colors.backgroundStart, theme.colors.backgroundEnd]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.systemBackground} />
      {showDeck && topAsset && (
        <SwipeDeck ref={deckRef} asset={topAsset} onLeft={markTopForDeletion} onRight={keepTop} />
      )}
      {showEmptyDeck && <EmptyDeck onRefresh={() => reload(true)} />}
      {showDeck && <Hud deckRef={deckRef} />}
      {showDeck && <Prefetcher uris={prefetchUris} />}
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
});
