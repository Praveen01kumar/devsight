declare module 'utif' {
  export interface IFD {
    width: number;
    height: number;
    [key: string]: unknown;
  }
  export function decode(buffer: ArrayBuffer): IFD[];
  export function decodeImage(buffer: ArrayBuffer, ifd: IFD): void;
  export function toRGBA8(ifd: IFD): Uint8ClampedArray;
  export function encodeImage(rgba: Uint8Array, w: number, h: number, metadata?: unknown): ArrayBuffer;
}

declare module 'icojs' {
  export default class ICO {
    static encode(images: ArrayBuffer[]): Promise<ArrayBuffer>;
  }
}
