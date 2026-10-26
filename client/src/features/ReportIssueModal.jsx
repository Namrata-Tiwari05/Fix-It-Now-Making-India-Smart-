import React, { useState, useEffect, useRef } from 'react';
import {
  X, Mic, MicOff, Camera, MapPin, Navigation, Sparkles, AlertTriangle, CheckCircle2,
  ChevronRight, ArrowLeft, RefreshCw, Edit3, RotateCcw, Trash2, Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.js';
import { CIVIC_CATEGORIES } from './constants.js';

export const ReportIssueModal = ({ isOpen, onClose, onSuccess, onSelectComplaint }) => {
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const userProfile = api.getUser();

  // Location Form State (PIN Code, State, District, Street Address, Landmark, Lat, Lng)
  // Fields are empty by default; auto-filled only on 'My Current Location'
  const [pincode, setPincode] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  // GPS & Location Status States
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [pinInfo, setPinInfo] = useState(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Speech-to-Text States
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);

  // Camera Capture States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // AI Analysis States
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('MEDIUM');

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdComplaint, setCreatedComplaint] = useState(null);

  const resetForm = () => {
    setStep(1);
    setDescription('');
    setPincode('');
    setStateName('');
    setDistrict('');
    setStreetAddress('');
    setLandmark('');
    setLat(null);
    setLng(null);
    setSelectedPhoto(null);
    setSelectedCategory('');
    setSelectedPriority('MEDIUM');
    setAiResult(null);
    setCreatedComplaint(null);
    setLocationError(null);
    setPinInfo(null);
    stopCameraStream();
  };

  // Cleanup camera stream and speech recognition on unmount or close
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  // When modal closes or reopens, reset form state and camera stream
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      if (isListeningVoice) {
        stopVoiceRecognition();
      }
    }
  }, [isOpen]);

  // Validate Problem PIN whenever it changes (6 digits)
  useEffect(() => {
    if (pincode && pincode.length === 6) {
      checkPincode(pincode);
    } else {
      setPinInfo(null);
    }
  }, [pincode]);

  const checkPincode = async (pin) => {
    setIsVerifyingPin(true);
    try {
      const res = await api.resolvePincode(pin);
      if (res && res.success) {
        setPinInfo(res.data);
      }
    } catch (e) {
      console.warn('PIN lookup error:', e);
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // ==========================================
  // REAL SPEECH-TO-TEXT IMPLEMENTATION
  // ==========================================
  const startVoiceRecognition = () => {
    setVoiceError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Speech recognition is not supported in this browser. Please type your description manually.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      let initialText = description;

      recognition.onstart = () => {
        setIsListeningVoice(true);
        setVoiceError(null);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const newSpeech = (finalTranscript || interimTranscript).trim();
        if (newSpeech) {
          const combined = initialText.trim()
            ? `${initialText.trim()} ${newSpeech}`
            : newSpeech;
          setDescription(combined);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Please speak clearly into your microphone.');
        } else {
          setVoiceError(`Speech error: ${event.error}. You can type manually.`);
        }
        setIsListeningVoice(false);
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start failed:', err);
      setVoiceError('Could not start microphone. Please check your browser permissions.');
      setIsListeningVoice(false);
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListeningVoice(false);
  };

  const handleVoiceToggle = () => {
    if (isListeningVoice) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  };

  // ==========================================
  // REAL CAMERA-ONLY EVIDENCE CAPTURE
  // ==========================================
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraOpen(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported on this device/browser.');
      return;
    }

    try {
      // Prefer environment (back) camera on smartphones
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings to capture evidence.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device found on this system. Evidence must be captured via a working camera.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to open camera.'}`);
      }
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhotoFromCamera = async () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Stop camera stream immediately after capture
      stopCameraStream();

      // Convert frame to Blob and upload
      setIsUploadingPhoto(true);
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsUploadingPhoto(false);
          setCameraError('Could not capture frame from camera.');
          return;
        }

        try {
          const res = await api.uploadComplaintMedia(blob);
          if (res && res.success && res.data?.mediaUrl) {
            setSelectedPhoto(res.data.mediaUrl);
          } else {
            // Local data URL preview fallback if upload returned error
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setSelectedPhoto(dataUrl);
          }
        } catch (uploadErr) {
          console.error('Evidence upload error:', uploadErr);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedPhoto(dataUrl);
        } finally {
          setIsUploadingPhoto(false);
        }
      }, 'image/jpeg', 0.85);
    } catch (err) {
      console.error('Failed to capture frame:', err);
      setCameraError('Failed to capture photo from video feed.');
    }
  };

  // ==========================================
  // REAL GPS LOCATION DETECTION & REVERSE GEOCODING
  // ==========================================
  const handleDetectCurrentLocation = () => {
    setLocationError(null);
    setIsLocating(true);

    if (!navigator.geolocation) {
      setLocationError('Geolocation services are not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const detectedLat = position.coords.latitude;
        const detectedLng = position.coords.longitude;
        setLat(detectedLat);
        setLng(detectedLng);

        try {
          const res = await api.reverseGeocode(detectedLat, detectedLng);
          if (res && res.success && res.data) {
            const data = res.data;
            if (data.pincode) setPincode(data.pincode);
            if (data.state) setStateName(data.state);
            if (data.district) setDistrict(data.district);
            if (data.address) setStreetAddress(data.address);
            // Landmark remains manually editable and is not auto-filled
          } else {
            setLocationError('Coordinates retrieved, but reverse geocoding was unable to pinpoint postal details. Please fill in your address fields manually.');
          }
        } catch (geoErr) {
          console.warn('Reverse geocoding error:', geoErr);
          setLocationError('GPS coordinates detected, but address lookup failed. Please enter your PIN and address manually.');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Please allow location access in your device/browser settings, or enter your address details manually.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Location position unavailable. Please check your device GPS or enter address manually.');
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out. Please try again or enter address manually.');
        } else {
          setLocationError('Could not detect location. Please fill in the address fields manually.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  };

  // ==========================================
  // STEP 3: AI CATEGORY & PRIORITY ANALYSIS
  // ==========================================
  const handleProceedToAI = async () => {
    if (!description.trim() || !pincode || pincode.length !== 6) return;
    setStep(3);
    runAIAnalysis();
  };

  const runAIAnalysis = async () => {
    setIsAnalyzingAi(true);
    setAiAnalysisError(null);

    try {
      const res = await api.preAnalyzeComplaint({
        description,
        pincode,
        lat: lat || 26.7588,
        lng: lng || 83.3732,
        media: selectedPhoto ? [selectedPhoto] : []
      });

      if (res && res.success && res.data?.ai_recommendation) {
        const ai = res.data.ai_recommendation;
        setAiResult(ai);
        setSelectedCategory(ai.category || 'Roads & Potholes');
        setSelectedPriority(ai.priority || 'MEDIUM');
      } else {
        // Fallback default recommendation
        setSelectedCategory('Roads & Potholes');
        setSelectedPriority('MEDIUM');
      }
    } catch (e) {
      console.error('AI Analysis failed:', e);
      setAiAnalysisError('AI analysis could not complete. You can select your issue category and priority manually below.');
      setSelectedCategory('Roads & Potholes');
      setSelectedPriority('MEDIUM');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // ==========================================
  // STEP 4: FINAL SUBMISSION
  // ==========================================
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const fullAddress = [streetAddress, landmark, district, stateName].filter(Boolean).join(', ') || 'Address Provided';

      const payload = {
        description,
        pincode,
        state: stateName,
        district,
        address: fullAddress,
        landmark,
        lat: lat || 26.7588,
        lng: lng || 83.3732,
        category: selectedCategory || 'Roads & Potholes',
        priority: selectedPriority || 'MEDIUM',
        media: selectedPhoto ? [selectedPhoto] : [],
        citizen_phone: userProfile?.phone || ''
      };

      const res = await api.createComplaint(payload);

      if (res && res.success) {
        setCreatedComplaint(res.data.complaint);
        setStep(5);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D4FF00', '#FFFFFF', '#60A5FA']
        });
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Submit complaint error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 10, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: 'min(92vh, 760px)',
          backgroundColor: 'var(--modal-bg, #12181F)',
          color: 'var(--text-primary, #F8FAFC)',
          borderRadius: '24px',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.65)',
          animation: 'modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '1.1rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-secondary, #0E1318)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {step > 1 && step < 5 && (
              <button
                onClick={() => setStep(step - 1)}
                aria-label="Previous step"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary, #94A3B8)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                {step === 5 ? 'Grievance Registered' : 'Report Civic Problem'}
              </h2>
              {step < 5 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748B)' }}>
                  Step {step} of 4 • {step === 1 ? 'Describe Issue' : step === 2 ? 'Location' : step === 3 ? 'Category & Priority' : 'Review'}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'var(--badge-bg, rgba(255, 255, 255, 0.06))',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: 'var(--text-secondary, #94A3B8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>

          {/* ======================================================== */}
          {/* STEP 1: Describe the Civic Problem */}
          {/* ======================================================== */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                  What's the Problem?
                </h3>
              </div>

              {/* Textarea + Real Speech-to-Text Button */}
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the civic issue you observed in your own words..."
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-card, #18202A)',
                    border: isListeningVoice ? '2px solid var(--accent-lime, #D4FF00)' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                    borderRadius: '16px',
                    padding: '1rem 3.5rem 1rem 1rem',
                    color: 'var(--text-primary, #F8FAFC)',
                    fontSize: '0.92rem',
                    lineHeight: 1.5,
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />

                {/* Real Speech-to-Text Trigger Button */}
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  title={isListeningVoice ? 'Stop listening' : 'Speak to Describe Problem'}
                  aria-label={isListeningVoice ? 'Stop listening' : 'Activate speech recognition'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    bottom: '16px',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: isListeningVoice ? 'var(--accent-lime, #D4FF00)' : 'var(--badge-bg, rgba(255, 255, 255, 0.08))',
                    color: isListeningVoice ? '#0B0F12' : 'var(--accent-lime, #D4FF00)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isListeningVoice ? '0 0 15px rgba(212, 255, 0, 0.5)' : 'none'
                  }}
                >
                  {isListeningVoice ? <MicOff size={19} /> : <Mic size={19} />}
                </button>
              </div>

              {/* Active Listening Indicator */}
              {isListeningVoice && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '12px',
                    backgroundColor: 'var(--badge-bg, rgba(212, 255, 0, 0.1))',
                    border: '1px solid var(--border-subtle, rgba(212, 255, 0, 0.25))',
                    color: 'var(--accent-lime, #D4FF00)',
                    fontSize: '0.78rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="glow-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-lime, #D4FF00)' }} />
                    <span>Listening... Speak clearly to describe the civic issue.</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopVoiceRecognition}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary, #F8FAFC)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Speech Recognition Error Alert */}
              {voiceError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#EF4444',
                    fontSize: '0.76rem'
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{voiceError}</span>
                </div>
              )}

              {/* Camera-Only Evidence Section */}
              <div style={{ marginBottom: '1.35rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', display: 'block', marginBottom: '0.5rem' }}>
                  Camera Evidence
                </label>

                {/* If live camera viewfinder is open */}
                {isCameraOpen ? (
                  <div
                    style={{
                      borderRadius: '16px',
                      overflow: 'hidden',
                      backgroundColor: '#000',
                      border: '1px solid var(--accent-lime, #D4FF00)',
                      position: 'relative'
                    }}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        maxHeight: '260px',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />

                    {/* Camera Control Overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '0.85rem',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <button
                        type="button"
                        onClick={stopCameraStream}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '0.5rem 0.85rem',
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>

                      {/* Large Shutter Button */}
                      <button
                        type="button"
                        onClick={capturePhotoFromCamera}
                        aria-label="Capture photo"
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-lime, #D4FF00)',
                          border: '4px solid #FFF',
                          color: '#0B0F12',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 0 20px rgba(212, 255, 0, 0.5)'
                        }}
                      >
                        <Camera size={26} strokeWidth={2.5} />
                      </button>

                      <div style={{ width: '60px' }} />
                    </div>
                  </div>
                ) : selectedPhoto ? (
                  /* Captured Photo Review Preview */
                  <div
                    style={{
                      backgroundColor: 'var(--bg-card, #18202A)',
                      borderRadius: '16px',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                      padding: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem'
                    }}
                  >
                    <div
                      style={{
                        width: '74px',
                        height: '74px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid var(--accent-lime, #D4FF00)',
                        flexShrink: 0
                      }}
                    >
                      <img
                        src={selectedPhoto}
                        alt="Captured Evidence Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                        <CheckCircle2 size={15} color="var(--accent-lime, #D4FF00)" />
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)' }}>
                          Evidence Photo Captured
                        </span>
                      </div>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94A3B8)', margin: 0 }}>
                        {isUploadingPhoto ? 'Uploading to secure storage...' : 'Ready for civic engineer review.'}
                      </p>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={startCamera}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-lime, #D4FF00)',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: 0
                          }}
                        >
                          <RotateCcw size={13} /> Retake
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: 0
                          }}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Initial "Take Photo" Action */
                  <div>
                    <button
                      type="button"
                      onClick={startCamera}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-card, #18202A)',
                        border: '1px dashed var(--border-medium, rgba(255, 255, 255, 0.2))',
                        borderRadius: '16px',
                        padding: '1.1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        cursor: 'pointer',
                        color: 'var(--text-primary, #F8FAFC)',
                        transition: 'all 0.18s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-lime, #D4FF00)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--badge-bg, rgba(212, 255, 0, 0.12))',
                          color: 'var(--accent-lime, #D4FF00)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Camera size={22} />
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        Take Photo of Problem
                      </span>
                      <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary, #94A3B8)' }}>
                        Opens device camera to capture live proof
                      </span>
                    </button>
                  </div>
                )}

                {/* Camera Error Alert */}
                {cameraError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      marginTop: '0.65rem',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#EF4444',
                      fontSize: '0.76rem'
                    }}
                  >
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>

              {/* Continue to Location Button */}
              <button
                type="button"
                disabled={!description.trim()}
                onClick={() => setStep(2)}
                className="btn-lime"
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  borderRadius: '14px',
                  fontSize: '0.95rem',
                  opacity: description.trim() ? 1 : 0.5,
                  cursor: description.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Continue to Location <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: Where Is the Problem Located? */}
          {/* ======================================================== */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                  Where Is the Problem Located?
                </h3>
              </div>

              {/* Prominent "My Current Location" GPS Detection Action */}
              <div style={{ marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={handleDetectCurrentLocation}
                  disabled={isLocating}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--badge-bg, rgba(212, 255, 0, 0.1))',
                    border: '1px solid var(--accent-lime, #D4FF00)',
                    borderRadius: '14px',
                    padding: '0.85rem 1rem',
                    color: 'var(--accent-lime, #D4FF00)',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.55rem',
                    cursor: isLocating ? 'not-allowed' : 'pointer',
                    transition: 'all 0.18s ease'
                  }}
                >
                  {isLocating ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      <span>Detecting current location & address...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={17} />
                      <span>My Current Location</span>
                    </>
                  )}
                </button>

                {/* Display exact coordinates when detected */}
                {lat !== null && lng !== null && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '0.6rem',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(212, 255, 0, 0.08)',
                      border: '1px solid rgba(212, 255, 0, 0.25)',
                      color: 'var(--accent-lime, #D4FF00)',
                      fontSize: '0.78rem',
                      fontWeight: 600
                    }}
                  >
                    <MapPin size={15} style={{ flexShrink: 0 }} />
                    <span>
                      Detected Coordinates: <strong>{Number(lat).toFixed(6)}° N, {Number(lng).toFixed(6)}° E</strong>
                    </span>
                  </div>
                )}

                {locationError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      marginTop: '0.5rem',
                      padding: '0.6rem 0.8rem',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#EF4444',
                      fontSize: '0.75rem'
                    }}
                  >
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <span>{locationError}</span>
                  </div>
                )}
              </div>

              {/* Clean Location Form with 5 Editable Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                {/* 1. PIN Code */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary, #F8FAFC)', display: 'block', marginBottom: '0.35rem' }}>
                    PIN Code <span style={{ color: 'var(--accent-lime, #D4FF00)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 273001"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-card, #18202A)',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                      borderRadius: '12px',
                      padding: '0.75rem 1rem',
                      color: 'var(--text-primary, #F8FAFC)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* 2. State & 3. District (Row) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary, #F8FAFC)', display: 'block', marginBottom: '0.35rem' }}>
                      State
                    </label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      placeholder="e.g. Uttar Pradesh"
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-card, #18202A)',
                        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                        borderRadius: '12px',
                        padding: '0.7rem 0.85rem',
                        color: 'var(--text-primary, #F8FAFC)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary, #F8FAFC)', display: 'block', marginBottom: '0.35rem' }}>
                      District
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Gorakhpur"
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-card, #18202A)',
                        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                        borderRadius: '12px',
                        padding: '0.7rem 0.85rem',
                        color: 'var(--text-primary, #F8FAFC)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* 4. Street Address */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary, #F8FAFC)', display: 'block', marginBottom: '0.35rem' }}>
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. Civil Lines Road, Ward 12"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-card, #18202A)',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      borderRadius: '12px',
                      padding: '0.7rem 0.85rem',
                      color: 'var(--text-primary, #F8FAFC)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* 5. Landmark */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary, #F8FAFC)', display: 'block', marginBottom: '0.35rem' }}>
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Opposite City Hospital / Near Clock Tower"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-card, #18202A)',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      borderRadius: '12px',
                      padding: '0.7rem 0.85rem',
                      color: 'var(--text-primary, #F8FAFC)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Live Municipality Jurisdiction Feedback */}
              <div style={{ marginBottom: '1.25rem' }}>
                {isVerifyingPin ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)' }}>
                    <RefreshCw size={14} className="animate-spin" /> Verifying municipal jurisdiction...
                  </div>
                ) : pinInfo ? (
                  pinInfo.is_mapped ? (
                    <div
                      style={{
                        backgroundColor: 'var(--badge-bg, rgba(212, 255, 0, 0.08))',
                        border: '1px solid var(--border-subtle, rgba(212, 255, 0, 0.3))',
                        borderRadius: '12px',
                        padding: '0.65rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem'
                      }}
                    >
                      <CheckCircle2 size={18} color="var(--accent-lime, #D4FF00)" />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-lime, #D4FF00)' }}>
                          📍 Matched: {pinInfo.municipality_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94A3B8)' }}>
                          {pinInfo.ward_name ? `Zone: ${pinInfo.ward_name}` : `Locality: ${pinInfo.locality_name || 'Standard Zone'}`} • {pinInfo.state}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '12px',
                        padding: '0.65rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem'
                      }}
                    >
                      <AlertTriangle size={18} color="#F59E0B" />
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F59E0B' }}>
                          Unmapped PIN Code ({pincode})
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94A3B8)' }}>
                          Will be routed to Master Admin review queue for jurisdiction allocation.
                        </div>
                      </div>
                    </div>
                  )
                ) : null}
              </div>

              {/* Continue to AI Category Check Button */}
              <button
                type="button"
                disabled={!pincode || pincode.length !== 6}
                onClick={handleProceedToAI}
                className="btn-lime"
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  borderRadius: '14px',
                  fontSize: '0.95rem',
                  opacity: pincode.length === 6 ? 1 : 0.5,
                  cursor: pincode.length === 6 ? 'pointer' : 'not-allowed'
                }}
              >
                Continue to AI Category Check <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: AI Category and Priority Check */}
          {/* ======================================================== */}
          {step === 3 && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                  AI Category and Priority Check
                </h3>
              </div>

              {isAnalyzingAi ? (
                <div
                  className="scan-animation"
                  style={{
                    backgroundColor: 'var(--bg-card, #18202A)',
                    borderRadius: '16px',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    border: '1px solid var(--border-subtle, rgba(212, 255, 0, 0.2))'
                  }}
                >
                  <Sparkles size={34} color="var(--accent-lime, #D4FF00)" className="animate-spin" style={{ margin: '0 auto 1rem auto' }} />
                  <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary, #F8FAFC)', fontWeight: 600 }}>Analyzing issue details...</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.35rem' }}>
                    Detecting civic category and assessing priority rating based on your description.
                  </p>
                </div>
              ) : (
                <div>
                  {aiAnalysisError && (
                    <div
                      style={{
                        padding: '0.75rem 0.9rem',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.76rem', color: '#EF4444' }}>
                        <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                        <span>{aiAnalysisError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={runAIAnalysis}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-lime, #D4FF00)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Predicted Category Card with Editable Dropdown */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-card, #18202A)',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                      borderRadius: '16px',
                      padding: '1.1rem',
                      marginBottom: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748B)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        PREDICTED CATEGORY
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-lime, #D4FF00)', fontWeight: 700 }}>
                        {aiResult?.confidence ? `${Math.round(aiResult.confidence * 100)}% Confidence` : 'AI Recommendation'}
                      </span>
                    </div>

                    <div style={{ marginBottom: '0.65rem' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '0.35rem' }}>
                        Category (change if needed):
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{
                          width: '100%',
                          backgroundColor: 'var(--bg-secondary, #12181F)',
                          color: 'var(--text-primary, #F8FAFC)',
                          border: '1px solid var(--border-subtle, rgba(212, 255, 0, 0.3))',
                          borderRadius: '10px',
                          padding: '0.6rem 0.85rem',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          outline: 'none',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        {CIVIC_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Priority Recommendation Card with Editable Selector */}
                  <div
                    style={{
                      backgroundColor: 'var(--bg-card, #18202A)',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                      borderRadius: '16px',
                      padding: '1.1rem',
                      marginBottom: '1.25rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748B)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        RECOMMENDED PRIORITY
                      </span>
                      <span
                        style={{
                          backgroundColor: selectedPriority === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : selectedPriority === 'HIGH' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                          color: selectedPriority === 'CRITICAL' ? '#EF4444' : selectedPriority === 'HIGH' ? '#F59E0B' : '#60A5FA',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700
                        }}
                      >
                        {selectedPriority}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', lineHeight: 1.45, marginBottom: '0.75rem' }}>
                      <strong style={{ color: 'var(--text-primary, #F8FAFC)' }}>Why this priority:</strong> {aiResult?.priority_reason || 'Evaluated safety signals, traffic zone impact, and hazard depth.'}
                    </p>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', display: 'block', marginBottom: '0.35rem' }}>
                        Priority Level (review & adjust):
                      </label>
                      <select
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(e.target.value)}
                        style={{
                          width: '100%',
                          backgroundColor: 'var(--bg-secondary, #12181F)',
                          color: 'var(--text-primary, #F8FAFC)',
                          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                          borderRadius: '10px',
                          padding: '0.6rem 0.85rem',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          outline: 'none',
                          cursor: 'pointer',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="LOW">LOW — Routine civic maintenance</option>
                        <option value="MEDIUM">MEDIUM — Standard municipal response</option>
                        <option value="HIGH">HIGH — High traffic or neighborhood hazard</option>
                        <option value="CRITICAL">CRITICAL — Severe hazard / emergency</option>
                      </select>
                    </div>
                  </div>

                  {/* Proceed to Review */}
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="btn-lime"
                    style={{
                      width: '100%',
                      padding: '0.9rem',
                      borderRadius: '14px',
                      fontSize: '0.95rem'
                    }}
                  >
                    Review Your Report <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: Review Your Report */}
          {/* ======================================================== */}
          {step === 4 && (
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)', margin: 0 }}>
                  Review Report
                </h3>
              </div>

              {/* Review Card */}
              <div
                style={{
                  backgroundColor: 'var(--bg-card, #18202A)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  borderRadius: '16px',
                  padding: '1.1rem',
                  marginBottom: '1.25rem'
                }}
              >
                {/* Description Item */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                  <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary, #F8FAFC)', marginTop: '0.2rem', lineHeight: 1.45 }}>
                      {description}
                    </p>
                  </div>
                  <button onClick={() => setStep(1)} aria-label="Edit description" style={{ background: 'none', border: 'none', color: 'var(--accent-lime, #D4FF00)', cursor: 'pointer', padding: '0.25rem' }}>
                    <Edit3 size={15} />
                  </button>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle, rgba(255, 255, 255, 0.06))', margin: '0.75rem 0' }} />

                {/* Evidence Image Item */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Captured Evidence</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem' }}>
                      {selectedPhoto ? (
                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--accent-lime, #D4FF00)' }}>
                          <img src={selectedPhoto} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #94A3B8)' }}>No camera photo captured</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} aria-label="Edit evidence" style={{ background: 'none', border: 'none', color: 'var(--accent-lime, #D4FF00)', cursor: 'pointer', padding: '0.25rem' }}>
                    <Edit3 size={15} />
                  </button>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle, rgba(255, 255, 255, 0.06))', margin: '0.75rem 0' }} />

                {/* Location Item */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
                  <div style={{ flex: 1, paddingRight: '0.5rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Problem Location & Municipality</span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary, #F8FAFC)', marginTop: '0.2rem', fontWeight: 700 }}>
                      PIN: {pincode} • {pinInfo?.municipality_name || 'Municipal Corporation'}
                    </p>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.15rem' }}>
                      {[streetAddress, landmark, district, stateName].filter(Boolean).join(', ') || 'Address not specified'}
                    </p>
                    {lat && lng && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--accent-lime, #D4FF00)', marginTop: '0.15rem' }}>
                        GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setStep(2)} aria-label="Edit location" style={{ background: 'none', border: 'none', color: 'var(--accent-lime, #D4FF00)', cursor: 'pointer', padding: '0.25rem' }}>
                    <Edit3 size={15} />
                  </button>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle, rgba(255, 255, 255, 0.06))', margin: '0.75rem 0' }} />

                {/* Category & Priority Item */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748B)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category & Priority</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.88rem', color: 'var(--accent-lime, #D4FF00)', fontWeight: 700 }}>{selectedCategory || 'Roads & Potholes'}</span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary, #94A3B8)' }}>({selectedPriority} Priority)</span>
                    </div>
                  </div>
                  <button onClick={() => setStep(3)} aria-label="Edit category and priority" style={{ background: 'none', border: 'none', color: 'var(--accent-lime, #D4FF00)', cursor: 'pointer', padding: '0.25rem' }}>
                    <Edit3 size={15} />
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="btn-lime glow-pulse"
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '16px',
                  fontSize: '1rem'
                }}
              >
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={18} className="animate-spin" /> Submitting Grievance...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Submit Complaint <CheckCircle2 size={20} />
                  </span>
                )}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted, #64748B)', marginTop: '0.75rem' }}>
                You will be able to track every milestone and verify resolution proof from your dashboard.
              </p>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: Success Screen */}
          {/* ======================================================== */}
          {step === 5 && createdComplaint && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--badge-bg, rgba(212, 255, 0, 0.15))',
                  border: '2px solid var(--accent-lime, #D4FF00)',
                  color: 'var(--accent-lime, #D4FF00)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto'
                }}
              >
                <CheckCircle2 size={40} strokeWidth={2.5} />
              </div>

              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-lime, #D4FF00)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Report Received
              </span>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)', marginTop: '0.25rem' }}>
                Complaint Submitted!
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.25rem', maxWidth: '320px', margin: '0.25rem auto 1.5rem auto' }}>
                Your grievance has been logged and assigned to the municipal dispatch queue.
              </p>

              {/* Unique Complaint ID Badge */}
              <div
                style={{
                  backgroundColor: 'var(--bg-card, #18202A)',
                  border: '1px solid var(--border-subtle, rgba(212, 255, 0, 0.3))',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem'
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748B)' }}>COMPLAINT REFERENCE NUMBER</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-lime, #D4FF00)', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
                  {createdComplaint.complaint_number}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-primary, #F8FAFC)', marginTop: '0.4rem' }}>
                  {createdComplaint.municipality_name || 'Municipal Corporation'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94A3B8)' }}>
                  Target Resolution SLA: 48 Hours
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectComplaint) onSelectComplaint(createdComplaint.id);
                    onClose();
                  }}
                  className="btn-lime"
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', fontSize: '0.92rem' }}
                >
                  Track Live Progress
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost"
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', fontSize: '0.92rem' }}
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
