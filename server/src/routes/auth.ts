import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db';
import { AppError } from '../utils/errors';
import { protect } from '../middleware/auth';

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const signToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecret', {
    expiresIn: '30d',
  });
};

authRouter.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = signupSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    const token = signToken(newUser.id);

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          plan: newUser.plan,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return next(new AppError('Incorrect email or password', 401));
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordCorrect) {
      return next(new AppError('Incorrect email or password', 401));
    }

    const token = signToken(user.id);

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user.id,
          email: user.email,
          plan: user.plan,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET current user profile
authRouter.get('/me', protect as any, async (req: any, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
      },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err) {
    next(err);
  }
});

// PUT update current user profile
authRouter.put('/me', protect as any, async (req: any, res, next) => {
  try {
    const { name } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: { user: updatedUser },
    });
  } catch (err: any) {
    next(err);
  }
});

// Add forgot password and email verification routes later
