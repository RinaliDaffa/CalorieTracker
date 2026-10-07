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
    // A late second tap on Analyze must not re-log the same words once the first save is done.
    if (request.kind === 'text') setDescription('');
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
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold">{m.title_scan()}</h1>
        <p className="text-sm text-muted-foreground">{m.scan_subtitle()}</p>
      </header>

      {apiKey.loaded && !apiKey.value ? <AddKeyPrompt /> : null}

      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_50%_40%,var(--muted),var(--card))] shadow-card">
        {mode === 'camera' ? (
          <video ref={videoRef} className="size-full object-cover" playsInline muted autoPlay />
        ) : previewUrl ? (
          <img src={previewUrl} alt={m.meal_photo_alt()} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
            <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground">
              <Camera className="size-6" />
            </span>
            {m.scan_start_hint()}
          </div>
        )}
        {/* Viewfinder corners: frame the plate, not the table. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-5">
          <span className="absolute top-0 left-0 size-7 rounded-tl-xl border-t-[3px] border-l-[3px] border-primary/80" />
          <span className="absolute top-0 right-0 size-7 rounded-tr-xl border-t-[3px] border-r-[3px] border-primary/80" />
          <span className="absolute bottom-0 left-0 size-7 rounded-bl-xl border-b-[3px] border-l-[3px] border-primary/80" />
          <span className="absolute right-0 bottom-0 size-7 rounded-br-xl border-r-[3px] border-b-[3px] border-primary/80" />
        </span>
        {busy ? (
          <div
            role="status"
            className="absolute inset-0 grid place-items-center bg-background/75 backdrop-blur-sm"
          >
            <span className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-card">
              <Loader2 className="size-4 animate-spin text-primary" />
              {m.analyzing()}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-8">
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
          className="size-[4.5rem] rounded-full shadow-[0_10px_24px_-8px] shadow-primary/60 ring-4 ring-primary/20"
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
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-card p-4 text-sm shadow-card"
        >
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

      <form
        onSubmit={onDescribe}
        className="space-y-3 rounded-3xl border bg-card p-4 shadow-card sm:p-5"
      >
        <Label htmlFor="describe" className="font-display text-base font-bold">
          {m.describe_title()}
        </Label>
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
