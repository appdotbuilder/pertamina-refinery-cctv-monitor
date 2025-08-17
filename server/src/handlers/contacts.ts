import { db } from '../db';
import { contactsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { 
  type Contact, 
  type CreateContactInput, 
  type UpdateContactInput 
} from '../schema';

export async function getContacts(): Promise<Contact[]> {
  try {
    const results = await db.select()
      .from(contactsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    throw error;
  }
}

export async function getContactById(id: number): Promise<Contact | null> {
  try {
    const results = await db.select()
      .from(contactsTable)
      .where(eq(contactsTable.id, id))
      .execute();

    return results[0] || null;
  } catch (error) {
    console.error('Failed to fetch contact by ID:', error);
    throw error;
  }
}

export async function createContact(input: CreateContactInput): Promise<Contact> {
  try {
    const result = await db.insert(contactsTable)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        whatsapp: input.whatsapp
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Failed to create contact:', error);
    throw error;
  }
}

export async function updateContact(input: UpdateContactInput): Promise<Contact> {
  try {
    // Check if contact exists
    const existingContact = await getContactById(input.id);
    if (!existingContact) {
      throw new Error(`Contact with ID ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof contactsTable.$inferInsert> = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.whatsapp !== undefined) updateData.whatsapp = input.whatsapp;

    const result = await db.update(contactsTable)
      .set(updateData)
      .where(eq(contactsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Failed to update contact:', error);
    throw error;
  }
}

export async function deleteContact(id: number): Promise<{ message: string }> {
  try {
    // Check if contact exists
    const existingContact = await getContactById(id);
    if (!existingContact) {
      throw new Error(`Contact with ID ${id} not found`);
    }

    await db.delete(contactsTable)
      .where(eq(contactsTable.id, id))
      .execute();

    return {
      message: 'Contact deleted successfully.'
    };
  } catch (error) {
    console.error('Failed to delete contact:', error);
    throw error;
  }
}