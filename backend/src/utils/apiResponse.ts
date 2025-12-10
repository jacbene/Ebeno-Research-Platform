import { Response } from 'express';

export class ApiResponse {
  static success(res: Response, data: any, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
    });
  }

  static created(res: Response, data: any, message = 'Created') {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }

  static error(res: Response, statusCode: number, message: string, errors?: any) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }
}
