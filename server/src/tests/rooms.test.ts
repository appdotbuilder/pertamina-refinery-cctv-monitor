import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { buildingsTable, roomsTable, cctvTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { 
  getRooms, 
  getRoomById, 
  getRoomsByBuildingId, 
  createRoom, 
  updateRoom, 
  deleteRoom 
} from '../handlers/rooms';
import { type CreateRoomInput, type UpdateRoomInput } from '../schema';

// Test data
const testBuilding = {
  name: 'Test Building',
  address: '123 Test Street',
  latitude: 40.7128,
  longitude: -74.0060
};

const testRoom: CreateRoomInput = {
  building_id: 1, // Will be set after building creation
  name: 'Conference Room A',
  floor: 2
};

describe('Room Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getRooms', () => {
    it('should return empty array when no rooms exist', async () => {
      const result = await getRooms();
      expect(result).toEqual([]);
    });

    it('should return all rooms', async () => {
      // Create test building first
      const building = await db.insert(buildingsTable)
        .values({
          ...testBuilding,
          latitude: testBuilding.latitude.toString(),
          longitude: testBuilding.longitude.toString()
        })
        .returning()
        .execute();

      // Create test rooms
      await db.insert(roomsTable)
        .values([
          { building_id: building[0].id, name: 'Room 1', floor: 1 },
          { building_id: building[0].id, name: 'Room 2', floor: 2 }
        ])
        .execute();

      const result = await getRooms();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Room 1');
      expect(result[0].floor).toEqual(1);
      expect(result[1].name).toEqual('Room 2');
      expect(result[1].floor).toEqual(2);
    });
  });

  describe('getRoomById', () => {
    it('should return null when room does not exist', async () => {
      const result = await getRoomById(999);
      expect(result).toBeNull();
    });

    it('should return room when it exists', async () => {
      // Create test building first
      const building = await db.insert(buildingsTable)
        .values({
          ...testBuilding,
          latitude: testBuilding.latitude.toString(),
          longitude: testBuilding.longitude.toString()
        })
        .returning()
        .execute();

      // Create test room
      const room = await db.insert(roomsTable)
        .values({
          building_id: building[0].id,
          name: 'Test Room',
          floor: 3
        })
        .returning()
        .execute();

      const result = await getRoomById(room[0].id);

      expect(result).not.toBeNull();
      expect(result?.name).toEqual('Test Room');
      expect(result?.floor).toEqual(3);
      expect(result?.building_id).toEqual(building[0].id);
      expect(result?.created_at).toBeInstanceOf(Date);
    });
  });

  describe('getRoomsByBuildingId', () => {
    it('should return empty array when building has no rooms', async () => {
      // Create test building
      const building = await db.insert(buildingsTable)
        .values({
          ...testBuilding,
          latitude: testBuilding.latitude.toString(),
          longitude: testBuilding.longitude.toString()
        })
        .returning()
        .execute();

      const result = await getRoomsByBuildingId(building[0].id);
      expect(result).toEqual([]);
    });

    it('should return rooms for specific building', async () => {
      // Create two test buildings
      const buildings = await db.insert(buildingsTable)
        .values([
          {
            name: 'Building 1',
            address: '123 Test St',
            latitude: '40.7128',
            longitude: '-74.0060'
          },
          {
            name: 'Building 2',
            address: '456 Test Ave',
            latitude: '40.7589',
            longitude: '-73.9851'
          }
        ])
        .returning()
        .execute();

      // Create rooms for both buildings
      await db.insert(roomsTable)
        .values([
          { building_id: buildings[0].id, name: 'B1 Room 1', floor: 1 },
          { building_id: buildings[0].id, name: 'B1 Room 2', floor: 2 },
          { building_id: buildings[1].id, name: 'B2 Room 1', floor: 1 }
        ])
        .execute();

      const result = await getRoomsByBuildingId(buildings[0].id);

      expect(result).toHaveLength(2);
      expect(result.every(room => room.building_id === buildings[0].id)).toBe(true);
      expect(result.map(room => room.name)).toEqual(['B1 Room 1', 'B1 Room 2']);
    });
  });

  describe('createRoom', () => {
    it('should create a room successfully', async () => {
      // Create test building first
      const building = await db.insert(buildingsTable)
        .values({
          ...testBuilding,
          latitude: testBuilding.latitude.toString(),
          longitude: testBuilding.longitude.toString()
        })
        .returning()
        .execute();

      const input: CreateRoomInput = {
        building_id: building[0].id,
        name: 'New Conference Room',
        floor: 5
      };

      const result = await createRoom(input);

      expect(result.name).toEqual('New Conference Room');
      expect(result.floor).toEqual(5);
      expect(result.building_id).toEqual(building[0].id);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save room to database', async () => {
      // Create test building first
      const building = await db.insert(buildingsTable)
        .values({
          ...testBuilding,
          latitude: testBuilding.latitude.toString(),
          longitude: testBuilding.longitude.toString()
        })
        .returning()
        .execute();

      const input: CreateRoomInput = {
        building_id: building[0].id,
        name: 'Database Test Room',
        floor: 3
      };

      const result = await createRoom(input);

      const rooms = await db.select()
        .from(roomsTable)
        .where(eq(roomsTable.id, result.id))
        .execute();

      expect(rooms).toHaveLength(1);
      expect(rooms[0].name).toEqual('Database Test Room');
      expect(rooms[0].floor).toEqual(3);
    });

    it('should throw error when building does not exist', async () => {
      const input: CreateRoomInput = {
        building_id: 999,
        name: 'Invalid Room',
        floor: 1
      };

      await expect(createRoom(input)).rejects.toThrow(/building not found/i);
    });
  });

  describe('updateRoom', () => {
    it('should update room successfully', async () => {
      // Create test building
      const building = await db.insert(buildingsTable)
        .values({
          ...testBuilding,
          latitude: testBuilding.latitude.toString(),
          longitude: testBuilding.longitude.toString()
        })
        .returning()
        .execute();

      // Create test room
      const room = await db.insert(roomsTable)
        .values({
          building_id: building[0].id,
          name: 'Original Room',
          floor: 1
        })
        .returning()
        .execute();

      const input: UpdateRoomInput = {
        id: room[0].id,
        name: 'Updated Room Name',
        floor: 3
      };

      const result = await updateRoom(input);

      expect(result.name).toEqual('Updated Room Name');
      expect(result.floor).toEqual(3);
      expect(result.building_id).toEqual(building[0].id);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should update only specified fields', async () => {
      // Create test building
      const building = await db.insert(buildingsTable)
        .values({
          ...testBuilding,
          latitude: testBuilding.latitude.toString(),
          longitude: testBuilding.longitude.toString()
        })
        .returning()
        .execute();

      // Create test room
      const room = await db.insert(roomsTable)
        .values({
          building_id: building[0].id,
          name: 'Original Room',
          floor: 1
        })
        .returning()
        .execute();

      const input: UpdateRoomInput = {
        id: room[0].id,
        name: 'Updated Name Only'
      };

      const result = await updateRoom(input);

      expect(result.name).toEqual('Updated Name Only');
      expect(result.floor).toEqual(1); // Should remain unchanged
      expect(result.building_id).toEqual(building[0].id);
    });

    it('should throw error when room does not exist', async () => {
      const input: UpdateRoomInput = {
        id: 999,
        name: 'Non-existent Room'
      };

      await expect(updateRoom(input)).rejects.toThrow(/room not found/i);
    });

    it('should throw error when new building does not exist', async () => {
      // Create test building and room
      const building = await db.insert(buildingsTable)
        .values({
          ...testBuilding,
          latitude: testBuilding.latitude.toString(),
          longitude: testBuilding.longitude.toString()
        })
        .returning()
        .execute();

      const room = await db.insert(roomsTable)
        .values({
          building_id: building[0].id,
          name: 'Test Room',
          floor: 1
        })
        .returning()
        .execute();

      const input: UpdateRoomInput = {
        id: room[0].id,
        building_id: 999
      };

      await expect(updateRoom(input)).rejects.toThrow(/building not found/i);
    });
  });

  describe('deleteRoom', () => {
    it('should delete room successfully', async () => {
      // Create test building and room
      const building = await db.insert(buildingsTable)
        .values({
          ...testBuilding,
          latitude: testBuilding.latitude.toString(),
          longitude: testBuilding.longitude.toString()
        })
        .returning()
        .execute();

      const room = await db.insert(roomsTable)
        .values({
          building_id: building[0].id,
          name: 'Room To Delete',
          floor: 1
        })
        .returning()
        .execute();

      const result = await deleteRoom(room[0].id);

      expect(result.message).toEqual('Room deleted successfully.');

      // Verify room is deleted
      const rooms = await db.select()
        .from(roomsTable)
        .where(eq(roomsTable.id, room[0].id))
        .execute();

      expect(rooms).toHaveLength(0);
    });

    it('should cascade delete associated CCTVs', async () => {
      // Create test building, room, and CCTV
      const building = await db.insert(buildingsTable)
        .values({
          ...testBuilding,
          latitude: testBuilding.latitude.toString(),
          longitude: testBuilding.longitude.toString()
        })
        .returning()
        .execute();

      const room = await db.insert(roomsTable)
        .values({
          building_id: building[0].id,
          name: 'Room With CCTV',
          floor: 1
        })
        .returning()
        .execute();

      await db.insert(cctvTable)
        .values({
          room_id: room[0].id,
          name: 'Test CCTV',
          ip_address: '192.168.1.100',
          rtsp_url: 'rtsp://192.168.1.100/stream',
          status: 'ONLINE',
          latitude: '40.7128',
          longitude: '-74.0060'
        })
        .execute();

      // Delete room
      await deleteRoom(room[0].id);

      // Verify both room and CCTV are deleted
      const rooms = await db.select()
        .from(roomsTable)
        .where(eq(roomsTable.id, room[0].id))
        .execute();

      const cctvs = await db.select()
        .from(cctvTable)
        .where(eq(cctvTable.room_id, room[0].id))
        .execute();

      expect(rooms).toHaveLength(0);
      expect(cctvs).toHaveLength(0);
    });

    it('should throw error when room does not exist', async () => {
      await expect(deleteRoom(999)).rejects.toThrow(/room not found/i);
    });
  });
});