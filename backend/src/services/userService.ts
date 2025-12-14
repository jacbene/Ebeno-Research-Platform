import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Deletes a user and all of their associated data.
 * Relies on the cascading delete behavior defined in the Prisma schema.
 * @param userId The ID of the user to delete.
 */
export const deleteUserAndData = async (userId: string) => {
  try {
    // The Prisma schema is set up with cascading deletes. 
    // Deleting a user will automatically trigger the deletion of all related data,
    // such as profiles, projects they own, documents, transcriptions, etc.
    await prisma.user.delete({
      where: { id: userId },
    });
  } catch (error) {
    console.error(`Failed to delete user ${userId}:`, error);
    // Re-throw the error to be handled by the controller
    throw new Error('Database error while trying to delete user data.');
  }
};

/**
 * Exports all data for a given user in a single JSON object.
 * @param userId The ID of the user whose data to export.
 */
export const exportUserData = async (userId: string) => {
  try {
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        createdProjects: {
          include: {
            members: true,
            tags: true,
            transcriptions: true,
            aiAnalyses: true,
            documents: true,
          },
        },
        projectMemberships: {
          include: {
            project: true,
          },
        },
        transcriptions: true,
        aiAnalyses: true,
        documents: true,
        annotations: true,
        memos: true,
      },
    });

    if (!userData) {
      throw new Error('User not found.');
    }

    // We don't want to export the password hash.
    const { passwordHash, ...sanitizedUserData } = userData;

    return sanitizedUserData;
  } catch (error) {
    console.error(`Failed to export data for user ${userId}:`, error);
    throw new Error('Database error while trying to export user data.');
  }
};