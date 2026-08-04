import React, { useState } from 'react';
import { X, Send, Video, Paperclip, CheckCircle } from 'lucide-react';
import { NotificationItem } from '../../types';

interface VideoFeedbackModalProps {
  notification: NotificationItem;
  onClose: () => void;
}

export const VideoFeedbackModal: React.FC<VideoFeedbackModalProps> = ({ notification, onClose }) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Mock data for the video correction request
  const mockExerciseName = "Squat con Bilanciere";
  const mockWeek = 3;
  const mockSets = 4;
  const mockReps = "8-10";

  const handleSend = () => {
    // In a real app, we would save this to the database/context
    // For now, we simulate the success state
    setIsSent(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[var(--color-panel)] border border-[var(--color-panel-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-panel-border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Video className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Correzione Video</h2>
              <p className="text-xs text-slate-400">Atleta: {notification.athleteName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSent ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Feedback Inviato!</h3>
            <p className="text-sm text-slate-400">Il tuo feedback è stato salvato e notificato all'atleta.</p>
          </div>
        ) : (
          <div className="overflow-y-auto p-5">
            {/* Context Info */}
            <div className="bg-slate-900 rounded-xl p-4 mb-6 border border-slate-800">
              <h4 className="text-sm font-semibold text-white mb-3">Dettagli Esecuzione</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Esercizio</p>
                  <p className="text-slate-200 font-medium">{mockExerciseName}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Settimana</p>
                  <p className="text-slate-200 font-medium">{mockWeek}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Serie / Reps</p>
                  <p className="text-slate-200 font-medium">{mockSets} sets x {mockReps}</p>
                </div>
              </div>
            </div>

            {/* Video Placeholder */}
            <div className="w-full aspect-video bg-black rounded-xl border border-slate-800 mb-6 flex items-center justify-center relative overflow-hidden group cursor-pointer">
              <Video className="w-12 h-12 text-slate-700 group-hover:text-slate-500 transition-colors" />
              <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-xs text-white backdrop-blur-md">
                00:45
              </div>
            </div>

            {/* Feedback Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-1.5">Il tuo Feedback Tecnico</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Scrivi qui i tuoi consigli per migliorare l'esecuzione..."
                  className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setHasAttachment(!hasAttachment)}
                  className={`flex-1 py-2.5 rounded-xl border border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                    hasAttachment 
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10' 
                      : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Paperclip className="w-4 h-4" />
                  {hasAttachment ? 'Allegato Inserito (Video.mp4)' : 'Allega Immagine/Video (Opzionale)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!isSent && (
          <div className="p-4 border-t border-[var(--color-panel-border)] bg-slate-900/50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSend}
              disabled={!feedbackText.trim()}
              className="px-6 py-2 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-black hover:bg-[#e6b800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Invia Feedback
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
