import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import patientRoutes from './routes/patientRoutes'

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URL as string)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error", err));

// Default route
app.use('/patients', patientRoutes)
export default app;