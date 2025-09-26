import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

interface PrefetcherProps {
    uris: string[];
}

export const Prefetcher: React.FC<PrefetcherProps> = ({ uris }) => {
    return (
        <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
            {uris.map((uri, index) => (
                <Image key={uri + index} source={{ uri }} style={{ width: 1, height: 1 }} />
            ))}
        </View>
    );
};
