import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Chip,
  Spinner,
  Surface,
  Text,
  TextField,
  Input,
  useThemeColor,
} from "heroui-native";
import { useState } from "react";
import { View, FlatList, Alert, Pressable } from "react-native";

import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

export default function UserManagementScreen() {
  const queryClient = useQueryClient();
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const users = useQuery(orpc.users.list.queryOptions());
  const inviteMutation = useMutation(
    orpc.users.invite.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users"] });
        setInviteEmail("");
        setShowInviteModal(false);
        Alert.alert("Success", "Invitation sent");
      },
      onError: (error) => {
        Alert.alert("Error", error.message || "Failed to send invitation");
      },
    }),
  );

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "danger";
      case "agent":
        return "primary";
      case "user":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "success";
      case "inactive":
        return "default";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const handleInvite = () => {
    if (inviteEmail.trim()) {
      inviteMutation.mutate({ email: inviteEmail, role: "agent" });
    }
  };

  return (
    <Container>
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-semibold text-foreground tracking-tight">
            Users
          </Text>
          <Button variant="primary" size="sm" onPress={() => setShowInviteModal(true)}>
            <Ionicons name="person-add-outline" size={18} color={foregroundColor} />
            <Text className="text-foreground font-medium ml-1">Invite</Text>
          </Button>
        </View>

        <Text className="text-muted text-sm mb-4">Manage platform users</Text>
      </View>

      {showInviteModal && (
        <View className="px-4 mb-4">
          <Surface variant="secondary" className="p-4 rounded-lg">
            <Text className="text-foreground font-medium mb-3">Invite New User</Text>
            <TextField className="mb-3">
              <Input
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </TextField>
            <View className="flex-row gap-2">
              <Button variant="secondary" onPress={() => setShowInviteModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleInvite}
                isDisabled={!inviteEmail.trim() || inviteMutation.isPending}
                className="flex-1"
              >
                {inviteMutation.isPending ? <Spinner size="sm" /> : "Send Invite"}
              </Button>
            </View>
          </Surface>
        </View>
      )}

      {users.isLoading && (
        <View className="flex-1 justify-center items-center">
          <Spinner size="lg" />
          <Text className="text-muted text-sm mt-3">Loading users...</Text>
        </View>
      )}

      {users.data && users.data.length === 0 && (
        <View className="px-4">
          <Surface variant="secondary" className="items-center justify-center py-10 rounded-lg">
            <Ionicons name="people-outline" size={40} color={mutedColor} />
            <Text className="text-foreground font-medium mt-3">No users yet</Text>
            <Text className="text-muted text-xs mt-1">Invite your first team member</Text>
          </Surface>
        </View>
      )}

      {users.data && users.data.length > 0 && (
        <FlatList
          data={users.data}
          keyExtractor={(item) => item.id.toString()}
          contentContainerClassName="px-4 pb-4"
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Pressable>
              <Surface variant="secondary" className="p-4 rounded-lg">
                <View className="flex-row items-center gap-3">
                  <View className="w-12 h-12 rounded-full bg-primary items-center justify-center">
                    <Text className="text-white font-medium">
                      {item.name?.charAt(0).toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-foreground font-medium">{item.name}</Text>
                      <Chip variant="flat" color={getRoleColor(item.role)} size="sm">
                        <Chip.Label className="text-xs">{item.role}</Chip.Label>
                      </Chip>
                    </View>
                    <Text className="text-muted text-sm">{item.email}</Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Chip variant="flat" color={getStatusColor(item.status)} size="sm">
                        <Chip.Label className="text-xs">{item.status}</Chip.Label>
                      </Chip>
                      {item.lastActive && (
                        <Text className="text-muted text-xs">
                          Active {new Date(item.lastActive).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="ellipsis-vertical" size={20} color={mutedColor} />
                </View>
              </Surface>
            </Pressable>
          )}
        />
      )}
    </Container>
  );
}
