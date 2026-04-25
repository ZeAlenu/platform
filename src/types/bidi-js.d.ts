declare module "bidi-js" {
  interface EmbeddingLevelsResult {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }

  interface BidiAPI {
    getEmbeddingLevels(text: string, baseDirection?: "rtl" | "ltr" | "auto"): EmbeddingLevelsResult;
    getReorderedString(
      text: string,
      embeddingLevels: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): string;
    getReorderedIndices(
      text: string,
      embeddingLevels: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): number[];
    getReorderSegments(
      text: string,
      embeddingLevels: EmbeddingLevelsResult,
      start?: number,
      end?: number,
    ): Array<[number, number]>;
    getMirroredCharacter(char: string): string | null;
    getBidiCharType(char: string): number;
    getBidiCharTypeName(char: string): string;
  }

  function bidiFactory(): BidiAPI;
  export default bidiFactory;
}
