export interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class PendingRequestRegistry<T> {
  private readonly pending = new Map<string, PendingRequest<T>>();

  create(
    requestId: string,
    timeoutMs: number,
    timeoutError: () => Error,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(timeoutError());
      }, timeoutMs);
      this.pending.set(requestId, { resolve, reject, timeout });
    });
  }

  resolve(requestId: string, value: T): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) return false;
    clearTimeout(entry.timeout);
    this.pending.delete(requestId);
    entry.resolve(value);
    return true;
  }

  reject(requestId: string, error: Error): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) return false;
    clearTimeout(entry.timeout);
    this.pending.delete(requestId);
    entry.reject(error);
    return true;
  }

  has(requestId: string): boolean {
    return this.pending.has(requestId);
  }

  get(requestId: string): PendingRequest<T> | undefined {
    return this.pending.get(requestId);
  }

  delete(requestId: string): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) return false;
    clearTimeout(entry.timeout);
    this.pending.delete(requestId);
    return true;
  }

  rejectAll(error: Error): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(error);
    }
    this.pending.clear();
  }

  clear(): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timeout);
    }
    this.pending.clear();
  }

  values(): IterableIterator<PendingRequest<T>> {
    return this.pending.values();
  }

  entries(): IterableIterator<[string, PendingRequest<T>]> {
    return this.pending.entries();
  }

  get size(): number {
    return this.pending.size;
  }
}
