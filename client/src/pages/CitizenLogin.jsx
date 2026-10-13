import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, Shield, ArrowRight, CheckCircle2, RefreshCw,
  Camera, Upload, MapPin, Building, AlertCircle, Sparkles, User, Check
} from 'lucide-react';
import { api } from '../services/api.js';
import { INDIAN_STATES, getDistrictsForState } from '../data/indianAdministrativeData.js';

export const CitizenLogin = ({ onLoginSuccess, initialPhone = '', initialStep = 'phone' }) => {
  // Step state: 'phone' | 'otp' | 'profile'
  const [step, setStep] = useState(initialStep);
  const existingUser = api.getUser();
  const [phone, setPhone] = useState(initialPhone || (existingUser?.phone ? existingUser.phone.replace('+91', '') : ''));
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devOtpNotice, setDevOtpNotice] = useState(null);

  // Profile form state (Aadhaar completely removed)
  const [fullName, setFullName] = useState(() => (initialStep === 'profile' && existingUser?.name && existingUser.name !== 'Unregistered Citizen' ? existingUser.name : ''));
  const [selectedState, setSelectedState] = useState(() => (initialStep === 'profile' && existingUser?.state ? existingUser.state : ''));
  const [selectedDistrict, setSelectedDistrict] = useState(() => (initialStep === 'profile' && existingUser?.district ? existingUser.district : ''));
  const [pincode, setPincode] = useState(() => (initialStep === 'profile' && existingUser?.pincode ? existingUser.pincode : ''));
  const [avatarPreview, setAvatarPreview] = useState(() => (initialStep === 'profile' && existingUser?.avatar_url ? existingUser.avatar_url : ''));
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUploadedUrl, setAvatarUploadedUrl] = useState(() => (initialStep === 'profile' && existingUser?.avatar_url ? existingUser.avatar_url : ''));

  const fileInputRef = useRef(null);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Clean and format phone number input
  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 10);
    setPhone(raw);
    setError(null);
  };

  // 1. Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullPhone = `+91${phone}`;
      const res = await api.sendCitizenOtp(fullPhone);

      if (res.success) {
        setStep('otp');
        setTimer(30);
        if (res.data?.devOtp) {
          setDevOtpNotice(res.data.devOtp);
        } else {
          setDevOtpNotice(null);
        }
      } else {
        setError(res.error?.message || 'Failed to dispatch verification code.');
      }
    } catch (err) {
      setError(err.message || 'Server connection failed. Ensure backend API is active.');
    } finally {
      setLoading(false);
    }
  };

  // 2. OTP Input Handler with auto-focus
  const handleOtpChange = (index, val) => {
    const clean = val.replace(/[^\d]/g, '').slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = clean;
    setOtp(nextOtp);
    setError(null);

    if (clean && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // 3. Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length < 4) {
      setError('Please enter the complete 4-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullPhone = `+91${phone}`;
      const res = await api.verifyCitizenOtp(fullPhone, fullOtp);

      if (res.success) {
        // Save auth token in session storage
        if (res.data?.token) {
          api.setSession(res.data.token, res.data.profile || null);
        }

        // Check if citizen profile is completed
        const isCompleted = res.data.isProfileCompleted === true || (res.data.isFirstTime === false && res.data.profile?.is_profile_completed);

        if (isCompleted && res.data.profile) {
          // Returning citizen with completed profile -> Direct to Home
          api.setSession(res.data.token, res.data.profile);
          onLoginSuccess(res.data.profile, res.data.token);
        } else {
          // New citizen or incomplete profile -> Proceed to Create Profile
          // IMPORTANT REQUIREMENT: Dev OTP notice MUST completely disappear once reaching Create Profile!
          setDevOtpNotice(null);
          setStep('profile');
          if (res.data.profile?.name && res.data.profile.name !== 'Unregistered Citizen') {
            setFullName(res.data.profile.name);
          }
          if (res.data.profile?.state) setSelectedState(res.data.profile.state);
          if (res.data.profile?.district) setSelectedDistrict(res.data.profile.district);
          if (res.data.profile?.pincode) setPincode(res.data.profile.pincode);
          if (res.data.profile?.avatar_url) {
            setAvatarPreview(res.data.profile.avatar_url);
            setAvatarUploadedUrl(res.data.profile.avatar_url);
          }
        }
      } else {
        setError(res.error?.message || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      setError(err.message || 'Verification failure. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Profile Picture Selection & Client-Side Validation
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate mime type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Invalid format. Please select a JPEG, PNG, or WebP photo.');
      return;
    }

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Maximum allowed size is 5 MB.');
      return;
    }

    setAvatarFile(file);

    // Instant local preview
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setAvatarPreview(loadEvent.target?.result);
    };
    reader.readAsDataURL(file);
  };

  // 5. Handle State Selection & Dependent District Reset
  const handleStateChange = (e) => {
    const newState = e.target.value;
    setSelectedState(newState);
    setSelectedDistrict(''); // Reset district when state changes
    setError(null);
  };

  // 6. Handle PIN Code input (strict 6 digits string)
  const handlePincodeChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
    setPincode(raw);
    setError(null);
  };

  // 7. Complete Profile Submission
  const handleCreateProfile = async (e) => {
    e.preventDefault();

    // Validation
    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Full Legal Name is required (minimum 2 characters).');
      return;
    }
    if (trimmedName.length > 100) {
      setError('Full Legal Name must not exceed 100 characters.');
      return;
    }

    if (!selectedState) {
      setError('Please select your State or Union Territory.');
      return;
    }

    if (!selectedDistrict) {
      setError('Please select your District.');
      return;
    }

    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setError('Please enter a valid 6-digit Indian postal PIN Code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let finalAvatarUrl = avatarUploadedUrl || avatarPreview || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

      // If a new local file was selected, upload it to persistent storage first
      if (avatarFile) {
        setAvatarUploading(true);
        try {
          const uploadRes = await api.uploadAvatar(avatarFile);
          if (uploadRes.success && uploadRes.data?.avatarUrl) {
            finalAvatarUrl = uploadRes.data.avatarUrl;
            setAvatarUploadedUrl(finalAvatarUrl);
          }
        } catch (uploadErr) {
          console.warn('[Avatar Upload]', uploadErr.message);
          // If upload fails, use fallback profile image instead of failing profile creation
        } finally {
          setAvatarUploading(false);
        }
      }

      const fullPhone = phone.startsWith('+91') ? phone : `+91${phone}`;
      const res = await api.onboardCitizen({
        phone: fullPhone,
        name: trimmedName,
        avatarUrl: finalAvatarUrl,
        state: selectedState,
        district: selectedDistrict,
        pincode: pincode
      });

      if (res.success && res.data?.profile) {
        api.setSession(res.data.token, res.data.profile);
        onLoginSuccess(res.data.profile, res.data.token);
      } else {
        setError(res.error?.message || 'Failed to persist citizen profile.');
      }
    } catch (err) {
      setError(err.message || 'Profile persistence error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const districtOptions = getDistrictsForState(selectedState);

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#0B0F12',
        color: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem 0.85rem',
        position: 'relative'
      }}
    >
      {/* Subtle Background Glow Accent */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          backgroundColor: 'rgba(212, 255, 0, 0.04)',
          filter: 'blur(90px)',
          pointerEvents: 'none'
        }}
      />

      {/* Single Mobile-First Centered Authentication Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#12181F',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
          padding: '1.5rem 1.35rem',
          zIndex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}
      >
        {/* ======================================================== */}
        {/* TOP BRANDING HEADER: Logo & App Title inside Card */}
        {/* ======================================================== */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '1.25rem'
          }}
        >
          {/* Logo Mark */}
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '13px',
              backgroundColor: '#D4FF00',
              color: '#0B0F12',
              fontSize: '1.45rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 18px rgba(212, 255, 0, 0.35)',
              marginBottom: '0.5rem'
            }}
          >
            F
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <h1
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#F8FAFC',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                margin: 0
              }}
            >
              FixItNow
            </h1>
            <span
              style={{
                fontSize: '0.65rem',
                color: '#D4FF00',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                backgroundColor: 'rgba(212, 255, 0, 0.1)',
                padding: '0.15rem 0.45rem',
                borderRadius: '9999px'
              }}
            >
              Citizen
            </span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '0.65rem 0.85rem',
              color: '#EF4444',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              lineHeight: 1.35
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Development OTP Notice (STRICT REQUIREMENT: Only on phone/otp screen, NEVER on profile screen) */}
        {devOtpNotice && step !== 'profile' && (
          <div
            style={{
              backgroundColor: 'rgba(212, 255, 0, 0.08)',
              border: '1px solid rgba(212, 255, 0, 0.28)',
              borderRadius: '12px',
              padding: '0.65rem 0.85rem',
              color: '#D4FF00',
              fontSize: '0.78rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Sparkles size={15} style={{ flexShrink: 0 }} />
            <span>
              <strong>Dev OTP:</strong> {devOtpNotice}
            </span>
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* STEP 1: Mobile Phone Number */}
        {/* -------------------------------------------------------- */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Enter Mobile Number
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem', lineHeight: 1.4 }}>
                We will send a 4-digit code to verify your citizen profile.
              </p>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.4rem' }}>
                Mobile Number *
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#18202A',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '14px',
                  padding: '0 0.85rem',
                  transition: 'border-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderRight: '1px solid rgba(255, 255, 255, 0.1)', paddingRight: '0.65rem', color: '#94A3B8', fontSize: '0.9rem', fontWeight: 600 }}>
                  <Phone size={15} color="#D4FF00" />
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={handlePhoneChange}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#F8FAFC',
                    fontSize: '1rem',
                    fontWeight: 600,
                    padding: '0.75rem 0.65rem',
                    letterSpacing: '0.04em'
                  }}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="btn-lime"
              style={{
                width: '100%',
                padding: '0.8rem',
                borderRadius: '13px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: loading || phone.length < 10 ? 'not-allowed' : 'pointer',
                opacity: loading || phone.length < 10 ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? <RefreshCw size={17} className="animate-spin" /> : <>Send Verification Code <ArrowRight size={17} /></>}
            </button>
          </form>
        )}

        {/* -------------------------------------------------------- */}
        {/* STEP 2: 4-Digit OTP Verification */}
        {/* -------------------------------------------------------- */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Verify OTP Code
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem', lineHeight: 1.4 }}>
                Enter the 4-digit code sent to <strong style={{ color: '#F8FAFC' }}>+91 {phone}</strong>
              </p>

              {/* 4 Inputs */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginTop: '1.25rem' }}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    style={{
                      width: '52px',
                      height: '58px',
                      borderRadius: '13px',
                      backgroundColor: '#18202A',
                      border: digit ? '2px solid #D4FF00' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#F8FAFC',
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      textAlign: 'center',
                      outline: 'none',
                      transition: 'all 0.15s ease'
                    }}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              {/* Resend Cooldown */}
              <div style={{ marginTop: '1rem', fontSize: '0.78rem' }}>
                {timer > 0 ? (
                  <span style={{ color: '#64748B' }}>Resend code in <strong style={{ color: '#CBD5E1' }}>{timer}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    style={{ background: 'none', border: 'none', color: '#D4FF00', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length < 4}
              className="btn-lime"
              style={{
                width: '100%',
                padding: '0.8rem',
                borderRadius: '13px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: loading || otp.join('').length < 4 ? 'not-allowed' : 'pointer',
                opacity: loading || otp.join('').length < 4 ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? <RefreshCw size={17} className="animate-spin" /> : <>Verify & Continue <CheckCircle2 size={17} /></>}
            </button>

            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(['', '', '', '']); setDevOtpNotice(null); }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                fontSize: '0.78rem',
                marginTop: '0.85rem',
                cursor: 'pointer'
              }}
            >
              ← Change Mobile Number
            </button>
          </form>
        )}

        {/* -------------------------------------------------------- */}
        {/* STEP 3: Create Profile Form (Single Mobile Card Layout)  */}
        {/* -------------------------------------------------------- */}
        {step === 'profile' && (
          <form onSubmit={handleCreateProfile}>
            <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Create Citizen Profile
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.2rem', lineHeight: 1.35 }}>
                Enter your details to submit and track civic grievances.
              </p>
            </div>

            {/* Profile Picture Upload with Preview */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                backgroundColor: '#18202A',
                padding: '0.65rem 0.85rem',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '0.75rem'
              }}
            >
              {/* Avatar Preview */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #D4FF00',
                  backgroundColor: '#12181F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative'
                }}
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <User size={22} color="#64748B" />
                )}
                {avatarUploading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <RefreshCw size={14} color="#D4FF00" className="animate-spin" />
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F8FAFC', display: 'block' }}>
                  Profile Picture
                </span>
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>
                  JPEG, PNG, or WebP
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-ghost"
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '9px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Camera size={13} color="#D4FF00" />
                <span>{avatarPreview ? 'Change' : 'Upload'}</span>
              </button>
            </div>

            {/* Full Legal Name */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.3rem' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Pooja Verma"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(null); }}
                style={{
                  width: '100%',
                  backgroundColor: '#18202A',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '0.6rem 0.85rem',
                  color: '#F8FAFC',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
            </div>

            {/* State Selection */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.3rem' }}>
                State / Union Territory *
              </label>
              <select
                value={selectedState}
                onChange={handleStateChange}
                style={{
                  width: '100%',
                  backgroundColor: '#18202A',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '0.6rem 0.85rem',
                  color: selectedState ? '#F8FAFC' : '#64748B',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">Select State / UT</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s} style={{ backgroundColor: '#18202A', color: '#F8FAFC' }}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* District Selection */}
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.3rem' }}>
                District *
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => { setSelectedDistrict(e.target.value); setError(null); }}
                disabled={!selectedState}
                style={{
                  width: '100%',
                  backgroundColor: selectedState ? '#18202A' : '#12181F',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '0.6rem 0.85rem',
                  color: selectedDistrict ? '#F8FAFC' : '#64748B',
                  fontSize: '0.82rem',
                  outline: 'none',
                  cursor: selectedState ? 'pointer' : 'not-allowed',
                  opacity: selectedState ? 1 : 0.6,
                  boxSizing: 'border-box'
                }}
              >
                <option value="">
                  {selectedState ? 'Select District' : 'Select State First'}
                </option>
                {districtOptions.map((d) => (
                  <option key={d} value={d} style={{ backgroundColor: '#18202A', color: '#F8FAFC' }}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* PIN Code */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#CBD5E1', fontWeight: 600, marginBottom: '0.3rem' }}>
                Postal PIN Code (6 Digits) *
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#18202A',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '0 0.85rem'
                }}
              >
                <MapPin size={15} color="#D4FF00" style={{ marginRight: '0.45rem', flexShrink: 0 }} />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 273001"
                  maxLength={6}
                  value={pincode}
                  onChange={handlePincodeChange}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#F8FAFC',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    padding: '0.6rem 0',
                    letterSpacing: '0.08em'
                  }}
                />
                {pincode.length === 6 && (
                  <Check size={15} color="#10B981" />
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !fullName.trim() || !selectedState || !selectedDistrict || pincode.length !== 6}
              className="btn-lime"
              style={{
                width: '100%',
                padding: '0.8rem',
                borderRadius: '13px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: loading || !fullName.trim() || !selectedState || !selectedDistrict || pincode.length !== 6 ? 'not-allowed' : 'pointer',
                opacity: loading || !fullName.trim() || !selectedState || !selectedDistrict || pincode.length !== 6 ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? <RefreshCw size={17} className="animate-spin" /> : <>Create Profile & Continue <ArrowRight size={17} /></>}
            </button>
          </form>
        )}

        {/* Footnote */}
        <div style={{ marginTop: '1.25rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
          <Shield size={12} color="#64748B" />
          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
            Verified municipal reporting credentials
          </span>
        </div>
      </div>
    </div>
  );
};
