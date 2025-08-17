import { db } from '../db';
import { roomsTable, buildingsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { 
  type Room, 
  type CreateRoomInput, 
  type UpdateRoomInput 
} from '../schema';

export async function getRooms(): Promise<Room[]> {
  try {
    const results = await db.select()
      .from(roomsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch rooms:', error);
    throw error;
  }
}

export async function getRoomById(id: number): Promise<Room | null> {
  try {
    const results = await db.select()
      .from(roomsTable)
      .where(eq(roomsTable.id, id))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Failed to fetch room by ID:', error);
    throw error;
  }
}

export async function getRoomsByBuildingId(buildingId: number): Promise<Room[]> {
  try {
    const results = await db.select()
      .from(roomsTable)
      .where(eq(roomsTable.building_id, buildingId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch rooms by building ID:', error);
    throw error;
  }
}

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  try {
    // Verify that the building exists
    const buildingExists = await db.select()
      .from(buildingsTable)
      .where(eq(buildingsTable.id, input.building_id))
      .execute();

    if (buildingExists.length === 0) {
      throw new Error('Building not found');
    }

    // Insert new room
    const result = await db.insert(roomsTable)
      .values({
        building_id: input.building_id,
        name: input.name,
        floor: input.floor
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Room creation failed:', error);
    throw error;
  }
}

export async function updateRoom(input: UpdateRoomInput): Promise<Room> {
  try {
    // Check if room exists
    const existingRoom = await db.select()
      .from(roomsTable)
      .where(eq(roomsTable.id, input.id))
      .execute();

    if (existingRoom.length === 0) {
      throw new Error('Room not found');
    }

    // If building_id is being updated, verify the new building exists
    if (input.building_id !== undefined) {
      const buildingExists = await db.select()
        .from(buildingsTable)
        .where(eq(buildingsTable.id, input.building_id))
        .execute();

      if (buildingExists.length === 0) {
        throw new Error('Building not found');
      }
    }

    // Update room
    const result = await db.update(roomsTable)
      .set({
        ...(input.building_id !== undefined && { building_id: input.building_id }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.floor !== undefined && { floor: input.floor }),
        updated_at: new Date()
      })
      .where(eq(roomsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Room update failed:', error);
    throw error;
  }
}

export async function deleteRoom(id: number): Promise<{ message: string }> {
  try {
    // Check if room exists
    const existingRoom = await db.select()
      .from(roomsTable)
      .where(eq(roomsTable.id, id))
      .execute();

    if (existingRoom.length === 0) {
      throw new Error('Room not found');
    }

    // Delete room (cascade will handle associated CCTVs)
    await db.delete(roomsTable)
      .where(eq(roomsTable.id, id))
      .execute();

    return {
      message: 'Room deleted successfully.'
    };
  } catch (error) {
    console.error('Room deletion failed:', error);
    throw error;
  }
}