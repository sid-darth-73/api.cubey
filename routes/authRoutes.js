import express from 'express';
import { signin, signup } from '../controllers/authController.js';
const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);

export default router;
/*
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OThiM2FmNDc5Yzg4MzAzNDdiNDdjN2UiLCJpYXQiOjE3NzA3MzIzMjMsImV4cCI6MTc3MTMzNzEyM30.2w_3uobayRqwZsqHe-iVnswDMJNZJ1LdPPqGumaDmFc",
    "shareLink": "uoXexKK-mSmk"
}
*/