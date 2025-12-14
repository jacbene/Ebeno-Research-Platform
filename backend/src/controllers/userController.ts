import { Request, Response } from 'express';
import { deleteUserAndData, exportUserData } from '../services/userService';

export const deleteCurrentUser = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await deleteUserAndData(userId);
    res.status(200).json({ message: 'User account and all associated data have been successfully deleted.' });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({ message: 'An error occurred while deleting the user account.' });
  }
};

export const exportCurrentUserDate = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userData = await exportUserData(userId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="ebeno_research_data_export.json"');
    res.status(200).json(userData);
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ message: 'An error occurred while exporting user data.' });
  }
};