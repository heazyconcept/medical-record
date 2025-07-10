import express, { Router } from 'express';
import { getPatients, getPatient } from '../controllers/patientController';
import { verifyToken, checkRole } from '../middleware/auth';
import { UserRole } from '../models/user';

const router: Router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Define allowed roles
const allRoles: UserRole[] = ['registrar', 'nurse', 'doctor', 'pharmacist', 'admin'];

// Get all patients (filtered by role)
router.get('/', checkRole(allRoles), getPatients);

// Get single patient (with role-based access)
router.get('/:id', checkRole(allRoles), getPatient);

export default router; 