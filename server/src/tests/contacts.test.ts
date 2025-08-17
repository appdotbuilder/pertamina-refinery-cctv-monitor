import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { contactsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { 
  type CreateContactInput,
  type UpdateContactInput 
} from '../schema';
import { 
  getContacts, 
  getContactById, 
  createContact, 
  updateContact, 
  deleteContact 
} from '../handlers/contacts';

// Test input data
const testContactInput: CreateContactInput = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+62-812-3456-7890',
  address: '123 Main Street, Jakarta',
  whatsapp: '+62-812-3456-7890'
};

const secondContactInput: CreateContactInput = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  phone: '+62-813-9876-5432',
  address: '456 Oak Avenue, Bandung',
  whatsapp: '+62-813-9876-5432'
};

describe('contacts handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createContact', () => {
    it('should create a contact successfully', async () => {
      const result = await createContact(testContactInput);

      expect(result.name).toEqual('John Doe');
      expect(result.email).toEqual('john.doe@example.com');
      expect(result.phone).toEqual('+62-812-3456-7890');
      expect(result.address).toEqual('123 Main Street, Jakarta');
      expect(result.whatsapp).toEqual('+62-812-3456-7890');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save contact to database', async () => {
      const result = await createContact(testContactInput);

      const contacts = await db.select()
        .from(contactsTable)
        .where(eq(contactsTable.id, result.id))
        .execute();

      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toEqual('John Doe');
      expect(contacts[0].email).toEqual('john.doe@example.com');
      expect(contacts[0].phone).toEqual('+62-812-3456-7890');
      expect(contacts[0].address).toEqual('123 Main Street, Jakarta');
      expect(contacts[0].whatsapp).toEqual('+62-812-3456-7890');
    });
  });

  describe('getContacts', () => {
    it('should return empty array when no contacts exist', async () => {
      const result = await getContacts();
      expect(result).toEqual([]);
    });

    it('should return all contacts', async () => {
      // Create test contacts
      await createContact(testContactInput);
      await createContact(secondContactInput);

      const result = await getContacts();

      expect(result).toHaveLength(2);
      expect(result[0].name).toEqual('John Doe');
      expect(result[1].name).toEqual('Jane Smith');
      
      // Verify all fields are present
      result.forEach(contact => {
        expect(contact.id).toBeDefined();
        expect(contact.name).toBeDefined();
        expect(contact.email).toBeDefined();
        expect(contact.phone).toBeDefined();
        expect(contact.address).toBeDefined();
        expect(contact.whatsapp).toBeDefined();
        expect(contact.created_at).toBeInstanceOf(Date);
        expect(contact.updated_at).toBeInstanceOf(Date);
      });
    });
  });

  describe('getContactById', () => {
    it('should return null for non-existent contact', async () => {
      const result = await getContactById(999);
      expect(result).toBeNull();
    });

    it('should return contact by ID', async () => {
      const createdContact = await createContact(testContactInput);

      const result = await getContactById(createdContact.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdContact.id);
      expect(result!.name).toEqual('John Doe');
      expect(result!.email).toEqual('john.doe@example.com');
      expect(result!.phone).toEqual('+62-812-3456-7890');
      expect(result!.address).toEqual('123 Main Street, Jakarta');
      expect(result!.whatsapp).toEqual('+62-812-3456-7890');
    });
  });

  describe('updateContact', () => {
    it('should update contact with all fields', async () => {
      const createdContact = await createContact(testContactInput);

      const updateInput: UpdateContactInput = {
        id: createdContact.id,
        name: 'John Updated',
        email: 'john.updated@example.com',
        phone: '+62-999-8888-7777',
        address: '789 Updated Street',
        whatsapp: '+62-999-8888-7777'
      };

      const result = await updateContact(updateInput);

      expect(result.id).toEqual(createdContact.id);
      expect(result.name).toEqual('John Updated');
      expect(result.email).toEqual('john.updated@example.com');
      expect(result.phone).toEqual('+62-999-8888-7777');
      expect(result.address).toEqual('789 Updated Street');
      expect(result.whatsapp).toEqual('+62-999-8888-7777');
    });

    it('should update contact with partial fields', async () => {
      const createdContact = await createContact(testContactInput);

      const updateInput: UpdateContactInput = {
        id: createdContact.id,
        name: 'John Partial',
        phone: '+62-555-4444-3333'
      };

      const result = await updateContact(updateInput);

      expect(result.id).toEqual(createdContact.id);
      expect(result.name).toEqual('John Partial');
      expect(result.phone).toEqual('+62-555-4444-3333');
      // Other fields should remain unchanged
      expect(result.email).toEqual('john.doe@example.com');
      expect(result.address).toEqual('123 Main Street, Jakarta');
      expect(result.whatsapp).toEqual('+62-812-3456-7890');
    });

    it('should throw error for non-existent contact', async () => {
      const updateInput: UpdateContactInput = {
        id: 999,
        name: 'Non Existent'
      };

      await expect(updateContact(updateInput)).rejects.toThrow(/Contact with ID 999 not found/);
    });

    it('should save updated contact to database', async () => {
      const createdContact = await createContact(testContactInput);

      const updateInput: UpdateContactInput = {
        id: createdContact.id,
        name: 'Database Updated'
      };

      await updateContact(updateInput);

      const contacts = await db.select()
        .from(contactsTable)
        .where(eq(contactsTable.id, createdContact.id))
        .execute();

      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toEqual('Database Updated');
      expect(contacts[0].email).toEqual('john.doe@example.com'); // Unchanged
    });
  });

  describe('deleteContact', () => {
    it('should delete existing contact', async () => {
      const createdContact = await createContact(testContactInput);

      const result = await deleteContact(createdContact.id);

      expect(result.message).toEqual('Contact deleted successfully.');

      // Verify contact is deleted from database
      const contacts = await db.select()
        .from(contactsTable)
        .where(eq(contactsTable.id, createdContact.id))
        .execute();

      expect(contacts).toHaveLength(0);
    });

    it('should throw error for non-existent contact', async () => {
      await expect(deleteContact(999)).rejects.toThrow(/Contact with ID 999 not found/);
    });

    it('should not affect other contacts when deleting one', async () => {
      const contact1 = await createContact(testContactInput);
      const contact2 = await createContact(secondContactInput);

      await deleteContact(contact1.id);

      // Verify only the targeted contact was deleted
      const remainingContacts = await getContacts();
      expect(remainingContacts).toHaveLength(1);
      expect(remainingContacts[0].id).toEqual(contact2.id);
      expect(remainingContacts[0].name).toEqual('Jane Smith');
    });
  });
});