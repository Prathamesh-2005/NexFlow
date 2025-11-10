import * as Y from 'yjs';

export class ChangeTracker {
  constructor() {
    this.changes = new Map(); 
    this.cleanupTimeouts = new Map();
  }

  trackChange(userId, userName, userColor, position, length) {
    // Clear existing timeout for this user
    if (this.cleanupTimeouts.has(userId)) {
      clearTimeout(this.cleanupTimeouts.get(userId));
    }

    // Store the change
    if (!this.changes.has(userId)) {
      this.changes.set(userId, {
        positions: new Set(),
        color: userColor,
        name: userName,
        timestamp: Date.now(),
      });
    }

    const userChanges = this.changes.get(userId);
    
    // Add the position range
    for (let i = position; i < position + length; i++) {
      userChanges.positions.add(i);
    }
    
    userChanges.timestamp = Date.now();

    // Set cleanup timeout (remove after 5 seconds)
    const timeout = setTimeout(() => {
      this.changes.delete(userId);
      this.cleanupTimeouts.delete(userId);
    }, 5000);

    this.cleanupTimeouts.set(userId, timeout);
  }

  getChangeAtPosition(position) {
    for (const [userId, change] of this.changes.entries()) {
      if (change.positions.has(position)) {
        return change;
      }
    }
    return null;
  }

  getAllChanges() {
    return Array.from(this.changes.entries()).map(([userId, change]) => ({
      userId,
      ...change,
      positions: Array.from(change.positions),
    }));
  }

  clear() {
    this.changes.clear();
    this.cleanupTimeouts.forEach(timeout => clearTimeout(timeout));
    this.cleanupTimeouts.clear();
  }

  destroy() {
    this.clear();
  }
}