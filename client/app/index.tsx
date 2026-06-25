import { Button, Text, View } from "react-native";
import { useAuth } from "../src/auth/AuthContext";

export default function Index() {
  const { user, signOut } = useAuth();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "600" }}>
        Welcome, {user?.name}
      </Text>
      <Text style={{ color: "#666" }}>
        {user?.role} · {user?.userPoints} pts · Tier {user?.tier}
      </Text>
      <Button title="Sign out" onPress={signOut} />
    </View>
  );
}
