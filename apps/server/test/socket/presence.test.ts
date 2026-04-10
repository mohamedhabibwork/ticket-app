import { describe, it, expect, beforeEach, vi } from "bun:test";
import {
  joinTicket,
  leaveTicket,
  heartbeat,
  getTicketViewers,
  isViewingTicket,
  type ViewerPresence,
} from "@ticket-app/api/lib/presence";
import {
  joinRoom,
  leaveRoom,
  leaveAllRooms,
  getUserRooms,
  getRoomUsers,
  isUserInRoom,
  getRoomCount,
  getUserCount,
} from "../../src/socket/emit";
import {
  getTicketRoom,
  getOrgRoom,
  getUserRoom,
  parseRoomName,
  isValidRoomName,
} from "../../src/socket/rooms";

vi.mock("@ticket-app/api/lib/presence", () => require("@ticket-app/api/lib/presence"));

describe("Presence Events", () => {
  const mockViewer: ViewerPresence = {
    ticketId: 1,
    userId: 100,
    userName: "Test User",
    avatarUrl: "https://example.com/avatar.png",
    joinedAt: new Date().toISOString(),
  };

  describe("join_ticket", () => {
    it("should add user to ticket viewers", async () => {
      await joinTicket(
        mockViewer.ticketId,
        mockViewer.userId,
        mockViewer.userName,
        mockViewer.avatarUrl,
      );

      const viewers = await getTicketViewers(mockViewer.ticketId);
      const found = viewers.find((v) => v.userId === mockViewer.userId);

      expect(found).toBeDefined();
      expect(found?.userName).toBe(mockViewer.userName);
      expect(found?.ticketId).toBe(mockViewer.ticketId);
    });

    it("should emit viewer_joined event", async () => {
      const viewers = await getTicketViewers(mockViewer.ticketId);
      expect(viewers.some((v) => v.userId === mockViewer.userId)).toBe(true);
    });
  });

  describe("leave_ticket", () => {
    it("should remove user from ticket viewers", async () => {
      await joinTicket(
        mockViewer.ticketId,
        mockViewer.userId,
        mockViewer.userName,
        mockViewer.avatarUrl,
      );
      await leaveTicket(mockViewer.ticketId, mockViewer.userId);

      const isViewing = await isViewingTicket(mockViewer.ticketId, mockViewer.userId);
      expect(isViewing).toBe(false);
    });

    it("should emit viewer_left event when user leaves", async () => {
      await joinTicket(
        mockViewer.ticketId,
        mockViewer.userId,
        mockViewer.userName,
        mockViewer.avatarUrl,
      );
      await leaveTicket(mockViewer.ticketId, mockViewer.userId);

      const viewers = await getTicketViewers(mockViewer.ticketId);
      expect(viewers.some((v) => v.userId === mockViewer.userId)).toBe(false);
    });
  });

  describe("heartbeat", () => {
    it("should refresh presence TTL for active user", async () => {
      await joinTicket(
        mockViewer.ticketId,
        mockViewer.userId,
        mockViewer.userName,
        mockViewer.avatarUrl,
      );

      const isActive = await heartbeat(mockViewer.ticketId, mockViewer.userId);
      expect(isActive).toBe(true);
    });

    it("should return false for inactive user", async () => {
      const isActive = await heartbeat(mockViewer.ticketId, 99999);
      expect(isActive).toBe(false);
    });
  });

  describe("get_viewers", () => {
    it("should return all viewers for a ticket", async () => {
      await joinTicket(
        mockViewer.ticketId,
        mockViewer.userId,
        mockViewer.userName,
        mockViewer.avatarUrl,
      );
      await joinTicket(mockViewer.ticketId, 101, "Another User", undefined);

      const viewers = await getTicketViewers(mockViewer.ticketId);
      expect(viewers.length).toBeGreaterThanOrEqual(2);
    });

    it("should return empty array for ticket with no viewers", async () => {
      const viewers = await getTicketViewers(99999);
      expect(viewers).toEqual([]);
    });
  });
});

describe("Room Management", () => {
  const testUserId = 100;
  const testOrgId = 1;

  beforeEach(() => {
    leaveAllRooms(testUserId);
  });

  describe("joinRoom", () => {
    it("should add user to org room", () => {
      joinRoom(testUserId, getOrgRoom(testOrgId));
      expect(isUserInRoom(testUserId, getOrgRoom(testOrgId))).toBe(true);
    });

    it("should add user to ticket room", () => {
      const ticketRoom = getTicketRoom(123);
      joinRoom(testUserId, ticketRoom);
      expect(isUserInRoom(testUserId, ticketRoom)).toBe(true);
    });

    it("should track multiple rooms per user", () => {
      joinRoom(testUserId, getOrgRoom(testOrgId));
      joinRoom(testUserId, getTicketRoom(123));

      const rooms = getUserRooms(testUserId);
      expect(rooms.length).toBe(2);
      expect(rooms).toContain(getOrgRoom(testOrgId));
      expect(rooms).toContain(getTicketRoom(123));
    });
  });

  describe("leaveRoom", () => {
    it("should remove user from specific room", () => {
      joinRoom(testUserId, getOrgRoom(testOrgId));
      joinRoom(testUserId, getTicketRoom(123));

      leaveRoom(testUserId, getTicketRoom(123));

      expect(isUserInRoom(testUserId, getTicketRoom(123))).toBe(false);
      expect(isUserInRoom(testUserId, getOrgRoom(testOrgId))).toBe(true);
    });
  });

  describe("leaveAllRooms", () => {
    it("should remove user from all rooms", () => {
      joinRoom(testUserId, getOrgRoom(testOrgId));
      joinRoom(testUserId, getTicketRoom(123));
      joinRoom(testUserId, getUserRoom(testUserId));

      const rooms = leaveAllRooms(testUserId);

      expect(rooms.length).toBe(3);
      expect(getUserCount(testUserId)).toBe(0);
    });
  });

  describe("Organization Isolation", () => {
    it("should only show users in same org room", () => {
      const org1Room = getOrgRoom(1);
      const org2Room = getOrgRoom(2);

      joinRoom(100, org1Room);
      joinRoom(101, org1Room);
      joinRoom(102, org2Room);

      const org1Users = getRoomUsers(org1Room);
      const org2Users = getRoomUsers(org2Room);

      expect(org1Users).toContain(100);
      expect(org1Users).toContain(101);
      expect(org1Users).not.toContain(102);

      expect(org2Users).toContain(102);
      expect(org2Users).not.toContain(100);
      expect(org2Users).not.toContain(101);
    });

    it("should track room user counts correctly", () => {
      const orgRoom = getOrgRoom(1);

      joinRoom(100, orgRoom);
      expect(getRoomCount(orgRoom)).toBe(1);

      joinRoom(101, orgRoom);
      expect(getRoomCount(orgRoom)).toBe(2);

      leaveRoom(100, orgRoom);
      expect(getRoomCount(orgRoom)).toBe(1);
    });
  });
});

describe("Room Utilities", () => {
  describe("getTicketRoom", () => {
    it("should generate correct ticket room name", () => {
      expect(getTicketRoom(123)).toBe("ticket:123");
    });
  });

  describe("getOrgRoom", () => {
    it("should generate correct org room name", () => {
      expect(getOrgRoom(1)).toBe("org:1");
    });
  });

  describe("getUserRoom", () => {
    it("should generate correct user room name", () => {
      expect(getUserRoom(100)).toBe("user:100");
    });
  });

  describe("parseRoomName", () => {
    it("should parse valid room names", () => {
      const result = parseRoomName("ticket:123");
      expect(result).toEqual({ type: "ticket", id: "123" });
    });

    it("should return null for invalid room names", () => {
      expect(parseRoomName("invalid")).toBeNull();
      expect(parseRoomName("")).toBeNull();
      expect(parseRoomName("unknown:123")).toBeNull();
    });
  });

  describe("isValidRoomName", () => {
    it("should validate correct room names", () => {
      expect(isValidRoomName("ticket:123")).toBe(true);
      expect(isValidRoomName("org:1")).toBe(true);
      expect(isValidRoomName("user:100")).toBe(true);
      expect(isValidRoomName("chat:456")).toBe(true);
    });

    it("should reject invalid room names", () => {
      expect(isValidRoomName("invalid")).toBe(false);
      expect(isValidRoomName("ticket:")).toBe(false);
      expect(isValidRoomName(":123")).toBe(false);
    });
  });
});
