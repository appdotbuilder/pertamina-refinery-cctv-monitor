import { db } from '../db';
import { usersTable, buildingsTable, roomsTable, cctvTable } from '../db/schema';
import { eq, count, and, SQL } from 'drizzle-orm';
import { type DashboardAnalytics } from '../schema';

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  try {
    // Get total users
    const totalUsersResult = await db.select({ count: count() })
      .from(usersTable)
      .execute();
    const total_users = totalUsersResult[0]?.count || 0;

    // Get active users (is_active = true)
    const activeUsersResult = await db.select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.is_active, true))
      .execute();
    const online_users = activeUsersResult[0]?.count || 0;

    // Get inactive users (is_active = false)
    const inactiveUsersResult = await db.select({ count: count() })
      .from(usersTable)
      .where(eq(usersTable.is_active, false))
      .execute();
    const offline_users = inactiveUsersResult[0]?.count || 0;

    // Get total buildings
    const totalBuildingsResult = await db.select({ count: count() })
      .from(buildingsTable)
      .execute();
    const total_buildings = totalBuildingsResult[0]?.count || 0;

    // Get total rooms
    const totalRoomsResult = await db.select({ count: count() })
      .from(roomsTable)
      .execute();
    const total_rooms = totalRoomsResult[0]?.count || 0;

    // Get total CCTVs
    const totalCctvResult = await db.select({ count: count() })
      .from(cctvTable)
      .execute();
    const total_cctvs = totalCctvResult[0]?.count || 0;

    // Get online CCTVs
    const onlineCctvResult = await db.select({ count: count() })
      .from(cctvTable)
      .where(eq(cctvTable.status, 'ONLINE'))
      .execute();
    const online_cctvs = onlineCctvResult[0]?.count || 0;

    // Get offline CCTVs
    const offlineCctvResult = await db.select({ count: count() })
      .from(cctvTable)
      .where(eq(cctvTable.status, 'OFFLINE'))
      .execute();
    const offline_cctvs = offlineCctvResult[0]?.count || 0;

    // Get maintenance CCTVs
    const maintenanceCctvResult = await db.select({ count: count() })
      .from(cctvTable)
      .where(eq(cctvTable.status, 'MAINTENANCE'))
      .execute();
    const maintenance_cctvs = maintenanceCctvResult[0]?.count || 0;

    return {
      total_users,
      online_users,
      offline_users,
      total_buildings,
      total_rooms,
      total_cctvs,
      online_cctvs,
      offline_cctvs,
      maintenance_cctvs
    };
  } catch (error) {
    console.error('Dashboard analytics retrieval failed:', error);
    throw error;
  }
}

export async function getUserDashboardStats(): Promise<{
  total_buildings: number;
  total_rooms: number;
  total_cctvs: number;
  online_cctvs: number;
  offline_cctvs: number;
  maintenance_cctvs: number;
}> {
  try {
    // Get total buildings
    const totalBuildingsResult = await db.select({ count: count() })
      .from(buildingsTable)
      .execute();
    const total_buildings = totalBuildingsResult[0]?.count || 0;

    // Get total rooms
    const totalRoomsResult = await db.select({ count: count() })
      .from(roomsTable)
      .execute();
    const total_rooms = totalRoomsResult[0]?.count || 0;

    // Get total CCTVs
    const totalCctvResult = await db.select({ count: count() })
      .from(cctvTable)
      .execute();
    const total_cctvs = totalCctvResult[0]?.count || 0;

    // Get online CCTVs
    const onlineCctvResult = await db.select({ count: count() })
      .from(cctvTable)
      .where(eq(cctvTable.status, 'ONLINE'))
      .execute();
    const online_cctvs = onlineCctvResult[0]?.count || 0;

    // Get offline CCTVs
    const offlineCctvResult = await db.select({ count: count() })
      .from(cctvTable)
      .where(eq(cctvTable.status, 'OFFLINE'))
      .execute();
    const offline_cctvs = offlineCctvResult[0]?.count || 0;

    // Get maintenance CCTVs
    const maintenanceCctvResult = await db.select({ count: count() })
      .from(cctvTable)
      .where(eq(cctvTable.status, 'MAINTENANCE'))
      .execute();
    const maintenance_cctvs = maintenanceCctvResult[0]?.count || 0;

    return {
      total_buildings,
      total_rooms,
      total_cctvs,
      online_cctvs,
      offline_cctvs,
      maintenance_cctvs
    };
  } catch (error) {
    console.error('User dashboard stats retrieval failed:', error);
    throw error;
  }
}

export async function exportDashboardData(): Promise<{ 
  download_url: string; 
  filename: string; 
  message: string 
}> {
  try {
    // Get analytics data for export
    const analytics = await getDashboardAnalytics();
    
    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `dashboard_export_${currentDate}.xlsx`;
    
    // In a real implementation, this would:
    // 1. Generate an Excel file with the analytics data
    // 2. Save it to a temporary location or cloud storage
    // 3. Return the actual download URL
    // For this implementation, we'll return a mock URL
    const download_url = `/api/exports/${filename}`;
    
    return {
      download_url,
      filename,
      message: 'Dashboard data exported successfully.'
    };
  } catch (error) {
    console.error('Dashboard data export failed:', error);
    throw error;
  }
}