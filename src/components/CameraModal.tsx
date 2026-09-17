import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  X,
  Check,
  RotateCcw,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { downscaleVideoFrame, downscaleImageFile } from '../utils/imageUtils';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  noteTitle?: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  noteTitle,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [flashAnimation, setFlashAnimation] = useState<boolean>(false);

  // Stop current active media stream tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    stopStream();
    setIsLoading(true);
    setErrorMessage(null);

    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage('Kameran stöds inte i denna webbläsare eller miljö. Du kan välja en bildfil istället.');
      setIsLoading(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsLoading(false);
    } catch (err) {
      console.warn('Primary camera stream error, trying fallback constraints:', err);
      // Try fallback to any available video stream
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
        setIsLoading(false);
      } catch (fallbackErr: any) {
        console.error('Camera access denied or failed:', fallbackErr);
        if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
          setErrorMessage('Kameraåtkomst nekades. Tillåt kamera i webbläsarens inställningar eller ladda upp en bild.');
        } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.name === 'DevicesNotFoundError') {
          setErrorMessage('Ingen kamera hittades på enheten. Du kan ladda upp en bild från ditt fotobibliotek.');
        } else {
          setErrorMessage('Kunde inte starta kameran. Välj ett foto från ditt bibliotek istället.');
        }
        setIsLoading(false);
      }
    }
  }, [stopStream]);

  // Handle modal open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedImage(null);
      setErrorMessage(null);
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, startCamera, stopStream]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Take photo from active video stream
  const handleTakePhoto = async () => {
    if (!videoRef.current) return;

    try {
      setFlashAnimation(true);
      setTimeout(() => setFlashAnimation(false), 200);

      // Downscale video frame to crisp, lightweight image
      const scaledDataUrl = await downscaleVideoFrame(videoRef.current, 960, 0.82);
      setCapturedImage(scaledDataUrl);
      stopStream();
    } catch (err) {
      console.error('Failed to capture and downscale photo:', err);
      setErrorMessage('Kunde inte fånga bilden. Försök igen.');
    }
  };

  // Flip between front and rear cameras
  const handleToggleFacingMode = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // Confirm and insert photo into note
  const handleConfirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  // Fallback file input change handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const scaledDataUrl = await downscaleImageFile(file, 960, 0.82);
      setCapturedImage(scaledDataUrl);
      stopStream();
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to process image file:', err);
      setErrorMessage('Kunde inte bearbeta bildfilen. Välj en annan bild.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="camera-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="camera-modal-card"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Camera className="h-5 w-5 text-amber-400" />
            <span className="font-bold text-sm tracking-wide">
              {capturedImage ? 'Granska bild' : 'Kamera'}
            </span>
            {noteTitle && (
              <span className="text-xs text-zinc-400 truncate max-w-[160px]">
                · {noteTitle}
              </span>
            )}
          </div>
          <button
            id="btn-close-camera"
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors active:scale-95"
            aria-label="Stäng kamera"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Area */}
        <div className="relative flex-1 min-h-[300px] sm:min-h-[360px] bg-black flex items-center justify-center overflow-hidden">
          {/* Flash animation effect */}
          {flashAnimation && (
            <div className="absolute inset-0 z-30 bg-white opacity-80 pointer-events-none transition-opacity duration-200" />
          )}

          {/* Captured Image Review State */}
          {capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-zinc-950 p-2">
              <img
                src={capturedImage}
                alt="Fångad bild"
                className="max-h-[50vh] sm:max-h-[58vh] w-auto max-w-full rounded-xl object-contain shadow-lg border border-zinc-800"
              />
              <div className="absolute bottom-3 left-4 right-4 text-center pointer-events-none">
                <span className="inline-block px-3 py-1 rounded-full bg-black/60 backdrop-blur-xs text-xs text-zinc-300 font-medium">
                  Bilden har skalats ner för optimal passform i Post-it-lappen
                </span>
              </div>
            </div>
          ) : errorMessage ? (
            /* Error or fallback state */
            <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-300 max-w-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium mb-4 leading-relaxed">{errorMessage}</p>
              <button
                type="button"
                id="btn-fallback-select-file"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[44px] items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold text-sm shadow-md active:scale-95 transition-all"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Välj bild från enhet</span>
              </button>
            </div>
          ) : (
            /* Live Camera Stream */
            <div className="relative w-full h-full flex items-center justify-center">
              {isLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900/80 text-zinc-300 gap-2">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                  <span className="text-xs">Startar kamera...</span>
                </div>
              )}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full max-h-[55vh] object-cover"
              />
              {/* Camera reticle / frame guidelines */}
              <div className="absolute inset-8 pointer-events-none border border-white/20 rounded-2xl">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-400 rounded-br-lg" />
              </div>
            </div>
          )}
        </div>

        {/* Hidden fallback file input */}
        <input
          ref={fileInputRef}
          id="camera-fallback-file-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Footer / Control Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-zinc-900 border-t border-zinc-800 shrink-0">
          {capturedImage ? (
            /* Captured Mode Controls: Retake or Confirm */
            <div className="flex items-center justify-between w-full gap-3">
              <button
                id="btn-retake-photo"
                type="button"
                onClick={handleRetake}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm active:scale-98 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Ta om</span>
              </button>
              <button
                id="btn-confirm-photo"
                type="button"
                onClick={handleConfirmPhoto}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md active:scale-98 transition-all"
              >
                <Check className="h-4 w-4 stroke-[2.5]" />
                <span>Infoga i lappen</span>
              </button>
            </div>
          ) : (
            /* Live Camera Controls */
            <div className="flex items-center justify-between w-full">
              {/* File / photo library fallback */}
              <button
                id="btn-open-file-picker"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:scale-95 transition-all"
                title="Välj sparad bild"
                aria-label="Välj sparad bild"
              >
                <ImageIcon className="h-5 w-5" />
              </button>

              {/* Primary Shutter Button */}
              <button
                id="btn-capture-shutter"
                type="button"
                onClick={handleTakePhoto}
                disabled={isLoading || Boolean(errorMessage)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-zinc-950 p-1 shadow-lg active:scale-90 transition-transform disabled:opacity-40 disabled:pointer-events-none"
                title="Ta foto"
                aria-label="Ta foto"
              >
                <div className="h-13 w-13 rounded-full border-3 border-zinc-900 bg-amber-400 hover:bg-amber-300 transition-colors flex items-center justify-center">
                  <Camera className="h-6 w-6 text-amber-950" />
                </div>
              </button>

              {/* Flip camera front/back */}
              <button
                id="btn-flip-camera"
                type="button"
                onClick={handleToggleFacingMode}
                disabled={isLoading || Boolean(errorMessage)}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 active:scale-95 transition-all disabled:opacity-40"
                title="Vänd kamera"
                aria-label="Vänd kamera"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
