import { soundService } from '@/services/sound-service';

export function useSound() {
  async function prepareAudio() {
    await soundService.ensureAudioReady();
  }

  async function notifyStepComplete() {
    await soundService.notify();
  }

  return { notifyStepComplete, prepareAudio };
}
