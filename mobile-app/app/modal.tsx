import { Link } from 'expo-router';
import { View, Text } from 'react-native';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center p-5 bg-surface">
      <Text className="font-display text-2xl text-primary mb-4">This is a modal</Text>
      <Link href="/" dismissTo className="mt-4 py-4 px-6 bg-surface-container-low rounded-2xl">
        <Text className="font-headline text-secondary">Go to home screen</Text>
      </Link>
    </View>
  );
}
