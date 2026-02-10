import { UserModel } from '../models/Users.js';
import { ResetPasswordModel } from '../models/ResetPasswordModel.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
import { Resend } from 'resend';
import dotenv from 'dotenv'
dotenv.config()

const resend = new Resend(process.env.RESEND_API_KEY); 

async function sendOtp(email, otp) {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev', 
      to: [email],
      subject: 'Your Password Reset OTP',
      html: `<strong>Your OTP is: ${otp}</strong><p>This code expires in 5 minutes.</p>`,
    });

  } catch (error) {
    console.error('Error sending email:', error);
  }
}
export const resetController = async (req, res)=>{
    const {email} = req.body;
    const user = await UserModel.findOne({
        email
    });
    if(!user){
        return res.status(200).json({
            message: "If provided email is correct, check the inbox"
        })
    }
    const existingOtpRequest = await ResetPasswordModel.findOne({email});
    if(existingOtpRequest) {
        return res.status(401).json({
            message: "OTP already sent"
        })
    }
    const otp = Math.floor(Math.random() * (999999 - 100000 + 1) + 100000).toString();
    await ResetPasswordModel.create({ email, otp});

    try{
        await sendOtp(email, otp);
    } catch (error) {
        return res.status(500).json({
            message: "Error sending Email",
            errorMessage: error
        })
    }

    return res.status(200).json({
        message: "If provided email is correct, check the inbox"
    })
}