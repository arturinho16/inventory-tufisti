declare module "qz-tray" {
  interface QzTray {
    websocket: { connect(options?: { retries?: number; delay?: number }): Promise<void>; disconnect(): Promise<void>; isActive(): boolean };
    printers: { find(query?: string): Promise<string[] | string> };
    configs: { create(printer: string, options?: Record<string, unknown>): unknown };
    print(config: unknown, data: unknown[]): Promise<void>;
  }
  const qz: QzTray;
  export = qz;
}
