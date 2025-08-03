import { Request, Response } from 'express';
import Patient, { IPatient, patientStatus } from '../models/patient';
import { calculateAge } from './utils';

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
                // Nurse can see all patients
                break;
            case 'doctor':
                // Doctor can see patients with nurse notes taken
                query = { 
                    status: 'awaiting_doctor',
                    nurseNotes: { $exists: true, $ne: null }
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

        // Sort by registeredAt timestamp in ascending order (oldest first - FIFO)
        const patients = await Patient.find(query).sort({ 'timestamps.registeredAt': 1 });
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

// Register new patient (Registrar only)
export const registerPatient = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check role
        if (req.user?.role !== 'registrar' && req.user?.role !== 'admin') {
            res.status(403).json({ message: 'Only registrars can register patients' });
            return;
        }

        const {
            firstName, 
            lastName, 
            dateOfBirth, 
            phoneNumber,
            address
        } = req.body;

        // Check if patient exists
        const existingPatient = await Patient.findOne({ phoneNumber });
        if (existingPatient) {
            res.status(409).json({
                message: 'A patient with this phone number already exists',
                existingPatientId: existingPatient._id
            });
            return;
        }

        if (!address || address.trim().length === 0) {
            res.status(400).json({ message: 'Address is required' });
            return;
        }

        const age = calculateAge(new Date(dateOfBirth));

        const patient = new Patient({
            firstName,
            lastName,
            dateOfBirth,
            age,
            phoneNumber,
            address: address.trim(),
            status: 'registered',
            timestamps: {
                registeredAt: new Date()
            }
        });

        await patient.save();
        res.status(201).json(patient);
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err: any) => err.message);
            res.status(400).json({
                message: 'Validation error',
                errors: validationErrors
            });
            return;
        }
        
        if (error.code === 11000) {
            res.status(409).json({
                message: 'A patient with this phone number already exists'
            });
            return;
        }
        
        console.error('Error registering patient:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Add nurse notes (Nurse only)
export const addNurseNotes = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check role
        if (req.user?.role !== 'nurse' && req.user?.role !== 'admin') {
            res.status(403).json({ message: 'Only nurses can add nurse notes' });
            return;
        }

        const { id } = req.params;
        const { notes } = req.body;

        const patient = await Patient.findById(id);

        if (!patient) {
            res.status(404).json({ message: 'Patient not found' });
            return;
        }

        if (patient.status !== 'registered') {
            res.status(400).json({ message: 'Can only add notes to patients with registered status' });
            return;
        }

        const updatedPatient = await Patient.findByIdAndUpdate(
            id,
            {
                nurseNotes: notes,
                status: 'awaiting_doctor',
                $set: { 'timestamps.notesTakenAt': new Date() }
            },
            { new: true }
        );

        res.json(updatedPatient);
    } catch (error) {
        console.error('Error adding nurse notes:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Add doctor notes (Doctor only)
export const addDoctorNote = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check role
        if (req.user?.role !== 'doctor' && req.user?.role !== 'admin') {
            res.status(403).json({ message: 'Only doctors can add doctor notes' });
            return;
        }

        const { id } = req.params;
        const { diagnosis, instructions } = req.body;

        const patient = await Patient.findById(id);

        if (!patient) {
            res.status(404).json({ message: 'Patient not found' });
            return;
        }

        if (patient.status !== 'awaiting_doctor' || !patient.nurseNotes) {
            res.status(400).json({ message: 'Can only add notes to patients awaiting doctor review with nurse notes' });
            return;
        }

        const updatedPatient = await Patient.findByIdAndUpdate(
            id,
            {
                doctorNotes: { diagnosis, instructions },
                status: 'awaiting_medication',
                $set: { 'timestamps.doctorReviewedAt': new Date() }
            },
            { new: true }
        );

        res.json(updatedPatient);
    } catch (error) {
        console.error('Error adding doctor notes:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Add medication (Pharmacist only)
export const addMedication = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check role
        if (req.user?.role !== 'pharmacist' && req.user?.role !== 'admin') {
            res.status(403).json({ message: 'Only pharmacists can add medications' });
            return;
        }

        const { id } = req.params;
        const patient = await Patient.findById(id);

        if (!patient) {
            res.status(404).json({ message: 'Patient not found' });
            return;
        }

        if (patient.status !== 'awaiting_medication') {
            res.status(400).json({ message: 'Can only dispense medication to patients awaiting medication' });
            return;
        }

        const updatedPatient = await Patient.findByIdAndUpdate(
            id,
            {
                status: 'completed',
                $set: { 'timestamps.medicationDispensedAt': new Date() }
            },
            { new: true }
        );

        res.json(updatedPatient);
    } catch (error) {
        console.error('Error marking medication as dispensed:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}; 

// Reconsult patient (Doctor only) - allows doctors to update diagnosis and instructions
export const reconsultPatient = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check role
        if (req.user?.role !== 'doctor' && req.user?.role !== 'admin') {
            res.status(403).json({ message: 'Only doctors can reconsult patients' });
            return;
        }

        const { id } = req.params;
        const { diagnosis, instructions } = req.body;

        const patient = await Patient.findById(id);

        if (!patient) {
            res.status(404).json({ message: 'Patient not found' });
            return;
        }

        // Doctors can reconsult patients who have completed their initial consultation
        // (have doctor notes and are either awaiting medication or completed)
        if (!patient.doctorNotes) {
            res.status(400).json({ message: 'Patient must have initial doctor consultation before reconsultation' });
            return;
        }

        const updatedPatient = await Patient.findByIdAndUpdate(
            id,
            {
                doctorNotes: { diagnosis, instructions },
                status: 'awaiting_medication',
                $set: { 'timestamps.doctorReviewedAt': new Date() }
            },
            { new: true }
        );

        res.json(updatedPatient);
    } catch (error) {
        console.error('Error during reconsultation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Re-edit patient registration (Registrar only)
export const reEditPatientRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check role
        if (req.user?.role !== 'registrar' && req.user?.role !== 'admin') {
            res.status(403).json({ message: 'Only registrars can re-edit patient registration' });
            return;
        }

        const { id } = req.params;
        const {
            firstName, 
            lastName, 
            dateOfBirth, 
            phoneNumber,
            address
        } = req.body;

        const patient = await Patient.findById(id);

        if (!patient) {
            res.status(404).json({ message: 'Patient not found' });
            return;
        }

        // Check if the new phone number conflicts with another patient (excluding current patient)
        if (phoneNumber && phoneNumber !== patient.phoneNumber) {
            const existingPatient = await Patient.findOne({ 
                phoneNumber, 
                _id: { $ne: id } 
            });
            if (existingPatient) {
                res.status(409).json({
                    message: 'A patient with this phone number already exists',
                    existingPatientId: existingPatient._id
                });
                return;
            }
        }

        if (!address || address.trim().length === 0) {
            res.status(400).json({ message: 'Address is required' });
            return;
        }

        const age = calculateAge(new Date(dateOfBirth));

        const updatedPatient = await Patient.findByIdAndUpdate(
            id,
            {
                firstName,
                lastName,
                dateOfBirth,
                age,
                phoneNumber,
                address: address.trim(),
                $set: { 'timestamps.lastEditedAt': new Date() }
            },
            { new: true }
        );

        res.json(updatedPatient);
    } catch (error: any) {
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err: any) => err.message);
            res.status(400).json({
                message: 'Validation error',
                errors: validationErrors
            });
            return;
        }
        
        if (error.code === 11000) {
            res.status(409).json({
                message: 'A patient with this phone number already exists'
            });
            return;
        }
        
        console.error('Error re-editing patient registration:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}; 