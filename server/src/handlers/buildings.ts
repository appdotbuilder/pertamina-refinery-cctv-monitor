import { db } from '../db';
import { buildingsTable } from '../db/schema';
import { eq, ilike, sql } from 'drizzle-orm';
import { 
  type Building, 
  type CreateBuildingInput, 
  type UpdateBuildingInput,
  type SearchBuildingInput 
} from '../schema';

export async function getBuildings(): Promise<Building[]> {
  try {
    const results = await db.select()
      .from(buildingsTable)
      .execute();

    return results.map(building => ({
      ...building,
      latitude: parseFloat(building.latitude),
      longitude: parseFloat(building.longitude)
    }));
  } catch (error) {
    console.error('Failed to fetch buildings:', error);
    throw error;
  }
}

export async function getBuildingById(id: number): Promise<Building | null> {
  try {
    const results = await db.select()
      .from(buildingsTable)
      .where(eq(buildingsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const building = results[0];
    return {
      ...building,
      latitude: parseFloat(building.latitude),
      longitude: parseFloat(building.longitude)
    };
  } catch (error) {
    console.error('Failed to fetch building by ID:', error);
    throw error;
  }
}

export async function createBuilding(input: CreateBuildingInput): Promise<Building> {
  try {
    const result = await db.insert(buildingsTable)
      .values({
        name: input.name,
        address: input.address,
        latitude: input.latitude.toString(),
        longitude: input.longitude.toString()
      })
      .returning()
      .execute();

    const building = result[0];
    return {
      ...building,
      latitude: parseFloat(building.latitude),
      longitude: parseFloat(building.longitude)
    };
  } catch (error) {
    console.error('Building creation failed:', error);
    throw error;
  }
}

export async function updateBuilding(input: UpdateBuildingInput): Promise<Building> {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: sql`NOW()`
    };

    if (input.name !== undefined) {
      updateData['name'] = input.name;
    }
    if (input.address !== undefined) {
      updateData['address'] = input.address;
    }
    if (input.latitude !== undefined) {
      updateData['latitude'] = input.latitude.toString();
    }
    if (input.longitude !== undefined) {
      updateData['longitude'] = input.longitude.toString();
    }

    const result = await db.update(buildingsTable)
      .set(updateData)
      .where(eq(buildingsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Building not found');
    }

    const building = result[0];
    return {
      ...building,
      latitude: parseFloat(building.latitude),
      longitude: parseFloat(building.longitude)
    };
  } catch (error) {
    console.error('Building update failed:', error);
    throw error;
  }
}

export async function deleteBuilding(id: number): Promise<{ message: string }> {
  try {
    const result = await db.delete(buildingsTable)
      .where(eq(buildingsTable.id, id))
      .returning({ id: buildingsTable.id })
      .execute();

    if (result.length === 0) {
      throw new Error('Building not found');
    }

    return {
      message: 'Building deleted successfully.'
    };
  } catch (error) {
    console.error('Building deletion failed:', error);
    throw error;
  }
}

export async function searchBuildings(input: SearchBuildingInput): Promise<Building[]> {
  try {
    const results = await db.select()
      .from(buildingsTable)
      .where(ilike(buildingsTable.name, `%${input.query}%`))
      .execute();

    return results.map(building => ({
      ...building,
      latitude: parseFloat(building.latitude),
      longitude: parseFloat(building.longitude)
    }));
  } catch (error) {
    console.error('Building search failed:', error);
    throw error;
  }
}

export async function initializePertaminaBuildings(): Promise<{ message: string; count: number }> {
  try {
    // Pertamina Refinery Unit VI Balongan coordinates and buildings
    // Base coordinates: -6.3004, 108.4442 (Balongan, Indramayu)
    const buildings = [
      {
        name: 'Collaborative Building',
        address: 'Pertamina Refinery Unit VI Balongan, Collaborative Area',
        latitude: -6.3004,
        longitude: 108.4442
      },
      {
        name: 'Main Gate',
        address: 'Pertamina Refinery Unit VI Balongan, Main Entrance',
        latitude: -6.2995,
        longitude: 108.4435
      },
      {
        name: 'AWI',
        address: 'Pertamina Refinery Unit VI Balongan, AWI Area',
        latitude: -6.3012,
        longitude: 108.4450
      },
      {
        name: 'Maintenance Shelter Area 1',
        address: 'Pertamina Refinery Unit VI Balongan, Maintenance Zone 1',
        latitude: -6.3020,
        longitude: 108.4455
      },
      {
        name: 'Maintenance Shelter Area 2',
        address: 'Pertamina Refinery Unit VI Balongan, Maintenance Zone 2',
        latitude: -6.3025,
        longitude: 108.4460
      },
      {
        name: 'Maintenance Shelter Area 3',
        address: 'Pertamina Refinery Unit VI Balongan, Maintenance Zone 3',
        latitude: -6.3030,
        longitude: 108.4465
      },
      {
        name: 'Maintenance Shelter Area 4',
        address: 'Pertamina Refinery Unit VI Balongan, Maintenance Zone 4',
        latitude: -6.3035,
        longitude: 108.4470
      },
      {
        name: 'White OM Shelter',
        address: 'Pertamina Refinery Unit VI Balongan, OM Area',
        latitude: -6.3000,
        longitude: 108.4448
      },
      {
        name: 'Entrance to Pertamina Refinery Area',
        address: 'Pertamina Refinery Unit VI Balongan, Refinery Entrance',
        latitude: -6.2990,
        longitude: 108.4440
      },
      {
        name: 'Marine Region III Pertamina Balongan',
        address: 'Pertamina Refinery Unit VI Balongan, Marine Terminal',
        latitude: -6.2985,
        longitude: 108.4425
      },
      {
        name: 'Main Control Room',
        address: 'Pertamina Refinery Unit VI Balongan, Control Center',
        latitude: -6.3008,
        longitude: 108.4445
      },
      {
        name: 'Tank Farm Area 1',
        address: 'Pertamina Refinery Unit VI Balongan, Storage Tank Area 1',
        latitude: -6.3015,
        longitude: 108.4475
      },
      {
        name: 'EXOR Building',
        address: 'Pertamina Refinery Unit VI Balongan, EXOR Facility',
        latitude: -6.3010,
        longitude: 108.4438
      },
      {
        name: 'Crude Distillation Unit (CDU) Production Area',
        address: 'Pertamina Refinery Unit VI Balongan, CDU Production',
        latitude: -6.3040,
        longitude: 108.4480
      },
      {
        name: 'HSSE Demo Room',
        address: 'Pertamina Refinery Unit VI Balongan, HSSE Training',
        latitude: -6.2998,
        longitude: 108.4440
      },
      {
        name: 'Amanah Building',
        address: 'Pertamina Refinery Unit VI Balongan, Amanah Complex',
        latitude: -6.3002,
        longitude: 108.4444
      },
      {
        name: 'POC',
        address: 'Pertamina Refinery Unit VI Balongan, POC Area',
        latitude: -6.3018,
        longitude: 108.4452
      },
      {
        name: 'JGC',
        address: 'Pertamina Refinery Unit VI Balongan, JGC Facility',
        latitude: -6.3022,
        longitude: 108.4458
      }
    ];

    // Check if buildings already exist
    const existingBuildings = await db.select({ count: sql<number>`count(*)` })
      .from(buildingsTable)
      .execute();

    if (existingBuildings[0].count > 0) {
      return {
        message: 'Buildings already initialized.',
        count: 0
      };
    }

    // Insert all buildings
    const insertData = buildings.map(building => ({
      name: building.name,
      address: building.address,
      latitude: building.latitude.toString(),
      longitude: building.longitude.toString()
    }));

    await db.insert(buildingsTable)
      .values(insertData)
      .execute();

    return {
      message: 'Pertamina buildings initialized successfully.',
      count: buildings.length
    };
  } catch (error) {
    console.error('Pertamina buildings initialization failed:', error);
    throw error;
  }
}