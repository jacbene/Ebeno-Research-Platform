import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Dans authMiddleware.ts, mettez à jour l'interface
interface DecodedToken {
  user: {
    id: string;
    email: string;
    role: string; // Ajoutez le rôle
    isVerified: boolean; // Ajoutez la vérification
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
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// authMiddleware.ts - Ajoutez ces fonctions à la fin du fichier

// Vérifier si l'utilisateur est vérifié
export const requireVerification = (req: Request, res: Response, next: NextFunction) => {
  // Note: Vous devrez récupérer l'utilisateur depuis la base de données
  // pour vérifier le champ isVerified
  // Ce middleware suppose que vous avez attaché l'objet user complet à req.user
  if (!req.user?.isVerified) {
    return res.status(403).json({ 
      msg: 'Account not verified. Please verify your email address.' 
    });
  }
  next();
};

// Middleware pour les rôles spécifiques
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // À adapter selon comment vous stockez le rôle dans le token
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        msg: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }
    next();
  };
};

// Middleware pour vérifier la propriété/projet
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
