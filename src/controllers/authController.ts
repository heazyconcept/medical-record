import { Request, Response } from 'express';
import User, { IUser } from '../models/user';

export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const user = await User.findOne({ username });

        if (!user || user.password !== password) { // In production, use proper password hashing
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create a mock token - in production, use proper JWT
        const token = Buffer.from(JSON.stringify({
            id: user._id,
            username: user.username,
            role: user.role
        })).toString('base64');

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Helper function to create initial users (for testing)
export const createInitialUsers = async () => {
    try {
        const users = [
            { username: 'registrar1', password: 'password123', role: 'registrar' },
            { username: 'nurse1', password: 'password123', role: 'nurse' },
            { username: 'doctor1', password: 'password123', role: 'doctor' },
            { username: 'pharmacist1', password: 'password123', role: 'pharmacist' },
            { username: 'admin1', password: 'password123', role: 'admin' }
        ];

        for (const userData of users) {
            const existingUser = await User.findOne({ username: userData.username });
            if (!existingUser) {
                await User.create(userData);
            }
        }

        console.log('Initial users created successfully');
    } catch (error) {
        console.error('Error creating initial users:', error);
    }
}; 