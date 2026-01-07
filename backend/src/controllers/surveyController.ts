import { Request, Response } from 'express';

export const createSurvey = (req: Request, res: Response) => {
  res.json({ message: 'Survey created' });
};

export const getSurvey = (req: Request, res: Response) => {
  res.json({ message: 'Survey retrieved' });
};

export const updateSurvey = (req: Request, res: Response) => {
  res.json({ message: 'Survey updated' });
};

export const deleteSurvey = (req: Request, res: Response) => {
  res.json({ message: 'Survey deleted' });
};
