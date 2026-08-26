import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  RotateCcw, 
  RefreshCw, 
  User, 
  AlertCircle,
  Sparkles,
  Trash2,
  SwitchCamera
} from 'lucide-react';

interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoUrl?: string;
  patientName: string;
  onSavePhoto: (photoDataUrl: string) => void;
}

// Preset avatar options
const presetAvatars = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80'
];

export const ProfilePhotoModal: React.FC<ProfilePhotoModalProps> = ({
  isOpen,
  onClose,
  currentPhotoUrl,
  patientName,
  onSavePhoto
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'presets'>('camera');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start Camera Stream
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setIsCameraStarting(true);
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or environment.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.warn('Autoplay error:', e));
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let errorText = 'Could not access camera. Please ensure camera permissions are allowed.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorText = 'Camera permission was denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorText = 'No camera device found on your system.';
      }
      setCameraError(errorText);
    } finally {
      setIsCameraStarting(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Toggle Camera Facing
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Manage camera on tab change or modal open
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !capturedImage) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, capturedImage]);

  // Clean up when modal closes
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setSelectedPreset(null);
    setCameraError(null);
    setCountdown(null);
    onClose();
  };

  // Take Snapshot from Video Stream
  const takeSnapshot = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    const size = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Calculate crop from center to maintain 1:1 aspect ratio
      const startX = ((video.videoWidth || 480) - size) / 2;
      const startY = ((video.videoHeight || 480) - size) / 2;

      // Draw mirrored image if front camera for natural selfie orientation
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, startX, startY, size, size, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  // Shutter with 3-second timer
  const handleCaptureWithTimer = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          takeSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, 400, 400);
          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setCapturedImage(croppedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Save selected/captured photo
  const handleSave = () => {
    const photoToSave = capturedImage || selectedPreset;
    if (photoToSave) {
      onSavePhoto(photoToSave);
      handleClose();
    }
  };

  // Remove photo
  const handleRemovePhoto = () => {
    onSavePhoto('');
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col text-slate-100">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Patient Profile Photo</h3>
              <p className="text-xs text-slate-400">Update photo for {patientName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 p-2 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('camera'); setCapturedImage(null); }}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'camera' 
                ? 'bg-teal-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Camera</span>
          </button>

          <button
            onClick={() => { setActiveTab('upload'); setCapturedImage(null); }}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'upload' 
                ? 'bg-teal-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload</span>
          </button>

          <button
            onClick={() => { setActiveTab('presets'); setCapturedImage(null); }}
            className={`py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'presets' 
                ? 'bg-teal-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Avatars</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 flex flex-col items-center justify-center min-h-[320px]">
          
          {/* TAB 1: CAMERA CAPTURE */}
          {activeTab === 'camera' && (
            <div className="w-full flex flex-col items-center">
              {capturedImage ? (
                // Captured Image Review
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-teal-500 shadow-xl ring-4 ring-teal-500/20">
                    <img 
                      src={capturedImage} 
                      alt="Captured Profile" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-teal-400 font-semibold flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Photo Captured Successfully
                  </p>
                  <button
                    onClick={() => { setCapturedImage(null); startCamera(facingMode); }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Retake Photo
                  </button>
                </div>
              ) : cameraError ? (
                // Camera Error Fallback
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center space-y-3 max-w-sm">
                  <AlertCircle className="h-8 w-8 text-rose-400 mx-auto" />
                  <p className="text-xs text-rose-200">{cameraError}</p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      onClick={() => startCamera(facingMode)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retry Camera
                    </button>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
                    >
                      Use File Upload
                    </button>
                  </div>
                </div>
              ) : (
                // Live Camera Viewfinder
                <div className="flex flex-col items-center space-y-4 w-full">
                  <div className="relative w-52 h-52 sm:w-56 sm:h-56 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-950 shadow-inner flex items-center justify-center group">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />
                    
                    {/* Focal Ring Overlay */}
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-teal-400/40 pointer-events-none" />

                    {/* Countdown Overlay */}
                    {countdown !== null && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
                        <span className="text-5xl font-black text-teal-400 animate-ping">
                          {countdown}
                        </span>
                      </div>
                    )}

                    {isCameraStarting && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
                        <RefreshCw className="h-6 w-6 text-teal-400 animate-spin" />
                        <span>Starting camera...</span>
                      </div>
                    )}
                  </div>

                  {/* Camera Controls */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleToggleFacingMode}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Switch Camera (Front/Back)"
                    >
                      <SwitchCamera className="h-4 w-4" />
                    </button>

                    <button
                      onClick={takeSnapshot}
                      disabled={isCameraStarting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-teal-500/25 transition transform active:scale-95"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Take Photo</span>
                    </button>

                    <button
                      onClick={handleCaptureWithTimer}
                      disabled={isCameraStarting || countdown !== null}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                      title="Take Photo with 3s Timer"
                    >
                      3s Timer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FILE UPLOAD */}
          {activeTab === 'upload' && (
            <div className="w-full flex flex-col items-center space-y-4">
              {capturedImage ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-44 h-44 rounded-full overflow-hidden border-4 border-teal-500 shadow-xl ring-4 ring-teal-500/20">
                    <img 
                      src={capturedImage} 
                      alt="Uploaded Preview" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <p className="text-xs text-teal-400 font-semibold flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Image Selected
                  </p>
                  <button
                    onClick={() => { setCapturedImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Choose a different file
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-sm p-8 border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-2xl bg-slate-950/40 hover:bg-teal-500/5 transition cursor-pointer flex flex-col items-center text-center space-y-3"
                >
                  <div className="p-3 rounded-2xl bg-slate-800 text-teal-400 shadow-md">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Click or drag image here</p>
                    <p className="text-xs text-slate-400 mt-0.5">Supports PNG, JPG, WEBP (Max 5MB)</p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-teal-300 font-semibold">
                    Browse File
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRESET AVATARS */}
          {activeTab === 'presets' && (
            <div className="w-full space-y-4">
              <p className="text-xs text-slate-400 text-center">
                Select a high-resolution clinical avatar:
              </p>
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {presetAvatars.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setSelectedPreset(url); setCapturedImage(null); }}
                    className={`relative rounded-full overflow-hidden aspect-square border-2 transition-transform ${
                      selectedPreset === url 
                        ? 'border-teal-400 ring-4 ring-teal-500/30 scale-105' 
                        : 'border-slate-700 hover:border-slate-500 hover:scale-102'
                    }`}
                  >
                    <img 
                      src={url} 
                      alt={`Preset Avatar ${idx + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                    {selectedPreset === url && (
                      <div className="absolute inset-0 bg-teal-500/30 flex items-center justify-center">
                        <Check className="h-5 w-5 text-white font-black drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          {currentPhotoUrl ? (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-2 rounded-xl transition"
              title="Remove profile photo and use initials"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!capturedImage && !selectedPreset}
              onClick={handleSave}
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black transition ${
                capturedImage || selectedPreset
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 hover:from-teal-300 hover:to-emerald-400 shadow-lg shadow-teal-500/20 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              <span>Apply Photo</span>
            </button>
          </div>
        </div>

      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
