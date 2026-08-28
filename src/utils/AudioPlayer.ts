export class AudioPlayer {
    private _audioQueue: Promise<void>;
    private _uriPrefix: string;
    private _isMuted: boolean;

    /**
     * Class constructor
     * @param uriPrefix root path for audio ressources
     * @param isMuted mute audio playback
     */
    constructor(uriPrefix : string ='', isMuted : boolean = false) {
        // Initialize "audio queue" with an empty/already-resolved promise
        this._audioQueue = Promise.resolve();
        this._uriPrefix = uriPrefix;
        this._isMuted = isMuted;
    }

    /**
     * Plays an audio file asynchronously
     * @param audioUri URI to the audio file
     * @param volume number between 0.0 and 1.0
     */
    async playAudio(audioUri: string, volume: number): Promise<HTMLAudioElement> {
        const audioPlayer = new Audio(this._uriPrefix + audioUri);
        audioPlayer.volume = volume;
        if(!this._isMuted) {
            try {
                await audioPlayer.play();
            } catch (error) {
                console.warn(`Could not play audio ${audioUri}:`, error);
            }
        }

        return audioPlayer;
    }

    /**
     * Enqueue a new audio file without blocking the caller on playback completion.
     * The sound will start in the background while the rest of the knitting loop continues.
     * @param audioUri URI to the audio file
     * @param volume number between 0.0 and 1.0
     * @returns
     */
    async queueAudio(audioUri: string, volume: number): Promise<HTMLAudioElement> {
        const nextPlay = this._audioQueue.then(async () => {
            return this.playAudio(audioUri, volume);
        });

        // Move audio queue to the new tail without waiting for the sound to finish.
        this._audioQueue = nextPlay
            .then(() => {})
            .catch(() => {});

        return nextPlay;
    }
}