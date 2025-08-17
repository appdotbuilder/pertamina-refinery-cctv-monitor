import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { buildingsTable } from '../db/schema';
import { type CreateBuildingInput, type UpdateBuildingInput, type SearchBuildingInput } from '../schema';
import { 
  getBuildings, 
  getBuildingById, 
  createBuilding, 
  updateBuilding, 
  deleteBuilding, 
  searchBuildings,
  initializePertaminaBuildings
} from '../handlers/buildings';
import { eq, sql } from 'drizzle-orm';

// Test input data
const testBuildingInput: CreateBuildingInput = {
  name: 'Test Building',
  address: '123 Test Street, Test City',
  latitude: -6.2088,
  longitude: 106.8456
};

const updateBuildingInput: UpdateBuildingInput = {
  id: 1,
  name: 'Updated Building',
  address: '456 Updated Street, Updated City',
  latitude: -6.2100,
  longitude: 106.8500
};

const searchInput: SearchBuildingInput = {
  query: 'Test'
};

describe('Buildings Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createBuilding', () => {
    it('should create a building successfully', async () => {
      const result = await createBuilding(testBuildingInput);

      expect(result.name).toEqual('Test Building');
      expect(result.address).toEqual('123 Test Street, Test City');
      expect(result.latitude).toEqual(-6.2088);
      expect(result.longitude).toEqual(106.8456);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');
    });

    it('should save building to database', async () => {
      const result = await createBuilding(testBuildingInput);

      const buildings = await db.select()
        .from(buildingsTable)
        .where(eq(buildingsTable.id, result.id))
        .execute();

      expect(buildings).toHaveLength(1);
      expect(buildings[0].name).toEqual('Test Building');
      expect(buildings[0].address).toEqual(testBuildingInput.address);
      expect(parseFloat(buildings[0].latitude)).toEqual(-6.2088);
      expect(parseFloat(buildings[0].longitude)).toEqual(106.8456);
    });
  });

  describe('getBuildings', () => {
    it('should return empty array when no buildings exist', async () => {
      const result = await getBuildings();
      expect(result).toEqual([]);
    });

    it('should return all buildings', async () => {
      // Create test buildings
      await createBuilding(testBuildingInput);
      await createBuilding({
        name: 'Second Building',
        address: '789 Another Street',
        latitude: -6.2200,
        longitude: 106.8600
      });

      const result = await getBuildings();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('Test Building');
      expect(result[1].name).toEqual('Second Building');
      expect(typeof result[0].latitude).toBe('number');
      expect(typeof result[0].longitude).toBe('number');
      expect(typeof result[1].latitude).toBe('number');
      expect(typeof result[1].longitude).toBe('number');
    });

    it('should convert numeric fields correctly', async () => {
      await createBuilding(testBuildingInput);

      const result = await getBuildings();

      expect(result).toHaveLength(1);
      expect(result[0].latitude).toEqual(-6.2088);
      expect(result[0].longitude).toEqual(106.8456);
      expect(typeof result[0].latitude).toBe('number');
      expect(typeof result[0].longitude).toBe('number');
    });
  });

  describe('getBuildingById', () => {
    it('should return null when building does not exist', async () => {
      const result = await getBuildingById(999);
      expect(result).toBeNull();
    });

    it('should return building when it exists', async () => {
      const created = await createBuilding(testBuildingInput);

      const result = await getBuildingById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.name).toEqual('Test Building');
      expect(result!.address).toEqual(testBuildingInput.address);
      expect(result!.latitude).toEqual(-6.2088);
      expect(result!.longitude).toEqual(106.8456);
      expect(typeof result!.latitude).toBe('number');
      expect(typeof result!.longitude).toBe('number');
    });
  });

  describe('updateBuilding', () => {
    it('should throw error when building does not exist', async () => {
      await expect(updateBuilding({ id: 999, name: 'Non-existent' }))
        .rejects.toThrow(/building not found/i);
    });

    it('should update building with all fields', async () => {
      const created = await createBuilding(testBuildingInput);
      const updateInput: UpdateBuildingInput = {
        id: created.id,
        name: 'Updated Building',
        address: '456 Updated Street',
        latitude: -6.2100,
        longitude: 106.8500
      };

      const result = await updateBuilding(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Updated Building');
      expect(result.address).toEqual('456 Updated Street');
      expect(result.latitude).toEqual(-6.2100);
      expect(result.longitude).toEqual(106.8500);
      expect(result.updated_at.getTime()).toBeGreaterThan(created.updated_at.getTime());
      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');
    });

    it('should update building with partial fields', async () => {
      const created = await createBuilding(testBuildingInput);

      const result = await updateBuilding({
        id: created.id,
        name: 'Partially Updated'
      });

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual('Partially Updated');
      expect(result.address).toEqual(testBuildingInput.address); // Should remain unchanged
      expect(result.latitude).toEqual(-6.2088); // Should remain unchanged
      expect(result.longitude).toEqual(106.8456); // Should remain unchanged
    });

    it('should update coordinates only', async () => {
      const created = await createBuilding(testBuildingInput);

      const result = await updateBuilding({
        id: created.id,
        latitude: -7.0000,
        longitude: 107.0000
      });

      expect(result.name).toEqual(testBuildingInput.name); // Should remain unchanged
      expect(result.latitude).toEqual(-7.0000);
      expect(result.longitude).toEqual(107.0000);
      expect(typeof result.latitude).toBe('number');
      expect(typeof result.longitude).toBe('number');
    });
  });

  describe('deleteBuilding', () => {
    it('should throw error when building does not exist', async () => {
      await expect(deleteBuilding(999))
        .rejects.toThrow(/building not found/i);
    });

    it('should delete building successfully', async () => {
      const created = await createBuilding(testBuildingInput);

      const result = await deleteBuilding(created.id);

      expect(result.message).toEqual('Building deleted successfully.');

      // Verify building is deleted
      const deleted = await getBuildingById(created.id);
      expect(deleted).toBeNull();
    });

    it('should remove building from database', async () => {
      const created = await createBuilding(testBuildingInput);

      await deleteBuilding(created.id);

      const buildings = await db.select()
        .from(buildingsTable)
        .where(eq(buildingsTable.id, created.id))
        .execute();

      expect(buildings).toHaveLength(0);
    });
  });

  describe('searchBuildings', () => {
    beforeEach(async () => {
      // Create test buildings for search
      await createBuilding({
        name: 'Test Building Alpha',
        address: '123 Test Street',
        latitude: -6.2088,
        longitude: 106.8456
      });
      await createBuilding({
        name: 'Demo Building Beta',
        address: '456 Demo Avenue',
        latitude: -6.2100,
        longitude: 106.8500
      });
      await createBuilding({
        name: 'Testing Facility',
        address: '789 Testing Road',
        latitude: -6.2200,
        longitude: 106.8600
      });
    });

    it('should return empty array when no matches found', async () => {
      const result = await searchBuildings({ query: 'NonExistent' });
      expect(result).toEqual([]);
    });

    it('should search buildings by name (case insensitive)', async () => {
      const result = await searchBuildings({ query: 'test' });

      expect(result).toHaveLength(2);
      expect(result.some(b => b.name.includes('Test Building Alpha'))).toBe(true);
      expect(result.some(b => b.name.includes('Testing Facility'))).toBe(true);
    });

    it('should search buildings with partial match', async () => {
      const result = await searchBuildings({ query: 'Demo' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toEqual('Demo Building Beta');
      expect(typeof result[0].latitude).toBe('number');
      expect(typeof result[0].longitude).toBe('number');
    });

    it('should convert numeric fields correctly in search results', async () => {
      const result = await searchBuildings({ query: 'Building' });

      expect(result.length).toBeGreaterThan(0);
      result.forEach(building => {
        expect(typeof building.latitude).toBe('number');
        expect(typeof building.longitude).toBe('number');
      });
    });
  });

  describe('initializePertaminaBuildings', () => {
    it('should initialize Pertamina buildings when database is empty', async () => {
      const result = await initializePertaminaBuildings();

      expect(result.message).toEqual('Pertamina buildings initialized successfully.');
      expect(result.count).toEqual(18);

      // Verify buildings were created
      const buildings = await getBuildings();
      expect(buildings).toHaveLength(18);

      // Check some specific buildings
      const collaborativeBuilding = buildings.find(b => b.name === 'Collaborative Building');
      expect(collaborativeBuilding).toBeDefined();
      expect(collaborativeBuilding!.address).toContain('Pertamina Refinery Unit VI Balongan');
      expect(typeof collaborativeBuilding!.latitude).toBe('number');
      expect(typeof collaborativeBuilding!.longitude).toBe('number');

      const mainGate = buildings.find(b => b.name === 'Main Gate');
      expect(mainGate).toBeDefined();
      expect(mainGate!.latitude).toBeCloseTo(-6.2995, 4);
      expect(mainGate!.longitude).toBeCloseTo(108.4435, 4);
    });

    it('should not duplicate buildings if already initialized', async () => {
      // First initialization
      const firstResult = await initializePertaminaBuildings();
      expect(firstResult.count).toEqual(18);

      // Second initialization
      const secondResult = await initializePertaminaBuildings();
      expect(secondResult.message).toEqual('Buildings already initialized.');
      expect(secondResult.count).toEqual(0);

      // Verify no duplicates
      const buildings = await getBuildings();
      expect(buildings).toHaveLength(18);
    });

    it('should create buildings with proper coordinates around Balongan', async () => {
      await initializePertaminaBuildings();

      const buildings = await getBuildings();
      expect(buildings).toHaveLength(18);

      // All buildings should be around Balongan area
      buildings.forEach(building => {
        expect(building.latitude).toBeGreaterThan(-6.31); // Northern bound
        expect(building.latitude).toBeLessThan(-6.29);    // Southern bound
        expect(building.longitude).toBeGreaterThan(108.44); // Western bound
        expect(building.longitude).toBeLessThan(108.49);   // Eastern bound
      });
    });

    it('should create specific Pertamina facility buildings', async () => {
      await initializePertaminaBuildings();

      const buildings = await getBuildings();
      const buildingNames = buildings.map(b => b.name);

      expect(buildingNames).toContain('Collaborative Building');
      expect(buildingNames).toContain('Main Gate');
      expect(buildingNames).toContain('Main Control Room');
      expect(buildingNames).toContain('Crude Distillation Unit (CDU) Production Area');
      expect(buildingNames).toContain('Tank Farm Area 1');
      expect(buildingNames).toContain('Marine Region III Pertamina Balongan');
    });
  });
});