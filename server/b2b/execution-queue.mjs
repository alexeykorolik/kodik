/** Bounded round-robin admission. Each tenant gets a turn, not a global FIFO. */
export class ExecutionQueue {
  constructor({ concurrency = 4, capacity = 240, waitMs = 45000 } = {}) {
    this.concurrency = concurrency;
    this.capacity = capacity;
    this.waitMs = waitMs;
    this.tenants = new Map();
    this.active = 0;
    this.closed = false;
    this.completed = 0;
    this.expired = 0;
  }
  get waiting() {
    return [...this.tenants.values()].reduce((n, jobs) => n + jobs.length, 0);
  }
  snapshot() {
    return {
      active: this.active,
      waiting: this.waiting,
      capacity: this.capacity,
      concurrency: this.concurrency,
      completed: this.completed,
      expired: this.expired,
    };
  }
  run(tenant, work, { signal } = {}) {
    if (this.closed)
      return Promise.resolve({
        infrastructure: true,
        error: "Исполнитель останавливается. Повторите позже.",
        output: [],
      });
    if (this.waiting >= this.capacity)
      return Promise.resolve({
        infrastructure: true,
        error:
          "Очередь заполнена. Решение не оценено; повторите проверку позже.",
        output: [],
      });
    return new Promise((resolve) => {
      const jobs = this.tenants.get(tenant) || [],
        job = {
          work,
          resolve,
          started: false,
          done: false,
          timer: null,
          abort: null,
        };
      const remove = () => {
        if (job.started || job.done) return;
        job.done = true;
        clearTimeout(job.timer);
        const list = this.tenants.get(tenant);
        if (list) {
          const index = list.indexOf(job);
          if (index >= 0) list.splice(index, 1);
          if (!list.length) this.tenants.delete(tenant);
        }
        signal?.removeEventListener("abort", job.abort);
      };
      job.abort = () => {
        if (job.started || job.done) return;
        remove();
        resolve({
          infrastructure: true,
          cancelled: true,
          error: "Ожидание проверки отменено.",
          output: [],
        });
      };
      if (signal?.aborted) {
        job.abort();
        return;
      }
      job.timer = setTimeout(() => {
        remove();
        this.expired++;
        resolve({
          infrastructure: true,
          error:
            "Время ожидания истекло. Повторите проверку; оценки не выставлены.",
          output: [],
        });
      }, this.waitMs);
      signal?.addEventListener("abort", job.abort, { once: true });
      jobs.push(job);
      this.tenants.set(tenant, jobs);
      this.pump();
    });
  }
  pump() {
    while (this.active < this.concurrency && this.tenants.size) {
      const [tenant, jobs] = this.tenants.entries().next().value,
        job = jobs.shift();
      this.tenants.delete(tenant);
      if (jobs.length) this.tenants.set(tenant, jobs);
      if (job.done) continue;
      job.started = true;
      clearTimeout(job.timer);
      this.active++;
      Promise.resolve()
        .then(job.work)
        .catch(() => ({
          infrastructure: true,
          error: "Ошибка исполнителя. Оценка не выставлена.",
          output: [],
        }))
        .then((result) => {
          job.done = true;
          job.resolve(result);
        })
        .finally(() => {
          this.active--;
          this.completed++;
          this.pump();
        });
    }
  }
  close() {
    this.closed = true;
    for (const jobs of this.tenants.values())
      for (const job of jobs) {
        clearTimeout(job.timer);
        job.done = true;
        job.resolve({
          infrastructure: true,
          error: "Сервер перезапускается. Проверку можно повторить.",
          output: [],
        });
      }
    this.tenants.clear();
  }
}
