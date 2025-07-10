import { Request, Response } from 'express';
import Patient, { patientStatus } from '../models/patient';

// Get patients based on user role
export const getPatients = async (req: Request, res: Response): Promise<void> => {
    try {
        const userRole = req.user?.role;
        let query = {};

        // Apply role-based filters
        switch (userRole) {
            case 'registrar':
                // Registrar can see all patients
                break;
            case 'nurse':
                // Nurse can only see patients with status 'registered'
                query = { status: 'registered' };
                break;
            case 'doctor':
                // Doctor can see patients with nurse notes taken
                query = { 
                    status: 'awaiting_doctor',
                    nurseNote: { $exists: true, $ne: null }
                };
                break;
            case 'pharmacist':
                // Pharmacist can only see patients awaiting medication
                query = { status: 'awaiting_medication' };
                break;
            case 'admin':
                // Admin can see all patients
                break;
            default:
                res.status(403).json({ message: 'Invalid role' });
                return;
        }

        const patients = await Patient.find(query).sort({ 'timeStamp.registeredAt': -1 });
        res.json(patients);
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get single patient with role-based access
export const getPatient = async (req: Request, res: Response): Promise<void> => {
    try {
        const patient = await Patient.findById(req.params.id);
        
        if (!patient) {
            res.status(404).json({ message: 'Patient not found' });
            return;
        }

        // Check role-based access
        const userRole = req.user?.role;
        switch (userRole) {
            case 'nurse':
                if (patient.status !== 'registered') {
                    res.status(403).json({ message: 'Access denied' });
                    return;
                }
                break;
            case 'doctor':
                if (patient.status !== 'awaiting_doctor' || !patient.nurseNotes) {
                    res.status(403).json({ message: 'Access denied - Patient needs nurse notes first' });
                    return;
                }
                break;
            case 'pharmacist':
                if (patient.status !== 'awaiting_medication') {
                    res.status(403).json({ message: 'Access denied' });
                    return;
                }
                break;
            case 'registrar':
            case 'admin':
                // They can access all patients
                break;
            default:
                res.status(403).json({ message: 'Invalid role' });
                return;
        }

        res.json(patient);
    } catch (error) {
        console.error('Error fetching patient:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}; 