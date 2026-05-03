declare module "@openclaw/plugin-sdk/plugin-entry" {
  export function definePluginEntry(opts: {
    id: string;
    name: string;
    description: string;
    kind?: string;
    configSchema?: unknown;
    reload?: unknown;
    nodeHostCommands?: unknown;
    securityAuditCollectors?: unknown;
    register: (api: any) => void;
  }): unknown;
}
