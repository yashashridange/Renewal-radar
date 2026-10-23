import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { AppError } from '../utils/errors';
import { protect } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const contractRouter = Router();

// Apply auth middleware to all routes in this router
contractRouter.use(protect as any);

const contractSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  cost: z.number().min(0, "Cost cannot be negative"),
  currency: z.string().default("USD"),
  billingFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
  renewalDate: z.string().datetime(), // expects ISO 8601
  cancellationNoticeDays: z.number().min(0),
  category: z.string().optional(),
  notes: z.string().optional(),
});

// GET all contracts for the logged-in user
contractRouter.get('/', async (req: any, res, next) => {
  try {
    const contracts = await prisma.contract.findMany({
      where: { userId: req.user.id },
      orderBy: { renewalDate: 'asc' },
    });
    res.status(200).json({ status: 'success', data: { contracts } });
  } catch (err) {
    next(err);
  }
});

// POST create a new contract
contractRouter.post('/', async (req: any, res, next) => {
  try {
    const parsed = contractSchema.parse(req.body);

    // Free plan check: max 5 active contracts
    if (req.user.plan === 'FREE') {
      const count = await prisma.contract.count({
        where: { userId: req.user.id, status: 'ACTIVE' },
      });
      if (count >= 5) {
        return next(new AppError('Free plan is limited to 5 active contracts. Please upgrade to add more.', 403));
      }
    }

    const newContract = await prisma.contract.create({
      data: {
        userId: req.user.id,
        ...parsed,
      },
    });

    res.status(201).json({ status: 'success', data: { contract: newContract } });
  } catch (err) {
    next(err);
  }
});

// GET a specific contract
contractRouter.get('/:id', async (req: any, res, next) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!contract) {
      return next(new AppError('Contract not found', 404));
    }
    res.status(200).json({ status: 'success', data: { contract } });
  } catch (err) {
    next(err);
  }
});

// PATCH update a contract
contractRouter.patch('/:id', async (req: any, res, next) => {
  try {
    // Basic check for existence & ownership
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!contract) {
      return next(new AppError('Contract not found', 404));
    }

    const parsed = contractSchema.partial().parse(req.body);

    const updatedContract = await prisma.contract.update({
      where: { id: req.params.id },
      data: parsed,
    });

    res.status(200).json({ status: 'success', data: { contract: updatedContract } });
  } catch (err) {
    next(err);
  }
});

// DELETE a contract
contractRouter.delete('/:id', async (req: any, res, next) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!contract) {
      return next(new AppError('Contract not found', 404));
    }

    await prisma.contract.delete({
      where: { id: req.params.id },
    });

    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
});

// POST renew a contract
contractRouter.post('/:id/renew', async (req: any, res, next) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!contract) return next(new AppError('Contract not found', 404));

    let nextRenewalDate = new Date(contract.renewalDate);
    switch (contract.billingFrequency) {
      case 'MONTHLY':
        nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
        break;
      case 'QUARTERLY':
        nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 3);
        break;
      case 'YEARLY':
        nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
        break;
      case 'CUSTOM':
        if (req.body.nextDate) {
          nextRenewalDate = new Date(req.body.nextDate);
        }
        break;
    }

    const updatedContract = await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        renewalDate: nextRenewalDate,
        status: 'ACTIVE', // Reset to active if it was cancelled
      },
    });

    res.status(200).json({ status: 'success', data: { contract: updatedContract } });
  } catch (err) {
    next(err);
  }
});

// POST cancel a contract
contractRouter.post('/:id/cancel', async (req: any, res, next) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!contract) return next(new AppError('Contract not found', 404));

    const updatedContract = await prisma.contract.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
      },
    });

    res.status(200).json({ status: 'success', data: { contract: updatedContract } });
  } catch (err) {
    next(err);
  }
});

// GET export contracts as CSV
contractRouter.get('/export/csv', async (req: any, res, next) => {
  try {
    const contracts = await prisma.contract.findMany({
      where: { userId: req.user.id },
      orderBy: { renewalDate: 'asc' },
    });

    const headers = ['Vendor Name', 'Cost', 'Currency', 'Billing Frequency', 'Renewal Date', 'Status', 'Category', 'Notes'];
    const rows = contracts.map(c => [
      `"${c.vendorName.replace(/"/g, '""')}"`,
      c.cost,
      c.currency,
      c.billingFrequency,
      c.renewalDate.toISOString().split('T')[0],
      c.status,
      `"${(c.category || '').replace(/"/g, '""')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contracts.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});
