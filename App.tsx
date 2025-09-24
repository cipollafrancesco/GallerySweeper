import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueueProvider, useQueue } from './domain/queueManager';
import { EmptyDeck } from './features/deck/EmptyDeck';
import { SwipeDeck } from './features/deck/SwipeDeck';
import { Hud } from './features/hud/Hud';
import { OverlayManager } from './features/onboarding/OverlayManager';
import { Prefetcher } from './features/prefetch/Prefetcher';
import { ModalProvider } from './providers/ModalProvider';

const AppContent: React.FC = () => {
  const { queue, access, loadInitial, ensureBuffer, keepTop, markTopForDeletion, hasNextPage, loading } = useQueue();

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    ensureBuffer();
  }, [queue.length]);

  const showDeck = access === 'all' || access === 'undetermined';
  const topAsset = queue[0];
  const prefetchUris = queue.slice(1, 5).map((asset) => asset.uri);
  const showEmptyDeck = !topAsset && !hasNextPage && !loading;

  return (
    <View style={styles.container}>
      {showDeck && topAsset && <SwipeDeck asset={topAsset} onLeft={markTopForDeletion} onRight={keepTop} />}
      {showEmptyDeck && <EmptyDeck onRefresh={loadInitial} />}
      {showDeck && <Hud />}
      {showDeck && <Prefetcher uris={prefetchUris} />}
      <OverlayManager />
    </View>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ModalProvider>
        <QueueProvider>
          <AppContent />
        </QueueProvider>
      </ModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
