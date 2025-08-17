import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, buildingsTable, roomsTable, cctvTable } from '../db/schema';
import { getDashboardAnalytics, getUserDashboardStats, exportDashboardData } from '../handlers/dashboard';

// Test data
const testUser1 = {
  name: 'Active User',
  email: 'active@test.com',
  password: 'hashed_password',
  role: 'USER' as const,
  is_active: true,
  is_verified: true
};

const testUser2 = {
  name: 'Inactive User',
  email: 'inactive@test.com',
  password: 'hashed_password',
  role: 'ADMIN' as const,
  is_active: false,
  is_verified: true
};

const testBuilding = {
  name: 'Test Building',
  address: '123 Test St',
  latitude: '40.7128',
  longitude: '-74.0060'
};

const testRoom = {
  name: 'Test Room',
  floor: 1
};

const testCctv1 = {
  name: 'CCTV Camera 1',
  ip_address: '192.168.1.100',
  rtsp_url: 'rtsp://192.168.1.100:554/stream',
  status: 'ONLINE' as const,
  latitude: '40.7128',
  longitude: '-74.0060'
};

const testCctv2 = {
  name: 'CCTV Camera 2',
  ip_address: '192.168.1.101',
  rtsp_url: 'rtsp://192.168.1.101:554/stream',
  status: 'OFFLINE' as const,
  latitude: '40.7129',
  longitude: '-74.0061'
};

const testCctv3 = {
  name: 'CCTV Camera 3',
  ip_address: '192.168.1.102',
  rtsp_url: 'rtsp://192.168.1.102:554/stream',
  status: 'MAINTENANCE' as const,
  latitude: '40.7130',
  longitude: '-74.0062'
};

describe('getDashboardAnalytics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return analytics with all zeros for empty database', async () => {
    const result = await getDashboardAnalytics();

    expect(result.total_users).toEqual(0);
    expect(result.online_users).toEqual(0);
    expect(result.offline_users).toEqual(0);
    expect(result.total_buildings).toEqual(0);
    expect(result.total_rooms).toEqual(0);
    expect(result.total_cctvs).toEqual(0);
    expect(result.online_cctvs).toEqual(0);
    expect(result.offline_cctvs).toEqual(0);
    expect(result.maintenance_cctvs).toEqual(0);
  });

  it('should return correct user analytics', async () => {
    // Create test users
    await db.insert(usersTable).values([testUser1, testUser2]).execute();

    const result = await getDashboardAnalytics();

    expect(result.total_users).toEqual(2);
    expect(result.online_users).toEqual(1);
    expect(result.offline_users).toEqual(1);
  });

  it('should return correct building and room analytics', async () => {
    // Create test building
    const buildingResult = await db.insert(buildingsTable)
      .values(testBuilding)
      .returning()
      .execute();
    
    // Create test rooms
    await db.insert(roomsTable).values([
      { ...testRoom, building_id: buildingResult[0].id, name: 'Room 1' },
      { ...testRoom, building_id: buildingResult[0].id, name: 'Room 2' }
    ]).execute();

    const result = await getDashboardAnalytics();

    expect(result.total_buildings).toEqual(1);
    expect(result.total_rooms).toEqual(2);
  });

  it('should return correct CCTV analytics with different statuses', async () => {
    // Create prerequisite data
    const buildingResult = await db.insert(buildingsTable)
      .values(testBuilding)
      .returning()
      .execute();
    
    const roomResult = await db.insert(roomsTable)
      .values({ ...testRoom, building_id: buildingResult[0].id })
      .returning()
      .execute();

    // Create CCTVs with different statuses
    await db.insert(cctvTable).values([
      { ...testCctv1, room_id: roomResult[0].id },
      { ...testCctv2, room_id: roomResult[0].id },
      { ...testCctv3, room_id: roomResult[0].id }
    ]).execute();

    const result = await getDashboardAnalytics();

    expect(result.total_cctvs).toEqual(3);
    expect(result.online_cctvs).toEqual(1);
    expect(result.offline_cctvs).toEqual(1);
    expect(result.maintenance_cctvs).toEqual(1);
  });

  it('should return complete analytics with all data types', async () => {
    // Create users
    await db.insert(usersTable).values([testUser1, testUser2]).execute();

    // Create building and room
    const buildingResult = await db.insert(buildingsTable)
      .values(testBuilding)
      .returning()
      .execute();
    
    const roomResult = await db.insert(roomsTable)
      .values({ ...testRoom, building_id: buildingResult[0].id })
      .returning()
      .execute();

    // Create CCTVs
    await db.insert(cctvTable).values([
      { ...testCctv1, room_id: roomResult[0].id },
      { ...testCctv2, room_id: roomResult[0].id }
    ]).execute();

    const result = await getDashboardAnalytics();

    expect(result.total_users).toEqual(2);
    expect(result.online_users).toEqual(1);
    expect(result.offline_users).toEqual(1);
    expect(result.total_buildings).toEqual(1);
    expect(result.total_rooms).toEqual(1);
    expect(result.total_cctvs).toEqual(2);
    expect(result.online_cctvs).toEqual(1);
    expect(result.offline_cctvs).toEqual(1);
    expect(result.maintenance_cctvs).toEqual(0);
  });
});

describe('getUserDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return stats with all zeros for empty database', async () => {
    const result = await getUserDashboardStats();

    expect(result.total_buildings).toEqual(0);
    expect(result.total_rooms).toEqual(0);
    expect(result.total_cctvs).toEqual(0);
    expect(result.online_cctvs).toEqual(0);
    expect(result.offline_cctvs).toEqual(0);
    expect(result.maintenance_cctvs).toEqual(0);
  });

  it('should return correct building and room counts', async () => {
    // Create multiple buildings
    const building1 = await db.insert(buildingsTable)
      .values({ ...testBuilding, name: 'Building 1' })
      .returning()
      .execute();
    
    const building2 = await db.insert(buildingsTable)
      .values({ ...testBuilding, name: 'Building 2' })
      .returning()
      .execute();

    // Create rooms in different buildings
    await db.insert(roomsTable).values([
      { ...testRoom, building_id: building1[0].id, name: 'Room 1A' },
      { ...testRoom, building_id: building1[0].id, name: 'Room 1B' },
      { ...testRoom, building_id: building2[0].id, name: 'Room 2A' }
    ]).execute();

    const result = await getUserDashboardStats();

    expect(result.total_buildings).toEqual(2);
    expect(result.total_rooms).toEqual(3);
  });

  it('should return correct CCTV status counts', async () => {
    // Create prerequisite data
    const buildingResult = await db.insert(buildingsTable)
      .values(testBuilding)
      .returning()
      .execute();
    
    const roomResult = await db.insert(roomsTable)
      .values({ ...testRoom, building_id: buildingResult[0].id })
      .returning()
      .execute();

    // Create multiple CCTVs with various statuses
    await db.insert(cctvTable).values([
      { ...testCctv1, room_id: roomResult[0].id, name: 'CCTV 1' },
      { ...testCctv1, room_id: roomResult[0].id, name: 'CCTV 2' },
      { ...testCctv2, room_id: roomResult[0].id, name: 'CCTV 3' },
      { ...testCctv3, room_id: roomResult[0].id, name: 'CCTV 4' },
      { ...testCctv3, room_id: roomResult[0].id, name: 'CCTV 5' }
    ]).execute();

    const result = await getUserDashboardStats();

    expect(result.total_cctvs).toEqual(5);
    expect(result.online_cctvs).toEqual(2);
    expect(result.offline_cctvs).toEqual(1);
    expect(result.maintenance_cctvs).toEqual(2);
  });

  it('should return same infrastructure stats as admin dashboard', async () => {
    // Create test data
    const buildingResult = await db.insert(buildingsTable)
      .values(testBuilding)
      .returning()
      .execute();
    
    const roomResult = await db.insert(roomsTable)
      .values({ ...testRoom, building_id: buildingResult[0].id })
      .returning()
      .execute();

    await db.insert(cctvTable).values([
      { ...testCctv1, room_id: roomResult[0].id }
    ]).execute();

    // Get both admin and user stats
    const adminStats = await getDashboardAnalytics();
    const userStats = await getUserDashboardStats();

    // Infrastructure stats should match
    expect(userStats.total_buildings).toEqual(adminStats.total_buildings);
    expect(userStats.total_rooms).toEqual(adminStats.total_rooms);
    expect(userStats.total_cctvs).toEqual(adminStats.total_cctvs);
    expect(userStats.online_cctvs).toEqual(adminStats.online_cctvs);
    expect(userStats.offline_cctvs).toEqual(adminStats.offline_cctvs);
    expect(userStats.maintenance_cctvs).toEqual(adminStats.maintenance_cctvs);
  });
});

describe('exportDashboardData', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return export data with correct structure', async () => {
    const result = await exportDashboardData();

    expect(result).toHaveProperty('download_url');
    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('message');
    expect(typeof result.download_url).toBe('string');
    expect(typeof result.filename).toBe('string');
    expect(typeof result.message).toBe('string');
  });

  it('should generate filename with current date', async () => {
    const result = await exportDashboardData();
    const currentDate = new Date().toISOString().split('T')[0];
    const expectedFilename = `dashboard_export_${currentDate}.xlsx`;

    expect(result.filename).toEqual(expectedFilename);
  });

  it('should return success message', async () => {
    const result = await exportDashboardData();

    expect(result.message).toEqual('Dashboard data exported successfully.');
  });

  it('should generate download URL with filename', async () => {
    const result = await exportDashboardData();

    expect(result.download_url).toContain(result.filename);
    expect(result.download_url).toMatch(/^\/api\/exports\//);
  });

  it('should work with populated database', async () => {
    // Create test data
    await db.insert(usersTable).values(testUser1).execute();
    
    const buildingResult = await db.insert(buildingsTable)
      .values(testBuilding)
      .returning()
      .execute();
    
    const roomResult = await db.insert(roomsTable)
      .values({ ...testRoom, building_id: buildingResult[0].id })
      .returning()
      .execute();

    await db.insert(cctvTable).values([
      { ...testCctv1, room_id: roomResult[0].id }
    ]).execute();

    const result = await exportDashboardData();

    expect(result.download_url).toBeDefined();
    expect(result.filename).toContain('dashboard_export_');
    expect(result.message).toEqual('Dashboard data exported successfully.');
  });
});