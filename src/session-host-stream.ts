import { StringDecoder } from "node:string_decoder";

export class SessionHostLineDecoder {
  private readonly decoder = new StringDecoder("utf8");
  private output = "";

  push(chunk: Buffer) {
    this.output += this.decoder.write(chunk);
    const bytes = Buffer.byteLength(this.output);
    const lines = this.output.split(/\r?\n/);
    this.output = lines.pop() || "";
    return { bytes, lines };
  }
}
