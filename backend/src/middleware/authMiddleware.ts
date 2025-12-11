import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  user: {
    id: string;
    email: string;
    role: string;
    isVerified: boolean;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken['user'];
    }
  }
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

export const requireVerification = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isVerified) {
    return res.status(403).json({ 
      msg: 'Account not verified. Please verify your email address.' 
    });
  }
  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        msg: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }
    next();
  };
};

export const requireOwnership = (resourceOwnerId: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.id !== resourceOwnerId) {
      return res.status(403).json({ 
        msg: 'Access denied. You do not own this resource.' 
      });
    }
    next();
  };
};
