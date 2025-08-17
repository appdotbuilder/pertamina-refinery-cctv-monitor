import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { buildingsTable, roomsTable, cctvTable } from '../db/schema';
import { 
  type CreateCctvInput, 
  type UpdateCctvInput, 
  type CctvFilterInput 
} from '../schema';
import {
  getCctvs,
  getCctvById,
  getCctvsByRoomId,
  getCctvsByBuildingId,
  getFilteredCctvs,
  createCctv,
  updateCctv,
  updateCctvStatus,
  deleteCctv,
  getCctvStream,
  initializeCctvSamples
} from '../handlers/cctv';
import { eq } from 'drizzle-orm';

// Test data
const testBuilding = {
  name: 'Test Building',
  address: '123 Test Street',
  latitude: -6.2,
  longitude: 106.8
};

const testRoom = {
  name: 'Test Room',
  floor: 1
};

const testCctvInput: CreateCctvInput = {
  room_id: 1, // Will be updated with actual room ID
  name: 'Test CCTV Camera',
  ip_address: '10.56.236.1',
  rtsp_url: 'rtsp://admin:password.123@10.56.236.1/streaming/channels/',
  status: 'ONLINE',
  latitude: -6.2088,
  longitude: 106.8456
};

describe('CCTV Handler', () => {
  let buildingId: number;
  let roomId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test building
    const buildingResult = await db.insert(buildingsTable)
      .values({
        ...testBuilding,
        latitude: testBuilding.latitude.toString(),
        longitude: testBuilding.longitude.toString()
      })
      .returning()
      .execute();
    
    buildingId = buildingResult[0].id;

    // Create test room
    const roomResult = await db.insert(roomsTable)
      .values({
        ...testRoom,
        building_id: buildingId
      })
      .returning()
      .execute();
    
    roomId = roomResult[0].id;
    
    // Update test input with actual room ID
    testCctvInput.room_id = roomId;
  });

  afterEach(resetDB);

  describe('createCctv', () => {
    it('should create a new CCTV', async () => {
      const result = await createCctv(testCctvInput);

      expect(result.name).toEqual('Test CCTV Camera');
      expect(result.ip_address).toEqual('10.56.236.1');
      expect(result.rtsp_url).toEqual('rtsp://admin:password.123@10.56.236.1/streaming/channels/');
      expect(result.status).toEqual('ONLINE');
      expect(result.room_id).toEqual(roomId);
      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');
      expect(result.latitude).toEqual(-6.2088);
      expect(result.longitude).toEqual(106.8456);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save CCTV to database', async () => {
      const result = await createCctv(testCctvInput);

      const cctvs = await db.select()
        .from(cctvTable)
        .where(eq(cctvTable.id, result.id))
        .execute();

      expect(cctvs).toHaveLength(1);
      expect(cctvs[0].name).toEqual('Test CCTV Camera');
      expect(cctvs[0].ip_address).toEqual('10.56.236.1');
      expect(cctvs[0].status).toEqual('ONLINE');
      expect(parseFloat(cctvs[0].latitude)).toEqual(-6.2088);
      expect(parseFloat(cctvs[0].longitude)).toEqual(106.8456);
    });

    it('should throw error when room does not exist', async () => {
      const invalidInput = { ...testCctvInput, room_id: 999 };
      
      await expect(createCctv(invalidInput)).rejects.toThrow(/room not found/i);
    });
  });

  describe('getCctvs', () => {
    it('should return all CCTVs', async () => {
      await createCctv(testCctvInput);
      
      const secondCctv = {
        ...testCctvInput,
        name: 'Second CCTV',
        ip_address: '10.56.236.2'
      };
      await createCctv(secondCctv);

      const results = await getCctvs();

      expect(results).toHaveLength(2);
      expect(results[0].name).toEqual('Test CCTV Camera');
      expect(results[1].name).toEqual('Second CCTV');
      expect(typeof results[0].latitude).toBe('number');
      expect(typeof results[0].longitude).toBe('number');
    });

    it('should return empty array when no CCTVs exist', async () => {
      const results = await getCctvs();
      
      expect(results).toHaveLength(0);
    });
  });

  describe('getCctvById', () => {
    it('should return CCTV by ID', async () => {
      const created = await createCctv(testCctvInput);
      
      const result = await getCctvById(created.id);

      expect(result).toBeDefined();
      expect(result?.id).toEqual(created.id);
      expect(result?.name).toEqual('Test CCTV Camera');
      expect(typeof result?.latitude).toBe('number');
      expect(typeof result?.longitude).toBe('number');
    });

    it('should return null when CCTV does not exist', async () => {
      const result = await getCctvById(999);
      
      expect(result).toBeNull();
    });
  });

  describe('getCctvsByRoomId', () => {
    it('should return CCTVs by room ID', async () => {
      await createCctv(testCctvInput);
      
      // Create second room and CCTV
      const room2Result = await db.insert(roomsTable)
        .values({
          name: 'Room 2',
          floor: 2,
          building_id: buildingId
        })
        .returning()
        .execute();
      
      const room2Cctv = {
        ...testCctvInput,
        room_id: room2Result[0].id,
        name: 'Room 2 CCTV'
      };
      await createCctv(room2Cctv);

      const results = await getCctvsByRoomId(roomId);

      expect(results).toHaveLength(1);
      expect(results[0].name).toEqual('Test CCTV Camera');
      expect(results[0].room_id).toEqual(roomId);
    });

    it('should return empty array when room has no CCTVs', async () => {
      const results = await getCctvsByRoomId(roomId);
      
      expect(results).toHaveLength(0);
    });
  });

  describe('getCctvsByBuildingId', () => {
    it('should return CCTVs by building ID', async () => {
      await createCctv(testCctvInput);
      
      // Create second building with room and CCTV
      const building2Result = await db.insert(buildingsTable)
        .values({
          name: 'Building 2',
          address: '456 Test Ave',
          latitude: '-6.3',
          longitude: '106.9'
        })
        .returning()
        .execute();
      
      const room2Result = await db.insert(roomsTable)
        .values({
          name: 'Room in Building 2',
          floor: 1,
          building_id: building2Result[0].id
        })
        .returning()
        .execute();
      
      const building2Cctv = {
        ...testCctvInput,
        room_id: room2Result[0].id,
        name: 'Building 2 CCTV'
      };
      await createCctv(building2Cctv);

      const results = await getCctvsByBuildingId(buildingId);

      expect(results).toHaveLength(1);
      expect(results[0].name).toEqual('Test CCTV Camera');
      expect(typeof results[0].latitude).toBe('number');
    });

    it('should return empty array when building has no CCTVs', async () => {
      const results = await getCctvsByBuildingId(buildingId);
      
      expect(results).toHaveLength(0);
    });
  });

  describe('getFilteredCctvs', () => {
    beforeEach(async () => {
      // Create multiple CCTVs with different statuses
      await createCctv({ ...testCctvInput, name: 'Online CCTV', status: 'ONLINE' });
      await createCctv({ ...testCctvInput, name: 'Offline CCTV', status: 'OFFLINE' });
      await createCctv({ ...testCctvInput, name: 'Maintenance CCTV', status: 'MAINTENANCE' });
    });

    it('should filter CCTVs by status', async () => {
      const filter: CctvFilterInput = { status: 'ONLINE' };
      
      const results = await getFilteredCctvs(filter);

      expect(results).toHaveLength(1);
      expect(results[0].status).toEqual('ONLINE');
      expect(results[0].name).toEqual('Online CCTV');
    });

    it('should filter CCTVs by building ID', async () => {
      const filter: CctvFilterInput = { building_id: buildingId };
      
      const results = await getFilteredCctvs(filter);

      expect(results).toHaveLength(3);
      results.forEach(cctv => {
        expect(typeof cctv.latitude).toBe('number');
        expect(typeof cctv.longitude).toBe('number');
      });
    });

    it('should filter CCTVs by status and building ID', async () => {
      const filter: CctvFilterInput = { 
        status: 'OFFLINE', 
        building_id: buildingId 
      };
      
      const results = await getFilteredCctvs(filter);

      expect(results).toHaveLength(1);
      expect(results[0].status).toEqual('OFFLINE');
      expect(results[0].name).toEqual('Offline CCTV');
    });

    it('should return all CCTVs when no filters applied', async () => {
      const filter: CctvFilterInput = {};
      
      const results = await getFilteredCctvs(filter);

      expect(results).toHaveLength(3);
    });
  });

  describe('updateCctv', () => {
    let cctvId: number;

    beforeEach(async () => {
      const created = await createCctv(testCctvInput);
      cctvId = created.id;
    });

    it('should update CCTV properties', async () => {
      const updateInput: UpdateCctvInput = {
        id: cctvId,
        name: 'Updated CCTV Name',
        status: 'MAINTENANCE',
        latitude: -6.3,
        longitude: 106.9
      };

      const result = await updateCctv(updateInput);

      expect(result.id).toEqual(cctvId);
      expect(result.name).toEqual('Updated CCTV Name');
      expect(result.status).toEqual('MAINTENANCE');
      expect(result.latitude).toEqual(-6.3);
      expect(result.longitude).toEqual(106.9);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error when CCTV does not exist', async () => {
      const updateInput: UpdateCctvInput = {
        id: 999,
        name: 'Non-existent CCTV'
      };

      await expect(updateCctv(updateInput)).rejects.toThrow(/cctv not found/i);
    });

    it('should throw error when room_id does not exist', async () => {
      const updateInput: UpdateCctvInput = {
        id: cctvId,
        room_id: 999
      };

      await expect(updateCctv(updateInput)).rejects.toThrow(/room not found/i);
    });
  });

  describe('updateCctvStatus', () => {
    let cctvId: number;

    beforeEach(async () => {
      const created = await createCctv(testCctvInput);
      cctvId = created.id;
    });

    it('should update CCTV status', async () => {
      const result = await updateCctvStatus(cctvId, 'MAINTENANCE');

      expect(result.id).toEqual(cctvId);
      expect(result.status).toEqual('MAINTENANCE');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error when CCTV does not exist', async () => {
      await expect(updateCctvStatus(999, 'ONLINE')).rejects.toThrow(/cctv not found/i);
    });
  });

  describe('deleteCctv', () => {
    let cctvId: number;

    beforeEach(async () => {
      const created = await createCctv(testCctvInput);
      cctvId = created.id;
    });

    it('should delete CCTV', async () => {
      const result = await deleteCctv(cctvId);

      expect(result.message).toEqual('CCTV deleted successfully.');

      // Verify CCTV is deleted
      const cctvs = await db.select()
        .from(cctvTable)
        .where(eq(cctvTable.id, cctvId))
        .execute();

      expect(cctvs).toHaveLength(0);
    });

    it('should throw error when CCTV does not exist', async () => {
      await expect(deleteCctv(999)).rejects.toThrow(/cctv not found/i);
    });
  });

  describe('getCctvStream', () => {
    let cctvId: number;

    beforeEach(async () => {
      const created = await createCctv(testCctvInput);
      cctvId = created.id;
    });

    it('should return CCTV stream information', async () => {
      const result = await getCctvStream(cctvId);

      expect(result.stream_url).toEqual('rtsp://admin:password.123@10.56.236.1/streaming/channels/');
      expect(result.status).toEqual('ONLINE');
    });

    it('should throw error when CCTV does not exist', async () => {
      await expect(getCctvStream(999)).rejects.toThrow(/cctv not found/i);
    });
  });

  describe('initializeCctvSamples', () => {
    it('should create sample CCTVs', async () => {
      // Create additional rooms for more variety
      await db.insert(roomsTable)
        .values([
          { name: 'Room 2', floor: 2, building_id: buildingId },
          { name: 'Room 3', floor: 3, building_id: buildingId }
        ])
        .execute();

      const result = await initializeCctvSamples();

      expect(result.message).toEqual('Sample CCTVs initialized successfully.');
      expect(result.count).toBeGreaterThan(0);

      // Verify CCTVs were created
      const cctvs = await db.select()
        .from(cctvTable)
        .execute();

      expect(cctvs).toHaveLength(result.count);
      
      // Check sample data format
      const sampleCctv = cctvs[0];
      expect(sampleCctv.ip_address).toMatch(/^10\.56\.236\.\d+$/);
      expect(sampleCctv.rtsp_url).toMatch(/^rtsp:\/\/admin:password\.123@10\.56\.236\.\d+\/streaming\/channels\/$/);
      expect(['ONLINE', 'OFFLINE', 'MAINTENANCE']).toContain(sampleCctv.status);
    });

    it('should throw error when no rooms exist', async () => {
      // Remove all rooms first
      await db.delete(cctvTable).execute();
      await db.delete(roomsTable).execute();

      await expect(initializeCctvSamples()).rejects.toThrow(/no rooms available/i);
    });
  });
});