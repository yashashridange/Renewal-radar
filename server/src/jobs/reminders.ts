import cron from 'node-cron';
import { Resend } from 'resend';
import { prisma } from '../db';

const resend = new Resend(process.env.RESEND_API_KEY);

export const startCronJobs = () => {
  // Run daily at midnight server time (can be adjusted to check user timezones later)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily contract reminder checks...');
    
    try {
      const today = new Date();
      
      // Get all active contracts with reminders enabled
      const contracts = await prisma.contract.findMany({
        where: {
          status: 'ACTIVE',
          reminderEnabled: true,
        },
        include: {
          user: true,
        },
      });

      for (const contract of contracts) {
        const renewalDate = new Date(contract.renewalDate);
        const cancellationDeadline = new Date(renewalDate);
        cancellationDeadline.setDate(renewalDate.getDate() - contract.cancellationNoticeDays);

        const diffTime = cancellationDeadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Remind at 30, 14, and 3 days before cancellation notice deadline
        if ([30, 14, 3].includes(diffDays)) {
          console.log(`Sending reminder for contract ${contract.id} to ${contract.user.email} (${diffDays} days before deadline)`);
          
          await resend.emails.send({
            from: 'Renewal Radar <reminders@renewalradar.com>',
            to: contract.user.email,
            subject: `Action Required: ${contract.vendorName} renewal coming up`,
            html: `
              <p>Hi there,</p>
              <p>This is a reminder that your contract with <strong>${contract.vendorName}</strong> is coming up for renewal.</p>
              <p><strong>Cost:</strong> ${contract.cost} ${contract.currency}</p>
              <p><strong>Renewal Date:</strong> ${renewalDate.toDateString()}</p>
              <p><strong>Cancellation Deadline:</strong> ${cancellationDeadline.toDateString()} (${diffDays} days away!)</p>
              <p>Please log in to your dashboard to review this contract and take action if needed.</p>
            `,
          });
        }
      }
    } catch (err) {
      console.error('Error running daily cron job', err);
    }
  });
};
