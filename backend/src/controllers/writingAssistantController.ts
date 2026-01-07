import { Request, Response } from 'express';

export const getWritingSuggestions = (req: Request, res: Response) => {
  res.json({ message: 'Writing suggestions' });
};

export const getPlagiarismReport = (req: Request, res: Response) => {
  res.json({ message: 'Plagiarism report' });
};
