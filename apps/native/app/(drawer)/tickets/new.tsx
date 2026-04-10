import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Select,
  SelectItem,
  Spinner,
  Surface,
  Text,
  TextField,
  Input,
  useThemeColor,
} from "heroui-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View, KeyboardAvoidingView, Platform } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact, hapticNotification } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

export default function CreateTicketScreen() {
  const router = useRouter();
  const _foregroundColor = useThemeColor("foreground");
  const _mutedColor = useThemeColor("muted");

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  const createMutation = useMutation(
    orpc.tickets.create.mutationOptions({
      onSuccess: (data) => {
        hapticNotification("success");
        router.push(`/tickets/${data.id}`);
      },
      onError: () => {
        hapticNotification("error");
      },
    }),
  );

  const handleSubmit = () => {
    if (subject.trim() && description.trim()) {
      hapticImpact("medium");
      createMutation.mutate({
        subject,
        description,
        priority: priority as "low" | "medium" | "high" | "urgent",
      });
    }
  };

  const handlePriorityChange = (newPriority: string) => {
    hapticImpact("light");
    setPriority(newPriority);
  };

  const isValid = subject.trim() && description.trim();

  return (
    <Container>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View className="flex-1 p-4">
          <View className="mb-6">
            <Text className="text-2xl font-semibold text-foreground tracking-tight">
              Create Ticket
            </Text>
            <Text className="text-muted text-sm mt-1">Submit a new support request</Text>
          </View>

          <Surface variant="secondary" className="p-4 rounded-lg mb-4">
            <Text className="text-foreground font-medium mb-2">Subject</Text>
            <TextField className="mb-4">
              <Input
                value={subject}
                onChangeText={setSubject}
                placeholder="Enter ticket subject..."
              />
            </TextField>

            <Text className="text-foreground font-medium mb-2">Description</Text>
            <TextField className="mb-4">
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your issue..."
                multiline
                numberOfLines={6}
              />
            </TextField>

            <Text className="text-foreground font-medium mb-2">Priority</Text>
            <Select
              selectedKeys={[priority]}
              onSelectionChange={(keys) => handlePriorityChange(Array.from(keys)[0] as string)}
              className="mb-4"
            >
              <SelectItem key="low">Low</SelectItem>
              <SelectItem key="medium">Medium</SelectItem>
              <SelectItem key="high">High</SelectItem>
              <SelectItem key="urgent">Urgent</SelectItem>
            </Select>
          </Surface>

          <Button
            variant="primary"
            onPress={handleSubmit}
            isDisabled={!isValid || createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? (
              <Spinner size="sm" color="default" />
            ) : (
              <Text className="text-foreground font-medium">Create Ticket</Text>
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
}
