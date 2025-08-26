import { Request, Response, RequestHandler } from "express";

export const createGrievance: RequestHandler = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

export const getGrievanceById: RequestHandler = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
};

export const getAllGrievances: RequestHandler = async (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented yet' });
};
