import { soundService } from '@/services/sound-service';

export function useSound() {
  async function notifyStepComplete() {
    // Resume a suspended AudioContext — required by browser autoplay policy
    if (soundService['audioCtx']?.state === 'suspended') {
      await soundService['audioCtx']?.resume();
    }
    await soundService.notify();
  }

  return { notifyStepComplete };
}
