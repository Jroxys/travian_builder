export default class TaskQueue {
  constructor() {
    this.tasks = [];
  }

  enqueue(task) {
    this.tasks.push(task);
  }

  next() {
    return this.tasks.shift() || null;
  }
}
