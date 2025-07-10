import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/user';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                username: string;
                role: UserRole;
            };
        }
    }
}

// Mock token verification - in production, use proper JWT verification
export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'No token provided' });
        return;
    }

    try {
        // Mock token verification - in production, verify JWT here
        const user = JSON.parse(Buffer.from(token, 'base64').toString());
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
        return;
    }
};

// Role-based access middleware
export const checkRole = (allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }

        next();
    };
}; 