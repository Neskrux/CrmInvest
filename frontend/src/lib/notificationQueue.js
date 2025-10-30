class NotificationQueue {
  constructor() {
    this.queue = [];
    this.isRunning = false;
  }

  async run(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.#drain();
    });
  }

  async #drain() {
    if (this.isRunning) return;
    const next = this.queue.shift();
    if (!next) return;
    this.isRunning = true;
    try {
      const result = await next.task();
      next.resolve(result);
    } catch (err) {
      next.reject(err);
    } finally {
      this.isRunning = false;
      Promise.resolve().then(() => this.#drain());
    }
  }
}

export const notificationQueue = new NotificationQueue();