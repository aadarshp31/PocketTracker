import { Request, Response } from 'express';
import RecoveryCodeService from '../services/RecoveryCodeService';
import supabaseClient from '../config/authConfig';
import UserModel from '../models/UserModel';

const recoveryCodeService = new RecoveryCodeService();

export default class RecoveryCodeController {
  /**
   * POST /api/auth/recovery-codes/generate
   * Requires aal2 (verifyAuth middleware). Returns plaintext codes — shown once.
   */
  async generateCodes(req: Request, res: Response) {
    try {
      const supabaseId = req.user!.id;
      const dbUser = await UserModel.findOne({ where: { supabase_id: supabaseId } });
      if (!dbUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const codes = await recoveryCodeService.generateCodes(dbUser.get('id') as string);
      res.json({ codes });
    } catch (error) {
      console.error('generateCodes error:', error);
      res.status(500).json({ message: 'Failed to generate recovery codes' });
    }
  }

  /**
   * GET /api/auth/recovery-codes/status
   * Requires aal2 (verifyAuth middleware).
   */
  async getStatus(req: Request, res: Response) {
    try {
      const supabaseId = req.user!.id;
      const dbUser = await UserModel.findOne({ where: { supabase_id: supabaseId } });
      if (!dbUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const status = await recoveryCodeService.getStatus(dbUser.get('id') as string);
      res.json(status);
    } catch (error) {
      console.error('getStatus error:', error);
      res.status(500).json({ message: 'Failed to fetch recovery code status' });
    }
  }

  /**
   * POST /api/auth/recovery-codes/use
   * Requires aal1 (verifyAal1Auth middleware). Does NOT require aal2 — this is the recovery path.
   * On success: marks code used, unenrolls all TOTP factors from Supabase.
   */
  async useCode(req: Request, res: Response) {
    try {
      const { code } = req.body as { code?: string };
      if (!code || typeof code !== 'string') {
        res.status(400).json({ message: 'Recovery code is required' });
        return;
      }

      const supabaseId = req.user!.id;
      const dbUser = await UserModel.findOne({ where: { supabase_id: supabaseId } });
      if (!dbUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const valid = await recoveryCodeService.verifyAndUseCode(dbUser.get('id') as string, code);
      if (!valid) {
        res.status(400).json({ message: 'Invalid or already-used recovery code' });
        return;
      }

      // Unenroll all verified TOTP factors so the lost device can no longer sign in
      const { data: factorData, error: listError } = await supabaseClient.auth.admin.mfa.listFactors({
        userId: supabaseId,
      });

      if (listError) {
        console.error('listFactors error:', listError);
        res.status(500).json({ message: 'Failed to fetch MFA factors' });
        return;
      }

      const verifiedFactors = (factorData?.factors || []).filter((f) => f.status === 'verified');

      for (const factor of verifiedFactors) {
        const { error: deleteError } = await supabaseClient.auth.admin.mfa.deleteFactor({
          userId: supabaseId,
          id: factor.id,
        });
        if (deleteError) {
          console.error(`Failed to delete factor ${factor.id}:`, deleteError);
        }
      }

      res.json({ message: 'Recovery code accepted. All authenticators have been removed. Please enroll a new one.' });
    } catch (error) {
      console.error('useCode error:', error);
      res.status(500).json({ message: 'Failed to process recovery code' });
    }
  }
}
