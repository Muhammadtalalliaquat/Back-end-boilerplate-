import express from "express";
import sendResponse from "../helpers/Response.js";
import User from "../models/user.js";
import Joi from "joi";
import jwt from "jsonwebtoken";
import bcrypt, { hash } from "bcrypt";
import nodemailer from "nodemailer";
import "dotenv/config";

const router = express.Router();

const registerSchema = Joi.object({
  userName: Joi.string().min(3).max(20).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  // city: Joi.string().optional().allow(""),
  // country: Joi.string().optional().allow(""),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const transporter = nodemailer.createTransport({
  service: `Gmail`,
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SENDER_PASSWORD,
  },
});

function sendEmail(recepientEmail, token) {
  // console.log('Sending email to:', recepientEmail , token);
  const mailOption = {
    from: process.env.SENDER_EMAIL,
    to: recepientEmail,
    subject: "Verification Email",
    html: `<p>Please verify your email and click on the link below: 
                    <a href="http://localhost:3000/emailVerify?token=${token}" target="_blank">
                       Click here to verify ${token}
                    </a>
        </p>`,
  };
  transporter.sendMail(mailOption, (error, succes) => {
    if (error) {
      console.log("Erro sending email", error);
      return;
    }
    console.log("Email successfully sent.", succes.response);
    res.send("email sended");
  });
}


router.post(`/register`, async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return sendResponse(res, 400, null, true, error.message);

    const existingUser = await User.findOne({ email: value.email });
    if (existingUser)
      return sendResponse(res, 403, null, true, "Email already registere.");

    const hashPassword = await bcrypt.hash(value.password, 10);
    value.password = hashPassword;

    const newUser = new User({ ...value });
    await newUser.save();
    // delete value.password
    
    // const verificationToken = jwt.sign({...value} , process.env.AUTH_SECRET , { expiresIn: "1h" })
    
    const verificationToken = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
      },
      process.env.AUTH_SECRET,
      { expiresIn: `1h` }
    );
    
    sendEmail(req.body.email, verificationToken);

    sendResponse(
      res,
      201,
      { verificationToken, user: newUser },
      false,
      "User Registered Successfully"
    );
  } catch (err) {
    console.error(err);
    sendResponse(res, 500, null, true, "Internal Server Error");
  }
});

router.post(`/verifyemail`, async (req, res) => {
  try {
    const { token } = req.headers;
    if (!token) return sendResponse(res, 400, null, true, "Token is required");
    
    const verifiedEmail = jwt.verify(token, process.env.AUTH_SECRET);
    // console.log("Verified Email:", verifiedEmail.id);
    
    const update = await User.findByIdAndUpdate(verifiedEmail.id, {
      verifiedEmail: true,
    });
    console.log(update, "Email Verified");

    sendResponse(
      res,
      200,
      { message: "Email verified successfully", email: verifiedEmail },
      false
    );
  } catch (error) {
    console.log("Error verify email token", error.message);
    sendResponse(res, 400, null, true, "Invalid or expired token");
  }
});

router.post(`/login`, async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return sendResponse(res, 400, null, true, error.message);

    const user = await User.findOne({ email: value.email }).lean();
    if (!user)
      return sendResponse(res, 403, null, true, "User is not Registered.");

    const isPasswordValid = await bcrypt.compare(value.password, user.password);
    if (!isPasswordValid)
      return sendResponse(res, 403, null, true, "Invalid email or password");

    delete user.password;
    
    var token = jwt.sign({ ...user }, process.env.AUTH_SECRET);
    
    sendResponse(res, 200, { user, token }, false, "User Login Successfully");
  } catch (err) {
    console.error("Error during login:", err); // Log the error
    sendResponse(res, 500, null, true, "Internal Server Error");
  }
});

router.post(`/requestPasswordReset`, async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return sendResponse(res, 403, null, true, "User doesn't exist.");
    
    const secret = process.env.AUTH_SECRET + user.password;
    const token = jwt.sign({ id: user._id, email: user.email }, secret, {
      expiresIn: `24h`,
    });

    const resetURL = `${process.env.FRONTEND_URL}/resetpassword?id=${user._id}&token=${token}`;
    
    const transporter = nodemailer.createTransport({
      service: `Gmail`,
      auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_PASSWORD,
      },
    });
    
    const mailOption = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password Reset Request",
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
      Please click on the following link, or paste this into your browser to complete the process:\n\n
      ${resetURL}\n\n
      If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    await transporter.sendMail(mailOption);
    
    sendResponse(res, 200, { user, token }, false, "Password reset link sent");
  } catch (error) {
    console.log("Password reset sending error", error.message);
    sendResponse(res, 500, null, false, "Something went wrong");
  }
});


router.post(`/resetPassword`, async (req, res) => {
  const { id, token, password } = req.body;

  const user = await User.findOne({ _id: id });
  if (!user) return sendResponse(res, 403, null, true, "User not exists!");
  
  const secret = process.env.AUTH_SECRET + user.password;
  try {
    console.log("Token received:", token);
    jwt.verify(token, secret);
    
    const encryptedPassword = await hash(password, 10);
    
    await User.updateOne(
      { _id: id },
      { $set: { password: encryptedPassword } }
    );
    
    sendResponse(res, 200, { user, token } , false, "Password has been reset successfully");
  } catch (error) {
    console.log("reset password error", error.message);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return sendResponse(res, 401, null, true, "Invalid or expired token.");
    }
    sendResponse(res, 500, null, true, "Something went wrong.");
  }
});


// router.post(`/sendEmail`, (req, res) => {
//   const { recepientEmail, subject, token } = req.body;
//   console.log(recepientEmail);

//   if (!recepientEmail) {
//     return res.status(400).send({ message: "Missing required fields." });
//   }
//   const mailOption = {
//     From: process.env.SENDER_EMAIL,
//     to: recepientEmail,
//     html: "<h1 style='color:green'>Hello World</h1>",
//     subject: subject || "Email Verification",
//   };

//   transporter.sendMail(mailOption, (error, emailSent) => {
//     if (error) return sendResponse(res, 403, null, true, "Email not send.");
//     console.log("Email sent successfully:", emailSent);
//     res.status(200).send({ message: "Email sent successfully." });
//   });
// });

// router.post(`/resetPassword`, async (req, res) => {
  //   const { id, token, password } = req.body;
  
//   // Check if user exists
//   const user = await User.findOne({ _id: id });
//   if (!user) return sendResponse(res, 403, null, true, "User does not exist!");

//   // Create the secret key using user's password hash
//   const secret = process.env.AUTH_SECRET + user.password;

//   try {
  //     // Verify the token sent by the client
//      jwt.verify(token, secret);

//     // Encrypt the new password
//     const encryptedPassword = await hash(password, 10);

//     // Update the user's password in the database
//     await User.updateOne(
  //       { _id: id },
  //       { $set: { password: encryptedPassword } }
//     );

//     // Send success response
//     return sendResponse(res, 200, false, "Password has been reset successfully");
//   } catch (error) {
//     console.error("reset password error:", error.message);
//     // return sendResponse(res, 500, null, true, "Invalid or expired token.");
//     if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
//       return sendResponse(res, 401, null, true, "Invalid or expired token.");
//     }
//     sendResponse(res, 500, null, true, "Something went wrong.");
//   }
// });


export default router;
