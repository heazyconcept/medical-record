import express, { Router } from 'express';
import { 
    getPatients, 
    getPatient, 
    registerPatient,
    addNurseNotes,
    addDoctorNote,
    addMedication,
    reconsultPatient,
    reEditPatientRegistration
} from '../controllers/patientController';
import { verifyToken, checkRole } from '../middleware/auth';
import { UserRole } from '../models/user';

const router: Router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Define role groups
const allRoles: UserRole[] = ['registrar', 'nurse', 'doctor', 'pharmacist', 'admin'];
const registrarRoles: UserRole[] = ['registrar', 'admin'];
const nurseRoles: UserRole[] = ['nurse', 'admin'];
const doctorRoles: UserRole[] = ['doctor', 'admin'];
const pharmacistRoles: UserRole[] = ['pharmacist', 'admin'];

// Get all patients (filtered by role)
router.get('/', checkRole(allRoles), getPatients);

// Get single patient (with role-based access)
router.get('/:id', checkRole(allRoles), getPatient);

// Register new patient (Registrar only)
router.post('/register', checkRole(registrarRoles), registerPatient);

// Add nurse notes (Nurse only)
router.patch('/:id/nurse-notes', checkRole(nurseRoles), addNurseNotes);

// Add doctor notes (Doctor only)
router.patch('/:id/doctor-note', checkRole(doctorRoles), addDoctorNote);

// Add medication (Pharmacist only)
router.patch('/:id/medication', checkRole(pharmacistRoles), addMedication);

// Reconsult patient (Doctor only)
router.patch('/:id/reconsult', checkRole(doctorRoles), reconsultPatient);

// Re-edit patient registration (Registrar only)
router.put('/:id/registration', checkRole(registrarRoles), reEditPatientRegistration);

export default router; 