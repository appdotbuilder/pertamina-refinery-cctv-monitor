import { db } from '../db';
import { cctvTable, roomsTable, buildingsTable } from '../db/schema';
import { 
  type Cctv, 
  type CreateCctvInput, 
  type UpdateCctvInput,
  type CctvFilterInput,
  type CctvStatus
} from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export const getCctvs = async (): Promise<Cctv[]> => {
  try {
    const results = await db.select()
      .from(cctvTable)
      .execute();

    return results.map(cctv => ({
      ...cctv,
      latitude: parseFloat(cctv.latitude),
      longitude: parseFloat(cctv.longitude)
    }));
  } catch (error) {
    console.error('Failed to fetch CCTVs:', error);
    throw error;
  }
};

export const getCctvById = async (id: number): Promise<Cctv | null> => {
  try {
    const results = await db.select()
      .from(cctvTable)
      .where(eq(cctvTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const cctv = results[0];
    return {
      ...cctv,
      latitude: parseFloat(cctv.latitude),
      longitude: parseFloat(cctv.longitude)
    };
  } catch (error) {
    console.error('Failed to fetch CCTV by ID:', error);
    throw error;
  }
};

export const getCctvsByRoomId = async (roomId: number): Promise<Cctv[]> => {
  try {
    const results = await db.select()
      .from(cctvTable)
      .where(eq(cctvTable.room_id, roomId))
      .execute();

    return results.map(cctv => ({
      ...cctv,
      latitude: parseFloat(cctv.latitude),
      longitude: parseFloat(cctv.longitude)
    }));
  } catch (error) {
    console.error('Failed to fetch CCTVs by room ID:', error);
    throw error;
  }
};

export const getCctvsByBuildingId = async (buildingId: number): Promise<Cctv[]> => {
  try {
    const results = await db.select()
      .from(cctvTable)
      .innerJoin(roomsTable, eq(cctvTable.room_id, roomsTable.id))
      .where(eq(roomsTable.building_id, buildingId))
      .execute();

    return results.map(result => {
      const cctv = result.cctv;
      return {
        ...cctv,
        latitude: parseFloat(cctv.latitude),
        longitude: parseFloat(cctv.longitude)
      };
    });
  } catch (error) {
    console.error('Failed to fetch CCTVs by building ID:', error);
    throw error;
  }
};

export const getFilteredCctvs = async (filter: CctvFilterInput): Promise<Cctv[]> => {
  try {
    // Handle the two different query patterns separately to avoid type issues
    if (filter.building_id !== undefined) {
      // Query with join when building filter is present
      const conditions: SQL<unknown>[] = [eq(roomsTable.building_id, filter.building_id)];

      if (filter.status !== undefined) {
        conditions.push(eq(cctvTable.status, filter.status));
      }

      const results = await db.select()
        .from(cctvTable)
        .innerJoin(roomsTable, eq(cctvTable.room_id, roomsTable.id))
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .execute();

      return results.map(result => {
        const cctvData = result.cctv;
        return {
          ...cctvData,
          latitude: parseFloat(cctvData.latitude),
          longitude: parseFloat(cctvData.longitude)
        };
      });
    } else {
      // Query without join when no building filter
      if (filter.status !== undefined) {
        const results = await db.select()
          .from(cctvTable)
          .where(eq(cctvTable.status, filter.status))
          .execute();

        return results.map(result => ({
          ...result,
          latitude: parseFloat(result.latitude),
          longitude: parseFloat(result.longitude)
        }));
      } else {
        const results = await db.select()
          .from(cctvTable)
          .execute();

        return results.map(result => ({
          ...result,
          latitude: parseFloat(result.latitude),
          longitude: parseFloat(result.longitude)
        }));
      }
    }
  } catch (error) {
    console.error('Failed to fetch filtered CCTVs:', error);
    throw error;
  }
};

export const createCctv = async (input: CreateCctvInput): Promise<Cctv> => {
  try {
    // Verify that room exists
    const room = await db.select()
      .from(roomsTable)
      .where(eq(roomsTable.id, input.room_id))
      .execute();

    if (room.length === 0) {
      throw new Error('Room not found');
    }

    const results = await db.insert(cctvTable)
      .values({
        room_id: input.room_id,
        name: input.name,
        ip_address: input.ip_address,
        rtsp_url: input.rtsp_url,
        status: input.status,
        latitude: input.latitude.toString(),
        longitude: input.longitude.toString()
      })
      .returning()
      .execute();

    const cctv = results[0];
    return {
      ...cctv,
      latitude: parseFloat(cctv.latitude),
      longitude: parseFloat(cctv.longitude)
    };
  } catch (error) {
    console.error('Failed to create CCTV:', error);
    throw error;
  }
};

export const updateCctv = async (input: UpdateCctvInput): Promise<Cctv> => {
  try {
    // Verify that CCTV exists
    const existing = await db.select()
      .from(cctvTable)
      .where(eq(cctvTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error('CCTV not found');
    }

    // If room_id is being updated, verify room exists
    if (input.room_id !== undefined) {
      const room = await db.select()
        .from(roomsTable)
        .where(eq(roomsTable.id, input.room_id))
        .execute();

      if (room.length === 0) {
        throw new Error('Room not found');
      }
    }

    const updateData: any = {};
    
    if (input.room_id !== undefined) updateData.room_id = input.room_id;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.ip_address !== undefined) updateData.ip_address = input.ip_address;
    if (input.rtsp_url !== undefined) updateData.rtsp_url = input.rtsp_url;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.latitude !== undefined) updateData.latitude = input.latitude.toString();
    if (input.longitude !== undefined) updateData.longitude = input.longitude.toString();

    updateData.updated_at = new Date();

    const results = await db.update(cctvTable)
      .set(updateData)
      .where(eq(cctvTable.id, input.id))
      .returning()
      .execute();

    const cctv = results[0];
    return {
      ...cctv,
      latitude: parseFloat(cctv.latitude),
      longitude: parseFloat(cctv.longitude)
    };
  } catch (error) {
    console.error('Failed to update CCTV:', error);
    throw error;
  }
};

export const updateCctvStatus = async (id: number, status: CctvStatus): Promise<Cctv> => {
  try {
    const results = await db.update(cctvTable)
      .set({ 
        status, 
        updated_at: new Date() 
      })
      .where(eq(cctvTable.id, id))
      .returning()
      .execute();

    if (results.length === 0) {
      throw new Error('CCTV not found');
    }

    const cctv = results[0];
    return {
      ...cctv,
      latitude: parseFloat(cctv.latitude),
      longitude: parseFloat(cctv.longitude)
    };
  } catch (error) {
    console.error('Failed to update CCTV status:', error);
    throw error;
  }
};

export const deleteCctv = async (id: number): Promise<{ message: string }> => {
  try {
    const result = await db.delete(cctvTable)
      .where(eq(cctvTable.id, id))
      .execute();

    if (result.rowCount === 0) {
      throw new Error('CCTV not found');
    }

    return {
      message: 'CCTV deleted successfully.'
    };
  } catch (error) {
    console.error('Failed to delete CCTV:', error);
    throw error;
  }
};

export const getCctvStream = async (id: number): Promise<{ stream_url: string; status: string }> => {
  try {
    const results = await db.select()
      .from(cctvTable)
      .where(eq(cctvTable.id, id))
      .execute();

    if (results.length === 0) {
      throw new Error('CCTV not found');
    }

    const cctv = results[0];
    
    return {
      stream_url: cctv.rtsp_url,
      status: cctv.status
    };
  } catch (error) {
    console.error('Failed to get CCTV stream:', error);
    throw error;
  }
};

export const initializeCctvSamples = async (): Promise<{ message: string; count: number }> => {
  try {
    // First, check if we have any rooms
    const rooms = await db.select()
      .from(roomsTable)
      .execute();

    if (rooms.length === 0) {
      throw new Error('No rooms available - please create rooms first');
    }

    const sampleCctvs = [];
    let ipCounter = 1;

    // Generate up to 50 sample CCTVs
    for (let i = 0; i < Math.min(50, rooms.length * 5); i++) {
      const roomIndex = i % rooms.length;
      const room = rooms[roomIndex];
      
      // Generate IP in format 10.56.236.XXX
      const ip = `10.56.236.${ipCounter}`;
      ipCounter++;

      sampleCctvs.push({
        room_id: room.id,
        name: `CCTV Camera ${i + 1}`,
        ip_address: ip,
        rtsp_url: `rtsp://admin:password.123@${ip}/streaming/channels/`,
        status: ['ONLINE', 'OFFLINE', 'MAINTENANCE'][i % 3] as CctvStatus,
        latitude: (-6.2 + (Math.random() * 0.4)).toString(), // Jakarta area latitude range
        longitude: (106.8 + (Math.random() * 0.4)).toString() // Jakarta area longitude range
      });
    }

    // Batch insert
    const results = await db.insert(cctvTable)
      .values(sampleCctvs)
      .execute();

    return {
      message: 'Sample CCTVs initialized successfully.',
      count: sampleCctvs.length
    };
  } catch (error) {
    console.error('Failed to initialize sample CCTVs:', error);
    throw error;
  }
};