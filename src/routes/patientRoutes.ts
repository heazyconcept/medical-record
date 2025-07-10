import { Router } from "express";
import { registerPatient, getPatients, addNurseNotes, addDoctorNote,addMedication } from "../controllers/patient.controllers";

const router = Router();

router.post('/register', registerPatient)

router.get('/', getPatients)

router.patch('/:id/nurse-notes', addNurseNotes)
router.patch('/:id/doctor-note', addDoctorNote)
router.patch('/:id/medication', addMedication)

export default router