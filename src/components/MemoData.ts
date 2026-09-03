export class MemoData {
    private static readonly AYAB_PREFIX = "AYAB:";
    private _memo: number[] | null = null;

    /**
     * Parses AYAB memo data from PNG comments.
     * The expected format is "AYAB:..." where "..." is a sequence of hex digits.
     * Each hex digit represents a nibble (4 bits).
     * @param payload The string payload extracted from the PNG comment.
     * @returns An array of nibbles (numbers 0-15) or null if the payload is invalid.
     */
    public static parseString(payload: string): number[] | null {
        if (!payload.startsWith(this.AYAB_PREFIX)) {
            return null; // Not an AYAB payload
        }

        const hexPart = payload.slice(this.AYAB_PREFIX.length);
        const nibbles: number[] = [];

        for (let i = 0; i < hexPart.length; i++) {
            const nibble = parseInt(hexPart[i], 16);
            if (isNaN(nibble)) {
            return null; // Invalid hex digit
            }
            nibbles.push(nibble);
        }
        // Memo data are stored bottom row first while image is top row first.
        return nibbles.reverse();
    }

    /**
     * Parses PNG binary data to extract memo data (Comment).
     * @param arrayBuffer The ArrayBuffer containing the PNG file data.
     * @returns The extracted memo data as a string, or null if not found.
     */
    public static extractPngComment(arrayBuffer: ArrayBuffer): string | null {
        const dataView = new DataView(arrayBuffer);

        // Check PNG Signature (8 bytes: 89 50 4E 47 0D 0A 1A 0A)
        const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
        for (let i = 0; i < 8; i++) {
            if (dataView.getUint8(i) !== pngSignature[i]) {
                return null;
            }
        }

        let offset = 8; // Skip 8-byte PNG header
        const decoder = new TextDecoder("latin1"); // Standard PNG tEXt chunks use ISO-8859-1

        while (offset < dataView.byteLength) {
            // Read Chunk Length (4 bytes) and Type (4 bytes)
            const length = dataView.getUint32(offset);
            const chunkType = String.fromCharCode(
                dataView.getUint8(offset + 4),
                dataView.getUint8(offset + 5),
                dataView.getUint8(offset + 6),
                dataView.getUint8(offset + 7)
            );

            // Look for 'tEXt' chunks
            if (chunkType === "tEXt") {
                const chunkDataOffset = offset + 8;
                const chunkData = new Uint8Array(arrayBuffer, chunkDataOffset, length);
                const text = decoder.decode(chunkData);

                // 'tEXt' format: Keyword + Null Separator (0x00) + Text Content
                const nullIndex = text.indexOf("\0");
                if (nullIndex !== -1) {
                    const keyword = text.substring(0, nullIndex);
                    const value = text.substring(nullIndex + 1);

                    if (keyword.toLowerCase() === "comment") {
                        return value; // Found the comment!
                    }
                }
            }

            // Stop reading if we hit the end-of-file chunk
            if (chunkType === "IEND") {
                break;
            }

            // Move to next chunk: 4 bytes length + 4 bytes type + payload length + 4 bytes CRC
            offset += 12 + length;
        }

        return null; // Comment chunk not found
    }
}