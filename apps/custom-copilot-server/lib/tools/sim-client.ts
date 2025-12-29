interface SimClientConfig {
  simUrl: string
  apiKey?: string
}

/**
 * Client for executing tools on the SIM app
 * Client tools run in the browser (UI interactions, navigation, etc.)
 */
export class SimToolClient {
  private config: SimClientConfig

  constructor(config: SimClientConfig) {
    this.config = config
  }

  async executeTool(name: string, params: unknown): Promise<unknown> {
    const response = await fetch(
      `${this.config.simUrl}/api/copilot/execute-tool`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && {
            'x-api-key': this.config.apiKey,
          }),
        },
        body: JSON.stringify({ name, params }),
      }
    )

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error')
      throw new Error(`SIM tool execution failed: ${error}`)
    }

    return response.json()
  }
}
