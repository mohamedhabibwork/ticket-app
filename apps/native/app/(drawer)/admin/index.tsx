import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Spinner, Surface, Text, useThemeColor } from "heroui-native";
import { Link } from "expo-router";
import { View, Pressable } from "react-native";

import { Container } from "@/components/container";
import { hapticImpact } from "@/utils/haptics";
import { orpc } from "@/utils/orpc";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Surface variant="secondary" className="p-4 rounded-lg flex-1">
      <View className="flex-row items-center justify-between mb-2">
        <Ionicons name={icon as any} size={20} color={color} />
        <Text className="text-muted text-xs">{title}</Text>
      </View>
      <Text className="text-2xl font-semibold text-foreground">{value}</Text>
    </Surface>
  );
}

interface QuickLinkProps {
  title: string;
  subtitle: string;
  icon: string;
  href: string;
}

function QuickLink({ title, subtitle, icon, href }: QuickLinkProps) {
  const mutedColor = useThemeColor("muted");
  const foregroundColor = useThemeColor("foreground");

  return (
    <Link href={href} asChild>
      <Pressable onPress={() => hapticImpact("light")}>
        <Surface variant="secondary" className="p-4 rounded-lg">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center">
              <Ionicons name={icon as any} size={20} color={foregroundColor} />
            </View>
            <View className="flex-1">
              <Text className="text-foreground font-medium">{title}</Text>
              <Text className="text-muted text-xs">{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={mutedColor} />
          </View>
        </Surface>
      </Pressable>
    </Link>
  );
}

export default function AdminDashboardScreen() {
  const _mutedColor = useThemeColor("muted");
  const stats = useQuery(orpc.reports.getDashboardStats.queryOptions());

  return (
    <Container>
      <View className="p-4">
        <Text className="text-2xl font-semibold text-foreground tracking-tight mb-2">
          Admin Dashboard
        </Text>
        <Text className="text-muted text-sm mb-4">Manage your support platform</Text>

        {stats.isLoading && (
          <View className="items-center justify-center py-8">
            <Spinner size="lg" />
          </View>
        )}

        {!stats.isLoading && (
          <>
            <View className="flex-row gap-3 mb-4">
              <StatCard
                title="Total Tickets"
                value={stats.data?.totalTickets ?? 0}
                icon="ticket-outline"
                color="#3b82f6"
              />
              <StatCard
                title="Open"
                value={stats.data?.openTickets ?? 0}
                icon="alert-circle-outline"
                color="#f59e0b"
              />
            </View>

            <View className="flex-row gap-3 mb-4">
              <StatCard
                title="Agents"
                value={stats.data?.totalAgents ?? 0}
                icon="people-outline"
                color="#10b981"
              />
              <StatCard
                title="Responses"
                value={stats.data?.avgResponseTime ?? "—"}
                icon="timer-outline"
                color="#8b5cf6"
              />
            </View>

            <Text className="text-muted text-xs font-medium mb-2 px-1">QUICK ACTIONS</Text>
            <View className="gap-2">
              <QuickLink
                title="Team Management"
                subtitle="Manage support teams"
                icon="people-outline"
                href="/admin/teams"
              />
              <QuickLink
                title="User Management"
                subtitle="Manage users and permissions"
                icon="person-outline"
                href="/admin/users"
              />
              <QuickLink
                title="Reports"
                subtitle="View analytics and reports"
                icon="bar-chart-outline"
                href="/reports"
              />
              <QuickLink
                title="Settings"
                subtitle="Platform configuration"
                icon="settings-outline"
                href="/settings"
              />
            </View>
          </>
        )}
      </View>
    </Container>
  );
}
