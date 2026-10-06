import { type AnalysisOutcome, analyzePhoto, analyzeText } from '@nutrisnap/ai';
import type { CapturedPhoto } from '@nutrisnap/platform';
import { useNavigate } from '@tanstack/react-router';
import { Camera, ImagePlus, Loader2, RotateCcw } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { gemini } from '@/ai/client';
import { aiErrorMessage } from '@/ai/messages';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSetting } from '@/db/hooks';
import { softDeleteMeal } from '@/db/meals';
import { db } from '@/db/schema';
import { AddKeyPrompt } from '@/features/common/AddKeyPrompt';
import { ResultView } from '@/features/result/ResultView';
import { aiLang } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { useObjectUrl } from '@/lib/use-object-url';
import { m } from '@/paraglide/messages.js';
import { platform } from '@/platform';
import { saveAnalysis } from './save';

type Mode = 'idle' | 'camera' | 'analyzing' | 'result' | 'failed';
type Request = { kind: 'photo'; photo: CapturedPhoto } | { kind: 'text'; text: string };

// A stop() that races start() (StrictMode's double effect, leaving the screen) is not a denial.
function isCancelled(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === 'Camera start was cancelled' || error.name === 'AbortError')
  );
}

export function ScanScreen() {
  const navigate = useNavigate();
  const apiKey = useSetting<string>('apiKey');
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const describeRef = useRef<HTMLTextAreaElement>(null);
  // A ref, not state: two taps in the same frame both see stale state.
  const inFlight = useRef(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [mealId, setMealId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<Request | null>(null);
  const [description, setDescription] = useState('');
  const previewUrl = useObjectUrl(photo?.blob);
  const busy = mode === 'analyzing';

  useEffect(() => {
    if (mode !== 'camera') return;
    const video = videoRef.current;
    if (!video) return;
    const camera = platform().camera;
    camera.start(video).catch((e: unknown) => {
      if (isCancelled(e)) return;
      setMode('idle');
      toast.error(m.camera_denied());
      fileRef.current?.click();
    });
    return () => camera.stop();
  }, [mode]);

  async function guarded(task: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      await task();
    } finally {
      inFlight.current = false;
    }
  }

  function reset() {
    setMode('idle');
    setPhoto(null);
    setMealId(null);
    setError(null);
  }

  async function finish(outcome: AnalysisOutcome, request: Request) {
    const captured = request.kind === 'photo' ? request.photo : null;
    const saved = await saveAnalysis(db, {
      analysis: outcome,
      source: request.kind,
      now: new Date(),
      photo: captured
        ? {
            full: captured.blob,
            thumb: await platform().image.thumbnail(captured.blob),
            takenAt: captured.takenAt,
          }
        : undefined,
    });
    setMealId(saved.id);
    setMode('result');
    const photoLost = captured !== null && !saved.photoId;
    toast.success(photoLost ? m.saved_no_photo() : m.saved(), {
      action: { label: m.undo(), onClick: () => void softDeleteMeal(db, saved.id).then(reset) },
    });
    if (outcome.warnings.length > 0) toast.info(m.analysis_check());
  }

  async function run(request: Request) {
    setLastRequest(request);
    setError(null);
    setMode('analyzing');
    try {
      const outcome =
        request.kind === 'photo'
          ? await analyzePhoto(gemini, request.photo.base64, aiLang())
          : await analyzeText(gemini, request.text, aiLang());
      await finish(outcome, request);
    } catch (e) {
      setError(aiErrorMessage(e));
      setMode('failed');
    }
  }

  async function analyzeBlob(blob: Blob) {
    let captured: CapturedPhoto;
    try {
      captured = await platform().image.prepare(blob);
    } catch {
      toast.error(m.image_unreadable());
      setMode('idle');
      return;
    }
    setPhoto(captured);
    await run({ kind: 'photo', photo: captured });
  }

  async function onCapture() {
    if (mode !== 'camera') {
      reset();
      setMode('camera');
      return;
    }
    let raw: Blob;
    try {
      raw = await platform().camera.capture();
    } catch {
      toast.error(m.camera_denied());
      setMode('idle');
      return;
    }
    platform().camera.stop();
    await analyzeBlob(raw);
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    void guarded(async () => {
      reset();
      await analyzeBlob(file);
    });
  }

  function onDescribe(event: FormEvent) {
    event.preventDefault();
    const text = description.trim();
    if (!text) {
      toast.error(m.describe_empty());
      return;
    }
    void guarded(async () => {
      setPhoto(null);
      setMealId(null);
      await run({ kind: 'text', text });
    });
  }

  return (
    <div className="space-y-4">
      <header className="text-center">
        <h1 className="text-2xl font-bold">{m.title_scan()}</h1>
        <p className="text-sm text-muted-foreground">{m.scan_subtitle()}</p>
      </header>

      {apiKey.loaded && !apiKey.value ? <AddKeyPrompt /> : null}

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-muted">
        {mode === 'camera' ? (
          <video ref={videoRef} className="size-full object-cover" playsInline muted autoPlay />
        ) : previewUrl ? (
          <img src={previewUrl} alt={m.meal_photo_alt()} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-sm text-muted-foreground">
            {m.scan_start_hint()}
          </div>
        )}
        {busy ? (
          <div role="status" className="absolute inset-0 grid place-items-center bg-background/70">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="size-4 animate-spin" />
              {m.analyzing()}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-6">
        <Button
          variant="secondary"
          size="icon"
          className="size-12 rounded-full"
          aria-label={m.scan_gallery()}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-5" />
        </Button>
        <Button
          size="icon"
          className="size-16 rounded-full"
          aria-label={mode === 'camera' ? m.scan_capture() : m.scan_start_camera()}
          disabled={busy}
          onClick={() => void guarded(onCapture)}
        >
          <Camera className="size-7" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="size-12 rounded-full"
          aria-label={m.scan_retake()}
          disabled={busy || !photo}
          onClick={reset}
        >
          <RotateCcw className="size-5" />
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid="gallery-input"
          onChange={onFile}
        />
      </div>

      {mode === 'failed' && error ? (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-4 text-sm">
          <p className="font-semibold">{m.analysis_failed_title()}</p>
          <p className="mt-1">{error}</p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                const request = lastRequest;
                if (request) void guarded(() => run(request));
              }}
            >
              {m.retry()}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => describeRef.current?.focus()}>
              {m.describe_instead()}
            </Button>
          </div>
        </div>
      ) : null}

      {mode === 'result' && mealId ? (
        <ResultView mealId={mealId} onDone={() => void navigate({ to: '/' })} />
      ) : null}

      <form onSubmit={onDescribe} className="space-y-2 rounded-xl border bg-card p-4">
        <Label htmlFor="describe">{m.describe_title()}</Label>
        <Textarea
          id="describe"
          ref={describeRef}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={m.describe_placeholder()}
        />
        <Button type="submit" className="w-full" disabled={busy}>
          {m.analyze()}
        </Button>
      </form>
    </div>
  );
}
