(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SILMOHistory = api;
})(globalThis, function () {
  function createHistory(options) {
    const config = options || {};
    const captureState = config.captureState;
    const restoreState = config.restoreState;
    const disposeState = config.disposeState;
    const limit = Number.isInteger(config.limit) && config.limit > 0 ? config.limit : 40;

    if (typeof captureState !== 'function' ||
        typeof restoreState !== 'function' ||
        typeof disposeState !== 'function') {
      throw new Error('SILMO-Verlauf benötigt captureState, restoreState und disposeState.');
    }

    const undoStack = [];
    const redoStack = [];
    let applying = false;
    let disposed = false;

    function clearStack(stack) {
      while (stack.length) disposeState(stack.pop());
    }

    function record() {
      if (disposed || applying) return false;
      const snapshot = captureState();
      undoStack.push(snapshot);
      if (undoStack.length > limit) disposeState(undoStack.shift());
      clearStack(redoStack);
      return true;
    }

    function apply(fromStack, toStack) {
      if (disposed || applying || !fromStack.length) return false;
      const currentSnapshot = captureState();
      const targetSnapshot = fromStack.pop();
      applying = true;
      try {
        restoreState(targetSnapshot);
      } catch (error) {
        fromStack.push(targetSnapshot);
        try {
          restoreState(currentSnapshot);
          disposeState(currentSnapshot);
        } catch (recoveryError) {
          toStack.push(currentSnapshot);
          throw new AggregateError(
            [error, recoveryError],
            'Wiederherstellung des Verlaufs und Rückkehr zum vorherigen Zustand sind fehlgeschlagen.'
          );
        }
        throw error;
      } finally {
        applying = false;
      }
      toStack.push(currentSnapshot);
      disposeState(targetSnapshot);
      return true;
    }

    function undo() {
      return apply(undoStack, redoStack);
    }

    function redo() {
      return apply(redoStack, undoStack);
    }

    function clear() {
      clearStack(undoStack);
      clearStack(redoStack);
    }

    function dispose() {
      if (disposed) return;
      clear();
      disposed = true;
    }

    function getStats() {
      return Object.freeze({
        undoCount: undoStack.length,
        redoCount: redoStack.length,
        limit,
        disposed
      });
    }

    return Object.freeze({ record, undo, redo, clear, dispose, getStats });
  }

  return Object.freeze({ createHistory });
});
