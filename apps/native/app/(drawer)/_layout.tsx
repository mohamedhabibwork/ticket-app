import { Ionicons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import { useThemeColor } from "heroui-native";
import React, { useCallback } from "react";
import { Text } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";

function DrawerLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");

  const renderThemeToggle = useCallback(() => <ThemeToggle />, []);

  return (
    <Drawer
      screenOptions={{
        headerTintColor: themeColorForeground,
        headerStyle: { backgroundColor: themeColorBackground },
        headerTitleStyle: {
          fontWeight: "600",
          color: themeColorForeground,
        },
        headerRight: renderThemeToggle,
        drawerStyle: { backgroundColor: themeColorBackground },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerTitle: "Home",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Home</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="tickets"
        options={{
          headerTitle: "Tickets",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Tickets</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="ticket-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="chat"
        options={{
          headerTitle: "Chat",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Chat</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="chatbubbles-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="kb"
        options={{
          headerTitle: "Knowledge Base",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Knowledge Base</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="book-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="contacts"
        options={{
          headerTitle: "Contacts",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Contacts</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="people-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          headerTitle: "Profile",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Profile</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="person-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          headerTitle: "Settings",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Settings</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="settings-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="admin"
        options={{
          headerTitle: "Admin",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Admin</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="shield-checkmark-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="excel"
        options={{
          headerTitle: "Excel",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Excel</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="document-text-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
    </Drawer>
  );
}

export default DrawerLayout;
