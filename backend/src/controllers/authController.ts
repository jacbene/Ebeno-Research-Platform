import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { sendEmail } from '../services/emailService';

export const registerUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        verificationToken,
      },
    });

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Email Verification',
      text: `Please verify your email by clicking on the following link: ${verificationUrl}`,
      html: `<p>Please verify your email by clicking on the following link: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
    });

    res.status(201).json({ msg: 'Registration successful. Please check your email to verify your account.' });

  } catch (err) {
    console.error((err as Error).message);
    res.status(500).send('Server error');
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    if (!user.isVerified) {
        return res.status(401).json({ msg: 'Please verify your email to log in' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET as string,
      { expiresIn: '5d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error((err as Error).message);
    res.status(500).send('Server error');
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findFirst({
      where: { verificationToken: req.params.token },
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
      },
    });

    res.json({ msg: 'Email verified successfully' });
  } catch (err) {
    console.error((err as Error).message);
    res.status(500).send('Server error');
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Important: Don't reveal if the user exists or not
      return res.status(200).json({ msg: 'If a user with that email exists, a password reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `You are receiving this email because you (or someone else) has requested the reset of a password. Please click on the following link, or paste it into your browser to complete the process: ${resetUrl}`,
      html: `<p>You are receiving this email because you (or someone else) has requested the reset of a password. Please click on the following link, or paste it into your browser to complete the process: <a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    res.status(200).json({ msg: 'If a user with that email exists, a password reset link has been sent.' });

  } catch (err) {
    console.error((err as Error).message);
    res.status(500).send('Server error');
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gte: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid or expired token' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ msg: 'Password reset successful' });

  } catch (err) {
    console.error((err as Error).message);
    res.status(500).send('Server error');
  }
};

export const getMe = async (req: Request, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json(user);
    } catch (err) {
      console.error((err as Error).message);
      res.status(500).send('Server error');
    }
  };
