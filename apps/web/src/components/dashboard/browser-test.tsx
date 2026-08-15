'use client';

import { useRef, useState } from 'react';
import { Mic, MicOff, PhoneCall } from 'lucide-react';
import { Alert, Badge, Button } from '@/components/ui';

type Status = 'idle' | 'connecting' | 'live' | 'ended';

/**
 * In-browser conversation with the receptionist over WebRTC.
 *
 * The browser receives a short-lived OpenAI Realtime client secret minted
 * server-side; the standing API key is never exposed. This test does not use
 * telephony, so it consumes no plan minutes — but it does use AI usage, which
 * the UI states plainly rather than implying it is free.
 */
export function BrowserTest({ canTest }: { canTest: boolean }) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<{ message: string; action?: string } | null>(null);
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function start() {
    setError(null);
    setTranscript([]);
    setStatus('connecting');

    try {
      const tokenRes = await fetch('/api/receptionist/test-session', { method: 'POST' });
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) {
        setError({
          message: tokenJson?.error?.message ?? 'The test session could not be started.',
          action: tokenJson?.error?.action,
        });
        setStatus('idle');
        return;
      }

      let micStream: MediaStream;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setError({
          message: 'Microphone access was blocked.',
          action: 'Allow microphone access for this site in your browser settings, then try again.',
        });
        setStatus('idle');
        return;
      }
      streamRef.current = micStream;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (audioRef.current && event.streams[0]) {
          audioRef.current.srcObject = event.streams[0];
          void audioRef.current.play();
        }
      };

      for (const track of micStream.getTracks()) pc.addTrack(track, micStream);

      const channel = pc.createDataChannel('oai-events');
      channel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as {
            type?: string;
            transcript?: string;
            delta?: string;
          };
          if (message.type === 'conversation.item.input_audio_transcription.completed' && message.transcript) {
            setTranscript((t) => [...t, { role: 'user', text: message.transcript! }]);
          }
          if (message.type === 'response.output_audio_transcript.done' && message.transcript) {
            setTranscript((t) => [...t, { role: 'assistant', text: message.transcript! }]);
          }
        } catch {
          /* non-JSON control frames are ignored */
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const answerRes = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(tokenJson.model)}`, {
        method: 'POST',
        body: offer.sdp ?? '',
        headers: {
          Authorization: `Bearer ${tokenJson.client_secret}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!answerRes.ok) {
        setError({ message: 'The realtime connection was refused. Please try again in a moment.' });
        await stop();
        return;
      }

      await pc.setRemoteDescription({ type: 'answer', sdp: await answerRes.text() });
      setStatus('live');
    } catch {
      setError({ message: 'The test could not start. Check your connection and try again.' });
      setStatus('idle');
    }
  }

  async function stop() {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus('ended');
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Mic className="size-4 text-brand-600" aria-hidden />
            Browser test
          </h3>
          <p className="mt-1.5 text-sm text-ink-muted">
            Talk to your receptionist right here. It uses your real business knowledge, voice and
            rules. No telephony minutes are used — AI usage still applies.
          </p>
          <p className="mt-2 text-xs text-ink-subtle">
            Tools are disabled in the browser test, so it will describe what it would do rather than
            actually booking or texting.
          </p>

          {error && (
            <Alert tone="critical" title={error.message} className="mt-3">
              {error.action && <p>{error.action}</p>}
            </Alert>
          )}

          <div className="mt-4 flex items-center gap-2">
            {status === 'live' ? (
              <Button variant="danger" onClick={stop}>
                <MicOff aria-hidden /> End test
              </Button>
            ) : (
              <Button loading={status === 'connecting'} disabled={!canTest} onClick={start}>
                <Mic aria-hidden />
                {status === 'connecting' ? 'Connecting' : status === 'ended' ? 'Test again' : 'Start talking'}
              </Button>
            )}
            {status === 'live' && <Badge tone="positive">Live</Badge>}
          </div>
        </div>

        <div className="rounded-lg border border-line p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <PhoneCall className="size-4 text-brand-600" aria-hidden />
            Call test
          </h3>
          <p className="mt-1.5 text-sm text-ink-muted">
            Call your AI number from your own phone. This is the closest thing to a real customer
            call — it uses telephony and counts toward your included minutes.
          </p>
          <p className="mt-2 text-xs text-ink-subtle">
            Your number is on the Phone settings page. The call will appear in your call history like
            any other.
          </p>
        </div>
      </div>

      {transcript.length > 0 && (
        <div className="rounded-lg border border-line p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Live transcript
          </h4>
          <ul className="mt-2 space-y-2">
            {transcript.map((m, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium text-ink-faint">
                  {m.role === 'assistant' ? 'Receptionist: ' : 'You: '}
                </span>
                <span className="text-ink-muted">{m.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <audio ref={audioRef} autoPlay className="sr-only" />
    </div>
  );
}
