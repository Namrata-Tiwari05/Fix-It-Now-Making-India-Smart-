import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.js';
import { normalizePhone, isSamePhone } from '../../utils/phone.js';

// In-memory OTP storage with TTL for development / staging
class OtpService {
  constructor() {
    this.otpCache = new Map();
  }

  // Canonical Indian phone number normalization: +91XXXXXXXXXX
  normalizePhone(rawPhone) {
    return normalizePhone(rawPhone);
  }

  // Mask Aadhaar: e.g. "1234 5678 9012" -> "XXXX-XXXX-9012"
  maskAadhaar(rawAadhaar) {
    if (!rawAadhaar) return null;
    const clean = String(rawAadhaar).replace(/\D/g, '');
    if (clean.length < 4) return 'XXXX-XXXX-0000';
    const last4 = clean.slice(-4);
    return `XXXX-XXXX-${last4}`;
  }

  // SHA-256 hash of Aadhaar for secure uniqueness / identity verification
  hashAadhaar(rawAadhaar) {
    if (!rawAadhaar) return null;
    const clean = String(rawAadhaar).replace(/\D/g, '');
    return crypto.createHash('sha256').update(clean).digest('hex');
  }

  // Generate random 4-digit OTP
  generateOtp(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 10) {
      throw new Error('Valid mobile phone number is required.');
    }

    const existing = this.otpCache.get(normalized);
    const now = Date.now();

    // 30-second resend cooldown
    if (existing && now - existing.createdAt < 30000) {
      const waitSec = Math.ceil((30000 - (now - existing.createdAt)) / 1000);
      const err = new Error(`Please wait ${waitSec}s before requesting a new OTP.`);
      err.statusCode = 429;
      err.code = 'RATE_LIMITED';
      throw err;
    }

    // Generate random 4-digit integer between 1000 and 9999
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity

    this.otpCache.set(normalized, {
      code,
      expiresAt,
      createdAt: now,
      attempts: 0
    });

    // Formatted Terminal Output for development
    console.log('\n====================================================');
    console.log('📱 [FixItNow OTP]');
    console.log(`   Phone:   ${normalized}`);
    console.log(`   OTP:     ${code}`);
    console.log('   Expires: 5 minutes');
    console.log('====================================================\n');

    return {
      phone: normalized,
      expiresInSeconds: 300,
      devOtp: process.env.NODE_ENV !== 'production' ? code : undefined
    };
  }

  // Verify submitted OTP
  async verifyOtp(phone, inputOtp) {
    const normalized = normalizePhone(phone);
    const record = this.otpCache.get(normalized);

    if (!record) {
      const err = new Error('No OTP requested for this phone number or it has expired.');
      err.statusCode = 400;
      err.code = 'OTP_NOT_FOUND';
      throw err;
    }

    if (Date.now() > record.expiresAt) {
      this.otpCache.delete(normalized);
      const err = new Error('OTP has expired. Please request a new code.');
      err.statusCode = 400;
      err.code = 'OTP_EXPIRED';
      throw err;
    }

    record.attempts += 1;
    if (record.attempts > 3) {
      this.otpCache.delete(normalized);
      const err = new Error('Maximum OTP verification attempts exceeded. Please request a new code.');
      err.statusCode = 429;
      err.code = 'OTP_MAX_ATTEMPTS';
      throw err;
    }

    if (String(inputOtp).trim() !== String(record.code).trim()) {
      const remaining = 3 - record.attempts;
      const err = new Error(`Invalid OTP code. ${remaining} attempt(s) remaining.`);
      err.statusCode = 400;
      err.code = 'INVALID_OTP';
      throw err;
    }

    // OTP verified successfully -> clear cache
    this.otpCache.delete(normalized);

    // Look up existing citizen profile in database
    let existingProfile = db.getProfileByPhone(normalized);

    if (existingProfile) {
      const isCompleted = Boolean(
        existingProfile.is_profile_completed &&
        existingProfile.name &&
        existingProfile.name !== 'Unregistered Citizen' &&
        existingProfile.name !== 'Citizen' &&
        existingProfile.state &&
        existingProfile.district &&
        existingProfile.pincode
      );

      const token = `cit_${Buffer.from(`${existingProfile.id}:${Date.now()}`).toString('base64')}`;

      return {
        verified: true,
        isFirstTime: !isCompleted,
        isProfileCompleted: isCompleted,
        profile: existingProfile,
        token
      };
    }

    // New citizen: immediately create persistent citizen profile so ID is permanent and never orphaned
    existingProfile = await db.createOrUpdateCitizenProfile({
      phone: normalized,
      name: 'Citizen',
      is_profile_completed: false
    });

    const token = `cit_${Buffer.from(`${existingProfile.id}:${Date.now()}`).toString('base64')}`;

    return {
      verified: true,
      isFirstTime: true,
      isProfileCompleted: false,
      phone: normalized,
      profile: existingProfile,
      token
    };
  }

  // Complete citizen profile onboarding
  async completeOnboarding({ phone, name, avatarUrl, state, district, pincode, aadhaar }) {
    const normalized = normalizePhone(phone);
    if (!name || name.trim().length < 2) {
      const err = new Error('Full Name is required (minimum 2 characters).');
      err.statusCode = 400;
      throw err;
    }
    if (name.trim().length > 100) {
      const err = new Error('Full Name must not exceed 100 characters.');
      err.statusCode = 400;
      throw err;
    }
    if (!state || !String(state).trim()) {
      const err = new Error('State / Union Territory is required.');
      err.statusCode = 400;
      throw err;
    }
    if (!district || !String(district).trim()) {
      const err = new Error('District is required.');
      err.statusCode = 400;
      throw err;
    }
    const cleanPin = String(pincode || '').trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      const err = new Error('A valid 6-digit Indian postal PIN Code is required.');
      err.statusCode = 400;
      throw err;
    }

    // Optional backwards compatibility: if aadhaar is provided, mask it
    const aadhaarMasked = aadhaar ? this.maskAadhaar(aadhaar) : null;
    const aadhaarHash = aadhaar ? this.hashAadhaar(aadhaar) : null;

    // Create or update real profile in database and persist
    const profile = await db.createOrUpdateCitizenProfile({
      phone: normalized,
      name: name.trim(),
      avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      state: String(state).trim(),
      district: String(district).trim(),
      pincode: cleanPin,
      is_profile_completed: true,
      aadhaar_masked: aadhaarMasked,
      aadhaar_hash: aadhaarHash
    });

    const token = `cit_${Buffer.from(`${profile.id}:${Date.now()}`).toString('base64')}`;

    console.log(`[Citizen Onboarding] Successfully completed profile for ${name.trim()} (${normalized}) in ${district.trim()}, ${state.trim()} - PIN ${cleanPin}`);

    return {
      profile,
      token
    };
  }
}

export const otpService = new OtpService();
